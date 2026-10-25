from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user
from app.database.store import data_store
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/friends", tags=["friends"])

class FriendRequestBody(BaseModel):
    username_or_id: str

@router.get("")
def get_friends(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    friends = data_store.get_user_friends(user_id)
    # Augment with live online status from WebSocket manager
    for item in friends:
        fid = item["user"]["id"]
        is_online = ws_manager.is_user_online(fid)
        if is_online and item["user"].get("presence") == "offline":
            item["user"]["presence"] = "online"
        elif not is_online:
            item["user"]["presence"] = "offline"
    return {"friends": friends}

@router.get("/pending")
def get_pending(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    pending = data_store.get_pending_friend_requests(user_id)
    return pending

@router.post("/request")
async def send_friend_request(payload: FriendRequestBody, current_user: dict = Depends(get_current_user)):
    sender_id = current_user["id"]
    target_ident = payload.username_or_id.strip()
    
    target_user = data_store.get_user_by_id(target_ident)
    if not target_user:
        target_user = data_store.get_user_by_username(target_ident)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    target_id = target_user["id"]
    if target_id == sender_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot friend request yourself")

    try:
        res = data_store.send_friend_request(sender_id, target_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify recipient via WebSocket & notification
    notif = data_store.create_notification(
        user_id=target_id,
        notif_type="friend_request",
        title="New Friend Request",
        body=f"@{current_user['username']} sent you a friend request.",
        data={"sender_id": sender_id, "username": current_user["username"]}
    )
    await ws_manager.send_to_user(target_id, {
        "type": "notification",
        "notification": notif
    })
    await ws_manager.send_to_user(target_id, {
        "type": "friend_request_received",
        "sender": data_store.sanitize_user(current_user)
    })

    return res

@router.post("/{request_id}/accept")
async def accept_request(request_id: str, current_user: dict = Depends(get_current_user)):
    success = data_store.respond_friend_request(current_user["id"], request_id, "accept")
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request not found or already handled")
    
    return {"status": "accepted"}

@router.post("/{request_id}/decline")
def decline_request(request_id: str, current_user: dict = Depends(get_current_user)):
    success = data_store.respond_friend_request(current_user["id"], request_id, "decline")
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request not found or already handled")
    return {"status": "declined"}

@router.delete("/{friend_id}")
def remove_friend(friend_id: str, current_user: dict = Depends(get_current_user)):
    success = data_store.remove_friend(current_user["id"], friend_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found")
    return {"status": "removed"}

@router.post("/block/{target_id}")
def block_user(target_id: str, current_user: dict = Depends(get_current_user)):
    if target_id == current_user["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")
    data_store.block_user(current_user["id"], target_id)
    return {"status": "blocked"}

@router.post("/unblock/{target_id}")
def unblock_user(target_id: str, current_user: dict = Depends(get_current_user)):
    success = data_store.unblock_user(current_user["id"], target_id)
    return {"status": "unblocked" if success else "not_found"}

@router.get("/blocked")
def get_blocked(current_user: dict = Depends(get_current_user)):
    blocked = data_store.get_blocked_users(current_user["id"])
    return {"blocked": blocked}
