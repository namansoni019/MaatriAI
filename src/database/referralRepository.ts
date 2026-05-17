import { db } from './db';
import { Referral } from '../types';

export const addReferral = async (data: Partial<Referral>): Promise<string> => {
  const id = data.id || `ref_${Date.now()}`;
  await db.runAsync(
    `INSERT INTO referrals (
      id, patient_type, patient_id, asha_id, referral_date, reason,
      referred_to, urgency, outcome, notes, is_synced, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id, data.patientType || null, data.patientId || null, data.ashaId || null, 
      data.referralDate || new Date().toISOString(), data.reason || null,
      data.referredTo || null, data.urgency || null, data.outcome || 'PENDING', 
      data.notes || null, new Date().toISOString()
    ]
  );
  return id;
};

export const getReferralsByPatient = async (patientId: string): Promise<Referral[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM referrals WHERE patient_id = ? ORDER BY referral_date DESC', [patientId]);
  return rows.map(mapRowToReferral);
};

export const updateReferralOutcome = async (id: string, outcome: 'PENDING' | 'ATTENDED' | 'NOT_ATTENDED'): Promise<void> => {
  await db.runAsync('UPDATE referrals SET outcome = ?, is_synced = 0 WHERE id = ?', [outcome, id]);
};

export const getUnsyncedReferrals = async (ashaId: string): Promise<Referral[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM referrals WHERE asha_id = ? AND is_synced = 0', [ashaId]);
  return rows.map(mapRowToReferral);
};

export const markReferralSynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE referrals SET is_synced = 1 WHERE id = ?', [id]);
};

function mapRowToReferral(row: any): Referral {
  return {
    id: row.id,
    patientType: row.patient_type,
    patientId: row.patient_id,
    ashaId: row.asha_id,
    referralDate: row.referral_date,
    reason: row.reason,
    referredTo: row.referred_to,
    urgency: row.urgency,
    outcome: row.outcome,
    notes: row.notes,
    isSynced: row.is_synced === 1,
    createdAt: row.created_at
  };
}
