import { db } from './db';

export interface BreathScanRecord {
  id: string;
  motherId: string;
  ashaId: string;
  scanDate: string;
  status: 'NORMAL' | 'ABNORMAL';
  confidence: number;
  probabilityNormal: number;
  probabilityAbnormal: number;
  analysisNote: string;
  audioUri: string;
  isSynced: boolean;
  createdAt: string;
}

const mapRow = (row: any): BreathScanRecord => ({
  id: row.id,
  motherId: row.mother_id,
  ashaId: row.asha_id,
  scanDate: row.scan_date,
  status: row.status,
  confidence: row.confidence,
  probabilityNormal: row.probability_normal,
  probabilityAbnormal: row.probability_abnormal,
  analysisNote: row.analysis_note,
  audioUri: row.audio_uri,
  isSynced: Boolean(row.is_synced),
  createdAt: row.created_at,
});

export const saveBreathScan = async (data: {
  motherId: string;
  ashaId: string;
  status: 'NORMAL' | 'ABNORMAL';
  confidence: number;
  probabilityNormal: number;
  probabilityAbnormal: number;
  analysisNote: string;
  audioUri: string;
}): Promise<string> => {
  const id = Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  
  await db.runAsync(
    `INSERT INTO breath_scans (
      id, mother_id, asha_id, scan_date, status, confidence, 
      probability_normal, probability_abnormal, analysis_note, 
      audio_uri, is_synced, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.motherId, data.ashaId, now, data.status, data.confidence,
      data.probabilityNormal, data.probabilityAbnormal, data.analysisNote,
      data.audioUri, 0, now
    ]
  );
  
  return id;
};

export const getBreathScanCount = async (): Promise<number> => {
  const row: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM breath_scans');
  return row?.count || 0;
};

export const getAbnormalBreathScans = async (): Promise<number> => {
  const row: any = await db.getFirstAsync(
    "SELECT COUNT(*) as count FROM breath_scans WHERE status = 'ABNORMAL'"
  );
  return row?.count || 0;
};

export const getBreathScansByMother = async (motherId: string): Promise<BreathScanRecord[]> => {
  const rows = await db.getAllAsync(
    'SELECT * FROM breath_scans WHERE mother_id = ? ORDER BY created_at DESC',
    [motherId]
  );
  return rows.map(mapRow);
};

export const getUnsyncedBreathScans = async (): Promise<BreathScanRecord[]> => {
  const rows = await db.getAllAsync(
    'SELECT * FROM breath_scans WHERE is_synced = 0'
  );
  return rows.map(mapRow);
};

export const markBreathScanSynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE breath_scans SET is_synced = 1 WHERE id = ?', [id]);
};
