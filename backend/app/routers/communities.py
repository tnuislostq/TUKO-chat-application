from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import get_current_user
from app.database.store import data_store
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/api/communities", tags=["communities"])

class CreateCommunityBody(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "💬"

class CreateChannelBody(BaseModel):
    name: str
    type: str = "text"  # "text" or "voice"
    topic: Optional[str] = ""

class SendChannelMsgBody(BaseModel):
    text: str = ""
    attachments: Optional[List[Dict[str, Any]]] = None
    voice_note: Optional[Dict[str, Any]] = None
    reply_to: Optional[Dict[str, Any]] = None

class EditChannelMsgBody(BaseModel):
    text: str

class ReactBody(BaseModel):
    emoji: str

@router.get("")
def list_user_communities(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    comms = data_store.get_user_communities(user_id)
    return {"communities": comms}

@router.get("/discover")
def list_discoverable(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    comms = data_store.get_discoverable_communities(user_id)
    return {"communities": comms}

@router.post("")
def create_community(payload: CreateCommunityBody, current_user: dict = Depends(get_current_user)):
    if len(payload.name.strip()) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Community name must be at least 2 characters")
    comm = data_store.create_community(
        user_id=current_user["id"],
        name=payload.name,
        description=payload.description or "",
        icon=payload.icon or "💬"
    )
    return comm

@router.get("/{comm_id}")
def get_community_detail(comm_id: str, current_user: dict = Depends(get_current_user)):
    comm = data_store.get_community_by_id(comm_id)
    if not comm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")
    
    # Enforce membership check
    is_member = any(m["user_id"] == current_user["id"] for m in comm.get("members", []))
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Join community first to view content")

    # Hydrate members with user profiles and live presence
    hydrated_members = []
    for m in comm.get("members", []):
        u = data_store.get_user_by_id(m["user_id"])
        if u:
            user_safe = data_store.sanitize_user(u)
            user_safe["role"] = m.get("role", "member")
            is_online = ws_manager.is_user_online(u["id"])
            if is_online:
                user_safe["presence"] = "online"
            hydrated_members.append(user_safe)

    comm_detail = dict(comm)
    comm_detail["members"] = hydrated_members
    return {"community": comm_detail}

@router.post("/join/{invite_code}")
def join_community(invite_code: str, current_user: dict = Depends(get_current_user)):
    try:
        comm = data_store.join_community_by_invite(current_user["id"], invite_code)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return {"status": "joined", "community": comm}

@router.post("/{comm_id}/channels")
def add_channel(comm_id: str, payload: CreateChannelBody, current_user: dict = Depends(get_current_user)):
    comm = data_store.get_community_by_id(comm_id)
    if not comm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Community not found")

    # Check permission (owner or admin)
    member = next((m for m in comm.get("members", []) if m["user_id"] == current_user["id"]), None)
    if not member or member.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners and admins can create channels")

    try:
        chan = data_store.add_channel_to_community(comm_id, payload.name, payload.type, payload.topic or "")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return chan

@router.get("/{comm_id}/channels/{chan_id}/messages")
def get_channel_messages(comm_id: str, chan_id: str, current_user: dict = Depends(get_current_user)):
    comm = data_store.get_community_by_id(comm_id)
    if not comm or not any(m["user_id"] == current_user["id"] for m in comm.get("members", [])):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must be member of community")

    msgs = data_store.get_channel_messages(comm_id, chan_id)
    return {"messages": msgs}

@router.post("/{comm_id}/channels/{chan_id}/messages")
async def send_channel_message(comm_id: str, chan_id: str, payload: SendChannelMsgBody, current_user: dict = Depends(get_current_user)):
    comm = data_store.get_community_by_id(comm_id)
    if not comm or not any(m["user_id"] == current_user["id"] for m in comm.get("members", [])):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Must be member of community")

    if not payload.text.strip() and not payload.attachments and not payload.voice_note:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    msg = data_store.add_channel_message(
        comm_id=comm_id,
        channel_id=chan_id,
        sender_id=current_user["id"],
        text=payload.text.strip(),
        attachments=payload.attachments,
        voice_note=payload.voice_note,
        reply_to=payload.reply_to
    )

    # Broadcast to all users connected to this channel or members
    await ws_manager.broadcast_to_channel(comm_id, chan_id, {
        "type": "new_channel_message",
        "community_id": comm_id,
        "channel_id": chan_id,
        "message": msg
    })

    return msg

@router.post("/{comm_id}/channels/{chan_id}/messages/{msg_id}/react")
async def react_channel_message(comm_id: str, chan_id: str, msg_id: str, payload: ReactBody, current_user: dict = Depends(get_current_user)):
    try:
        res = data_store.react_to_message(msg_id, current_user["id"], payload.emoji, is_channel=True)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    await ws_manager.broadcast_to_channel(comm_id, chan_id, {
        "type": "channel_reaction_updated",
        "community_id": comm_id,
        "channel_id": chan_id,
        "message_id": msg_id,
        "reactions": res["reactions"]
    })
    return res

@router.put("/{comm_id}/channels/{chan_id}/messages/{msg_id}")
async def edit_channel_message(comm_id: str, chan_id: str, msg_id: str, payload: EditChannelMsgBody, current_user: dict = Depends(get_current_user)):
    try:
        msg = data_store.edit_message(msg_id, current_user["id"], payload.text, is_channel=True)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await ws_manager.broadcast_to_channel(comm_id, chan_id, {
        "type": "channel_message_edited",
        "community_id": comm_id,
        "channel_id": chan_id,
        "message": msg
    })
    return msg

@router.delete("/{comm_id}/channels/{chan_id}/messages/{msg_id}")
async def delete_channel_message(comm_id: str, chan_id: str, msg_id: str, current_user: dict = Depends(get_current_user)):
    comm = data_store.get_community_by_id(comm_id)
    member = next((m for m in comm.get("members", []) if m["user_id"] == current_user["id"]), None) if comm else None
    
    # Check if author or admin/owner
    store_dict = data_store.data["channel_messages"]
    msg = store_dict.get(msg_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    is_author = msg["sender_id"] == current_user["id"]
    is_moderator = member and member.get("role") in ["owner", "admin"]

    if not is_author and not is_moderator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this message")

    deleted = data_store.delete_message(msg_id, msg["sender_id"], is_channel=True)

    await ws_manager.broadcast_to_channel(comm_id, chan_id, {
        "type": "channel_message_deleted",
        "community_id": comm_id,
        "channel_id": chan_id,
        "message_id": msg_id
    })
    return {"status": "deleted", "message": deleted}

@router.post("/{comm_id}/channels/{chan_id}/messages/{msg_id}/pin")
async def toggle_pin_channel(comm_id: str, chan_id: str, msg_id: str, current_user: dict = Depends(get_current_user)):
    try:
        msg = data_store.toggle_pin_message(msg_id, is_channel=True)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await ws_manager.broadcast_to_channel(comm_id, chan_id, {
        "type": "channel_message_pinned",
        "community_id": comm_id,
        "channel_id": chan_id,
        "message_id": msg_id,
        "pinned": msg.get("pinned", False)
    })
    return msg
