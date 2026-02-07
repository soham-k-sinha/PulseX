import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.models import *  # noqa: F401,F403 - import all models to register them
from app.routers import (
    donations_router,
    batches_router,
    emergencies_router,
    organizations_router,
    xrpl_router,
    rlusd_router,
)
from app.routers.donation_tracking import router as tracking_router
from app.services.batch_manager import batch_manager
from app.services.escrow_scheduler import escrow_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# WebSocket connections
ws_connections: Set[WebSocket] = set()


async def broadcast(event: dict):
    dead = set()
    for ws in ws_connections:
        try:
            await ws.send_json(event)
        except Exception:
            dead.add(ws)
    ws_connections.difference_update(dead)


def seed_organizations():
    """Seed default organizations if they don't exist."""
    import json as _json
    from app.database import SessionLocal
    from app.models.organization import Organization

    db = SessionLocal()
    try:
        if db.query(Organization).count() > 0:
            return

        accounts_path = ".secrets/xrpl_accounts.json"
        try:
            import os
            root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            full_path = os.path.join(root, accounts_path)
            with open(full_path) as f:
                accounts = _json.load(f)
        except FileNotFoundError:
            full_path = os.path.join(os.getcwd(), "..", accounts_path)
            with open(full_path) as f:
                accounts = _json.load(f)

        org_definitions = [
            {"name": "Hospital-A", "cause_type": "health", "need_score": 8, "account_name": "Hospital-A"},
            {"name": "Shelter-B", "cause_type": "shelter", "need_score": 6, "account_name": "Shelter-B"},
            {"name": "NGO-C", "cause_type": "food", "need_score": 7, "account_name": "NGO-C"},
        ]

        account_map = {a["name"]: a["address"] for a in accounts}

        for org_def in org_definitions:
            address = account_map.get(org_def["account_name"])
            if not address:
                logger.warning(f"No wallet found for {org_def['account_name']}")
                continue

            org = Organization(
                name=org_def["name"],
                cause_type=org_def["cause_type"],
                wallet_address=address,
                need_score=org_def["need_score"],
            )
            db.add(org)

        db.commit()
        logger.info("Seeded 3 organizations into database")
    except Exception as e:
        logger.error(f"Failed to seed organizations: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")

    # Inline migrations
    from sqlalchemy import text
    migrations = [
        ("donations", "currency", "ALTER TABLE donations ADD COLUMN currency VARCHAR(10) DEFAULT 'XRP' NOT NULL"),
        ("disasters", "total_rlusd_allocated_drops", "ALTER TABLE disasters ADD COLUMN total_rlusd_allocated_drops BIGINT DEFAULT 0 NOT NULL"),
        ("org_escrows", "currency", "ALTER TABLE org_escrows ADD COLUMN currency VARCHAR(10) DEFAULT 'XRP' NOT NULL"),
    ]
    for table, col, sql in migrations:
        try:
            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
                logger.info(f"Added '{col}' column to {table} table")
        except Exception:
            pass  # Column already exists

    seed_organizations()

    # Start background tasks
    batch_task = asyncio.create_task(batch_manager.run())
    scheduler_task = asyncio.create_task(escrow_scheduler.run())
    logger.info("Background services started (batch manager + escrow scheduler)")

    yield

    # Shutdown
    batch_task.cancel()
    scheduler_task.cancel()
    logger.info("Background services stopped")


app = FastAPI(
    title="Emergency Impact Platform",
    description="XRPL-based emergency donation platform with batched escrows",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(donations_router)
app.include_router(tracking_router)
app.include_router(batches_router)
app.include_router(emergencies_router)
app.include_router(organizations_router)
app.include_router(xrpl_router)
app.include_router(rlusd_router)


@app.get("/")
async def root():
    return {
        "name": "Emergency Impact Platform",
        "version": "1.0.0",
        "network": settings.XRPL_NETWORK,
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    ws_connections.add(ws)
    logger.info(f"WebSocket connected ({len(ws_connections)} total)")
    try:
        while True:
            data = await ws.receive_text()
            # Echo back or handle commands
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await ws.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_connections.discard(ws)
        logger.info(f"WebSocket disconnected ({len(ws_connections)} total)")
