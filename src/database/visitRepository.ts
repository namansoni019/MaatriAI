import { db } from './db';
import { Visit } from '../types';

const mapVisitRow = (row: any): Visit => ({
  id: row.id,
  motherId: row.mother_id,
  ashaId: row.asha_id,
  visitDate: row.visit_date,
  visitType: row.visit_type,
  findings: row.findings,
  riskScoreAtVisit: row.risk_score_at_visit,
  riskTierAtVisit: row.risk_tier_at_visit,
  dangerSignsFound: JSON.parse(row.danger_signs_found || '[]'),
  actionTaken: row.action_taken,
  referralMade: Boolean(row.referral_made),
  referralLocation: row.referral_location,
  isSynced: Boolean(row.is_synced),
  createdAt: row.created_at,
});

export const addVisit = async (data: Omit<Visit, 'id' | 'createdAt'>): Promise<string> => {
  const id = Math.random().toString(36).substring(2, 11);
  const now = new Date().toISOString();
  
  await db.runAsync(
    `INSERT INTO visits (
      id, mother_id, asha_id, visit_date, visit_type, findings, 
      risk_score_at_visit, risk_tier_at_visit, danger_signs_found, 
      action_taken, referral_made, referral_location, is_synced, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.motherId, data.ashaId, data.visitDate, data.visitType, data.findings,
      data.riskScoreAtVisit, data.riskTierAtVisit, JSON.stringify(data.dangerSignsFound),
      data.actionTaken, data.referralMade ? 1 : 0, data.referralLocation,
      data.isSynced ? 1 : 0, now
    ]
  );
  
  return id;
};

export const getVisitsByMother = async (motherId: string): Promise<Visit[]> => {
  const rows = await db.getAllAsync(
    'SELECT * FROM visits WHERE mother_id = ? ORDER BY visit_date DESC',
    [motherId]
  );
  return rows.map(mapVisitRow);
};

export const getUnsyncedVisits = async (ashaId: string): Promise<Visit[]> => {
  const rows = await db.getAllAsync(
    'SELECT * FROM visits WHERE asha_id = ? AND is_synced = 0',
    [ashaId]
  );
  return rows.map(mapVisitRow);
};

export const markVisitSynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE visits SET is_synced = 1 WHERE id = ?', [id]);
};