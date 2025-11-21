from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_online: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: 'UserResponse'


class TokenData(BaseModel):
    username: Optional[str] = None


class MessageCreate(BaseModel):
    receiver_id: int
    content: str


class MessageResponse(BaseModel):
    id: str
    sender_id: int
    receiver_id: int
    content: str
    timestamp: datetime
    is_read: bool
    reactions: Optional[dict] = {}
    
    class Config:
        from_attributes = True


class MessageReaction(BaseModel):
    message_id: str
    emoji: str


class TypingIndicator(BaseModel):
    receiver_id: int
    is_typing: bool
