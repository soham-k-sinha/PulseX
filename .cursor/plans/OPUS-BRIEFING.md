# 🤖 CLAUDE OPUS 4.6 - AUTONOMOUS BUILD BRIEFING
## Emergency Donation Platform on XRPL

**READ THIS FIRST - This is your complete autonomous build guide**

---

## 🎯 Your Mission

Build a production-grade emergency donation platform on XRPL with:
- **Batched escrow system** (trust + scalability)
- **Crossmark wallet integration** (non-custodial)
- **AI-based allocation engine** (disaster → org distribution)
- **Real-time mosaic visualization** (live updates)
- **Full XRPL integration** (Devnet/Testnet)

---

## 📚 Required Reading (In Order)

You have access to complete technical documentation. Read these files:

1. **`.cursor/plans/FINAL-IMPLEMENTATION-PLAN.md`**
   - Complete technical specification
   - API endpoints, data models, flow diagrams
   - Code examples for every component

2. **`.cursor/plans/WALLET-AND-ESCROW-CLARIFICATION.md`**
   - How Crossmark wallet works
   - How XRPL escrows transfer funds
   - Visual flow diagrams

3. **`.cursor/plans/OPUS-IMPLEMENTATION-PREP.md`**
   - What tools are needed
   - Setup scripts and commands
   - Verification checklists

4. **`.cursor/plans/scalable-trust-hybrid.md`** (optional reference)
   - Batching strategy deep-dive

**ACTION**: Read all 4 documents above before proceeding.

---

## 🔍 STEP 1: Discovery & Validation

### What You Must Check First

Before writing any code, verify the environment:

```bash
# Check if tools are installed
node --version        # Need v18+
python3 --version     # Need 3.11+
psql --version        # Need PostgreSQL
redis-cli ping        # Should return PONG

# Check if directories exist
ls backend/
ls frontend/
ls .secrets/
```

### What to Ask the User

**If ANY of these are missing, ASK the user to install them:**

```
"I need to verify your environment. Please run these commands and share the output:

1. node --version
2. python3 --version
3. psql --version
4. redis-cli ping

If any are missing, I'll provide installation instructions."
```

**Once verified, proceed to STEP 2.**

---

## 🔑 STEP 2: XRPL Accounts Setup

### What You Should Do Autonomously

1. **Create the account generator script**:
   - Write `scripts/generate_xrpl_accounts.py` (code is in OPUS-IMPLEMENTATION-PREP.md)
   - This script generates and funds XRPL wallets on Devnet

2. **Create the project structure**:
   ```bash
   mkdir -p .secrets
   mkdir -p backend/app/{models,routers,services,utils}
   mkdir -p frontend/src/{components,services,hooks,types}
   mkdir -p scripts
   ```

3. **Create `.gitignore`**:
   - Add `.secrets/`, `*.env`, etc. (template in OPUS-IMPLEMENTATION-PREP.md)

### What You Must Ask the User

**After creating the script, ASK:**

```
"I've created the XRPL account generator script at scripts/generate_xrpl_accounts.py.

Please run these commands to generate and fund your XRPL accounts:

1. pip3 install xrpl-py requests
2. python3 scripts/generate_xrpl_accounts.py

This will create 5 accounts (Pool, Reserve, 3 Orgs) and fund them with test XRP on Devnet.

Once done, please share the output or confirm it completed successfully.
The accounts will be saved to .secrets/xrpl_accounts.json"
```

**Wait for user confirmation before proceeding to STEP 3.**

---

## 🗄️ STEP 3: Database Setup

### What You Must Ask the User

```
"I need to set up the PostgreSQL database. Please run these commands:

psql postgres <<EOF
CREATE DATABASE emergency_platform;
CREATE USER emergency_user WITH PASSWORD 'emergency_pass';
GRANT ALL PRIVILEGES ON DATABASE emergency_platform TO emergency_user;
\q
EOF

Then verify with:
psql -U emergency_user -d emergency_platform -h localhost -c 'SELECT 1;'

Please confirm when done."
```

