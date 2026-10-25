from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user
from app.database.store import data_store
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

class SendMessageBody(BaseModel):
    text: str = ""
    attachments: Optional[List[Dict[str, Any]]] = None
    voice_note: Optional[Dict[str, Any]] = None
    reply_to: Optional[Dict[str, Any]] = None

class EditMessageBody(BaseModel):
    text: str

class ReactMessageBody(BaseModel):
    emoji: str

@router.get("")
def list_conversations(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    convs = data_store.get_user_conversations(user_id)
    # Augment other_user with real-time presence
    for c in convs:
        ou = c.get("other_user")
        if ou:
            is_online = ws_manager.is_user_online(ou["id"])
            if is_online and ou.get("presence") == "offline":
                ou["presence"] = "online"
            elif not is_online:
                ou["presence"] = "offline"
    return {"conversations": convs}

@router.post("/with/{target_id}")
def get_or_create_conversation(target_id: str, current_user: dict = Depends(get_current_user)):
    if target_id == current_user["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot start DM with yourself")
    target = data_store.get_user_by_id(target_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")
    
    conv = data_store.get_or_create_dm(current_user["id"], target_id)
    conv_copy = dict(conv)
    conv_copy["other_user"] = data_store.sanitize_user(target)
    return {"conversation": conv_copy}

@router.get("/{conv_id}/messages")
def get_messages(conv_id: str, current_user: dict = Depends(get_current_user)):
    conv = data_store.data["conversations"].get(conv_id)
    if not conv or current_user["id"] not in conv["participants"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to conversation")
    
    msgs = data_store.get_dm_messages(conv_id)
    return {"messages": msgs}

@router.post("/{conv_id}/messages")
async def send_message(conv_id: str, payload: SendMessageBody, current_user: dict = Depends(get_current_user)):
    conv = data_store.data["conversations"].get(conv_id)
    if not conv or current_user["id"] not in conv["participants"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to conversation")
    
    if not payload.text.strip() and not payload.attachments and not payload.voice_note:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be completely empty")

    msg = data_store.add_dm_message(
        conv_id=conv_id,
        sender_id=current_user["id"],
        text=payload.text.strip(),
        attachments=payload.attachments,
        voice_note=payload.voice_note,
        reply_to=payload.reply_to
    )

    # Broadcast to both participants
    for pid in conv["participants"]:
        await ws_manager.send_to_user(pid, {
            "type": "new_dm_message",
            "conversation_id": conv_id,
            "message": msg
        })

    return msg

@router.post("/{conv_id}/messages/{msg_id}/react")
async def react_message(conv_id: str, msg_id: str, payload: ReactMessageBody, current_user: dict = Depends(get_current_user)):
    conv = data_store.data["conversations"].get(conv_id)
    if not conv or current_user["id"] not in conv["participants"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        res = data_store.react_to_message(msg_id, current_user["id"], payload.emoji, is_channel=False)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    for pid in conv["participants"]:
        await ws_manager.send_to_user(pid, {
            "type": "dm_reaction_updated",
            "conversation_id": conv_id,
            "message_id": msg_id,
            "reactions": res["reactions"]
        })
    return res

@router.put("/{conv_id}/messages/{msg_id}")
async def edit_message(conv_id: str, msg_id: str, payload: EditMessageBody, current_user: dict = Depends(get_current_user)):
    conv = data_store.data["conversations"].get(conv_id)
    if not conv or current_user["id"] not in conv["participants"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        msg = data_store.edit_message(msg_id, current_user["id"], payload.text, is_channel=False)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    for pid in conv["participants"]:
        await ws_manager.send_to_user(pid, {
            "type": "dm_message_edited",
            "conversation_id": conv_id,
            "message": msg
        })
    return msg

@router.delete("/{conv_id}/messages/{msg_id}")
async def delete_message(conv_id: str, msg_id: str, current_user: dict = Depends(get_current_user)):
    conv = data_store.data["conversations"].get(conv_id)
    if not conv or current_user["id"] not in conv["participants"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        msg = data_store.delete_message(msg_id, current_user["id"], is_channel=False)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    for pid in conv["participants"]:
        await ws_manager.send_to_user(pid, {
            "type": "dm_message_deleted",
            "conversation_id": conv_id,
            "message_id": msg_id
        })
    return {"status": "deleted", "message": msg}

@router.post("/{conv_id}/messages/{msg_id}/pin")
async def toggle_pin(conv_id: str, msg_id: str, current_user: dict = Depends(get_current_user)):
    conv = data_store.data["conversations"].get(conv_id)
    if not conv or current_user["id"] not in conv["participants"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    try:
        msg = data_store.toggle_pin_message(msg_id, is_channel=False)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    for pid in conv["participants"]:
        await ws_manager.send_to_user(pid, {
            "type": "dm_message_pinned",
            "conversation_id": conv_id,
            "message_id": msg_id,
            "pinned": msg.get("pinned", False)
        })
    return msg
