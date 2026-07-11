import time
import requests
from web3 import Web3

API_URL = "http://127.0.0.1:8000"

def get_applicant_hash(national_id: str) -> str:
    return Web3.keccak(text=national_id).hex()

def verify_merkle_proof(leaf_hash: bytes, proof: list, root: str, index: int) -> bool:
    current = leaf_hash
    idx = index
    for sibling in proof:
        sibling_bytes = bytes.fromhex(sibling.replace("0x", ""))
        if idx % 2 == 0:
            current = Web3.keccak(current + sibling_bytes)
        else:
            current = Web3.keccak(sibling_bytes + current)
        idx = idx // 2
    return current.hex().lower().replace("0x", "") == root.lower().replace("0x", "")

def main():
    print("=== STARTING INTEGRATION TEST (DATABASE-AGNOSTIC) ===")
    
    # 1. Register Applicants with new priority parameters
    applicants = [
        {
            "national_id": "222333444555",
            "full_name": "Mohamed Al-Djelfaoui",
            "address": "Oran, Algeria",
            "wilaya_code": 31,
            "age": 35,
            "is_married": False,
            "number_of_children": 0,
            "monthly_income": 70000,
            "is_disabled": False
        },
        {
            "national_id": "666777888999",
            "full_name": "Ahmed Al-Jazairi",
            "address": "Algiers, Algeria",
            "wilaya_code": 16,
            "age": 42,
            "is_married": True,
            "number_of_children": 2,
            "monthly_income": 40000,
            "is_disabled": False
        },
        {
            "national_id": "888999000111",
            "full_name": "Omaima Al-Qasentinia",
            "address": "Constantine, Algeria",
            "wilaya_code": 25,
            "age": 31,
            "is_married": True,
            "number_of_children": 1,
            "monthly_income": 35000,
            "is_disabled": True
        }
    ]
    
    registered_hashes = []
    for app in applicants:
        print(f"Registering applicant: {app['full_name']}...")
        r = requests.post(f"{API_URL}/v1/applicants/", json=app)
        if r.status_code in (201, 409):
            app_hash = get_applicant_hash(app["national_id"])
            registered_hashes.append(app_hash)
            print(f"  - Status: {r.status_code} (Success, Hash: {app_hash})")
        else:
            print(f"  - Error: {r.text}")
            return
            
    # 2. Approve applicants via the API
    print("Approving applicants via Admin API...")
    for h in registered_hashes:
        print(f"  - Approving applicant hash: {h}...")
        r = requests.put(f"{API_URL}/v1/applicants/{h}/approve", headers={"X-Admin-Key": "government-secret-notary-key"})
        if r.status_code == 200:
            print("    - Status: Approved")
        else:
            print(f"    - Error approving: {r.text}")
            return
        
    # 3. Trigger batch creation (commits on-chain)
    print("Triggering batch creation (API -> On-Chain)...")
    r = requests.post(f"{API_URL}/v1/batches/", headers={"X-Admin-Key": "government-secret-notary-key"})
    if r.status_code == 202:
        res = r.json()
        print(f"Batch creation accepted!")
        print(f"  - Batch ID: {res.get('batch_id')}")
        print(f"  - Tx Hash: {res.get('transaction_hash')}")
        print(f"  - Merkle Root: {res.get('merkle_root')}")
        batch_id = res.get('batch_id')
        merkle_root = res.get('merkle_root')
    else:
        print(f"Error triggering batch: {r.text}")
        return

    # 4. Wait for Indexer to catch up
    print("Waiting 5 seconds for background event indexer...")
    time.sleep(5)
    
    # 5. Query status and get proof for Mohamed
    mohamed_id = "222333444555"
    print(f"Querying status and proof receipt for Mohamed (ID: {mohamed_id})...")
    r = requests.get(f"{API_URL}/v1/applicants/{mohamed_id}/status")
    if r.status_code == 200:
        status_res = r.json()
        print(f"Response: {status_res}")
        proof = status_res.get("merkle_proof")
        offset = status_res.get("offset")
        root_from_api = status_res.get("merkle_root")
        file_hash = status_res.get("file_hash")
        wilaya_code = status_res.get("wilaya_code")
        timestamp = status_res.get("timestamp")
        
        print(f"  - Status: {status_res.get('status')}")
        print(f"  - Batch ID: {status_res.get('batch_id')}")
        print(f"  - Offset (Queue Position): {offset}")
        print(f"  - Priority Score: {status_res.get('priority_score')} pts")
    else:
        print(f"Error querying status: {r.text}")
        return

    # 6. Reconstruct leaf hash and verify proof off-chain using API response values
    app_hash = get_applicant_hash(mohamed_id)
    
    # Compute Solidity-compatible leaf hash
    leaf_hash = Web3.solidity_keccak(
        ['bytes32', 'bytes32', 'uint64', 'uint16'],
        [
            bytes.fromhex(app_hash.replace("0x", "")),
            bytes.fromhex(file_hash.replace("0x", "")),
            timestamp,
            wilaya_code
        ]
    )
    print(f"Computed leaf hash for Mohamed: 0x{leaf_hash.hex()}")
    
    # Verify Merkle Proof
    verified = verify_merkle_proof(leaf_hash, proof, merkle_root, offset)
    if verified:
        print("\n🏆 INTEGRATION TEST RESULT: SUCCESS!")
        print("   The generated Merkle Proof receipt verified successfully against the on-chain Merkle Root!")
    else:
        print("\n❌ INTEGRATION TEST RESULT: FAILURE!")
        print("   The Merkle Proof receipt could not be verified against the on-chain Merkle Root.")
        
if __name__ == "__main__":
    main()
