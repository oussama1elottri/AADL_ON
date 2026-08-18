import secrets
import os
from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from .services import blockchain_service

from typing import List 
from .services import merkle_service

from . import models, schemas, security
from .rate_limiter import limiter_standard, limiter_heavy
from .database import SessionLocal, engine

from fastapi.middleware.cors import CORSMiddleware

# This line ensures that if the API starts before the DB is initialized,
# it will create the necessary tables.
models.Base.metadata.create_all(bind=engine)

# API Key Authentication dependency
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "government-secret-notary-key")

def verify_admin_auth(x_admin_key: str = Header(None, alias="X-Admin-Key")):
    if not x_admin_key or x_admin_key != ADMIN_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized Admin Access: Invalid or missing X-Admin-Key header."
        )

app = FastAPI(
    title="AADL_ON API",
    description="The official API for the AADL_ON housing application system.",
    version="0.1.0"
)

# --- CORS CONFIGURATION ---
origins = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/v1/applicants/", response_model=schemas.Applicant, status_code=201, dependencies=[Depends(limiter_standard)], tags=["Applicants"])
def create_applicant(applicant_data: schemas.ApplicantCreate, db: Session = Depends(get_db)):
    """
    Registers a new applicant, computes privacy hash, and calculates priority score.
    """
    applicant_hash = security.hash_identifier(applicant_data.national_id)

    existing_applicant = db.query(models.Applicant).filter(models.Applicant.applicant_hash == applicant_hash).first()
    if existing_applicant:
        raise HTTPException(
            status_code=409,
            detail="Conflict: An applicant with this National ID already exists."
        )
    
    mock_file_hash = "0x" + secrets.token_hex(32)

    score = 0
    if 30 <= applicant_data.age <= 45:
        score += 20
    if applicant_data.is_married:
        score += 15
    score += applicant_data.number_of_children * 10
    if applicant_data.monthly_income < 50000:
        score += 30
    if applicant_data.is_disabled:
        score += 40

    db_applicant = models.Applicant(
        applicant_hash=applicant_hash,
        full_name=applicant_data.full_name,
        address=applicant_data.address,
        wilaya_code=applicant_data.wilaya_code,
        file_hash=mock_file_hash, # Using our generated mock hash
        age=applicant_data.age,
        is_married=applicant_data.is_married,
        number_of_children=applicant_data.number_of_children,
        monthly_income=applicant_data.monthly_income,
        is_disabled=applicant_data.is_disabled,
        priority_score=score
    )

    # Add to session, commit to DB, and refresh to get the new ID and timestamps.
    db.add(db_applicant)
    db.commit()
    db.refresh(db_applicant)

    return db_applicant

@app.get("/v1/applicants/", response_model=List[schemas.Applicant], tags=["Applicants"])
def list_applicants(db: Session = Depends(get_db)):
    """
    Retrieves all registered applicants from the database, ordered by registration ID descending.
    """
    return db.query(models.Applicant).order_by(models.Applicant.id.desc()).all()

@app.put("/v1/applicants/{applicant_hash}/approve", response_model=schemas.Applicant, dependencies=[Depends(verify_admin_auth)], tags=["Applicants"])
def approve_applicant(applicant_hash: str, db: Session = Depends(get_db)):
    """
    Approves a pending applicant, changing their status to 'eligible' so they can be batched on-chain.
    """
    applicant = db.query(models.Applicant).filter(models.Applicant.applicant_hash == applicant_hash).first()
    
    if not applicant:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found."
        )
        
    if applicant.status != models.ApplicantStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve applicant in state: {applicant.status.value}"
        )
        
    applicant.status = models.ApplicantStatus.ELIGIBLE
    db.commit()
    db.refresh(applicant)
    return applicant

@app.get("/", tags=["Status"])
def read_root():
    return {"status": "ok", "message": "Welcome to the AADL_ON API"}

