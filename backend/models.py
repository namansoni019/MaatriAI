from sqlalchemy import Column, String, Integer, Float, Boolean, JSON
from database import Base

class ASHAWorker(Base):
    __tablename__ = "asha_workers"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    village = Column(String)
    district = Column(String)
    state = Column(String)
    preferred_language = Column(String, default="hi")
    pin_hash = Column(String, nullable=False)

class Mother(Base):
    __tablename__ = "mothers"

    id = Column(String, primary_key=True, index=True)
    ashaId = Column(String, index=True)
    name = Column(String)
    age = Column(Integer)
    village = Column(String)
    district = Column(String)
    state = Column(String)
    weeksPregnant = Column(Integer)
    parity = Column(Integer)
    hemoglobin = Column(Float)
    systolicBP = Column(Integer)
    diastolicBP = Column(Integer)
    bloodSugar = Column(Float)
    bmi = Column(Float)
    height = Column(Float)
    weight = Column(Float)
    riskTier = Column(String)
    riskScore = Column(Integer)
    phone = Column(String)
    abhaId = Column(String)
    lastVisitDate = Column(String, nullable=True)
    nextVisitDate = Column(String, nullable=True)
    isSynced = Column(Boolean, default=True)
    createdAt = Column(String)
    updatedAt = Column(String)

class Visit(Base):
    __tablename__ = "visits"

    id = Column(String, primary_key=True, index=True)
    motherId = Column(String, index=True)
    ashaId = Column(String, index=True)
    visitDate = Column(String)
    visitType = Column(String)
    findings = Column(String)
    riskScoreAtVisit = Column(Integer)
    riskTierAtVisit = Column(String)
    dangerSignsFound = Column(JSON)
    actionTaken = Column(String)
    referralMade = Column(Boolean)
    referralLocation = Column(String, nullable=True)
    isSynced = Column(Boolean, default=True)
    createdAt = Column(String)

class Newborn(Base):
    __tablename__ = "newborns"

    id = Column(String, primary_key=True, index=True)
    motherId = Column(String, index=True)
    ashaId = Column(String, index=True)
    dateOfBirth = Column(String)
    gender = Column(String)
    birthWeight = Column(Float)
    estimatedWeight = Column(Float)
    jaundiceRisk = Column(String)
    breathingStatus = Column(String)
    nutritionStatus = Column(String)
    breastfeedingStatus = Column(Boolean)
    immunisationsDue = Column(JSON)
    isSynced = Column(Boolean, default=True)
    createdAt = Column(String)
