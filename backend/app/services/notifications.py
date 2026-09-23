"""Notification helper service."""
from sqlalchemy.orm import Session
from app.models.allocation import Notification


def create_notification(db: Session, user_id: int, title: str, message: str,
                        notification_type: str = None, related_id: int = None):
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_id=related_id,
        is_read=0,
    )
    db.add(notif)
    db.flush()
    return notif
