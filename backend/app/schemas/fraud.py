from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TransactionRiskOut(BaseModel):
    risk_score: int
    risk_level: str
    is_suspicious: bool
    reasons: List[str]
    model_version: str

class ModelInfoOut(BaseModel):
    model_type: str
    model_version: str
    training_date: str
    training_records: int
    status: str
    features: List[str]
