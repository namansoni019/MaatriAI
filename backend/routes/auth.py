import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from database import get_db
import models
import schemas

router = APIRouter()

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)

@router.post("/register")
def register(worker: schemas.ASHARegister, db: Session = Depends(get_db)):
    # Generate unique 9 char ID for ASHA worker similar to our app logic
    new_id = str(uuid.uuid4())[:9]
    
    db_worker = models.ASHAWorker(
        id=new_id,
        name=worker.name,
        phone=worker.phone,
        village=worker.village,
        district=worker.district,
        state=worker.state,
        preferred_language=worker.preferredLanguage,
        pin_hash=get_password_hash(worker.pin)
    )
    
    db.add(db_worker)
    try:
        db.commit()
        db.refresh(db_worker)
        return {"success": True, "ashaId": new_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@router.post("/login")
def login(creds: schemas.ASHALogin, db: Session = Depends(get_db)):
    worker = db.query(models.ASHAWorker).filter(models.ASHAWorker.id == creds.id).first()
    
    if not worker or not verify_password(creds.pin, worker.pin_hash):
        return {"success": False, "error": "Invalid ASHA ID or PIN"}
        
    return {
        "success": True, 
        "ashaId": worker.id, 
        "name": worker.name,
        "phone": worker.phone,
        "village": worker.village,
        "preferredLanguage": worker.preferred_language
    }
