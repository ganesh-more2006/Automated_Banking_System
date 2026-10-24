from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.db.session import get_db
from app.models.user import User
from app.models.banking import Account, AccountStatus, TransactionType
from app.core.deps import get_current_user
from app.schemas.banking import (
    AccountCreate, 
    AccountOut, 
    TransactionRequest, 
    TransferRequest, 
    TransactionOut,
    StatementOut
)
from app.services import banking as banking_service
from app.services.audit import create_audit_log
from app.services.notification import create_notification, notify_admins
from app.core.security import verify_password

router = APIRouter()

@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    account_data: AccountCreate, 
    request: Request,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Open a new checking or savings account for the logged-in customer.
    """
    new_account = banking_service.create_bank_account(db, current_user.id, account_data)
    
    # 1. Audit Log
    create_audit_log(
        db,
        actor_id=current_user.id,
        action="ACCOUNT_CREATION",
        entity_type="ACCOUNT",
        entity_id=str(new_account.id),
        description=f"Opened new {new_account.account_type} account: {new_account.account_number}",
        ip_address=request.client.host
    )

    # 2. Notify Customer
    create_notification(
        db,
        user_id=current_user.id,
        type="ACCOUNT_CREATED",
        title="Account Opened Successfully",
        message=f"Your new {new_account.account_type} account {new_account.account_number} was successfully opened."
    )

    return new_account

@router.get("/accounts", response_model=List[AccountOut])
def get_my_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    List all active and inactive accounts owned by the authenticated customer.
    """
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return accounts

@router.post("/accounts/{account_number}/deposit", response_model=TransactionOut)
def deposit(
    account_number: str, 
    tx_request: TransactionRequest, 
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deposit funds into a bank account.
    """
    if not current_user.hashed_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction PIN has not been set yet."
        )
    if not verify_password(tx_request.pin, current_user.hashed_pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect transaction PIN."
        )

    # Look up account first to find user_id for notifications
    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    tx = banking_service.deposit_funds(
        db, 
        account_number=account_number, 
        amount=tx_request.amount, 
        description=tx_request.description
    )

    # 1. Audit Log
    create_audit_log(
        db,
        actor_id=account.user_id,
        action="DEPOSIT",
        entity_type="TRANSACTION",
        entity_id=str(tx.id),
        description=f"Processed deposit of ${tx.amount} into account {account_number}",
        ip_address=request.client.host
    )

    # 2. Notify Customer
    create_notification(
        db,
        user_id=account.user_id,
        type="DEPOSIT_SUCCESS",
        title="Deposit Processed",
        message=f"A deposit of ${tx.amount} was completed successfully for account {account_number}. Reference: {tx.reference_number}"
    )

    # 3. Check for Suspicious high value transaction
    if tx_request.amount > Decimal("5000.00"):
        create_notification(
            db,
            user_id=account.user_id,
            type="SUSPICIOUS_TRANSACTION",
            title="High Value Deposit Notification",
            message=f"Alert: A high-value deposit of ${tx.amount} was processed on account {account_number}. This is logged for audit verification."
        )
        notify_admins(
            db,
            type="SUSPICIOUS_TRANSACTION",
            title="Suspicious Deposit Warning",
            message=f"Security Alert: High-value deposit of ${tx.amount} detected on account {account_number} (User ID: {account.user_id})."
        )

    return tx

@router.post("/accounts/{account_number}/withdraw", response_model=TransactionOut)
@router.post("/accounts/{account_number}/withdrawal", response_model=TransactionOut)
def withdraw(
    account_number: str, 
    tx_request: TransactionRequest, 
    request: Request,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Withdraw funds from a bank account owned by the user.
    """
    if not current_user.hashed_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction PIN has not been set yet."
        )
    if not verify_password(tx_request.pin, current_user.hashed_pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect transaction PIN."
        )

    tx = banking_service.withdraw_funds(
        db, 
        user_id=current_user.id, 
        account_number=account_number, 
        amount=tx_request.amount, 
        description=tx_request.description
    )

    account = db.query(Account).filter(Account.account_number == account_number).first()

    # 1. Audit Log
    create_audit_log(
        db,
        actor_id=current_user.id,
        action="WITHDRAWAL",
        entity_type="TRANSACTION",
        entity_id=str(tx.id),
        description=f"Processed withdrawal of ${tx.amount} from account {account_number}",
        ip_address=request.client.host
    )

    # 2. Notify Customer
    create_notification(
        db,
        user_id=current_user.id,
        type="WITHDRAWAL_SUCCESS",
        title="Withdrawal Completed",
        message=f"A withdrawal of ${tx.amount} was completed successfully for account {account_number}. Reference: {tx.reference_number}"
    )

    # 3. Low balance notification
    if account and account.balance < Decimal("100.00"):
        create_notification(
            db,
            user_id=current_user.id,
            type="LOW_BALANCE",
            title="Low Balance Alert",
            message=f"Warning: Your account {account_number} balance has dropped to ${account.balance}."
        )

    # 4. Suspicious transaction warning
    if tx_request.amount > Decimal("5000.00"):
        create_notification(
            db,
            user_id=current_user.id,
            type="SUSPICIOUS_TRANSACTION",
            title="High Value Withdrawal Alert",
            message=f"Alert: A high-value withdrawal of ${tx.amount} was processed on account {account_number}. Logged for safety audit."
        )
        notify_admins(
            db,
            type="SUSPICIOUS_TRANSACTION",
            title="Suspicious Withdrawal Warning",
            message=f"Security Alert: High-value withdrawal of ${tx.amount} detected on account {account_number} (User ID: {current_user.id})."
        )

    return tx

