# 🔑 Wallet Integration & Escrow Flow - Simple Explanation

---

## 📱 Question 1: Donor Wallet Options (Xaman vs Crossmark)

### **You have TWO wallet options for donors:**

#### **Option A: Crossmark (Easier for Hackathon) ✅ RECOMMENDED**

**What it is:**
- Browser extension (like MetaMask for Ethereum)
- Desktop/laptop only
- Works with Chrome, Firefox, Edge

**How it works:**
```
1. User installs Crossmark extension
2. Your web app: "Connect Wallet" button
3. Extension pops up: "Approve connection?"
4. User approves → You get their XRPL address
5. When donating: Extension shows tx preview
6. User clicks "Sign" → Transaction sent to XRPL
```

**Code Example:**
```javascript
// Frontend (super simple!)
import { Crossmark } from '@crossmarkio/sdk';

// Connect wallet
const wallet = await window.crossmark.connect();
console.log(wallet.address); // "rDonor1...XYZ"

// Donate
const result = await window.crossmark.signAndSubmit({
  TransactionType: "Payment",
  Account: wallet.address,
  Destination: "rPool...ABC",
  Amount: "25000000" // 25 XRP
});

console.log(result.hash); // "ABC123..."
```

**Why recommended for hackathon:**
- ✅ Works directly in browser (no phone needed)
- ✅ Instant signing (no QR codes)
- ✅ Judges can test on their laptops
- ✅ Simpler demo flow

---

#### **Option B: Xaman (Production-Grade)**

**What it is:**
- Mobile app (iOS/Android) + Desktop app
- Most popular XRPL wallet (500K+ users)
- Professional-grade security

**How it works:**
```
1. User has Xaman app on phone
2. Your web app: "Sign in with Xaman" button
3. Backend creates "sign request" → Gets QR code + deep link
4. User scans QR code with Xaman app
5. Xaman app shows tx details on phone
6. User approves on phone → Transaction sent to XRPL
7. Backend gets notification → Updates your app
```

**Code Example:**
```javascript
// Backend (Node.js/Python)
import { XummSdk } from 'xumm-sdk';
const xumm = new XummSdk('YOUR_API_KEY');

// Create sign request
const request = await xumm.payload.create({
  TransactionType: "Payment",
  Account: "rDonor1...XYZ",
  Destination: "rPool...ABC",
  Amount: "25000000"
});

// Frontend shows:
// 1. QR code: request.refs.qr_png
// 2. Deep link button: request.next.always (opens Xaman app)

// Wait for user to sign
const result = await xumm.payload.subscribe(request.uuid);
console.log(result.payload.tx_hash); // "ABC123..."
```

**Why use Xaman:**
- ✅ More users in real world
- ✅ Better security (private keys on phone)
- ✅ Professional look
- ❌ Requires phone + QR code (slower demo)

---

### **Recommendation for Hackathon:**

```
PRIMARY: Crossmark (desktop demo)
BONUS: Add Xaman support if time permits

Demo Script:
  "We support both Crossmark for desktop users
   and Xaman for mobile - industry standard!"
```

---

## 💰 Question 2: How Funds Move from Escrow to Organization

### **The Escrow Journey (Step-by-Step)**

```
STATE 1: BEFORE ESCROW
═══════════════════════════════════════════════════════════
Pool Wallet Balance: 105 XRP
Hospital-A Balance: 10 XRP (pre-funded for fees)
```

```
STATE 2: ESCROW CREATED (Money "Disappears")
═══════════════════════════════════════════════════════════

Backend executes:
  {
    "TransactionType": "EscrowCreate",
    "Account": "rPool...ABC", // Pool wallet
    "Destination": "rHospital...XYZ", // Hospital wallet
    "Amount": "25000000" // 25 XRP
  }

Result on XRPL:
  ✅ Transaction succeeds

Pool Wallet Balance: 80 XRP (lost 25 XRP)
Hospital-A Balance: 10 XRP (no change yet!)

❓ Where did the 25 XRP go???

Answer: It's in LIMBO (the escrow object on the ledger)!
```

### **What Actually Happens Behind the Scenes:**

When you create an escrow, XRPL:
1. Deducts 25 XRP from Pool wallet
2. Creates an **Escrow object** on the ledger
3. This object stores: `{from: Pool, to: Hospital, amount: 25 XRP, unlock_time: ...}`
4. The 25 XRP is "locked" - neither Pool nor Hospital can touch it!

**You can see it with:**
```python
# Query escrows owned by Pool wallet
response = xrpl_client.request({
  "command": "account_objects",
  "account": "rPool...ABC",
  "type": "escrow"
})

# Returns:
{
  "account_objects": [
    {
      "LedgerEntryType": "Escrow",
      "Account": "rPool...ABC",
      "Destination": "rHospital...XYZ",
      "Amount": "25000000",
      "FinishAfter": 1708003800,
      "PreviousTxnID": "ABC123...",
      // ... more fields
    }
  ]
}
```

