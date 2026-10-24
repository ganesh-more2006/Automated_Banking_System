import traceback
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import logger
from app.core.config import settings

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            logger.error(
                f"Unhandled exception during {request.method} {request.url.path}: "
                f"{exc}\n{traceback.format_exc()}"
            )
            
            # Show actual exception message only in development mode
            is_dev = settings.ENV.lower() == "development"
            message = str(exc) if is_dev else "An unexpected internal server error occurred."
            
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "detail": "Internal Server Error",
                    "message": message
                }
            )
