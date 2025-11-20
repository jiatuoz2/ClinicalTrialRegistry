import os
import json
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

ABI = json.loads("""[...]""")

def get_contract():
    addr = Web3.to_checksum_address(CONTRACT_ADDRESS)
    return w3.eth.contract(address=addr, abi=ABI)

def get_patient_events(patient):
    contract = get_contract()
    event_filter = contract.events.DataUploaded.create_filter(
        fromBlock=0,
        argument_filters={"patient": patient}
    )
    return event_filter.get_all_entries()

def get_access_logs(patient):
    contract = get_contract()
    event_filter = contract.events.DataAccess.create_filter(
        fromBlock=0,
        argument_filters={"patient": patient}
    )
    return event_filter.get_all_entries()
