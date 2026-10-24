import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from app.models.user import UserRole, KYCStatus, ProfileStatus

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_or_account_number(cls, v: str) -> str:
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        acc_num_regex = r"^\d{5,20}$"
        v = v.strip()
        if not re.match(email_regex, v) and not re.match(acc_num_regex, v):
            raise ValueError("Identifier must be a valid email or bank account number.")
        return v.lower()

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    pan_kyc_identifier: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, v):
            raise ValueError("Invalid email format.")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character.")
        return v

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    subject: Optional[str] = None

class CustomerProfileOut(BaseModel):
    id: int
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    pan_kyc_identifier: Optional[str] = None
    kyc_status: KYCStatus
    profile_status: ProfileStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool
    is_pin_set: bool = False
    created_at: datetime
    updated_at: datetime
    profile: Optional[CustomerProfileOut] = None

    class Config:
        from_attributes = True

class PINSetup(BaseModel):
    pin: str = Field(..., min_length=6, max_length=6)
    confirm_pin: str = Field(..., min_length=6, max_length=6)

    @field_validator("pin", "confirm_pin")
    @classmethod
    def validate_pin_format(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("PIN must contain only digits.")
        return v
