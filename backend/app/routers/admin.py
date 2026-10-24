from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from decimal import Decimal
from datetime import datetime, time, timezone
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.models.user import User, UserRole, CustomerProfile, KYCStatus, ProfileStatus
from app.models.kyc import KYC
from app.models.banking import Account, Transaction, AccountStatus, TransactionType, TransactionStatus, AuditLog, Notification
from app.core.deps import get_current_user, RoleChecker
from app.schemas.auth import UserOut
from app.schemas.banking import AccountOut, TransactionOut
from app.schemas.kyc import KYCOut, KYCReject
from app.schemas.admin import (
    KYCUpdate, 
    AccountStatusUpdate, 
    AdminStats, 
    KPICards, 
    MonthlyVolume, 
    TypeDistribution, 
    AuditLogOut,
    ReversalRequest
)
from app.services.audit import create_audit_log
from app.services.notification import create_notification, notify_admins
from app.services import banking as banking_service

router = APIRouter(dependencies=[Depends(RoleChecker([UserRole.ADMIN]))])

@router.get("/stats", response_model=AdminStats)
def get_admin_stats(db: Session = Depends(get_db)):
    """
    Calculate and retrieve statistics, KPIs, and chart data for the Admin Dashboard.
    """
    total_cust = db.query(func.count(User.id)).filter(User.role == UserRole.CUSTOMER).scalar() or 0
    total_acc = db.query(func.count(Account.id)).scalar() or 0

    total_dep = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == TransactionType.DEPOSIT,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or Decimal("0.00")

    total_wth = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or Decimal("0.00")

    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    today_tx = db.query(func.count(Transaction.id)).filter(
        Transaction.timestamp >= today_start
    ).scalar() or 0

    suspicious_tx = db.query(func.count(Transaction.id)).filter(
        or_(
            Transaction.amount > Decimal("5000.00"),
            Transaction.status == TransactionStatus.FAILED
        )
    ).scalar() or 0

    total_bal = db.query(func.sum(Account.balance)).scalar() or Decimal("0.00")
    total_trf = db.query(func.sum(Transaction.amount)).filter(
        Transaction.transaction_type == TransactionType.TRANSFER,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or Decimal("0.00")

    kpis = KPICards(
        total_customers=total_cust,
        total_accounts=total_acc,
        total_deposits=total_dep,
        total_withdrawals=total_wth,
        total_transfers=total_trf,
        total_balance=total_bal,
        today_transactions=today_tx,
        suspicious_transactions=suspicious_tx
    )

    monthly_data = [
        MonthlyVolume(
            month="Aug",
            deposits=total_dep,
            withdrawals=total_wth,
            transfers=db.query(func.sum(Transaction.amount)).filter(
                Transaction.transaction_type == TransactionType.TRANSFER,
                Transaction.status == TransactionStatus.COMPLETED
            ).scalar() or Decimal("0.00")
        )
    ]

    types = [TransactionType.DEPOSIT, TransactionType.WITHDRAWAL, TransactionType.TRANSFER]
    type_dist = []
    for t in types:
        count = db.query(func.count(Transaction.id)).filter(Transaction.transaction_type == t).scalar() or 0
        type_dist.append(TypeDistribution(name=t.value, value=count))

    return AdminStats(
        kpis=kpis,
        monthly_volume=monthly_data,
        type_distribution=type_dist
    )

@router.get("/users")
def list_customers(
    search: str = None, 
    kyc: str = None, 
    status: str = None, 
    db: Session = Depends(get_db)
):
    """
    List all customer users with complete management details (accounts count, total balance, last login).
    """
    query = db.query(User).filter(User.role == UserRole.CUSTOMER)
    
    if search:
        search_term = f"%{search}%"
        query = query.join(CustomerProfile).filter(
            or_(
                User.email.ilike(search_term),
                CustomerProfile.full_name.ilike(search_term),
                CustomerProfile.phone.ilike(search_term),
                User.id == search
            )
        )
        
    if kyc:
        query = query.join(CustomerProfile).filter(CustomerProfile.kyc_status == kyc)

    if status:
        active_val = (status == "ACTIVE")
        query = query.filter(User.is_active == active_val)

    customers_list = query.all()
    results = []
    
    for cust in customers_list:
        profile = cust.profile or {}
        # Fetch counts and balances
        accounts = db.query(Account).filter(Account.user_id == cust.id).all()
        num_accounts = len(accounts)
        total_balance = sum(acc.balance for acc in accounts)

        # Get last login timestamp from AuditLogs
        last_login_log = db.query(AuditLog).filter(
            AuditLog.actor_id == cust.id,
            AuditLog.action == "LOGIN"
        ).order_by(desc(AuditLog.timestamp)).first()
        
        last_login = last_login_log.timestamp if last_login_log else None

        results.append({
            "id": cust.id,
            "email": cust.email,
            "role": cust.role,
            "is_active": cust.is_active,
            "created_at": cust.created_at,
            "full_name": getattr(profile, "full_name", "N/A"),
            "phone": getattr(profile, "phone", "N/A"),
            "date_of_birth": getattr(profile, "date_of_birth", "N/A"),
            "address": getattr(profile, "address", "N/A"),
            "pan_kyc_identifier": getattr(profile, "pan_kyc_identifier", "N/A"),
            "kyc_status": getattr(profile, "kyc_status", KYCStatus.PENDING),
            "profile_status": getattr(profile, "profile_status", ProfileStatus.ACTIVE),
            "num_accounts": num_accounts,
            "total_balance": total_balance,
            "last_login": last_login
        })
        
    return results

@router.get("/accounts")
def list_accounts(
    search: str = None,
    account_type: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    """
    List all bank accounts, linking customer name and email.
    """
    query = db.query(Account)
    
    if search:
        query = query.filter(Account.account_number.like(f"%{search}%"))
        
    if account_type:
        query = query.filter(Account.account_type == account_type)
        
    if status:
        query = query.filter(Account.status == status)

    accounts_list = query.all()
    results = []
    
    for acc in accounts_list:
        owner = db.query(User).filter(User.id == acc.user_id).first()
        profile = owner.profile if owner else None
        
        results.append({
            "account_number": acc.account_number,
            "user_id": acc.user_id,
            "customer_name": profile.full_name if profile else "System",
            "customer_email": owner.email if owner else "system@apex.com",
            "account_type": acc.account_type,
            "balance": acc.balance,
            "currency": acc.currency,
            "status": acc.status,
            "ifsc_code": acc.ifsc_code,
            "kyc_status": profile.kyc_status if profile else "APPROVED",
            "created_at": acc.created_at
        })
        
    return results

@router.get("/transactions")
def list_transactions(
    type: str = None,
    status: str = None,
    suspicious: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all transactions with advanced search and filters.
    """
    query = db.query(Transaction)
    
    if type:
        query = query.filter(Transaction.transaction_type == type)
        
    if status:
        query = query.filter(Transaction.status == status)
        
    if suspicious:
        query = query.filter(
            or_(
                Transaction.amount > Decimal("5000.00"),
                Transaction.status == TransactionStatus.FAILED
            )
        )

    txs_list = query.order_by(desc(Transaction.timestamp)).all()
    results = []
    
    for tx in txs_list:
        # Find customer associated with transaction
        acc_id = tx.sender_account_id or tx.receiver_account_id
        acc = db.query(Account).filter(Account.id == acc_id).first() if acc_id else None
        owner = db.query(User).filter(User.id == acc.user_id).first() if acc else None
        profile = owner.profile if owner else None
        
        # Determine sender/receiver account numbers
        sender_acc = db.query(Account).filter(Account.id == tx.sender_account_id).first()
        receiver_acc = db.query(Account).filter(Account.id == tx.receiver_account_id).first()

        results.append({
            "id": tx.id,
            "reference_number": tx.reference_number,
            "sender_account": sender_acc.account_number if sender_acc else None,
            "receiver_account": receiver_acc.account_number if receiver_acc else None,
            "customer_name": profile.full_name if profile else "System",
            "transaction_type": tx.transaction_type,
            "amount": tx.amount,
            "status": tx.status,
            "timestamp": tx.timestamp,
            "description": tx.description,
            "risk_level": "HIGH" if tx.amount > Decimal("5000.00") else "NORMAL"
        })
        
    return results

@router.post("/transactions/{reference_number}/reverse")
def reverse_transaction(
    reference_number: str, 
    payload: ReversalRequest, 
    request: Request,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Reverse a completed transaction safely by creating a countervailing transaction.
    """
    tx = db.query(Transaction).filter(
        Transaction.reference_number == reference_number,
        Transaction.status == TransactionStatus.COMPLETED
    ).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Completed transaction not found.")

    # Prevent double reversal
    already_reversed = db.query(Transaction).filter(
        Transaction.description.like(f"%Reversal of {reference_number}%"),
        Transaction.status == TransactionStatus.COMPLETED
    ).first()
    if already_reversed:
        raise HTTPException(status_code=400, detail="Transaction has already been reversed.")

    try:
        # 1. Reverse Deposit (perform a withdrawal)
        if tx.transaction_type == TransactionType.DEPOSIT:
            acc = db.query(Account).filter(Account.id == tx.receiver_account_id).with_for_update().first()
            if not acc:
                raise HTTPException(status_code=404, detail="Account not found.")
            if acc.balance < tx.amount:
                raise HTTPException(status_code=400, detail="Reversal rejected: Insufficient funds in account to execute refund.")
            
            acc.balance -= tx.amount
            new_ref = f"REV-{uuid.uuid4().hex[:12].upper()}"
            rev_tx = Transaction(
                sender_account_id=acc.id,
                amount=tx.amount,
                transaction_type=TransactionType.WITHDRAWAL,
                status=TransactionStatus.COMPLETED,
                reference_number=new_ref,
                description=f"Reversal of {reference_number}. Reason: {payload.reason}"
            )
            db.add(rev_tx)
            db.flush()

            # Notify user
            create_notification(
                db, 
                user_id=acc.user_id, 
                type="ACCOUNT_UNFROZEN", # general administrative alert
                title="Account Balance Adjusted", 
                message=f"Admin processed a reversal adjustments refund of ${tx.amount} on account {acc.account_number}."
            )

        # 2. Reverse Withdrawal (perform a deposit)
        elif tx.transaction_type == TransactionType.WITHDRAWAL:
            acc = db.query(Account).filter(Account.id == tx.sender_account_id).with_for_update().first()
            if not acc:
                raise HTTPException(status_code=404, detail="Account not found.")
            
            acc.balance += tx.amount
            new_ref = f"REV-{uuid.uuid4().hex[:12].upper()}"
            rev_tx = Transaction(
                receiver_account_id=acc.id,
                amount=tx.amount,
                transaction_type=TransactionType.DEPOSIT,
                status=TransactionStatus.COMPLETED,
                reference_number=new_ref,
                description=f"Reversal of {reference_number}. Reason: {payload.reason}"
            )
            db.add(rev_tx)
            db.flush()

            # Notify user
            create_notification(
                db, 
                user_id=acc.user_id, 
                type="DEPOSIT_SUCCESS", 
                title="Reversal Credit Applied", 
                message=f"Admin applied adjustment credit of ${tx.amount} to account {acc.account_number}."
            )

        # 3. Reverse Transfer (perform transfer from receiver back to sender)
        elif tx.transaction_type == TransactionType.TRANSFER:
            # Sender of original transfer is receiver of reversal
            orig_sender = db.query(Account).filter(Account.id == tx.sender_account_id).with_for_update().first()
            # Receiver of original transfer is sender of reversal
            orig_receiver = db.query(Account).filter(Account.id == tx.receiver_account_id).with_for_update().first()

            if not orig_sender or not orig_receiver:
                raise HTTPException(status_code=404, detail="One of the original transfer accounts is missing.")

            if orig_receiver.balance < tx.amount:
                raise HTTPException(status_code=400, detail="Reversal rejected: Recipient account has insufficient funds to reverse.")

            orig_receiver.balance -= tx.amount
            orig_sender.balance += tx.amount

            new_ref = f"REV-{uuid.uuid4().hex[:12].upper()}"
            rev_tx = Transaction(
                sender_account_id=orig_receiver.id,
                receiver_account_id=orig_sender.id,
                amount=tx.amount,
                transaction_type=TransactionType.TRANSFER,
                status=TransactionStatus.COMPLETED,
                reference_number=new_ref,
                description=f"Reversal of {reference_number}. Reason: {payload.reason}"
            )
            db.add(rev_tx)
            db.flush()

            # Notify both parties
            create_notification(
                db, 
                user_id=orig_sender.user_id, 
                type="TRANSFER_RECEIVED", 
                title="Transfer Reversed (Refund Recieved)", 
                message=f"Your transfer of ${tx.amount} to {orig_receiver.account_number} has been reversed. Credit applied."
            )
            create_notification(
                db, 
                user_id=orig_receiver.user_id, 
                type="TRANSFER_SENT", 
                title="Transfer Reversed (Debited)", 
                message=f"Administrative reversal applied: ${tx.amount} has been debited and returned to {orig_sender.account_number}."
            )

        else:
            raise HTTPException(status_code=400, detail="Unsupported transaction type for reversal.")

        db.commit()

        # Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="REVERSAL",
            entity_type="TRANSACTION",
            entity_id=str(tx.id),
            description=f"Reversed transaction {reference_number} for reason: {payload.reason}",
            ip_address=request.client.host
        )

        return {"status": "success", "message": f"Successfully reversed transaction {reference_number}."}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reversal failed: {str(e)}")

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    action: str = None, 
    actor_id: int = None, 
    db: Session = Depends(get_db)
):
    """
    Query audit logs catalog with search filters.
    """
    query = db.query(AuditLog)
    
    if action:
        query = query.filter(AuditLog.action == action)
        
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)

    return query.order_by(desc(AuditLog.timestamp)).all()

