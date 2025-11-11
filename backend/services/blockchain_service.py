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


def create_and_commit_batch(eligible_applicants: list, wilaya_code: int, metadata: bytes) -> str:
    """
    Takes a list of eligible applicants, builds a Merkle tree, and commits the
    root to the blockchain.

    Args:
        eligible_applicants: A list of applicant objects from the database.
        wilaya_code: The wilaya code for this batch.
        metadata: The metadata for this batch.

    Returns:
        The transaction hash of the on-chain commitment as a hex string.
    """
    if not eligible_applicants:
        raise ValueError("Cannot create a batch with no applicants.")

    print(f"Starting batch creation for {len(eligible_applicants)} applicants...")

    # 1. Prepare leaves from applicant data
    leaves = []
    for app in eligible_applicants:
        # Convert DB datetime to Unix timestamp
        timestamp = int(app.created_at.timestamp())
        
        leaf = create_applicant_leaf(
            app.applicant_hash,
            app.file_hash,
            timestamp,
            app.wilaya_code
        )
        leaves.append(leaf)

    # 2. Build the Merkle Tree
    tree = MerkleTree(leaves)
    merkle_root = tree.get_root()
    batch_size = len(leaves)

    print(f"  - Calculated Merkle Root: {merkle_root.hex()}")

    # 3. Build and send the transaction
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

