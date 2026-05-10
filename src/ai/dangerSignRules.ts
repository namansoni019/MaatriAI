export type DangerLevel = 'SAFE' | 'WARNING' | 'DANGER';
export type ReferralUrgency = 'NONE' | 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface DangerSign {
  id: string;
  name: string;
  nameHindi: string;
  severity: 'WARNING' | 'DANGER';
  description: string;
  immediateAction: string;
  immediateActionHindi: string;
  voiceAlertHindi: string;
}

export interface EvaluationResult {
  level: DangerLevel;
  detectedSigns: DangerSign[];
  referralNeeded: boolean;
  referralUrgency: ReferralUrgency;
  overallVoiceAlert: string;
  recommendedAction: string;
  riskScore: number;
  riskTier: 'GREEN' | 'AMBER' | 'RED';
}

export function checkPreeclampsia(systolicBP: number, diastolicBP: number, hasHeadache: boolean, hasSwelling: boolean): DangerSign | null {
  if (systolicBP >= 160 || diastolicBP >= 110 || (systolicBP >= 140 && hasHeadache && hasSwelling)) {
    return {
      id: 'preeclampsia_danger',
      name: 'Severe Preeclampsia',
      nameHindi: 'गंभीर प्री-एक्लेम्पसिया',
      severity: 'DANGER',
      description: 'Extremely high blood pressure with possible organ damage.',
      immediateAction: 'Immediate referral to FRU',
      immediateActionHindi: 'तुरंत अस्पताल ले जाएं',
      voiceAlertHindi: 'चेतावनी! ब्लड प्रेशर बहुत ज़्यादा है। माँ को तुरंत अस्पताल ले जाएं।'
    };
  }
  if (systolicBP >= 140 || diastolicBP >= 90) {
    return {
      id: 'preeclampsia_warning',
      name: 'High Blood Pressure',
      nameHindi: 'हाई ब्लड प्रेशर',
      severity: 'WARNING',
      description: 'Elevated blood pressure needs monitoring.',
      immediateAction: 'Monitor closely, refer to PHC if symptoms worsen',
      immediateActionHindi: 'निगरानी रखें, PHC दिखाएं',
      voiceAlertHindi: 'ब्लड प्रेशर बढ़ा हुआ है। ध्यान रखें।'
    };
  }
  return null;
}

export function checkAnemia(hemoglobin: number): DangerSign | null {
  if (hemoglobin < 7) {
    return {
      id: 'severe_anemia',
      name: 'Severe Anemia',
      nameHindi: 'गंभीर खून की कमी',
      severity: 'DANGER',
      description: 'Critical lack of red blood cells.',
      immediateAction: 'Blood transfusion may be needed, urgent PHC visit',
      immediateActionHindi: 'तुरंत खून चढ़ाने की ज़रूरत हो सकती है, PHC जाएं',
      voiceAlertHindi: 'खून की बहुत कमी है। तुरंत PHC जाएं।'
    };
  }
  if (hemoglobin >= 7 && hemoglobin < 11) {
    return {
      id: 'mild_anemia',
      name: 'Mild to Moderate Anemia',
      nameHindi: 'खून की कमी',
      severity: 'WARNING',
      description: 'Low hemoglobin.',
      immediateAction: 'Ensure IFA tablets are taken daily',
      immediateActionHindi: 'रोजाना आयरन की गोली सुनिश्चित करें',
      voiceAlertHindi: 'खून की कमी है। आयरन की गोली रोज़ खिलाएं।'
    };
  }
  return null;
}

export function checkBloodSugar(bloodSugar: number): DangerSign | null {
  if (bloodSugar > 200) {
    return {
      id: 'severe_hyperglycemia',
      name: 'Severe High Blood Sugar',
      nameHindi: 'बहुत ज़्यादा शुगर',
      severity: 'DANGER',
      description: 'Dangerously high glucose levels.',
      immediateAction: 'Urgent medical attention required',
      immediateActionHindi: 'डॉक्टर को तुरंत दिखाएं',
      voiceAlertHindi: 'शुगर बहुत ज़्यादा है। डॉक्टर को दिखाएं।'
    };
  }
  if (bloodSugar > 140) {
    return {
      id: 'mild_hyperglycemia',
      name: 'High Blood Sugar',
      nameHindi: 'बढ़ी हुई शुगर',
      severity: 'WARNING',
      description: 'Elevated glucose levels.',
      immediateAction: 'Dietary counseling, test again',
      immediateActionHindi: 'खान-पान का ध्यान रखें, दोबारा जांच करें',
      voiceAlertHindi: 'शुगर बढ़ा हुआ है। ध्यान दें।'
    };
  }
  return null;
}

