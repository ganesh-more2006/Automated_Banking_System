import os
import joblib
import pandas as pd
from typing import Tuple, List, Dict, Any
from ml.preprocessing.preprocess import FEATURE_COLUMNS, preprocess_features

# Paths to persistent artifacts
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")

def evaluate_transaction_risk(
    features: Dict[str, float]
) -> Tuple[int, str, bool, List[str], str]:
    """
    Perform transaction risk assessment using both Rule-Based constraints and Machine Learning.
    Returns (risk_score, risk_level, is_suspicious, reasons, model_version)
    """
    reasons = []
    rules_score = 0
    model_version = "Rules-Only"

    # 1. Rule-Based Checks
    amount = features.get("amount", 0.0)
    recent_tx_1h = features.get("recent_tx_count_1h", 0.0)
    failed_24h = features.get("failed_tx_count_24h", 0.0)
    avg_30d = features.get("avg_tx_amount_30d", 0.0)
    deviation = features.get("amount_deviation", 0.0)

    if amount > 5000.00:
        rules_score += 35
        reasons.append("Unusually high transaction amount")

    if recent_tx_1h > 3:
        rules_score += 30
        reasons.append("Transaction frequency is unusually high")

    if failed_24h >= 2:
        rules_score += 25
        reasons.append("Multiple failed transactions detected")

    if avg_30d > 0 and deviation > (2.5 * avg_30d):
        rules_score += 25
        reasons.append("Transaction amount significantly differs from normal behavior")

    # 2. Machine Learning Anomaly Detection
    ml_score = 0
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            # Load models
            model = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            model_version = getattr(model, "model_version", "v1.0.0")

            # Format features for prediction
            input_df = pd.DataFrame([features])
            scaled_df, _ = preprocess_features(input_df, scaler=scaler, fit=False)
            
            # Isolation Forest decision_function
            # Decision score is in range [-0.5, 0.5], where negative values are anomalous.
            raw_anomaly_score = model.decision_function(scaled_df[FEATURE_COLUMNS])[0]
            
            # Normalize to 0-100 scale: anomaly is if raw_anomaly_score is negative
            # A score of 0.0 maps to ~50, negative scores map to > 50 (higher risk)
            anomaly_factor = -raw_anomaly_score # range roughly [-0.5, 0.5], higher means anomalous
            normalized_ml = (anomaly_factor + 0.3) / 0.6 * 100.0
            ml_score = int(min(max(normalized_ml, 0), 100))

            # If ML score is high anomaly but no rules fired, note anomalous behavior
            if ml_score >= 60:
                reasons.append("Account activity pattern is anomalous")
                
        except Exception as e:
            print(f"FAILED TO EXECUTE ML MODEL: {e}. Falling back to rule-based checks.")
            ml_score = 0

    # 3. Combine scores
    # If ML model is loaded, we take a weighted average or max.
    # We take the max of rules and ML score to ensure either can flag risk.
    final_score = max(rules_score, ml_score)
    final_score = min(max(final_score, 0), 100)

    # Classify Risk Level
    if final_score >= 80:
        risk_level = "CRITICAL"
        is_suspicious = True
    elif final_score >= 60:
        risk_level = "HIGH"
        is_suspicious = True
    elif final_score >= 30:
        risk_level = "MEDIUM"
        is_suspicious = False
    else:
        risk_level = "LOW"
        is_suspicious = False

    # Default reason if none detected but score was elevated
    if final_score > 0 and len(reasons) == 0:
        reasons.append("Unusual transaction features")

    return final_score, risk_level, is_suspicious, reasons, model_version
