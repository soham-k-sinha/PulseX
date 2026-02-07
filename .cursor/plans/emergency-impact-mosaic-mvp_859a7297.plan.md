---
name: emergency-impact-mosaic-mvp
overview: Super-simplified 24-hour hackathon plan for an XRPL-powered emergency donation escrow with AI-inspired allocation and mosaic visualization.
todos:
  - id: setup-backend
    content: Set up a minimal Flask or FastAPI backend with in-memory data structures and endpoints for orgs and global state.
    status: pending
  - id: frontend-basic-ui
    content: Create a simple single-page web UI with donor, admin, and mosaic sections wired to backend GET endpoints.
    status: pending
    dependencies:
      - setup-backend
  - id: donation-flow
    content: Implement POST /donate on the backend and wire the donor form to create donations and update escrow.
    status: pending
    dependencies:
      - setup-backend
      - frontend-basic-ui
  - id: allocation-logic
    content: Implement POST /trigger_emergency with need-score-based allocation logic and distribution records.
    status: pending
    dependencies:
      - setup-backend
  - id: mosaic-visual
    content: Render a mosaic grid on the frontend from distribution data with color-coded tiles and basic stats.
    status: pending
    dependencies:
      - frontend-basic-ui
      - allocation-logic
  - id: demo-polish
    content: Seed demo data, add explanatory copy, and script the demo flow end-to-end.
    status: pending
    dependencies:
      - donation-flow
      - allocation-logic
      - mosaic-visual
---

# Emergency Impact Mosaic – 24h Hackathon Plan

## Goal

Build a very simple web demo where donors "donate" into a shared XRPL-backed escrow pool, and when an emergency is triggered, a basic AI-style rule engine allocates funds to registered organizations and visualizes the impact as a mosaic.Keep everything happy-path only, with minimal auth and infrastructure so you can finish in 24 hours.

## Scope for MVP (What You Actually Ship)

- **Roles (no real auth)**: Simple role toggle in the UI: `Donor view`, `Org view`, `Admin view` (no passwords, just switches).
- **Organizations**: Hard-code 3–5 example orgs (e.g., hospital, NGO, shelter) with:
- Name, location, cause type (health, shelter, food), XRPL wallet ID (fake/testnet), need score (1–5).
- **Donations → Escrow**:
- Donor chooses an amount + selects a cause category (or just donates to "global emergency fund").
- Backend records donation and adds it to an in-memory `escrow_total`.
- Optional: One XRPL testnet call per donation from a single pre-funded hackathon wallet to a dedicated escrow wallet (or stub this call and just log what would be sent).
- **Emergency Trigger + Allocation**:
- On `Admin view`, a big "Trigger Emergency" button.
- When clicked, backend:
    - Reads `escrow_total`.
    - Allocates funds to each org using a simple rule-based "AI":
    - Example: `allocation = escrow_total * (org_need_score / sum_of_need_scores)`.
    - Creates a distribution record per org and resets `escrow_total` to 0.
    - Optional: Simulate XRPL payouts from escrow wallet to each org’s XRPL address.
- **Mosaic Visualization**:
- Frontend shows a grid of colored tiles where each tile = one distribution to an org.
- Tile color based on cause type (e.g., green=environment, red=health, blue=shelter).
- Hover/click shows amount, org name, and a fake XRPL tx ID.
- **Basic Stats & Demo Copy**:
- Total donated, total allocated, number of emergencies handled.
- Short textual explainer on the page about XRPL, escrow, and AI-based allocation.

## High-Level Architecture

```mermaid
flowchart TD
  userDonor[Donor_UI] --> frontend[Web_App]
  userAdmin[Admin_UI] --> frontend

  frontend --> backend[Backend_API]

  backend --> dataStore[InMemory_or_SQLite]
  backend --> xrpl[XRP_Ledger_(testnet_or_stub)]

  backend --> mosaicData[Mosaic_Data]
  mosaicData --> frontend
```



- **Frontend**: Single-page web app (React with Vite or even plain HTML + minimal JS) served by the backend.
- **Backend**: Lightweight REST API (Flask/FastAPI in Python, since you already have Python in this repo).
- **Storage**: In-memory Python dicts or a tiny SQLite DB for orgs, donations, and distributions.
- **XRPL**: Use XRPL testnet + Python xrpl SDK if comfortable. If not, simulate calls and clearly show where XRPL would be used.

## Data Model (Minimal)

- **Organization**:
- `id`, `name`, `cause_type`, `need_score`, `wallet_address`.
- **Donation**:
- `id`, `amount`, `timestamp`, `donor_name` (optional), `tx_hash` (real or fake), `status`.
- **Escrow State**:
- `escrow_total` (single number), `donation_ids`.
- **Distribution**:
- `id`, `org_id`, `amount`, `timestamp`, `emergency_label`, `tx_hash` (real or fake).

## Implementation Steps (Ordered for 24 Hours)

### 1) Backend Skeleton & Data (2–3 hours)

- **Set up backend** using Flask or FastAPI in a single file (e.g., `app.py`).
- **Hard-code organizations** in memory (a Python list/dict of orgs with need scores and wallet IDs).
- **Implement basic endpoints** (JSON only):
- `GET /orgs` – list organizations.
- `GET /state` – total escrow, total donated, distributions.

### 2) Simple Frontend UI (3–4 hours)

- **Build one HTML page** (or small React app) with 3 main sections:
- `Donor view`: list orgs, show current escrow total, simple donation form (amount input + submit button).
- `Admin view`: display current escrow total and a big `Trigger Emergency` button.
- `Mosaic view`: grid showing distributions as tiles.
- **Wire up fetch calls** to `GET /orgs` and `GET /state` to render data.
- Use super simple styling (Tailwind or basic CSS) – prioritize clarity over beauty.

### 3) Donation Flow & Escrow (3–4 hours)

- **Backend**:
- `POST /donate` – body: `{ amount, donor_name }`.
- Update `escrow_total` and append a `Donation` record.
- If XRPL is in scope: call a helper `send_to_escrow(amount)` that either:
    - Performs a real XRPL testnet transaction, or
    - Logs a fake tx hash for demo.
- **Frontend**:
- Hook the donor form to `POST /donate`.
- On success, refresh escrow and org list.

### 4) Emergency Trigger & Allocation Logic (3–4 hours)

- **Backend**:
- Implement `POST /trigger_emergency`.
- Inside, compute allocations:
    - `total_needs = sum(need_score for each org)`.
    - For each org: `allocated = round(escrow_total * (need_score / total_needs), 2)`.
- Create `Distribution` records for each org, persist them in memory (or SQLite).
- Reset `escrow_total` to 0.
- Optional: XRPL payouts stub/real call for each org.
- **Frontend**:
- In `Admin view`, link button to `POST /trigger_emergency`, then refresh state and mosaic.

### 5) Mosaic Visualization (2–3 hours)

- **Frontend**:
- Fetch distributions from `GET /state`.
- Render a simple CSS grid where each tile represents one distribution.
- Color code by `cause_type`; display `org name` and `amount` on hover.
- Optionally, show a small legend explaining tile colors.

### 6) Polish, Copy, and Demo Script (2–3 hours)

- **Seed data**: Pre-create a few donations so mosaic isn’t empty at start.
- **Add explanatory text**:
- One paragraph explaining: XRPL escrow, AI-style allocation, emergency trigger.
- Another explaining how this scales to real NGOs and bank accounts.
- **Prepare demo flow**:
- Step 1: Show donor view and make a couple of donations.