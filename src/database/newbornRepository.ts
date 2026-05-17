import { db } from './db';
import { Baby } from '../types';

// newbornRepository.ts is kept for backwards compatibility with VisionScanScreen etc.
// All SQL now targets the `babies` table (newborns table was dropped in migration).

export type Newborn = Baby; // alias so old imports don't break

const mapRow = (row: any): Baby => ({
  id: row.id,
  motherId: row.mother_id,
  ashaId: row.asha_id,
  name: row.name,
  gender: row.gender,
  dateOfBirth: row.date_of_birth,
  birthWeightKg: row.birth_weight_kg,
  birthType: row.birth_type,
  currentStatus: row.current_status,
  isSynced: Boolean(row.is_synced),
  createdAt: row.created_at,
});

export const addNewborn = async (data: Partial<Baby>): Promise<string> => {
  const id = data.id || Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO babies (id, mother_id, asha_id, name, gender, date_of_birth, birth_weight_kg, birth_type, current_status, is_synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, data.motherId || null, data.ashaId || null, data.name || null, data.gender || 'UNKNOWN',
     data.dateOfBirth || null, data.birthWeightKg || null, data.birthType || null,
     data.currentStatus || 'ACTIVE', now]
  );
  return id;
};

export const getNewbornByMotherId = async (motherId: string): Promise<Baby | null> => {
  const row = await db.getFirstAsync(
    'SELECT * FROM babies WHERE mother_id = ? ORDER BY created_at DESC LIMIT 1',
    [motherId]
  );
  return row ? mapRow(row) : null;
};

export const updateNewborn = async (id: string, updates: Partial<Baby>): Promise<void> => {
  const fieldMap: Record<string, string> = {
    motherId: 'mother_id', ashaId: 'asha_id', name: 'name', gender: 'gender',
    dateOfBirth: 'date_of_birth', birthWeightKg: 'birth_weight_kg', birthType: 'birth_type',
    currentStatus: 'current_status', isSynced: 'is_synced',
  };
  const setClauses: string[] = [];
  const values: any[] = [];
  Object.entries(updates).forEach(([key, value]) => {
    if (fieldMap[key]) {
      setClauses.push(`${fieldMap[key]} = ?`);
      values.push(key === 'isSynced' ? (value ? 1 : 0) : value);
    }
  });
  if (setClauses.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE babies SET ${setClauses.join(', ')} WHERE id = ?`, values);
};

export const getUnsyncedNewborns = async (ashaId: string): Promise<Baby[]> => {
  const rows: any[] = await db.getAllAsync(
    'SELECT * FROM babies WHERE asha_id = ? AND is_synced = 0', [ashaId]
  );
  return rows.map(mapRow);
};

export const markNewbornSynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE babies SET is_synced = 1 WHERE id = ?', [id]);
};