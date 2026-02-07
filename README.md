# Pulse X

> **Real-time Emergency Relief Platform powered by XRP Ledger**

[![XRP Ledger](https://img.shields.io/badge/XRP_Ledger-Testnet-blue)](https://xrpl.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## 🌟 Overview

**Pulse X** is a transparent, blockchain-based emergency relief donation platform that leverages the XRP Ledger's speed, low fees, and escrow capabilities to ensure rapid, accountable disaster response funding. Built for real-world impact, Pulse X enables donors to contribute with confidence while relief organizations receive funds efficiently through intelligent allocation mechanisms.

### Key Features

- 🚀 **Instant Transactions** - Leverage XRPL's 3-5 second settlement times for rapid fund deployment
- 🔒 **Trustless Escrow** - Time-locked smart escrows ensure funds are released only when conditions are met
- 💰 **Multi-Currency Support** - Accept donations in XRP and RLUSD stablecoin
- 🎯 **Intelligent Allocation** - AI-powered fund distribution based on organization needs and disaster severity
- 📊 **Real-Time Transparency** - Live dashboards showing fund flow from donor to beneficiary
- 🔄 **Batch Processing** - Efficient batching system reduces transaction costs while maintaining speed
- 🏥 **Organization Dashboard** - Relief organizations can track incoming funds and claim allocations
- 📱 **Donor Tracking** - Complete visibility into donation impact and fund utilization

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  React Frontend │◄───────►│  FastAPI Backend │◄───────►│   XRP Ledger    │
│  (TypeScript)   │         │    (Python)      │         │    Testnet      │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │
        │                            │
        │                    ┌───────▼───────┐
        │                    │               │
        └───────────────────►│  PostgreSQL   │
                             │   Database    │
                             │               │
                             └───────────────┘
```

### Tech Stack

#### Backend
- **FastAPI** - Modern Python web framework for high-performance APIs
- **xrpl-py** - Official Python library for XRP Ledger integration
- **SQLAlchemy** - SQL toolkit and ORM for database operations
- **PostgreSQL** - Robust relational database for storing donation records
- **WebSockets** - Real-time bidirectional communication for live updates
- **Pydantic** - Data validation using Python type annotations

#### Frontend
- **React 18** - Modern UI library with hooks and concurrent rendering
- **TypeScript** - Type-safe JavaScript for better developer experience
- **Vite** - Lightning-fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework for beautiful UIs
- **Framer Motion** - Fluid animations and transitions
- **Recharts** - Composable charting library for data visualization
- **Crossmark SDK** - XRPL wallet integration

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 18+ and npm
- PostgreSQL 14+
- XRP Ledger Testnet wallet (get XRP from [faucet](https://xrpl.org/xrp-testnet-faucet.html))

### 1. Clone the Repository

```bash
git clone https://github.com/soham-k-sinha/PulseX.git
cd PulseX
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost/pulsex
XRPL_NETWORK=testnet
FRONTEND_URL=http://localhost:5173
EOF

# Generate XRPL test accounts
python3 ../scripts/generate_xrpl_accounts.py

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb pulsex

# Tables are auto-created on first backend startup
# Or seed with demo data:
python3 scripts/seed_demo_data.py
```

## 📁 Project Structure

```
PulseX/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application entry point
│   │   ├── config.py                  # Configuration and environment variables
│   │   ├── database.py                # SQLAlchemy database setup
│   │   ├── models/                    # Database models
│   │   │   ├── disaster.py            # Emergency/disaster model
│   │   │   ├── donation.py            # Donation tracking model
│   │   │   ├── organization.py        # Relief organization model
│   │   │   ├── batch_escrow.py        # Batch escrow model
│   │   │   └── org_escrow.py          # Organization escrow model
│   │   ├── routers/                   # API route handlers
│   │   │   ├── donations.py           # Donation endpoints
│   │   │   ├── emergencies.py         # Disaster management endpoints
│   │   │   ├── organizations.py       # Organization endpoints
│   │   │   ├── batches.py             # Batch processing endpoints
│   │   │   ├── xrpl_status.py         # XRPL network status
│   │   │   └── rlusd.py               # RLUSD stablecoin operations
│   │   ├── services/                  # Business logic layer
│   │   │   ├── xrpl_client.py         # XRP Ledger integration
│   │   │   ├── allocation_engine.py   # Intelligent fund allocation
│   │   │   ├── batch_manager.py       # Batch processing logic
│   │   │   └── escrow_scheduler.py    # Escrow lifecycle management
│   │   └── utils/                     # Utility functions
│   │       ├── crypto.py              # Cryptographic utilities
│   │       └── ripple_time.py         # XRPL time conversion
│   └── requirements.txt               # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Root application component
│   │   ├── main.tsx                   # Application entry point
│   │   ├── components/                # React components
│   │   │   ├── LandingHero.tsx        # Landing page hero section
│   │   │   ├── DonorDashboard.tsx     # Donor tracking interface
│   │   │   ├── OrgDashboard.tsx       # Organization dashboard
│   │   │   ├── AdminPanel.tsx         # Admin disaster management
│   │   │   ├── EscrowFlowViz.tsx      # Escrow visualization
│   │   │   ├── WalletConnect.tsx      # XRPL wallet connection
│   │   │   └── EmergencyFlowModal.tsx # Emergency creation flow
│   │   ├── services/
│   │   │   ├── api.ts                 # API client functions
│   │   │   └── wallet.ts              # Wallet integration
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts        # WebSocket hook for live updates
│   │   └── types/
│   │       └── index.ts               # TypeScript type definitions
│   ├── package.json                   # Node.js dependencies
│   └── vite.config.ts                 # Vite configuration
│
├── scripts/
│   ├── generate_xrpl_accounts.py      # Generate test XRPL wallets
│   └── seed_demo_data.py              # Populate database with demo data
│
└── .secrets/
    └── xrpl_accounts.json             # XRPL wallet credentials (gitignored)
```

## 💡 Core Concepts

### Escrow Mechanism

Pulse X uses XRP Ledger's native escrow functionality to create trustless, time-locked fund transfers:

1. **Donation Phase** - Donors contribute XRP or RLUSD to the platform
2. **Batching** - Donations are aggregated into efficient batches (every 5 minutes or $100 threshold)
3. **Allocation** - AI engine distributes funds to organizations based on need scores and disaster severity
4. **Escrow Creation** - Funds are locked in blockchain escrows with time-based release conditions
5. **Release** - Organizations claim funds once escrow conditions are met
6. **Transparency** - Every step is tracked on-chain and visible to donors

### Intelligent Allocation Engine

The allocation engine uses a weighted scoring algorithm:

```python
allocation_score = (org_need_score × disaster_severity) / total_active_orgs
```

This ensures:
- High-priority disasters receive more funding
- Organizations with greater needs receive proportionally more
- Fair distribution across multiple relief efforts

### Batch Processing

To optimize transaction costs while maintaining speed:

- **Time-based batching**: Collects donations for 5 minutes
- **Amount-based batching**: Triggers at $100 USD equivalent
- **Automatic processing**: Background service handles batch lifecycle
- **Atomic operations**: Either all transactions succeed or rollback

## 🔧 API Documentation

### Key Endpoints

#### Donations

```http
POST /donations
Body: { donor_address, amount_xrp, currency }
```

Create a new donation

```http
GET /donations/{donor_address}
```

Retrieve donation history for a donor

#### Emergencies

```http
POST /emergencies
Body: { title, description, severity, target_amount }
```

Create a new emergency/disaster (admin only)

```http
GET /emergencies
Query: status=active|completed
```

List all emergencies

#### Organizations

```http
GET /organizations
```

List all registered relief organizations

```http
POST /organizations/{org_id}/claim
```

Organization claims allocated funds from escrow

#### Real-time Updates

```websocket
WS /ws
```

WebSocket connection for live platform updates

Full API documentation available at `http://localhost:8000/docs` when backend is running.

## 🎨 User Flows

### For Donors

1. **Connect Wallet** - Use Crossmark or other XRPL wallet
2. **Browse Emergencies** - View active disasters needing support
3. **Donate** - Contribute XRP or RLUSD in any amount
4. **Track Impact** - Watch real-time dashboard showing fund allocation
5. **Verify on Ledger** - Click through to see your transaction on XRPL explorer

### For Organizations

1. **Register** - Submit organization details and XRPL wallet address
2. **Monitor Dashboard** - View incoming allocations from active disasters
3. **Receive Notifications** - Get alerted when funds are allocated
4. **Claim Funds** - Release escrowed funds when conditions are met
5. **Report Impact** - Update on how funds were utilized

### For Administrators

1. **Create Emergency** - Register new disaster with details and target amount
2. **Set Priority** - Adjust severity scores to influence allocation
3. **Monitor System** - Track total donations, active batches, and escrow status
4. **Manage Organizations** - Approve/verify relief organizations

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

### End-to-End Testing

```bash
# Start backend and frontend
# Then run E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Backend Deployment (Railway/Render)

```bash
# Add environment variables in platform dashboard:
DATABASE_URL=postgresql://...
XRPL_NETWORK=testnet
FRONTEND_URL=https://your-frontend.com

# Deploy using Git push or platform CLI
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build production bundle
npm run build

# Deploy dist/ folder
# Or connect Git repository for automatic deployments
```

### Docker Deployment (Optional)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🔐 Security Considerations

- 🔑 **Never commit** `.secrets/` directory or `.env` files
- 🌐 **Use testnet** for development; mainnet requires additional security audits
- 🔒 **Wallet security**: Private keys are stored only client-side
- ✅ **Input validation**: All API inputs validated with Pydantic
- 🛡️ **CORS policies**: Configured for specific frontend origins
- 📝 **Audit trail**: All transactions recorded on immutable blockchain

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows existing style conventions
- All tests pass
- New features include tests
- Documentation is updated

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ripple** for the XRP Ledger and developer resources
- **FastAPI** community for excellent documentation
- **React** team for the amazing frontend framework
- All contributors and supporters of this project

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/soham-k-sinha/PulseX/issues)
- **Project Link**: https://github.com/soham-k-sinha/PulseX

## 🗺️ Roadmap

- [ ] Mainnet deployment with security audit
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Impact reporting with ML-powered analytics
- [ ] Integration with additional stablecoins
- [ ] Automated organization verification via KYC
- [ ] Disaster prediction and proactive fund allocation
- [ ] NFT receipts for donations

---

**Built with ❤️ for a more transparent and efficient disaster relief ecosystem**

