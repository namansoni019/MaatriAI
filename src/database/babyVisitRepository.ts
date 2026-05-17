import { db } from './db';
import { BabyVisit, ScheduledVisit } from '../types';

export const addBabyVisit = async (data: Partial<BabyVisit>): Promise<string> => {
  const id = data.id || `bvisit_${Date.now()}`;
  await db.runAsync(
    `INSERT INTO baby_visits (
      id, baby_id, mother_id, asha_id, visit_day, visit_date, weight_kg, weight_status,
      jaundice_scan_done, jaundice_result, breath_scan_done, breath_result,
      feeding_status, danger_signs, overall_assessment, notes, is_synced, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      id, data.babyId ?? null, data.motherId ?? null, data.ashaId ?? null,
      data.visitDay ?? null, data.visitDate ?? null,
      data.weightKg ?? null, data.weightStatus ?? null,
      data.jaundiceScanDone ? 1 : 0, data.jaundiceResult ?? 'NOT_DONE',
      data.breathScanDone ? 1 : 0, data.breathResult ?? 'NOT_DONE',
      data.feedingStatus ?? null, JSON.stringify(data.dangerSigns ?? []),
      data.overallAssessment ?? null, data.notes ?? null,
      new Date().toISOString()
    ]
  );
  return id;
};

export const getVisitsByBaby = async (babyId: string): Promise<BabyVisit[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM baby_visits WHERE baby_id = ? ORDER BY visit_day ASC', [babyId]);
  return rows.map(mapRowToBabyVisit);
};

export const getScheduledVisits = async (babyId: string, dobString: string): Promise<ScheduledVisit[]> => {
  const visits = await getVisitsByBaby(babyId);
  const dob = new Date(dobString);
  const scheduledDays: Array<1|3|7|14|28> = [1, 3, 7, 14, 28];
  
  return scheduledDays.map(day => {
    const expected = new Date(dob);
    expected.setDate(expected.getDate() + day);
    
    const completedVisit = visits.find(v => v.visitDay === day);
    
    return {
      day,
      expectedDate: expected.toISOString(),
      isCompleted: !!completedVisit,
      actualDate: completedVisit?.visitDate,
      visitId: completedVisit?.id
    };
  });
};

export const getUnsyncedBabyVisits = async (ashaId: string): Promise<BabyVisit[]> => {
  const rows: any[] = await db.getAllAsync('SELECT * FROM baby_visits WHERE asha_id = ? AND is_synced = 0', [ashaId]);
  return rows.map(mapRowToBabyVisit);
};

export const markBabyVisitSynced = async (id: string): Promise<void> => {
  await db.runAsync('UPDATE baby_visits SET is_synced = 1 WHERE id = ?', [id]);
};

function mapRowToBabyVisit(row: any): BabyVisit {
  return {
    id: row.id,
    babyId: row.baby_id,
    motherId: row.mother_id,
    ashaId: row.asha_id,
    visitDay: row.visit_day,
    visitDate: row.visit_date,
    weightKg: row.weight_kg,
    weightStatus: row.weight_status,
    jaundiceScanDone: row.jaundice_scan_done === 1,
    jaundiceResult: row.jaundice_result,
    breathScanDone: row.breath_scan_done === 1,
    breathResult: row.breath_result,
    feedingStatus: row.feeding_status,
    dangerSigns: row.danger_signs ? JSON.parse(row.danger_signs) : [],
    overallAssessment: row.overall_assessment,
    notes: row.notes,
    isSynced: row.is_synced === 1,
    createdAt: row.created_at
  };
}
