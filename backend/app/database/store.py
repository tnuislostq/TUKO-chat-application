import json
import os
import shutil
import secrets
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
from app.core.config import DATA_DIR
from app.core.security import hash_password

class DataStore:
    def __init__(self):
        self.lock = threading.RLock()
        self.file_path = DATA_DIR / "tuko_store.json"
        self.data: Dict[str, Any] = {
            "users": {},           # user_id -> user_dict
            "usernames": {},       # username_lower -> user_id
            "friends": [],         # list of {id, user1_id, user2_id, status: "pending"|"accepted"|"blocked", action_by, created_at}
            "conversations": {},   # conv_id -> conv_dict
            "messages": {},        # msg_id -> msg_dict
            "communities": {},     # comm_id -> comm_dict
            "channel_messages": {},# msg_id -> msg_dict
            "notifications": {},   # notif_id -> notif_dict
            "call_logs": []        # list of call dicts
        }
        self.load()
        self.seed_defaults()

    def load(self):
        with self.lock:
            if self.file_path.exists():
                try:
                    with open(self.file_path, "r", encoding="utf-8") as f:
                        loaded = json.load(f)
                        for key in self.data.keys():
                            if key in loaded:
                                self.data[key] = loaded[key]
                except Exception as e:
                    print(f"Error loading data store: {e}. Starting fresh.")
                    self.save()
            else:
                self.save()

    def save(self):
        with self.lock:
            temp_path = self.file_path.with_suffix(".tmp")
            try:
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump(self.data, f, indent=2, ensure_ascii=False)
                shutil.move(str(temp_path), str(self.file_path))
            except Exception as e:
                print(f"Error saving data store: {e}")
                if temp_path.exists():
                    try:
                        temp_path.unlink()
                    except Exception:
                        pass

    def seed_defaults(self):
        with self.lock:
            # Seed Tuko Bot
            bot_id = "u_tukobot"
            if bot_id not in self.data["users"]:
                bot_user = {
                    "id": bot_id,
                    "username": "tukobot",
                    "display_name": "Tuko Assistant",
                    "email": "bot@tukochat.internal",
                    "password_hash": hash_password("tuko_system_bot_password_secure"),
                    "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=TukoAssistant",
                    "bio": "Official Tuko Chat Assistant. Ask me anything or test your calls and messaging!",
                    "presence": "online",
                    "status_mood": "🤖 Always here to help",
                    "last_seen": datetime.now(timezone.utc).isoformat(),
                    "settings": {"theme": "dark", "accent": "violet", "sound_enabled": True},
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                self.data["users"][bot_id] = bot_user
                self.data["usernames"]["tukobot"] = bot_id

            # Seed default communities
            comm_id = "comm_official_hub"
            if comm_id not in self.data["communities"]:
                self.data["communities"][comm_id] = {
                    "id": comm_id,
                    "name": "Tuko Global Lounge",
                    "description": "The official community for Tuko Chat! Meet members, discuss ideas, and jump into voice rooms.",
                    "icon": "✨",
                    "owner_id": bot_id,
                    "invite_code": "TUKO-VIP",
                    "channels": [
                        {"id": "chan_general", "name": "general-chat", "type": "text", "topic": "Open discussions, intros and general banter", "is_default": True},
                        {"id": "chan_tech", "name": "tech-and-code", "type": "text", "topic": "React, Python, WebSockets, APIs & UI/UX", "is_default": False},
                        {"id": "chan_announcements", "name": "announcements", "type": "text", "topic": "Official updates and release notes", "is_default": False},
                        {"id": "chan_voice_lounge", "name": "Lounge Voice ☕", "type": "voice", "topic": "Casual voice room for chilling", "is_default": False},
                        {"id": "chan_voice_dev", "name": "Dev Standup 💻", "type": "voice", "topic": "Collaboration and pair programming voice", "is_default": False}
                    ],
                    "members": [
                        {"user_id": bot_id, "role": "owner", "joined_at": datetime.now(timezone.utc).isoformat()}
                    ],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }

                # Seed welcome messages in general
                welcome_msg_id = "cmsg_welcome_01"
                self.data["channel_messages"][welcome_msg_id] = {
                    "id": welcome_msg_id,
                    "community_id": comm_id,
                    "channel_id": "chan_general",
                    "sender_id": bot_id,
                    "sender_name": "Tuko Assistant",
                    "sender_avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=TukoAssistant",
                    "text": "Welcome to **Tuko Chat**! 🚀\nExperience lightning-fast messaging, WebRTC voice/video calls, rich communities, audio voice notes, and modern aesthetics.\nFeel free to explore channels, start a direct message, or call a friend!",
                    "attachments": [],
                    "voice_note": None,
                    "reply_to": None,
                    "reactions": {"🔥": [bot_id], "❤️": [bot_id], "🚀": [bot_id]},
                    "pinned": True,
                    "is_edited": False,
                    "is_deleted": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }

            self.save()

    # --- USER METHODS ---
    def create_user(self, username: str, display_name: str, email: str, password_hash: str, avatar: str = "", bio: str = "") -> Dict[str, Any]:
        with self.lock:
            user_id = f"u_{uuid.uuid4().hex[:12]}"
            clean_username = username.strip().lower()
            if not avatar:
                avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={clean_username}"
            
            user = {
                "id": user_id,
                "username": clean_username,
                "display_name": display_name.strip() or username.strip(),
                "email": email.strip().lower(),
                "password_hash": password_hash,
                "avatar": avatar,
                "bio": bio.strip() or "Hey there! I am using Tuko Chat.",
                "presence": "online",
                "status_mood": "👋 Exploring Tuko",
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "settings": {
                    "theme": "dark",
                    "accent": "violet",
                    "sound_enabled": True,
                    "desktop_notifications": True
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            self.data["users"][user_id] = user
            self.data["usernames"][clean_username] = user_id

            # Auto-join default community
            default_comm = self.data["communities"].get("comm_official_hub")
            if default_comm:
                if not any(m["user_id"] == user_id for m in default_comm["members"]):
                    default_comm["members"].append({
                        "user_id": user_id,
                        "role": "member",
                        "joined_at": datetime.now(timezone.utc).isoformat()
                    })

            self.save()
            return user

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.data["users"].get(user_id)

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            uid = self.data["usernames"].get(username.strip().lower())
            if uid:
                return self.data["users"].get(uid)
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            clean_email = email.strip().lower()
            for u in self.data["users"].values():
                if u.get("email") == clean_email:
                    return u
            return None

    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self.lock:
            user = self.data["users"].get(user_id)
            if not user:
                return None
            for k in ["display_name", "avatar", "bio", "presence", "status_mood", "settings"]:
                if k in updates and updates[k] is not None:
                    if k == "settings" and isinstance(updates[k], dict):
                        user["settings"].update(updates[k])
                    else:
                        user[k] = updates[k]
            user["last_seen"] = datetime.now(timezone.utc).isoformat()
            self.save()
            return user

    def search_users(self, query: str, current_user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self.lock:
            q = query.strip().lower()
            results = []
            for u in self.data["users"].values():
                if u["id"] == current_user_id:
                    continue
                if q in u["username"].lower() or q in u["display_name"].lower():
                    results.append(self.sanitize_user(u))
                    if len(results) >= limit:
                        break
            return results

    def sanitize_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        if not user:
            return {}
        safe = dict(user)
        safe.pop("password_hash", None)
        return safe

    # --- FRIENDS METHODS ---
    def get_user_friends(self, user_id: str) -> List[Dict[str, Any]]:
        with self.lock:
            friends = []
            for f in self.data["friends"]:
                if f["status"] == "accepted" and (f["user1_id"] == user_id or f["user2_id"] == user_id):
                    other_id = f["user2_id"] if f["user1_id"] == user_id else f["user1_id"]
                    other_user = self.get_user_by_id(other_id)
                    if other_user:
                        friends.append({
                            "friendship_id": f["id"],
                            "user": self.sanitize_user(other_user),
                            "since": f.get("created_at")
                        })
            return friends

    def get_pending_friend_requests(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        with self.lock:
            incoming = []
            outgoing = []
            for f in self.data["friends"]:
                if f["status"] == "pending":
                    if f["user2_id"] == user_id: # incoming request
                        sender = self.get_user_by_id(f["user1_id"])
                        if sender:
                            incoming.append({"id": f["id"], "user": self.sanitize_user(sender), "created_at": f["created_at"]})
                    elif f["user1_id"] == user_id: # outgoing request
                        receiver = self.get_user_by_id(f["user2_id"])
                        if receiver:
                            outgoing.append({"id": f["id"], "user": self.sanitize_user(receiver), "created_at": f["created_at"]})
            return {"incoming": incoming, "outgoing": outgoing}

    def send_friend_request(self, sender_id: str, recipient_id: str) -> Dict[str, Any]:
        with self.lock:
            if sender_id == recipient_id:
                raise ValueError("You cannot friend request yourself.")
            
            # Check existing
            for f in self.data["friends"]:
                if (f["user1_id"] == sender_id and f["user2_id"] == recipient_id) or \
                   (f["user1_id"] == recipient_id and f["user2_id"] == sender_id):
                    if f["status"] == "accepted":
                        return {"status": "already_friends", "id": f["id"]}
                    if f["status"] == "pending":
                        return {"status": "request_pending", "id": f["id"]}
                    if f["status"] == "blocked":
                        raise ValueError("Cannot send request to this user.")

            req_id = f"fr_{uuid.uuid4().hex[:10]}"
            req = {
                "id": req_id,
                "user1_id": sender_id,
                "user2_id": recipient_id,
                "status": "pending",
                "action_by": sender_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            self.data["friends"].append(req)
            self.save()
            return {"status": "sent", "request": req}

    def respond_friend_request(self, user_id: str, request_id: str, action: str) -> bool:
        with self.lock:
            for f in self.data["friends"]:
                if f["id"] == request_id and f["user2_id"] == user_id and f["status"] == "pending":
                    if action == "accept":
                        f["status"] = "accepted"
                        self.save()
                        return True
                    elif action == "decline":
                        self.data["friends"].remove(f)
                        self.save()
                        return True
            return False

    def remove_friend(self, user_id: str, friend_id: str) -> bool:
        with self.lock:
            for f in list(self.data["friends"]):
                if (f["user1_id"] == user_id and f["user2_id"] == friend_id) or \
                   (f["user1_id"] == friend_id and f["user2_id"] == user_id):
                    self.data["friends"].remove(f)
                    self.save()
                    return True
            return False

    def block_user(self, user_id: str, target_id: str):
        with self.lock:
            self.remove_friend(user_id, target_id)
            block_id = f"blk_{uuid.uuid4().hex[:10]}"
            self.data["friends"].append({
                "id": block_id,
                "user1_id": user_id,
                "user2_id": target_id,
                "status": "blocked",
                "action_by": user_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            self.save()

    def unblock_user(self, user_id: str, target_id: str):
        with self.lock:
            for f in list(self.data["friends"]):
                if f["status"] == "blocked" and f["user1_id"] == user_id and f["user2_id"] == target_id:
                    self.data["friends"].remove(f)
                    self.save()
                    return True
            return False

    def get_blocked_users(self, user_id: str) -> List[Dict[str, Any]]:
        with self.lock:
            blocked = []
            for f in self.data["friends"]:
                if f["status"] == "blocked" and f["user1_id"] == user_id:
                    u = self.get_user_by_id(f["user2_id"])
                    if u:
                        blocked.append(self.sanitize_user(u))
            return blocked

    # --- DIRECT CONVERSATIONS (DMs) ---
    def get_or_create_dm(self, user1_id: str, user2_id: str) -> Dict[str, Any]:
        with self.lock:
            pair = sorted([user1_id, user2_id])
            conv_id = f"dm_{pair[0]}_{pair[1]}"
            if conv_id not in self.data["conversations"]:
                self.data["conversations"][conv_id] = {
                    "id": conv_id,
                    "participants": pair,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "last_message": None
                }
                self.save()
            return self.data["conversations"][conv_id]

    def get_user_conversations(self, user_id: str) -> List[Dict[str, Any]]:
        with self.lock:
            convs = []
            for c in self.data["conversations"].values():
                if user_id in c["participants"]:
                    other_id = c["participants"][1] if c["participants"][0] == user_id else c["participants"][0]
                    other_user = self.get_user_by_id(other_id)
                    if other_user:
                        conv_copy = dict(c)
                        conv_copy["other_user"] = self.sanitize_user(other_user)
                        convs.append(conv_copy)
            convs.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
            return convs

    def get_dm_messages(self, conv_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        with self.lock:
            msgs = [m for m in self.data["messages"].values() if m.get("conversation_id") == conv_id]
            msgs.sort(key=lambda x: x.get("created_at", ""))
            return msgs[-limit:]

    def add_dm_message(self, conv_id: str, sender_id: str, text: str, attachments: List = None, voice_note: Dict = None, reply_to: Dict = None) -> Dict[str, Any]:
        with self.lock:
            user = self.get_user_by_id(sender_id)
            msg_id = f"msg_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{uuid.uuid4().hex[:6]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            
            msg = {
                "id": msg_id,
                "conversation_id": conv_id,
                "sender_id": sender_id,
                "sender_name": user.get("display_name", "User") if user else "User",
                "sender_avatar": user.get("avatar", "") if user else "",
                "text": text,
                "attachments": attachments or [],
                "voice_note": voice_note,
                "reply_to": reply_to,
                "reactions": {},
                "pinned": False,
                "is_edited": False,
                "is_deleted": False,
                "created_at": now_iso
            }
            self.data["messages"][msg_id] = msg
            
            if conv_id in self.data["conversations"]:
                self.data["conversations"][conv_id]["updated_at"] = now_iso
                preview_text = text
                if not preview_text and voice_note:
                    preview_text = "🎤 Voice note"
                elif not preview_text and attachments:
                    preview_text = f"📎 Attachment ({len(attachments)})"
                self.data["conversations"][conv_id]["last_message"] = {
                    "id": msg_id,
                    "sender_id": sender_id,
                    "text": preview_text[:60],
                    "created_at": now_iso
                }
            self.save()
            return msg

    def react_to_message(self, msg_id: str, user_id: str, emoji: str, is_channel: bool = False) -> Dict[str, Any]:
        with self.lock:
            store_dict = self.data["channel_messages"] if is_channel else self.data["messages"]
            msg = store_dict.get(msg_id)
            if not msg:
                raise ValueError("Message not found")
            if "reactions" not in msg:
                msg["reactions"] = {}
            if emoji not in msg["reactions"]:
                msg["reactions"][emoji] = []
            
            if user_id in msg["reactions"][emoji]:
                msg["reactions"][emoji].remove(user_id)
                if len(msg["reactions"][emoji]) == 0:
                    del msg["reactions"][emoji]
            else:
                msg["reactions"][emoji].append(user_id)
            self.save()
            return {"message_id": msg_id, "reactions": msg["reactions"]}

    def edit_message(self, msg_id: str, user_id: str, new_text: str, is_channel: bool = False) -> Dict[str, Any]:
        with self.lock:
            store_dict = self.data["channel_messages"] if is_channel else self.data["messages"]
            msg = store_dict.get(msg_id)
            if not msg:
                raise ValueError("Message not found")
            if msg["sender_id"] != user_id:
                raise ValueError("Not authorized to edit this message")
            msg["text"] = new_text
            msg["is_edited"] = True
            self.save()
            return msg

    def delete_message(self, msg_id: str, user_id: str, is_channel: bool = False) -> Dict[str, Any]:
        with self.lock:
            store_dict = self.data["channel_messages"] if is_channel else self.data["messages"]
            msg = store_dict.get(msg_id)
            if not msg:
                raise ValueError("Message not found")
            if msg["sender_id"] != user_id:
                raise ValueError("Not authorized to delete this message")
            msg["text"] = "This message was deleted."
            msg["is_deleted"] = True
            msg["attachments"] = []
            msg["voice_note"] = None
            self.save()
            return msg

    def toggle_pin_message(self, msg_id: str, is_channel: bool = False) -> Dict[str, Any]:
        with self.lock:
            store_dict = self.data["channel_messages"] if is_channel else self.data["messages"]
            msg = store_dict.get(msg_id)
            if not msg:
                raise ValueError("Message not found")
            msg["pinned"] = not msg.get("pinned", False)
            self.save()
            return msg

    # --- COMMUNITIES & CHANNELS ---
    def get_user_communities(self, user_id: str) -> List[Dict[str, Any]]:
        with self.lock:
            results = []
            for c in self.data["communities"].values():
                if any(m["user_id"] == user_id for m in c.get("members", [])):
                    results.append(c)
            return results

    def get_discoverable_communities(self, user_id: str) -> List[Dict[str, Any]]:
        with self.lock:
            results = []
            for c in self.data["communities"].values():
                is_member = any(m["user_id"] == user_id for m in c.get("members", []))
                c_copy = dict(c)
                c_copy["is_joined"] = is_member
                c_copy["member_count"] = len(c.get("members", []))
                results.append(c_copy)
            return results

    def get_community_by_id(self, comm_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.data["communities"].get(comm_id)

    def create_community(self, user_id: str, name: str, description: str, icon: str = "💬") -> Dict[str, Any]:
        with self.lock:
            comm_id = f"comm_{uuid.uuid4().hex[:10]}"
            invite_code = f"TUKO-{secrets.token_hex(3).upper()}"
            comm = {
                "id": comm_id,
                "name": name.strip(),
                "description": description.strip(),
                "icon": icon.strip() or "💬",
                "owner_id": user_id,
                "invite_code": invite_code,
                "channels": [
                    {"id": f"chan_{uuid.uuid4().hex[:6]}", "name": "general", "type": "text", "topic": "General chat", "is_default": True},
                    {"id": f"chan_{uuid.uuid4().hex[:6]}", "name": "voice-lounge", "type": "voice", "topic": "Voice room", "is_default": False}
                ],
                "members": [
                    {"user_id": user_id, "role": "owner", "joined_at": datetime.now(timezone.utc).isoformat()}
                ],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            self.data["communities"][comm_id] = comm
            self.save()
            return comm

    def join_community_by_invite(self, user_id: str, invite_code: str) -> Dict[str, Any]:
        with self.lock:
            clean_code = invite_code.strip().upper()
            target_comm = None
            for c in self.data["communities"].values():
                if c.get("invite_code", "").upper() == clean_code:
                    target_comm = c
                    break
            if not target_comm:
                raise ValueError("Invalid invitation code")

            if not any(m["user_id"] == user_id for m in target_comm["members"]):
                target_comm["members"].append({
                    "user_id": user_id,
                    "role": "member",
                    "joined_at": datetime.now(timezone.utc).isoformat()
                })
                self.save()
            return target_comm

    def add_channel_to_community(self, comm_id: str, name: str, channel_type: str = "text", topic: str = "") -> Dict[str, Any]:
        with self.lock:
            comm = self.data["communities"].get(comm_id)
            if not comm:
                raise ValueError("Community not found")
            chan_id = f"chan_{uuid.uuid4().hex[:6]}"
            cleaned_name = name.strip().lower().replace(" ", "-")
            chan = {
                "id": chan_id,
                "name": cleaned_name,
                "type": channel_type,
                "topic": topic.strip(),
                "is_default": False
            }
            comm["channels"].append(chan)
            self.save()
            return chan

    def get_channel_messages(self, comm_id: str, channel_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        with self.lock:
            msgs = [
                m for m in self.data["channel_messages"].values()
                if m.get("community_id") == comm_id and m.get("channel_id") == channel_id
            ]
            msgs.sort(key=lambda x: x.get("created_at", ""))
            return msgs[-limit:]

    def add_channel_message(self, comm_id: str, channel_id: str, sender_id: str, text: str, attachments: List = None, voice_note: Dict = None, reply_to: Dict = None) -> Dict[str, Any]:
        with self.lock:
            user = self.get_user_by_id(sender_id)
            msg_id = f"cmsg_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{uuid.uuid4().hex[:6]}"
            now_iso = datetime.now(timezone.utc).isoformat()
            
            msg = {
                "id": msg_id,
                "community_id": comm_id,
                "channel_id": channel_id,
                "sender_id": sender_id,
                "sender_name": user.get("display_name", "User") if user else "User",
                "sender_avatar": user.get("avatar", "") if user else "",
                "text": text,
                "attachments": attachments or [],
                "voice_note": voice_note,
                "reply_to": reply_to,
                "reactions": {},
                "pinned": False,
                "is_edited": False,
                "is_deleted": False,
                "created_at": now_iso
            }
            self.data["channel_messages"][msg_id] = msg
            self.save()
            return msg

    # --- NOTIFICATIONS ---
    def create_notification(self, user_id: str, notif_type: str, title: str, body: str, data: Dict = None) -> Dict[str, Any]:
        with self.lock:
            notif_id = f"notif_{uuid.uuid4().hex[:10]}"
            notif = {
                "id": notif_id,
                "user_id": user_id,
                "type": notif_type,
                "title": title,
                "body": body,
                "data": data or {},
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            self.data["notifications"][notif_id] = notif
            self.save()
            return notif

    def get_user_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        with self.lock:
            notifs = [n for n in self.data["notifications"].values() if n.get("user_id") == user_id]
            notifs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return notifs[:50]

    def mark_notification_read(self, notif_id: str, user_id: str) -> bool:
        with self.lock:
            notif = self.data["notifications"].get(notif_id)
            if notif and notif.get("user_id") == user_id:
                notif["read"] = True
                self.save()
                return True
            return False

    def mark_all_notifications_read(self, user_id: str):
        with self.lock:
            for notif in self.data["notifications"].values():
                if notif.get("user_id") == user_id:
                    notif["read"] = True
            self.save()

    def clear_notifications(self, user_id: str):
        with self.lock:
            to_del = [k for k, v in self.data["notifications"].items() if v.get("user_id") == user_id]
            for k in to_del:
                del self.data["notifications"][k]
            self.save()

    # --- CALL LOGS ---
    def add_call_log(self, caller_id: str, receiver_id: str, call_type: str, status: str, duration_seconds: int = 0) -> Dict[str, Any]:
        with self.lock:
            log_entry = {
                "id": f"call_{uuid.uuid4().hex[:10]}",
                "caller_id": caller_id,
                "receiver_id": receiver_id,
                "call_type": call_type,
                "status": status,
                "duration_seconds": duration_seconds,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            self.data["call_logs"].append(log_entry)
            self.save()
            return log_entry

    def get_user_call_history(self, user_id: str) -> List[Dict[str, Any]]:
        with self.lock:
            history = []
            for log in self.data["call_logs"]:
                if log["caller_id"] == user_id or log["receiver_id"] == user_id:
                    is_outgoing = log["caller_id"] == user_id
                    partner_id = log["receiver_id"] if is_outgoing else log["caller_id"]
                    partner = self.get_user_by_id(partner_id)
                    history.append({
                        **log,
                        "is_outgoing": is_outgoing,
                        "partner": self.sanitize_user(partner) if partner else None
                    })
            history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return history[:50]

data_store = DataStore()
