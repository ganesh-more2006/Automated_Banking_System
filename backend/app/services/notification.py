from sqlalchemy.orm import Session
from app.models.banking import Notification
from app.models.user import User, UserRole

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str
) -> Notification:
    """
    Create a notification in-box entry for a specific user.
    """
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message
      )
    try:
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        db.rollback()
        print(f"FAILED TO WRITE NOTIFICATION: {e}")
        return None

def notify_admins(
    db: Session,
    type: str,
    title: str,
    message: str
):
    """
    Broadcast a notification to all registered Admin accounts.
    """
    try:
        admins = db.query(User).filter(User.role == UserRole.ADMIN).all()
        for admin in admins:
            create_notification(db, admin.id, type, title, message)
    except Exception as e:
        print(f"FAILED TO BROADCAST ADMIN NOTIFICATION: {e}")
