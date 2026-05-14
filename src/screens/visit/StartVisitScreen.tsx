import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRoute, useNavigation, useIsFocused, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotherStackParamList } from '../../../App';
import { getMotherById, updateMotherRisk } from '../../database/motherRepository';
import { addVisit } from '../../database/visitRepository';
import { evaluateVisit } from '../../ai/dangerSignRules';
import { speak, stopListening } from '../../services/voiceService';
import VoiceButton from '../../components/VoiceButton';
import { Mother } from '../../types';
import { useTranslation } from 'react-i18next';

type StartVisitRouteProp = RouteProp<MotherStackParamList, 'StartVisit'>;

const getVisitQuestions = (t: any) => [
  {
    id: 'general_health',
    questionText: t('startVisit.q_general'),
    inputType: 'voice_text',
    field: 'generalComplaint',
  },
  {
    id: 'systolic_bp',
    questionText: t('startVisit.q_sys'),
    inputType: 'numeric',
    field: 'systolicBP',
    unit: 'mmHg',
    normalRange: '90–139',
    dangerAbove: 160,
    warningAbove: 140,
  },
  {
    id: 'diastolic_bp',
    questionText: t('startVisit.q_dia'),
    inputType: 'numeric',
    field: 'diastolicBP',
    unit: 'mmHg',
    normalRange: '60–89',
    dangerAbove: 110,
    warningAbove: 90,
  },
  {
    id: 'headache',
    questionText: t('startVisit.q_headache'),
    inputType: 'yes_no',
    field: 'hasHeadache',
  },
  {
    id: 'swelling',
    questionText: t('startVisit.q_swelling'),
    inputType: 'yes_no',
    field: 'hasSwelling',
  },
  {
    id: 'fetal_movement',
    questionText: t('startVisit.q_fetal'),
    inputType: 'yes_no',
    field: 'fetalMovementNormal',
    showIfWeeksAbove: 20,
  },
  {
    id: 'bleeding',
    questionText: t('startVisit.q_bleeding'),
    inputType: 'yes_no',
    field: 'hasBleeding',
  },
  {
    id: 'iron_tablets',
    questionText: t('startVisit.q_iron'),
    inputType: 'yes_no',
    field: 'ironFolicCompliance',
  },
];

