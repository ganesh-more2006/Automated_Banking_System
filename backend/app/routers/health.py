from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.logging import logger

router = APIRouter()

@router.get("/health", status_code=200)
def health_check(response: Response, db: Session = Depends(get_db)):
    """
    Check the health of the FastAPI application and the database connection.
    """
    try:
        # Attempt to run a basic query to verify DB connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "message": "Automated Banking Management System API is operating normally."
        }
    except Exception as e:
        logger.error(f"Health check failed - Database error: {e}")
        response.status_code = 503
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "message": "Database connection error.",
            "error": str(e)
        }
