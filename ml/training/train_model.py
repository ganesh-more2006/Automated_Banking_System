import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import IsolationForest

# Direct module resolution for monorepo imports
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, "backend"))

from app.db.session import SessionLocal
from app.models.banking import Transaction
from ml.features.extraction import extract_transaction_features
from ml.preprocessing.preprocess import preprocess_features, FEATURE_COLUMNS

MODEL_DIR = os.path.join(ROOT_DIR, "ml", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

def load_data_source() -> pd.DataFrame:
    """
    Attempt to load real transactions from the database. 
    Fallback to generating a high-quality synthetic dataset if data is scarce.
    """
    db = SessionLocal()
    try:
        txs = db.query(Transaction).all()
        # Require a minimum of 50 transaction events for robust fitting
        if len(txs) >= 50:
            print(f"Loading {len(txs)} real transactions from banking database...")
            feature_records = []
            for tx in txs:
                acc = tx.sender_account or tx.receiver_account
                acc_num = acc.account_number if acc else "0000000000"
                tx_type = tx.transaction_type.value if tx.transaction_type else "DEPOSIT"
                
                feats = extract_transaction_features(
                    db,
                    account_number=acc_num,
                    amount=tx.amount,
                    tx_type=tx_type,
                    timestamp=tx.timestamp
                )
                feature_records.append(feats)
            return pd.DataFrame(feature_records)
    except Exception as e:
        print(f"Database query encountered error: {e}. Falling back to synthetic generator.")
    finally:
        db.close()

    # Generate Synthetic Dataset (Do NOT save to real banking tables!)
    print("Insufficient real transactions. Generating synthetic transaction profile dataset...")
    np.random.seed(42)
    records = []
    
    # 95% Normal profile events
    for _ in range(235):
        amount = np.random.exponential(scale=120.0) + 5.0
        hour = np.random.randint(6, 23)
        day = np.random.randint(0, 7)
        recent_1h = np.random.poisson(lam=0.1)
        recent_24h = np.random.poisson(lam=1.2)
        avg_30d = max(5.0, amount + np.random.normal(0, 10))
        deviation = abs(amount - avg_30d)
        
        records.append({
            "amount": amount,
            "log_amount": np.log1p(amount),
            "hour_of_day": float(hour),
            "day_of_week": float(day),
            "recent_tx_count_1h": float(recent_1h),
            "recent_tx_count_24h": float(recent_24h),
            "avg_tx_amount_30d": float(avg_30d),
            "amount_deviation": float(deviation),
            "failed_tx_count_24h": 0.0,
            "withdrawal_frequency_24h": float(recent_24h * 0.5),
            "transfer_frequency_24h": float(recent_24h * 0.4),
            "balance_to_tx_ratio": float(np.random.uniform(10.0, 200.0))
        })
        
    # 5% Anomalous events
    for _ in range(15):
        amount = np.random.uniform(5500.0, 12000.0)
        hour = np.random.choice([0, 1, 2, 3, 4]) # nighttime
        day = np.random.randint(0, 7)
        recent_1h = float(np.random.randint(4, 9)) # high rate
        recent_24h = float(np.random.randint(10, 18))
        avg_30d = np.random.uniform(20.0, 150.0)
        
        records.append({
            "amount": amount,
            "log_amount": np.log1p(amount),
            "hour_of_day": float(hour),
            "day_of_week": float(day),
            "recent_tx_count_1h": recent_1h,
            "recent_tx_count_24h": recent_24h,
            "avg_tx_amount_30d": avg_30d,
            "amount_deviation": abs(amount - avg_30d),
            "failed_tx_count_24h": float(np.random.randint(2, 4)),
            "withdrawal_frequency_24h": recent_24h * 0.5,
            "transfer_frequency_24h": recent_24h * 0.5,
            "balance_to_tx_ratio": float(np.random.uniform(0.02, 0.4))
        })
        
    df = pd.DataFrame(records)
    # Save synthetic file for traceability audits
    raw_path = os.path.join(ROOT_DIR, "ml", "data", "processed", "synthetic_training.csv")
    df.to_csv(raw_path, index=False)
    print(f"Synthetic training dataset saved to: {raw_path}")
    return df

def train_model():
    print("==================================================")
    print("      FRAUD DETECTION PIPELINE: TRAINING          ")
    print("==================================================")
    
    # 1. Load Data
    data = load_data_source()
    
    # 2. Preprocess & Scale
    scaled_df, scaler = preprocess_features(data, fit=True)
    
    # 3. Fit Isolation Forest Anomaly Detector
    contamination = 0.05
    model = IsolationForest(contamination=contamination, random_state=42)
    model.fit(scaled_df[FEATURE_COLUMNS])
    
    # 4. Basic Evaluation Anomaly Statistics
    predictions = model.predict(scaled_df[FEATURE_COLUMNS])
    decision_scores = model.decision_function(scaled_df[FEATURE_COLUMNS])
    
    anomalies_count = int((predictions == -1).sum())
    normal_count = int((predictions == 1).sum())
    total_records = len(data)
    anomaly_rate = (anomalies_count / total_records) * 100.0
    
    print("\nTraining Metrics Evaluation:")
    print(f"Total training instances: {total_records}")
    print(f"Anomalies detected: {anomalies_count} ({anomaly_rate:.2f}%)")
    print(f"Normal instances: {normal_count}")
    print(f"Anomaly Score Range: Min {decision_scores.min():.4f}, Max {decision_scores.max():.4f}, Mean {decision_scores.mean():.4f}")
    
    # 5. Save Artifacts
    model_version = f"IForest-v{datetime.now().strftime('%Y%m%d.%H%M')}"
    
    # joblib model paths
    model_path = os.path.join(MODEL_DIR, "fraud_model.joblib")
    scaler_path = os.path.join(MODEL_DIR, "scaler.joblib")
    
    # Store attributes inside model object
    model.model_version = model_version
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    # JSON metadata configuration
    metadata = {
        "model_name": "APEX local transaction fraud classifier",
        "algorithm": "Isolation Forest",
        "model_version": model_version,
        "training_date": datetime.utcnow().isoformat(),
        "training_record_count": total_records,
        "anomaly_contamination_rate": contamination,
        "feature_names": FEATURE_COLUMNS,
        "evaluation": {
            "total_records": total_records,
            "anomalous_records": anomalies_count,
            "anomaly_percentage": round(anomaly_rate, 2),
            "score_mean": float(decision_scores.mean())
        }
    }
    
    meta_path = os.path.join(MODEL_DIR, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\nSaved fraud_model.joblib and scaler.joblib to: {MODEL_DIR}")
    print(f"Saved model_metadata.json to: {meta_path}")
    print("==================================================")

if __name__ == "__main__":
    train_model()
