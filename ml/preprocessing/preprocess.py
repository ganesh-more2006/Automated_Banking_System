import os
import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler
from typing import List, Tuple

# Scaled features mapping list
FEATURE_COLUMNS = [
    "amount",
    "log_amount",
    "hour_of_day",
    "day_of_week",
    "recent_tx_count_1h",
    "recent_tx_count_24h",
    "avg_tx_amount_30d",
    "amount_deviation",
    "failed_tx_count_24h",
    "withdrawal_frequency_24h",
    "transfer_frequency_24h",
    "balance_to_tx_ratio"
]

def preprocess_features(df: pd.DataFrame, scaler: StandardScaler = None, fit: bool = False) -> Tuple[pd.DataFrame, StandardScaler]:
    """
    Ensure feature columns are ordered correctly, handle empty values, and apply scaling.
    """
    # Fill missing values
    df = df.copy()
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0
            
    # Handle infinite/missing values
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(0.0)
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].replace([float('inf'), float('-inf')], 0.0)
    
    # Scale features
    if scaler is None:
        scaler = StandardScaler()
        
    if fit:
        scaled_values = scaler.fit_transform(df[FEATURE_COLUMNS])
    else:
        scaled_values = scaler.transform(df[FEATURE_COLUMNS])
        
    scaled_df = pd.DataFrame(scaled_values, columns=FEATURE_COLUMNS, index=df.index)
    return scaled_df, scaler
