import os
import sys
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session

# Setup python path to import app correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend"))

from app.db.session import SessionLocal
from app.models.banking import Transaction
from ml.features.extraction import extract_transaction_features
from ml.preprocessing.preprocess import preprocess_features, FEATURE_COLUMNS

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

def generate_synthetic_data(count: int = 200) -> pd.DataFrame:
    """
    Generate synthetic transactions representing typical customer banking behavior
    along with small contamination of anomalies for Isolation Forest training.
    """
    print(f"Generating {count} synthetic transactions for baseline training...")
    np.random.seed(42)
    records = []
    
    # 95% Normal transactions
    normal_count = int(count * 0.95)
    for _ in range(normal_count):
        amount = np.random.exponential(scale=150.0) + 10.0 # mostly small amounts
        hour = np.random.choice(range(24))
        day = np.random.choice(range(7))
        recent_1h = np.random.poisson(lam=0.2)
        recent_24h = np.random.poisson(lam=1.5)
        avg_30d = amount + np.random.normal(0, 15)
        avg_30d = max(10.0, avg_30d)
        
        records.append({
            "amount": amount,
            "log_amount": np.log1p(amount),
            "hour_of_day": float(hour),
            "day_of_week": float(day),
            "recent_tx_count_1h": float(recent_1h),
            "recent_tx_count_24h": float(recent_24h),
            "avg_tx_amount_30d": float(avg_30d),
            "amount_deviation": abs(amount - avg_30d),
            "failed_tx_count_24h": 0.0,
            "withdrawal_frequency_24h": float(recent_24h * 0.4),
            "transfer_frequency_24h": float(recent_24h * 0.3),
            "balance_to_tx_ratio": float(np.random.uniform(5.0, 100.0))
        })
        
    # 5% Anomalous transactions
    anom_count = count - normal_count
    for _ in range(anom_count):
        amount = np.random.uniform(6000.0, 15000.0) # very high amount
        hour = np.random.choice([2, 3, 4]) # nighttime anomalies
        day = np.random.choice(range(7))
        recent_1h = float(np.random.randint(4, 10)) # high frequency
        recent_24h = float(np.random.randint(10, 20))
        avg_30d = np.random.uniform(50.0, 200.0) # low normal average
        
        records.append({
            "amount": amount,
            "log_amount": np.log1p(amount),
            "hour_of_day": float(hour),
            "day_of_week": float(day),
            "recent_tx_count_1h": recent_1h,
            "recent_tx_count_24h": recent_24h,
            "avg_tx_amount_30d": avg_30d,
            "amount_deviation": abs(amount - avg_30d),
            "failed_tx_count_24h": float(np.random.randint(2, 5)),
            "withdrawal_frequency_24h": recent_24h * 0.5,
            "transfer_frequency_24h": recent_24h * 0.5,
            "balance_to_tx_ratio": float(np.random.uniform(0.01, 0.5)) # balance depleted
        })
        
    return pd.DataFrame(records)

def train_model():
    print("==================================================")
    print("      TRAINING ISOLATION FOREST MODEL             ")
    print("==================================================")
    
    db = SessionLocal()
    records_df = None
    
    try:
        # Query existing transactions in SQLite database
        txs = db.query(Transaction).all()
        if len(txs) >= 50:
            print(f"Found {len(txs)} transactions in database. Generating training features...")
            feature_list = []
            for tx in txs:
                # Find sender account number to extract context features
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
                feature_list.append(feats)
            records_df = pd.DataFrame(feature_list)
        else:
            print(f"Insufficient transactions in DB ({len(txs)}). Creating baseline synthetic profile data...")
            records_df = generate_synthetic_data(250)
            
    except Exception as e:
        print(f"Error querying database: {e}. Defaulting to synthetic data.")
        records_df = generate_synthetic_data(250)
    finally:
        db.close()

    # Preprocess and scale features
    scaled_df, scaler = preprocess_features(records_df, fit=True)
    
    # Train Isolation Forest
    # Contamination defines expected proportion of anomalies in dataset
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(scaled_df[FEATURE_COLUMNS])
    
    # Set model metadata version
    model.model_version = f"IForest-v{datetime.now().strftime('%Y%m%d.%H%M')}"
    
    # Save artifacts
    model_path = os.path.join(MODEL_DIR, "isolation_forest.joblib")
    scaler_path = os.path.join(MODEL_DIR, "scaler.joblib")
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"\nModel fitted successfully!")
    print(f"Model version saved: {model.model_version}")
    print(f"Model path: {model_path}")
    print(f"Scaler path: {scaler_path}")
    
    # Simple evaluations
    preds = model.predict(scaled_df[FEATURE_COLUMNS])
    anomalies_detected = (preds == -1).sum()
    print(f"Total records trained: {len(scaled_df)}")
    print(f"Anomalous records isolated: {anomalies_detected} ({anomalies_detected/len(scaled_df)*100:.1f}%)")
    print("==================================================")

if __name__ == "__main__":
    train_model()
