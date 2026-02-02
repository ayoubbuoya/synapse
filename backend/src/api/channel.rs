use actix_web::{HttpResponse, Responder, post, web, get};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use utoipa::ToSchema;

use crate::repository::channel;
use crate::state::AppState;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateChannelRequest {
    pub channel_id: String,
    pub session_id: Option<String>,
    pub wallet_address: String,
    pub initial_balance: f64,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateStateRequest {
    pub state_version: i32,
    pub user_balance: f64,
    pub service_balance: f64,
    pub state_data: Option<serde_json::Value>,
    pub signature: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ChannelResponse {
    pub id: String,
    pub channel_id: String,
    pub session_id: Option<String>,
    pub wallet_address: String,
    pub initial_balance: String,
    pub current_balance: String,
    pub state_version: i32,
    pub status: String,
    pub created_at: String,
    pub closed_at: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ChannelStateResponse {
    pub id: String,
    pub channel_id: String,
    pub state_version: i32,
    pub user_balance: String,
    pub service_balance: String,
    pub state_data: Option<serde_json::Value>,
    pub signature: Option<String>,
    pub created_at: String,
}

/// Create a new state channel
#[utoipa::path(
    post,
    path = "/channel",
    request_body = CreateChannelRequest,
    responses(
        (status = 200, description = "Channel created successfully", body = ChannelResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "channel"
)]
#[post("/channel")]
pub async fn create_channel_handler(
    state: web::Data<AppState>,
    req: web::Json<CreateChannelRequest>,
) -> impl Responder {
    // Convert f64 to Decimal using scaled integer (6 decimal places for USDC)
    let initial_balance = rust_decimal::Decimal::new((req.initial_balance * 1_000_000.0) as i64, 6);

    match channel::create_channel(
        &state.db,
        &req.channel_id,
        req.session_id.as_deref(),
        &req.wallet_address,
        initial_balance,
    )
    .await
    {
        Ok(channel) => HttpResponse::Ok().json(ChannelResponse {
            id: channel.id.to_string(),
            channel_id: channel.channel_id,
            session_id: channel.session_id,
            wallet_address: channel.wallet_address,
            initial_balance: channel.initial_balance.to_string(),
            current_balance: channel.current_balance.to_string(),
            state_version: channel.state_version,
            status: channel.status,
            created_at: channel.created_at.to_rfc3339(),
            closed_at: channel.closed_at.map(|dt| dt.to_rfc3339()),
        }),
        Err(e) => {
            eprintln!("Failed to create channel: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create channel"
            }))
        }
    }
}

/// Update channel state
#[utoipa::path(
    post,
    path = "/channel/{channel_id}/state",
    params(
        ("channel_id" = String, Path, description = "Channel ID")
    ),
    request_body = UpdateStateRequest,
    responses(
        (status = 200, description = "State updated successfully", body = ChannelStateResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "channel"
)]
#[post("/channel/{channel_id}/state")]
pub async fn update_state_handler(
    state: web::Data<AppState>,
    path: web::Path<String>,
    req: web::Json<UpdateStateRequest>,
) -> impl Responder {
    let channel_id = path.into_inner();

    // Convert f64 to Decimal using scaled integer (6 decimal places for USDC)
    let user_balance = rust_decimal::Decimal::new((req.user_balance * 1_000_000.0) as i64, 6);
    let service_balance = rust_decimal::Decimal::new((req.service_balance * 1_000_000.0) as i64, 6);

    match channel::update_channel_state(
        &state.db,
        &channel_id,
        req.state_version,
        user_balance,
        service_balance,
        req.state_data.clone(),
        req.signature.as_deref(),
    )
    .await
    {
        Ok(channel_state) => HttpResponse::Ok().json(ChannelStateResponse {
            id: channel_state.id.to_string(),
            channel_id: channel_state.channel_id,
            state_version: channel_state.state_version,
            user_balance: channel_state.user_balance.to_string(),
            service_balance: channel_state.service_balance.to_string(),
            state_data: channel_state.state_data,
            signature: channel_state.signature,
            created_at: channel_state.created_at.to_rfc3339(),
        }),
        Err(e) => {
            eprintln!("Failed to update state: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update state"
            }))
        }
    }
}

