"""Seed demo data for the Emergency Impact Platform."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import SessionLocal, Base, engine
from app.models.organization import Organization


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if db.query(Organization).count() > 0:
            print("Organizations already seeded")
            for org in db.query(Organization).all():
                print(f"  - {org.name} ({org.cause_type}) - {org.wallet_address}")
            return

        import json
        accounts_path = os.path.join(os.path.dirname(__file__), '..', '.secrets', 'xrpl_accounts.json')
        with open(accounts_path) as f:
            accounts = json.load(f)

        account_map = {a["name"]: a["address"] for a in accounts}

        orgs = [
            Organization(name="Hospital-A", cause_type="health", wallet_address=account_map["Hospital-A"], need_score=8),
            Organization(name="Shelter-B", cause_type="shelter", wallet_address=account_map["Shelter-B"], need_score=6),
            Organization(name="NGO-C", cause_type="food", wallet_address=account_map["NGO-C"], need_score=7),
        ]

        for org in orgs:
            db.add(org)
        db.commit()

        print("Seeded 3 organizations:")
        for org in orgs:
            print(f"  - {org.name} ({org.cause_type}, need_score={org.need_score}) -> {org.wallet_address}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("\nDone! Start the platform with:")
    print("  Terminal 1: cd backend && source ../venv/bin/activate && uvicorn app.main:app --reload")
    print("  Terminal 2: cd frontend && npm run dev")
