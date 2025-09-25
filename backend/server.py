from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import uuid
from typing import List, Optional, Dict
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

# Load environment variables
load_dotenv()

app = FastAPI(title="Tuko Chat API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.tuko_chat

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    id: str
    username: str
    email: str
    created_at: str
    is_online: bool = False

class ChatMessage(BaseModel):
    id: str
    user_id: str
    username: str
    content: str
    timestamp: str
    is_ai: bool = False
    chat_session_id: str

class AIMessage(BaseModel):
    message: str
    chat_session_id: str
    user_id: str

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data.get('created_at'), datetime):
        data['created_at'] = data['created_at'].isoformat()
    if isinstance(data.get('timestamp'), datetime):
        data['timestamp'] = data['timestamp'].isoformat()
    return data

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "Tuko Chat"}

@app.post("/api/auth/register")
async def register_user(user: UserCreate):
    try:
        # Check if user exists
        existing_user = await db.users.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create new user
        user_data = {
            "id": str(uuid.uuid4()),
            "username": user.username,
            "email": user.email,
            "password": user.password,  # In production, hash this
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_online": False
        }
        
        await db.users.insert_one(user_data)
        
        # Return user without password
        return User(
            id=user_data["id"],
            username=user_data["username"],
            email=user_data["email"],
            created_at=user_data["created_at"],
            is_online=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login_user(credentials: UserLogin):
    try:
        user = await db.users.find_one({"email": credentials.email, "password": credentials.password})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Update online status
        await db.users.update_one({"id": user["id"]}, {"$set": {"is_online": True}})
        
        return User(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            created_at=user["created_at"],
            is_online=True
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/logout/{user_id}")
async def logout_user(user_id: str):
    try:
        await db.users.update_one({"id": user_id}, {"$set": {"is_online": False}})
        return {"message": "User logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/messages/{chat_session_id}")
async def get_chat_messages(chat_session_id: str):
    try:
        messages = await db.messages.find({"chat_session_id": chat_session_id}).sort("timestamp", 1).to_list(length=None)
        return [ChatMessage(**msg) for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/ai")
async def chat_with_ai(ai_message: AIMessage):
    try:
        # Get API key
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Initialize LLM chat
        chat = LlmChat(
            api_key=api_key,
            session_id=ai_message.chat_session_id,
            system_message="You are Tuko AI, a helpful and friendly assistant built into the Tuko chat application. You're here to help users with any questions or tasks they have. Be conversational and engaging."
        ).with_model("openai", "gpt-4o-mini")
        
        # Create user message
        user_message = UserMessage(text=ai_message.message)
        
        # Get AI response
        ai_response = await chat.send_message(user_message)
        
        # Save user message to database
        user_msg_data = {
            "id": str(uuid.uuid4()),
            "user_id": ai_message.user_id,
            "username": "User",
            "content": ai_message.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_ai": False,
            "chat_session_id": ai_message.chat_session_id
        }
        await db.messages.insert_one(user_msg_data)
        
        # Save AI response to database
        ai_msg_data = {
            "id": str(uuid.uuid4()),
            "user_id": "ai",
            "username": "Tuko AI",
            "content": ai_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_ai": True,
            "chat_session_id": ai_message.chat_session_id
        }
        await db.messages.insert_one(ai_msg_data)
        
        # Broadcast both messages via WebSocket
        user_msg = ChatMessage(**user_msg_data)
        ai_msg = ChatMessage(**ai_msg_data)
        
        await manager.broadcast(json.dumps({
            "type": "message",
            "data": user_msg.dict()
        }))
        
        await manager.broadcast(json.dumps({
            "type": "message", 
            "data": ai_msg.dict()
        }))
        
        return {"user_message": user_msg, "ai_response": ai_msg}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Save message to database
            msg_data = {
                "id": str(uuid.uuid4()),
                "user_id": message_data.get("user_id"),
                "username": message_data.get("username"),
                "content": message_data.get("content"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_ai": False,
                "chat_session_id": message_data.get("chat_session_id", "general")
            }
            await db.messages.insert_one(msg_data)
            
            # Broadcast to all clients
            await manager.broadcast(json.dumps({
                "type": "message",
                "data": ChatMessage(**msg_data).dict()
            }))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)