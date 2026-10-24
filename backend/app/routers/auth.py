from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.user import User, CustomerProfile, UserRole, KYCStatus, ProfileStatus
from app.models.banking import AuditLog, Account
from app.schemas.auth import UserRegister, UserLogin, Token, UserOut, PINSetup
from app.core.security import verify_password, hash_password, create_access_token
from app.core.deps import get_current_user, RoleChecker
from app.services.audit import create_audit_log
from app.services.notification import create_notification, notify_admins

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, request: Request, db: Session = Depends(get_db)):
    """
    Register a new customer user, initialize profile, and record audit log & notifications.
    """
    # Check if email is already registered
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        create_audit_log(
            db, 
            actor_id=None, 
            action="REGISTRATION_FAILED", 
            entity_type="USER", 
            entity_id=None, 
            description=f"Duplicate registration attempt for email: {user_data.email}",
            ip_address=request.client.host,
            status="FAILURE"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    try:
        # Create user credential record
        new_user = User(
            email=user_data.email,
            hashed_password=hash_password(user_data.password),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.add(new_user)
        db.flush() # Retrieve user ID

        # Create customer profile record
        new_profile = CustomerProfile(
            user_id=new_user.id,
            full_name=user_data.full_name,
            phone=user_data.phone,
            date_of_birth=user_data.date_of_birth,
            address=user_data.address,
            pan_kyc_identifier=user_data.pan_kyc_identifier,
            kyc_status=KYCStatus.PENDING,
            profile_status=ProfileStatus.ACTIVE
        )
        db.add(new_profile)
        db.commit()
        db.refresh(new_user)

        # 1. Write Audit Log
        create_audit_log(
            db, 
            actor_id=new_user.id, 
            action="REGISTRATION", 
            entity_type="USER", 
            entity_id=str(new_user.id), 
            description=f"New customer registered: {new_user.email}",
            ip_address=request.client.host
        )

        # 2. Notify Customer
        create_notification(
            db, 
            user_id=new_user.id, 
            type="ACCOUNT_CREATED", 
            title="Welcome to Apex Banking!", 
            message="Your customer credentials and profile have been initialized. Please complete KYC validation."
        )

        # 3. Notify Admins
        notify_admins(
            db, 
            type="PENDING_KYC", 
            title="Pending KYC Verification", 
            message=f"Customer {user_data.full_name} ({user_data.email}) is pending KYC verification."
        )

        return new_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user, log success/failure in Audit Logs, and check for security events.
    """
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        account_rec = db.query(Account).filter(Account.account_number == login_data.email).first()
        if account_rec:
            user = account_rec.user
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        # 1. Audit Log Failure
        create_audit_log(
            db,
            actor_id=None,
            action="LOGIN_FAILED",
            entity_type="USER",
            entity_id=None,
            description=f"Failed login attempt for identifier: {login_data.email}",
            ip_address=request.client.host,
            status="FAILURE"
        )
        
        # 2. Check for security event: multiple failed logins (e.g., 3 in the last 15 minutes)
        time_limit = datetime.utcnow() - timedelta(minutes=15)
        failed_count = db.query(AuditLog).filter(
            AuditLog.action == "LOGIN_FAILED",
            AuditLog.description.like(f"%{login_data.email}%"),
            AuditLog.timestamp >= time_limit
        ).count()
        
        if failed_count >= 3:
            notify_admins(
                db,
                type="SECURITY_EVENT",
                title="Multiple Failed Logins",
                message=f"Security Alert: {failed_count} failed login attempts recorded for identifier {login_data.email}."
            )
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email, account number or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        create_audit_log(
            db,
            actor_id=user.id,
            action="LOGIN_DEACTIVATED",
            entity_type="USER",
            entity_id=str(user.id),
            description=f"Deactivated login attempt for email: {user.email}",
            ip_address=request.client.host,
            status="FAILURE"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    # Lazy migration: if the stored hash does not start with "$2b$", re-hash it using current bcrypt.
    if not user.hashed_password.startswith("$2b$"):
        try:
            user.hashed_password = hash_password(login_data.password)
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            print(f"Lazy re-hashing database commit failed: {e}")

    # 1. Audit Log Success
    create_audit_log(
        db,
        actor_id=user.id,
        action="LOGIN",
        entity_type="USER",
        entity_id=str(user.id),
        description=f"User login successful: {user.email}",
        ip_address=request.client.host
    )

    # Issue JWT access token
    access_token = create_access_token(subject=user.email)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Log session termination in Audit Logs.
    """
    create_audit_log(
        db,
        actor_id=current_user.id,
        action="LOGOUT",
        entity_type="USER",
        entity_id=str(current_user.id),
        description=f"User logout successful: {current_user.email}",
        ip_address=request.client.host
    )
    return {"status": "success", "message": "Logged out successfully."}

@router.get("/me", response_model=UserOut)
def read_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve authenticated user profile.
    """
    return current_user

@router.get("/admin-only")
def admin_only_endpoint(current_user: User = Depends(RoleChecker([UserRole.ADMIN]))):
    """
    Protected endpoint only accessible to ADMIN users.
    """
    return {
        "status": "success",
        "message": f"Welcome Admin, {current_user.email}! You have successfully bypassed the admin guard."
    }

@router.get("/staff-only")
def staff_only_endpoint(current_user: User = Depends(RoleChecker([UserRole.STAFF, UserRole.ADMIN]))):
    """
    Protected endpoint accessible to STAFF and ADMIN users.
    """
    return {
        "status": "success",
        "message": f"Authorized resource loaded successfully for role: {current_user.role}."
    }

@router.post("/set-pin")
def set_transaction_pin(
    pin_data: PINSetup,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set/Reset the authenticated customer's transaction PIN.
    """
    if pin_data.pin != pin_data.confirm_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN confirmation does not match."
        )
    
    try:
        current_user.hashed_pin = hash_password(pin_data.pin)
        db.add(current_user)
        db.commit()
        
        # Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="PIN_SET",
            entity_type="USER",
            entity_id=str(current_user.id),
            description="Transaction PIN set/updated successfully.",
            ip_address=request.client.host
        )
        
        # Notification
        create_notification(
            db,
            user_id=current_user.id,
            type="SECURITY_EVENT",
            title="Transaction PIN Set",
            message="Your transaction PIN has been successfully set/updated."
        )
        
        return {"status": "success", "message": "Transaction PIN set successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set transaction PIN: {str(e)}"
        )