@router.post("/accounts/{account_number}/transfer", response_model=TransactionOut)
def transfer(
    account_number: str, 
    tx_request: TransferRequest, 
    request: Request,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Transfer money to another account.
    """
    # Fetch receiver first to know their user_id
    receiver_acc = db.query(Account).filter(Account.account_number == tx_request.receiver_account_number).first()
    if not receiver_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient account not found.")

    tx = banking_service.transfer_funds(
        db,
        user_id=current_user.id,
        sender_account_number=account_number,
        receiver_account_number=tx_request.receiver_account_number,
        amount=tx_request.amount,
        description=tx_request.description
    )

    sender_acc = db.query(Account).filter(Account.account_number == account_number).first()

    # 1. Audit Log
    create_audit_log(
        db,
        actor_id=current_user.id,
        action="TRANSFER",
        entity_type="TRANSACTION",
        entity_id=str(tx.id),
        description=f"Transferred ${tx.amount} from {account_number} to {tx_request.receiver_account_number}",
        ip_address=request.client.host
    )

    # 2. Notify Sender
    create_notification(
        db,
        user_id=current_user.id,
        type="TRANSFER_SENT",
        title="Transfer Executed Successfully",
        message=f"Successfully transferred ${tx.amount} from account {account_number} to account {tx_request.receiver_account_number}. Reference: {tx.reference_number}"
    )

    # 3. Notify Recipient
    create_notification(
        db,
        user_id=receiver_acc.user_id,
        type="TRANSFER_RECEIVED",
        title="Funds Transfer Received",
        message=f"You have received a transfer of ${tx.amount} from account {account_number} into account {tx_request.receiver_account_number}. Reference: {tx.reference_number}"
    )

    # 4. Low balance check
    if sender_acc and sender_acc.balance < Decimal("100.00"):
        create_notification(
            db,
            user_id=current_user.id,
            type="LOW_BALANCE",
            title="Low Balance Warning",
            message=f"Warning: Your account {account_number} balance has dropped to ${sender_acc.balance}."
        )

    # 5. Suspicious check
    if tx_request.amount > Decimal("5000.00"):
        create_notification(
            db,
            user_id=current_user.id,
            type="SUSPICIOUS_TRANSACTION",
            title="High Value Transfer Alert",
            message=f"Alert: A high-value transfer of ${tx.amount} was sent from account {account_number}. Logged for safety verification."
        )
        notify_admins(
            db,
            type="SUSPICIOUS_TRANSACTION",
            title="Suspicious Transfer Detected",
            message=f"Security Alert: High-value transfer of ${tx.amount} sent from account {account_number} to {tx_request.receiver_account_number}."
        )

    return tx

@router.get("/accounts/{account_number}/transactions", response_model=List[TransactionOut])
def get_transactions(
    account_number: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Retrieve transaction history associated with a specific account number.
    """
    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    
    if account.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Account does not belong to you."
        )

    return banking_service.get_transaction_history(db, account.id)

@router.get("/accounts/{account_number}/statement", response_model=StatementOut)
def get_statement(
    account_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an account statement with totals and transaction logs.
    """
    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    
    if account.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Account does not belong to you."
        )

    txs = banking_service.get_transaction_history(db, account.id)
    
    # Calculate deposits/withdrawals totals
    total_dep = Decimal("0.00")
    total_wth = Decimal("0.00")
    
    for tx in txs:
        if tx.transaction_type == TransactionType.DEPOSIT:
            total_dep += tx.amount
        elif tx.transaction_type == TransactionType.WITHDRAWAL:
            total_wth += tx.amount
        elif tx.transaction_type == TransactionType.TRANSFER:
            # If current account is sender, it's a withdrawal/outflow
            if tx.sender_account_id == account.id:
                total_wth += tx.amount
            # If current account is receiver, it's a deposit/inflow
            elif tx.receiver_account_id == account.id:
                total_dep += tx.amount

    return StatementOut(
        account=AccountOut.model_validate(account),
        total_deposits=total_dep,
        total_withdrawals=total_wth,
        transactions=[TransactionOut.model_validate(t) for t in txs]
    )
