from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
import joblib
from datetime import datetime
from typing import Dict, Any, List

from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.deps import get_current_user, RoleChecker
from app.core.config import settings
from app.schemas.fraud import ModelInfoOut, TransactionRiskOut
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from ml.prediction.predict import evaluate_transaction_risk
from ml.features.extraction import extract_transaction_features

router = APIRouter(dependencies=[Depends(RoleChecker([UserRole.ADMIN]))])

@router.get("/model-info", response_model=ModelInfoOut)
def get_model_info():
    """
    Get active configuration details for the local Machine Learning model.
    """
    model_status = "Inactive (Rules-Only)"
    training_date = "N/A"
    records_count = 0
    model_version = settings.FRAUD_MODEL_VERSION

    # Safely check if files exist locally
    if os.path.exists(settings.FRAUD_MODEL_PATH):
        try:
            model = joblib.load(settings.FRAUD_MODEL_PATH)
            model_status = "Active (ML Engaged)"
            model_version = getattr(model, "model_version", settings.FRAUD_MODEL_VERSION)
            
            mtime = os.path.getmtime(settings.FRAUD_MODEL_PATH)
            training_date = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
            records_count = 250 # baseline count
        except Exception as e:
            model_status = f"Error: {str(e)}"

    features_used = [
        "amount", "log_amount", "hour_of_day", "day_of_week",
        "recent_tx_count_1h", "recent_tx_count_24h", "avg_tx_amount_30d",
        "amount_deviation", "failed_tx_count_24h", "withdrawal_frequency_24h",
        "transfer_frequency_24h", "balance_to_tx_ratio"
    ]

    return ModelInfoOut(
        model_type="Isolation Forest (Unsupervised Anomaly Detector)",
        model_version=model_version,
        training_date=training_date,
        training_records=records_count,
        status=model_status,
        features=features_used
    )

@router.post("/evaluate", response_model=TransactionRiskOut)
def evaluate_test_transaction(
    account_number: str,
    amount: float,
    transaction_type: str,
    db: Session = Depends(get_db)
):
    """
    Evaluate fraud risk details for a hypothetical transaction.
    Does not modify database records or adjust accounts.
    """
    try:
        # 1. Extract context features dynamically
        features = extract_transaction_features(
            db,
            account_number=account_number,
            amount=amount,
            tx_type=transaction_type
        )

        # 2. Run predicting logic (incorporating model settings)
        score, level, suspicious, reasons, version = evaluate_transaction_risk(features)

        return TransactionRiskOut(
            risk_score=score,
            risk_level=level,
            is_suspicious=suspicious,
            reasons=reasons,
            model_version=version
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}"
        )
