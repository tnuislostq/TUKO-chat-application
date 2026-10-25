import re
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.database.store import data_store

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    username: str
    display_name: Optional[str] = ""
    email: str
    password: str
    avatar: Optional[str] = ""
    bio: Optional[str] = ""

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    presence: Optional[str] = None
    status_mood: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

@router.post("/register")
def register(payload: RegisterRequest):
    cleaned_username = payload.username.strip().lower()
    if len(cleaned_username) < 3 or not re.match(r"^[a-z0-9_\-]+$", cleaned_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters and contain only letters, numbers, underscores, or hyphens"
        )
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )

    if data_store.get_user_by_username(cleaned_username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already taken")
    if data_store.get_user_by_email(payload.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    pwd_hash = hash_password(payload.password)
    user = data_store.create_user(
        username=cleaned_username,
        display_name=payload.display_name or cleaned_username.capitalize(),
        email=payload.email,
        password_hash=pwd_hash,
        avatar=payload.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={cleaned_username}",
        bio=payload.bio or "Hey there! I am using Tuko Chat."
    )
    token = create_access_token({"sub": user["id"], "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": data_store.sanitize_user(user)
    }

@router.post("/login")
def login(payload: LoginRequest):
    identifier = payload.username_or_email.strip().lower()
    user = None
    if "@" in identifier:
        user = data_store.get_user_by_email(identifier)
    if not user:
        user = data_store.get_user_by_username(identifier)

    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password"
        )

    token = create_access_token({"sub": user["id"], "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": data_store.sanitize_user(user)
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    friends = data_store.get_user_friends(user_id)
    notifs = data_store.get_user_notifications(user_id)
    unread_notifs = sum(1 for n in notifs if not n.get("read", False))
    return {
        "user": data_store.sanitize_user(current_user),
        "friends_count": len(friends),
        "unread_notifications": unread_notifs
    }

@router.put("/profile")
def update_profile(payload: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    updates = payload.model_dump(exclude_unset=True)
    updated = data_store.update_user_profile(current_user["id"], updates)
    return {"user": data_store.sanitize_user(updated)}

@router.get("/search")
def search_users(q: str = Query(..., min_length=1), current_user: dict = Depends(get_current_user)):
    results = data_store.search_users(q, current_user["id"])
    return {"results": results}

@router.get("/users/{user_id}")
def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    u = data_store.get_user_by_id(user_id)
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"user": data_store.sanitize_user(u)}
