import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Alert
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotherStackParamList } from '../../../App';
import { getMotherById } from '../../database/motherRepository';
import { getVisitsByMother } from '../../database/visitRepository';
import { getBabiesByMother } from '../../database/babyRepository';
import { Mother, Visit, Baby } from '../../types';
import { useTranslation } from 'react-i18next';

type MotherProfileRouteProp = RouteProp<MotherStackParamList, 'MotherProfile'>;

const RISK_CONFIG = {
  RED:   { colors: ['#B71C1C', '#E53935'] as [string,string], icon: 'warning'        as const, label: 'High Risk'   },
  AMBER: { colors: ['#E65100', '#FB8C00'] as [string,string], icon: 'alert-circle'   as const, label: 'Medium Risk' },
  GREEN: { colors: ['#1B5E20', '#43A047'] as [string,string], icon: 'shield-checkmark' as const, label: 'Low Risk'  },
};

const STATUS_CONFIG = {
  PREGNANT:   { colors: ['#880E4F', '#C2185B'] as [string,string], label: 'Pregnant',    icon: 'heart'        as const },
  DELIVERED:  { colors: ['#0D47A1', '#1976D2'] as [string,string], label: 'Delivered',   icon: 'happy'        as const },
  POSTPARTUM: { colors: ['#4A148C', '#7B1FA2'] as [string,string], label: 'Postpartum',  icon: 'flower'       as const },
};

const MotherProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<MotherProfileRouteProp>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { motherId } = route.params;

  const [mother, setMother] = useState<Mother | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [babies, setBabies] = useState<Baby[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setLoading(true);
      const m = await getMotherById(motherId);
      setMother(m);
      const v = await getVisitsByMother(motherId);
      setVisits(v);
      const b = await getBabiesByMother(motherId);
      setBabies(b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused]);

  if (loading || !mother) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C2185B" />
      </View>
    );
  }

  const status = mother.status || 'PREGNANT';
  const statusCfg = STATUS_CONFIG[status];
  const riskCfg = RISK_CONFIG[mother.riskTier as keyof typeof RISK_CONFIG] || RISK_CONFIG.GREEN;
  const isDelivered = status !== 'PREGNANT';
  const latestBaby = babies.length > 0 ? babies[0] : null;

  const InfoPill = ({ icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={18} color="#C2185B" />
      <View style={{ marginLeft: 10 }}>
        <Text style={styles.pillLabel}>{label}</Text>
        <Text style={styles.pillValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  const VitalRow = ({ label, value, isOk }: { label: string; value: string; isOk: boolean }) => (
    <View style={styles.vitalRow}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={styles.vitalValue}>{value}</Text>
        <Ionicons name={isOk ? 'checkmark-circle' : 'close-circle'} size={20} color={isOk ? '#4CAF50' : '#F44336'} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient colors={statusCfg.colors} style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.statusBadge}>
              <Ionicons name={statusCfg.icon} size={14} color="#fff" />
              <Text style={styles.statusBadgeText}>{statusCfg.label}</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('EPDS', 'Navigate to EPDS')} style={styles.backBtn}>
              <Ionicons name="medical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{mother.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.motherName}>{mother.name}</Text>
              <Text style={styles.motherSub}>{mother.village}, {mother.district}</Text>
              <View style={styles.riskBadge}>
                <Ionicons name={riskCfg.icon} size={14} color="#fff" />
                <Text style={styles.riskBadgeText}>{riskCfg.label} • {mother.riskScore}/100</Text>
              </View>
            </View>
          </View>

          {/* Journey progress bar */}
          <View style={styles.journeyBar}>
            {['Registered', 'ANC Visits', 'Delivery', 'Postnatal'].map((step, i) => {
              const done = i === 0 ? true : i === 1 ? visits.length > 0 : i === 2 ? isDelivered : status === 'POSTPARTUM';
              return (
                <React.Fragment key={step}>
                  <View style={styles.journeyStep}>
                    <View style={[styles.journeyDot, done && styles.journeyDotDone]}>
                      {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                    </View>
                    <Text style={styles.journeyLabel}>{step}</Text>
                  </View>
                  {i < 3 && <View style={[styles.journeyLine, done && styles.journeyLineDone]} />}
                </React.Fragment>
              );
            })}
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}>

        {/* DELIVERY RECORDED CARD – shown only after delivery */}
        {isDelivered && mother.deliveryDate && (
          <View style={styles.deliveryCard}>
            <Ionicons name="happy-outline" size={32} color="#1565C0" />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.deliveryTitle}>Delivery Recorded</Text>
              <Text style={styles.deliverySub}>{mother.deliveryType} • {mother.deliveryDate?.split('T')[0]}</Text>
              {mother.deliveryBabyWeight ? (
                <Text style={styles.deliverySub}>Baby weight: {mother.deliveryBabyWeight} kg</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* BABY PROFILE CARDS */}
        {babies.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Baby Profiles</Text>
            {babies.map(b => (
              <TouchableOpacity
                key={b.id}
                style={styles.babyRow}
                onPress={() => navigation.navigate('BabyProfile', { babyId: b.id })}
              >
                <View style={styles.babyAvatar}>
                  <Ionicons name={b.gender === 'FEMALE' ? 'female' : 'male'} size={22} color="#0097A7" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.babyName}>{b.name}</Text>
                  <Text style={styles.babySub}>Born: {b.dateOfBirth?.split('T')[0]} • {b.birthWeightKg} kg</Text>
                </View>
                <View style={[styles.babyStatus, b.currentStatus === 'ACTIVE' && { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.babyStatusText, b.currentStatus === 'ACTIVE' && { color: '#2E7D32' }]}>
                    {b.currentStatus === 'NEONATAL_COMPLETE' ? 'Completed' : 'Active'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9E9E9E" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* QUICK STATS */}
        <View style={styles.pillGrid}>
          <InfoPill icon="calendar-outline" label="Weeks" value={isDelivered ? 'Delivered' : `${mother.weeksPregnant}w`} />
          <InfoPill icon="people-outline" label="Parity" value={mother.parity} />
          <InfoPill icon="call-outline" label="Phone" value={mother.phone || '–'} />
          <InfoPill icon="card-outline" label="ABHA" value={mother.abhaId || '–'} />
        </View>

        {/* VITALS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest Vitals</Text>
          <VitalRow label="Hemoglobin" value={`${mother.hemoglobin} g/dL`} isOk={mother.hemoglobin >= 11} />
          <VitalRow label="Blood Pressure" value={`${mother.systolicBP}/${mother.diastolicBP}`} isOk={mother.systolicBP <= 140} />
          <VitalRow label="Blood Sugar" value={`${mother.bloodSugar} mmol/L`} isOk={mother.bloodSugar <= 7.8} />
          <VitalRow label="BMI" value={mother.bmi > 0 ? mother.bmi.toFixed(1) : '-'} isOk={mother.bmi >= 18.5 && mother.bmi <= 24.9} />
        </View>

        {/* ANC VISITS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ANC Visits ({visits.length})</Text>
          {visits.length === 0 ? (
            <Text style={styles.emptyText}>No visits recorded yet</Text>
          ) : (
            visits.slice(0, 4).map((v, i) => (
              <View key={i} style={styles.visitRow}>
                <View style={[styles.visitDot, { backgroundColor: v.riskTierAtVisit === 'RED' ? '#F44336' : v.riskTierAtVisit === 'AMBER' ? '#FF9800' : '#4CAF50' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitDate}>{new Date(v.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  <Text style={styles.visitSub}>{v.riskTierAtVisit} Risk • {v.actionTaken || 'Routine'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 6 }]}>
        {!isDelivered ? (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('StartVisit', { motherId: mother.id })}
            >
              <LinearGradient colors={['#C2185B', '#E91E63']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.primaryBtnGrad}>
                <Ionicons name="clipboard" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>ANC Visit</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('RecordDelivery', { motherId: mother.id, motherName: mother.name })}
            >
              <Ionicons name="heart" size={16} color="#C2185B" />
              <Text style={styles.secondaryBtnText}>Delivery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (latestBaby) navigation.navigate('BabyProfile', { babyId: latestBaby.id });
                else navigation.navigate('RecordDelivery', { motherId: mother.id, motherName: mother.name });
              }}
            >
              <LinearGradient colors={['#0097A7', '#00BCD4']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.primaryBtnGrad}>
                <Ionicons name="person" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>{latestBaby ? 'Baby' : 'Register'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('EPDS', { motherId: mother.id })}
            >
              <Ionicons name="medical" size={16} color="#C2185B" />
              <Text style={styles.secondaryBtnText}>EPDS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  statusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  motherName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  motherSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start' },
  riskBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  journeyBar: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  journeyStep: { alignItems: 'center' },
  journeyDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  journeyDotDone: { backgroundColor: '#fff' },
  journeyLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 16 },
  journeyLineDone: { backgroundColor: '#fff' },
  journeyLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600' },

  scrollContent: { padding: 16, paddingBottom: 90 },

  deliveryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1565C0' },
  deliveryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1565C0' },
  deliverySub: { fontSize: 13, color: '#1976D2', marginTop: 2 },

  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  infoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, width: '47%', elevation: 1 },
  pillLabel: { color: '#9E9E9E', fontSize: 11 },
  pillValue: { color: '#1A1A2E', fontSize: 14, fontWeight: 'bold' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#C2185B', marginBottom: 12 },

  babyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  babyAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F7FA', justifyContent: 'center', alignItems: 'center' },
  babyName: { fontSize: 15, fontWeight: 'bold', color: '#1A1A2E' },
  babySub: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  babyStatus: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  babyStatusText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  vitalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  vitalLabel: { color: '#4B5563', fontSize: 14, fontWeight: '600' },
  vitalValue: { color: '#1A1A2E', fontSize: 14, fontWeight: 'bold' },

  visitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  visitDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 2 },
  visitDate: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E' },
  visitSub: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  emptyText: { color: '#9E9E9E', fontStyle: 'italic', paddingVertical: 8 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 0, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  btnRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#C2185B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6 },
  primaryBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FCE4EC', borderRadius: 24, paddingVertical: 12 },
  secondaryBtnText: { color: '#C2185B', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
});

export default MotherProfileScreen;