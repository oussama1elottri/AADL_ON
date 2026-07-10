import secrets
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from .services import blockchain_service

from typing import List 
from .services import merkle_service

# Import all the modules we've built
from . import models, schemas, security
from .database import SessionLocal, engine

from fastapi.middleware.cors import CORSMiddleware

# This line ensures that if the API starts before the DB is initialized,
# it will create the necessary tables.
models.Base.metadata.create_all(bind=engine)

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

# --- Dependency for Database Session ---
# This function provides a database session to our API endpoints and ensures it's
# always closed after the request is finished. This is a crucial pattern.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoints ---

@app.post("/v1/applicants/", response_model=schemas.Applicant, status_code=201, tags=["Applicants"])
def create_applicant(applicant_data: schemas.ApplicantCreate, db: Session = Depends(get_db)):
    """
    Registers a new applicant in the system.

    - **Validates** incoming data via the `schemas.ApplicantCreate` model.
    - **Hashes** the `national_id` for privacy and uniqueness.
    - **Checks for duplicates** based on the generated hash.
    - **Stores** the new applicant in the database with all required fields.
    """
    # Hash the sensitive identifier using our security utility.
    applicant_hash = security.hash_identifier(applicant_data.national_id)

    # Check for duplicates to prevent the same person from applying multiple times.
    existing_applicant = db.query(models.Applicant).filter(models.Applicant.applicant_hash == applicant_hash).first()
    if existing_applicant:
        raise HTTPException(
            status_code=409, # 409 Conflict is the correct HTTP status code for a duplicate resource.
            detail="Conflict: An applicant with this National ID already exists."
        )
    
    # --- Mocking the File Hash ---
    # In a real system, this hash would come from a file upload service after
    # hashing the contents of an uploaded document. For now, we generate a 
    # random 32-byte hash to satisfy our data model's requirements.
    mock_file_hash = "0x" + secrets.token_hex(32)

    # Create the SQLAlchemy model instance with all the required data.
    db_applicant = models.Applicant(
        applicant_hash=applicant_hash,
        full_name=applicant_data.full_name,
        address=applicant_data.address,
        wilaya_code=applicant_data.wilaya_code,
        file_hash=mock_file_hash # Using our generated mock hash
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

@app.put("/v1/applicants/{applicant_hash}/approve", response_model=schemas.Applicant, tags=["Applicants"])
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

@app.post("/v1/batches/", status_code=202, tags=["Batches"])
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
        raise HTTPException(
            status_code=409,
            detail=f"Batch ID {next_batch_id} already exists in database. Indexer sync may be pending."
        )

    # 2. Fetch eligible applicants ordered deterministically
    eligible_applicants = db.query(models.Applicant).filter(
        models.Applicant.status == models.ApplicantStatus.ELIGIBLE
    ).order_by(models.Applicant.id.asc()).all()

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
        "full_name": applicant.full_name
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