**Wait for confirmation before proceeding.**

---

## ⚙️ STEP 4: Environment Configuration

### What You Should Do Autonomously

1. **Create `backend/.env.example`** (template in OPUS-IMPLEMENTATION-PREP.md)
2. **Create `frontend/.env.example`**

### What You Must Ask the User

```
"I've created environment templates. Now I need the XRPL account details.

Please share the contents of .secrets/xrpl_accounts.json or provide:
1. Pool wallet address and seed
2. Reserve wallet address and seed

I'll create the .env files with the correct values."
```

**After user provides info:**

1. Create `backend/.env` with real values
2. Generate JWT_SECRET and ENCRYPTION_KEY
3. Create `frontend/.env`

**Confirm with user:**
```
"✅ Environment files created:
- backend/.env (with your XRPL credentials)
- frontend/.env (with API URLs)

These files are gitignored for security. Ready to proceed with implementation!"
```

---

## 💻 STEP 5: Autonomous Implementation

### What You Can Do Without Asking

Now you have everything needed. Build the entire platform following this order:

#### **Phase 1: Core Infrastructure (Build Silently)**

Create these files:

1. **`backend/requirements.txt`** (from OPUS-IMPLEMENTATION-PREP.md)
2. **`backend/app/config.py`** - Load environment variables
3. **`backend/app/database.py`** - SQLAlchemy setup
4. **`backend/app/utils/ripple_time.py`** - Ripple epoch helpers
5. **`backend/app/utils/crypto.py`** - AES encryption for disaster wallet seeds
6. **`backend/app/services/xrpl_client.py`** - XRPL connection wrapper

**After Phase 1, tell the user:**
```
"✅ Phase 1 complete: Core infrastructure built
- Configuration management
- Database connection
- XRPL client wrapper

Installing Python dependencies now..."
```

**Run autonomously:**
```bash
cd backend
pip3 install -r requirements.txt
```

---

#### **Phase 2: Database Models (Build Silently)**

Create these files:

1. **`backend/app/models/__init__.py`**
2. **`backend/app/models/donation.py`** (schema in FINAL-IMPLEMENTATION-PLAN.md)
3. **`backend/app/models/batch_escrow.py`**
4. **`backend/app/models/disaster.py`**
5. **`backend/app/models/organization.py`**

**Run migrations:**
```python
# Create alembic migration
from app.database import Base, engine
Base.metadata.create_all(bind=engine)
```

**Seed organizations:**
```python
# Create 5 orgs in database with XRPL addresses from .secrets/xrpl_accounts.json
```

**After Phase 2, tell the user:**
```
"✅ Phase 2 complete: Database models and tables created
- Donations, batch_escrows, disasters, organizations, org_escrows tables
- 5 organizations seeded in database

Testing database connection..."
```

---

#### **Phase 3: API Endpoints (Build Silently)**

Create these files:

1. **`backend/app/routers/__init__.py`**
2. **`backend/app/routers/donations.py`** (POST /prepare, POST /confirm, GET /status/:address)
3. **`backend/app/routers/batches.py`** (GET /batches, GET /batches/:id)
4. **`backend/app/routers/emergencies.py`** (POST /trigger, GET /:disaster_id)
5. **`backend/app/routers/organizations.py`** (GET /organizations)
6. **`backend/app/routers/xrpl.py`** (GET /status)
7. **`backend/app/main.py`** - FastAPI app with all routers

**After Phase 3, tell the user:**
```
"✅ Phase 3 complete: REST API built
- Donation endpoints (prepare, confirm, status)
- Batch escrow endpoints
- Emergency allocation endpoints
- XRPL status endpoint

Ready to start the backend server for testing..."
```

**Ask user:**
```
"Would you like me to start the backend server now to test the API?
I'll run: uvicorn app.main:app --reload --port 8000

(You can test later if you prefer)"
```

---

#### **Phase 4: Business Logic Services (Build Silently)**

