import secrets
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from .services import blockchain_service

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
        # A real system would take this as input.
        tx_hash = blockchain_service.create_and_commit_batch(
            eligible_applicants=eligible_applicants,
            wilaya_code=16,
            metadata=b"Q4_2025_BATCH"
        )

        # 3. Update the status of applicants in the DB
        for app in eligible_applicants:
            app.status = models.ApplicantStatus.BATCHED
        
        db.commit()

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