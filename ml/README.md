# Local Machine Learning Fraud Detection Module

This directory contains the foundation for a local, unsupervised anomaly detection system designed to evaluate and assign risk scores to transaction events.

## Process Flow

```
Transaction Data
       ↓
Feature Engineering
       ↓
 Preprocessing
       ↓
Isolation Forest
       ↓
 Anomaly Score
       ↓
  Saved Model
```

---

## 1. Dataset used
Since historical bank transaction logs are initially sparse on new installations, the training script checks the database and automatically falls back to generating a high-quality, synthetic training dataset (`synthetic_training.csv`) containing **250 instances**:
- **95% Normal profile events**: Low frequency, low withdrawal rates, low amounts (mean of $120.00), typical operating hours.
- **5% Anomalous events**: Multi-thousand dollar transactions, nighttime activity, high frequency (4-8 transactions/hour), repeated transaction failures.

*Note: These synthetic records are only used for offline training and are **never** injected into the live customer transaction logs.*

---

## 2. Features created
A subset of **12 numerical features** are calculated from the transaction parameter history:
- `amount` & `log_amount`: Numerical value and log-normalized amount to compress high-value outlier variance.
- `hour_of_day`: Hour index (0-23) to highlight nighttime operations.
- `day_of_week`: Day index (0-6) to track weekday/weekend variance.
- `recent_tx_count_1h` & `recent_tx_count_24h`: Transaction counts over rolling 1-hour and 24-hour windows.
- `avg_tx_amount_30d`: Historical baseline transaction size.
- `amount_deviation`: Absolute difference of current amount from the 30-day average.
- `failed_tx_count_24h`: Running tally of failed transaction logs.
- `withdrawal_frequency_24h` & `transfer_frequency_24h`: Running tally of withdrawal and transfer occurrences.
- `balance_to_tx_ratio`: Log ratio comparing the current balance to the request amount.

---

## 3. Algorithm: Isolation Forest
An **Isolation Forest** (from scikit-learn) is used for unsupervised anomaly detection. 
- It functions by isolating observations by randomly selecting a feature and then randomly selecting a split value between the maximum and minimum values of the selected feature.
- Since recursive partitioning can be represented by a tree structure, the number of splittings required to isolate a sample is equivalent to the path length from the root node to the terminating node.
- **Why this choice**: Unsupervised anomaly detection is ideal here because real bank transaction data does not have pre-labeled fraud tags. Isolation Forest isolates anomalies (which have shorter paths in the trees) from normal observations.

---

## 4. Training Process
To retrain the model, run:
```bash
python -m ml.training.train_model
```
This script will:
1. Load data from the SQLite database (or generate the synthetic cohort).
2. Clean and scale features using standard scaling.
3. Fit `IsolationForest(contamination=0.05, random_state=42)`.
4. Output basic anomaly rate metrics.
5. Save model binaries and JSON metadata.

---

## 5. Model Outputs
- **`fraud_model.joblib`**: Serialized Isolation Forest model.
- **`scaler.joblib`**: Serialized standard scaler.
- **`model_metadata.json`**: JSON file tracking training timestamps, record counts, and anomaly metrics.

---

## 6. Limitations
> [!WARNING]
> This system is designed as a **portfolio-level demonstration** of transaction anomaly detection. It does not replace full corporate bank-grade fraud prevention networks. Unsupervised anomaly detection flags deviations from normal patterns (e.g. large transfers at 3 AM), but does not confirm that a transaction is fraudulent.
