use once_cell::sync::Lazy;

pub struct Config {
    pub port: u16,
}

impl Config {
    pub fn load() -> Self {
        let port: u16 = std::env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse()
            .expect("PORT must be a valid u16 number");

        Config { port }
    }
}

// Define a globally accessible static Config instance
pub static CONFIG: Lazy<Config> = Lazy::new(Config::load);
