from xrpl.wallet import Wallet
import json
import requests
import time

def generate_and_fund(name: str, network: str = "devnet"):
    """Generate wallet and fund from faucet."""
    wallet = Wallet.create()

    faucet_url = {
        "devnet": "https://faucet.devnet.rippletest.net/accounts",
        "testnet": "https://faucet.altnet.rippletest.net/accounts"
    }[network]

    try:
        response = requests.post(faucet_url, json={
            "destination": wallet.address
        }, timeout=30)

        if response.status_code == 200:
            print(f"  {name}")
            print(f"   Address: {wallet.address}")
            print(f"   Seed: {wallet.seed}")
            print(f"   Funded: 1000 XRP ({network})")
            print()
        else:
            print(f"  Failed to fund {name} (status {response.status_code})")
            print(f"   Address: {wallet.address}")
            print(f"   Seed: {wallet.seed}")
            print()
    except Exception as e:
        print(f"  Error funding {name}: {e}")
        print(f"   Address: {wallet.address}")
        print(f"   Seed: {wallet.seed}")
        print()

    return {
        "name": name,
        "address": wallet.address,
        "seed": wallet.seed
    }

if __name__ == "__main__":
    print("Generating XRPL Accounts for Devnet...\n")

    accounts = []

    accounts.append(generate_and_fund("Pool Wallet"))
    time.sleep(1)
    accounts.append(generate_and_fund("Reserve Wallet"))
    time.sleep(1)
    accounts.append(generate_and_fund("Hospital-A"))
    time.sleep(1)
    accounts.append(generate_and_fund("Shelter-B"))
    time.sleep(1)
    accounts.append(generate_and_fund("NGO-C"))

    with open('.secrets/xrpl_accounts.json', 'w') as f:
        json.dump(accounts, f, indent=2)

    print("\nAll accounts generated and saved to .secrets/xrpl_accounts.json")
    print("NEVER commit this file to git!")
