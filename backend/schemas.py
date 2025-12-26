from pydantic import BaseModel, Field, conint
from datetime import datetime
from typing import Optional, List

class ApplicantCreate(BaseModel):
    national_id: str = Field(..., max_length=50, description="The unique national identifier for the applicant.")
    full_name: str = Field(..., max_length=100)
    address: str = Field(..., max_length=255)
    wilaya_code: conint(gt=0) 

class Applicant(BaseModel):
    id: int
    applicant_hash: str
    full_name: str
    address: str
    wilaya_code: int
    file_hash: str
    status: str 
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ApplicantStatusResponse(BaseModel):
    national_id: str
    status: str
    batch_id: Optional[int] = None
    offset: Optional[int] = None
    merkle_root: Optional[str] = None
    # The proof is a list of hashes (sibling nodes) needed for verification
    merkle_proof: Optional[List[str]] = None 
    
    class Config:
        orm_mode = True