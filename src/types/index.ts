// src/types/index.ts
export interface Mother {
  id: string;
  ashaId: string;
  name: string;
  age: number;
  village: string;
  district: string;
  state: string;
  weeksPregnant: number;
  parity: number;
  hemoglobin: number;
  systolicBP: number;
  diastolicBP: number;
  bloodSugar: number;
  bmi: number;
  height: number;
  weight: number;
  riskTier: 'GREEN' | 'AMBER' | 'RED';
  riskScore: number;
  phone: string;
  abhaId: string;
  lastVisitDate: string;
  nextVisitDate: string;
  isSynced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  motherId: string;
  ashaId: string;
  visitDate: string;
  visitType: 'ANC' | 'PNC' | 'NEWBORN';
  findings: string;
  riskScoreAtVisit: number;
  riskTierAtVisit: 'GREEN' | 'AMBER' | 'RED';
  dangerSignsFound: string[];
  actionTaken: string;
  referralMade: boolean;
  referralLocation: string;
  isSynced: boolean;
  createdAt: string;
}

export interface Newborn {
  id: string;
  motherId: string;
  ashaId: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  birthWeight: number;
  estimatedWeight: number;
  jaundiceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  breathingStatus: 'NORMAL' | 'ABNORMAL';
  nutritionStatus: 'NORMAL' | 'MAM' | 'SAM';
  breastfeedingStatus: boolean;
  immunisationsDue: string[];
  isSynced: boolean;
  createdAt: string;
}

export interface ASHAWorker {
  id: string;
  name: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  preferredLanguage: string;
  pin: string;
}
