from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.schemas import ProfileUpdate, UserResponse
from app.services.auth import get_current_user
import os
import shutil
import uuid
from pathlib import Path

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = Path("uploads/profile_pictures")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload or update user's profile picture"""
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Seek back to start
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Delete old profile picture if exists
    if current_user.profile_picture:
        old_file_path = Path("uploads") / current_user.profile_picture
        if old_file_path.exists():
            old_file_path.unlink()
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Update user's profile picture in database
    relative_path = f"profile_pictures/{unique_filename}"
    current_user.profile_picture = relative_path
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture": relative_path
    }


@router.delete("/delete-picture")
async def delete_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user's profile picture"""
    
    if not current_user.profile_picture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile picture to delete"
        )
    
    # Delete file from filesystem
    file_path = Path("uploads") / current_user.profile_picture
    if file_path.exists():
        file_path.unlink()
    
    # Remove from database
    current_user.profile_picture = None
    db.commit()
    
    return {"message": "Profile picture deleted successfully"}


@router.put("/update", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's profile (status message and bio)"""
    
    # Validate lengths
    if profile_data.status_message and len(profile_data.status_message) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status message must be 100 characters or less"
        )
    
    if profile_data.bio and len(profile_data.bio) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bio must be 500 characters or less"
        )
    
    # Update fields
    if profile_data.status_message is not None:
        current_user.status_message = profile_data.status_message if profile_data.status_message else None
    
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio if profile_data.bio else None
    
    db.commit()
    db.refresh(current_user)
    
    return current_user
