from pydantic import BaseModel, Field, conint
from datetime import datetime

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