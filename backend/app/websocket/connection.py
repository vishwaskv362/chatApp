from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict, Set
from datetime import datetime
import json
from app.database import get_db, get_mongodb, get_redis
from app.models.user import User
from app.services.auth import get_current_user
from jose import jwt, JWTError
from app.config import settings


class ConnectionManager:
    def __init__(self):
        # Store active connections: {user_id: websocket}
        self.active_connections: Dict[int, WebSocket] = {}
        # Store typing status: {user_id: set of user_ids they're typing to}
        self.typing_users: Dict[int, Set[int]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Connect a user"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
        # Broadcast user online status
        await self.broadcast_user_status(user_id, True)
    
    def disconnect(self, user_id: int):
        """Disconnect a user"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.typing_users:
            del self.typing_users[user_id]
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to specific user"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)
    
    async def broadcast_user_status(self, user_id: int, is_online: bool):
        """Broadcast user online/offline status to all connected users"""
        status_message = {
            "type": "user_status",
            "user_id": user_id,
            "is_online": is_online
        }
        
        for uid, websocket in self.active_connections.items():
            if uid != user_id:
                await websocket.send_json(status_message)
    
    async def handle_typing_indicator(self, sender_id: int, receiver_id: int, is_typing: bool):
        """Handle typing indicator"""
        typing_message = {
            "type": "typing_indicator",
            "sender_id": sender_id,
            "is_typing": is_typing
        }
        
        await self.send_personal_message(typing_message, receiver_id)


manager = ConnectionManager()


def get_user_from_token(token: str, db: Session) -> User:
    """Extract user from JWT token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        
        user = db.query(User).filter(User.username == username).first()
        return user
    except JWTError:
        return None


async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time chat"""
    
    print(f"WebSocket connection attempt with token: {token[:20]}...")
    
    # Authenticate user
    user = get_user_from_token(token, db)
    if not user:
        print(f"Authentication failed for token")
        await websocket.close(code=1008)
        return
    
    print(f"User authenticated: {user.username} (ID: {user.id})")
    
    # Connect user
    await manager.connect(websocket, user.id)
    
    # Update user online status in database
    user.is_online = True
    db.commit()
    
    print(f"User {user.username} connected successfully")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            print(f"Received WebSocket message from {user.username}: {message_type}, data: {data}")
            
            if message_type == "message":
                # Handle chat message
                receiver_id = data.get("receiver_id")
                content = data.get("content")
                
                if not receiver_id or not content:
                    continue
                
                # Check if receiver exists
                receiver = db.query(User).filter(User.id == receiver_id).first()
                if not receiver:
                    continue
                
                # Save message to MongoDB
                mongodb = get_mongodb()
                messages_collection = mongodb["messages"]
                
                message_doc = {
                    "sender_id": user.id,
                    "receiver_id": receiver_id,
                    "content": content,
                    "timestamp": datetime.utcnow(),
                    "is_read": False,
                    "reactions": {}
                }
                
                result = messages_collection.insert_one(message_doc)
                message_doc["_id"] = str(result.inserted_id)
                
                # Send message to receiver if online
                message_payload = {
                    "type": "message",
                    "id": str(result.inserted_id),
                    "sender_id": user.id,
                    "sender_username": user.username,
                    "receiver_id": receiver_id,
                    "content": content,
                    "timestamp": message_doc["timestamp"].isoformat(),
                    "is_read": False
                }
                
                print(f"Sending message to receiver {receiver_id}: {message_payload}")
                # Send to receiver
                await manager.send_personal_message(message_payload, receiver_id)
                
                print(f"Sending confirmation to sender {user.id}")
                # Send confirmation to sender
                await manager.send_personal_message({
                    **message_payload,
                    "type": "message_sent"
                }, user.id)
            
            elif message_type == "typing":
                # Handle typing indicator
                receiver_id = data.get("receiver_id")
                is_typing = data.get("is_typing", False)
                
                if receiver_id:
                    await manager.handle_typing_indicator(user.id, receiver_id, is_typing)
            
            elif message_type == "read_receipt":
                # Handle read receipt
                message_id = data.get("message_id")
                if message_id:
                    # Update message in MongoDB
                    from bson import ObjectId
                    mongodb = get_mongodb()
                    messages_collection = mongodb["messages"]
                    
                    messages_collection.update_one(
                        {"_id": ObjectId(message_id), "receiver_id": user.id},
                        {"$set": {"is_read": True}}
                    )
                    
                    # Notify sender
                    message = messages_collection.find_one({"_id": ObjectId(message_id)})
                    if message:
                        await manager.send_personal_message({
                            "type": "read_receipt",
                            "message_id": message_id,
                            "reader_id": user.id
                        }, message["sender_id"])
            
            elif message_type == "reaction":
                # Handle message reaction
                message_id = data.get("message_id")
                emoji = data.get("emoji")
                
                if message_id and emoji:
                    from bson import ObjectId
                    mongodb = get_mongodb()
                    messages_collection = mongodb["messages"]
                    
                    # Get the message
                    message = messages_collection.find_one({"_id": ObjectId(message_id)})
                    if message:
                        # Initialize reactions if not exists
                        reactions = message.get("reactions", {})
                        
                        # Toggle reaction - if user already reacted with this emoji, remove it
                        user_id_str = str(user.id)
                        if user_id_str in reactions and reactions[user_id_str] == emoji:
                            # Remove reaction
                            del reactions[user_id_str]
                        else:
                            # Add or update reaction
                            reactions[user_id_str] = emoji
                        
                        # Update in database
                        messages_collection.update_one(
                            {"_id": ObjectId(message_id)},
                            {"$set": {"reactions": reactions}}
                        )
                        
                        # Notify both users
                        reaction_payload = {
                            "type": "reaction",
                            "message_id": message_id,
                            "user_id": user.id,
                            "emoji": emoji if user_id_str in reactions else None,
                            "reactions": reactions
                        }
                        
                        # Send to sender
                        await manager.send_personal_message(reaction_payload, message["sender_id"])
                        
                        # Send to receiver
                        await manager.send_personal_message(reaction_payload, message["receiver_id"])
    
    except WebSocketDisconnect:
        # Handle disconnect
        print(f"User {user.username} disconnected")
        manager.disconnect(user.id)
        user.is_online = False
        db.commit()
        
        # Broadcast user offline status
        await manager.broadcast_user_status(user.id, False)
    
    except Exception as e:
        print(f"WebSocket error for user {user.username}: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        manager.disconnect(user.id)
        user.is_online = False
        db.commit()
