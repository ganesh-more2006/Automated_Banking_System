from sqlalchemy.orm import Session
from typing import Optional
from app.models.banking import AuditLog

def create_audit_log(
    db: Session,
    actor_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[str],
    description: str,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS"
) -> AuditLog:
    """
    Log an auditable operation in the database.
    """
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
        status=status
    )
    try:
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception as e:
        db.rollback()
        # Fallback print to prevent crash if logging fails
        print(f"FAILED TO WRITE AUDIT LOG: {e}")
        return None
