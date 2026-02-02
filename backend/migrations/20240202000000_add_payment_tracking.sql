-- Create payments table for tracking token usage and payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
    tokens_used INTEGER NOT NULL,
    amount_usdc DECIMAL(20, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by wallet address
CREATE INDEX IF NOT EXISTS idx_payments_wallet_address ON payments(wallet_address);

-- Create index for faster queries by message
CREATE INDEX IF NOT EXISTS idx_payments_message_id ON payments(message_id);
