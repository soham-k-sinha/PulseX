# 🚀 Complete Preparation Checklist for Opus 4.6 Implementation
## Everything You Need BEFORE Starting Development

**Goal**: Have all prerequisites ready so Opus can build the entire platform smoothly and error-free.

---

## 📋 Table of Contents

1. [Pre-Development Checklist](#pre-development-checklist)
2. [XRPL Accounts Setup](#xrpl-accounts-setup)
3. [Development Environment](#development-environment)
4. [Configuration Files](#configuration-files)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [External Services](#external-services)
8. [Implementation Order](#implementation-order)
9. [Testing Strategy](#testing-strategy)
10. [Final Verification](#final-verification)

---

## ✅ Pre-Development Checklist

### **Phase 1: Tools Installation (Do This First)**

```bash
# macOS Setup

# 1. Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Node.js (v18+)
brew install node

# Verify
node --version  # Should be v18.x or higher
npm --version

# 3. Install Python (3.11+)
brew install python@3.11

# Verify
python3 --version  # Should be 3.11 or higher

# 4. Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Verify
psql --version

# 5. Install Redis
brew install redis
brew services start redis

# Verify
redis-cli ping  # Should return "PONG"

# 6. Install Docker (optional, for containerization)
brew install --cask docker

# 7. Install Git (if not installed)
brew install git

# 8. Install VS Code or your preferred editor
brew install --cask visual-studio-code
```

### **Phase 2: Browser Extensions**

```bash
# Install Crossmark Wallet Extension

1. Open Chrome/Brave/Edge
2. Go to: chrome.google.com/webstore
3. Search: "Crossmark XRPL Wallet"
4. Click "Add to Chrome"
5. Pin extension to toolbar

# Create 3 test wallets for demo:
1. Click Crossmark icon
2. "Create New Wallet" → Save seed phrase
3. Repeat 2 more times

Label them:
  - Donor-1 (main demo wallet)
  - Donor-2 (batch threshold demo)
  - Donor-3 (VIP demo - optional)
```

---

## 🔑 XRPL Accounts Setup

### **Step 1: Generate Server-Side Accounts**

Create this script and run it BEFORE giving to Opus:

```python
# scripts/generate_xrpl_accounts.py

from xrpl.wallet import Wallet
import json
import requests

def generate_and_fund(name: str, network: str = "devnet"):
    """Generate wallet and fund from faucet."""

    # Generate wallet
    wallet = Wallet.create()

    # Fund from faucet
    faucet_url = {
        "devnet": "https://faucet.devnet.rippletest.net/accounts",
        "testnet": "https://faucet.altnet.rippletest.net/accounts"
    }[network]

    response = requests.post(faucet_url, json={
        "destination": wallet.address
    })

    if response.status_code == 200:
        print(f"✅ {name}")
        print(f"   Address: {wallet.address}")
        print(f"   Seed: {wallet.seed}")
        print(f"   Funded: 1000 XRP (testnet)")
        print()
    else:
        print(f"❌ Failed to fund {name}")
        print(f"   Address: {wallet.address}")
        print(f"   Seed: {wallet.seed}")
        print(f"   Manual fund: {faucet_url}")
        print()

    return {
        "name": name,
        "address": wallet.address,
        "seed": wallet.seed
    }

if __name__ == "__main__":
    print("Generating XRPL Accounts for Devnet...\n")

    accounts = []

    # System accounts
    accounts.append(generate_and_fund("Pool Wallet"))
    accounts.append(generate_and_fund("Reserve Wallet"))

    # Organization accounts
    accounts.append(generate_and_fund("Hospital-A"))
    accounts.append(generate_and_fund("Shelter-B"))
    accounts.append(generate_and_fund("NGO-C"))

    # Save to file (DO NOT COMMIT!)
    with open('.secrets/xrpl_accounts.json', 'w') as f:
        json.dump(accounts, f, indent=2)

    print("\n✅ All accounts generated and saved to .secrets/xrpl_accounts.json")
    print("⚠️  NEVER commit this file to git!")
```

**Run this NOW:**

```bash
# Install dependencies
pip3 install xrpl-py requests

# Create secrets directory
mkdir -p .secrets
echo ".secrets/" >> .gitignore

# Run script
python3 scripts/generate_xrpl_accounts.py
```

**Expected Output:**
```
✅ Pool Wallet
   Address: rPoolMasterXXXXXXXXXXXXXXXXXXXXXX
   Seed: sEdVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Funded: 1000 XRP (testnet)

✅ Reserve Wallet
   Address: rReserveXXXXXXXXXXXXXXXXXXXXXXXX
   Seed: sEdYyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   Funded: 1000 XRP (testnet)

✅ Hospital-A
   Address: rHospitalAXXXXXXXXXXXXXXXXXXXXXX
   Seed: sEdZzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
   Funded: 1000 XRP (testnet)

... (3 more orgs)

✅ All accounts generated and saved to .secrets/xrpl_accounts.json
```

---

### **Step 2: Verify Accounts on Explorer**

```bash
# Open Devnet Explorer
open "https://devnet.xrpl.org/accounts/rPoolMasterXXXXXXXXXXXXXXXXXXXXXX"

# Check:
✅ Balance shows ~1000 XRP
✅ Account is activated
✅ No flags set
```

---

### **Step 3: Fund Crossmark Test Wallets**

```bash
# For each Crossmark wallet you created:

1. Open Crossmark extension
2. Click "Receive"
3. Copy address (e.g., rDonor1XXXXXXXXXXXXXXXXXXXXX)
4. Go to: https://faucet.devnet.rippletest.net/accounts
5. Paste address
6. Click "Get Devnet XRP"
7. Verify balance in Crossmark shows 1000 XRP

Repeat for Donor-2 and Donor-3 wallets.
```

---

## 💻 Development Environment

### **Step 1: Initialize Project Structure**

Run this BEFORE giving to Opus:

```bash
#!/bin/bash
# scripts/init_project.sh

echo "Initializing Emergency Platform project..."

# Create root directories
mkdir -p backend/app/{models,routers,services,utils}
mkdir -p frontend/src/{components,services,hooks,types}
mkdir -p scripts
mkdir -p .secrets
mkdir -p docs

# Backend files
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/config.py
touch backend/app/database.py
touch backend/requirements.txt
touch backend/Dockerfile
touch backend/.env.example

# Frontend files
touch frontend/package.json
touch frontend/vite.config.ts
touch frontend/tsconfig.json
touch frontend/.env.example

# Root files
touch .gitignore
touch README.md
touch docker-compose.yml

echo "✅ Project structure created!"
```

Run it:
```bash
chmod +x scripts/init_project.sh
./scripts/init_project.sh
```

---

### **Step 2: Create `.gitignore`**

```bash
# .gitignore

# Secrets
.secrets/
*.env
.env.local
*.pem
*.key

# Python
__pycache__/
*.py[cod]
*$py.class
venv/
*.egg-info/
.pytest_cache/

# Node
node_modules/
dist/
.vite/
*.log

# Database
*.db
*.sqlite

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

---

### **Step 3: Backend Requirements**

Create `backend/requirements.txt`:

```txt
# XRPL
xrpl-py==2.5.0

# Web Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1

# Redis & Celery
redis==5.0.1
celery==5.3.6

# Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
cryptography==41.0.7

# WebSocket
websockets==12.0

# Utilities
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
httpx==0.26.0
```

---

### **Step 4: Frontend Dependencies**

Create `frontend/package.json`:

```json
{
  "name": "emergency-platform-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.4.7",
    "recharts": "^2.10.3",
    "date-fns": "^3.0.6"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33"
  }
}
```

**Install now:**
```bash
cd frontend
npm install
cd ..
```

---

## 📄 Configuration Files

### **Step 1: Backend `.env.example`**

Create `backend/.env.example`:

```bash
# XRPL Network
XRPL_NETWORK=devnet
XRPL_NODE_URL=https://s.devnet.rippletest.net:51234

# Pool Wallet (FILL FROM .secrets/xrpl_accounts.json)
POOL_WALLET_ADDRESS=rPoolXXXXXXXXXXXXXXXXXXXXXXXXXXX
POOL_WALLET_SECRET=sEdVXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Reserve Wallet (FILL FROM .secrets/xrpl_accounts.json)
RESERVE_WALLET_ADDRESS=rReserveXXXXXXXXXXXXXXXXXXXXXXXX
RESERVE_WALLET_SECRET=sEdYXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Database
DATABASE_URL=postgresql://emergency_user:emergency_pass@localhost:5432/emergency_platform

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_32_CHARS
ENCRYPTION_KEY=CHANGE_THIS_TO_32_BYTE_HEX_KEY

# Batching Configuration
BATCH_THRESHOLD_XRP=100
BATCH_TIME_WINDOW_SECONDS=3600

# API
API_HOST=0.0.0.0
API_PORT=8000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Environment
ENVIRONMENT=development
DEBUG=true
```

**Now create actual `.env`:**

```bash
cd backend

# Copy template
cp .env.example .env

# Generate secrets
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(32))" >> .env.tmp
python3 -c "import secrets; print('ENCRYPTION_KEY=' + secrets.token_hex(32))" >> .env.tmp

# Fill in XRPL addresses from .secrets/xrpl_accounts.json
cat ../.secrets/xrpl_accounts.json

# Manually edit .env with your addresses
nano .env
# Or use VS Code:
code .env
```

**VERIFY your `.env` looks like:**
```bash
POOL_WALLET_ADDRESS=rPool... (real address from xrpl_accounts.json)
POOL_WALLET_SECRET=sEdV... (real seed from xrpl_accounts.json)
RESERVE_WALLET_ADDRESS=rReserve... (real address)
RESERVE_WALLET_SECRET=sEdY... (real seed)
# etc.
```

---

### **Step 2: Frontend `.env.example`**

Create `frontend/.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_XRPL_EXPLORER_URL=https://devnet.xrpl.org
VITE_ENVIRONMENT=development
```

```bash
cd frontend
cp .env.example .env
```

---

### **Step 3: Database Setup**

```bash
# Create PostgreSQL database and user
psql postgres

# In psql shell:
CREATE DATABASE emergency_platform;
CREATE USER emergency_user WITH PASSWORD 'emergency_pass';
GRANT ALL PRIVILEGES ON DATABASE emergency_platform TO emergency_user;
\q
```

**Verify:**
```bash
psql -U emergency_user -d emergency_platform -h localhost
# Should connect successfully
\q
```

---

## 🗄️ Database Schema

Create `backend/app/models/schema.sql` for reference:

```sql
-- This is for documentation. Opus will create SQLAlchemy models.

-- Donations
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_address VARCHAR(34) NOT NULL,
    amount_drops BIGINT NOT NULL,
    payment_tx_hash VARCHAR(64) UNIQUE NOT NULL,
    batch_id VARCHAR(64),
    batch_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_donations_batch_status ON donations(batch_status);
CREATE INDEX idx_donations_donor ON donations(donor_address);

-- Batch Escrows
CREATE TABLE batch_escrows (
    batch_id VARCHAR(64) PRIMARY KEY,
    escrow_tx_hash VARCHAR(64) UNIQUE NOT NULL,
    finish_tx_hash VARCHAR(64),
    total_amount_drops BIGINT NOT NULL,
    donor_count INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'locked',
    trigger_type VARCHAR(20),
    finish_after INTEGER NOT NULL,
    sequence INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX idx_batch_escrows_status ON batch_escrows(status);

-- Disasters
CREATE TABLE disasters (
    disaster_id VARCHAR(64) PRIMARY KEY,
    wallet_address VARCHAR(34) UNIQUE NOT NULL,
    wallet_seed_encrypted TEXT NOT NULL,
    disaster_type VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    total_allocated_drops BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Organizations
CREATE TABLE organizations (
    org_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cause_type VARCHAR(50) NOT NULL,
    wallet_address VARCHAR(34) UNIQUE NOT NULL,
    need_score INTEGER CHECK (need_score BETWEEN 1 AND 10),
    total_received_drops BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Escrows
CREATE TABLE org_escrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id VARCHAR(64) REFERENCES disasters(disaster_id),
    org_id INTEGER REFERENCES organizations(org_id),
    escrow_tx_hash VARCHAR(64) UNIQUE NOT NULL,
    finish_tx_hash VARCHAR(64),
    amount_drops BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'locked',
    finish_after INTEGER NOT NULL,
    cancel_after INTEGER,
    sequence INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX idx_org_escrows_disaster ON org_escrows(disaster_id);
CREATE INDEX idx_org_escrows_org ON org_escrows(org_id);
CREATE INDEX idx_org_escrows_status ON org_escrows(status);
```

---

## 🌐 External Services

### **Step 1: Crossmark SDK (No API Key Needed)**

Crossmark works client-side, no setup needed!

```bash
# Will be installed via npm in frontend
# No API keys required
```

---

### **Step 2: XRPL Node (Public, No Auth)**

```bash
# Devnet (primary)
https://s.devnet.rippletest.net:51234

# Testnet (backup)
https://s.altnet.rippletest.net:51234

# No API keys needed - public nodes!
```

---

### **Step 3: Optional: Monitoring (Skip for Hackathon)**

```bash
# Sentry (error tracking) - optional
# Sign up: sentry.io
# Get DSN: https://...@sentry.io/...
# Add to .env: SENTRY_DSN=...

# For hackathon: Skip this!
```

---

## 📦 Project Structure (Final State)

After all setup, you should have:

```
emergency-platform/
├── .secrets/
│   └── xrpl_accounts.json          # ⚠️ NEVER commit!
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── config.py               # Settings
│   │   ├── database.py             # DB connection
│   │   │
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── donation.py
│   │   │   ├── batch_escrow.py
│   │   │   ├── disaster.py
│   │   │   └── organization.py
│   │   │
│   │   ├── routers/                # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── donations.py
│   │   │   ├── batches.py
│   │   │   ├── emergencies.py
│   │   │   ├── organizations.py
│   │   │   └── xrpl.py
│   │   │
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── xrpl_client.py
│   │   │   ├── batch_manager.py
│   │   │   ├── allocation_engine.py
│   │   │   └── escrow_scheduler.py
│   │   │
│   │   └── utils/                  # Helpers
│   │       ├── __init__.py
│   │       ├── crypto.py
│   │       └── ripple_time.py
│   │
│   ├── .env                        # ⚠️ NEVER commit!
│   ├── .env.example
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini                 # DB migrations
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DonorDashboard.tsx
│   │   │   ├── AdminPanel.tsx
│   │   │   ├── MosaicView.tsx
│   │   │   ├── WalletConnect.tsx
│   │   │   └── ... (more components)
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts              # Backend API client
│   │   │   └── wallet.ts           # Crossmark integration
│   │   │
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── .env                        # ⚠️ NEVER commit!
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── scripts/
│   ├── generate_xrpl_accounts.py   # ✅ Already run
│   ├── init_project.sh             # ✅ Already run
│   ├── seed_demo_data.py           # Opus will create
│   └── test_xrpl_connection.py     # Opus will create
│
├── .gitignore                      # ✅ Created
├── README.md
├── docker-compose.yml              # Opus will create
└── IMPLEMENTATION-ORDER.md         # (below)
```

---

## 🔢 Implementation Order for Opus

Create `IMPLEMENTATION-ORDER.md` to guide Opus:

```markdown
# Implementation Order for Claude Opus 4.6

## Phase 1: Core Infrastructure (2-3 hours)

### 1.1 Backend Foundation
- [ ] `backend/app/config.py` - Load env vars, settings
- [ ] `backend/app/database.py` - SQLAlchemy setup
- [ ] `backend/app/main.py` - FastAPI app with CORS

### 1.2 XRPL Client
- [ ] `backend/app/services/xrpl_client.py`
  - Connect to Devnet
  - Helper: account_info, submit, tx
  - Fee fetching
  - Ripple epoch conversion

### 1.3 Database Models
- [ ] `backend/app/models/donation.py`
- [ ] `backend/app/models/batch_escrow.py`
- [ ] `backend/app/models/disaster.py`
- [ ] `backend/app/models/organization.py`

### 1.4 Seed Organizations
- [ ] Create seed script to add 5 orgs to DB
  - Hospital-A (health, need_score=8)
  - Shelter-B (shelter, need_score=6)
  - NGO-C (food, need_score=7)
  - NGO-D (health, need_score=5)
  - Shelter-E (shelter, need_score=9)

**Test:** `python3 backend/app/main.py` should start without errors

---

## Phase 2: Donation Flow (2-3 hours)

### 2.1 Donation Endpoints
- [ ] `backend/app/routers/donations.py`
  - POST /api/donations/prepare
    - Input: {donor_address, amount_xrp}
    - Output: unsigned Payment tx
  - POST /api/donations/confirm
    - Input: {tx_hash, donor_address}
    - Parse tx from XRPL, save to DB
  - GET /api/donations/status/:address
    - Return donor's donation history

### 2.2 Pool Balance Endpoint
- [ ] `backend/app/routers/xrpl.py`
  - GET /api/xrpl/status
    - Query Pool wallet balance
    - Return current pool XRP, batch info

**Test:** Use curl/Postman to prepare donation, sign in Crossmark, confirm

---

## Phase 3: Batch Escrow System (3-4 hours)

### 3.1 Batch Manager
- [ ] `backend/app/services/batch_manager.py`
  - Background task checking every 60s
  - Dual trigger: 100 XRP OR 1 hour
  - Create batch escrow with donor list in memo
  - Update donations table with batch_id

### 3.2 Batch Endpoints
- [ ] `backend/app/routers/batches.py`
  - GET /api/batches (list all)
  - GET /api/batches/:batch_id (details + donor list)

### 3.3 Escrow Scheduler (Batch Finisher)
- [ ] `backend/app/services/escrow_scheduler.py`
  - Background task checking every 60s
  - Query pending batch escrows
  - If FinishAfter passed → EscrowFinish
  - Update DB with finish_tx_hash

**Test:**
1. Donate until 100 XRP → batch auto-creates
2. Wait 1 hour (or modify FinishAfter to 1 min for testing)
3. Batch auto-finishes → Reserve receives funds

---

## Phase 4: Emergency Allocation (3-4 hours)

### 4.1 Allocation Engine
- [ ] `backend/app/services/allocation_engine.py`
  - calculate_allocations(orgs, total, disaster_info)
  - Weight by need_score
  - Return [{org_id, amount_drops}, ...]

### 4.2 Emergency Endpoints
- [ ] `backend/app/routers/emergencies.py`
  - POST /api/emergencies/trigger
    - Input: {type, location, severity, causes}
    - Steps:
      1. Snapshot Reserve balance
      2. Calculate allocations
      3. Create Disaster wallet
      4. Fund Disaster from Reserve
      5. Create org escrows (3 EscrowCreate txs)
      6. Save to DB
    - Output: {disaster_id, allocations, escrow_txs}

  - GET /api/emergencies/:disaster_id
    - Return disaster details, org escrows, status

### 4.3 Org Escrow Finisher
- [ ] Extend `escrow_scheduler.py`
  - Query pending org escrows
  - If FinishAfter passed → EscrowFinish
  - Update org balance in DB

**Test:**
1. Trigger emergency
2. Verify 3 org escrows created
3. Wait 5 min (or modify for testing)
4. Verify orgs received funds

---

## Phase 5: Frontend Core (3-4 hours)

### 5.1 API Client
- [ ] `frontend/src/services/api.ts`
  - Axios/fetch wrapper
  - Endpoints: donations, batches, emergencies, xrpl

### 5.2 Wallet Integration
- [ ] `frontend/src/services/wallet.ts`
  - connectWallet() → window.crossmark.connect()
  - signDonation(unsignedTx) → window.crossmark.signAndSubmit()

### 5.3 Core Components
- [ ] `frontend/src/components/WalletConnect.tsx`
  - Connect/disconnect button
  - Show connected address

- [ ] `frontend/src/components/DonorDashboard.tsx`
  - Show pool status
  - Donation form (amount input + submit)
  - Donation history (pending vs in batch)
  - Batch escrow proof link

- [ ] `frontend/src/components/AdminPanel.tsx`
  - Show Reserve balance
  - Emergency trigger form
  - Disaster history

### 5.4 App Shell
- [ ] `frontend/src/App.tsx`
  - Routing (Donor, Admin, Mosaic views)
  - Layout with navigation

**Test:**
1. Connect Crossmark
2. Donate 10 XRP
3. See donation in history
4. See pool balance update

---

## Phase 6: Mosaic Visualization (2-3 hours)

### 6.1 Mosaic Component
- [ ] `frontend/src/components/MosaicView.tsx`
  - Fetch all disasters
  - Fetch org escrows per disaster
  - Render grid of tiles:
    - Color by org cause_type
    - Show amount, org name
    - Status: Pending (🔒) or Released (✅)
  - Click tile → Modal with escrow details + explorer links

**Test:**
1. Trigger 2 emergencies
2. Mosaic shows 6 tiles (3 orgs × 2 disasters)
3. Click tile → See escrow tx hashes

---

## Phase 7: Real-Time Updates (1-2 hours)

### 7.1 WebSocket
- [ ] `backend/app/main.py`
  - Add WebSocket endpoint: /ws
  - Broadcast events:
    - donation_received
    - batch_escrow_created
    - emergency_triggered
    - escrow_released

- [ ] `frontend/src/hooks/useWebSocket.ts`
  - Connect to WS
  - Listen for events
  - Update UI in real-time

**Test:**
1. Open 2 browser tabs
2. Donate in tab 1
3. Tab 2 updates immediately

---

## Phase 8: Polish & Demo Prep (2-3 hours)

### 8.1 Seed Demo Data
- [ ] `scripts/seed_demo_data.py`
  - Create 2 past disasters (completed)
  - Create org escrows (finished)
  - Populate mosaic with history

### 8.2 Styling
- [ ] Tailwind CSS setup
- [ ] Responsive design
- [ ] Loading states, error handling

### 8.3 Explorer Links
- [ ] Add "View on Explorer" buttons everywhere
- [ ] Format: `https://devnet.xrpl.org/transactions/{hash}`

### 8.4 Demo Script
- [ ] Write step-by-step demo flow
- [ ] Test entire flow end-to-end
- [ ] Record video walkthrough

**Test:**
Run full demo script 3 times to ensure smooth flow

---

## Phase 9: Optional Advanced Features (if time)

### 9.1 Devnet Batch Transactions
- [ ] Feature flag for Devnet
- [ ] Batch multiple EscrowCreate in one tx

### 9.2 Public Audit Dashboard
- [ ] /audit page (no login)
- [ ] Show total donated, locked, distributed
- [ ] Math verification

### 9.3 Xaman Wallet Support
- [ ] Alternative to Crossmark
- [ ] QR code flow

---

## Testing Checklist

### Backend
- [ ] All endpoints return 200 OK
- [ ] XRPL client connects successfully
- [ ] Batch trigger works (threshold + time)
- [ ] Escrow scheduler runs without errors
- [ ] Emergency allocation succeeds

### Frontend
- [ ] Crossmark connects
- [ ] Donation flow completes
- [ ] Batch escrow shows in UI
- [ ] Emergency trigger works from UI
- [ ] Mosaic renders correctly
- [ ] All explorer links work

### End-to-End
- [ ] Donor → Pool → Batch → Reserve → Disaster → Org (full flow)
- [ ] Multiple disasters in parallel
- [ ] Escrow limits don't conflict
- [ ] All transactions visible on Devnet explorer

---

## Launch Checklist

- [ ] Environment variables set correctly
- [ ] Database seeded with orgs
- [ ] Demo wallets funded (Crossmark)
- [ ] Server accounts funded (Pool, Reserve)
- [ ] Backend running on :8000
- [ ] Frontend running on :3000
- [ ] Background tasks (batch manager, scheduler) running
- [ ] Demo script tested
- [ ] Video recording ready

**You're ready to demo! 🎉**
```

---

## 🧪 Testing Strategy

### **Quick Smoke Tests (Run Before Giving to Opus)**

```bash
# Test 1: PostgreSQL
psql -U emergency_user -d emergency_platform -h localhost -c "SELECT version();"
# Should return PostgreSQL version

# Test 2: Redis
redis-cli ping
# Should return PONG

# Test 3: XRPL Devnet
curl -X POST https://s.devnet.rippletest.net:51234 \
  -H "Content-Type: application/json" \
  -d '{
    "method": "account_info",
    "params": [{
      "account": "rPoolMasterXXXXXXXXXXXXXXXXXXXXXX",
      "ledger_index": "current"
    }]
  }'
# Should return account info with ~1000 XRP balance

# Test 4: Python imports
python3 -c "import xrpl; print('✅ xrpl-py installed')"
python3 -c "import fastapi; print('✅ FastAPI installed')"

# Test 5: Node packages
cd frontend
npm list react
# Should show react@18.x.x
```

---

## 📋 Final Verification Checklist

**Before handing to Opus, verify ALL of these:**

### **Environment**
- [x] Node.js v18+ installed
- [x] Python 3.11+ installed
- [x] PostgreSQL running and accessible
- [x] Redis running and accessible
- [x] Git initialized in project root

### **XRPL Accounts**
- [x] Pool wallet generated and funded (1000 XRP)
- [x] Reserve wallet generated and funded (1000 XRP)
- [x] 3-5 org wallets generated and funded
- [x] 3 Crossmark test wallets created and funded
- [x] All addresses verified on Devnet explorer

### **Configuration**
- [x] `.secrets/xrpl_accounts.json` exists with all accounts
- [x] `backend/.env` created with real XRPL addresses/seeds
- [x] `frontend/.env` created with API URLs
- [x] `.gitignore` includes `.secrets/` and `*.env`
- [x] Database `emergency_platform` created
- [x] Database user `emergency_user` created with password

### **Project Structure**
- [x] All directories created (backend/app, frontend/src, scripts)
- [x] `requirements.txt` in backend
- [x] `package.json` in frontend
- [x] `frontend/node_modules` installed
- [x] Empty Python files created (__init__.py in all modules)

### **Documentation**
- [x] `FINAL-IMPLEMENTATION-PLAN.md` reviewed
- [x] `WALLET-AND-ESCROW-CLARIFICATION.md` reviewed
- [x] `IMPLEMENTATION-ORDER.md` created (above)

### **Testing**
- [x] PostgreSQL connection test passed
- [x] Redis ping test passed
- [x] XRPL Devnet API test passed
- [x] Python packages import successfully
- [x] Crossmark extension installed and test wallet created

---

## 📝 Information Summary for Opus

Create a file `FOR-OPUS.md` with this info:

```markdown
# 🤖 Instructions for Claude Opus 4.6

## Project Overview
Build a production-grade emergency donation platform on XRPL with:
- Batched escrow system (trust + scalability)
- Crossmark wallet integration
- AI-based allocation engine
- Real-time mosaic visualization

## What's Already Done ✅

1. **Project structure created**
   - backend/ and frontend/ folders
   - All directories initialized

2. **XRPL accounts generated and funded**
   - Pool: rPoolMasterXXXXXXXXXXXXXXXXXXXXXX
   - Reserve: rReserveXXXXXXXXXXXXXXXXXXXXXX
   - 5 org wallets (see .secrets/xrpl_accounts.json)
   - All have 1000 test XRP on Devnet

3. **Environment configured**
   - backend/.env with wallet secrets
   - frontend/.env with API URLs
   - PostgreSQL database created
   - Redis running

4. **Dependencies installed**
   - backend/requirements.txt ready
   - frontend/node_modules installed

## What You Need to Build 🚀

Follow `IMPLEMENTATION-ORDER.md` exactly:

1. **Phase 1**: Core infrastructure (config, DB models, XRPL client)
2. **Phase 2**: Donation flow (prepare tx, confirm, save to DB)
3. **Phase 3**: Batch escrow system (auto-batch at 100 XRP or 1 hour)
4. **Phase 4**: Emergency allocation (trigger, create escrows to orgs)
5. **Phase 5**: Frontend (Crossmark wallet, donor dashboard, admin panel)
6. **Phase 6**: Mosaic visualization
7. **Phase 7**: WebSocket real-time updates
8. **Phase 8**: Polish and demo prep

## Key Files to Reference

1. **Complete spec**: `FINAL-IMPLEMENTATION-PLAN.md`
   - Full API specs, code examples, flow diagrams

2. **Wallet & escrow guide**: `WALLET-AND-ESCROW-CLARIFICATION.md`
   - How Crossmark works, how escrows transfer funds

3. **Accounts**: `.secrets/xrpl_accounts.json`
   - Real XRPL addresses and seeds (use these!)

4. **Environment**: `backend/.env`
   - All secrets and config (already filled in)

## Implementation Notes

### XRPL Transaction Signing
```python
from xrpl.wallet import Wallet
from xrpl.transaction import sign, submit_and_wait

pool_wallet = Wallet.from_seed(os.getenv("POOL_WALLET_SECRET"))

tx = {...}  # Transaction object
signed = sign(tx, pool_wallet)
result = submit_and_wait(signed, xrpl_client)
```

### Batch Trigger Logic
```python
# In batch_manager.py
if pool_balance >= 100_000_000:  # 100 XRP in drops
    create_batch_escrow()
elif time_since_last_batch >= 3600:  # 1 hour
    create_batch_escrow()
```

### Crossmark Frontend
```typescript
// In wallet.ts
const wallet = await window.crossmark.connect();
const result = await window.crossmark.signAndSubmit(unsignedTx);
```

## Testing Commands

```bash
# Backend
cd backend
python3 -m uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev

# Test donation flow
curl -X POST http://localhost:8000/api/donations/prepare \
  -H "Content-Type: application/json" \
  -d '{"donor_address": "rDonor1...", "amount_xrp": 25}'
```

## Success Criteria

### Minimum (MVP)
- [ ] Donor can donate via Crossmark
- [ ] Batch escrow creates at 100 XRP
- [ ] Admin can trigger emergency
- [ ] Org escrows create and finish
- [ ] Mosaic shows allocations

### Winning
- [ ] All MVP +
- [ ] Real-time WebSocket updates
- [ ] Beautiful UI with Tailwind
- [ ] Public audit dashboard
- [ ] All transactions link to Devnet explorer

## Start Here 👇

1. Read `IMPLEMENTATION-ORDER.md`
2. Start with Phase 1.1: `backend/app/config.py`
3. Follow the checklist item by item
4. Test each phase before moving to next
5. Ask if anything is unclear!

**Let's build! 🚀**
```

---

## 🎯 Final Pre-Opus Checklist

**Print this and check off as you go:**

```
CRITICAL (Must Have)
□ PostgreSQL running and db created
□ Redis running
□ XRPL accounts in .secrets/xrpl_accounts.json
□ backend/.env with real wallet seeds
□ frontend/.env created
□ Crossmark extension installed
□ 3 test wallets funded on Devnet
□ All accounts verified on explorer (balance ~1000 XRP)

IMPORTANT (Should Have)
□ Python packages installed (xrpl-py, fastapi)
□ Node modules installed (frontend)
□ Project structure created
□ .gitignore includes secrets
□ IMPLEMENTATION-ORDER.md created
□ FOR-OPUS.md created

NICE TO HAVE (Optional)
□ Docker installed
□ VS Code with Python extension
□ Postman or similar for API testing
```

---

## 🚀 Hand-off to Opus

**When all checkboxes above are ✅, create this message for Opus:**

```
Hi Claude Opus! I need you to build an emergency donation platform on XRPL.

📁 Project location: /Users/aryamangoenka/Desktop/Maiaedge

📖 Read these files IN ORDER:
1. .cursor/plans/FOR-OPUS.md (start here - your instructions!)
2. .cursor/plans/IMPLEMENTATION-ORDER.md (step-by-step checklist)
3. .cursor/plans/FINAL-IMPLEMENTATION-PLAN.md (complete technical spec)
4. .cursor/plans/WALLET-AND-ESCROW-CLARIFICATION.md (how Crossmark & escrows work)

✅ What's ready:
- XRPL accounts generated and funded on Devnet
- Database created (PostgreSQL)
- Environment variables configured
- Project structure initialized
- Dependencies installed

🎯 Your task:
Follow IMPLEMENTATION-ORDER.md exactly. Start with Phase 1.1 (backend/app/config.py).

Build the complete platform with:
- Batched escrow system
- Crossmark wallet integration
- AI allocation engine
- Mosaic visualization
- Real-time WebSocket updates

🧪 Test each phase before moving to the next.
❓ Ask questions if anything is unclear.

Let's build! 🚀
```

---

## 🎉 You're Ready!

Once you complete this entire checklist, you'll have:

✅ All XRPL accounts funded and ready
✅ Complete environment setup
✅ All dependencies installed
✅ Database ready to go
✅ Complete technical documentation
✅ Step-by-step implementation guide
✅ Testing strategy prepared

**Opus will have everything it needs to build the entire platform smoothly and error-free!**

---

**Next Step**: Complete this checklist, then hand off to Opus with the message above! 🚀
