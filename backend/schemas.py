from pydantic import BaseModel, Field, conint
from datetime import datetime
from typing import Optional, List

class ApplicantCreate(BaseModel):
    national_id: str = Field(..., max_length=50, description="The unique national identifier for the applicant.")
    full_name: str = Field(..., max_length=100)
    address: str = Field(..., max_length=255)
    wilaya_code: conint(gt=0) 
    age: int = Field(..., ge=18, le=120)
    is_married: bool
    number_of_children: int = Field(..., ge=0, le=20)
    monthly_income: int = Field(..., ge=0)
    is_disabled: bool

class Applicant(BaseModel):
    id: int
    applicant_hash: str
    full_name: str
    address: str
    wilaya_code: int
    file_hash: str
    age: int
    is_married: bool
    number_of_children: int
    monthly_income: int
    is_disabled: bool
    priority_score: int
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
    file_hash: Optional[str] = None
    wilaya_code: Optional[int] = None
    timestamp: Optional[int] = None
    full_name: Optional[str] = None
    priority_score: Optional[int] = None
    
    class Config:
        orm_mode = True

class BatchResponse(BaseModel):
    id: int
    merkle_root: str
    tx_hash: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True