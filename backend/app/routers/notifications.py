from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.models.banking import Notification
from app.core.deps import get_current_user
from app.schemas.notification import NotificationOut

router = APIRouter()

@router.get("", response_model=List[NotificationOut])
def get_my_notifications(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    List all notifications for the authenticated user, newest first.
    """
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.timestamp.desc()).all()

@router.put("/read-all", status_code=status.HTTP_200_OK)
def mark_all_as_read(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Mark all unread notifications as read for the authenticated user.
    """
    try:
        db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.read_status == False
        ).update({"read_status": True}, synchronize_session=False)
        db.commit()
        return {"status": "success", "message": "All notifications marked as read."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{notif_id}/read", response_model=NotificationOut)
def mark_as_read(
    notif_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Mark a specific notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    try:
        notif.read_status = True
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