This is the **PROOF** that 25 XRP is locked for Hospital!

---

```
STATE 3: ESCROW FINISHED (Money Delivered)
═══════════════════════════════════════════════════════════

⏰ 5 minutes pass (FinishAfter time reached)

Backend executes:
  {
    "TransactionType": "EscrowFinish",
    "Account": "rPool...ABC", // Must be escrow owner
    "Owner": "rPool...ABC",
    "OfferSequence": 12345, // Sequence# from EscrowCreate
    "Destination": "rHospital...XYZ"
  }

Result on XRPL:
  ✅ Transaction succeeds
  ✅ Escrow object DELETED from ledger
  ✅ 25 XRP transferred to Hospital

Pool Wallet Balance: 80 XRP (unchanged)
Hospital-A Balance: 35 XRP (increased by 25!)

✅ Money delivered!
```

---

## 🎥 Visual Flow Diagram

```
ESCROW LIFECYCLE (25 XRP Example)
═════════════════════════════════════════════════════════════

TIME: 0:00 - EscrowCreate Transaction
┌──────────────┐                              ┌──────────────┐
│ Pool Wallet  │                              │  Hospital-A  │
│ 105 XRP      │                              │  10 XRP      │
└──────┬───────┘                              └──────────────┘
       │
       │ Deduct 25 XRP
       ▼
┌──────────────┐
│ Pool Wallet  │
│  80 XRP      │◄────────────────┐
└──────────────┘                 │
                                 │
                    ┌────────────┴──────────────┐
                    │  ESCROW OBJECT (on ledger)│
                    │  ┌──────────────────────┐ │
                    │  │ From: Pool           │ │
                    │  │ To: Hospital         │ │
                    │  │ Amount: 25 XRP       │ │
                    │  │ Unlock: 0:05         │ │
                    │  │ Status: LOCKED 🔒   │ │
                    │  └──────────────────────┘ │
                    └───────────────────────────┘

Balances:
  Pool: 80 XRP (-25)
  Hospital: 10 XRP (no change)
  Escrow: 25 XRP (locked in limbo)
```

```
TIME: 0:00 to 0:05 - Waiting Period
═════════════════════════════════════════════════════════════

┌──────────────┐                              ┌──────────────┐
│ Pool Wallet  │                              │  Hospital-A  │
│  80 XRP      │                              │  10 XRP      │
└──────────────┘                              └──────────────┘

              ESCROW OBJECT: 25 XRP 🔒
              "Locked for 4:32 more..."

Anyone trying to access the 25 XRP:
  Pool: ❌ Can't reclaim (locked)
  Hospital: ❌ Can't withdraw yet (locked)
  Hacker: ❌ Can't steal (cryptographically secured)
```

```
TIME: 0:05 - EscrowFinish Transaction
═════════════════════════════════════════════════════════════

┌──────────────┐                              ┌──────────────┐
│ Pool Wallet  │                              │  Hospital-A  │
│  80 XRP      │                              │  10 XRP      │
└──────────────┘                              └──────┬───────┘
                                                     │
              ESCROW OBJECT: 25 XRP 🔓              │
              "Unlocked! Delivering..."              │
                                                     │ Add 25 XRP
                                                     ▼
                                              ┌──────────────┐
                                              │  Hospital-A  │
                                              │  35 XRP ✅   │
                                              └──────────────┘

Balances:
  Pool: 80 XRP (unchanged)
  Hospital: 35 XRP (+25)
  Escrow: DELETED (object removed from ledger)
```

---

## 🔍 Who Can Finish the Escrow?

**Important XRPL Rule:**

```python
# EscrowFinish transaction
{
  "TransactionType": "EscrowFinish",
  "Account": "rPool...ABC",  # ⚠️ MUST be the escrow OWNER
  "Owner": "rPool...ABC",
  "Destination": "rHospital...XYZ"
}

# This means:
# ✅ Pool wallet can finish it (sends to Hospital)
# ❌ Hospital CANNOT finish it themselves!
# ❌ Random person CANNOT finish it!
```

**Why this design?**
- Prevents recipient from grabbing funds early
- Platform controls when funds release (validation period)
- Platform signs EscrowFinish = funds delivered

**In your system:**
- Pool wallet creates escrow (EscrowCreate)
- Scheduler bot finishes escrow (EscrowFinish) after time passes
- Hospital passively receives funds

---

## 🤖 Automated Release (How Scheduler Works)

