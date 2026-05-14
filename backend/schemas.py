from pydantic import BaseModel
from typing import List, Optional

# ASHA Worker
class ASHARegister(BaseModel):
    name: str
    phone: str
    pin: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    preferredLanguage: Optional[str] = "hi"

class ASHALogin(BaseModel):
    id: str
    pin: str

# Mother
class MotherCreate(BaseModel):
    id: str
    ashaId: str
    name: str
    age: int
    village: str
    district: str
    state: str
    weeksPregnant: int
    parity: int
    hemoglobin: float
    systolicBP: int
    diastolicBP: int
    bloodSugar: float
    bmi: float
    height: float
    weight: float
    riskTier: str
    riskScore: int
    phone: str
    abhaId: str
    lastVisitDate: Optional[str] = None
    nextVisitDate: Optional[str] = None
    isSynced: bool = True
    createdAt: str
    updatedAt: str

class MotherResponse(MotherCreate):
    pass

# Visit
class VisitCreate(BaseModel):
    id: str
    motherId: str
    ashaId: str
    visitDate: str
    visitType: str
    findings: str
    riskScoreAtVisit: int
    riskTierAtVisit: str
    dangerSignsFound: List[str]
    actionTaken: str
    referralMade: bool
    referralLocation: Optional[str] = None
    isSynced: bool = True
    createdAt: str

class VisitResponse(VisitCreate):
    pass

# Newborn
class NewbornCreate(BaseModel):
    id: str
    motherId: str
    ashaId: str
    dateOfBirth: str
    gender: str
    birthWeight: float
    estimatedWeight: float
    jaundiceRisk: str
    breathingStatus: str
    nutritionStatus: str
    breastfeedingStatus: bool
    immunisationsDue: List[str]
    isSynced: bool = True
    createdAt: str

class NewbornResponse(NewbornCreate):
    pass

# Sync specific
class SyncBatchRequest(BaseModel):
    ashaId: str
    mothers: List[MotherCreate]
    visits: List[VisitCreate]
    newborns: List[NewbornCreate]

class SyncBatchResponse(BaseModel):
    success: bool
    mothersSynced: int
    visitsSynced: int
    newbornsSynced: int
    errors: List[str]
