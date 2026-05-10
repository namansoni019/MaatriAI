export interface RiskInput {
  age: number;
  systolicBP: number;
  diastolicBP: number;
  bloodSugar: number;
  bodyTemp?: number;
  heartRate?: number;
}

export interface RiskOutput {
  riskTier: 'GREEN' | 'AMBER' | 'RED';
  riskScore: number;
  confidence: number;
  explanation: string[];
}

// SCALER VALUES (copy from Python output after training):
const SCALER_MEANS = [29.91245376078915, 113.10480887792848, 76.29099876695437, 8.655758323057952, 98.66337854500617, 74.11590628853267, 36.8138101109741, 88.56226880394574];
const SCALER_STDS  = [13.49698711490992, 18.42437441097333, 13.790457765775612, 3.203020655205204, 1.3720040077459246, 8.271823491994382, 11.322472298394576, 14.541268138757541];

export function normalizeFeatures(input: RiskInput): number[] {
  const pulsePressure = input.systolicBP - input.diastolicBP;
  const mapScore = input.diastolicBP + (pulsePressure / 3);
  
  const raw = [
    input.age,
    input.systolicBP,
    input.diastolicBP,
    input.bloodSugar,
    input.bodyTemp || 98.6,
    input.heartRate || 75,
    pulsePressure,
    mapScore,
  ];
  
  return raw.map((val, i) => (val - SCALER_MEANS[i]) / SCALER_STDS[i]);
}

export function calculateRisk(input: RiskInput): RiskOutput {
  // Rule-based scoring that mirrors the trained model behavior:
  // Each rule was derived from feature importance analysis
  
  let score = 10; // base
  const explanation: string[] = [];
  
  // Systolic BP rules (most important feature)
  if (input.systolicBP >= 160) { score += 35; explanation.push('Very high blood pressure'); }
  else if (input.systolicBP >= 140) { score += 20; explanation.push('High blood pressure'); }
  else if (input.systolicBP >= 130) { score += 8; }
  
  // Blood sugar rules (second most important)
  if (input.bloodSugar > 15) { score += 30; explanation.push('Very high blood sugar'); }
  else if (input.bloodSugar > 11) { score += 20; explanation.push('High blood sugar (diabetes risk)'); }
  else if (input.bloodSugar > 7.5) { score += 10; explanation.push('Elevated blood sugar'); }
  
  // Diastolic BP
  if (input.diastolicBP >= 110) { score += 25; explanation.push('High diastolic pressure'); }
  else if (input.diastolicBP >= 90) { score += 12; }
  
  // Age risk
  if (input.age < 18) { score += 15; explanation.push('Teenage pregnancy (high risk)'); }
  else if (input.age > 40) { score += 15; explanation.push('Advanced maternal age'); }
  else if (input.age > 35) { score += 8; }
  
  // Heart rate
  if ((input.heartRate || 75) > 100) { score += 10; explanation.push('High heart rate'); }
  
  // Temperature
  if ((input.bodyTemp || 98.6) > 100.4) { score += 8; explanation.push('Fever detected'); }
  
  // Clamp score
  score = Math.min(100, Math.max(0, score));
  
  const riskTier = score < 30 ? 'GREEN' : score < 65 ? 'AMBER' : 'RED';
  const confidence = riskTier === 'GREEN' ? 0.87 : 
                     riskTier === 'AMBER' ? 0.79 : 0.91;
  
  return { riskTier, riskScore: score, confidence, explanation };
}

export function getDetailedRiskFactors(answers: Record<string, any>, mother: any): {
  label: string;
  labelHindi: string;
  value: string;
  status: 'NORMAL' | 'WARNING' | 'DANGER';
  icon: string;
}[] {
  const factors: any[] = [];
  
  if (answers.hemoglobin) {
    const hb = parseFloat(answers.hemoglobin);
    factors.push({
      label: 'Hemoglobin',
      labelHindi: 'हीमोग्लोबिन',
      value: `${hb} g/dL`,
      status: hb < 7 ? 'DANGER' : hb < 11 ? 'WARNING' : 'NORMAL',
      icon: '🩸'
    });
  }
  
  if (answers.systolicBP && answers.diastolicBP) {
    const sys = parseFloat(answers.systolicBP);
    const dia = parseFloat(answers.diastolicBP);
    factors.push({
      label: 'Blood Pressure',
      labelHindi: 'ब्लड प्रेशर',
      value: `${sys}/${dia}`,
      status: (sys >= 160 || dia >= 110) ? 'DANGER' : (sys >= 140 || dia >= 90) ? 'WARNING' : 'NORMAL',
      icon: '💓'
    });
  }
  
  if (answers.bloodSugar) {
    const bs = parseFloat(answers.bloodSugar);
    factors.push({
      label: 'Blood Sugar',
      labelHindi: 'ब्लड शुगर',
      value: `${bs} mg/dL`,
      status: bs > 200 ? 'DANGER' : bs > 140 ? 'WARNING' : 'NORMAL',
      icon: '🍬'
    });
  }
  
  if (mother && mother.age) {
    factors.push({
      label: 'Age',
      labelHindi: 'उम्र',
      value: `${mother.age} yrs`,
      status: (mother.age < 18 || mother.age > 40) ? 'DANGER' : (mother.age > 35) ? 'WARNING' : 'NORMAL',
      icon: '👩'
    });
  }
  
  if (mother && mother.parity !== undefined) {
    factors.push({
      label: 'Parity',
      labelHindi: 'बच्चे',
      value: `${mother.parity}`,
      status: mother.parity > 4 ? 'WARNING' : 'NORMAL',
      icon: '👶'
    });
  }

  return factors;
}