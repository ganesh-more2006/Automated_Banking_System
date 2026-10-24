import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class AccountType(str, enum.Enum):
    SAVINGS = "SAVINGS"
    CURRENT = "CURRENT"

class AccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    FROZEN = "FROZEN"

class TransactionType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    TRANSFER = "TRANSFER"
    RECEIVED_TRANSFER = "RECEIVED_TRANSFER"

class TransactionStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PENDING = "PENDING"

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(20), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_type = Column(Enum(AccountType), default=AccountType.SAVINGS, nullable=False)
    balance = Column(Numeric(15, 2), default=0.00, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    status = Column(Enum(AccountStatus), default=AccountStatus.ACTIVE, nullable=False)
    ifsc_code = Column(String(11), nullable=False, default="APEX0000123")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="accounts")
    sent_transactions = relationship(
        "Transaction",
        foreign_keys="[Transaction.sender_account_id]",
        back_populates="sender_account",
        cascade="all, delete-orphan"
    )
    received_transactions = relationship(
        "Transaction",
        foreign_keys="[Transaction.receiver_account_id]",
        back_populates="receiver_account",
        cascade="all, delete-orphan"
    )

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    sender_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    receiver_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.COMPLETED, nullable=False)
    reference_number = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Fraud risk assessment columns
    risk_score = Column(Integer, default=0, nullable=False)
    risk_level = Column(String(20), default="LOW", nullable=False)
    is_suspicious = Column(Boolean, default=False, nullable=False)
    model_version = Column(String(50), default="v1.0.0", nullable=False)
    detected_reasons = Column(String(500), nullable=True)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    sender_account = relationship(
        "Account",
        foreign_keys=[sender_account_id],
        back_populates="sent_transactions"
    )
    receiver_account = relationship(
        "Account",
        foreign_keys=[receiver_account_id],
        back_populates="received_transactions"
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    description = Column(String(500), nullable=False)
    ip_address = Column(String(50), nullable=True)
    status = Column(String(20), default="SUCCESS", nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    actor = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(String(500), nullable=False)
    read_status = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    user = relationship("User", back_populates="notifications")
