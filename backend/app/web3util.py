import os
import json
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://127.0.0.1:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

ABI = json.loads("""[
  {"inputs":[{"internalType":"address","name":"_hospital","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ConsentGranted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ConsentRevoked","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":false,"internalType":"bytes32","name":"dataHash","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"DataUploaded","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":true,"internalType":"address","name":"accessor","type":"address"},{"indexed":false,"internalType":"string","name":"purpose","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"DataAccess","type":"event"},
  {"inputs":[],"name":"grantConsent","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"revokeConsent","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"dataHash","type":"bytes32"}],"name":"uploadData","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"patient","type":"address"},{"internalType":"string","name":"purpose","type":"string"}],"name":"viewData","outputs":[],"stateMutability":"nonpayable","type":"function"}
]""")

def get_contract():
    addr = Web3.to_checksum_address(CONTRACT_ADDRESS)
    return w3.eth.contract(address=addr, abi=ABI)

class Roles:
    patient = "patient"
    hospital = "hospital"

def _sender_for_role(role: str):
    if role == Roles.patient:
        private_key = os.getenv("PATIENT_PRIVATE_KEY")
    elif role == Roles.hospital:
        private_key = os.getenv("HOSPITAL_PRIVATE_KEY")
    else:
        raise ValueError(f"Unknown role: {role}")
    if not private_key:
        raise ValueError(f"Private key for {role} not set in .env")
    account = Account.from_key(private_key)
    return account

def send_tx_via_role(role: str, fn_name: str, args: list) -> str:
    contract = get_contract()
    account = _sender_for_role(role)
    fn = getattr(contract.functions, fn_name)
    transaction = fn(*args).build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "gas": 500000,
        "gasPrice": w3.eth.gas_price
    })
    signed_tx = account.sign_transaction(transaction)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    return tx_hash.hex()

def compute_hash(text: str):
    return Web3.keccak(text=text)
