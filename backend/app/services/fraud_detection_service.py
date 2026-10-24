from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Tuple, List
from decimal import Decimal

from app.models.banking import Transaction, TransactionStatus, Account
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from ml.features.extraction import extract_transaction_features
from ml.prediction.predict import evaluate_transaction_risk
from app.services.audit import create_audit_log
from app.services.notification import create_notification, notify_admins

def assess_and_flag_transaction(
    db: Session,
    transaction: Transaction,
    sender_account_number: Optional[str]
) -> Tuple[int, str, bool, List[str]]:
    """
    Perform real-time fraud risk assessment for a transaction, update database columns,
    and trigger corresponding security alerts and notifications.
    """
    # 1. Extract context features
    features = extract_transaction_features(
        db,
        account_number=sender_account_number or "0000000000",
        amount=transaction.amount,
        tx_type=transaction.transaction_type.value,
        timestamp=transaction.timestamp
    )

    # 2. Evaluate risk (ML + Rules)
    score, level, suspicious, reasons, model_version = evaluate_transaction_risk(features)

    # 3. Update Transaction columns
    transaction.risk_score = score
    transaction.risk_level = level
    transaction.is_suspicious = suspicious
    transaction.model_version = model_version
    transaction.detected_reasons = ", ".join(reasons) if reasons else ""
    transaction.evaluated_at = datetime.utcnow()

    # 4. Determine associated customer ID for notifications
    # Fallback to receiver if sender is None (like in cash deposits)
    user_id = None
    if transaction.sender_account:
        user_id = transaction.sender_account.user_id
    elif transaction.receiver_account:
        user_id = transaction.receiver_account.user_id

    # 5. Handle HIGH / CRITICAL alerts
    if level in ["HIGH", "CRITICAL"]:
        # Write Security Audit Log
        create_audit_log(
            db,
            actor_id=user_id,
            action="FRAUD_ALERT",
            entity_type="TRANSACTION",
            entity_id=str(transaction.id),
            description=f"Security Alert: Transaction {transaction.reference_number} flagged as {level} risk. Score: {score}. Reasons: {transaction.detected_reasons}",
            status="SUCCESS"
        )

        # Notify Admins
        notify_admins(
            db,
            type="SUSPICIOUS_TRANSACTION",
            title=f"High Risk Transaction Alert ({level})",
            message=f"Transaction {transaction.reference_number} flagged as {level} risk (Score: {score}). Amount: ${transaction.amount}. Reasons: {transaction.detected_reasons}."
        )

        # Notify Customer
        if user_id:
            create_notification(
                db,
                user_id=user_id,
                type="SUSPICIOUS_TRANSACTION",
                title="Security Warning: Unusual Activity Detected",
                message=f"Notice: A transaction on your account (Ref: {transaction.reference_number}) was flagged as {level} risk. Reasons: {transaction.detected_reasons}."
            )

    return score, level, suspicious, reasons
