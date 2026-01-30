use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

use crate::config::CONFIG;

#[derive(Debug, Clone)]
pub struct AppState {
    pub db: Pool<Postgres>,
}

impl AppState {
    pub async fn new() -> Self {
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(&CONFIG.database_url)
            .await
            .expect("Failed to connect to Postgres");

        AppState { db }
    }
}