@router.put("/users/{user_id}/kyc", response_model=UserOut)
def update_user_kyc(
    user_id: int, 
    payload: KYCUpdate, 
    request: Request,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Update a customer's KYC status, profile status, and trigger notifications and audit logs.
    """
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.CUSTOMER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")
        
    if not user.profile:
        raise HTTPException(status_code=400, detail="Customer profile is not initialized.")
        
    try:
        user.profile.kyc_status = payload.kyc_status
        if payload.profile_status:
            user.profile.profile_status = payload.profile_status
            
        db.commit()
        db.refresh(user)

        # 1. Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="KYC_UPDATE",
            entity_type="USER",
            entity_id=str(user.id),
            description=f"Updated KYC status for {user.email} to {payload.kyc_status}. Reason: {payload.rejection_reason or 'None'}",
            ip_address=request.client.host
        )

        # 2. Notify Customer
        notif_msg = f"Your KYC profile has been {payload.kyc_status}."
        if payload.kyc_status == KYCStatus.REJECTED and payload.rejection_reason:
            notif_msg += f" Reason: {payload.rejection_reason}"

        create_notification(
            db,
            user_id=user.id,
            type="KYC_APPROVED" if payload.kyc_status == KYCStatus.APPROVED else "KYC_REJECTED",
            title=f"KYC Verification {payload.kyc_status.value}",
            message=notif_msg
        )

        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/accounts/{account_number}/status")
def update_account_status(
    account_number: str, 
    payload: AccountStatusUpdate, 
    request: Request,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Freeze/Unfreeze or activate/deactivate a bank account, writing audits & notifications.
    """
    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
        
    try:
        old_status = account.status
        account.status = payload.status
        db.commit()
        db.refresh(account)

        # 1. Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="ACCOUNT_STATUS_CHANGE",
            entity_type="ACCOUNT",
            entity_id=str(account.id),
            description=f"Changed account {account_number} status from {old_status} to {payload.status}. Reason: {payload.reason or 'None'}",
            ip_address=request.client.host
        )

        # 2. Notify Customer
        notif_type = "ACCOUNT_FROZEN" if payload.status == AccountStatus.FROZEN else "ACCOUNT_UNFROZEN"
        create_notification(
            db,
            user_id=account.user_id,
            type=notif_type,
            title=f"Account Status Changed: {payload.status.value}",
            message=f"Notice: The status of your bank account {account_number} has been updated to {payload.status.value}."
        )

        return {
            "status": "success",
            "message": f"Successfully updated account status to {payload.status}."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}/status")
