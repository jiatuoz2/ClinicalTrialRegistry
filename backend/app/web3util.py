import os 
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Load ABI
with open("contract_abi.json", "r") as f:
    ABI = json.load(f)

def get_contract():
    addr = Web3.to_checksum_address(CONTRACT_ADDRESS)
    return w3.eth.contract(address=addr, abi=ABI)

# ============================================================
# EVENT HELPERS
# ============================================================

def get_data_uploaded(patient: str, from_block=0):
    contract = get_contract()
    patient = Web3.to_checksum_address(patient)

    event_filter = contract.events.DataUploaded.create_filter(
        fromBlock=from_block,
        toBlock=w3.eth.block_number,
        argument_filters={"patient": patient}
    )
    return event_filter.get_all_entries()


def get_data_access(patient: str, from_block=0):
    contract = get_contract()
    patient = Web3.to_checksum_address(patient)

    event_filter = contract.events.DataAccess.create_filter(
        fromBlock=from_block,
        toBlock=w3.eth.block_number,
        argument_filters={"patient": patient}
    )
    return event_filter.get_all_entries()


def get_consent_granted(patient: str, from_block=0):
    contract = get_contract()
    patient = Web3.to_checksum_address(patient)

    event_filter = contract.events.ConsentGranted.create_filter(
        fromBlock=from_block,
        toBlock=w3.eth.block_number,
        argument_filters={"patient": patient}
    )
    return event_filter.get_all_entries()


def get_consent_revoked(patient: str, from_block=0):
    contract = get_contract()
    patient = Web3.to_checksum_address(patient)

    event_filter = contract.events.ConsentRevoked.create_filter(
        fromBlock=from_block,
        toBlock=w3.eth.block_number,
        argument_filters={"patient": patient}
    )
    return event_filter.get_all_entries()