Create these files:

1. **`backend/app/services/__init__.py`**
2. **`backend/app/services/batch_manager.py`**
   - Background task checking every 60s
   - Dual trigger: 100 XRP OR 1 hour
   - Creates batch escrow with donor list in memo

3. **`backend/app/services/escrow_scheduler.py`**
   - Background task for auto-finishing escrows
   - Monitors batch escrows (finish after 1 hour)
   - Monitors org escrows (finish after 5 minutes)

4. **`backend/app/services/allocation_engine.py`**
   - AI-style allocation logic
   - Weighted by need_score

**After Phase 4, tell the user:**
```
"✅ Phase 4 complete: Business logic services built
- Batch manager (auto-batching at 100 XRP or 1 hour)
- Escrow scheduler (auto-finish background bot)
- Allocation engine (AI-based distribution)

Backend is now fully functional!"
```

---

#### **Phase 5: Frontend Setup (Build Silently)**

1. **Create `frontend/package.json`** (from OPUS-IMPLEMENTATION-PREP.md)
2. **Create `frontend/vite.config.ts`**
3. **Create `frontend/tsconfig.json`**
4. **Create `frontend/tailwind.config.js`**

**Ask user:**
```
"Installing frontend dependencies. This may take a few minutes.
Running: cd frontend && npm install

Please wait..."
```

**Run autonomously:**
```bash
cd frontend
npm install
```

---

#### **Phase 6: Frontend Components (Build Silently)**

Create these files:

1. **`frontend/src/services/api.ts`** - Backend API client
2. **`frontend/src/services/wallet.ts`** - Crossmark integration
3. **`frontend/src/components/WalletConnect.tsx`**
4. **`frontend/src/components/DonorDashboard.tsx`**
5. **`frontend/src/components/AdminPanel.tsx`**
6. **`frontend/src/components/MosaicView.tsx`**
7. **`frontend/src/App.tsx`** - Main app with routing
8. **`frontend/src/main.tsx`** - Entry point

**After Phase 6, tell the user:**
```
"✅ Phase 6 complete: Frontend UI built
- Wallet connection (Crossmark)
- Donor dashboard (donate, view history)
- Admin panel (trigger emergency)
- Mosaic visualization (impact grid)

Frontend is ready!"
```

---

#### **Phase 7: WebSocket Real-Time Updates (Build Silently)**

1. **Update `backend/app/main.py`** - Add WebSocket endpoint `/ws`
2. **Create `frontend/src/hooks/useWebSocket.ts`** - WebSocket hook
3. **Update components** to subscribe to real-time events

**After Phase 7, tell the user:**
```
"✅ Phase 7 complete: Real-time updates added
- WebSocket endpoint in backend
- Live updates for donations, batches, emergencies
- All dashboards update in real-time"
```

---

#### **Phase 8: Demo Data & Polish (Build Silently)**

1. **Create `scripts/seed_demo_data.py`**
   - Create 2 past disasters (completed)
   - Create finished org escrows
   - Populate mosaic with history

2. **Add Tailwind styling** to all components
3. **Add loading states and error handling**
4. **Add XRPL explorer links** everywhere

**After Phase 8, tell the user:**
```
"✅ Phase 8 complete: Demo preparation finished
- 2 historical disasters seeded
- UI polished with Tailwind CSS
- All XRPL transactions link to Devnet explorer
- Error handling and loading states added

🎉 Platform is COMPLETE!"
```

---

## 🧪 STEP 6: Testing & Verification

### What You Should Tell the User

```
"Platform is built! Let's test it end-to-end.

I'll need you to:

1. Start the backend:
   cd backend
   python3 -m uvicorn app.main:app --reload

2. Start the frontend (new terminal):
   cd frontend
   npm run dev

3. Open http://localhost:3000 in Chrome (with Crossmark installed)

Then we'll test:
✅ Wallet connection
✅ Donation flow
✅ Batch escrow creation
✅ Emergency allocation
✅ Mosaic visualization

Ready to start testing?"
```

