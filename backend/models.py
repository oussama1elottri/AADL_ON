from sqlalchemy import Column, Integer, String, BigInteger, ForeignKey, DateTime, func, Enum
from sqlalchemy.orm import relationship
import enum

from .database import Base

class ApplicantStatus(enum.Enum):
    PENDING = "pending"
    ELIGIBLE = "eligible"
    BATCHED = "batched"
    SELECTED = "selected"
    REJECTED = "rejected"

class Applicant(Base):
    __tablename__ = "applicants"

    id = Column(Integer, primary_key=True, index=True)
    applicant_hash = Column(String(66), unique=True, index=True, nullable=False)
    
    # --- PII Fields ---
    full_name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    
    # --- Data required for Merkle Leaf ---
    wilaya_code = Column(Integer, nullable=False)
    # For now, we'll store a mock file_hash. Later, this would come from a document upload service.
    file_hash = Column(String(66), nullable=False) 

    # --- System Fields ---
    status = Column(Enum(ApplicantStatus), default=ApplicantStatus.PENDING, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Batch(Base):
    __tablename__ = "batches"

    id = Column(BigInteger, primary_key=True, index=True)
    merkle_root = Column(String(66), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now()) 

    leaves = relationship("Leaf", back_populates="batch")


class Leaf(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True)
    applicant_hash = Column(String(66), index=True, nullable=False) 
    leaf_hash = Column(String(66), unique=True, nullable=False)
    
    batch_id = Column(BigInteger, ForeignKey("batches.id"), nullable=False)
    offset = Column(Integer, nullable=False)

    batch = relationship("Batch", back_populates="leaves")


