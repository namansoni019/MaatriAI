import { db } from './db';
import { Baby } from '../types';

export const addBaby = async (data: Partial<Baby>): Promise<string> => {
  const id = data.id || `baby_${Date.now()}`;
  await db.runAsync(
    `INSERT INTO babies (
      id, mother_id, asha_id, name, gender, date_of_birth, 
      birth_weight_kg, birth_type, current_status, is_synced, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id, data.motherId ?? null, data.ashaId ?? null, data.name ?? null, data.gender ?? 'UNKNOWN',
      data.dateOfBirth ?? null, data.birthWeightKg ?? null, data.birthType ?? null,
      data.currentStatus ?? 'ACTIVE', new Date().toISOString()
    ]
  );
  return id;
};

export const getBabiesByMother = async (motherId: string): Promise<Baby[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM babies WHERE mother_id = ? ORDER BY date_of_birth DESC', [motherId]);
  return rows.map(mapRowToBaby);
};

export const getAllBabies = async (ashaId: string): Promise<Baby[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM babies WHERE asha_id = ? ORDER BY created_at DESC', [ashaId]);
  return rows.map(mapRowToBaby);
};

export const getBabyById = async (id: string): Promise<Baby | null> => {
  const row: any = await db.getFirstAsync('SELECT * FROM babies WHERE id = ?', [id]);
  return row ? mapRowToBaby(row) : null;
};

export const updateBaby = async (id: string, updates: Partial<Baby>): Promise<void> => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const setString = keys.map(k => `${toSnakeCase(k)} = ?`).join(', ');
  const values = Object.values(updates);
  await db.runAsync(`UPDATE babies SET ${setString}, is_synced = 0 WHERE id = ?`, [...values, id]);
};

export const getUnsyncedBabies = async (ashaId: string): Promise<Baby[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM babies WHERE asha_id = ? AND is_synced = 0', [ashaId]);
  return rows.map(mapRowToBaby);
};

export const markBabySynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE babies SET is_synced = 1 WHERE id = ?', [id]);
};

function mapRowToBaby(row: any): Baby {
  return {
    id: row.id,
    motherId: row.mother_id,
    ashaId: row.asha_id,
    name: row.name,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    birthWeightKg: row.birth_weight_kg,
    birthType: row.birth_type,
    currentStatus: row.current_status,
    isSynced: row.is_synced === 1,
    createdAt: row.created_at
  };
}

function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
