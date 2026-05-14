import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDatabase } from '../database/db';
import { ASHAWorker, Mother } from '../types';

export const DEMO_ASHA: ASHAWorker = {
  id: 'DEMO001',
  name: 'Sunita ASHA',
  phone: '9876543210',
  village: 'Rampur',
  district: 'Pune',
  state: 'Maharashtra',
  preferredLanguage: 'hi',
  pin: '1234',
};

export const DEMO_MOTHERS: Mother[] = [
  {
    id: 'M001', ashaId: 'DEMO001',
    name: 'Kavita Sharma', age: 22, village: 'Rampur',
    district: 'Pune', state: 'Maharashtra',
    weeksPregnant: 36, parity: 0,
    hemoglobin: 8.5, systolicBP: 165, diastolicBP: 108,
    bloodSugar: 7.5, bmi: 24.2, height: 158, weight: 60.5,
    riskTier: 'RED', riskScore: 78,
    phone: '9876500001', abhaId: '',
    lastVisitDate: new Date(Date.now()-3*86400000).toISOString(),
    nextVisitDate: new Date(Date.now()+4*86400000).toISOString(),
    isSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'M002', ashaId: 'DEMO001',
    name: 'Sunita Devi', age: 28, village: 'Khamgaon',
    district: 'Pune', state: 'Maharashtra',
    weeksPregnant: 32, parity: 1,
    hemoglobin: 9.8, systolicBP: 145, diastolicBP: 92,
    bloodSugar: 6.8, bmi: 23.1, height: 162, weight: 60.7,
    riskTier: 'AMBER', riskScore: 45,
    phone: '9876500002', abhaId: '',
    lastVisitDate: new Date(Date.now()-10*86400000).toISOString(),
    nextVisitDate: new Date(Date.now()+4*86400000).toISOString(),
    isSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'M003', ashaId: 'DEMO001',
    name: 'Radha Bai', age: 24, village: 'Deulgaon',
    district: 'Pune', state: 'Maharashtra',
    weeksPregnant: 20, parity: 0,
    hemoglobin: 12.1, systolicBP: 112, diastolicBP: 72,
    bloodSugar: 5.9, bmi: 21.8, height: 160, weight: 55.8,
    riskTier: 'GREEN', riskScore: 15,
    phone: '9876500003', abhaId: '',
    lastVisitDate: new Date(Date.now()-5*86400000).toISOString(),
    nextVisitDate: new Date(Date.now()+23*86400000).toISOString(),
    isSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'M004', ashaId: 'DEMO001',
    name: 'Meera Kumari', age: 19, village: 'Rampur',
    district: 'Pune', state: 'Maharashtra',
    weeksPregnant: 28, parity: 0,
    hemoglobin: 9.2, systolicBP: 125, diastolicBP: 80,
    bloodSugar: 6.1, bmi: 20.5, height: 155, weight: 49.2,
    riskTier: 'AMBER', riskScore: 38,
    phone: '9876500004', abhaId: '',
    lastVisitDate: new Date(Date.now()-18*86400000).toISOString(),
    nextVisitDate: new Date(Date.now()-4*86400000).toISOString(),
    isSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'M005', ashaId: 'DEMO001',
    name: 'Priya Singh', age: 35, village: 'Khamgaon',
    district: 'Pune', state: 'Maharashtra',
    weeksPregnant: 38, parity: 2,
    hemoglobin: 10.8, systolicBP: 138, diastolicBP: 88,
    bloodSugar: 8.2, bmi: 27.3, height: 159, weight: 69.1,
    riskTier: 'AMBER', riskScore: 52,
    phone: '9876500005', abhaId: '',
    lastVisitDate: new Date(Date.now()-7*86400000).toISOString(),
    nextVisitDate: new Date(Date.now()+0*86400000).toISOString(),
    isSynced: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function loadDemoData(): Promise<void> {
  await initDatabase();

  // Save DEMO_ASHA to SQLite
  await db.runAsync(
    `INSERT OR REPLACE INTO asha_workers (
      id, name, phone, village, district, state, preferred_language, pin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      DEMO_ASHA.id, DEMO_ASHA.name, DEMO_ASHA.phone, DEMO_ASHA.village,
      DEMO_ASHA.district, DEMO_ASHA.state, DEMO_ASHA.preferredLanguage, DEMO_ASHA.pin
    ]
  );

  // Save session
  await AsyncStorage.setItem('maatri_session', JSON.stringify(DEMO_ASHA));

  // Save all DEMO_MOTHERS to SQLite
  for (const m of DEMO_MOTHERS) {
    await db.runAsync(
      `INSERT OR REPLACE INTO mothers (
        id, asha_id, name, age, village, district, state, weeks_pregnant, parity, 
        hemoglobin, systolic_bp, diastolic_bp, blood_sugar, bmi, height, weight, 
        risk_tier, risk_score, phone, abha_id, last_visit_date, next_visit_date, 
        is_synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.id, m.ashaId, m.name, m.age, m.village, m.district, m.state,
        m.weeksPregnant, m.parity, m.hemoglobin, m.systolicBP, m.diastolicBP,
        m.bloodSugar, m.bmi, m.height, m.weight, m.riskTier, m.riskScore,
        m.phone, m.abhaId, m.lastVisitDate, m.nextVisitDate, 
        m.isSynced ? 1 : 0, m.createdAt, m.updatedAt
      ]
    );
  }
}
