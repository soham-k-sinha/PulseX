import logging
from xrpl.asyncio.clients import AsyncWebsocketClient
from xrpl.asyncio.transaction import submit_and_wait
from xrpl.asyncio.account import get_balance
from xrpl.asyncio.ledger import get_fee
from xrpl.models.requests import AccountInfo, AccountObjects, Tx, ServerInfo, SubmitOnly
from xrpl.models.transactions import Payment, EscrowCreate, EscrowFinish
from xrpl.wallet import Wallet
from xrpl.utils import xrp_to_drops
from app.config import settings

logger = logging.getLogger(__name__)


class XRPLClient:
    def __init__(self):
        self.url = settings.XRPL_NODE_URL
        self.pool_wallet = Wallet.from_seed(settings.POOL_WALLET_SECRET)
        self.reserve_wallet = Wallet.from_seed(settings.RESERVE_WALLET_SECRET)

    async def get_client(self) -> AsyncWebsocketClient:
        client = AsyncWebsocketClient(self.url)
        return client

    async def get_account_info(self, address: str) -> dict:
        async with AsyncWebsocketClient(self.url) as client:
            response = await client.request(AccountInfo(account=address, ledger_index="validated"))
            if response.is_successful():
                return response.result
            raise Exception(f"Failed to get account info: {response.result}")

    async def get_account_balance(self, address: str) -> int:
        async with AsyncWebsocketClient(self.url) as client:
            balance = await get_balance(address, client)
            return int(xrp_to_drops(balance))

    async def get_account_escrows(self, address: str) -> list:
        async with AsyncWebsocketClient(self.url) as client:
            response = await client.request(
                AccountObjects(account=address, type="escrow", ledger_index="validated")
            )
            if response.is_successful():
                return response.result.get("account_objects", [])
            return []

    async def get_tx(self, tx_hash: str) -> dict:
        async with AsyncWebsocketClient(self.url) as client:
            response = await client.request(Tx(transaction=tx_hash))
            if response.is_successful():
                return response.result
            raise Exception(f"Failed to get tx: {response.result}")

    async def get_recommended_fee(self) -> str:
        async with AsyncWebsocketClient(self.url) as client:
            fee = await get_fee(client)
            return str(fee)

    async def get_server_info(self) -> dict:
        async with AsyncWebsocketClient(self.url) as client:
            response = await client.request(ServerInfo())
            if response.is_successful():
                return response.result
            raise Exception(f"Failed to get server info: {response.result}")

    async def submit_payment(self, wallet: Wallet, destination: str, amount_drops: int, memos: list = None) -> dict:
        async with AsyncWebsocketClient(self.url) as client:
            tx = Payment(
                account=wallet.address,
                destination=destination,
                amount=str(amount_drops),
            )
            if memos:
                tx = Payment(
                    account=wallet.address,
                    destination=destination,
                    amount=str(amount_drops),
                    memos=memos,
                )
            response = await submit_and_wait(tx, client, wallet)
            return response.result

    async def create_escrow(self, wallet: Wallet, destination: str, amount_drops: int,
                            finish_after: int, cancel_after: int = None, memos: list = None) -> dict:
        async with AsyncWebsocketClient(self.url) as client:
            kwargs = {
                "account": wallet.address,
                "destination": destination,
                "amount": str(amount_drops),
                "finish_after": finish_after,
            }
            if cancel_after:
                kwargs["cancel_after"] = cancel_after
            if memos:
                kwargs["memos"] = memos
            tx = EscrowCreate(**kwargs)
            response = await submit_and_wait(tx, client, wallet)
            return response.result

    async def finish_escrow(self, wallet: Wallet, owner: str, offer_sequence: int) -> dict:
        async with AsyncWebsocketClient(self.url) as client:
            tx = EscrowFinish(
                account=wallet.address,
                owner=owner,
                offer_sequence=offer_sequence,
            )
            response = await submit_and_wait(tx, client, wallet)
            return response.result

    async def submit_signed_tx(self, tx_blob: str) -> dict:
        async with AsyncWebsocketClient(self.url) as client:
            response = await client.request(SubmitOnly(tx_blob=tx_blob))
            if response.is_successful():
                result = response.result
                engine_result = result.get("engine_result", "")
                if engine_result != "tesSUCCESS":
                    raise Exception(f"Transaction failed: {engine_result} - {result.get('engine_result_message', '')}")
                return result
            raise Exception(f"Submit failed: {response.result}")

    async def fund_account(self, address: str) -> bool:
        """Fund an account on devnet via faucet."""
        import httpx
        try:
            async with httpx.AsyncClient() as http:
                resp = await http.post(
                    "https://faucet.devnet.rippletest.net/accounts",
                    json={"destination": address},
                    timeout=30,
                )
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Faucet funding failed: {e}")
            return False


xrpl_client = XRPLClient()
