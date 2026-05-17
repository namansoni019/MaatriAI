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
  
  // NEW COLUMNS
  status?: 'PREGNANT' | 'DELIVERED' | 'POSTPARTUM';
  deliveryDate?: string;
  deliveryType?: 'NORMAL' | 'CAESAREAN' | 'ASSISTED';
  deliveryComplications?: string;
  deliveryBabyWeight?: number;
}

export interface Visit {
  id: string;
  motherId: string;
  ashaId: string;
  visitDate: string;
  visitType?: 'ANC' | 'PNC' | 'NEWBORN';
  findings?: string;
  riskScoreAtVisit: number;
  riskTierAtVisit: 'GREEN' | 'AMBER' | 'RED';
  dangerSignsFound: string[];
  actionTaken: string;
  referralMade?: boolean;
  referralLocation?: string;
  generalComplaint?: string;
  ironFolicCompliance?: boolean;
  isSynced: boolean;
  createdAt: string;
}

export interface Baby {
  id: string;
  motherId: string;
  ashaId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  dateOfBirth: string;
  birthWeightKg: number;
  birthType: 'NORMAL' | 'PREMATURE' | 'LBW';
  currentStatus: 'ACTIVE' | 'NEONATAL_COMPLETE' | 'DECEASED';
  isSynced: boolean;
  createdAt: string;
}

export interface BabyVisit {
  id: string;
  babyId: string;
  motherId: string;
  ashaId: string;
  visitDay: 1 | 3 | 7 | 14 | 28;
  visitDate: string;
  weightKg: number;
  weightStatus: 'GAINING' | 'STABLE' | 'LOSING';
  jaundiceScanDone: boolean;
  jaundiceResult: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_DONE';
  breathScanDone: boolean;
  breathResult: 'NORMAL' | 'ABNORMAL' | 'NOT_DONE';
  feedingStatus: 'BREASTFEEDING' | 'FORMULA' | 'MIXED';
  dangerSigns: string[];
  overallAssessment: 'SAFE' | 'MONITOR' | 'REFER';
  notes: string;
  isSynced: boolean;
  createdAt: string;
}

export interface ScheduledVisit {
  day: 1 | 3 | 7 | 14 | 28;
  expectedDate: string;
  isCompleted: boolean;
  actualDate?: string;
  visitId?: string;
}

export interface Referral {
  id: string;
  patientType: 'MOTHER' | 'BABY';
  patientId: string;
  ashaId: string;
  referralDate: string;
  reason: string;
  referredTo: 'PHC' | 'CHC' | 'DISTRICT_HOSPITAL';
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  outcome: 'PENDING' | 'ATTENDED' | 'NOT_ATTENDED';
  notes: string;
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
