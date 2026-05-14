import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  ActivityIndicator, Animated, Easing, FlatList,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database/db';
import { getAllMothers } from '../../database/motherRepository';
import { Mother } from '../../types';
import SyncStatusBar from '../../components/SyncStatusBar';

// ── Priority scoring
interface ScoredMother extends Mother {
  priorityScore: number;
  daysSinceVisit: number;
  visitReasonKey: string;
}

const scoreMother = (m: Mother): ScoredMother => {
  let score = 0;
  if (m.riskTier === 'RED') score += 100;
  else if (m.riskTier === 'AMBER') score += 60;
  else score += 20;

  const daysSinceVisit = m.lastVisitDate
    ? Math.floor((Date.now() - new Date(m.lastVisitDate).getTime()) / 86400000)
    : 999;
  if (daysSinceVisit > 14) score += 40;
  else if (daysSinceVisit > 7) score += 20;

  if (m.weeksPregnant >= 36) score += 50;
  else if (m.weeksPregnant >= 28) score += 25;

  if (m.systolicBP > 140) score += 30;
  if (m.hemoglobin < 11) score += 20;

  let visitReasonKey = 'visit.routineReason';
  if (m.riskTier === 'RED') visitReasonKey = 'visit.highRiskReason';
  else if (m.weeksPregnant >= 36) visitReasonKey = 'visit.nearDeliveryReason';
  else if (daysSinceVisit > 14) visitReasonKey = 'visit.overdueReason';

  return { ...m, priorityScore: score, daysSinceVisit, visitReasonKey };
};



