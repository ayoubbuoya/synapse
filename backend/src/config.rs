use once_cell::sync::Lazy;

pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub model_name: String,
}

impl Config {
    pub fn load() -> Self {
        let port: u16 = std::env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .expect("PORT must be a valid u16 number");

        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let model_name = std::env::var("MODEL_NAME")
            .unwrap_or_else(|_| "gemma3:1b".to_string());

        Config {
            port,
            database_url,
            model_name,
        }
    }
}

// Define a globally accessible static Config instance
pub static CONFIG: Lazy<Config> = Lazy::new(Config::load);