export function checkBleeding(hasBleeding: boolean): DangerSign | null {
  if (hasBleeding) {
    return {
      id: 'vaginal_bleeding',
      name: 'Vaginal Bleeding',
      nameHindi: 'रक्तस्राव (Bleeding)',
      severity: 'DANGER',
      description: 'Abnormal bleeding during pregnancy.',
      immediateAction: 'Call ambulance, go to FRU instantly',
      immediateActionHindi: 'एम्बुलेंस बुलाएं, तुरंत अस्पताल ले जाएं',
      voiceAlertHindi: 'खतरा! खून आ रहा है। तुरंत अस्पताल ले जाएं! एम्बुलेंस बुलाएं!'
    };
  }
  return null;
}

export function checkFetalMovement(isMovingNormally: boolean, weeksPregnant: number): DangerSign | null {
  if (!isMovingNormally && weeksPregnant > 20) {
    return {
      id: 'reduced_fetal_movement',
      name: 'Reduced Fetal Movement',
      nameHindi: 'बच्चे का कम हिलना',
      severity: 'WARNING',
      description: 'Baby is not moving as much as expected.',
      immediateAction: 'Refer to PHC for fetal heartbeat check',
      immediateActionHindi: 'बच्चे की धड़कन जांचने के लिए PHC जाएं',
      voiceAlertHindi: 'बच्चा सामान्य नहीं हिल रहा। PHC जाएं।'
    };
  }
  return null;
}

export function checkNeonatalSepsis(hasFever: boolean, isLethargic: boolean, poorFeeding: boolean, hasJaundice: boolean): DangerSign | null {
  const symptomsCount = [hasFever, isLethargic, poorFeeding, hasJaundice].filter(Boolean).length;
  if (symptomsCount >= 3) {
    return {
      id: 'severe_neonatal_sepsis',
      name: 'Possible Severe Infection (Sepsis)',
      nameHindi: 'गंभीर संक्रमण (Sepsis)',
      severity: 'DANGER',
      description: 'Multiple danger signs in newborn.',
      immediateAction: 'Urgent referral to SNCU/Hospital',
      immediateActionHindi: 'तुरंत अस्पताल ले जाएं',
      voiceAlertHindi: 'बच्चे को इन्फेक्शन हो सकता है। तुरंत अस्पताल ले जाएं।'
    };
  }
  if (symptomsCount >= 1) {
    return {
      id: 'neonatal_warning',
      name: 'Mild Sickness in Newborn',
      nameHindi: 'बच्चे की तबीयत खराब',
      severity: 'WARNING',
      description: 'One or two warning signs present.',
      immediateAction: 'Monitor and advise doctor visit',
      immediateActionHindi: 'डॉक्टर को दिखाएं',
      voiceAlertHindi: 'बच्चे की तबीयत ठीक नहीं लग रही है। ध्यान दें।'
    };
  }
  return null;
}

export function checkBreathing(breathingStatus: 'NORMAL' | 'ABNORMAL'): DangerSign | null {
  if (breathingStatus === 'ABNORMAL') {
    return {
      id: 'abnormal_breathing',
      name: 'Breathing Difficulty',
      nameHindi: 'सांस लेने में तकलीफ',
      severity: 'DANGER',
      description: 'Fast or difficult breathing in baby.',
      immediateAction: 'Urgent referral to hospital',
      immediateActionHindi: 'तुरंत अस्पताल ले जाएं',
      voiceAlertHindi: 'बच्चे की सांस ठीक नहीं है। तुरंत PHC जाएं।'
    };
  }
  return null;
}

