from fastapi import APIRouter, Depends, HTTPException, status
from app.ml.service import model_loader
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def get_ml_health():
    """
    Get Machine Learning model loading state and readiness status.
    """
    loaded = model_loader.is_loaded
    status_str = "ready" if loaded else "not_ready"
    
    return {
        "status": status_str,
        "model_loaded": loaded,
        "model_version": settings.FRAUD_MODEL_VERSION if loaded else "N/A"
    }
