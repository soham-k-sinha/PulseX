---
name: final-xrpl-integration
overview: Final XRPL implementation plan for the emergency donation pool with Payments and Escrow on testnet, using HTTP public API methods.
todos:
  - id: xrpl-accounts-setup
    content: Create and fund XRPL testnet accounts for pool, donor, and organizations; store secrets in env vars.
    status: pending
  - id: xrpl-http-client
    content: Implement a small XRPL HTTP client module for calling submit, account_info, account_objects, tx, fee, and server_info.
    status: pending
    dependencies:
      - xrpl-accounts-setup
  - id: donation-flow-payments
    content: Implement backend endpoint to perform Payment transactions from donor account to pool account using submit, and verify with tx and account_info.
    status: pending
    dependencies:
      - xrpl-http-client
  - id: allocation-and-escrowcreate
    content: Implement snapshot logic (available pool = balance - locked escrows), rule-based allocation, and EscrowCreate transactions per org from pool account.
    status: pending
    dependencies:
      - xrpl-http-client
  - id: escrowfinish-cancel
    content: Implement EscrowFinish and optional EscrowCancel flows, including listing active Escrows via account_objects and updating UI after finish/cancel.
    status: pending
    dependencies:
      - allocation-and-escrowcreate
  - id: xrpl-dashboard-ui
    content: Build frontend views that surface live balances, active escrows, and transaction proofs using backend wrappers around account_info, account_objects, and tx.
    status: pending
    dependencies:
      - donation-flow-payments
      - allocation-and-escrowcreate
      - escrowfinish-cancel
---

# Final XRPL Integration Plan – Emergency Pool + Escrows

## 1. High-Level Story (for judges)

We build a **fully on-chain emergency funding rail** on the XRPL testnet:

- Donors send funds (via our app) into a **shared Emergency Pool account** using real XRPL **Payment** transactions.
- When an emergency is declared, a **rule-based allocation engine** splits the **current available pool** among vetted organizations.
- For each organization, the pool locks funds using XRPL **Escrow** objects (`EscrowCreate`), which are **visible on-chain**.
- Later, escrows are either **finished** (`EscrowFinish` → funds released to org) or **canceled** (`EscrowCancel` → funds returned to pool), demonstrating time/condition-based payouts.
- All balances and transactions are read from the XRPL using the public HTTP JSON-RPC API methods documented at [`xrpl.org/docs/references/http-websocket-apis/public-api-methods`](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods).

This clearly showcases XRPL core features: fast low-fee Payments, Escrow, live ledger queries, and transparent auditability.

## 2. Account Model (Testnet)

All accounts are testnet XRPL accounts:

- **Emergency Pool account**
- Address: `POOL_ADDRESS` (env var)
- Secret: `POOL_SECRET` (server-only)
- Role: Holds all donated funds, and is the `Account` (owner) for all Escrows.
- **Donor funding account** (for demo donors)
- Address: `DONOR_ADDRESS`
- Secret: `DONOR_SECRET`
- Role: Source of Payment transactions that simulate donors contributing XRP into the Emergency Pool.
- **Organization accounts** (one per NGO/hospital/shelter)
- Addresses: `ORG1_ADDRESS`, `ORG2_ADDRESS`, ...
- Secrets: `ORG1_SECRET`, ... (kept server-only, but logically these belong to orgs).
- Role: `Destination` for Escrows and ultimate recipients when Escrows are finished.

## 3. XRPL Node & HTTP API Usage

