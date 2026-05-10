import { db } from './db';
import { Newborn } from '../types';

const mapNewbornRow = (row: any): Newborn => ({
  id: row.id,
  motherId: row.mother_id,
  ashaId: row.asha_id,
  dateOfBirth: row.date_of_birth,
  gender: row.gender,
  birthWeight: row.birth_weight,
  estimatedWeight: row.estimated_weight,
  jaundiceRisk: row.jaundice_risk,
  breathingStatus: row.breathing_status,
  nutritionStatus: row.nutrition_status,
  breastfeedingStatus: Boolean(row.breastfeeding_status),
  immunisationsDue: JSON.parse(row.immunisations_due || '[]'),
  isSynced: Boolean(row.is_synced),
  createdAt: row.created_at,
});

export const addNewborn = async (data: Omit<Newborn, 'id' | 'createdAt'>): Promise<string> => {
  const id = Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  
  await db.runAsync(
    `INSERT INTO newborns (
      id, mother_id, asha_id, date_of_birth, gender, birth_weight, 
      estimated_weight, jaundice_risk, breathing_status, nutrition_status, 
      breastfeeding_status, immunisations_due, is_synced, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.motherId, data.ashaId, data.dateOfBirth, data.gender, data.birthWeight,
      data.estimatedWeight, data.jaundiceRisk, data.breathingStatus, data.nutritionStatus,
      data.breastfeedingStatus ? 1 : 0, JSON.stringify(data.immunisationsDue),
      data.isSynced ? 1 : 0, now
    ]
  );
  
  return id;
};

export const getNewbornByMotherId = async (motherId: string): Promise<Newborn | null> => {
  const row = await db.getFirstAsync(
    'SELECT * FROM newborns WHERE mother_id = ? ORDER BY created_at DESC LIMIT 1',
    [motherId]
  );
  return row ? mapNewbornRow(row) : null;
};

export const updateNewborn = async (id: string, updates: Partial<Newborn>): Promise<void> => {
  const setClauses: string[] = [];
  const values: any[] = [];
  
  const fieldMap: Record<string, string> = {
    motherId: 'mother_id', ashaId: 'asha_id', dateOfBirth: 'date_of_birth', gender: 'gender',
    birthWeight: 'birth_weight', estimatedWeight: 'estimated_weight', jaundiceRisk: 'jaundice_risk',
    breathingStatus: 'breathing_status', nutritionStatus: 'nutrition_status', 
    breastfeedingStatus: 'breastfeeding_status', immunisationsDue: 'immunisations_due', isSynced: 'is_synced'
  };
  
  Object.entries(updates).forEach(([key, value]) => {
    if (fieldMap[key]) {
      setClauses.push(`${fieldMap[key]} = ?`);
      if (key === 'immunisationsDue') {
        values.push(JSON.stringify(value));
      } else if (key === 'breastfeedingStatus' || key === 'isSynced') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  });
  
  if (setClauses.length === 0) return;
  
  values.push(id);
  const query = `UPDATE newborns SET ${setClauses.join(', ')} WHERE id = ?`;
  
  await db.runAsync(query, values);
};

export const getUnsyncedNewborns = async (ashaId: string): Promise<Newborn[]> => {
  const rows = await db.getAllAsync(
    'SELECT * FROM newborns WHERE asha_id = ? AND is_synced = 0',
    [ashaId]
  );
  return rows.map(mapNewbornRow);
};

export const markNewbornSynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE newborns SET is_synced = 1 WHERE id = ?', [id]);
};