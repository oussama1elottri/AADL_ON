import secrets
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from .services import blockchain_service

from typing import List 
from .services import merkle_service

# Import all the modules we've built
from . import models, schemas, security
from .database import SessionLocal, engine

# This line ensures that if the API starts before the DB is initialized,
# it will create the necessary tables.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AADL_ON API",
    description="The official API for the AADL_ON housing application system.",
    version="0.1.0"
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

@app.get("/", tags=["Status"])
def read_root():
    return {"status": "ok", "message": "Welcome to the AADL_ON API"}

@app.post("/v1/batches/", status_code=202, tags=["Batches"])
def trigger_batch_creation(db: Session = Depends(get_db)):
    """
    Triggers the creation of a new batch.

    1. Fetches all applicants with 'eligible' status.
    2. Builds a Merkle Tree and commits the root to the blockchain.
    3. Updates the status of included applicants to 'batched'.
    (Note: For simplicity, this POC batches all eligible applicants together)
    """
    # 1. Fetch eligible applicants from the database
    eligible_applicants = db.query(models.Applicant).filter(models.Applicant.status == models.ApplicantStatus.ELIGIBLE).all()

    if not eligible_applicants:
        return {"message": "No eligible applicants to batch."}

    try:
        # For this POC, we'll hardcode wilaya and metadata.
        # 111revise: make dynamic later
        tx_hash = blockchain_service.create_and_commit_batch(
            eligible_applicants=eligible_applicants,
            wilaya_code=16,
            metadata=b"Q4_2025_BATCH"
        )

        # 3. Update the status of applicants in the DB
        # for app in eligible_applicants:
        #     app.status = models.ApplicantStatus.BATCHED
        
        # db.commit()

        return {
            "message": "Batch creation successful.",
            "transaction_hash": tx_hash,
            "applicants_batched": len(eligible_applicants)
        }
    except Exception as e:
        # If anything goes wrong (e.g., out of gas), we raise an error
        # and do NOT change the status of applicants in the DB.
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during batch creation: {e}"
        )


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
        "merkle_proof": None
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