```python
# Background service running 24/7
class EscrowScheduler:
    async def run_forever(self):
        while True:
            # Every 60 seconds, check all escrows
            escrows = db.get_locked_escrows()

            for escrow in escrows:
                # Check if unlock time passed
                if time.now() >= escrow.finish_after:
                    # Execute EscrowFinish
                    finish_tx = {
                        "TransactionType": "EscrowFinish",
                        "Account": POOL_ADDRESS,
                        "Owner": POOL_ADDRESS,
                        "OfferSequence": escrow.sequence,
                        "Destination": escrow.org_address
                    }

                    result = xrpl_client.submit(sign(finish_tx, pool_wallet))

                    if result.success:
                        print(f"✅ Delivered {escrow.amount} to {escrow.org_name}")
                        db.mark_escrow_finished(escrow.id)

            await asyncio.sleep(60)  # Wait 1 minute, repeat
```

**What hospital sees:**
```
Hospital Dashboard:

10:30 AM - Escrow Created
  "You have 25 XRP pending (unlocks in 4:52)"

10:35 AM - 5 minutes later
  "✅ Funds received! +25 XRP"
  "View transaction: FINISH_ABC123..."

Check balance on XRPL:
  testnet.xrpl.org/accounts/rHospital...XYZ
  → Shows: Balance increased from 10 to 35 XRP
  → Shows: Transaction "EscrowFinish" received 25 XRP
```

---

## 🎬 Full Demo Walkthrough (With Wallet Choice)

### **Demo Setup:**

```bash
# Install Crossmark extension
1. Open Chrome
2. Go to chrome.google.com/webstore
3. Search "Crossmark XRPL"
4. Click "Add to Chrome"

# Create test wallet
1. Click Crossmark icon in browser
2. "Create New Wallet"
3. Write down seed phrase (testnet wallet)
4. Fund from faucet:
   - Visit faucet.devnet.rippletest.net
   - Paste your address
   - Get 1000 XRP (test XRP, no value)
```

---

### **Live Demo (5 minutes with Crossmark):**

```
ACT 1: CONNECT WALLET (15 seconds)
═══════════════════════════════════════════════════════════

You: "First, I'll connect my donor wallet..."

1. Click "Connect Wallet" button on your app
2. Crossmark popup appears:
   ┌──────────────────────────────┐
   │ Crossmark                    │
   │                              │
   │ emergency-platform.com wants │
   │ to connect to your wallet    │
   │                              │
   │ Connected address:           │
   │ rDonor1...XYZ                │
   │                              │
   │ [Cancel]  [Connect]          │
   └──────────────────────────────┘

3. Click "Connect"
4. App updates: "✅ Connected: rDonor1...XYZ"

Judge: "Nice! Non-custodial!" ✅
```

```
ACT 2: DONATE TO POOL (30 seconds)
═══════════════════════════════════════════════════════════

You: "Now I'll donate 25 XRP..."

1. Enter amount: "25 XRP"
2. Click "Donate"
3. Crossmark popup appears:
   ┌──────────────────────────────┐
   │ Crossmark                    │
   │                              │
   │ Approve Transaction          │
   │                              │
   │ Type: Payment                │
   │ To: rPool...ABC              │
   │ Amount: 25 XRP               │
   │ Fee: 0.000012 XRP            │
   │                              │
   │ [Reject]  [Approve]          │
   └──────────────────────────────┘

4. Click "Approve"
5. App shows:
   ┌──────────────────────────────┐
   │ ✅ Donation Confirmed!       │
   │                              │
   │ Tx: ABC123...                │
   │ [View on Explorer]           │
   │                              │
   │ Pool: 75 → 100 XRP ⬆        │
   └──────────────────────────────┘

You: "Click here to verify on blockchain..."
  → Opens testnet.xrpl.org
  → Shows actual transaction!

Judge: "Real XRPL transaction!" ✅
```

```
ACT 3: BATCH ESCROW CREATION (45 seconds)
═══════════════════════════════════════════════════════════

You: "When pool hits 100 XRP, batch escrow auto-creates..."

1. Another donor donates 5 XRP → Pool: 105 XRP ✅ THRESHOLD!

2. Backend auto-triggers (show logs):
   [INFO] Pool: 105 XRP ≥ 100 threshold
   [INFO] Creating batch escrow...
   [INFO] EscrowCreate tx: BATCH_XYZ789...
   [INFO] ✅ 105 XRP locked for 12 donors!

3. All donor dashboards update:
   ┌──────────────────────────────┐
   │ 🔒 Batch Escrow Created!     │
   │                              │
   │ Your 25 XRP is now locked    │
   │ on the blockchain!           │
   │                              │
   │ Batch: batch_001             │
   │ Total: 105 XRP               │
   │ Co-donors: 11 others         │
   │                              │
   │ Proof: BATCH_XYZ789...       │
   │ [View Escrow on Explorer]    │
   └──────────────────────────────┘

4. Click [View Escrow]
   → Opens testnet.xrpl.org/tx/BATCH_XYZ789...
   → Shows EscrowCreate transaction
   → Amount: 105 XRP
   → Destination: Reserve account

You: "See? Locked on-chain. I can't touch it anymore!"

Judge: "Transparent and trustless!" ✅
```

