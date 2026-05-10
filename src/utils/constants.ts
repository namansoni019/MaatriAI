// src/utils/constants.ts
export const COLORS = {
  primary: '#C2185B',
  primaryLight: '#F48FB1',
  primaryDark: '#880E4F',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  white: '#FFFFFF',
  gray: '#9E9E9E',
  lightGray: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
};

export const RISK_THRESHOLDS = {
  HEMOGLOBIN_LOW: 11,
  HEMOGLOBIN_DANGER: 7,
  SYSTOLIC_WARNING: 140,
  SYSTOLIC_DANGER: 160,
  DIASTOLIC_WARNING: 90,
  DIASTOLIC_DANGER: 110,
  BLOOD_SUGAR_WARNING: 140,
  BLOOD_SUGAR_DANGER: 200,
};

export const API_BASE_URL = 'http://localhost:8000';
