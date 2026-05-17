import { db } from './db';
import { Mother } from '../types';

// Helper to map snake_case database row to camelCase Mother object
const mapMotherRow = (row: any): Mother => ({
  id: row.id,
  ashaId: row.asha_id,
  name: row.name,
  age: row.age,
  village: row.village,
  district: row.district,
  state: row.state,
  weeksPregnant: row.weeks_pregnant,
  parity: row.parity,
  hemoglobin: row.hemoglobin,
  systolicBP: row.systolic_bp,
  diastolicBP: row.diastolic_bp,
  bloodSugar: row.blood_sugar,
  bmi: row.bmi,
  height: row.height,
  weight: row.weight,
  riskTier: row.risk_tier,
  riskScore: row.risk_score,
  phone: row.phone,
  abhaId: row.abha_id,
  lastVisitDate: row.last_visit_date,
  nextVisitDate: row.next_visit_date,
  isSynced: Boolean(row.is_synced),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  status: row.status || 'PREGNANT',
  deliveryDate: row.delivery_date,
  deliveryType: row.delivery_type,
  deliveryComplications: row.delivery_complications,
  deliveryBabyWeight: row.delivery_baby_weight,
});

export const getAllMothers = async (ashaId: string): Promise<Mother[]> => {
  const rows = await db.getAllAsync(
    `SELECT * FROM mothers WHERE asha_id = ? 
     ORDER BY 
       CASE risk_tier 
         WHEN 'RED' THEN 1 
         WHEN 'AMBER' THEN 2 
         WHEN 'GREEN' THEN 3 
         ELSE 4 
       END, 
       name ASC`,
    [ashaId]
  );
  return rows.map(mapMotherRow);
};

export const getMotherById = async (id: string): Promise<Mother | null> => {
  const row = await db.getFirstAsync('SELECT * FROM mothers WHERE id = ?', [id]);
  return row ? mapMotherRow(row) : null;
};

export const addMother = async (data: Omit<Mother, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const id = Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  
  await db.runAsync(
    `INSERT INTO mothers (
      id, asha_id, name, age, village, district, state, weeks_pregnant, parity, 
      hemoglobin, systolic_bp, diastolic_bp, blood_sugar, bmi, height, weight, 
      risk_tier, risk_score, phone, abha_id, last_visit_date, next_visit_date, 
      is_synced, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.ashaId, data.name, data.age, data.village, data.district, data.state,
      data.weeksPregnant, data.parity, data.hemoglobin, data.systolicBP, data.diastolicBP,
      data.bloodSugar, data.bmi, data.height, data.weight, data.riskTier, data.riskScore,
      data.phone, data.abhaId, data.lastVisitDate, data.nextVisitDate, 
      data.isSynced ? 1 : 0, now, now
    ]
  );
  
  return id;
};

export const updateMother = async (id: string, updates: Partial<Mother>): Promise<void> => {
  const now = new Date().toISOString();
  const setClauses: string[] = [];
  const values: any[] = [];
  
  const fieldMap: Record<string, string> = {
    ashaId: 'asha_id', name: 'name', age: 'age', village: 'village', district: 'district', state: 'state',
    weeksPregnant: 'weeks_pregnant', parity: 'parity', hemoglobin: 'hemoglobin', systolicBP: 'systolic_bp',
    diastolicBP: 'diastolic_bp', bloodSugar: 'blood_sugar', bmi: 'bmi', height: 'height', weight: 'weight',
    riskTier: 'risk_tier', riskScore: 'risk_score', phone: 'phone', abhaId: 'abha_id', 
    lastVisitDate: 'last_visit_date', nextVisitDate: 'next_visit_date', isSynced: 'is_synced',
    status: 'status', deliveryDate: 'delivery_date', deliveryType: 'delivery_type', 
    deliveryComplications: 'delivery_complications', deliveryBabyWeight: 'delivery_baby_weight'
  };
  
  Object.entries(updates).forEach(([key, value]) => {
    if (fieldMap[key]) {
      setClauses.push(`${fieldMap[key]} = ?`);
      values.push(key === 'isSynced' ? (value ? 1 : 0) : value);
    }
  });
  
  setClauses.push('updated_at = ?');
  values.push(now);
  
  if (setClauses.length === 1) return; // Only updated_at
  
  values.push(id);
  const query = `UPDATE mothers SET ${setClauses.join(', ')} WHERE id = ?`;
  
  await db.runAsync(query, values);
};

export const deleteMother = async (id: string): Promise<void> => {
  await db.runAsync('DELETE FROM mothers WHERE id = ?', [id]);
};

export const getHighRiskMothers = async (ashaId: string): Promise<Mother[]> => {
  const rows = await db.getAllAsync(
    `SELECT * FROM mothers 
     WHERE asha_id = ? AND risk_tier IN ('RED', 'AMBER') 
     ORDER BY risk_score DESC`,
    [ashaId]
  );
  return rows.map(mapMotherRow);
};

export const getUnsyncedMothers = async (ashaId: string): Promise<Mother[]> => {
  const rows = await db.getAllAsync(
    'SELECT * FROM mothers WHERE asha_id = ? AND is_synced = 0',
    [ashaId]
  );
  return rows.map(mapMotherRow);
};

export const markMotherSynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE mothers SET is_synced = 1 WHERE id = ?', [id]);
};

export const searchMothers = async (ashaId: string, query: string): Promise<Mother[]> => {
  const searchTerm = `%${query}%`;
  const rows = await db.getAllAsync(
    `SELECT * FROM mothers 
     WHERE asha_id = ? AND (name LIKE ? OR village LIKE ?)`,
    [ashaId, searchTerm, searchTerm]
  );
  return rows.map(mapMotherRow);
};

export const updateMotherRisk = async (id: string, riskTier: string, riskScore: number, lastVisitDate: string): Promise<void> => {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE mothers SET risk_tier = ?, risk_score = ?, last_visit_date = ?, updated_at = ? WHERE id = ?',
    [riskTier, riskScore, lastVisitDate, now, id]
  );
};