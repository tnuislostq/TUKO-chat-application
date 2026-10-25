# 💬 TUKO CHAT — Modern Real-Time Messaging, Voice & Video Platform

A production-minded, full-stack communication platform combining the simplicity and elegance of **WhatsApp**-style personal messaging with the community, channel, and voice-room capabilities of **Discord**. Built with **FastAPI (Python)**, **WebSockets**, **WebRTC**, and **React 18 (Vite + Tailwind CSS)**. Ready for instant deployment on **Render**.

---

## 🚀 Live Demo
- **Live Application:** [https://tuko-chat.onrender.com/](https://tuko-chat.onrender.com/)
- **Backend API:** [https://tuko-backend.onrender.com](https://tuko-backend.onrender.com)

---

## ✨ Features

- 🎨 **Original Visual Design System:** Violet & lavender accents, deep navy dark mode, and clean white light mode with system preference support.
- ⚡ **Ultra-Fast Real-Time Messaging:** Direct messages (1-on-1) and Community channel messaging over WebSockets with optimistic delivery.
- 📞 **Real WebRTC Audio & Video Calling:**
  - One-to-one voice & video calling with ringing state, audio ringtones, participant grid, mute/unmute, camera toggle, and screen sharing.
  - Call logs and call-back action.
- 🔊 **Discord-Style Community Voice Rooms:** Drop into community voice channels (`🔊 Lounge Voice`, `🎮 Gaming Voice`) and talk with other members in real-time.
- 🎙️ **Voice Notes & Audio Player:** Browser MediaRecorder audio notes with visualizer, recording timer, and integrated custom audio player.
- 📎 **Attachments & File Sharing:** Drag-and-drop or select images, documents, and media with preview and safe download links.
- 👥 **Communities & Channels:**
  - Create and manage communities with custom names, descriptions, and emoji icons.
  - Multi-channel support (text & voice channels).
  - Shareable invitation codes (e.g. `TUKO-VIP`).
- 🤝 **Friends & Presence:**
  - Live presence indicators (Online, Away / Idle, Do Not Disturb, Offline).
  - Add friends by username, accept/decline requests, block and unblock users.
- 🔔 **In-App Notification Center:** Unread badges, mention alerts, friend request notifications, and mark-all-read.
- 🔍 **Global Search (`Ctrl+K`):** Search users, friends, communities, and conversations with instant jumping.
- ⚙️ **Comprehensive Settings:** Profile customization, avatar picker, theme switcher, microphone/camera device test, and notification sound toggles.
- 🧪 **100% Tested:** Comprehensive pytest test suite covering auth, friends, conversations, communities, calls, uploads, and notifications.

---

## 📁 Clean & Modular Architecture

```text
tuko-chat-application/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, JWT tokens, password hashing, security dependencies
│   │   ├── database/       # Unified data store with auto-seeding and persistent atomic writes
│   │   ├── routers/        # Modular routers: auth, friends, conversations, communities, calls, notifications, uploads
│   │   ├── websocket/      # Connection manager, presence dispatch & WebRTC signaling
│   │   └── main.py         # Root FastAPI app, static uploads mount & WebSocket endpoint
│   ├── tests/
│   │   ├── test_api.py     # Pytest unit & integration test suite
│   │   └── simulate_user.py# End-to-end user simulation test script
│   ├── requirements.txt
│   └── server.py           # Production runner for Render and local development
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── calls/      # ActiveCallModal, IncomingCallModal
    │   │   ├── chat/       # ChatArea, MessageItem, ChatInput, VoiceRecorder, AudioPlayer, EmojiPicker
    │   │   ├── layout/     # Compact Rail, TopBar, ContextPanel, TukoLogo
    │   │   ├── modals/     # AuthModal, SettingsModal, CreateCommunityModal, GlobalSearchModal, NewChatModal
    │   │   └── views/      # HomeView, DirectMessagesSidebar, CommunitiesSidebar, FriendsView, CallsView, NotificationsView
    │   ├── context/        # AuthContext, SocketContext, CallContext, ThemeContext
    │   ├── services/       # API client, Web Audio tone synthesizer
    │   ├── App.jsx         # App orchestration
    │   ├── index.css       # Tailwind directives & custom scrollbars
    │   └── main.jsx
    ├── public/
    │   ├── logo.png        # Official brand app icon
    │   ├── logo-full.png   # Full brand identity
    │   └── favicon.png     # Browser tab favicon
    ├── index.html
    ├── tailwind.config.js  # Violet / Lavender & Navy Dark tokens
    └── vite.config.js      # Optimized build and dev proxy
```

---

## 🛠️ Local Development

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python server.py
```
> Backend runs at `http://localhost:8000`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs at `http://localhost:3000`

### 3. Run Backend Unit Tests
```bash
cd backend
pytest -v
```

---

## 🌐 Deploy to Render

The repository includes `render.yaml` for 1-click zero-config deployment.

1. Create a Web Service for **backend** (`rootDir: backend`, `uvicorn server:app --host 0.0.0.0 --port $PORT`).
2. Create a Static Site for **frontend** (`rootDir: frontend`, build command: `npm install && npm run build`, publish dir: `dist`).
3. Set `VITE_BACKEND_URL` on the frontend pointing to your backend URL.
