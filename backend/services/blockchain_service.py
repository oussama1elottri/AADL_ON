# backend/services/blockchain_service.py

import os
import json
from dotenv import load_dotenv
from web3 import Web3

# Import our Merkle Tree logic
from .merkle_service import MerkleTree, create_applicant_leaf

# --- CONFIGURATION ---
load_dotenv()
RPC_URL = os.getenv("SEPOLIA_RPC_URL")
OPERATOR_PRIVATE_KEY = os.getenv("SEPOLIA_PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
ABI_PATH = os.getenv("ABI_PATH", "out/BatchRegistry.sol/BatchRegistry.json")

# --- WEB3 SETUP ---
w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    raise ConnectionError(f"Failed to connect to RPC: {RPC_URL}")

operator_account = w3.eth.account.from_key(OPERATOR_PRIVATE_KEY)

with open(ABI_PATH, "r") as f:
    contract_abi = json.load(f)["abi"]


batch_registry_contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)


def get_current_batch_id() -> int:
    """
    Queries the smart contract to get the current batch counter.
    """
    return batch_registry_contract.functions.getCurrentBatchId().call()


def commit_batch_on_chain(merkle_root: bytes, wilaya_code: int, batch_size: int, metadata: bytes) -> str:
    """
    Takes a pre-calculated Merkle root, wilaya, batch size, and metadata, and commits it
    on-chain. Returns the transaction hash as a hex string.
    """
    print(f"Starting batch commitment on-chain for Merkle Root {merkle_root.hex()}...")

    # Build and send the transaction
    function_call = batch_registry_contract.functions.commitBatch(
        merkle_root,
        wilaya_code,
        batch_size,
        metadata
    )

    nonce = w3.eth.get_transaction_count(operator_account.address)
    tx = function_call.build_transaction({
        "from": operator_account.address,
        "nonce": nonce,
        "maxPriorityFeePerGas": w3.to_wei(2, "gwei"),
        "maxFeePerGas": w3.to_wei(60, "gwei"),
        "chainId": w3.eth.chain_id,
    })

    # Estimate gas and add a 20% buffer
    gas_estimate = w3.eth.estimate_gas(tx)
    tx['gas'] = int(gas_estimate * 1.2)
    
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=operator_account.key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

    print(f"  - Transaction sent! Hash: {tx_hash.hex()}")
    
    # Wait for the transaction to be confirmed
    w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    print(f"  - Transaction confirmed on-chain.")

    return tx_hash.hex()

