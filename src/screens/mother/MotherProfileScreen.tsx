import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { MotherStackParamList } from '../../../App';
import { getMotherById } from '../../database/motherRepository';
import { getVisitsByMother } from '../../database/visitRepository';
import { Mother, Visit } from '../../types';
import { useTranslation } from 'react-i18next';

type MotherProfileRouteProp = RouteProp<MotherStackParamList, 'MotherProfile'>;

const MotherProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<MotherProfileRouteProp>();
  const navigation = useNavigation<any>();
  const { motherId } = route.params;

  const [mother, setMother] = useState<Mother | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const m = await getMotherById(motherId);
        setMother(m);
        const v = await getVisitsByMother(motherId);
        setVisits(v);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [motherId]);

  if (loading || !mother) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C2185B" />
      </View>
    );
  }

  let topBg = '#4CAF50';
  let riskLabel = '✓ ' + (t('home.otherMothers') || 'Low Risk');
  if (mother.riskTier === 'RED') {
    topBg = '#F44336';
    riskLabel = '🚨 ' + (t('danger.emergencyTitle') || 'High Risk');
  } else if (mother.riskTier === 'AMBER') {
    topBg = '#FF9800';
    riskLabel = '⚠️ ' + (t('danger.attentionTitle') || 'Medium Risk');
  }

  const renderInfoItem = (label: string, value: string | number | undefined) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );

  const getIndicator = (condition: boolean) => (
    <Text style={{ color: condition ? '#4CAF50' : '#D32F2F', fontSize: 16 }}>
      {condition ? '🟢' : '🔴'}
    </Text>
  );

  const isBmiNormal = mother.bmi >= 18.5 && mother.bmi <= 24.9;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topCard, { backgroundColor: topBg }]}>
        <Text style={styles.motherName}>{mother.name}</Text>
        <Text style={styles.riskLabelText}>{riskLabel}</Text>
        <Text style={styles.riskScoreText}>{t('motherProfile.riskScore')}{mother.riskScore}/100</Text>
        <Text style={styles.weeksPregText}>{t('motherProfile.weeksPregnant')}{mother.weeksPregnant}</Text>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('motherProfile.basicInfo')}</Text>
          <View style={styles.grid}>
            {renderInfoItem(t('motherProfile.age'), mother.age)}
            {renderInfoItem(t('addMother.village'), mother.village)}
            {renderInfoItem(t('motherProfile.phone'), mother.phone)}
            {renderInfoItem(t('motherProfile.abhaId'), mother.abhaId)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('motherProfile.latestVitals')}</Text>
          <View style={styles.healthRow}>
            <Text style={styles.healthText}>{t('motherProfile.hemoglobin')}{mother.hemoglobin} g/dL</Text>
            {getIndicator(mother.hemoglobin >= 11)}
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthText}>{t('motherProfile.bloodPressure')}{mother.systolicBP}/{mother.diastolicBP}</Text>
            {getIndicator(mother.systolicBP <= 140)}
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthText}>{t('motherProfile.bloodSugar')}{mother.bloodSugar} mg/dL</Text>
            {getIndicator(mother.bloodSugar <= 140)}
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthText}>{t('motherProfile.bmi')}{mother.bmi > 0 ? mother.bmi.toFixed(1) : '-'}</Text>
            <Text style={{ fontSize: 16 }}>{isBmiNormal ? '🟢' : '🟡'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('motherProfile.recentVisits')}</Text>
          {visits.length === 0 ? (
            <Text style={styles.noVisitText}>{t('motherList.notVisitedYet')}</Text>
          ) : (
            visits.slice(0, 3).map((v, i) => (
              <View key={i} style={styles.visitCard}>
                <Text style={styles.visitDate}>{new Date(v.visitDate).toLocaleDateString()}</Text>
                <Text style={styles.visitDetails}>{t('motherProfile.tier')}{v.riskTierAtVisit}{t('motherProfile.action')}{v.actionTaken || t('motherProfile.none')}</Text>
              </View>
            ))
          )}
          {visits.length > 3 && (
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>{t('motherProfile.viewAllVisits')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity 
          style={[styles.btn, styles.startVisitBtn]}
          onPress={() => navigation.navigate('StartVisit', { motherId: mother.id })}
        >
          <Text style={styles.btnTextWhite}>🏠 {t('motherProfile.startVisitBtn')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.btn, styles.newbornBtn]}
          onPress={() => navigation.navigate('BreathScan', { newbornId: mother.id })}
        >
          <Text style={styles.btnTextPink}>{t('motherProfile.breathScanBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.newbornBtn]}
          onPress={() => navigation.navigate('VisionScan', { newbornId: mother.id })}
        >
          <Text style={styles.btnTextPink}>{t('motherProfile.visionScanBtn')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  topCard: {
    padding: 24,
    paddingTop: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 16,
  },
  motherName: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  riskLabelText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  riskScoreText: { color: '#ffffff', fontSize: 14, marginBottom: 2 },
  weeksPregText: { color: '#ffffff', fontSize: 14 },

  scrollContent: { paddingHorizontal: 16 },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#C2185B', marginBottom: 12 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 12 },
  infoLabel: { color: '#9E9E9E', fontSize: 13, marginBottom: 2 },
  infoValue: { color: '#212121', fontSize: 15, fontWeight: 'bold' },

  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  healthText: { fontSize: 15, color: '#424242', fontWeight: '500' },

  noVisitText: { color: '#9E9E9E', fontStyle: 'italic', paddingVertical: 8 },
  visitCard: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, marginBottom: 8 },
  visitDate: { fontWeight: 'bold', color: '#212121', marginBottom: 4 },
  visitDetails: { color: '#616161', fontSize: 13 },
  viewAllBtn: { alignItems: 'center', marginTop: 8 },
  viewAllText: { color: '#C2185B', fontWeight: 'bold' },

  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  startVisitBtn: { backgroundColor: '#C2185B', marginRight: 8 },
  newbornBtn: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#C2185B', marginLeft: 8 },
  btnTextWhite: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  btnTextPink: { color: '#C2185B', fontWeight: 'bold', fontSize: 16 }
});

export default MotherProfileScreen;