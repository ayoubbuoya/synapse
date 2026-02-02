use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Channel {
    pub id: Uuid,
    pub channel_id: String,
    pub session_id: Option<String>,
    pub wallet_address: String,
    pub initial_balance: rust_decimal::Decimal,
    pub current_balance: rust_decimal::Decimal,
    pub state_version: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChannelState {
    pub id: Uuid,
    pub channel_id: String,
    pub state_version: i32,
    pub user_balance: rust_decimal::Decimal,
    pub service_balance: rust_decimal::Decimal,
    pub state_data: Option<serde_json::Value>,
    pub signature: Option<String>,
    pub created_at: DateTime<Utc>,
}

pub async fn create_channel(
    pool: &PgPool,
    channel_id: &str,
    session_id: Option<&str>,
    wallet_address: &str,
    initial_balance: rust_decimal::Decimal,
) -> Result<Channel, sqlx::Error> {
    let channel = sqlx::query_as!(
        Channel,
        r#"
        INSERT INTO channels (channel_id, session_id, wallet_address, initial_balance, current_balance, state_version, status)
        VALUES ($1, $2, $3, $4, $4, 0, 'active')
        RETURNING id, channel_id, session_id, wallet_address, initial_balance, current_balance, state_version, status, created_at, closed_at
        "#,
        channel_id,
        session_id,
        wallet_address,
        initial_balance,
    )
    .fetch_one(pool)
    .await?;

    Ok(channel)
}

pub async fn update_channel_state(
    pool: &PgPool,
    channel_id: &str,
    state_version: i32,
    user_balance: rust_decimal::Decimal,
    service_balance: rust_decimal::Decimal,
    state_data: Option<serde_json::Value>,
    signature: Option<&str>,
) -> Result<ChannelState, sqlx::Error> {
    // Update channel current balance
    sqlx::query!(
        "UPDATE channels SET current_balance = $1, state_version = $2 WHERE channel_id = $3",
        user_balance,
        state_version,
        channel_id,
    )
    .execute(pool)
    .await?;

    // Insert state record
    let state = sqlx::query_as!(
        ChannelState,
        r#"
        INSERT INTO channel_states (channel_id, state_version, user_balance, service_balance, state_data, signature)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, channel_id, state_version, user_balance, service_balance, state_data, signature, created_at
        "#,
        channel_id,
        state_version,
        user_balance,
        service_balance,
        state_data,
        signature,
    )
    .fetch_one(pool)
    .await?;

    Ok(state)
}

pub async fn get_channel_by_id(pool: &PgPool, channel_id: &str) -> Result<Channel, sqlx::Error> {
    let channel = sqlx::query_as!(
        Channel,
        "SELECT id, channel_id, session_id, wallet_address, initial_balance, current_balance, state_version, status, created_at, closed_at FROM channels WHERE channel_id = $1",
        channel_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(channel)
}

pub async fn get_channel_states(
    pool: &PgPool,
    channel_id: &str,
) -> Result<Vec<ChannelState>, sqlx::Error> {
    let states = sqlx::query_as!(
        ChannelState,
        "SELECT id, channel_id, state_version, user_balance, service_balance, state_data, signature, created_at FROM channel_states WHERE channel_id = $1 ORDER BY state_version ASC",
        channel_id,
    )
    .fetch_all(pool)
    .await?;

    Ok(states)
}

pub async fn close_channel(pool: &PgPool, channel_id: &str) -> Result<Channel, sqlx::Error> {
    let channel = sqlx::query_as!(
        Channel,
        "UPDATE channels SET status = 'closed', closed_at = NOW() WHERE channel_id = $1 RETURNING id, channel_id, session_id, wallet_address, initial_balance, current_balance, state_version, status, created_at, closed_at",
        channel_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(channel)
}

pub async fn get_active_channel_by_wallet(
    pool: &PgPool,
    wallet_address: &str,
) -> Result<Option<Channel>, sqlx::Error> {
    let channel = sqlx::query_as!(
        Channel,
        "SELECT id, channel_id, session_id, wallet_address, initial_balance, current_balance, state_version, status, created_at, closed_at FROM channels WHERE wallet_address = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
        wallet_address,
    )
    .fetch_optional(pool)
    .await?;

    Ok(channel)
}
