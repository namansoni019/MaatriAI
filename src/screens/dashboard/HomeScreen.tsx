import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, Dimensions, Platform
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../database/db';
import { getAllMothers } from '../../database/motherRepository';
import { Mother, Baby } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ──
interface ScoredMother extends Mother {
  priorityScore: number;
  daysSinceVisit: number;
  visitReasonKey: string;
}

interface ActivityItem {
  id: string;
  type: 'visit' | 'highRisk' | 'mother' | 'sync';
  titleKey: string;
  subtitle: string;
  date: Date;
}

// ── Logic Helpers ──
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

const AnimatedNumber = ({ value, style }: { value: number, style?: any }) => {
  const [displayVal, setDisplayVal] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.stopAnimation();
    Animated.timing(anim, {
      toValue: value,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    anim.addListener((v) => {
      setDisplayVal(Math.floor(v.value));
    });
    return () => anim.removeAllListeners();
  }, [value]);

  return <Text style={style}>{displayVal}</Text>;
};

// ── Premium Skeleton ──
const PremiumSkeleton = ({ width, height = 16, borderRadius = 8, style }: any) => {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#E5E7EB', opacity: anim }, style]} />;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [totalMothers, setTotalMothers] = useState(0);
  const [highRisk, setHighRisk] = useState(0);
  const [visitsToday, setVisitsToday] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [visionCount, setVisionCount] = useState(0);
  const [unsynced, setUnsynced] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [babiesCount, setBabiesCount] = useState(0);
  const [recentDeliveries, setRecentDeliveries] = useState<{mother: Mother, baby: Baby | null}[]>([]);
  
  const [priorityMothers, setPriorityMothers] = useState<ScoredMother[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  // Animations
  const animHeader = useRef(new Animated.Value(0)).current;
  const animStats = useRef(new Animated.Value(0)).current;
  const animAlert = useRef(new Animated.Value(0)).current;
  const animVisits = useRef(new Animated.Value(0)).current;
  const animActions = useRef(new Animated.Value(0)).current;
  const animTimeline = useRef(new Animated.Value(0)).current;
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      setUserName(session.name || 'ASHA Worker');
      const aid = session.odId || session.id || '';

      // Mothers
      const allMothers = await getAllMothers(aid);
      const scored = allMothers.map(scoreMother).sort((a, b) => b.priorityScore - a.priorityScore);
      setPriorityMothers(scored.slice(0, 3));
      
      const hrCount = allMothers.filter(m => m.riskTier === 'RED').length;
      setTotalMothers(allMothers.length);
      setHighRisk(hrCount);

      // Visits Today
      const todayStr = new Date().toISOString().split('T')[0];
      const vt: any = await db.getFirstAsync(
        "SELECT COUNT(*) as count FROM visits WHERE asha_id = ? AND visit_date LIKE ?",
        [aid, `${todayStr}%`]
      );
      setVisitsToday(vt?.count || 0);

      const bc: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM breath_scans WHERE asha_id = ?", [aid]);
      setBreathCount(bc?.count || 0);

      const vc: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM babies WHERE asha_id = ?", [aid]);
      setVisionCount(vc?.count || 0);

      // Delivered mothers & babies
      const dc = allMothers.filter(m => m.status === 'DELIVERED' || m.status === 'POSTPARTUM').length;
      setDeliveredCount(dc);
      const babyCount: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM babies WHERE asha_id = ?", [aid]);
      setBabiesCount(babyCount?.count || 0);

      // Recent Deliveries (last 3 delivered mothers)
      const delivered = allMothers
        .filter(m => m.status === 'DELIVERED' || m.status === 'POSTPARTUM')
        .sort((a, b) => (b.deliveryDate || '').localeCompare(a.deliveryDate || ''))
        .slice(0, 3);
      const deliveryItems: {mother: Mother, baby: Baby | null}[] = [];
      for (const dm of delivered) {
        const babyRow: any = await db.getFirstAsync('SELECT * FROM babies WHERE mother_id = ? ORDER BY created_at DESC LIMIT 1', [dm.id]);
        deliveryItems.push({
          mother: dm,
          baby: babyRow ? { id: babyRow.id, motherId: babyRow.mother_id, ashaId: babyRow.asha_id, name: babyRow.name, gender: babyRow.gender, dateOfBirth: babyRow.date_of_birth, birthWeightKg: babyRow.birth_weight_kg, birthType: babyRow.birth_type, currentStatus: babyRow.current_status, isSynced: Boolean(babyRow.is_synced), createdAt: babyRow.created_at } : null
        });
      }
      setRecentDeliveries(deliveryItems);

      // Unsynced
      const um: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM mothers WHERE is_synced = 0');
      const uv: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM visits WHERE is_synced = 0');
      const un: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM babies WHERE is_synced = 0');
      const ub: any = await db.getFirstAsync('SELECT COUNT(*) as c FROM breath_scans WHERE is_synced = 0');
      setUnsynced((um?.c || 0) + (uv?.c || 0) + (un?.c || 0) + (ub?.c || 0));

      // Recent Activity
      const activities: ActivityItem[] = [];
      const visits: any[] = await db.getAllAsync("SELECT * FROM visits WHERE asha_id = ? ORDER BY visit_date DESC LIMIT 3", [aid]);
      
      for (const v of visits) {
        if (v.riskTierAtVisit === 'RED') {
          activities.push({ id: `hr_${v.id}`, type: 'highRisk', titleKey: 'home.highRiskFound', subtitle: `Tier: RED`, date: new Date(v.visitDate) });
        } else {
          activities.push({ id: `v_${v.id}`, type: 'visit', titleKey: 'home.visitCompleted', subtitle: `Routine Check`, date: new Date(v.visitDate) });
        }
      }
      setRecentActivities(activities.slice(0, 3));

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      startMountAnimations();
    }
  };

  useEffect(() => { if (isFocused) loadData(); }, [isFocused]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.75, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const startMountAnimations = () => {
    animHeader.setValue(0);
    animStats.setValue(0);
    animAlert.setValue(0);
    animVisits.setValue(0);
    animActions.setValue(0);
    animTimeline.setValue(0);

    Animated.stagger(100, [
      Animated.timing(animHeader, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(animStats, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(animAlert, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(animVisits, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(animActions, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(animTimeline, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('home.goodMorning');
    if (h < 17) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  const getFadeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
  });

  const renderSkeleton = () => (
    <View style={styles.container}>
      <LinearGradient colors={['#880E4F', '#C2185B', '#E91E8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.headerGradient, { paddingTop: insets.top + 16, height: 180 + insets.top }]}>
        <View style={styles.headerTop}>
          <View>
            <PremiumSkeleton width={100} height={14} style={{ marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <PremiumSkeleton width={160} height={28} style={{ backgroundColor: 'rgba(255,255,255,0.4)' }} />
          </View>
          <PremiumSkeleton width={50} height={50} borderRadius={25} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </View>
      </LinearGradient>
      <View style={{ paddingHorizontal: 16, marginTop: -28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[1,2,3].map(i => <PremiumSkeleton key={i} width={(SCREEN_WIDTH - 48)/3} height={110} borderRadius={16} style={{ backgroundColor: '#fff' }} />)}
        </View>
        <PremiumSkeleton width="100%" height={30} style={{ marginTop: 24, marginBottom: 16 }} />
        <PremiumSkeleton width="100%" height={140} borderRadius={20} style={{ backgroundColor: '#fff', marginBottom: 12 }} />
        <PremiumSkeleton width="100%" height={140} borderRadius={20} style={{ backgroundColor: '#fff' }} />
      </View>
    </View>
  );

  if (loading) return renderSkeleton();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        
        {/* 1. GRADIENT HEADER */}
        <Animated.View style={getFadeSlide(animHeader)}>
          <LinearGradient 
            colors={['#880E4F', '#C2185B', '#E91E8C']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={[styles.headerGradient, { paddingTop: insets.top + 16, height: 180 + insets.top }]}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.userName}>{userName}</Text>
              </View>
              <TouchableOpacity style={styles.avatarBorder} onPress={() => navigation.navigate('Profile')}>
                <LinearGradient colors={['#E91E8C', '#C2185B']} style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{userName ? userName.charAt(0).toUpperCase() : 'A'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerBottom}>
              <View style={styles.pill}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.pillText}>{t('home.activeDuty')}</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name="calendar" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.pillText}>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* 2. FLOATING STATS ROW */}
        <Animated.View style={[styles.statsRow, getFadeSlide(animStats)]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            <View style={[styles.statCard, { marginRight: 12 }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="people" size={20} color="#C2185B" />
              </View>
              <AnimatedNumber value={totalMothers} style={styles.statNumber} />
              <Text style={styles.statLabel}>{t('app.tabMothers')}</Text>
              <View style={styles.microBarBg}>
                <View style={[styles.microBarFill, { width: totalMothers > 0 ? `${(highRisk/totalMothers)*100}%` : '0%', backgroundColor: '#C2185B' }]} />
              </View>
            </View>
            
            <View style={[styles.statCard, { marginRight: 12 }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="warning" size={20} color="#C62828" />
              </View>
              <AnimatedNumber value={highRisk} style={[styles.statNumber, { color: '#C62828' }]} />
              <Text style={styles.statLabel}>{t('home.highRiskBadge')}</Text>
              {highRisk > 0 && (
                <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
              )}
            </View>

            <View style={[styles.statCard, { marginRight: 12 }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2F1' }]}>
                <Ionicons name="checkmark-done" size={20} color="#00897B" />
              </View>
              <AnimatedNumber value={visitsToday} style={[styles.statNumber, { color: '#00897B' }]} />
              <Text style={styles.statLabel}>{t('home.visitCompleted')}</Text>
            </View>

            <View style={[styles.statCard, { marginRight: 12 }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="pulse" size={20} color="#0288D1" />
              </View>
              <AnimatedNumber value={breathCount} style={[styles.statNumber, { color: '#0288D1' }]} />
              <Text style={styles.statLabel}>{t('home.actionBreath')}</Text>
            </View>

            <View style={[styles.statCard, { marginRight: 12 }]}>
              <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="scan" size={20} color="#7B1FA2" />
              </View>
              <AnimatedNumber value={visionCount} style={[styles.statNumber, { color: '#7B1FA2' }]} />
              <Text style={styles.statLabel}>{t('home.actionVision')}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F7FA' }]}>
                <Ionicons name="happy" size={20} color="#00838F" />
              </View>
              <AnimatedNumber value={babiesCount} style={[styles.statNumber, { color: '#00838F' }]} />
              <Text style={styles.statLabel}>Babies</Text>
            </View>
          </ScrollView>
        </Animated.View>

        {/* 3. URGENT ALERT BANNER */}
        {highRisk > 0 && (
          <Animated.View style={[{ paddingHorizontal: 16, marginBottom: 24 }, getFadeSlide(animAlert)]}>
            <Animated.View style={{ opacity: pulseAnim }}>
              <LinearGradient colors={['#C62828', '#E53935']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.urgentBanner}>
                <View style={styles.urgentIconWrapper}>
                  <Ionicons name="alert" size={20} color="#fff" />
                </View>
                <View style={styles.urgentTextWrapper}>
                  <Text style={styles.urgentTitle}>{t('home.urgentTitle')}</Text>
                  <Text style={styles.urgentSub}>{t('home.urgentSub', { count: highRisk })}</Text>
                </View>
                <TouchableOpacity style={styles.urgentBtn} onPress={() => navigation.navigate('Mothers')}>
                  <Text style={styles.urgentBtnText}>{t('home.viewBtn')}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        )}

        {/* 4. PRIORITY VISITS */}
        <Animated.View style={getFadeSlide(animVisits)}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{t('home.priorityVisits')}</Text>
              <View style={styles.titleUnderline} />
            </View>
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Mothers')}>
              <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
              <Ionicons name="chevron-forward" size={12} color="#C2185B" />
            </TouchableOpacity>
          </View>

          {priorityMothers.length === 0 ? (
            <View style={styles.premiumEmpty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#C2185B" />
              </View>
              <Text style={styles.emptyTitle}>{t('home.noActivityTitle')}</Text>
              <Text style={styles.emptySub}>{t('home.noActivitySub')}</Text>
            </View>
          ) : (
            priorityMothers.map((m, i) => {
              const rColors = m.riskTier === 'RED' ? ['#C62828', '#E53935'] : m.riskTier === 'AMBER' ? ['#E65100', '#F57C00'] : ['#00695C', '#00897B'];
              const rBadge = m.riskTier === 'RED' ? t('home.highRiskBadge') : m.riskTier === 'AMBER' ? t('home.monitorBadge') : t('home.routineBadge');
              const isOverdue = m.daysSinceVisit > 14 && m.daysSinceVisit < 999;
              
              return (
                <View key={m.id} style={styles.priorityCard}>
                  <View style={styles.pCardTop}>
                    <View style={styles.pCardTopLeft}>
                      <LinearGradient colors={rColors as any} style={styles.priorityCircle}>
                        <Text style={styles.priorityNumber}>{i + 1}</Text>
                      </LinearGradient>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.pCardName} numberOfLines={1}>{m.name}</Text>
                        <View style={styles.pCardMetaRow}>
                          <Ionicons name="location" size={12} color="#6B7280" />
                          <Text style={styles.pCardMeta}>{m.village || '—'}</Text>
                          <Ionicons name="body" size={12} color="#6B7280" style={{ marginLeft: 8 }} />
                          <Text style={styles.pCardMeta}>{m.status === 'DELIVERED' || m.status === 'POSTPARTUM' ? 'Delivered' : `${m.weeksPregnant}w`}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.pCardTopRight}>
                      <View style={[styles.riskBadge, { backgroundColor: rColors[0] }]}>
                        <Text style={styles.riskBadgeText}>{rBadge}</Text>
                      </View>
                      <Text style={[styles.pCardRecency, isOverdue && { color: '#C62828' }]}>
                        {m.daysSinceVisit >= 999 ? 'Never' : `${m.daysSinceVisit}d ${t('home.ago')}`}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pCardDivider} />
                  
                  <View style={styles.pCardBottom}>
                    <View style={styles.reasonChip}>
                      <Ionicons name="information-circle" size={14} color="#C2185B" style={{ marginRight: 4 }} />
                      <Text style={styles.reasonText}>{t(m.visitReasonKey)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Mothers', { screen: 'StartVisit', params: { motherId: m.id } })}>
                      <LinearGradient colors={['#C2185B', '#E91E8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startVisitBtn}>
                        <Text style={styles.startVisitText}>Start Visit</Text>
                        <Ionicons name="arrow-forward" size={12} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>

        {/* 4b. RECENT DELIVERIES */}
        {recentDeliveries.length > 0 && (
          <Animated.View style={[getFadeSlide(animVisits), { marginTop: 8 }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Recent Deliveries</Text>
                <View style={[styles.titleUnderline, { backgroundColor: '#0097A7' }]} />
              </View>
            </View>
            {recentDeliveries.map((item) => (
              <TouchableOpacity
                key={item.mother.id}
                style={[styles.priorityCard, { borderLeftWidth: 4, borderLeftColor: '#0097A7' }]}
                onPress={() => {
                  if (item.baby) navigation.navigate('Mothers', { screen: 'BabyProfile', params: { babyId: item.baby.id } });
                  else navigation.navigate('Mothers', { screen: 'MotherProfile', params: { motherId: item.mother.id, motherName: item.mother.name } });
                }}
              >
                <View style={styles.pCardTop}>
                  <View style={styles.pCardTopLeft}>
                    <View style={[styles.priorityCircle, { backgroundColor: '#0097A7' }]}>
                      <Ionicons name="happy" size={16} color="#fff" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.pCardName} numberOfLines={1}>{item.mother.name}</Text>
                      <Text style={styles.pCardMeta}>
                        {item.mother.deliveryType} • {item.mother.deliveryDate?.split('T')[0]}
                      </Text>
                    </View>
                  </View>
                  {item.baby && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#00838F' }}>{item.baby.name}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>{item.baby.birthWeightKg} kg</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* 5. QUICK ACTIONS GRID */}
        <Animated.View style={getFadeSlide(animActions)}>
          <Text style={[styles.sectionTitle, { marginLeft: 16, marginTop: 16, marginBottom: 12 }]}>{t('home.quickActions')}</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <TouchableOpacity style={styles.gridItemWrapper} activeOpacity={0.8} onPress={() => navigation.navigate('Mothers', { screen: 'AddMother', params: { fromHome: true } })}>
                <LinearGradient colors={['#E91E8C', '#C2185B']} style={styles.gridCard}>
                  <View style={styles.gridDeco} />
                  <Ionicons name="person-add" size={28} color="#fff" />
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.gridLabel}>{t('home.actionAddMother')}</Text>
                    <Text style={styles.gridSub}>{t('home.actionAddMotherSub')}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.gridItemWrapper} activeOpacity={0.8} onPress={() => navigation.navigate('Sync')}>
                <LinearGradient colors={['#2E7D32', '#43A047']} style={styles.gridCard}>
                  <View style={styles.gridDeco} />
                  {unsynced > 0 && <View style={styles.syncDot} />}
                  <Ionicons name="cloud-upload" size={28} color="#fff" />
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.gridLabel}>{t('home.actionSync')}</Text>
                    <Text style={styles.gridSub}>{t('home.actionSyncSub', { count: unsynced })}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* 6. RECENT ACTIVITY TIMELINE */}
        <Animated.View style={getFadeSlide(animTimeline)}>
          <Text style={[styles.sectionTitle, { marginLeft: 16, marginTop: 24, marginBottom: 16 }]}>{t('home.recentActivity')}</Text>
          
          {recentActivities.length === 0 ? (
            <View style={[styles.premiumEmpty, { marginHorizontal: 16 }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="time-outline" size={32} color="#7B1FA2" />
              </View>
              <Text style={styles.emptyTitle}>{t('home.noActivityTitle')}</Text>
              <Text style={styles.emptySub}>{t('home.noActivitySub')}</Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              <View style={styles.timelineLine} />
              {recentActivities.map((act, i) => {
                let dColor = '#C2185B';
                if (act.type === 'highRisk') dColor = '#C62828';
                else if (act.type === 'visit') dColor = '#00897B';
                else if (act.type === 'sync') dColor = '#2E7D32';

                return (
                  <View key={act.id} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: dColor }]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{t(act.titleKey)}</Text>
                      <Text style={styles.timelineSub}>{act.subtitle} • {act.date.toLocaleDateString()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* 7. MOTIVATIONAL STRIP */}
        <Animated.View style={[getFadeSlide(animTimeline), { marginTop: 32 }]}>
          <LinearGradient colors={['#FCE4EC', '#F8F4F9']} style={styles.motivationCard}>
            <Ionicons name="shield-checkmark" size={36} color="#C2185B" />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={styles.motivationTitle}>{t('home.motivationTitle')}</Text>
              <Text style={styles.motivationSub}>{t('home.motivationSub', { monitored: totalMothers, lives: totalMothers + visitsToday })}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  
  // Header
  headerGradient: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: '#fff', opacity: 0.85, marginBottom: 4 },
  userName: { fontSize: 28, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  avatarBorder: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerBottom: { flexDirection: 'row', marginTop: 24, gap: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99 },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: { marginTop: -28, marginBottom: 24, zIndex: 10 },
  statCard: { width: 110, backgroundColor: '#fff', borderRadius: 16, padding: 14, elevation: 8, shadowColor: '#C2185B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, alignItems: 'center' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  microBarBg: { width: '100%', height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 8 },
  microBarFill: { height: '100%', borderRadius: 2 },
  pulseDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C62828' },

  // Urgent Banner
  urgentBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16 },
  urgentIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  urgentTextWrapper: { flex: 1, marginLeft: 12 },
  urgentTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  urgentSub: { color: '#fff', opacity: 0.85, fontSize: 12 },
  urgentBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99 },
  urgentBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginRight: 4 },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E' },
  titleUnderline: { width: 30, height: 3, backgroundColor: '#C2185B', marginTop: 4, borderRadius: 2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { color: '#C2185B', fontSize: 13, fontWeight: '600', marginRight: 2 },

  // Priority Card
  priorityCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 16, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  pCardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  pCardTopLeft: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  priorityCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  priorityNumber: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  pCardName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4 },
  pCardMetaRow: { flexDirection: 'row', alignItems: 'center' },
  pCardMeta: { color: '#6B7280', fontSize: 13, marginLeft: 4 },
  pCardTopRight: { alignItems: 'flex-end' },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  riskBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  pCardRecency: { color: '#6B7280', fontSize: 11, fontWeight: '500' },
  pCardDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  pCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reasonChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCE4EC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  reasonText: { color: '#C2185B', fontSize: 12, fontWeight: '500' },
  startVisitBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  startVisitText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginRight: 6 },

  // Empty State
  premiumEmpty: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCE4EC', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  // Grid
  gridContainer: { paddingHorizontal: 10 },
  gridRow: { flexDirection: 'row', marginBottom: 12 },
  gridItemWrapper: { flex: 1, paddingHorizontal: 6 },
  gridCard: { flex: 1, borderRadius: 20, padding: 18, minHeight: 120, overflow: 'hidden' },
  gridDeco: { position: 'absolute', right: -20, top: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  gridLabel: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  gridSub: { color: '#fff', opacity: 0.85, fontSize: 12 },
  syncDot: { position: 'absolute', top: 18, right: 18, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF9800', borderWidth: 2, borderColor: '#fff' },

  // Timeline
  timelineContainer: { marginHorizontal: 16, paddingLeft: 10 },
  timelineLine: { position: 'absolute', left: 16, top: 12, bottom: 0, width: 2, backgroundColor: '#F3F4F6' },
  timelineItem: { flexDirection: 'row', marginBottom: 20, paddingLeft: 24, position: 'relative' },
  timelineDot: { position: 'absolute', left: 1, top: 4, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#F8F4F9' },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 2 },
  timelineSub: { fontSize: 12, color: '#6B7280' },

  // Motivation
  motivationCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#F48FB1' },
  motivationTitle: { color: '#C2185B', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  motivationSub: { color: '#6B7280', fontSize: 12 }
});

export default HomeScreen;