# Real-Time Chat System - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Docker Desktop installed and running
- Git (optional)

### Start the Application

1. **Open PowerShell in the project directory:**
   ```powershell
   cd d:\Projects\ChatSystem
   ```

2. **Start all services with Docker Compose:**
   ```powershell
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL (port 5432)
   - MongoDB (port 27017)
   - Redis (port 6379)
   - Backend API (port 8000)
   - Frontend (port 5173)

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

4. **Create test accounts:**
   - Register 2-3 users through the UI
   - Login with different users in different browsers
   - Start chatting in real-time!

### Stop the Application
```powershell
docker-compose down
```

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 📚 What You Built

### Architecture
```
Frontend (React + Vite)
    ↕ HTTP & WebSocket
Backend (FastAPI)
    ↕
PostgreSQL (Users) + MongoDB (Messages) + Redis (Cache/PubSub)
```

### Key Features
✅ User Registration & Authentication (JWT)
✅ Real-time messaging via WebSockets
✅ Online/Offline status
✅ Typing indicators
✅ Message history
✅ Read receipts
✅ Beautiful, responsive UI

### Tech Stack Highlights

**Backend:**
- FastAPI for high-performance async API
- WebSockets for real-time communication
- PostgreSQL for user data with SQLAlchemy ORM
- MongoDB for scalable message storage
- Redis for caching and pub/sub
- JWT for secure authentication

**Frontend:**
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- Zustand for state management
- Native WebSocket API

## 🔧 Development Tips

### Run without Docker (for development)

**Backend:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Make sure PostgreSQL, MongoDB, and Redis are running
uvicorn app.main:app --reload
```

**Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

### Database Access

**PostgreSQL:**
```powershell
docker exec -it chat_postgres psql -U chatuser -d chatdb
```

**MongoDB:**
```powershell
docker exec -it chat_mongodb mongosh -u chatuser -p chatpassword
```

**Redis:**
```powershell
docker exec -it chat_redis redis-cli
```

## 🎓 Learning Points

### System Design Concepts
1. **WebSocket vs HTTP:** Real-time bidirectional communication
2. **Database Selection:** SQL for structured data, NoSQL for flexible/scalable data
3. **Caching Strategy:** Redis for fast user presence lookups
4. **Authentication:** JWT token-based auth with secure password hashing
5. **Microservices:** Each database service is independent and scalable

### Key Patterns
- **Repository Pattern:** Clean separation of data access
- **Service Layer:** Business logic separated from routes
- **State Management:** Centralized state with Zustand
- **Real-time Updates:** Event-driven architecture with WebSockets

### Security Features
- Password hashing with bcrypt
- JWT tokens with expiration
- CORS configuration
- Input validation with Pydantic
- SQL injection protection via ORM

## 🐛 Troubleshooting

**Problem:** Services won't start
```powershell
# Clean everything and rebuild
docker-compose down -v
docker-compose up --build
```

**Problem:** Port already in use
```powershell
# Change ports in docker-compose.yml
# Example: "8001:8000" instead of "8000:8000"
```

**Problem:** Frontend can't connect to backend
- Check that backend is running on port 8000
- Verify CORS settings in backend/app/main.py
- Check browser console for errors

## 📖 Next Steps to Enhance

1. **Group Chats:** Add multi-user conversations
2. **File Sharing:** Upload and share images/files
3. **Notifications:** Push notifications for offline users
4. **Message Reactions:** Add emoji reactions
5. **Search:** Search message history
6. **User Profiles:** Add avatars and status messages
7. **End-to-End Encryption:** Secure message content
8. **Message Editing/Deletion:** Full message management
9. **Voice/Video Calls:** WebRTC integration
10. **Mobile App:** React Native version

## 🌟 Resources

- FastAPI Docs: https://fastapi.tiangolo.com
- React Docs: https://react.dev
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- Docker Compose: https://docs.docker.com/compose/

Enjoy building and learning! 🎉