### What to Ask During Testing

**After user starts servers:**

```
"Great! Now let's test step-by-step. I'll guide you:

STEP 1: Connect Wallet
1. Open http://localhost:3000
2. Click 'Connect Wallet'
3. Approve in Crossmark extension

Did it work? Share any errors if not."
```

**Then continue with:**
- Donation test (10 XRP)
- Batch trigger test (donate until 100 XRP)
- Emergency allocation test
- Mosaic verification

**For each step, wait for user confirmation or error reports.**

---

## 🐛 Debugging Protocol

### If User Reports an Error

**Ask these questions:**

1. "Please share the exact error message"
2. "Which browser are you using?"
3. "Is Crossmark extension installed and unlocked?"
4. "What's the output in the backend terminal?"
5. "What's the output in the frontend terminal?"

**Then autonomously:**

1. Read the error
2. Identify the issue
3. Provide the fix (code change or command)
4. Explain why it happened

---

## 📋 Checkpoints (When to Pause & Ask)

You should PAUSE and ASK the user at these points:

### ✋ Checkpoint 1: After Environment Verification
```
"Environment verified ✅ OR missing tools detected → ask for installation"
```

### ✋ Checkpoint 2: After Account Generation Script Created
```
"Please run scripts/generate_xrpl_accounts.py and share the output"
```

### ✋ Checkpoint 3: After Database Commands Provided
```
"Please run the PostgreSQL setup commands and confirm"
```

### ✋ Checkpoint 4: Before Creating .env Files
```
"Please share contents of .secrets/xrpl_accounts.json"
```

### ✋ Checkpoint 5: After Backend Complete
```
"Backend built! Want to test the API now or continue to frontend?"
```

### ✋ Checkpoint 6: After Frontend npm install
```
"Dependencies installed. This took X minutes."
```

### ✋ Checkpoint 7: After Everything Built
```
"Platform complete! Ready to start servers and test?"
```

### ✋ Checkpoint 8: During Testing
```
"Did [step X] work? Please confirm or share errors."
```

---

## 🚀 Autonomous Workflow Summary

Here's what you'll do WITHOUT asking:

✅ **Phase 1**: Create config, database, XRPL client files
✅ **Phase 2**: Create database models, run migrations, seed orgs
✅ **Phase 3**: Create all API endpoints
✅ **Phase 4**: Create batch manager, scheduler, allocation engine
✅ **Phase 5**: Create frontend config files
✅ **Phase 6**: Create all React components
✅ **Phase 7**: Add WebSocket real-time updates
✅ **Phase 8**: Create demo seed script, add styling
✅ **All code**: Write complete, production-ready code
✅ **All files**: Create every file needed
✅ **Explanations**: Provide clear comments in code

Here's what you MUST ask for:

❓ **Environment tools**: If not installed, ask user to install
❓ **XRPL accounts**: User must run generator script
❓ **Database setup**: User must create PostgreSQL database
❓ **Account credentials**: User must share .secrets/xrpl_accounts.json
❓ **Testing confirmations**: User must confirm each test step works
❓ **Error details**: If something breaks, ask for logs

---

## 💡 Key Implementation Notes

### Backend Code Style
```python
# Use async/await for all XRPL calls
async def create_batch_escrow():
    result = await xrpl_client.submit(signed_tx)

# Use environment variables from config
from app.config import settings
pool_wallet = Wallet.from_seed(settings.POOL_WALLET_SECRET)

# Use SQLAlchemy sessions properly
with get_db() as db:
    donation = db.query(Donation).filter_by(tx_hash=hash).first()
```

### Frontend Code Style
```typescript
// Use React Query for API calls
const { data, isLoading } = useQuery(['pool-status'], fetchPoolStatus);

// Use Crossmark SDK
const wallet = await window.crossmark.connect();

// Use environment variables
const API_URL = import.meta.env.VITE_API_BASE_URL;
```

