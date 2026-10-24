from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from decimal import Decimal
from datetime import datetime, timedelta
import math
from typing import Dict, Any

from app.models.banking import Account, Transaction, TransactionType, TransactionStatus

def extract_transaction_features(
    db: Session,
    account_number: str,
    amount: Decimal,
    tx_type: str,
    timestamp: datetime = None
) -> Dict[str, float]:
    """
    Extract dynamic real-time features for fraud risk modeling based on database history.
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    # Find current account metadata
    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        # Fallback values if account doesn't exist yet
        return {
            "amount": float(amount),
            "log_amount": math.log1p(float(amount)),
            "hour_of_day": float(timestamp.hour),
            "day_of_week": float(timestamp.weekday()),
            "recent_tx_count_1h": 0.0,
            "recent_tx_count_24h": 0.0,
            "avg_tx_amount_30d": float(amount),
            "amount_deviation": 0.0,
            "failed_tx_count_24h": 0.0,
            "withdrawal_frequency_24h": 0.0,
            "transfer_frequency_24h": 0.0,
            "balance_to_tx_ratio": 1.0
        }

    # Calculations for time offsets
    one_hour_ago = timestamp - timedelta(hours=1)
    one_day_ago = timestamp - timedelta(days=1)
    thirty_days_ago = timestamp - timedelta(days=30)

    # 1. Recent Transaction Counts (1h & 24h)
    recent_tx_1h = db.query(func.count(Transaction.id)).filter(
        or_(Transaction.sender_account_id == account.id, Transaction.receiver_account_id == account.id),
        Transaction.timestamp >= one_hour_ago
    ).scalar() or 0

    recent_tx_24h = db.query(func.count(Transaction.id)).filter(
        or_(Transaction.sender_account_id == account.id, Transaction.receiver_account_id == account.id),
        Transaction.timestamp >= one_day_ago
    ).scalar() or 0

    # 2. Failed Transactions Count (24h)
    failed_tx_24h = db.query(func.count(Transaction.id)).filter(
        or_(Transaction.sender_account_id == account.id, Transaction.receiver_account_id == account.id),
        Transaction.status == TransactionStatus.FAILED,
        Transaction.timestamp >= one_day_ago
    ).scalar() or 0

    # 3. Withdrawal and Transfer Frequency (24h)
    withdrawal_24h = db.query(func.count(Transaction.id)).filter(
        Transaction.sender_account_id == account.id,
        Transaction.transaction_type == TransactionType.WITHDRAWAL,
        Transaction.timestamp >= one_day_ago
    ).scalar() or 0

    transfer_24h = db.query(func.count(Transaction.id)).filter(
        Transaction.sender_account_id == account.id,
        Transaction.transaction_type == TransactionType.TRANSFER,
        Transaction.timestamp >= one_day_ago
    ).scalar() or 0

    # 4. Average Transaction Amount (30d)
    avg_amt_30d = db.query(func.avg(Transaction.amount)).filter(
        or_(Transaction.sender_account_id == account.id, Transaction.receiver_account_id == account.id),
        Transaction.timestamp >= thirty_days_ago
    ).scalar()

    avg_amt = float(avg_amt_30d) if avg_amt_30d is not None else float(amount)

    # 5. Amount Deviation from normal
    amount_deviation = abs(float(amount) - avg_amt)

    # 6. Balance-to-transaction ratio
    balance_to_tx_ratio = float(account.balance) / float(amount) if amount > 0 else 1.0

    return {
        "amount": float(amount),
        "log_amount": math.log1p(float(amount)),
        "hour_of_day": float(timestamp.hour),
        "day_of_week": float(timestamp.weekday()),
        "recent_tx_count_1h": float(recent_tx_1h),
        "recent_tx_count_24h": float(recent_tx_24h),
        "avg_tx_amount_30d": avg_amt,
        "amount_deviation": amount_deviation,
        "failed_tx_count_24h": float(failed_tx_24h),
        "withdrawal_frequency_24h": float(withdrawal_24h),
        "transfer_frequency_24h": float(transfer_24h),
        "balance_to_tx_ratio": balance_to_tx_ratio
    }