```
ACT 4: EMERGENCY ALLOCATION (60 seconds)
═══════════════════════════════════════════════════════════

You: "Now admin triggers emergency..."

1. Switch to admin panel
2. Fill form:
   Type: Earthquake
   Location: Nepal
   Severity: 8/10

3. System calculates:
   Hospital-A: 198 XRP
   Shelter-B: 149 XRP
   NGO-C: 173 XRP

4. Click "Allocate Funds"

5. Backend executes:
   [INFO] Creating Disaster-003 account
   [INFO] ✅ rDisaster003...ABC created
   [INFO] Funding: 520 XRP → Disaster-003
   [INFO] Creating org escrows...
   [INFO] ✅ Hospital-A: 198 XRP locked
   [INFO] ✅ Shelter-B: 149 XRP locked
   [INFO] ✅ NGO-C: 173 XRP locked

6. Mosaic updates with 3 tiles (pending)
```

```
ACT 5: ESCROW RELEASE (60 seconds)
═══════════════════════════════════════════════════════════

You: "After validation period, funds auto-release..."

1. Wait 5 minutes (or use pre-seeded demo)

2. Scheduler detects:
   [INFO] ⏰ Hospital-A escrow ready
   [INFO] Executing EscrowFinish...
   [INFO] Tx: FINISH_ABC123...
   [INFO] ✅ Hospital-A received 198 XRP!

3. Hospital dashboard updates:
   ┌──────────────────────────────┐
   │ 💰 Funds Received!           │
   │                              │
   │ Amount: 198 XRP              │
   │ Emergency: Earthquake-Nepal  │
   │                              │
   │ Escrow Created: ESCROW_ABC..│
   │ Escrow Finished: FINISH_DEF.│
   │                              │
   │ Balance: 10 → 208 XRP ⬆     │
   │ [Verify on Explorer]         │
   └──────────────────────────────┘

4. Click [Verify]
   → Opens testnet.xrpl.org/accounts/rHospital...XYZ
   → Shows balance: 208 XRP
   → Shows incoming tx: "EscrowFinish" +198 XRP

You: "Hospital didn't do anything - funds auto-delivered!"

Judge: "Automated and verifiable! 🏆"
```

---

## 📊 Complete Fund Flow Summary

```
DONOR → POOL → BATCH ESCROW → RESERVE → DISASTER → ORG ESCROW → ORGANIZATION

Step 1: Donor Payment
  Donor wallet (25 XRP)
      ↓ Payment tx (signed in Crossmark)
  Pool wallet (+25 XRP)

Step 2: Batch Escrow
  Pool wallet (105 XRP)
      ↓ EscrowCreate tx
  Escrow object (105 XRP locked) 🔒
      ↓ EscrowFinish tx (after 1 hour)
  Reserve wallet (+105 XRP)

Step 3: Emergency Allocation
  Reserve wallet (520 XRP)
      ↓ Payment tx
  Disaster-003 wallet (+520 XRP)

Step 4: Org Escrow
  Disaster-003 wallet (520 XRP)
      ↓ EscrowCreate tx (3 escrows)
  Hospital escrow (198 XRP locked) 🔒
  Shelter escrow (149 XRP locked) 🔒
  NGO escrow (173 XRP locked) 🔒

Step 5: Final Release
  Hospital escrow (198 XRP)
      ↓ EscrowFinish tx (after 5 min)
  Hospital wallet (+198 XRP) ✅

  Shelter escrow (149 XRP)
      ↓ EscrowFinish tx
  Shelter wallet (+149 XRP) ✅

  NGO escrow (173 XRP)
      ↓ EscrowFinish tx
  NGO wallet (+173 XRP) ✅
```

---

## 🎯 Key Takeaways

### **Wallet Choice:**
- **Crossmark** = Desktop browser extension (easier demo)
- **Xaman** = Mobile app with QR codes (production)
- Both are **non-custodial** (donor keeps private keys)

### **Escrow Mechanism:**
- **EscrowCreate** = Money leaves sender, locked on ledger, recipient can't access yet
- **Limbo state** = Visible as "Escrow object" via `account_objects` query
- **EscrowFinish** = Money delivered from escrow → recipient wallet
- **Only escrow owner** (Pool/Disaster account) can finish escrow

### **Why This Matters:**
- ✅ **Trust**: Funds locked on public blockchain
- ✅ **Validation**: Platform can review allocations before release
- ✅ **Transparency**: Every step verifiable on XRPL explorer
- ✅ **Automated**: No manual transfers needed

---

**Now you fully understand the flow! 🎉**