// ── Skeleton placeholder
const SkeletonBar = ({ width, height = 14 }: { width: string | number; height?: number }) => {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: width as any, height, borderRadius: 6, backgroundColor: '#E0E0E0', opacity: anim, marginBottom: 8 }} />;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();

  const [userName, setUserName] = useState('');
  const [ashaId, setAshaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [mothers, setMothers] = useState<ScoredMother[]>([]);
  const [showOthers, setShowOthers] = useState(false);

  // Stats
  const [totalMothers, setTotalMothers] = useState(0);
  const [highRisk, setHighRisk] = useState(0);
  const [visitsToday, setVisitsToday] = useState(0);
  const [unsynced, setUnsynced] = useState(0);
  const [breathScans, setBreathScans] = useState(0);
  const [reminders, setReminders] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      setUserName(session.name || 'ASHA Worker');
      const aid = session.odId || '';
      setAshaId(aid);

      // Fetch mothers
      const allMothers = await getAllMothers(aid);
      const scored = allMothers.map(scoreMother).sort((a, b) => b.priorityScore - a.priorityScore);
      setMothers(scored);
      setTotalMothers(allMothers.length);
      setHighRisk(allMothers.filter(m => m.riskTier === 'RED').length);

      // Visits today
      const today = new Date().toISOString().split('T')[0];
      const vt: any = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM visits WHERE asha_id = ? AND visit_date LIKE ?",
        [aid, `${today}%`]
      );
      setVisitsToday(vt?.count || 0);

      // Unsynced
      const um: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM mothers WHERE is_synced = 0');
      const uv: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM visits WHERE is_synced = 0');
      const un: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM newborns WHERE is_synced = 0');
      const ub: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM breath_scans WHERE is_synced = 0');
      setUnsynced((um?.c || 0) + (uv?.c || 0) + (un?.c || 0) + (ub?.c || 0));

      // Breath scans
      const bs: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM breath_scans');
      setBreathScans(bs?.c || 0);

      // Reminders
      const rems: string[] = [];
      const now = Date.now();
      allMothers.forEach(m => {
        if (m.nextVisitDate && new Date(m.nextVisitDate).getTime() < now) {
          rems.push(`📅 ${m.name} — ${t('home.visitOverdue')}`);
        }
        if (m.weeksPregnant >= 35 && m.weeksPregnant <= 36) {
          rems.push(`🕐 ${m.name} — ${t('home.nearDelivery')}`);
        }
      });
      setReminders(rems);
    } catch (e) {
      console.error('Home load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isFocused) loadData(); }, [isFocused]);

  const priorityMothers = mothers.slice(0, 5);
  const otherMothers = mothers.slice(5);

  // ── Risk color helpers
  const riskColor = (t: string) => t === 'RED' ? '#F44336' : t === 'AMBER' ? '#FF9800' : '#4CAF50';
  const dayColor = (d: number) => d > 14 ? '#F44336' : d > 7 ? '#FF9800' : '#4CAF50';

  const formatLastVisit = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // ═══════════════════════════════════════
  // RENDER: Priority Card
  // ═══════════════════════════════════════
  const renderPriorityCard = (m: ScoredMother, index: number) => (
    <TouchableOpacity
      key={m.id}
      style={styles.pCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Mothers', { screen: 'MotherProfile', params: { motherId: m.id, motherName: m.name } })}
    >
      {/* Left risk strip */}
      <View style={[styles.pStrip, { backgroundColor: riskColor(m.riskTier) }]} />

      <View style={styles.pContent}>
        {/* Top row */}
        <View style={styles.pTopRow}>
          <View style={styles.pBadge}><Text style={styles.pBadgeText}>{index + 1}</Text></View>
          <Text style={styles.pName} numberOfLines={1}>{m.name}</Text>
          <View style={[styles.riskTag, { backgroundColor: riskColor(m.riskTier) + '20' }]}>
            <Text style={[styles.riskTagText, { color: riskColor(m.riskTier) }]}>{m.riskTier}</Text>
          </View>
        </View>

        {/* Middle row */}
        <View style={styles.pMidRow}>
          <Text style={styles.pMeta}>🏘️ {m.village || '—'}</Text>
          <Text style={styles.pMeta}>  🤰 {m.weeksPregnant || 0} weeks</Text>
        </View>

        {/* Visit reason */}
        <Text style={styles.pReason}>{t(m.visitReasonKey)}</Text>

        {/* Bottom row */}
        <View style={styles.pBottomRow}>
          <Text style={styles.pDate}>{t('home.lastVisit')} {formatLastVisit(m.lastVisitDate)}</Text>
          <Text style={[styles.pDays, { color: dayColor(m.daysSinceVisit) }]}>
            {m.daysSinceVisit >= 999 ? t('home.noVisit') : `${m.daysSinceVisit} ${t('home.daysAgo')}`}
          </Text>
          <TouchableOpacity
            style={styles.pVisitBtn}
            onPress={() => navigation.navigate('Mothers', { screen: 'StartVisit', params: { motherId: m.id } })}
          >
            <Text style={styles.pVisitBtnText}>{t('home.visitBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ═══════════════════════════════════════
  // RENDER: Stat card
  // ═══════════════════════════════════════
  const renderStat = (emoji: string, count: number, label: string, tint?: string, onTap?: () => void) => (
    <TouchableOpacity
      key={label}
      style={[styles.statCard, tint ? { backgroundColor: tint + '10' } : null]}
      activeOpacity={onTap ? 0.7 : 1}
      onPress={onTap}
    >
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statCount, tint ? { color: tint } : null]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // ═══════════════════════════════════════
  // LOADING SKELETON
  // ═══════════════════════════════════════
  if (loading && mothers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View><SkeletonBar width={120} /><SkeletonBar width={180} height={22} /><SkeletonBar width={160} /></View>
        </View>
        <View style={{ padding: 20 }}>
          <SkeletonBar width="60%" height={18} />
          {[1,2,3].map(i => <View key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}><SkeletonBar width="80%" height={16} /><SkeletonBar width="50%" /><SkeletonBar width="70%" /></View>)}
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? t('home.goodMorning') : 
               new Date().getHours() < 17 ? t('home.goodAfternoon') : 
               t('home.goodEvening')}
            </Text>
            <Text style={styles.headerName}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── SYNC BAR */}
        {ashaId ? <SyncStatusBar ashaId={ashaId} /> : null}

        {/* ── QUICK STATS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          {renderStat('👩', totalMothers, t('home.totalMothers'))}
          {renderStat('🔴', highRisk, t('home.highRisk'), '#F44336')}
          {renderStat('📅', visitsToday, t('home.visitsToday'), '#2196F3')}
          {renderStat('🫁', breathScans, t('home.breathScans'), '#9C27B0')}
          {renderStat('☁️', unsynced, t('home.pendingSync'), unsynced > 0 ? '#FF9800' : undefined, () => navigation.navigate('Sync'))}
        </ScrollView>

        {/* ── EMPTY STATE */}
        {mothers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🤰</Text>
            <Text style={styles.emptyTitle}>{t('home.noMothersTitle')}</Text>
            <Text style={styles.emptyHindi}>{t('home.noMothersSub')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Mothers', { screen: 'AddMother' })}>
              <Text style={styles.emptyBtnText}>{t('home.addMotherBtn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── PRIORITY VISITS */}
            <Text style={styles.sectionTitle}>{t('home.priorityVisits')}</Text>
            {priorityMothers.map((m, i) => renderPriorityCard(m, i))}

            {/* ── OTHER MOTHERS (collapsible) */}
            {otherMothers.length > 0 && (
              <>
                <TouchableOpacity style={styles.otherHeader} onPress={() => setShowOthers(!showOthers)}>
                  <Text style={styles.otherTitle}>{t('home.otherMothers')} ({otherMothers.length})</Text>
                  <Ionicons name={showOthers ? 'chevron-up' : 'chevron-down'} size={22} color="#757575" />
                </TouchableOpacity>
                {showOthers && otherMothers.map((m, i) => renderPriorityCard(m, i + 5))}
              </>
            )}

            {/* ── REMINDERS */}
            {reminders.length > 0 && (
              <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
                <Text style={styles.sectionTitle}>{t('home.reminders')}</Text>
                {reminders.map((r, i) => (
                  <View key={i} style={styles.reminderChip}>
                    <Text style={styles.reminderText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    backgroundColor: '#C2185B', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    flexDirection: 'row', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5,
  },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginVertical: 2 },
  headerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  // Sync bar
  syncBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: -12,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  syncText: { fontSize: 13, marginLeft: 8, fontWeight: '500' },

  // Stats row
  statsRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  statCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, minWidth: 100, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statCount: { fontSize: 24, fontWeight: 'bold', color: '#212121' },
  statLabel: { fontSize: 11, color: '#757575', textAlign: 'center', marginTop: 2, lineHeight: 15 },

  // Section
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginHorizontal: 16, marginBottom: 12, marginTop: 8 },

  // Priority card
  pCard: {
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  pStrip: { width: 6 },
  pContent: { flex: 1, padding: 12 },
  pTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#C2185B', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  pBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  pName: { flex: 1, fontSize: 17, fontWeight: 'bold', color: '#212121' },
  riskTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  riskTagText: { fontSize: 11, fontWeight: 'bold' },
  pMidRow: { flexDirection: 'row', marginBottom: 4 },
  pMeta: { fontSize: 13, color: '#757575' },
  pReason: { fontSize: 12, color: '#9E9E9E', fontStyle: 'italic', marginBottom: 8 },
  pBottomRow: { flexDirection: 'row', alignItems: 'center' },
  pDate: { fontSize: 12, color: '#9E9E9E', flex: 1 },
  pDays: { fontSize: 12, fontWeight: '600', marginRight: 12 },
  pVisitBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#FCE4EC' },
  pVisitBtnText: { color: '#C2185B', fontSize: 13, fontWeight: 'bold' },

  // Other mothers
  otherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 8, marginBottom: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  otherTitle: { fontSize: 14, fontWeight: '600', color: '#757575' },

  // Reminders
  reminderChip: { backgroundColor: '#FFF8E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: '#FFB300' },
  reminderText: { fontSize: 13, color: '#795548', fontWeight: '500' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#424242', marginBottom: 6 },
  emptyHindi: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#C2185B', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default HomeScreen;