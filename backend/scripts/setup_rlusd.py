"""
One-time setup script for RLUSD on XRPL Devnet.

Creates an RLUSD issuer wallet, sets DefaultRipple, creates trustlines
from all platform wallets, and mints initial RLUSD to the pool wallet.

Usage:
    cd backend && python -m scripts.setup_rlusd
"""

import asyncio
import json
import os
import sys

from xrpl.asyncio.clients import AsyncWebsocketClient
from xrpl.asyncio.transaction import submit_and_wait
from xrpl.models.requests import AccountInfo
from xrpl.models.transactions import AccountSet, TrustSet, Payment
from xrpl.models.transactions.account_set import AccountSetAsfFlag
from xrpl.models.amounts import IssuedCurrencyAmount
from xrpl.wallet import Wallet

# Add parent to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEVNET_URL = "wss://s.devnet.rippletest.net:51233"
FAUCET_URL = "https://faucet.devnet.rippletest.net/accounts"
RLUSD_CURRENCY_HEX = "524C555344000000000000000000000000000000"
SECRETS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".secrets")

# Account flags for DefaultRipple
ASF_DEFAULT_RIPPLE = 8


async def fund_account(address: str):
    import httpx
    async with httpx.AsyncClient() as http:
        resp = await http.post(FAUCET_URL, json={"destination": address}, timeout=30)
        if resp.status_code != 200:
            raise Exception(f"Faucet failed for {address}: {resp.text}")
        print(f"  Funded {address} via faucet")


async def main():
    # Load existing accounts
    accounts_path = os.path.join(SECRETS_PATH, "xrpl_accounts.json")
    with open(accounts_path) as f:
        accounts = json.load(f)

    account_map = {a["name"]: a for a in accounts}
    pool = account_map["Pool Wallet"]
    reserve = account_map["Reserve Wallet"]
    orgs = [account_map[name] for name in ["Hospital-A", "Shelter-B", "NGO-C"]]

    # 1. Create RLUSD issuer wallet
    print("\n=== Step 1: Create RLUSD Issuer Wallet ===")
    issuer_wallet = Wallet.create()
    print(f"  Address: {issuer_wallet.address}")
    print(f"  Secret:  {issuer_wallet.seed}")

    # Fund issuer via faucet
    await fund_account(issuer_wallet.address)
    # Wait for ledger to close
    await asyncio.sleep(3)

    async with AsyncWebsocketClient(DEVNET_URL) as client:
        # 2. Set DefaultRipple + AllowTrustLineLocking flags on issuer
        print("\n=== Step 2: Set DefaultRipple on Issuer ===")
        tx = AccountSet(
            account=issuer_wallet.address,
            set_flag=ASF_DEFAULT_RIPPLE,
        )
        result = await submit_and_wait(tx, client, issuer_wallet)
        print(f"  DefaultRipple set: {result.result.get('hash', 'OK')}")

        print("\n=== Step 2b: Set AllowTrustLineLocking on Issuer (for TokenEscrow) ===")
        tx = AccountSet(
            account=issuer_wallet.address,
            set_flag=AccountSetAsfFlag.ASF_ALLOW_TRUSTLINE_LOCKING,
        )
        result = await submit_and_wait(tx, client, issuer_wallet)
        print(f"  AllowTrustLineLocking set: {result.result.get('hash', 'OK')}")

        # 3. Create TrustLines from all platform wallets to issuer
        print("\n=== Step 3: Create TrustLines ===")
        all_wallets = [
            ("Pool", Wallet.from_seed(pool["seed"])),
            ("Reserve", Wallet.from_seed(reserve["seed"])),
        ] + [(org["name"], Wallet.from_seed(org["seed"])) for org in orgs]

        for name, wallet in all_wallets:
            tx = TrustSet(
                account=wallet.address,
                limit_amount=IssuedCurrencyAmount(
                    currency=RLUSD_CURRENCY_HEX,
                    issuer=issuer_wallet.address,
                    value="1000000",
                ),
            )
            result = await submit_and_wait(tx, client, wallet)
            print(f"  TrustLine set for {name}: {result.result.get('hash', 'OK')}")

        # 4. Mint initial RLUSD to pool wallet
        print("\n=== Step 4: Mint 10,000 RLUSD to Pool ===")
        tx = Payment(
            account=issuer_wallet.address,
            destination=pool["address"],
            amount=IssuedCurrencyAmount(
                currency=RLUSD_CURRENCY_HEX,
                issuer=issuer_wallet.address,
                value="10000",
            ),
        )
        result = await submit_and_wait(tx, client, issuer_wallet)
        print(f"  Minted 10,000 RLUSD to Pool: {result.result.get('hash', 'OK')}")

    # 5. Save issuer credentials
    print("\n=== Step 5: Save Credentials ===")
    issuer_data = {
        "address": issuer_wallet.address,
        "seed": issuer_wallet.seed,
        "currency_hex": RLUSD_CURRENCY_HEX,
    }
    issuer_path = os.path.join(SECRETS_PATH, "rlusd_issuer.json")
    with open(issuer_path, "w") as f:
        json.dump(issuer_data, f, indent=2)
    print(f"  Saved to {issuer_path}")

    # 6. Print env vars
    print("\n=== Add these to backend/.env ===")
    print(f"RLUSD_ISSUER_ADDRESS={issuer_wallet.address}")
    print(f"RLUSD_ISSUER_SECRET={issuer_wallet.seed}")
    print(f"RLUSD_CURRENCY_HEX={RLUSD_CURRENCY_HEX}")

    print("\n=== Setup Complete! ===")


if __name__ == "__main__":
    asyncio.run(main())
