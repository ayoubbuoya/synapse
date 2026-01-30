use crate::repository::chat;
use crate::state::AppState;
use actix_web::{HttpResponse, Responder, get, post, web};
use rig::{completion::Chat, message::Message};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateChatRequest {
    #[schema(example = "0x123...")]
    pub wallet_address: String,
    #[schema(example = "My New Chat")]
    pub title: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct SendMessageRequest {
    #[schema(example = "Hello, how are you?")]
    pub content: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct MessageResponse {
    pub id: Uuid,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ChatResponse {
    pub id: Uuid,
    pub title: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub enum Role {
    User,
    Assistant,
}

impl Role {
    pub fn to_string(&self) -> String {
        match self {
            Role::User => "user".to_string(),
            Role::Assistant => "assistant".to_string(),
        }
    }

    pub fn from_string(role: &str) -> Self {
        match role {
            "user" => Role::User,
            "assistant" => Role::Assistant,
            _ => panic!("Invalid role"),
        }
    }
}

#[utoipa::path(
    request_body = CreateChatRequest,
    responses(
        (status = 200, description = "Chat created successfully", body = ChatResponse),
        (status = 500, description = "Internal Server Error")
    )
)]
#[post("/chat")]
pub async fn create_chat_handler(
    state: web::Data<AppState>,
    body: web::Json<CreateChatRequest>,
) -> impl Responder {
    // Ensure user exists
    if let Err(e) = chat::get_or_create_user(&state.db, &body.wallet_address).await {
        tracing::error!("Failed to create user: {:?}", e);
        return HttpResponse::InternalServerError().finish();
    }

    match chat::create_chat(&state.db, &body.wallet_address, body.title.clone()).await {
        Ok(chat) => HttpResponse::Ok().json(ChatResponse {
            id: chat.id,
            title: chat.title,
            created_at: chat.created_at.to_string(),
        }),
        Err(e) => {
            tracing::error!("Failed to create chat: {:?}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[utoipa::path(
    responses(
        (status = 200, description = "List of chats", body = Vec<ChatResponse>),
        (status = 500, description = "Internal Server Error")
    ),
    params(
        ("wallet_address" = String, Query, description = "User wallet address")
    )
)]
#[get("/chat")]
pub async fn get_chats_handler(
    state: web::Data<AppState>,
    query: web::Query<CreateChatRequest>, // resusing struct for query param convenience, though dedicated struct is better
) -> impl Responder {
    match chat::get_user_chats(&state.db, &query.wallet_address).await {
        Ok(chats) => {
            let response = chats
                .into_iter()
                .map(|c| ChatResponse {
                    id: c.id,
                    title: c.title,
                    created_at: c.created_at.to_string(),
                })
                .collect::<Vec<ChatResponse>>();
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            tracing::error!("Failed to get chats: {:?}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[utoipa::path(
    responses(
        (status = 200, description = "Chat history", body = Vec<MessageResponse>),
        (status = 500, description = "Internal Server Error")
    ),
    params(
        ("id" = Uuid, Path, description = "Chat ID")
    )
)]
#[get("/chat/{id}")]
pub async fn get_chat_history_handler(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> impl Responder {
    let chat_id = path.into_inner();
    match chat::get_chat_messages(&state.db, chat_id).await {
        Ok(messages) => {
            let response = messages
                .into_iter()
                .map(|m| MessageResponse {
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    created_at: m.created_at.to_string(),
                })
                .collect::<Vec<MessageResponse>>();
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            tracing::error!("Failed to get messages: {:?}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[utoipa::path(
    request_body = SendMessageRequest,
    responses(
        (status = 200, description = "Message sent and response received", body = MessageResponse),
        (status = 404, description = "Chat not found"),
        (status = 500, description = "Internal Server Error")
    ),
    params(
        ("id" = Uuid, Path, description = "Chat ID")
    )
)]
#[post("/chat/{id}/message")]
pub async fn send_message_handler(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    body: web::Json<SendMessageRequest>,
) -> impl Responder {
    let chat_id = path.into_inner();

    // TODO: use atomic transactions to prevent race conditions

    // 1. Get full history for context
    let history = match chat::get_chat_messages(&state.db, chat_id).await {
        Ok(msgs) => msgs,
        Err(e) => {
            tracing::error!("Failed to get history: {:?}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };

    // 2. Save user message
    if let Err(e) =
        chat::add_message(&state.db, chat_id, &Role::User.to_string(), &body.content).await
    {
        tracing::error!("Failed to save user message: {:?}", e);
        return HttpResponse::InternalServerError().finish();
    }

    let mut history_messages: Vec<Message> = vec![];

    // Fill History messages based on history from the db and the role
    for msg in history {
        if msg.role == Role::User.to_string() {
            history_messages.push(Message::user(msg.content));
        } else {
            history_messages.push(Message::assistant(msg.content));
        }
    }

    let ai_response_content = match state.ai_agent.chat(&body.content, history_messages).await {
        Ok(msg) => msg,
        Err(e) => {
            tracing::error!("Failed to get AI response from ollama: {:?}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };

    // Save AI response
    let saved_response = match chat::add_message(
        &state.db,
        chat_id,
        &Role::Assistant.to_string(),
        &ai_response_content,
    )
    .await
    {
        Ok(msg) => msg,
        Err(e) => {
            tracing::error!("Failed to save assistant message: {:?}", e);
            return HttpResponse::InternalServerError().finish();
        }
    };

    HttpResponse::Ok().json(MessageResponse {
        id: saved_response.id,
        role: saved_response.role,
        content: saved_response.content,
        created_at: saved_response.created_at.to_string(),
    })
}