export function evaluateVisit(
  answers: {
    systolicBP?: number;
    diastolicBP?: number;
    hasHeadache?: boolean;
    hasSwelling?: boolean;
    hasBleeding?: boolean;
    fetalMovementNormal?: boolean;
    hemoglobin?: number;
    bloodSugar?: number;
  },
  motherData: {
    weeksPregnant: number;
    age: number;
    parity: number;
  }
): EvaluationResult {
  const detectedSigns: DangerSign[] = [];

  if (answers.systolicBP !== undefined && answers.diastolicBP !== undefined) {
    const res = checkPreeclampsia(answers.systolicBP, answers.diastolicBP, answers.hasHeadache || false, answers.hasSwelling || false);
    if (res) detectedSigns.push(res);
  }
  
  if (answers.hemoglobin !== undefined) {
    const res = checkAnemia(answers.hemoglobin);
    if (res) detectedSigns.push(res);
  }

  if (answers.bloodSugar !== undefined) {
    const res = checkBloodSugar(answers.bloodSugar);
    if (res) detectedSigns.push(res);
  }

  if (answers.hasBleeding !== undefined) {
    const res = checkBleeding(answers.hasBleeding);
    if (res) detectedSigns.push(res);
  }

  if (answers.fetalMovementNormal !== undefined) {
    const res = checkFetalMovement(answers.fetalMovementNormal, motherData.weeksPregnant);
    if (res) detectedSigns.push(res);
  }

  let level: DangerLevel = 'SAFE';
  let referralUrgency: ReferralUrgency = 'NONE';
  let overallVoiceAlert = "सब ठीक है। अच्छा काम किया।";
  
  const hasDanger = detectedSigns.some(s => s.severity === 'DANGER');
  const hasWarning = detectedSigns.some(s => s.severity === 'WARNING');

  if (hasDanger) {
    level = 'DANGER';
    referralUrgency = 'EMERGENCY';
    const dangerSign = detectedSigns.find(s => s.severity === 'DANGER');
    overallVoiceAlert = dangerSign?.voiceAlertHindi || "चेतावनी! तुरंत अस्पताल ले जाएं।";
  } else if (hasWarning) {
    level = 'WARNING';
    referralUrgency = 'URGENT';
    overallVoiceAlert = "ध्यान दें। कुछ समस्याएं मिली हैं। ANM से मिलें।";
  }

  let riskScore = 10;
  if (hasDanger) riskScore += 30;
  const warningsCount = detectedSigns.filter(s => s.severity === 'WARNING').length;
  riskScore += Math.min(warningsCount * 15, 45);
  
  if (motherData.age < 18 || motherData.age > 35) riskScore += 10;
  if (motherData.parity > 4) riskScore += 10;
  if (motherData.weeksPregnant > 36) riskScore += 5;
  
  if (riskScore > 100) riskScore = 100;

  let riskTier: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
  if (riskScore < 30) riskTier = 'GREEN';
  else if (riskScore <= 60) riskTier = 'AMBER';
  else riskTier = 'RED';

  return {
    level,
    detectedSigns,
    referralNeeded: level !== 'SAFE',
    referralUrgency,
    overallVoiceAlert,
    recommendedAction: level === 'DANGER' ? 'Refer to PHC immediately' : (level === 'WARNING' ? 'Monitor closely and consult ANM' : 'Continue routine care'),
    riskScore,
    riskTier
  };
}

export function runTests(): void {
  // Simple tests
  const test1 = evaluateVisit({ systolicBP: 120, diastolicBP: 80, hasBleeding: false }, { weeksPregnant: 20, age: 25, parity: 1 });
  console.log('Test 1 (SAFE):', test1.level === 'SAFE' ? 'PASS' : 'FAIL');

  const test2 = evaluateVisit({ systolicBP: 165, diastolicBP: 90 }, { weeksPregnant: 38, age: 36, parity: 5 });
  console.log('Test 2 (DANGER Preeclampsia):', test2.level === 'DANGER' ? 'PASS' : 'FAIL');

  const test3 = evaluateVisit({ hemoglobin: 9 }, { weeksPregnant: 25, age: 25, parity: 1 });
  console.log('Test 3 (WARNING Anemia):', test3.level === 'WARNING' ? 'PASS' : 'FAIL');

  const test4 = evaluateVisit({ hasBleeding: true }, { weeksPregnant: 12, age: 22, parity: 0 });
  console.log('Test 4 (DANGER Bleeding):', test4.level === 'DANGER' ? 'PASS' : 'FAIL');

  const test5 = evaluateVisit({ fetalMovementNormal: false }, { weeksPregnant: 25, age: 25, parity: 1 });
  console.log('Test 5 (WARNING Fetal Movement):', test5.level === 'WARNING' ? 'PASS' : 'FAIL');
}