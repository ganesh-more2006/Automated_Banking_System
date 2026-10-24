import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    print(f"Starting server on http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=(settings.ENV.lower() == "development")
    )
