import re
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from app.models.user import KYCStatus
from app.models.kyc import DocumentType

class KYCBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    date_of_birth: str = Field(..., min_length=8, max_length=50)
    address: str = Field(..., min_length=5, max_length=500)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    postal_code: str = Field(..., min_length=5, max_length=20)
    identity_document_type: DocumentType
    identity_document_number: str = Field(..., min_length=5, max_length=100)

    @field_validator("identity_document_number")
    @classmethod
    def validate_document_number(cls, v: str, info) -> str:
        doc_type = info.data.get("identity_document_type")
        v = v.upper().strip()
        if doc_type == DocumentType.PAN:
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", v):
                raise ValueError("PAN Card must be in the format ABCDE1234F.")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: str) -> str:
        parsed_date = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                parsed_date = datetime.strptime(v.strip(), fmt)
                break
            except ValueError:
                continue
                
        if not parsed_date:
            raise ValueError("Date of Birth must be in format YYYY-MM-DD or DD/MM/YYYY.")
            
        if parsed_date.date() > datetime.utcnow().date():
            raise ValueError("Date of Birth cannot be in the future.")
        if parsed_date.year < 1900:
            raise ValueError("Please enter a valid birth year after 1900.")
            
        return v

class KYCCreate(KYCBase):
    pass

class KYCUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    date_of_birth: Optional[str] = Field(None, min_length=8, max_length=50)
    address: Optional[str] = Field(None, min_length=5, max_length=500)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    postal_code: Optional[str] = Field(None, min_length=5, max_length=20)
    identity_document_type: Optional[DocumentType] = None
    identity_document_number: Optional[str] = Field(None, min_length=5, max_length=100)

class KYCReject(BaseModel):
    rejection_reason: str = Field(..., min_length=5, max_length=500)

class KYCOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    date_of_birth: str
    address: str
    city: str
    state: str
    postal_code: str
    identity_document_type: DocumentType
    identity_document_number: str
    status: KYCStatus
    rejection_reason: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
