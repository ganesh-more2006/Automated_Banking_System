import random
import uuid
from decimal import Decimal
from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.banking import Account, Transaction, AccountType, AccountStatus, TransactionType, TransactionStatus
from app.schemas.banking import AccountCreate

def generate_account_number(db: Session) -> str:
    """
    Generate a unique 10-digit account number.
    """
    while True:
        acc_num = "".join([str(random.randint(0, 9)) for _ in range(10)])
        existing = db.query(Account).filter(Account.account_number == acc_num).first()
        if not existing:
            return acc_num

def create_bank_account(db: Session, user_id: int, account_data: AccountCreate) -> Account:
    """
    Provision a new active bank account for the user.
    """
    acc_num = generate_account_number(db)
    try:
        new_account = Account(
            account_number=acc_num,
            user_id=user_id,
            account_type=account_data.account_type,
            balance=Decimal("0.00"),
            currency=account_data.currency,
            ifsc_code=account_data.ifsc_code,
            status=AccountStatus.ACTIVE
        )
        db.add(new_account)
        db.commit()
        db.refresh(new_account)
        return new_account
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create bank account: {str(e)}"
        )

def deposit_funds(db: Session, account_number: str, amount: Decimal, description: str = None) -> Transaction:
    """
    Atomically deposit funds into an active account.
    """
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deposit amount must be greater than zero."
        )

    # Use with_for_update to lock the row and prevent concurrent race conditions
    account = (
        db.query(Account)
        .filter(Account.account_number == account_number)
        .with_for_update()
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    if account.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive. Deposits are disabled."
        )

    try:
        account.balance += amount
        
        # Generate unique reference code
        ref_num = f"DEP-{uuid.uuid4().hex[:12].upper()}"
        
        transaction = Transaction(
            receiver_account_id=account.id,
            amount=amount,
            transaction_type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED,
            reference_number=ref_num,
            description=description or "Cash Deposit"
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deposit processing failed: {str(e)}"
        )

def withdraw_funds(db: Session, user_id: int, account_number: str, amount: Decimal, description: str = None) -> Transaction:
    """
    Atomically withdraw funds from an active account.
    """
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal amount must be greater than zero."
        )

    account = (
        db.query(Account)
        .filter(Account.account_number == account_number)
        .with_for_update()
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    if account.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Account does not belong to you."
        )

    if account.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive. Withdrawals are disabled."
        )

    if account.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient funds: Account balance is lower than withdrawal amount."
        )

    try:
        account.balance -= amount
        
        ref_num = f"WTH-{uuid.uuid4().hex[:12].upper()}"
        
        transaction = Transaction(
            sender_account_id=account.id,
            amount=amount,
            transaction_type=TransactionType.WITHDRAWAL,
            status=TransactionStatus.COMPLETED,
            reference_number=ref_num,
            description=description or "Cash Withdrawal"
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Withdrawal processing failed: {str(e)}"
        )

def transfer_funds(
    db: Session, 
    user_id: int, 
    sender_account_number: str, 
    receiver_account_number: str, 
    amount: Decimal, 
    description: str = None
) -> Transaction:
    """
    Atomically transfer funds between two accounts.
    Locks rows in a consistent order to prevent database deadlocks.
    """
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer amount must be greater than zero."
        )

    if sender_account_number == receiver_account_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer rejected: Sender and receiver accounts cannot be the same."
        )

    # Consistent locking order to prevent deadlocks in high concurrency environments
    if sender_account_number < receiver_account_number:
        sender = db.query(Account).filter(Account.account_number == sender_account_number).with_for_update().first()
        receiver = db.query(Account).filter(Account.account_number == receiver_account_number).with_for_update().first()
    else:
        receiver = db.query(Account).filter(Account.account_number == receiver_account_number).with_for_update().first()
        sender = db.query(Account).filter(Account.account_number == sender_account_number).with_for_update().first()

    if not sender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sender account not found."
        )

    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver account not found."
        )

    if sender.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Sender account does not belong to you."
        )

    if sender.status != AccountStatus.ACTIVE or receiver.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer rejected: One of the accounts is inactive."
        )

    if sender.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient funds: Sender balance is lower than transfer amount."
        )

    try:
        # Perform atomic balance adjustments
        sender.balance -= amount
        receiver.balance += amount
        
        ref_num = f"TRF-{uuid.uuid4().hex[:12].upper()}"
        
        transaction = Transaction(
            sender_account_id=sender.id,
            receiver_account_id=receiver.id,
            amount=amount,
            transaction_type=TransactionType.TRANSFER,
            status=TransactionStatus.COMPLETED,
            reference_number=ref_num,
            description=description or f"Transfer to {receiver_account_number}"
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transfer processing failed: {str(e)}"
        )

def get_transaction_history(db: Session, account_id: int) -> List[Transaction]:
    """
    Retrieve all transactions associated with an account (sent or received).
    Ordered by timestamp descending (newest first).
    """
    return (
        db.query(Transaction)
        .filter(
            or_(
                Transaction.sender_account_id == account_id,
                Transaction.receiver_account_id == account_id
            )
        )
        .order_by(Transaction.timestamp.desc())
        .all()
    )
