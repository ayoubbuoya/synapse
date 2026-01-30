use actix_cors::Cors;
use actix_web::App;
use actix_web::HttpServer;
use actix_web::web;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt};
use utoipa_actix_web::AppExt;
use utoipa_swagger_ui::SwaggerUi;

use crate::config::CONFIG;
use crate::state::AppState;

mod config;
mod state;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize the logger logic
    let file_appender = tracing_appender::rolling::daily("./logs", "synapse.log");
    let (file_writer, _guard) = tracing_appender::non_blocking(file_appender);

    // Console writer (stdout)
    let console_layer = fmt::layer().pretty(); // Optional: makes console output prettier

    // File layer
    let file_layer = fmt::layer().with_writer(file_writer).with_ansi(false); // don't add colors to the file logs

    // 🔥 Only accept logs that match your crate
    let filter = EnvFilter::new("synapse=trace");

    // Combine both
    tracing_subscriber::registry()
        .with(filter)
        .with(console_layer)
        .with(file_layer)
        .init();

    tracing::info!("Logger initialized Successfully");

    // Initalize empty state
    let app_state = web::Data::new(AppState::new().await);

    tracing::info!("Starting HTTP server at http://localhost:{}", CONFIG.port);
    tracing::info!(
        "Swagger UI available at http://localhost:{}/swagger-ui/",
        CONFIG.port
    );

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        let (app, app_api) = App::new()
            .wrap(cors)
            .into_utoipa_app()
            .app_data(app_state.clone())
            .split_for_parts();

        app.service(SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", app_api))
    })
    .bind(("127.0.0.1", CONFIG.port))?
    .run()
    .await
}