def update_customer_status(
    user_id: int,
    payload: AccountStatusUpdate, # status can map to ACTIVE or SUSPENDED
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Activate/Deactivate/Suspend a customer user account.
    """
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.CUSTOMER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found.")

    try:
        old_val = user.is_active
        user.is_active = (payload.status == AccountStatus.ACTIVE)
        if user.profile:
            user.profile.profile_status = ProfileStatus.ACTIVE if user.is_active else ProfileStatus.SUSPENDED
        
        db.commit()
        db.refresh(user)

        # 1. Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="USER_STATUS_CHANGE",
            entity_type="USER",
            entity_id=str(user.id),
            description=f"Toggled user {user.email} is_active to {user.is_active}. Reason: {payload.reason or 'None'}",
            ip_address=request.client.host
        )

        # 2. Notify Customer
        notif_msg = "Your login credentials have been reactivated." if user.is_active else "Your login credentials have been suspended."
        create_notification(
            db,
            user_id=user.id,
            type="ACCOUNT_UNFROZEN" if user.is_active else "ACCOUNT_FROZEN",
            title="Profile Security Status Changed",
            message=notif_msg
        )

        return {
            "status": "success",
            "message": f"Successfully updated customer login activation to {user.is_active}."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kyc", response_model=List[KYCOut])
def get_all_kyc(
    status_filter: Optional[KYCStatus] = None,
    db: Session = Depends(get_db)
):
    """
    List all customer KYC submissions.
    """
    q = db.query(KYC)
    if status_filter:
        q = q.filter(KYC.status == status_filter)
    return q.order_by(desc(KYC.submitted_at)).all()

@router.get("/kyc/{kyc_id}", response_model=KYCOut)
def get_kyc_details(
    kyc_id: int,
    db: Session = Depends(get_db)
):
    """
    Get specific customer KYC submission details.
    """
    kyc_rec = db.query(KYC).filter(KYC.id == kyc_id).first()
    if not kyc_rec:
        raise HTTPException(status_code=404, detail="KYC submission not found.")
    return kyc_rec

@router.post("/kyc/{kyc_id}/approve", response_model=KYCOut)
def approve_kyc(
    kyc_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a pending KYC submission and update user customer profile status.
    """
    kyc_rec = db.query(KYC).filter(KYC.id == kyc_id).first()
    if not kyc_rec:
        raise HTTPException(status_code=404, detail="KYC submission not found.")
        
    try:
        kyc_rec.status = KYCStatus.APPROVED
        kyc_rec.reviewed_at = datetime.utcnow()
        kyc_rec.reviewed_by = current_user.id
        kyc_rec.rejection_reason = None
        
        # Sync to customer profile
        cust_profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == kyc_rec.user_id).first()
        if cust_profile:
            cust_profile.kyc_status = KYCStatus.APPROVED
            db.add(cust_profile)
            
        db.add(kyc_rec)
        db.commit()
        db.refresh(kyc_rec)
        
        # Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="KYC_APPROVED",
            entity_type="KYC",
            entity_id=str(kyc_rec.id),
            description=f"Approved KYC submission for user {kyc_rec.user_id}.",
            ip_address=request.client.host
        )
        
        # Notification to customer
        create_notification(
            db,
            user_id=kyc_rec.user_id,
            type="KYC_STATUS",
            title="KYC Verified Successfully",
            message="Your KYC verification request has been approved. Your profile is now fully verified."
        )
        
        return kyc_rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/kyc/{kyc_id}/reject", response_model=KYCOut)
