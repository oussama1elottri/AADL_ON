import os
import sys
import json
import asyncio
import logging
from web3 import Web3
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# --- Logging Setup ---
# A professional service should have proper logging, not just print statements.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Path Setup ---
# This ensures we can import modules from the 'backend' directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Now we can import from the backend
from backend.database import SessionLocal
from backend import models

# --- CONFIGURATION ---
load_dotenv()
WEBSOCKET_RPC_URL = os.getenv("SEPOLIA_WEBSOCKET_RPC_URL")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
ABI_PATH = os.getenv("ABI_PATH", "out/BatchRegistry.sol/BatchRegistry.json")

if not WEBSOCKET_RPC_URL:
    raise ValueError("SEPOLIA_WEBSOCKET_RPC_URL must be set in .env file.")

# --- WEB3 SETUP ---
w3 = Web3(Web3.LegacyWebSocketProvider(WEBSOCKET_RPC_URL))
with open(ABI_PATH, "r") as f:
    contract_abi = json.load(f)["abi"]
batch_registry_contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)


def process_and_save_batch(db: Session, event: dict):
    """
    Processes a BatchCommitted event and saves the relevant data to the database
    in a single atomic transaction.
    """
    event_args = event.args
    tx_hash = event.transactionHash.hex()
    
    logging.info(f"Processing event from transaction: {tx_hash}")

    try:
        # Step 1: Check if we've already processed this batch to prevent duplicates.
        existing_batch = db.query(models.Batch).filter(models.Batch.id == event_args.batchId).first()
        if existing_batch:
            logging.warning(f"Batch ID {event_args.batchId} has already been processed. Skipping.")
            return

        # Step 2: Fetch the applicants that were supposed to be in this batch.
        # This is the "verification" step. We find the applicants who were marked
        # 'eligible' and are now being included in this on-chain batch.

        #111revise: batch to applicant linking
        applicants_to_batch = db.query(models.Applicant).filter(
            models.Applicant.status == models.ApplicantStatus.ELIGIBLE
        ).all()

        if not applicants_to_batch:
            logging.warning(f"Received batch event for batch {event_args.batchId}, but found no eligible applicants in DB to process.")
            return

        # Step 3: Create the new Batch database object.
        new_batch = models.Batch(
            id=event_args.batchId,
            merkle_root=event_args.merkleRoot.hex(),
            tx_hash=tx_hash
        )
        db.add(new_batch)

        # Step 4: Create a Leaf for each applicant and update their status.
        for offset, applicant in enumerate(applicants_to_batch):
            # 111revise: re-calculat leaf_hash against the Merkle root
            new_leaf = models.Leaf(
                applicant_hash=applicant.applicant_hash,
                # 111revise: re-calculate leaf_hash from applicant data. Placeholder for now.
                leaf_hash=Web3.keccak(text=f"leaf_{applicant.applicant_hash}").hex(),
                batch_id=new_batch.id,
                offset=offset
            )
            db.add(new_leaf)
            
            # Update the applicant's status to BATCHED
            applicant.status = models.ApplicantStatus.BATCHED

        # Step 5: Commit the transaction.
        # All the above changes are committed to the DB in one atomic operation.
        db.commit()
        logging.info(f"Successfully processed and saved batch {new_batch.id} with {len(applicants_to_batch)} applicants.")

    except Exception as e:
        logging.error(f"Error processing event for tx {tx_hash}: {e}")
        db.rollback() # If anything fails, undo all changes for this event.


def handle_event(event: dict):

    print("\n---////// ---")
    
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


async def log_loop(event_filter, poll_interval):
    logging.info("Indexer started. Listening for BatchCommitted events...")
    while True:
        try:
            for event in event_filter.get_new_entries():
                handle_event(event)
            await asyncio.sleep(poll_interval)
        except Exception as e:
            logging.error(f"Error in main event loop: {e}. Retrying...")
            # A simple sleep is a basic retry mechanism.
            await asyncio.sleep(poll_interval * 5)


def main():
    """
    Sets up the event filter and starts the listening loop.
    """
    event_filter = batch_registry_contract.events.BatchCommitted.create_filter(from_block='latest')
    
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(
            asyncio.gather(
                log_loop(event_filter, 5) # Poll every 5 seconds
            )
        )
    except KeyboardInterrupt:
        logging.info("Indexer shutting down.")
    finally:
        loop.close()


if __name__ == "__main__":
    main()

