import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.core.config import UPLOAD_DIR
from app.core.security import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

ALLOWED_EXTENSIONS = {
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    # Audio
    ".webm", ".mp3", ".wav", ".ogg", ".m4a",
    # Documents
    ".pdf", ".txt", ".md", ".doc", ".docx", ".zip", ".json"
}

@router.post("")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        # Default fallback for audio recording blob which might come as webm/audio
        if file.content_type and "audio" in file.content_type:
            ext = ".webm"
        elif file.content_type and "image" in file.content_type:
            ext = ".png"
        else:
            ext = ".bin"

    unique_filename = f"{uuid.uuid4().hex[:12]}_{Path(file.filename).stem[:20]}{ext}"
    target_path = UPLOAD_DIR / unique_filename

    total_bytes = 0
    with open(target_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_SIZE:
                target_path.unlink(missing_ok=True)
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 25MB limit")
            buffer.write(chunk)

    file_url = f"/uploads/{unique_filename}"
    return {
        "url": file_url,
        "name": file.filename or unique_filename,
        "size": total_bytes,
        "content_type": file.content_type or "application/octet-stream"
    }