@app.post("/v1/batches/", status_code=202, dependencies=[Depends(verify_admin_auth)], tags=["Batches"])
def trigger_batch_creation(db: Session = Depends(get_db)):
    """
    Triggers the creation of a new batch.

    1. Queries the blockchain to get the next Batch ID.
    2. Fetches all applicants with 'eligible' status, ordered deterministically.
    3. Builds the Merkle Tree, pre-allocates the Batch and Leaves in the DB.
    4. Commits the Merkle Root on-chain and updates the batch transaction hash.
    """
    # 1. Fetch next batch ID from the blockchain
    try:
        current_batch_id = blockchain_service.get_current_batch_id()
        next_batch_id = current_batch_id + 1
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not connect to smart contract to query next batch ID: {e}"
        )

    # Check for duplicate Batch ID in database
    existing_batch = db.query(models.Batch).filter(models.Batch.id == next_batch_id).first()
    if existing_batch:
        if current_batch_id == 0:
            # Automatic local dev state reconciliation: Blockchain node was restarted (resets to 0),
            # but DB volume persisted old batches. Reset stale batches/leaves to stay in sync with the fresh chain.
            print("Detected local blockchain reset (current_batch_id == 0). Auto-reconciling DB state with fresh chain...")
            db.query(models.Leaf).delete()
            db.query(models.Batch).delete()
            db.query(models.Applicant).filter(
                models.Applicant.status == models.ApplicantStatus.BATCHED
            ).update({models.Applicant.status: models.ApplicantStatus.ELIGIBLE}, synchronize_session=False)
            db.commit()
        else:
            raise HTTPException(
                status_code=409,
                detail=f"Batch ID {next_batch_id} already exists in database. Indexer sync may be pending."
            )

    # 2. Fetch eligible applicants ordered by priority score descending, then by id ascending (FIFO tie-breaker)
    eligible_applicants = db.query(models.Applicant).filter(
        models.Applicant.status == models.ApplicantStatus.ELIGIBLE
    ).order_by(
        models.Applicant.priority_score.desc(),
        models.Applicant.id.asc()
    ).all()

    if not eligible_applicants:
        return {"message": "No eligible applicants to batch."}

    # 3. Calculate Merkle Tree leaves and root
    leaves_hashes = []
    leaves_bytes = []
    for app in eligible_applicants:
        timestamp = int(app.created_at.timestamp())
        leaf_hash_bytes = merkle_service.create_applicant_leaf(
            app.applicant_hash,
            app.file_hash,
            timestamp,
            app.wilaya_code
        )
        leaves_bytes.append(leaf_hash_bytes)
        leaves_hashes.append(f"0x{leaf_hash_bytes.hex()}")

    tree = merkle_service.MerkleTree(leaves_bytes)
    merkle_root_bytes = tree.get_root()
    merkle_root_hex = f"0x{merkle_root_bytes.hex()}"

    # 4. Pre-create the Batch and Leaves in database
    try:
        new_batch = models.Batch(
            id=next_batch_id,
            merkle_root=merkle_root_hex,
            tx_hash=None
        )
        db.add(new_batch)

        for offset, app in enumerate(eligible_applicants):
            new_leaf = models.Leaf(
                applicant_hash=app.applicant_hash,
                leaf_hash=leaves_hashes[offset],
                batch_id=next_batch_id,
                offset=offset
            )
            db.add(new_leaf)
            app.status = models.ApplicantStatus.BATCHED

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Database transaction failed while pre-allocating batch: {e}"
        )

    # 5. Commit Merkle Root on-chain
    try:
        tx_hash = blockchain_service.commit_batch_on_chain(
            merkle_root=merkle_root_bytes,
            wilaya_code=16,
            batch_size=len(eligible_applicants),
            metadata=b"Q4_2025_BATCH"
        )

        # Update batch with transaction hash
        batch_record = db.query(models.Batch).filter(models.Batch.id == next_batch_id).first()
        batch_record.tx_hash = tx_hash
        db.commit()

        return {
            "message": "Batch creation successful and committed on-chain.",
            "batch_id": next_batch_id,
            "transaction_hash": tx_hash,
            "merkle_root": merkle_root_hex,
            "applicants_batched": len(eligible_applicants)
        }
    except Exception as e:
        # Revert database changes on transaction failure
        db.rollback()
        try:
            db.query(models.Leaf).filter(models.Leaf.batch_id == next_batch_id).delete()
            db.query(models.Batch).filter(models.Batch.id == next_batch_id).delete()
            for app in eligible_applicants:
                app.status = models.ApplicantStatus.ELIGIBLE
            db.commit()
        except Exception as rollback_err:
            print(f"Failed to rollback database state after blockchain failure: {rollback_err}")
            pass

        raise HTTPException(
            status_code=500,
            detail=f"Failed to commit batch on-chain (database state reverted): {e}"
        )
    
