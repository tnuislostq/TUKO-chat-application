import os
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="TUKO Chat API", version="2.0.0")

# CORS setup
origins = [
    os.getenv("FRONTEND_URL", "*"),
    "http://localhost:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.getenv("MONGO_URL")
db = None
if MONGO_URL:
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(MONGO_URL)
        db = client.get_database("tuko_chat")
        print("Connected to MongoDB successfully")
    except Exception as e:
        print(f"Warning: MongoDB connection error: {e}. Using in-memory fallback.")

# Default channels
ROOMS: List[Dict[str, str]] = [
    {"id": "general", "name": "General Hub", "desc": "Open community chat & introductions", "icon": "MessageSquare"},
    {"id": "tech", "name": "Dev & Code", "desc": "React, Python, APIs & design systems", "icon": "Code"},
    {"id": "gaming", "name": "Gaming Lounge", "desc": "Valorant, MLBB, RPGs & esports", "icon": "Gamepad2"},
    {"id": "music", "name": "Music & Beats", "desc": "Lo-fi, tracks, playlists & vibe", "icon": "Music"},
    {"id": "announcements", "name": "Announcements", "desc": "Product releases & server news", "icon": "Bell"}
]

# In-memory store
messages_cache: List[Dict[str, Any]] = [
    {
        "id": "msg-intro-1",
        "room": "general",
        "sender": "TUKO Bot",
        "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=TukoBot",
        "status_mood": "🤖 Automated Assistant",
        "text": "Welcome to TUKO 2.0! Enjoy real-time reactions, audio effects, typing indicators, and sleek custom avatars.",
        "reactions": {"🔥": 4, "❤️": 7, "🚀": 3},
        "timestamp": datetime.utcnow().isoformat()
    }
]

class ConnectionManager:
    def __init__(self):
        # room_id -> list of {"ws": WebSocket, "username": str, "avatar": str, "status_mood": str}
        self.active_connections: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self, websocket: WebSocket, room: str, username: str, avatar: str = "", status_mood: str = ""):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        
        self.active_connections[room].append({
            "ws": websocket,
            "username": username,
            "avatar": avatar,
            "status_mood": status_mood
        })
        
        # Broadcast user list & notification
        user_list = [
            {"username": c["username"], "avatar": c.get("avatar"), "status_mood": c.get("status_mood")}
            for c in self.active_connections[room]
        ]
        
        await self.broadcast(room, {
            "type": "user_joined",
            "room": room,
            "username": username,
            "online_users": user_list,
            "timestamp": datetime.utcnow().isoformat()
        })

    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active_connections:
            departed_user = None
            for c in self.active_connections[room]:
                if c["ws"] == websocket:
                    departed_user = c["username"]
                    break
            self.active_connections[room] = [c for c in self.active_connections[room] if c["ws"] != websocket]
            if not self.active_connections[room]:
                del self.active_connections[room]
            return departed_user
        return None

    async def broadcast(self, room: str, message: dict):
        if room in self.active_connections:
            stale = []
            for conn in self.active_connections[room]:
                try:
                    await conn["ws"].send_json(message)
                except Exception:
                    stale.append(conn)
            for s in stale:
                if s in self.active_connections[room]:
                    self.active_connections[room].remove(s)

manager = ConnectionManager()

class MessageCreate(BaseModel):
    room: str = "general"
    sender: str
    text: str
    avatar: Optional[str] = None
    status_mood: Optional[str] = None

class RoomCreate(BaseModel):
    id: str
    name: str
    desc: str
    icon: Optional[str] = "Hash"

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "TUKO Chat API 2.0",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/rooms")
def get_rooms():
    return ROOMS

@app.post("/api/rooms")
def create_room(room: RoomCreate):
    cleaned_id = room.id.strip().lower().replace(" ", "-")
    for r in ROOMS:
        if r["id"] == cleaned_id:
            raise HTTPException(status_code=400, detail="Room already exists")
    new_room = {
        "id": cleaned_id,
        "name": room.name.strip(),
        "desc": room.desc.strip(),
        "icon": room.icon or "Hash"
    }
    ROOMS.append(new_room)
    return new_room

