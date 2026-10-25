from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.database.store import data_store

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("")
def list_notifications(current_user: dict = Depends(get_current_user)):
    notifs = data_store.get_user_notifications(current_user["id"])
    return {"notifications": notifs}

@router.post("/{notif_id}/read")
def mark_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    success = data_store.mark_notification_read(notif_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"status": "ok"}

@router.post("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    data_store.mark_all_notifications_read(current_user["id"])
    return {"status": "ok"}

@router.delete("")
def clear_all(current_user: dict = Depends(get_current_user)):
    data_store.clear_notifications(current_user["id"])
    return {"status": "cleared"}