@app.get("/v1/batches/", response_model=List[schemas.BatchResponse], tags=["Batches"])
def list_batches(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns a list of all committed batches.
    """
    batches = db.query(models.Batch).order_by(models.Batch.id.desc()).offset(skip).limit(limit).all()
    return batches


### Verify Applicant Status Endpoint ###

@app.get("/v1/applicants/{national_id}/status", response_model=schemas.ApplicantStatusResponse, tags=["Applicants"])
def check_applicant_status(national_id: str, db: Session = Depends(get_db)):
    """
    Checks the status of an applicant. 
    If they are BATCHED, this calculates and returns their Merkle Proof.
    """
    # 1. Hash the ID to look it up
    applicant_hash = security.hash_identifier(national_id)

    # 2. Find the applicant
    applicant = db.query(models.Applicant).filter(models.Applicant.applicant_hash == applicant_hash).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    response = {
        "national_id": national_id,
        "status": applicant.status.value, # Convert Enum to string
        "batch_id": None,
        "offset": None,
        "merkle_root": None,
        "merkle_proof": None,
        "file_hash": applicant.file_hash,
        "wilaya_code": applicant.wilaya_code,
        "timestamp": int(applicant.created_at.timestamp()),
        "full_name": applicant.full_name,
        "priority_score": applicant.priority_score
    }

    # 3. If they are not batched, just return the status

    if applicant.status != models.ApplicantStatus.BATCHED:
        return response

    # 4. If they ARE batched, we need to fetch the proof data from the 'leaves' and 'batches' tables
    leaf_record = db.query(models.Leaf).filter(models.Leaf.applicant_hash == applicant_hash).first()
    if not leaf_record:

        # This shouldn't happen if the Indexer is working correctly, but good to handle
        return response 

    batch_record = db.query(models.Batch).filter(models.Batch.id == leaf_record.batch_id).first()
    
    response["batch_id"] = leaf_record.batch_id
    response["offset"] = leaf_record.offset
    response["merkle_root"] = batch_record.merkle_root

    # --- 5. Generate the Merkle Proof ---
    # To generate a proof, we need ALL leaves from this batch to rebuild the tree.
    # In a massive production system, we might store proofs, but rebuilding 
    # for small batches (<10k) is fast and cheap.
    
    # Fetch all leaves for this batch, ordered by offset
    all_leaves = db.query(models.Leaf).filter(models.Leaf.batch_id == leaf_record.batch_id).order_by(models.Leaf.offset).all()
    
    # Extract the hashes (we assume the leaf_hash column is populated)
    leaf_hashes = [leaf.leaf_hash for leaf in all_leaves]
    
    # Rebuild the tree
    try:
        tree = merkle_service.MerkleTree(leaf_hashes)
        proof = tree.get_proof(leaf_record.leaf_hash)
        
        # Convert proof bytes to hex strings for the API response
        response["merkle_proof"] = [p.hex() if isinstance(p, bytes) else p for p in proof]
    except Exception as e:
        print(f"Error creating proof: {e}")
        # We don't fail the request, just return no proof
        pass

    return response

@app.post("/v1/applicants/{national_id}/prove", dependencies=[Depends(limiter_heavy)], tags=["Applicants"])
async def prove_applicant_priority(national_id: str, db: Session = Depends(get_db)):
    """
    Generates a Zero-Knowledge Proof verifying that the applicant's priority score 
    was calculated correctly based on their private criteria (age, income, etc).
    Executed asynchronously off the main event loop thread.
    """
    from . import zk_service
    
    # 1. Look up applicant
    applicant_hash = security.hash_identifier(national_id)
    applicant = db.query(models.Applicant).filter(models.Applicant.applicant_hash == applicant_hash).first()
    
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
        
    # 2. Run ZoKrates witness and proof generation asynchronously
    try:
        proof_payload = await zk_service.async_generate_zk_proof(
            age=applicant.age,
            is_married=applicant.is_married,
            children=applicant.number_of_children,
            income=applicant.monthly_income,
            is_disabled=applicant.is_disabled,
            public_score=applicant.priority_score
        )
        return proof_payload
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"ZK Proof Generation Failed: {e}"
        )


