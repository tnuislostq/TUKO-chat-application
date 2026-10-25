from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.config import DEFAULT_ICE_SERVERS
from app.core.security import get_current_user
from app.database.store import data_store

router = APIRouter(prefix="/api/calls", tags=["calls"])

class LogCallBody(BaseModel):
    receiver_id: str
    call_type: str  # "voice" or "video"
    status: str     # "completed", "missed", "declined"
    duration_seconds: Optional[int] = 0

@router.get("/history")
def get_call_history(current_user: dict = Depends(get_current_user)):
    history = data_store.get_user_call_history(current_user["id"])
    return {"history": history}

@router.get("/ice-servers")
def get_ice_servers(current_user: dict = Depends(get_current_user)):
    return {"ice_servers": DEFAULT_ICE_SERVERS}

@router.post("/log")
def log_call(payload: LogCallBody, current_user: dict = Depends(get_current_user)):
    entry = data_store.add_call_log(
        caller_id=current_user["id"],
        receiver_id=payload.receiver_id,
        call_type=payload.call_type,
        status=payload.status,
        duration_seconds=payload.duration_seconds or 0
    )
    return {"status": "logged", "call": entry}
