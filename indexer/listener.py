import os
import sys
import json
import asyncio
import logging
from web3 import Web3
from dotenv import load_dotenv
from sqlalchemy.orm import Session

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import SessionLocal
from backend import models

load_dotenv()
WEBSOCKET_RPC_URL = os.getenv("SEPOLIA_WEBSOCKET_RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
ABI_PATH = os.getenv("ABI_PATH", "out/BatchRegistry.sol/BatchRegistry.json")

if not WEBSOCKET_RPC_URL:
    raise ValueError("SEPOLIA_WEBSOCKET_RPC_URL must be set in .env file.")

w3 = Web3(Web3.LegacyWebSocketProvider(WEBSOCKET_RPC_URL))
with open(ABI_PATH, "r") as f:
    contract_abi = json.load(f)["abi"]
batch_registry_contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)


def process_and_save_batch(db: Session, event: dict):
    """
    Processes a BatchCommitted event and reconciles it with the database.
    Performs an audit verification check between local and on-chain Merkle Roots.
    """
    event_args = event.args
    tx_hash = event.transactionHash.hex()
    
    logging.info(f"Processing event for Batch ID {event_args.batchId} from transaction: {tx_hash}")

    try:
        # Check if the batch was pre-allocated in the database
        existing_batch = db.query(models.Batch).filter(models.Batch.id == event_args.batchId).first()
        
        if existing_batch:
            # Check if this transaction has already been synced
            if existing_batch.tx_hash == tx_hash:
                logging.info(f"Batch ID {event_args.batchId} already fully synchronized. Skipping.")
                return

            # Perform AUDIT CHECK: verify that the local Merkle root matches the on-chain Merkle root
            local_root = existing_batch.merkle_root.lower().replace("0x", "")
            chain_root = event_args.merkleRoot.hex().lower().replace("0x", "")
            
            if local_root != chain_root:
                logging.critical(
                    f"AUDIT TAMPER ALARM: Merkle Root mismatch for Batch ID {event_args.batchId}! "
                    f"Local database root: {existing_batch.merkle_root}, On-chain root: 0x{chain_root}. "
                    f"This indicates database tampering or blockchain drift!"
                )
                return
            
            # If verified, update the transaction hash (which might have been pending)
            existing_batch.tx_hash = tx_hash
            db.commit()
            logging.info(f"Successfully audited and confirmed Batch {event_args.batchId} on-chain.")
        
        else:
            # The batch was committed directly on-chain, bypassing the API.
            # We record it as an external/unmapped batch to keep a consistent ledger mirror.
            chain_root_hex = f"0x{event_args.merkleRoot.hex().lower().replace('0x', '')}"
            new_batch = models.Batch(
                id=event_args.batchId,
                merkle_root=chain_root_hex,
                tx_hash=tx_hash
            )
            db.add(new_batch)
            db.commit()
            logging.warning(
                f"Successfully indexed external Batch ID {event_args.batchId} (Merkle Root: {chain_root_hex}) "
                f"which was committed directly to the smart contract."
            )

    except Exception as e:
        logging.error(f"Error processing event for tx {tx_hash}: {e}")
        db.rollback()



def handle_event(event: dict):
    logging.info(f"Processing BatchCommitted event for Batch ID {event.args.batchId} (Tx: {event.transactionHash.hex()})")
    
    # The event data is in a dictionary-like object
    batch_id = event.args.batchId
    merkle_root = event.args.merkleRoot.hex()
    operator = event.args.operator
    wilaya = event.args.wilaya
    
    print(f"  - Batch ID: {batch_id}")
    print(f"  - Merkle Root: {merkle_root}")
    print(f"  - Operator: {operator}")
    print(f"  - Wilaya: {wilaya}")
    print(f"  - Transaction Hash: {event.transactionHash.hex()}")

    """
    This function is called when a new event is detected.
    It creates a new database session for each event to ensure thread safety.
    """
    logging.info(f"--- New BatchCommitted Event Detected! Tx: {event.transactionHash.hex()} ---")
    
    db = SessionLocal()
    try:
        process_and_save_batch(db, event)
    finally:
        db.close()


async def log_loop(poll_interval):
    logging.info("Indexer started. Listening for BatchCommitted events via block logs...")
    last_processed_block = w3.eth.block_number
    
    while True:
        try:
            current_block = w3.eth.block_number
            if current_block >= last_processed_block:
                events = batch_registry_contract.events.BatchCommitted.get_logs(
                    from_block=last_processed_block,
                    to_block=current_block
                )
                for event in events:
                    handle_event(event)
                last_processed_block = current_block + 1
            await asyncio.sleep(poll_interval)
        except Exception as e:
            logging.error(f"Error in main event loop: {e}. Re-syncing from current block...")
            await asyncio.sleep(poll_interval * 2)
            try:
                last_processed_block = max(0, w3.eth.block_number - 10)
            except Exception:
                pass


def main():
    """
    Starts the persistent event indexing loop.
    """
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(
            asyncio.gather(
                log_loop(3) # Poll block range every 3 seconds
            )
        )
    except KeyboardInterrupt:
        logging.info("Indexer shutting down.")
    finally:
        loop.close()


if __name__ == "__main__":
    main()

