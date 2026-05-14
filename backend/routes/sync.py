from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter()

@router.post("/sync", response_model=schemas.SyncBatchResponse)
def sync_data(batch: schemas.SyncBatchRequest, db: Session = Depends(get_db)):
    response = schemas.SyncBatchResponse(
        success=False,
        mothersSynced=0,
        visitsSynced=0,
        newbornsSynced=0,
        errors=[]
    )
    
    try:
        # Upsert Mothers
        for m_data in batch.mothers:
            db_mother = db.query(models.Mother).filter(models.Mother.id == m_data.id).first()
            if db_mother:
                for key, value in m_data.model_dump().items():
                    setattr(db_mother, key, value)
            else:
                db_mother = models.Mother(**m_data.model_dump())
                db.add(db_mother)
            response.mothersSynced += 1

        # Upsert Visits
        for v_data in batch.visits:
            db_visit = db.query(models.Visit).filter(models.Visit.id == v_data.id).first()
            if db_visit:
                for key, value in v_data.model_dump().items():
                    setattr(db_visit, key, value)
            else:
                db_visit = models.Visit(**v_data.model_dump())
                db.add(db_visit)
            response.visitsSynced += 1

        # Upsert Newborns
        for n_data in batch.newborns:
            db_newborn = db.query(models.Newborn).filter(models.Newborn.id == n_data.id).first()
            if db_newborn:
                for key, value in n_data.model_dump().items():
                    setattr(db_newborn, key, value)
            else:
                db_newborn = models.Newborn(**n_data.model_dump())
                db.add(db_newborn)
            response.newbornsSynced += 1
            
        db.commit()
        response.success = True
        
    except Exception as e:
        db.rollback()
        response.errors.append(str(e))
        
    return response

@router.get("/mothers/{asha_id}", response_model=List[schemas.MotherResponse])
def get_mothers(asha_id: str, db: Session = Depends(get_db)):
    mothers = db.query(models.Mother).filter(models.Mother.ashaId == asha_id).all()
    return mothers