const StartVisitScreen: React.FC = () => {
  const { t } = useTranslation();
  const VISIT_QUESTIONS = getVisitQuestions(t);
  const route = useRoute<StartVisitRouteProp>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { motherId } = route.params;

  const [mother, setMother] = useState<Mother | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentInputValue, setCurrentInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadMother = async () => {
      try {
        const m = await getMotherById(motherId);
        setMother(m);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadMother();
  }, [motherId]);

  useEffect(() => {
    if (isFocused && mother && !saving) {
      const q = VISIT_QUESTIONS[currentIndex];
      setCurrentInputValue(answers[q.field] ? String(answers[q.field]) : '');
      
      // Auto-speak the question when it loads
      speak(q.questionHindi);
    }
  }, [currentIndex, isFocused, mother, saving]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const goToNext = async (currentAnswers: Record<string, any>) => {
    let nextIndex = currentIndex + 1;
    
    // Find next valid question based on pregnancy weeks
    while (nextIndex < VISIT_QUESTIONS.length) {
      const nextQ = VISIT_QUESTIONS[nextIndex];
      if (nextQ.showIfWeeksAbove && mother && mother.weeksPregnant < nextQ.showIfWeeksAbove) {
        nextIndex++;
      } else {
        break;
      }
    }

    if (nextIndex >= VISIT_QUESTIONS.length) {
      await finishVisit(currentAnswers);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const handleNextClick = () => {
    const q = VISIT_QUESTIONS[currentIndex];
    const newAnswers = { ...answers, [q.field]: currentInputValue };
    setAnswers(newAnswers);
    goToNext(newAnswers);
  };

  const handleYesNo = (val: boolean) => {
    const q = VISIT_QUESTIONS[currentIndex];
    const newAnswers = { ...answers, [q.field]: val };
    setAnswers(newAnswers);
    goToNext(newAnswers);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  const finishVisit = async (finalAnswers: Record<string, any>) => {
    setSaving(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      const session = JSON.parse(sessionStr || '{}');

      // Convert answers to numbers where appropriate for the engine
      const numericAnswers = {
        ...finalAnswers,
        systolicBP: finalAnswers.systolicBP ? parseFloat(finalAnswers.systolicBP) : undefined,
        diastolicBP: finalAnswers.diastolicBP ? parseFloat(finalAnswers.diastolicBP) : undefined,
        hemoglobin: finalAnswers.hemoglobin ? parseFloat(finalAnswers.hemoglobin) : undefined,
        bloodSugar: finalAnswers.bloodSugar ? parseFloat(finalAnswers.bloodSugar) : undefined,
      };

      const result = evaluateVisit(numericAnswers, {
        weeksPregnant: mother!.weeksPregnant,
        age: mother!.age,
        parity: mother!.parity
      });
      
      const visitId = Math.random().toString(36).substr(2, 9);
      const now = new Date().toISOString();

      await addVisit({
        id: visitId,
        motherId: mother!.id,
        ashaId: session.id,
        visitDate: now,
        riskScoreAtVisit: result.riskScore,
        riskTierAtVisit: result.riskTier,
        actionTaken: result.recommendedAction,
        generalComplaint: finalAnswers.generalComplaint || '',
        ironFolicCompliance: finalAnswers.ironFolicCompliance || false,
        dangerSignsFound: JSON.stringify(result.detectedSigns.map(s => s.name)), // Keep string array for compatibility
        isSynced: false,
      });

      // Update mother's last visit and risk tier
      await updateMotherRisk(mother!.id, result.riskTier, result.riskScore, now);

      // Route to DangerSign if there is an emergency, otherwise RiskScore
      if (result.level === 'DANGER') {
        navigation.replace('DangerSign', { 
          motherId: mother!.id,
          result: result,
          answers: numericAnswers
        });
      } else {
        navigation.replace('RiskScore', { 
          motherId: mother!.id, 
          evaluationResult: result,
          answers: numericAnswers 
        });
      }

    } catch(e) {
      console.error(e);
      setSaving(false);
    }
  };

  if (loading || !mother) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C2185B" />
      </View>
    );
  }

  const q = VISIT_QUESTIONS[currentIndex];
  const totalQuestions = VISIT_QUESTIONS.filter(qu => !qu.showIfWeeksAbove || (mother && mother.weeksPregnant >= qu.showIfWeeksAbove)).length;
  // Calculate relative index for progress
  const visibleQuestions = VISIT_QUESTIONS.filter(qu => !qu.showIfWeeksAbove || (mother && mother.weeksPregnant >= qu.showIfWeeksAbove));
  const currentQVisibleIndex = visibleQuestions.findIndex(qu => qu.id === q.id) + 1;
  const progressPercent = (currentQVisibleIndex / totalQuestions) * 100;

  const isNextDisabled = q.inputType !== 'yes_no' && currentInputValue.trim() === '';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{t('startVisit.progress', { current: currentQVisibleIndex, total: totalQuestions })}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.qNumber}>Q{currentQVisibleIndex}</Text>
            <Text style={styles.qHindi}>{q.questionText}</Text>

            <View style={styles.inputArea}>
              
              {q.inputType === 'yes_no' && (
                <View style={styles.yesNoContainer}>
                  <TouchableOpacity style={[styles.ynBtn, styles.yesBtn]} onPress={() => handleYesNo(true)}>
                    <Text style={styles.yesNoText}>✓ {t('common.yes')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ynBtn, styles.noBtn]} onPress={() => handleYesNo(false)}>
                    <Text style={styles.yesNoText}>✗ {t('common.no')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {q.inputType === 'numeric' && (
                <View style={styles.numericContainer}>
                  <View style={styles.numericRow}>
                    <TextInput
                      style={styles.numericInput}
                      keyboardType="numeric"
                      value={currentInputValue}
                      onChangeText={setCurrentInputValue}
                      placeholder={t('startVisit.numberHint')}
                      maxLength={3}
                    />
                    <View style={styles.voiceSmallWrapper}>
                      <VoiceButton 
                        size="small" 
                        onResult={(txt) => {
                          const num = txt.replace(/[^0-9]/g, '');
                          if (num) setCurrentInputValue(num);
                        }} 
                      />
                    </View>
                  </View>
                  {q.unit && <Text style={styles.unitText}>{q.unit}</Text>}
                  {q.normalRange && <Text style={styles.hintText}>{t('startVisit.normalRange')} {q.normalRange}</Text>}
                </View>
              )}

              {q.inputType === 'voice_text' && (
                <View style={styles.voiceTextContainer}>
                  <VoiceButton 
                    size="large" 
                    onResult={(txt) => setCurrentInputValue(txt)} 
                  />
                  <TextInput
                    style={styles.textInput}
                    value={currentInputValue}
                    onChangeText={setCurrentInputValue}
                    placeholder={t('startVisit.typeHint')}
                    multiline
                  />
                </View>
              )}

            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={saving}>
            <Text style={styles.backBtnText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          
          {q.inputType !== 'yes_no' && (
            <TouchableOpacity 
              style={[styles.nextBtn, isNextDisabled && styles.nextBtnDisabled]} 
              onPress={handleNextClick}
              disabled={isNextDisabled || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnText}>{t('common.next')} →</Text>}
            </TouchableOpacity>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  progressContainer: { padding: 20, paddingBottom: 10 },
  progressBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C2185B' },
  progressText: { textAlign: 'center', color: '#757575', fontSize: 13, marginTop: 8, fontWeight: 'bold' },

  content: { flex: 1, padding: 20, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
    minHeight: 350
  },
  qNumber: { color: '#C2185B', fontWeight: 'bold', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  qHindi: { fontSize: 22, fontWeight: 'bold', color: '#212121', textAlign: 'center', lineHeight: 32 },
  qEnglish: { fontSize: 14, color: '#757575', textAlign: 'center', marginTop: 8 },

  inputArea: { marginTop: 40, flex: 1, justifyContent: 'center' },
  
  yesNoContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  ynBtn: { flex: 1, borderRadius: 12, padding: 18, alignItems: 'center', elevation: 2 },
  yesBtn: { backgroundColor: '#4CAF50' },
  noBtn: { backgroundColor: '#F44336' },
  yesNoText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },

  numericContainer: { alignItems: 'center' },
  numericRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  numericInput: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#212121',
    borderBottomWidth: 2,
    borderBottomColor: '#C2185B',
    minWidth: 100,
    textAlign: 'center',
    paddingVertical: 8,
  },
  voiceSmallWrapper: { marginLeft: 16 },
  unitText: { color: '#757575', fontSize: 16, marginTop: 8 },
  hintText: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold', marginTop: 12 },

  voiceTextContainer: { alignItems: 'center', width: '100%' },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginTop: 20,
    backgroundColor: '#FAFAFA',
    minHeight: 80,
    textAlignVertical: 'top'
  },

  footer: { flexDirection: 'row', padding: 20, paddingBottom: 40, justifyContent: 'space-between' },
  backBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#9E9E9E' },
  backBtnText: { color: '#757575', fontSize: 16, fontWeight: 'bold' },
  nextBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, backgroundColor: '#C2185B', elevation: 2 },
  nextBtnDisabled: { backgroundColor: '#E0E0E0', elevation: 0 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default StartVisitScreen;