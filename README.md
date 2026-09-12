# 💬 TUKO | Modern Real-time Chat Application

A clean, production-ready, fully responsive chat application built with **FastAPI (Python)**, **WebSockets**, and **React 18 (Vite + Tailwind CSS)**. Ready for instant 1-click deployment on **Render**.

---

## 🚀 Live Demo
- **Live Application:** [Deploy your own on Render!](#-how-to-deploy-on-render)
- **Backend API:** `https://<your-backend>.onrender.com`

---

## ✨ Features

- ⚡ **Ultra-Fast Real-Time Messaging:** Powered by asynchronous Python WebSockets with auto-reconnect fallback.
- 📱 **100% Mobile Responsive:** Optimized with dynamic viewport height (`100dvh`) so mobile keyboards and navigation bars never hide the message input. Slide-over drawer on mobile screens.
- 🎯 **Multiple Channels / Rooms:** Easily switch between `#general`, `#tech`, `#casual`, and `#announcements`.
- 🎨 **Modern Dark Aesthetic:** Clean UI crafted with Tailwind CSS and Lucide icons.
- 💾 **Dual Storage Architecture:** Operates with in-memory cache out-of-the-box, or seamlessly persists to **MongoDB Atlas** when `MONGO_URL` is set.
- 🧹 **Zero Unwanted Code:** Completely free of starter boilerplate, unused dependencies, or dead files.

---

## 📁 Project Architecture

```text
TUKO-chat-application/
├── .gitignore             # Excludes node_modules, cache, and .env
├── render.yaml            # 1-Click Render blueprint
├── README.md              # Project documentation & live links
├── backend/
│   ├── requirements.txt   # Clean, verified production dependencies
│   └── server.py          # Dynamic PORT, CORS, and WebSocket manager
└── frontend/
    ├── package.json       # React 18, Vite, Tailwind CSS, Lucide icons
    ├── vite.config.js     # Optimized build configuration
    ├── index.html         # Responsive viewport setup
    └── src/
        ├── main.jsx       # React DOM root
        ├── App.jsx        # Full responsive chat UI with WebSocket hooks
        └── index.css      # Tailwind base & custom scrollbar styles
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
uvicorn server:app --reload --port 8000
```
Backend runs at: `http://localhost:8000`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:3000` (or `http://localhost:5173`)

---

## 🌐 How to Deploy on Render

### Step 1: Deploy Backend (Web Service)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository: `tnuislostq/TUKO-chat-application`.
3. Configure the following:
   - **Name:** `tuko-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Under **Environment Variables**:
   - (Optional) `MONGO_URL`: Your MongoDB Atlas URI.
5. Click **Deploy Web Service** and copy your backend URL (e.g. `https://tuko-backend.onrender.com`).

---

### Step 2: Deploy Frontend (Static Site)
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Select your repository: `tnuislostq/TUKO-chat-application`.
3. Configure the following:
   - **Name:** `tuko-chat`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Under **Environment Variables**:
   - `VITE_BACKEND_URL`: `https://tuko-backend.onrender.com` *(Your backend URL from Step 1)*
5. Click **Create Static Site**.

---

## 📜 License
MIT License. Built with ❤️ by [tnuislostq](https://github.com/tnuislostq).