We connect to a public **XRPL testnet** `rippled` server using HTTP JSON-RPC.From the **Public API Methods** page [`xrpl.org/docs/references/http-websocket-apis/public-api-methods`](https://xrpl.org/docs/references/http-websocket-apis/public-api-methods), we use:

- **Transaction Methods**
- `submit` – broadcast signed transactions (Payments, EscrowCreate, EscrowFinish, EscrowCancel).
- `tx` – fetch transaction details by hash (for proof in UI).
- **Account Methods**
- `account_info` – read current account balances and metadata (Pool + orgs).
- `account_objects` – list ledger entries owned by an account (used to list active `Escrow` objects for the Pool).
- **Server Info Methods** (optional but strong demo)
- `fee` – fetch recommended fees to show low-cost nature and set `Fee` fields.
- `server_info` – show network/node status in a small dashboard widget.

## 4. Core On-Chain Flows

### 4.1 Donations: Donor → Emergency Pool (Payment)

**Goal:** When a user clicks "Donate", we execute a real XRPL Payment from `DONOR_ADDRESS` to `POOL_ADDRESS`.

1. **Backend receives** `POST /xrpl/donate` with `{ amount_xrp, donor_name? }`.
2. Backend converts `amount_xrp` to **drops**.
3. Backend (optionally) calls `fee` to set the `Fee` field and show the cost in UI.
4. Backend constructs a `Payment` transaction object:

- `TransactionType`: `"Payment"`
- `Account`: `DONOR_ADDRESS`
- `Destination`: `POOL_ADDRESS`
- `Amount`: drops as string
- Plus sequence, fee, etc.

5. Backend **signs locally** using `DONOR_SECRET`.
6. Backend calls **`submit`** with the signed transaction blob.
7. Backend stores the returned `tx_hash` in its own DB (for the mosaic / history view).
8. Backend calls **`tx`** (optional) to confirm validation and metadata.
9. Frontend updates:

- Shows "Donation successful" with `tx_hash` + "View on explorer" link.
- Calls `GET /xrpl/status` (which uses `account_info` on the Pool) to refresh **live pool balance**.

Result: The Emergency Pool account's on-chain balance increases; this is directly visible via `account_info`.

### 4.2 Snapshot & Allocation: Emergency Trigger

**Goal:** On admin trigger, compute how much of the current **available pool** to lock for each org.

1. Admin submits `POST /xrpl/allocate` with `{ disaster_type, location }`.
2. Backend calls `account_info` for `POOL_ADDRESS` to get `Balance` (total on-chain balance).
3. Backend calls `account_objects` for `POOL_ADDRESS` (filter Escrows) to compute:

- `locked_total` = sum of all active `Escrow.Amount` values.
- `available = Balance - locked_total`.

4. The **rule-based engine** takes `available`, org metadata, and disaster info and outputs **allocation fractions**; backend converts them to concrete amounts in drops that sum to `available` (or a chosen fraction of `available`).
5. Backend now has: `[{ org_address, amount_drops }, ...]` for this **allocation round**.

At this stage, nothing has changed on-chain yet; we only did ledger reads and local calculations.

### 4.3 Locking Funds: Pool → Orgs via EscrowCreate

**Goal:** Lock the allocated amounts into real XRPL Escrows, one per org.For each allocation `{ org_address, amount_drops }`:

1. Backend constructs an **EscrowCreate** transaction:

- `TransactionType`: `"EscrowCreate"`
- `Account`: `POOL_ADDRESS` (escrow owner and source of funds)
- `Destination`: `org_address`
- `Amount`: `amount_drops` (as string)
- `FinishAfter`: a time (Ripple Epoch seconds) slightly in the future for demo (e.g., +5–10 minutes)
- Optional `CancelAfter`: later than `FinishAfter` to illustrate refund capability.

2. Backend signs this transaction locally using `POOL_SECRET`.
3. Backend calls **`submit`** for the signed EscrowCreate.
4. Backend stores `tx_hash` plus the associated `org` and `amount` in its DB.
5. Later, backend (or frontend-triggered backend call) uses **`account_objects`** on `POOL_ADDRESS` to list all `Escrow` entries and confirm they exist with correct `Amount` and `Destination`.

Result: The Emergency Pool has **on-chain Escrow entries** that represent "locked" commitments to each organization.

### 4.4 Releasing or Canceling Escrows: EscrowFinish / EscrowCancel

**Goal:** Show how funds are finally released to orgs or returned to the pool.

- **Release path (EscrowFinish):**

1. Once `FinishAfter` time has passed, admin clicks "Release" for an escrow in the UI.
2. Backend constructs an **EscrowFinish** transaction identifying that specific escrow (using its `Account` + `Sequence` or escrow ID).
3. Backend signs with `POOL_SECRET` and calls `submit`.
4. XRPL moves `Amount` from **Pool** to **Org** and deletes the `Escrow` ledger entry.
5. Backend/Frontend:

    - Calls `tx` for the EscrowFinish hash to show success.
    - Calls `account_info` for `POOL_ADDRESS` and the org's address to show updated balances.
    - Calls `account_objects` for `POOL_ADDRESS` to confirm the escrow entry is now gone.
- **Cancel path (EscrowCancel, optional demo):**
- Similar, but using **EscrowCancel** transaction before or after `CancelAfter` (depending on rules), sending funds back to the Pool instead of the org.

Result: Funds are **provably transferred on-chain** from the Emergency Pool to an org (or refunded), and the lifecycle of the Escrow ledger entry matches the XRPL docs.

## 5. Read-Side: Data for UI & Mosaic

The UI uses backend endpoints that wrap XRPL reads:

- `GET /xrpl/status`
- Backend calls:
    - `server_info` → node status, ledger index, etc.
    - `fee` → current fee range.
    - `account_info` for `POOL_ADDRESS` → pool balance.
- Returns combined payload for a "Network & Pool" widget.
- `GET /xrpl/orgs`
- Backend knows static org metadata and optionally reads:
    - `account_info` per org address → current on-chain balance.
- Returns list of orgs with `on_chain_received` and any off-chain stats.
- `GET /xrpl/escrows`
- Backend calls `account_objects` for `POOL_ADDRESS` and filters `LedgerEntryType: "Escrow"`.
- Returns simplified list: `{ destination, amount_xrp, finish_after, cancel_after, index }[]`.
- `GET /xrpl/transactions`
- Backend looks up stored hashes for recent donations and escrow operations.
- Optionally calls `tx` per hash to embed XRPL metadata into the response.
- UI uses this for a timeline or mosaic of on-chain actions.

## 6. What Judges See (Checklist)

During the demo, you explicitly show:

- **Real XRPL Payments** via `submit` (donations Donor → Pool) and changing balances with `account_info`.
- **Real XRPL Escrows** using `EscrowCreate` (Pool → Orgs), visible in `account_objects` as proper `Escrow` ledger entries like in the docs the judges know.
- **Real Escrow lifecycle** via `EscrowFinish` / `EscrowCancel`, and their effects on balances and ledger entries.
- **Live ledger queries** using `account_info`, `account_objects`, and `tx` to populate the dashboard and prove every action is on XRPL.