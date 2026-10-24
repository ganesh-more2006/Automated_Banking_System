from pydantic import BaseModel
from datetime import datetime

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    read_status: bool
    timestamp: datetime

    class Config:
        from_attributes = True