/// Get channel information
#[utoipa::path(
    get,
    path = "/channel/{channel_id}",
    params(
        ("channel_id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "Channel retrieved successfully", body = ChannelResponse),
        (status = 404, description = "Channel not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "channel"
)]
#[get("/channel/{channel_id}")]
pub async fn get_channel_handler(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let channel_id = path.into_inner();

    match channel::get_channel_by_id(&state.db, &channel_id).await {
        Ok(channel) => HttpResponse::Ok().json(ChannelResponse {
            id: channel.id.to_string(),
            channel_id: channel.channel_id,
            session_id: channel.session_id,
            wallet_address: channel.wallet_address,
            initial_balance: channel.initial_balance.to_string(),
            current_balance: channel.current_balance.to_string(),
            state_version: channel.state_version,
            status: channel.status,
            created_at: channel.created_at.to_rfc3339(),
            closed_at: channel.closed_at.map(|dt| dt.to_rfc3339()),
        }),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Channel not found"
        })),
        Err(e) => {
            eprintln!("Failed to get channel: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get channel"
            }))
        }
    }
}

/// Get channel state history
#[utoipa::path(
    get,
    path = "/channel/{channel_id}/states",
    params(
        ("channel_id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "States retrieved successfully", body = Vec<ChannelStateResponse>),
        (status = 500, description = "Internal server error")
    ),
    tag = "channel"
)]
#[get("/channel/{channel_id}/states")]
pub async fn get_states_handler(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let channel_id = path.into_inner();

    match channel::get_channel_states(&state.db, &channel_id).await {
        Ok(states) => {
            let responses: Vec<ChannelStateResponse> = states
                .into_iter()
                .map(|s| ChannelStateResponse {
                    id: s.id.to_string(),
                    channel_id: s.channel_id,
                    state_version: s.state_version,
                    user_balance: s.user_balance.to_string(),
                    service_balance: s.service_balance.to_string(),
                    state_data: s.state_data,
                    signature: s.signature,
                    created_at: s.created_at.to_rfc3339(),
                })
                .collect();

            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            eprintln!("Failed to get states: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get states"
            }))
        }
    }
}

/// Close a channel
#[utoipa::path(
    post,
    path = "/channel/{channel_id}/close",
    params(
        ("channel_id" = String, Path, description = "Channel ID")
    ),
    responses(
        (status = 200, description = "Channel closed successfully", body = ChannelResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "channel"
)]
#[post("/channel/{channel_id}/close")]
pub async fn close_channel_handler(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let channel_id = path.into_inner();

    match channel::close_channel(&state.db, &channel_id).await {
        Ok(channel) => HttpResponse::Ok().json(ChannelResponse {
            id: channel.id.to_string(),
            channel_id: channel.channel_id,
            session_id: channel.session_id,
            wallet_address: channel.wallet_address,
            initial_balance: channel.initial_balance.to_string(),
            current_balance: channel.current_balance.to_string(),
            state_version: channel.state_version,
            status: channel.status,
            created_at: channel.created_at.to_rfc3339(),
            closed_at: channel.closed_at.map(|dt| dt.to_rfc3339()),
        }),
        Err(e) => {
            eprintln!("Failed to close channel: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to close channel"
            }))
        }
    }
}

// pub fn configure(cfg: &mut web::ServiceConfig) {
//     cfg.service(
//         web::scope("/channel")
//             .route("", web::post().to(create_channel_handler))
//             .route("/{channel_id}", web::get().to(get_channel_handler))
//             .route("/{channel_id}/state", web::post().to(update_state_handler))
//             .route("/{channel_id}/states", web::get().to(get_states_handler))
//             .route("/{channel_id}/close", web::post().to(close_channel_handler)),
//     );
// }
