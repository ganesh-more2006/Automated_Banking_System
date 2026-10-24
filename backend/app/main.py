from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.session import engine, SessionLocal
from app.models import Base
from app.models.user import User, UserRole, CustomerProfile
from app.core.security import hash_password
from app.middleware.errors import ErrorHandlingMiddleware
from app.routers import health, auth, banking, admin, notifications, fraud, ml, kyc

# Configure logging before application startup
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks: Create database tables
    logger.info("Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
        
        # Seed default Admin users
        db = SessionLocal()
        try:
            # 1. Seed admin@apex.com (used for automated tests)
            admin_email = "admin@apex.com"
            existing_admin = db.query(User).filter(User.email == admin_email).first()
            if not existing_admin:
                logger.info("Seeding default admin user...")
                admin_user = User(
                    email=admin_email,
                    hashed_password=hash_password("AdminSecurePassword123!"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.add(admin_user)
                db.flush()
                
                admin_profile = CustomerProfile(
                    user_id=admin_user.id,
                    full_name="System Administrator",
                    phone="1234567890",
                    address="Headquarters",
                    pan_kyc_identifier="ADMIN_PAN_123"
                )
                db.add(admin_profile)
                db.commit()
                logger.info("Default admin user seeded successfully.")
            
            # 2. Seed requested admin@bank.com
            bank_admin_email = "admin@bank.com"
            existing_bank_admin = db.query(User).filter(User.email == bank_admin_email).first()
            if not existing_bank_admin:
                logger.info("Seeding bank admin user...")
                bank_admin = User(
                    email=bank_admin_email,
                    hashed_password=hash_password("Admin@12345"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.add(bank_admin)
                db.flush()
                
                bank_admin_profile = CustomerProfile(
                    user_id=bank_admin.id,
                    full_name="Bank Administrator",
                    phone="9876543210",
                    address="Central HQ",
                    pan_kyc_identifier="ADMIN_BANK_PAN"
                )
                db.add(bank_admin_profile)
                db.commit()
                logger.info("Bank admin user seeded successfully.")
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error seeding default admins: {e}")
        finally:
            db.close()
            
    except Exception as e:
        logger.critical(f"Failed to initialize database tables: {e}")
        raise e
    yield
    # Shutdown tasks
    logger.info("Cleaning up backend application resources...")

tags_metadata = [
    {
        "name": "health",
        "description": "System health metrics and connectivity checks.",
    },
    {
        "name": "auth",
        "description": "Customer and administrator authentication, credentials tokens, and session profiles.",
    },
    {
        "name": "banking",
        "description": "Core bank accounts operations: openings, list accounts, statements generation.",
    },
    {
        "name": "admin",
        "description": "Administrative metrics, customer suspends, listings, and transaction reversals.",
    },
    {
        "name": "notifications",
        "description": "Inbox security alerts, balance warning notifications.",
    },
    {
        "name": "fraud",
        "description": "Machine Learning risk classifications, isolation forest anomaly predictions.",
    },
    {
        "name": "Machine Learning",
        "description": "Readiness status checkpoints for model loaders.",
    },
    {
        "name": "KYC",
        "description": "Customer identity verification profiles and documentation submission checks.",
    },
]

app = FastAPI(
    title="Automated Banking Management System API",
    description="Production-grade secure backend API for automated banking functions.",
    version="1.0.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan
)

# Register Custom Error Handling Middleware first
app.add_middleware(ErrorHandlingMiddleware)

# CORS configuration
if settings.BACKEND_CORS_ORIGINS:
    logger.info(f"Configuring CORS origins: {settings.BACKEND_CORS_ORIGINS}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register Routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(banking.router, prefix=f"{settings.API_V1_STR}/banking", tags=["banking"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(fraud.router, prefix=f"{settings.API_V1_STR}/fraud", tags=["fraud"])
app.include_router(ml.router, prefix=f"{settings.API_V1_STR}/ml", tags=["Machine Learning"])
app.include_router(kyc.router, prefix=f"{settings.API_V1_STR}/kyc", tags=["KYC"])

@app.get("/")
def read_root():
    return {
        "title": "Automated Banking Management System API",
        "docs_url": "/docs",
        "health_check_url": f"{settings.API_V1_STR}/health"
    }