@app.get("/api/messages")
async def get_messages(room: str = "general", limit: int = 50):
    if db is not None:
        try:
            cursor = db.messages.find({"room": room}).sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            docs.reverse()
            for d in docs:
                d["id"] = str(d.get("_id", d.get("id")))
                d.pop("_id", None)
            return docs
        except Exception as e:
            print(f"MongoDB read error: {e}")
    
    room_msgs = [m for m in messages_cache if m.get("room") == room][-limit:]
    return room_msgs

@app.post("/api/messages")
async def post_message(payload: MessageCreate):
    msg = {
        "id": f"msg-{int(datetime.utcnow().timestamp() * 1000)}",
        "room": payload.room,
        "sender": payload.sender,
        "avatar": payload.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={payload.sender}",
        "status_mood": payload.status_mood or "Active",
        "text": payload.text,
        "reactions": {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if db is not None:
        try:
            await db.messages.insert_one(dict(msg))
        except Exception as e:
            print(f"MongoDB write error: {e}")

    messages_cache.append(msg)
    if len(messages_cache) > 300:
        messages_cache.pop(0)

    await manager.broadcast(payload.room, {"type": "new_message", "message": msg})
    return msg

@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room: str, 
    username: str, 
    avatar: str = Query(default=""),
    status_mood: str = Query(default="")
):
    await manager.connect(websocket, room, username, avatar, status_mood)
    try:
        while True:
            text = await websocket.receive_text()
            payload = json.loads(text)
            action_type = payload.get("type", "message")
            
            if action_type == "message":
                msg = {
                    "id": f"msg-{int(datetime.utcnow().timestamp() * 1000)}",
                    "room": room,
                    "sender": username,
                    "avatar": payload.get("avatar") or avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}",
                    "status_mood": payload.get("status_mood") or status_mood or "Active",
                    "text": payload.get("text", ""),
                    "reactions": {},
                    "timestamp": datetime.utcnow().isoformat()
                }

                if db is not None:
                    try:
                        await db.messages.insert_one(dict(msg))
                    except Exception as e:
                        print(f"MongoDB insert error: {e}")

                messages_cache.append(msg)
                if len(messages_cache) > 300:
                    messages_cache.pop(0)

                await manager.broadcast(room, {"type": "new_message", "message": msg})

            elif action_type == "typing":
                await manager.broadcast(room, {
                    "type": "typing",
                    "username": username,
                    "is_typing": payload.get("is_typing", False),
                    "room": room
                })

            elif action_type == "reaction":
                msg_id = payload.get("message_id")
                emoji = payload.get("emoji")
                
                # Update in cache
                target_msg = next((m for m in messages_cache if m["id"] == msg_id), None)
                if target_msg:
                    if "reactions" not in target_msg:
                        target_msg["reactions"] = {}
                    current_count = target_msg["reactions"].get(emoji, 0)
                    target_msg["reactions"][emoji] = current_count + 1
                    
                    if db is not None:
                        try:
                            await db.messages.update_one(
                                {"id": msg_id},
                                {"$inc": {f"reactions.{emoji}": 1}}
                            )
                        except Exception as e:
                            print(f"MongoDB reaction update error: {e}")

                    await manager.broadcast(room, {
                        "type": "reaction_updated",
                        "message_id": msg_id,
                        "reactions": target_msg["reactions"],
                        "room": room
                    })

    except WebSocketDisconnect:
        departed_user = manager.disconnect(websocket, room)
        if departed_user:
            await manager.broadcast(room, {
                "type": "user_left",
                "room": room,
                "username": departed_user,
                "timestamp": datetime.utcnow().isoformat()
            })
    except Exception as e:
        manager.disconnect(websocket, room)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
