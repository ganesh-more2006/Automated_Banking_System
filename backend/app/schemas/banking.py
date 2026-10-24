import re
from pydantic import BaseModel, Field, field_validator
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from app.models.banking import AccountType, AccountStatus, TransactionType, TransactionStatus

class AccountCreate(BaseModel):
    account_type: AccountType = AccountType.SAVINGS
    currency: str = Field("INR", min_length=3, max_length=3)
    ifsc_code: str = Field("APEX0000123", min_length=11, max_length=11)

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, v: str) -> str:
        return v.upper()

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        v = v.upper()
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", v):
            raise ValueError("IFSC Code must be 11 characters in the format ABCD0123456.")
        return v

class AccountOut(BaseModel):
    id: int
    account_number: str
    user_id: int
    account_type: AccountType
    balance: Decimal
    currency: str
    status: AccountStatus
    ifsc_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TransactionRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=255)
    pin: str = Field(..., min_length=6, max_length=6)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Transaction PIN must contain only digits.")
        return v

class TransferRequest(BaseModel):
    receiver_account_number: str = Field(..., min_length=5, max_length=20)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=255)

class TransactionOut(BaseModel):
    id: int
    sender_account_id: Optional[int] = None
    receiver_account_id: Optional[int] = None
    sender_account_number: Optional[str] = None
    receiver_account_number: Optional[str] = None
    amount: Decimal
    transaction_type: TransactionType
    status: TransactionStatus
    reference_number: str
    description: Optional[str] = None
    timestamp: datetime

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Extract account numbers for easier UI consumption
        data = super().model_validate(obj, **kwargs)
        if obj.sender_account:
            data.sender_account_number = obj.sender_account.account_number
        if obj.receiver_account:
            data.receiver_account_number = obj.receiver_account.account_number
        return data

    class Config:
        from_attributes = True

class StatementOut(BaseModel):
    account: AccountOut
    total_deposits: Decimal
    total_withdrawals: Decimal
    transactions: List[TransactionOut]
