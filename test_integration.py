import time
import sqlite3
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
    print("=== STARTING INTEGRATION TEST ===")
    
    # 0. Clear tables in SQLite DB for a clean test run
    print("Clearing tables in local database for a clean run...")
    try:
        conn = sqlite3.connect("aadl_on.db")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM leaves")
        cursor.execute("DELETE FROM batches")
        cursor.execute("DELETE FROM applicants")
        conn.commit()
        conn.close()
        print("  - Database tables cleared successfully.")
    except Exception as e:
        print(f"  - (Skip) Could not clear database tables: {e}")
    
    # 1. Register Applicants
    applicants = [
        {"national_id": "222333444555", "full_name": "Mohamed Al-Djelfaoui", "address": "Oran, Algeria", "wilaya_code": 31},
        {"national_id": "666777888999", "full_name": "Ahmed Al-Jazairi", "address": "Algiers, Algeria", "wilaya_code": 16},
        {"national_id": "888999000111", "full_name": "Omaima Al-Qasentinia", "address": "Constantine, Algeria", "wilaya_code": 25}
    ]
    
    for app in applicants:
        print(f"Registering applicant: {app['full_name']}...")
        r = requests.post(f"{API_URL}/v1/applicants/", json=app)
        if r.status_code in (201, 409):
            print(f"  - Status: {r.status_code} (Success or Already Existed)")
        else:
            print(f"  - Error: {r.text}")
            return
            
    # 2. Simulate administrative approval by setting status to ELIGIBLE in SQLite
    print("Setting applicants' status to ELIGIBLE in database...")
    conn = sqlite3.connect("aadl_on.db")
    cursor = conn.cursor()
    cursor.execute("UPDATE applicants SET status = 'ELIGIBLE'")
    conn.commit()
    
    # Retrieve details to check
    cursor.execute("SELECT id, applicant_hash, created_at, wilaya_code, file_hash FROM applicants ORDER BY id ASC")
    db_apps = cursor.fetchall()
    conn.close()
    
    print(f"Total eligible applicants in database: {len(db_apps)}")
    for row in db_apps:
        print(f"  - ID: {row[0]}, Hash: {row[1]}, Created At: {row[2]}, Wilaya: {row[3]}")
        
    # 3. Trigger batch creation (commits on-chain)
    print("Triggering batch creation (API -> On-Chain)...")
    r = requests.post(f"{API_URL}/v1/batches/")
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
    print("Waiting 5 seconds for background event indexer and audit loop...")
    time.sleep(5)
    
    # 5. Query status and get proof for Fatima
    fatima_id = "222333444555"
    print(f"Querying status and proof receipt for Fatima (ID: {fatima_id})...")
    r = requests.get(f"{API_URL}/v1/applicants/{fatima_id}/status")
    if r.status_code == 200:
        status_res = r.json()
        print(f"Response: {status_res}")
        proof = status_res.get("merkle_proof")
        offset = status_res.get("offset")
        root_from_api = status_res.get("merkle_root")
        print(f"  - Status: {status_res.get('status')}")
        print(f"  - Batch ID: {status_res.get('batch_id')}")
        print(f"  - Offset: {offset}")
        print(f"  - Proof: {proof}")
    else:
        print(f"Error querying status: {r.text}")
        return

    # 6. Reconstruct leaf hash and verify proof off-chain
    # Get database info for Fatima to compute the exact leaf
    conn = sqlite3.connect("aadl_on.db")
    cursor = conn.cursor()
    fatima_hash = get_applicant_hash(fatima_id)
    cursor.execute("SELECT applicant_hash, file_hash, created_at, wilaya_code FROM applicants WHERE applicant_hash = ?", (fatima_hash,))
    fatima_row = cursor.fetchone()
    conn.close()
    
    if not fatima_row:
        print("Could not find Fatima's database record to verify proof.")
        return
        
    app_hash, file_hash, created_at_str, wilaya_code = fatima_row
    
    # Parse created_at string
    # SQLite datetime is stored as string 'YYYY-MM-DD HH:MM:SS.ffffff' or similar
    # We parse it to convert to Unix timestamp
    from datetime import datetime
    try:
        # FastAPI/SQLite created_at format
        dt = datetime.strptime(created_at_str.split(".")[0], "%Y-%m-%d %H:%M:%S")
    except Exception:
        dt = datetime.fromisoformat(created_at_str)
        
    timestamp = int(dt.timestamp())
    
    # Compute Solidity-compatible leaf hash
    # Web3.solidity_keccak takes lists of types and values
    leaf_hash = Web3.solidity_keccak(
        ['bytes32', 'bytes32', 'uint64', 'uint16'],
        [
            bytes.fromhex(app_hash.replace("0x", "")),
            bytes.fromhex(file_hash.replace("0x", "")),
            timestamp,
            wilaya_code
        ]
    )
    print(f"Computed leaf hash for Fatima: 0x{leaf_hash.hex()}")
    
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
