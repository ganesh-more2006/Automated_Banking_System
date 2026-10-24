import logging
import sys
from app.core.config import settings

def setup_logging() -> None:
    # Clear existing handlers
    logging.root.handlers = []
    
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Define standard format
    log_format = (
        "[%(asctime)s] %(levelname)s in %(module)s [%(pathname)s:%(lineno)d]: %(message)s"
    )
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger = logging.getLogger("app")
    logger.setLevel(log_level)
    logger.info(f"Logging configured at level {settings.LOG_LEVEL.upper()}")

logger = logging.getLogger("app")
