from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db, get_mongodb
from app.models.user import User
from app.models.schemas import MessageCreate, MessageResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Messages"])


@router.get("/history/{user_id}", response_model=List[MessageResponse])
async def get_message_history(
    user_id: int,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get message history between current user and another user"""
    mongodb = get_mongodb()
    messages_collection = mongodb["messages"]
    
    # Check if user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get messages between current user and target user
    messages = messages_collection.find({
        "$or": [
            {"sender_id": current_user.id, "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user.id}
        ]
    }).sort("timestamp", -1).limit(limit)
    
    result = []
    for msg in messages:
        result.append({
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "receiver_id": msg["receiver_id"],
            "content": msg["content"],
            "timestamp": msg["timestamp"],
            "is_read": msg.get("is_read", False)
        })
    
    # Return messages in chronological order
    return list(reversed(result))


@router.patch("/{message_id}/read")
async def mark_message_as_read(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark message as read"""
    from bson import ObjectId
    mongodb = get_mongodb()
    messages_collection = mongodb["messages"]
    
    try:
        result = messages_collection.update_one(
            {"_id": ObjectId(message_id), "receiver_id": current_user.id},
            {"$set": {"is_read": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        return {"message": "Message marked as read"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID"
        )
