# 🧠 Synapse: The Neural Economy Protocol

**Tagline:** Real-time, gasless payment streams for Autonomous AI Agents.

---

## **The Problem**

AI Agents are evolving rapidly, but they are "economically paralyzed."

- **Latency Mismatch:** An AI Agent "thinks" in milliseconds, but blockchains settle in seconds (or minutes). An agent cannot wait 12 seconds for an Ethereum block just to pay $0.001 for a single search query.
- **Gas Friction:** It is economically impossible to pay $0.50 in gas to send a $0.01 micro-payment.
- **Subscription Fatigue:** Agents cannot manage 50 different monthly credit card subscriptions. They need a "Pay-As-You-Go" protocol to buy resources (storage, compute, data) per unit.

## **The Solution**

**Synapse** is a state-channel gateway that allows AI Agents to stream money as fast as they stream data.
By combining **Yellow Network's Nitrolite Protocol** (for off-chain settlement) with **Rig-Core** (for high-performance Rust AI orchestration), Synapse enables a machine-to-machine economy where agents pay _per token generated_ or _per API call_ instantly, with zero gas.

---

## 💰 Pay-As-You-Go Pricing

**100 AI tokens = 0.001 USDC**

Every AI response is tracked and charged based on token usage. Users deposit USDC into the Nitrolite custody contract and payments are automatically deducted as they chat.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/pnpm
- **Rust** 1.70+ and Cargo
- **PostgreSQL** 14+
- **Ollama** with a model installed (e.g., `gemma3:1b`)
- **Wallet** with Polygon Amoy testnet USDC

### Backend Setup

1. **Install PostgreSQL** and create a database:

   ```sql
   CREATE DATABASE synapse;
   ```

2. **Configure environment**:

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Run migrations**:

   ```bash
   cargo install sqlx-cli
   sqlx migrate run
   ```

4. **Start Ollama** (in a separate terminal):

   ```bash
   ollama serve
   ollama pull gemma3:1b
   ```

5. **Start the backend**:

   ```bash
   cargo run
   ```

   The API will be available at `http://localhost:8080`
   Swagger docs at `http://localhost:8080/swagger-ui/`

### Frontend Setup

1. **Install dependencies**:

   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment** (optional):

   ```bash
   # Create .env file if you need to change the API URL
   VITE_API_URL=http://localhost:8080
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

---

## 📖 How It Works

### Payment Flow

1. **Connect Wallet**: User connects their wallet using RainbowKit (Polygon Amoy testnet)

2. **Initialize Yellow**: Click "Initialize Yellow" to set up the Nitrolite client

3. **Deposit USDC**:
   - Click "Deposit" button
   - Enter amount (e.g., 10 USDC)
   - Approve tokens (transaction 1)
   - Deposit to custody contract (transaction 2)

4. **Chat & Pay**:
   - Create a new chat or select existing one
   - Send messages to the AI
   - Each AI response shows:
     - Token count
     - Cost in USDC (100 tokens = 0.001 USDC)
   - Payments are tracked in the database

5. **Monitor Balance**: Your balance is displayed in the header and updates after deposits

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│   Ollama    │
│  (React +   │         │  (Rust +     │         │   (AI)      │
│  Nitrolite) │         │   Actix)     │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│  Nitrolite  │         │  PostgreSQL  │
│   Custody   │         │  (Payments)  │
│  Contract   │         │              │
└─────────────┘         └──────────────┘
```

---

## 🔧 Troubleshooting

### Backend Issues

**Database connection error:**

```bash
# Check PostgreSQL is running
psql -U postgres -d synapse

# Verify DATABASE_URL in .env
```

**Ollama not responding:**

```bash
# Ensure Ollama is running
ollama list

# Pull the model if not available
ollama pull gemma3:1b
```

### Frontend Issues

**Wallet connection fails:**

- Ensure you're on Polygon Amoy testnet (Chain ID: 80002)
- Get testnet USDC from faucet

**Deposit fails:**

- Check you have enough USDC balance
- Ensure you have MATIC for gas fees
- Try refreshing the page and reconnecting wallet

**Balance not updating:**

- Wait for transaction confirmation
- Refresh the page
- Check transaction on PolygonScan

---

## 📊 Database Schema

### Tables

- **users**: Wallet addresses
- **chats**: Chat sessions
- **messages**: Chat messages (user and assistant)
- **payments**: Token usage and costs per message

### Query Examples

```sql
-- View recent payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;

-- Total spent by user
SELECT wallet_address, SUM(amount_usdc) as total_spent
FROM payments
GROUP BY wallet_address;

-- Average tokens per message
SELECT AVG(tokens_used) as avg_tokens FROM payments;
```

---

## 🛠️ Development

### Backend

```bash
# Run with auto-reload (requires cargo-watch)
cargo install cargo-watch
cargo watch -x run

# Run tests
cargo test

# Check code
cargo clippy
```

### Frontend

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

---

## 📝 Environment Variables

### Backend (.env)

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/synapse
MODEL_NAME=gemma3:1b
PORT=8080
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8080
```

---

## 🌐 Deployment

### Backend

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `sqlx migrate run`
4. Build: `cargo build --release`
5. Run: `./target/release/synapse`

### Frontend

1. Build: `npm run build`
2. Deploy `dist/` folder to your hosting provider
3. Configure `VITE_API_URL` to point to your backend

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
