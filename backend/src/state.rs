use rig::agent::Agent;
use rig::client::{CompletionClient, Nothing};
use rig::providers::ollama::{self, CompletionModel};
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

use crate::config::CONFIG;

#[derive(Clone)]
pub struct AppState {
    pub db: Pool<Postgres>,
    pub ai_agent: Agent<CompletionModel>,
}

impl AppState {
    pub async fn new() -> Self {
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(&CONFIG.database_url)
            .await
            .expect("Failed to connect to Postgres");

        let ai_client: ollama::Client =
            ollama::Client::new(Nothing).expect("Failed to create Ollama AI client");

        let ai_agent = ai_client.agent(&CONFIG.model_name).temperature(0.1).build();

        tracing::info!("AI agent initialized with model: {}", CONFIG.model_name);

        AppState { db, ai_agent }
    }
}
