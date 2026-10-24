from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from app.models.user import UserRole, KYCStatus, ProfileStatus
from app.models.banking import AccountType, AccountStatus, TransactionType, TransactionStatus

class KYCUpdate(BaseModel):
    kyc_status: KYCStatus
    profile_status: Optional[ProfileStatus] = None
    rejection_reason: Optional[str] = None

class AccountStatusUpdate(BaseModel):
    status: AccountStatus
    reason: Optional[str] = None

class ReversalRequest(BaseModel):
    reason: str

class KPICards(BaseModel):
    total_customers: int
    total_accounts: int
    total_deposits: Decimal
    total_withdrawals: Decimal
    total_transfers: Decimal
    total_balance: Decimal
    today_transactions: int
    suspicious_transactions: int

class MonthlyVolume(BaseModel):
    month: str
    deposits: Decimal
    withdrawals: Decimal
    transfers: Decimal

class TypeDistribution(BaseModel):
    name: str  # TransactionType
    value: int # count

class AdminStats(BaseModel):
    kpis: KPICards
    monthly_volume: List[MonthlyVolume]
    type_distribution: List[TypeDistribution]

class AuditLogOut(BaseModel):
    id: int
    actor_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    description: str
    ip_address: Optional[str] = None
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

class AdminAccountLookupOut(BaseModel):
    account_number: str
    account_type: AccountType
    ifsc_code: str
    status: AccountStatus
    balance: Decimal
    created_at: datetime
    
    user_id: int
    full_name: str
    email: str
    kyc_status: Optional[KYCStatus] = None
