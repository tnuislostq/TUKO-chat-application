import json
from datetime import datetime, timezone
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        # user_id -> Set[WebSocket]
        self.user_sockets: Dict[str, Set[WebSocket]] = {}
        # websocket -> user_id
        self.socket_user: Dict[WebSocket, str] = {}
        # voice_room_id -> Set[WebSocket]
        self.voice_rooms: Dict[str, Set[WebSocket]] = {}
        # websocket -> voice_room_id
        self.socket_voice_room: Dict[WebSocket, str] = {}
        # channel_subscriptions: (comm_id, chan_id) -> Set[WebSocket]
        self.channel_subs: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = set()
        self.user_sockets[user_id].add(websocket)
        self.socket_user[websocket] = user_id

    def disconnect(self, websocket: WebSocket):
        user_id = self.socket_user.pop(websocket, None)
        if user_id and user_id in self.user_sockets:
            self.user_sockets[user_id].discard(websocket)
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]
        
        # Remove from voice room if in one
        room_id = self.socket_voice_room.pop(websocket, None)
        if room_id and room_id in self.voice_rooms:
            self.voice_rooms[room_id].discard(websocket)
            if not self.voice_rooms[room_id]:
                del self.voice_rooms[room_id]

        # Remove from channel subs
        for chan_key, s_set in list(self.channel_subs.items()):
            s_set.discard(websocket)
            if not s_set:
                del self.channel_subs[chan_key]

        return user_id

    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.user_sockets and len(self.user_sockets[user_id]) > 0

    async def send_to_user(self, user_id: str, message: dict):
        sockets = self.user_sockets.get(user_id, set())
        stale = set()
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                stale.add(ws)
        for s in stale:
            self.disconnect(s)

    async def send_to_users(self, user_ids: list, message: dict):
        for uid in user_ids:
            await self.send_to_user(uid, message)

    def subscribe_channel(self, websocket: WebSocket, comm_id: str, chan_id: str):
        key = f"{comm_id}:{chan_id}"
        if key not in self.channel_subs:
            self.channel_subs[key] = set()
        self.channel_subs[key].add(websocket)

    def unsubscribe_channel(self, websocket: WebSocket, comm_id: str, chan_id: str):
        key = f"{comm_id}:{chan_id}"
        if key in self.channel_subs:
            self.channel_subs[key].discard(websocket)

    async def broadcast_to_channel(self, comm_id: str, chan_id: str, message: dict):
        key = f"{comm_id}:{chan_id}"
        sockets = self.channel_subs.get(key, set())
        stale = set()
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception:
                stale.add(ws)
        for s in stale:
            self.disconnect(s)

    async def join_voice_room(self, websocket: WebSocket, user_id: str, room_id: str, user_info: dict):
        # Leave previous voice room if any
        prev_room = self.socket_voice_room.get(websocket)
        if prev_room and prev_room != room_id:
            await self.leave_voice_room(websocket, user_id)

        if room_id not in self.voice_rooms:
            self.voice_rooms[room_id] = set()
        self.voice_rooms[room_id].add(websocket)
        self.socket_voice_room[websocket] = room_id

        # Notify room members that a new user joined
        await self.broadcast_to_voice_room(room_id, {
            "type": "voice_user_joined",
            "room_id": room_id,
            "user": user_info,
            "user_id": user_id
        }, exclude_ws=websocket)

    async def leave_voice_room(self, websocket: WebSocket, user_id: str):
        room_id = self.socket_voice_room.pop(websocket, None)
        if room_id and room_id in self.voice_rooms:
            self.voice_rooms[room_id].discard(websocket)
            await self.broadcast_to_voice_room(room_id, {
                "type": "voice_user_left",
                "room_id": room_id,
                "user_id": user_id
            })

    async def broadcast_to_voice_room(self, room_id: str, message: dict, exclude_ws: Optional[WebSocket] = None):
        sockets = self.voice_rooms.get(room_id, set())
        stale = set()
        for ws in sockets:
            if ws == exclude_ws:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                stale.add(ws)
        for s in stale:
            self.disconnect(s)

ws_manager = WebSocketManager()
