-- Add channel tracking tables
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL UNIQUE,
    session_id TEXT,
    wallet_address VARCHAR(255) NOT NULL,
    initial_balance DECIMAL(20, 6) NOT NULL,
    current_balance DECIMAL(20, 6) NOT NULL,
    state_version INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

CREATE TABLE IF NOT EXISTS channel_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id TEXT NOT NULL,
    state_version INTEGER NOT NULL,
    user_balance DECIMAL(20, 6) NOT NULL,
    service_balance DECIMAL(20, 6) NOT NULL,
    state_data JSONB,
    signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channels_wallet ON channels(wallet_address);
CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channel_states_channel ON channel_states(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_states_version ON channel_states(channel_id, state_version);
