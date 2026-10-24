from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db
from app.models.user import User, KYCStatus
from app.models.kyc import KYC
from app.core.deps import get_current_user
from app.schemas.kyc import KYCCreate, KYCUpdate, KYCOut
from app.services.audit import create_audit_log
from app.services.notification import create_notification

router = APIRouter()

@router.get("/me", response_model=KYCOut)
def get_my_kyc(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the authenticated customer's KYC submission details.
    """
    kyc_rec = db.query(KYC).filter(KYC.user_id == current_user.id).first()
    if not kyc_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC details not found."
        )
    return kyc_rec

@router.post("", response_model=KYCOut, status_code=status.HTTP_201_CREATED)
def create_kyc(
    kyc_data: KYCCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a new KYC submission for the logged-in customer.
    Starts as PENDING by default.
    """
    existing_kyc = db.query(KYC).filter(KYC.user_id == current_user.id).first()
    if existing_kyc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC submission already exists for this user."
        )
        
    try:
        new_kyc = KYC(
            user_id=current_user.id,
            full_name=kyc_data.full_name,
            date_of_birth=kyc_data.date_of_birth,
            address=kyc_data.address,
            city=kyc_data.city,
            state=kyc_data.state,
            postal_code=kyc_data.postal_code,
            identity_document_type=kyc_data.identity_document_type,
            identity_document_number=kyc_data.identity_document_number,
            status=KYCStatus.PENDING,
            submitted_at=datetime.utcnow()
        )
        db.add(new_kyc)
        
        # Sync profile status to PENDING
        if current_user.profile:
            current_user.profile.kyc_status = KYCStatus.PENDING
            db.add(current_user.profile)
            
        db.commit()
        db.refresh(new_kyc)
        
        # Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="KYC_SUBMITTED",
            entity_type="KYC",
            entity_id=str(new_kyc.id),
            description="Submitted customer KYC verification details.",
            ip_address=request.client.host
        )
        
        # Notification
        create_notification(
            db,
            user_id=current_user.id,
            type="KYC_STATUS",
            title="KYC Verification Submitted",
            message="Your KYC verification document details have been submitted and are under review."
        )
        
        return new_kyc
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit KYC details: {str(e)}"
        )

@router.put("", response_model=KYCOut)
def update_kyc(
    kyc_data: KYCUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a customer's KYC details draft/rejected submission.
    """
    kyc_rec = db.query(KYC).filter(KYC.user_id == current_user.id).first()
    if not kyc_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC details not found."
        )
        
    if kyc_rec.status == KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved KYC profiles cannot be modified."
        )
        
    try:
        for field, val in kyc_data.model_dump(exclude_unset=True).items():
            setattr(kyc_rec, field, val)
            
        # Re-set status to pending when modified
        kyc_rec.status = KYCStatus.PENDING
        kyc_rec.submitted_at = datetime.utcnow()
        
        if current_user.profile:
            current_user.profile.kyc_status = KYCStatus.PENDING
            db.add(current_user.profile)
            
        db.add(kyc_rec)
        db.commit()
        db.refresh(kyc_rec)
        
        # Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="KYC_UPDATED",
            entity_type="KYC",
            entity_id=str(kyc_rec.id),
            description="Updated customer KYC verification details.",
            ip_address=request.client.host
        )
        
        return kyc_rec
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update KYC: {str(e)}"
        )

@router.post("/submit", response_model=KYCOut)
def submit_kyc(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finalize and submit KYC verification checks.
    """
    kyc_rec = db.query(KYC).filter(KYC.user_id == current_user.id).first()
    if not kyc_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC details not found."
        )
        
    if kyc_rec.status == KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC already approved."
        )
        
    try:
        kyc_rec.status = KYCStatus.PENDING
        kyc_rec.submitted_at = datetime.utcnow()
        
        if current_user.profile:
            current_user.profile.kyc_status = KYCStatus.PENDING
            db.add(current_user.profile)
            
        db.add(kyc_rec)
        db.commit()
        db.refresh(kyc_rec)
        
        # Audit Log
        create_audit_log(
            db,
            actor_id=current_user.id,
            action="KYC_SUBMITTED",
            entity_type="KYC",
            entity_id=str(kyc_rec.id),
            description="Submitted customer KYC details verification.",
            ip_address=request.client.host
        )
        
        return kyc_rec
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to finalize KYC submission: {str(e)}"
        )
