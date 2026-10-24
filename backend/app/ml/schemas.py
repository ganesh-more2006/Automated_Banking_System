from pydantic import BaseModel, Field
from decimal import Decimal

class MLPredictionInput(BaseModel):
    amount: Decimal = Field(..., gt=0)
    transaction_type: str = Field(..., min_length=3)
    account_age_days: int = Field(..., ge=0)
    transaction_frequency_24h: int = Field(..., ge=0)
    balance: Decimal = Field(..., ge=0)
    transaction_velocity_1h: Decimal = Field(..., ge=0)

class MLPredictionResponse(BaseModel):
    fraud_probability: float
    risk_score: int
    risk_category: str
    model_version: str
