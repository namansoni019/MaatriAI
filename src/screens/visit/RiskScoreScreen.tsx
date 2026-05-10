import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { updateMother, getMotherById } from '../../database/motherRepository';
import { calculateRisk, getDetailedRiskFactors, RiskOutput } from '../../ai/riskScorer';

const RiskScoreScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const motherId = route.params?.motherId;
  const answers = route.params?.answers || {};

  const [loading, setLoading] = useState(true);
  const [mother, setMother] = useState<any>(null);
  const [result, setResult] = useState<RiskOutput | null>(null);
  const [factors, setFactors] = useState<any[]>([]);
  const [nextVisit, setNextVisit] = useState(new Date());

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!motherId) {
          // Fallback if user clicked from an old cached screen
          const riskInput = {
            age: 25,
            systolicBP: answers.systolicBP ? parseFloat(answers.systolicBP) : 120,
            diastolicBP: answers.diastolicBP ? parseFloat(answers.diastolicBP) : 80,
            bloodSugar: answers.bloodSugar ? parseFloat(answers.bloodSugar) : 6.0,
          };
          
          setResult(calculateRisk(riskInput));
          setFactors([
            { label: 'Blood Pressure', labelHindi: 'ब्लड प्रेशर', value: '120/80', status: 'NORMAL', icon: '💓' },
            { label: 'Age', labelHindi: 'उम्र', value: '25 yrs', status: 'NORMAL', icon: '👩' }
          ]);
          setNextVisit(new Date());
          setLoading(false);
          return;
        }
        
        const m = await getMotherById(motherId);
        setMother(m);
        
        // Calculate risk
        const riskInput = {
          age: m.age,
          systolicBP: answers.systolicBP ? parseFloat(answers.systolicBP) : 120,
          diastolicBP: answers.diastolicBP ? parseFloat(answers.diastolicBP) : 80,
          bloodSugar: answers.bloodSugar ? parseFloat(answers.bloodSugar) : 6.0,
        };
        
        const riskOutput = calculateRisk(riskInput);
        setResult(riskOutput);
        
        const detailedFactors = getDetailedRiskFactors(answers, m);
        setFactors(detailedFactors);
        
        // Next visit calculation
        const date = new Date();
        if (riskOutput.riskTier === 'RED') {
          date.setDate(date.getDate() + 7);
        } else if (riskOutput.riskTier === 'AMBER') {
          date.setDate(date.getDate() + 14);
        } else {
          date.setDate(date.getDate() + 28);
        }
        setNextVisit(date);
      } catch(e: any) {
        console.error(e);
        setErrorMsg(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [motherId, answers]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C2185B" />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.center}>
        <Text style={{fontSize: 16, color: '#C2185B'}}>Error: Could not calculate risk.</Text>
        {errorMsg ? <Text style={{marginTop: 10, color: 'gray'}}>{errorMsg}</Text> : null}
      </View>
    );
  }

  const bgColor = result.riskTier === 'RED' ? '#F44336' : (result.riskTier === 'AMBER' ? '#FF9800' : '#4CAF50');
  const lightBgColor = result.riskTier === 'RED' ? '#FFEBEE' : (result.riskTier === 'AMBER' ? '#FFF3E0' : '#E8F5E9');
  
  let riskLabelEn = 'Low Risk';
  let riskLabelHi = 'कम जोखिम';
  if (result.riskTier === 'AMBER') {
    riskLabelEn = 'Medium Risk';
    riskLabelHi = 'मध्यम जोखिम';
  } else if (result.riskTier === 'RED') {
    riskLabelEn = 'High Risk';
    riskLabelHi = 'उच्च जोखिम';
  }

  const handleSave = async () => {
    if (motherId) {
      try {
        await updateMother(motherId, {
          nextVisitDate: nextVisit.toISOString(),
          riskTier: result.riskTier,
          riskScore: result.riskScore
        });
      } catch (e) {
        console.error(e);
      }
    }
    
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }]
    });
  };

  const getDotForStatus = (status: string) => {
    if (status === 'DANGER') return '🔴';
    if (status === 'WARNING') return '🟡';
    return '🟢';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topSection, { backgroundColor: bgColor }]}>
        <View style={styles.circle}>
          <Text style={[styles.scoreText, { color: bgColor }]}>{result.riskScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <Text style={styles.riskLabelEn}>{riskLabelEn}</Text>
        <Text style={styles.riskLabelHi}>{riskLabelHi}</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiNote}>🤖 AI Powered Risk Assessment</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Risk Factors / जोखिम कारण</Text>
        <View style={styles.factorsCard}>
          {factors.map((f, i) => (
            <View style={styles.factorRow} key={i}>
              <View style={styles.factorLeft}>
                <Text style={styles.factorIcon}>{f.icon}</Text>
                <Text style={styles.factorLabel}>{f.label}</Text>
              </View>
              <View style={styles.factorRight}>
                <Text style={styles.factorValue}>{f.value}</Text>
                <Text style={styles.factorDot}>{getDotForStatus(f.status)}</Text>
              </View>
            </View>
          ))}
          {factors.length === 0 && <Text style={{color: '#9E9E9E'}}>No data available</Text>}
        </View>

        <Text style={styles.sectionTitle}>AI Recommendation / सलाह</Text>
        <View style={[styles.recommendationCard, { backgroundColor: lightBgColor }]}>
          {result.riskTier === 'GREEN' && (
            <Text style={styles.recommendationText}>✅ Excellent! Continue regular ANC visits.{"\n"}अगली यात्रा 4 सप्ताह में।</Text>
          )}
          {result.riskTier === 'AMBER' && (
            <Text style={styles.recommendationText}>⚠️ Monitor closely. Visit again in 2 weeks.{"\n"}2 सप्ताह में फिर मिलें।</Text>
          )}
          {result.riskTier === 'RED' && (
            <Text style={styles.recommendationText}>🚨 Urgent care needed. Contact ANM supervisor today.{"\n"}आज ANM से मिलें।</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Next Visit Date / अगली यात्रा</Text>
        <View style={styles.dateCard}>
          <Ionicons name="calendar" size={24} color="#C2185B" />
          <Text style={styles.dateText}>{nextVisit.toDateString()}</Text>
          <TouchableOpacity>
            <Text style={styles.editDateText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save & Close / सहेजें</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  topSection: {
    height: '35%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
    marginBottom: 16
  },
  scoreText: { fontSize: 48, fontWeight: 'bold', includeFontPadding: false },
  scoreMax: { fontSize: 14, color: '#9E9E9E', marginTop: -5 },
  riskLabelEn: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  riskLabelHi: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  aiBadge: { 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    position: 'absolute', 
    bottom: 15 
  },
  aiNote: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  scroll: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#757575', marginBottom: 12, marginTop: 8 },
  
  factorsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 20 },
  factorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  factorLeft: { flexDirection: 'row', alignItems: 'center' },
  factorIcon: { fontSize: 20, marginRight: 12 },
  factorLabel: { fontSize: 16, color: '#424242' },
  factorRight: { flexDirection: 'row', alignItems: 'center' },
  factorValue: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginRight: 12 },
  factorDot: { fontSize: 14 },

  recommendationCard: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  recommendationText: { fontSize: 15, color: '#212121', lineHeight: 24, fontWeight: '500' },

  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2, marginBottom: 40 },
  dateText: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#212121', marginLeft: 12 },
  editDateText: { color: '#C2185B', fontSize: 14, fontWeight: 'bold' },

  footer: { padding: 20, paddingBottom: 30, backgroundColor: '#FAFAFA' },
  saveBtn: { backgroundColor: '#C2185B', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 3 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default RiskScoreScreen;