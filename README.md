# Real-Time Chat System

A full-stack real-time chat application built with FastAPI, React, WebSockets, PostgreSQL, MongoDB, and Redis.

## Features

- 🔐 User Authentication (JWT)
- 💬 Real-time 1-on-1 messaging
- 👥 Online/Offline status
- ✍️ Typing indicators
- 📜 Message history
- ✅ Read receipts
- 🎨 Modern UI with TailwindCSS

## Tech Stack

### Backend
- FastAPI (Python web framework)
- WebSockets (Real-time communication)
- PostgreSQL (User data)
- MongoDB (Message storage)
- Redis (Caching & Pub/Sub)
- SQLAlchemy (ORM)
- JWT Authentication

### Frontend
- React + TypeScript
- Vite (Build tool)
- TailwindCSS (Styling)
- WebSocket API

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ChatSystem
```

2. Start all services with Docker Compose:
```bash
docker-compose up --build
```

3. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Without Docker

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
ChatSystem/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── models/      # Database models
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── websocket/   # WebSocket handlers
│   │   └── main.py      # Application entry
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API & WebSocket services
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

## Learning Resources

This project demonstrates:
- WebSocket real-time communication
- JWT authentication flow
- Database design for chat applications
- Docker containerization
- React state management
- RESTful API design

## License

MIT
