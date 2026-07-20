# 🚀 TUKO Chat Application

A modern, real-time chat application with AI integration, built with React (frontend) and Python (backend). Connect with others instantly and interact with our intelligent Tuko AI assistant.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [WebSocket Features](#websocket-features)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Core Features
- 🔐 **User Authentication** - Secure registration and login with JWT tokens
- 💬 **Real-time Chat** - Instant messaging with WebSocket support
- 🤖 **AI Integration** - Chat with Tuko AI for intelligent conversations
- 👥 **User Status** - See who's online/offline
- 📱 **Responsive Design** - Mobile-first approach with Tailwind CSS
- 🌙 **Dark Mode Support** - Comfortable viewing in low-light environments
- 📨 **Message History** - Persistent message storage and retrieval

### Advanced Features
- WebSocket real-time communication
- Session-based chat management
- Gradient UI with glassmorphism effects
- Touch-friendly mobile interface (44px targets)
- Safe area support for notched devices (iOS)
- Performance optimized with lazy loading

---

## 🛠️ Tech Stack

### Frontend
- **React** (75.6%) - UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **WebSockets** - Real-time bidirectional communication
- **Axios** - HTTP client for API calls
- **React Router** - Client-side routing

### Backend
- **Python** (16.2%) - Server language
- **FastAPI** - Modern web framework
- **WebSockets** - Real-time communication protocol
- **JWT** - Authentication tokens
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation

### Database
- **PostgreSQL** or **SQLite** (configurable)

---

## 📁 Project Structure

```
TUKO-chat-application-by-TANU/
├── frontend/                    # React application
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── App.js              # Main app component
│   │   ├── App.css             # Global styles
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   └── ChatInterface.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── backend/                     # Python backend
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt        # Python dependencies
│   ├── models/                 # Database models
│   ├── routes/                 # API endpoints
│   └── config.py               # Configuration
├── backend_test.py             # Comprehensive backend test suite
├── test_result.md              # Test results documentation
├── RESPONSIVENESS_GUIDE.md     # Mobile responsiveness guide
└── README.md                   # This file
```

---

## 📦 Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (v16 or higher) and npm
- **Python** (v3.8 or higher)
- **Git**
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

---

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/tnuislostq/TUKO-chat-application-by-TANU.git
cd TUKO-chat-application-by-TANU
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (create .env file)
# Add the following:
# DATABASE_URL=sqlite:///./chat.db
# SECRET_KEY=your-secret-key-here
# ALGORITHM=HS256
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create .env file for API configuration
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env
echo "REACT_APP_WS_URL=ws://localhost:8000/ws" >> .env
```

---

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
# Or with Uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

### Start Frontend Development Server

```bash
cd frontend
npm start
```

Frontend will be available at: `http://localhost:3000`

### Access the Application

Open your browser and navigate to: **http://localhost:3000**

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout/{user_id}` - Logout user

### Chat
- `POST /api/chat/ai` - Send message to AI
- `GET /api/chat/messages/{chat_session_id}` - Get chat history
- `GET /api/health` - Health check endpoint

### WebSocket
- `WS /ws/{client_id}` - WebSocket connection for real-time messaging

---

## 💬 WebSocket Features

### Connection
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/unique-client-id');

// Send message
ws.send(JSON.stringify({
  user_id: 'user-id',
  username: 'username',
  content: 'message content',
  chat_session_id: 'session-id'
}));

// Receive message
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message received:', data);
};
```

### Message Format
```json
{
  "type": "message",
  "data": {
    "id": "message-id",
    "user_id": "user-id",
    "username": "username",
    "content": "message content",
    "timestamp": "2024-01-01T12:00:00Z",
    "is_ai": false,
    "chat_session_id": "session-id"
  }
}
```

---

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
python ../backend_test.py
```

### Test Coverage

The backend test suite includes:
- ✅ Health check
- ✅ User registration
- ✅ Duplicate registration prevention
- ✅ User login
- ✅ Invalid login prevention
- ✅ AI chat integration
- ✅ Chat message retrieval
- ✅ WebSocket connection
- ✅ User logout

View detailed test results in `test_result.md`

### Frontend Testing

```bash
cd frontend
npm test
```

---

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Breakpoints: 320px, 640px, 768px, 1024px, 1280px, 1536px
- Safe area support for notched devices (iPhone X+, Android)
- Touch-friendly 44px minimum targets
- Fluid typography (clamp-based sizing)

See `RESPONSIVENESS_GUIDE.md` for detailed mobile optimization guide.

---

## 🚢 Deployment

### Frontend Deployment (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy the 'build' folder
```

### Backend Deployment (Heroku/Railway/Render)

```bash
# Create Procfile in root
echo "web: python main.py" > Procfile

# Deploy using your hosting platform
heroku create your-app-name
git push heroku main
```

### Environment Variables for Production
```
DATABASE_URL=postgresql://user:password@host/dbname
SECRET_KEY=your-production-secret-key
ALGORITHM=HS256
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Author

**Tanu Kumari Vishwakarma**
- GitHub: [@tnuislostq](https://github.com/tnuislostq)

---

## 📞 Support & Contact

For issues, questions, or suggestions:
- Open an [Issue](https://github.com/tnuislostq/TUKO-chat-application-by-TANU/issues)
- Check existing documentation and guides

---

## 🎯 Roadmap

- [ ] Voice messaging support
- [ ] File sharing functionality
- [ ] Group chat support
- [ ] User profiles and avatars
- [ ] Message reactions and emojis
- [ ] Message encryption
- [ ] Mobile native apps (iOS/Android)
- [ ] Advanced AI features

---

## 🙏 Acknowledgments

- FastAPI for amazing backend framework
- React for flexible UI library
- Tailwind CSS for beautiful styling
- OpenAI for AI integration capabilities

---

**Happy Chatting! 🎉**

For the latest updates and features, visit: https://github.com/tnuislostq/TUKO-chat-application-by-TANU