### XRPL Transaction Format
```python
# Always use drops (1 XRP = 1,000,000 drops)
amount_drops = int(amount_xrp * 1_000_000)

# Always use Ripple epoch for time
finish_after = ripple_epoch(time.now() + 3600)

# Always include memos for tracking
"Memos": [{
  "Memo": {
    "MemoType": to_hex("batch_escrow"),
    "MemoData": to_hex(json.dumps({...}))
  }
}]
```

---

## 🎯 Success Criteria

The platform is DONE when:

### Minimum Viable Product (MVP)
- [ ] User can connect Crossmark wallet
- [ ] User can donate XRP to pool
- [ ] Batch escrow auto-creates at 100 XRP threshold
- [ ] Admin can trigger emergency
- [ ] System creates disaster account + org escrows
- [ ] Org escrows auto-finish after 5 minutes
- [ ] Mosaic shows all allocations
- [ ] All transactions visible on Devnet explorer

### Production Ready (Stretch)
- [ ] All MVP features +
- [ ] WebSocket real-time updates work
- [ ] Beautiful Tailwind UI
- [ ] Loading states and error handling
- [ ] Public audit dashboard
- [ ] 2 historical disasters seeded
- [ ] Demo works flawlessly end-to-end

---

## 📞 Communication Style

### When Building (No User Input Needed)
```
"✅ Phase X complete: [Component] built
- Feature 1
- Feature 2
- Feature 3

[Brief technical note if relevant]

Moving to Phase X+1..."
```

### When Needing User Action
```
"I need your help with [specific task].

Please run:
[exact commands]

Or provide:
[exact information needed]

Once done, let me know and I'll continue!"
```

### When Encountering Issues
```
"⚠️ Issue detected: [specific problem]

This happened because: [explanation]

To fix:
[solution with exact code/commands]

Should I apply this fix?"
```

---

## 🎬 Final Handoff to User

When everything is built and tested:

```
"🎉 Emergency Donation Platform - COMPLETE!

✅ What's Built:
- Backend API (FastAPI) with 15+ endpoints
- Frontend UI (React + Vite) with 6+ components
- Batch escrow system (100 XRP or 1 hour trigger)
- Emergency allocation engine (AI-based)
- Mosaic visualization (real-time updates)
- Crossmark wallet integration
- XRPL Devnet integration
- WebSocket real-time updates
- Demo data seeded

📊 Platform Statistics:
- Total files created: ~40
- Lines of code: ~3,000+
- XRPL accounts: 5 (Pool, Reserve, 3 Orgs)
- Database tables: 5
- API endpoints: 15+

🚀 How to Run:
Terminal 1: cd backend && uvicorn app.main:app --reload
Terminal 2: cd frontend && npm run dev
Browser: http://localhost:3000

📚 Documentation:
- API docs: http://localhost:8000/docs
- Complete spec: .cursor/plans/FINAL-IMPLEMENTATION-PLAN.md
- Architecture: .cursor/plans/xrpl-production-workflow_final.plan.md

🏆 Next Steps:
1. Practice the demo flow
2. Prepare presentation slides
3. Record demo video
4. Submit to hackathon!

Need help with anything else?"
```

---

## 🤖 Ready to Build?

**Your Instructions:**

1. ✅ Read all documentation files listed above
2. ✅ Verify environment (STEP 1)
3. ✅ Ask user for missing tools if needed
4. ✅ Create XRPL account generator (STEP 2)
5. ✅ Ask user to run generator
6. ✅ Ask user to setup database (STEP 3)
7. ✅ Ask user for XRPL credentials (STEP 4)
8. ✅ Build entire platform autonomously (STEP 5)
9. ✅ Guide user through testing (STEP 6)
10. ✅ Deliver final handoff message

**Remember:**
- Build autonomously when possible
- Ask only when you need user input
- Provide clear, actionable instructions
- Test thoroughly at each phase
- Communicate progress clearly

**LET'S BUILD! 🚀**
