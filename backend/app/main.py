import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import APP_NAME, APP_VERSION, UPLOAD_DIR
from app.core.security import decode_access_token
from app.database.store import data_store
from app.websocket.manager import ws_manager

from app.routers import auth, friends, conversations, communities, calls, notifications, uploads

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[Tuko Chat] {APP_NAME} v{APP_VERSION} initialized successfully.")
    yield
    print(f"[Tuko Chat] {APP_NAME} shutting down.")

app = FastAPI(
    title=f"{APP_NAME} API",
    version=APP_VERSION,
    description="Tuko Chat - Modern Real-Time Messaging, Voice & Video Communication Platform",
    lifespan=lifespan
)

# CORS
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

# Static files for uploaded attachments and voice notes
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(friends.router)
app.include_router(conversations.router)
app.include_router(communities.router)
app.include_router(calls.router)
app.include_router(notifications.router)
app.include_router(uploads.router)

@app.get("/")
def root():
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health")
def health():
    return {"status": "ok", "app": APP_NAME, "version": APP_VERSION}

@app.websocket("/ws")
async def websocket_hub(websocket: WebSocket, token: str = Query(default="")):
    # Verify token
    user_id = None
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user_id = payload["sub"]

    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = data_store.get_user_by_id(user_id)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(websocket, user_id)
    
    # Broadcast presence to friends
    friends_list = data_store.get_user_friends(user_id)
    friend_ids = [f["user"]["id"] for f in friends_list]
    await ws_manager.send_to_users(friend_ids, {
        "type": "presence_updated",
        "user_id": user_id,
        "presence": "online",
        "status_mood": user.get("status_mood", "")
    })

    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            action = data.get("type")

            # Channel subscription
            if action == "subscribe_channel":
                comm_id = data.get("community_id")
                chan_id = data.get("channel_id")
                if comm_id and chan_id:
                    ws_manager.subscribe_channel(websocket, comm_id, chan_id)

            elif action == "unsubscribe_channel":
                comm_id = data.get("community_id")
                chan_id = data.get("channel_id")
                if comm_id and chan_id:
                    ws_manager.unsubscribe_channel(websocket, comm_id, chan_id)

            # Typing status
            elif action == "typing":
                target_type = data.get("target_type")  # "dm" or "channel"
                if target_type == "dm":
                    recipient_id = data.get("recipient_id")
                    if recipient_id:
                        await ws_manager.send_to_user(recipient_id, {
                            "type": "user_typing",
                            "conversation_id": data.get("conversation_id"),
                            "user_id": user_id,
                            "username": user.get("username"),
                            "is_typing": data.get("is_typing", False)
                        })
                elif target_type == "channel":
                    comm_id = data.get("community_id")
                    chan_id = data.get("channel_id")
                    if comm_id and chan_id:
                        await ws_manager.broadcast_to_channel(comm_id, chan_id, {
                            "type": "channel_typing",
                            "community_id": comm_id,
                            "channel_id": chan_id,
                            "user_id": user_id,
                            "username": user.get("username"),
                            "is_typing": data.get("is_typing", False)
                        })

            # Presence update
            elif action == "set_presence":
                presence = data.get("presence", "online")
                mood = data.get("status_mood", "")
                data_store.update_user_profile(user_id, {"presence": presence, "status_mood": mood})
                await ws_manager.send_to_users(friend_ids, {
                    "type": "presence_updated",
                    "user_id": user_id,
                    "presence": presence,
                    "status_mood": mood
                })

            # --- WebRTC Calling Signaling ---
            elif action == "webrtc_call_user":
                target_id = data.get("target_id")
                if target_id:
                    await ws_manager.send_to_user(target_id, {
                        "type": "webrtc_incoming_call",
                        "caller": data_store.sanitize_user(user),
                        "call_type": data.get("call_type", "voice"),
                        "sdp_offer": data.get("sdp_offer")
                    })

            elif action == "webrtc_accept_call":
                caller_id = data.get("caller_id")
                if caller_id:
                    await ws_manager.send_to_user(caller_id, {
                        "type": "webrtc_call_accepted",
                        "responder": data_store.sanitize_user(user),
                        "sdp_answer": data.get("sdp_answer")
                    })

            elif action == "webrtc_reject_call":
                caller_id = data.get("caller_id")
                reason = data.get("reason", "declined")
                if caller_id:
                    # Log call as missed or declined
                    data_store.add_call_log(
                        caller_id=caller_id,
                        receiver_id=user_id,
                        call_type=data.get("call_type", "voice"),
                        status=reason,
                        duration_seconds=0
                    )
                    await ws_manager.send_to_user(caller_id, {
                        "type": "webrtc_call_rejected",
                        "reason": reason,
                        "responder_id": user_id
                    })

            elif action == "webrtc_end_call":
                target_id = data.get("target_id")
                duration = data.get("duration", 0)
                call_type = data.get("call_type", "voice")
                if target_id:
                    data_store.add_call_log(
                        caller_id=user_id,
                        receiver_id=target_id,
                        call_type=call_type,
                        status="completed",
                        duration_seconds=duration
                    )
                    await ws_manager.send_to_user(target_id, {
                        "type": "webrtc_call_ended",
                        "by_user_id": user_id
                    })

            elif action == "webrtc_ice_candidate":
                target_id = data.get("target_id")
                if target_id:
                    await ws_manager.send_to_user(target_id, {
                        "type": "webrtc_ice_candidate",
                        "from_user_id": user_id,
                        "candidate": data.get("candidate")
                    })

            # --- Voice Room Mesh Signaling ---
            elif action == "voice_room_join":
                room_id = data.get("room_id")
                if room_id:
                    await ws_manager.join_voice_room(
                        websocket=websocket,
                        user_id=user_id,
                        room_id=room_id,
                        user_info=data_store.sanitize_user(user)
                    )

            elif action == "voice_room_leave":
                await ws_manager.leave_voice_room(websocket, user_id)

            elif action == "voice_room_signal":
                # Forward WebRTC mesh signal between room participants
                target_user_id = data.get("target_user_id")
                room_id = data.get("room_id")
                signal_data = data.get("signal")
                if target_user_id:
                    await ws_manager.send_to_user(target_user_id, {
                        "type": "voice_room_signal",
                        "from_user_id": user_id,
                        "room_id": room_id,
                        "signal": signal_data
                    })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
    finally:
        ws_manager.disconnect(websocket)
        # If user has no more sockets open, broadcast offline presence
        if not ws_manager.is_user_online(user_id):
            await ws_manager.send_to_users(friend_ids, {
                "type": "presence_updated",
                "user_id": user_id,
                "presence": "offline",
                "status_mood": user.get("status_mood", "")
            })
