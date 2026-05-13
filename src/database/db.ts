import * as SQLite from 'expo-sqlite';

// Open the database using the modern API 
// (Note: openDatabase and db.transaction are removed in Expo SDK 50+. 
// openDatabaseSync and execAsync/runAsync are the correct methods for expo-sqlite v13+)
export const db = SQLite.openDatabaseSync('maatri_ai.db');

export const initDatabase = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS asha_workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        village TEXT,
        district TEXT,
        state TEXT,
        preferred_language TEXT DEFAULT 'hi',
        pin TEXT NOT NULL,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS mothers (
        id TEXT PRIMARY KEY,
        asha_id TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER,
        village TEXT,
        district TEXT,
        state TEXT,
        weeks_pregnant INTEGER,
        parity INTEGER DEFAULT 0,
        hemoglobin REAL DEFAULT 0,
        systolic_bp INTEGER DEFAULT 0,
        diastolic_bp INTEGER DEFAULT 0,
        blood_sugar REAL DEFAULT 0,
        bmi REAL DEFAULT 0,
        height REAL DEFAULT 0,
        weight REAL DEFAULT 0,
        risk_tier TEXT DEFAULT 'GREEN',
        risk_score REAL DEFAULT 0,
        phone TEXT,
        abha_id TEXT,
        last_visit_date TEXT,
        next_visit_date TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        mother_id TEXT NOT NULL,
        asha_id TEXT NOT NULL,
        visit_date TEXT,
        visit_type TEXT DEFAULT 'ANC',
        findings TEXT,
        risk_score_at_visit REAL DEFAULT 0,
        risk_tier_at_visit TEXT DEFAULT 'GREEN',
        danger_signs_found TEXT DEFAULT '[]',
        action_taken TEXT,
        referral_made INTEGER DEFAULT 0,
        referral_location TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS newborns (
        id TEXT PRIMARY KEY,
        mother_id TEXT NOT NULL,
        asha_id TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT,
        birth_weight REAL DEFAULT 0,
        estimated_weight REAL DEFAULT 0,
        jaundice_risk TEXT DEFAULT 'LOW',
        breathing_status TEXT DEFAULT 'NORMAL',
        nutrition_status TEXT DEFAULT 'NORMAL',
        breastfeeding_status INTEGER DEFAULT 0,
        immunisations_due TEXT DEFAULT '[]',
        is_synced INTEGER DEFAULT 0,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS breath_scans (
        id TEXT PRIMARY KEY,
        mother_id TEXT NOT NULL,
        asha_id TEXT NOT NULL,
        scan_date TEXT,
        status TEXT DEFAULT 'NORMAL',
        confidence REAL DEFAULT 0,
        probability_normal REAL DEFAULT 0,
        probability_abnormal REAL DEFAULT 0,
        analysis_note TEXT,
        audio_uri TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};