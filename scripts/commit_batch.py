# In scripts/commit_batch.py
import os
import json
from dotenv import load_dotenv
from web3 import Web3
from merkle_utils import MerkleTree, create_applicant_leaf



def get_eligible_applicants_from_db():
    print("Connecting to DB and fetching applicants...")
    applicants = [
    {"id_hash": "0x1111111111111111111111111111111111111111111111111111111111111111", "file_hash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "timestamp": 1672531200, "wilaya": 16},
    {"id_hash": "0x2222222222222222222222222222222222222222222222222222222222222222", "file_hash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "timestamp": 1672617600, "wilaya": 9},
    {"id_hash": "0x3333333333333333333333333333333333333333333333333333333333333333", "file_hash": "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc", "timestamp": 1672704000, "wilaya": 31},
    {"id_hash": "0x4444444444444444444444444444444444444444444444444444444444444444", "file_hash": "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", "timestamp": 1672790400, "wilaya": 16},
    ]
    return applicants


def setup():
    """Load environment variables and connect to the blockchain."""
    load_dotenv() 

    rpc_url = os.getenv("SEPOLIA_RPC_URL")
    # Accept either PRIVATE_KEY or SEPOLIA_PRIVATE_KEY for flexibility
    private_key = os.getenv("PRIVATE_KEY") or os.getenv("SEPOLIA_PRIVATE_KEY")
    abi_path = os.getenv("ABI_PATH", "out/BatchRegistry.sol/BatchRegistry.json")

    if not rpc_url:
        raise Exception("SEPOLIA_RPC_URL must be set in .env")
    if not private_key:
        raise Exception("PRIVATE_KEY or SEPOLIA_PRIVATE_KEY must be set in .env. Note: this must be the EOA private key.")

    # Normalize private key (ensure 0x prefix)
    if not private_key.startswith("0x"):
        private_key = "0x" + private_key

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise Exception(f"Failed to connect to RPC: {rpc_url}")

    try:
        account = w3.eth.account.from_key(private_key)
    except Exception as e:
        raise Exception(f"Failed to construct account from provided private key: {e}")
    print(f"✅ Connected to blockchain. Operator address: {account.address}")
    print(f"  - RPC: {rpc_url}")

    # Load ABI
    if not os.path.exists(abi_path):
        raise Exception(f"ABI file not found at {abi_path}")
    with open(abi_path, "r") as f:
        artifact = json.load(f)
        if isinstance(artifact, dict) and "abi" in artifact:
            contract_abi = artifact["abi"]
        else:
            contract_abi = artifact

    return w3, account, contract_abi




def main():
    # 1. ARRANGE: Define our sample batch of applicants.
    print("--- Step 1: Building Merkle Tree ---")
    applicants = get_eligible_applicants_from_db()

    if not applicants:
        print("No new applicants to batch. Exiting.")
        return
    print(f"\nFound {len(applicants)} applicants for the batch.")

    # 2. ACT: Generate the leaf hashes for each applicant.
    sorted_applicants = sorted(applicants, key=lambda x: x["timestamp"])
    for app in sorted_applicants :
        leaf_hashes = [
            create_applicant_leaf(app["id_hash"], app["file_hash"], app["timestamp"], app["wilaya"])
            for app in sorted_applicants
        ]

    # 3. Build the Merkle Tree using the vendored implementation
    tree = MerkleTree(leaf_hashes)
    merkle_root = tree.get_root()
    print(f" => Calculated Merkle Root: 0x{merkle_root.hex()}")
    w3, account, contract_abi = setup()

    # sample data 
    sample_merkle_root = Web3.to_bytes(hexstr="0x123456789012345678901234567890123456789012345678901234567890abcd")
    sample_wilaya = 16
    sample_batch_size = 1000
    sample_metadata = b"Q1_2025"

    contract_address = os.getenv("CONTRACT_ADDRESS")
    if not contract_address:
        raise Exception("CONTRACT_ADDRESS must be set in .env")

    try:
        contract_address = Web3.to_checksum_address(contract_address)
    except Exception:
        raise Exception(f"CONTRACT_ADDRESS is not a valid address: {contract_address}")
    batch_registry_contract = w3.eth.contract(address=contract_address, abi=contract_abi)

    print("\n🚀 Preparing to send transaction...")
    print(f"  - Committing root: {sample_merkle_root.hex()}")

    # Prepare call, build transaction (includes to + data)
    function_call = batch_registry_contract.functions.commitBatch(
        sample_merkle_root, sample_wilaya, sample_batch_size, sample_metadata
    )

    nonce = w3.eth.get_transaction_count(account.address)
    gas_estimate = function_call.estimate_gas({"from": account.address})

    tx = function_call.build_transaction({
        "from": account.address,
        "nonce": nonce,
        "maxPriorityFeePerGas": w3.to_wei(2, "gwei"),
        "maxFeePerGas": w3.to_wei(60, "gwei"),
        "gas": int(gas_estimate * 1.2),
        "chainId": w3.eth.chain_id,
    })

    # Check account balance is sufficient to cover gas
    balance_wei = w3.eth.get_balance(account.address)
    gas_limit = int(tx.get("gas", gas_estimate))
    max_fee_per_gas = int(tx.get("maxFeePerGas", w3.to_wei(60, "gwei")))
    total_cost_wei = gas_limit * max_fee_per_gas
    if balance_wei < total_cost_wei:
        need_wei = total_cost_wei - balance_wei
        need_eth = Web3.from_wei(need_wei, "ether")
        bal_eth = Web3.from_wei(balance_wei, "ether")
        raise Exception(
            f"Insufficient funds for gas. Balance={bal_eth} ETH, required additional={need_eth} ETH.\n"
            "Please fund the account (PRIVATE_KEY/SEPOLIA_PRIVATE_KEY) on the target network or use a funded test account.\n"
            "You can check the account balance with: `cast balance " + account.address + " --rpc-url $SEPOLIA_RPC_URL` or use a block explorer."
        )

    # Sign and send
    signed = w3.eth.account.sign_transaction(tx, private_key=account.key)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"\n✅ Transaction sent! Hash: {tx_hash.hex()}")

    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print("\n🎉 Transaction confirmed!")
    print(f"  - Block Number: {receipt.blockNumber}")
    print(f"  - Gas Used: {receipt.gasUsed}")
    print(f"  - View on Etherscan: https://sepolia.etherscan.io/tx/{tx_hash.hex()}")
    
    # ... database UPDATE logic here ...


if __name__ == "__main__":
    main()