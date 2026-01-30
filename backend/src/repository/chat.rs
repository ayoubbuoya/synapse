use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Chat {
    pub id: Uuid,
    pub user_address: String,
    pub title: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Message {
    pub id: Uuid,
    pub chat_id: Uuid,
    pub role: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

pub async fn get_or_create_user(pool: &PgPool, wallet_address: &str) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING",
        wallet_address,
    )
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn create_chat(
    pool: &PgPool,
    wallet_address: &str,
    title: Option<String>,
) -> Result<Chat, sqlx::Error> {
    let chat = sqlx::query_as!(
        Chat,
        "INSERT INTO chats (user_address, title) VALUES ($1, $2) RETURNING *",
        wallet_address,
        title,
    )
    .fetch_one(pool)
    .await?;
    Ok(chat)
}

pub async fn get_user_chats(pool: &PgPool, wallet_address: &str) -> Result<Vec<Chat>, sqlx::Error> {
    let chats = sqlx::query_as!(
        Chat,
        "SELECT * FROM chats WHERE user_address = $1 ORDER BY created_at DESC",
        wallet_address,
    )
    .fetch_all(pool)
    .await?;
    Ok(chats)
}

pub async fn get_chat_by_id(pool: &PgPool, chat_id: Uuid) -> Result<Option<Chat>, sqlx::Error> {
    let chat = sqlx::query_as!(Chat, "SELECT * FROM chats WHERE id = $1", chat_id)
        .fetch_optional(pool)
        .await?;
    Ok(chat)
}

pub async fn add_message(
    pool: &PgPool,
    chat_id: Uuid,
    role: &str,
    content: &str,
) -> Result<Message, sqlx::Error> {
    let message = sqlx::query_as!(
        Message,
        "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING *",
        chat_id,
        role,
        content,
    )
    .fetch_one(pool)
    .await?;
    Ok(message)
}

pub async fn get_chat_messages(pool: &PgPool, chat_id: Uuid) -> Result<Vec<Message>, sqlx::Error> {
    let messages = sqlx::query_as!(
        Message,
        "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
        chat_id,
    )
    .fetch_all(pool)
    .await?;
    Ok(messages)
}