def reject_kyc(
    kyc_id: int,
    payload: KYCReject,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a pending KYC submission with a specified reason.
    """
    kyc_rec = db.query(KYC).filter(KYC.id == kyc_id).first()
    if not kyc_rec:
        raise HTTPException(status_code=404, detail="KYC submission not found.")
        
    try:
        kyc_rec.status = KYCStatus.REJECTED
        kyc_rec.reviewed_at = datetime.utcnow()
        kyc_rec.reviewed_by = current_user.id
        kyc_rec.rejection_reason = payload.rejection_reason
        
        # Sync to customer profile
        cust_profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == kyc_rec.user_id).first()
        if cust_profile:
            cust_profile.kyc_status = KYCStatus.REJECTED
            db.add(cust_profile)
            
        db.add(kyc_rec)
        db.commit()
        db.refresh(kyc_rec)
        
        # Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="KYC_REJECTED",
            entity_type="KYC",
            entity_id=str(kyc_rec.id),
            description=f"Rejected KYC submission for user {kyc_rec.user_id}. Reason: {payload.rejection_reason}",
            ip_address=request.client.host
        )
        
        # Notification to customer
        create_notification(
            db,
            user_id=kyc_rec.user_id,
            type="KYC_STATUS",
            title="KYC Verification Rejected",
            message=f"Your KYC verification request was rejected. Reason: {payload.rejection_reason}"
        )
        
        return kyc_rec
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
