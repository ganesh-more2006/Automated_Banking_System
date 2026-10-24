import os
import sys
import joblib
import pandas as pd

# Setup path mapping
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.append(ROOT_DIR)

from ml.preprocessing.preprocess import preprocess_features, FEATURE_COLUMNS

def test_predictions():
    print("==================================================")
    print("      FRAUD DETECTION PIPELINE: PREDICTION TEST   ")
    print("==================================================")
    
    model_path = os.path.join(ROOT_DIR, "ml", "models", "fraud_model.joblib")
    scaler_path = os.path.join(ROOT_DIR, "ml", "models", "scaler.joblib")
    
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        print(f"Error: Model artifacts not found. Run training pipeline first.")
        return
        
    # Load model and scaler
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    # 1. Normal Test Case
    normal_features = {
        "amount": 75.0,
        "log_amount": 4.33,
        "hour_of_day": 14.0,
        "day_of_week": 2.0,
        "recent_tx_count_1h": 0.0,
        "recent_tx_count_24h": 1.0,
        "avg_tx_amount_30d": 80.0,
        "amount_deviation": 5.0,
        "failed_tx_count_24h": 0.0,
        "withdrawal_frequency_24h": 0.0,
        "transfer_frequency_24h": 0.0,
        "balance_to_tx_ratio": 15.0
    }
    
    # 2. Anomalous Test Case
    anomaly_features = {
        "amount": 9500.0,
        "log_amount": 9.15,
        "hour_of_day": 3.0, # nighttime
        "day_of_week": 0.0,
        "recent_tx_count_1h": 6.0, # high frequency
        "recent_tx_count_24h": 15.0,
        "avg_tx_amount_30d": 45.0, # huge deviation
        "amount_deviation": 9455.0,
        "failed_tx_count_24h": 3.0,
        "withdrawal_frequency_24h": 8.0,
        "transfer_frequency_24h": 7.0,
        "balance_to_tx_ratio": 0.05
    }
    
    # Run evaluations
    test_cases = [("Normal Transaction", normal_features), ("Suspicious/Anomalous Transaction", anomaly_features)]
    
    for label, case in test_cases:
        df = pd.DataFrame([case])
        scaled_df, _ = preprocess_features(df, scaler=scaler, fit=False)
        
        # Isolation forest returns 1 for inliers (normal) and -1 for outliers (anomalous)
        pred = model.predict(scaled_df[FEATURE_COLUMNS])[0]
        score = model.decision_function(scaled_df[FEATURE_COLUMNS])[0]
        
        is_anomaly = "ANOMALY (Outlier)" if pred == -1 else "NORMAL (Inlier)"
        print(f"\n[Evaluating {label}]:")
        print(f" -> Feature Data: Amount: ${case['amount']:.2f}, 1h Count: {case['recent_tx_count_1h']}, 24h Failures: {case['failed_tx_count_24h']}")
        print(f" -> Prediction: {is_anomaly}")
        print(f" -> Anomaly Decision Score: {score:.5f} (negative means anomalous)")
        print(f" -> Model Version: {getattr(model, 'model_version', 'v1.0.0')}")
        
    print("==================================================")

if __name__ == "__main__":
    test_predictions()
