import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Animated, Easing, Dimensions, TextInput
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllBabies } from '../../database/babyRepository';
import { getVisitsByBaby } from '../../database/babyVisitRepository';
import { db } from '../../database/db';
import { Baby, BabyVisit } from '../../types';

const { width: SW } = Dimensions.get('window');

interface BabyWithMeta extends Baby {
  motherName: string;
  ageInDays: number;
  completedVisits: number;
  nextVisitDay: number | null;
}

const VISIT_SCHEDULE: (1 | 3 | 7 | 14 | 28)[] = [1, 3, 7, 14, 28];

const BabyListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [babies, setBabies] = useState<BabyWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETE'>('ALL');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      const aid = session.odId || session.id || '';

      const allBabies = await getAllBabies(aid);
      const enriched: BabyWithMeta[] = [];

      for (const b of allBabies) {
        // Get mother name
        const mRow: any = await db.getFirstAsync('SELECT name FROM mothers WHERE id = ?', [b.motherId]);
        const motherName = mRow?.name || 'Unknown';

        // Age in days
        const dob = new Date(b.dateOfBirth);
        const ageInDays = Math.floor((Date.now() - dob.getTime()) / 86400000);

        // Visits completed
        const visits = await getVisitsByBaby(b.id);
        const completedDays = visits.map((v: BabyVisit) => v.visitDay);
        const completedVisits = completedDays.length;

        // Next visit
        const nextDay = VISIT_SCHEDULE.find(d => !completedDays.includes(d) && ageInDays >= d);
        const upcomingDay = VISIT_SCHEDULE.find(d => !completedDays.includes(d));

        enriched.push({
          ...b,
          motherName,
          ageInDays,
          completedVisits,
          nextVisitDay: nextDay || upcomingDay || null,
        });
      }

      setBabies(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused]);

  const filtered = babies.filter(b => {
    if (filter === 'ACTIVE' && b.currentStatus !== 'ACTIVE') return false;
    if (filter === 'COMPLETE' && b.currentStatus !== 'NEONATAL_COMPLETE') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return b.name?.toLowerCase().includes(q) || b.motherName.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    if (status === 'NEONATAL_COMPLETE') return '#4CAF50';
    return '#0097A7';
  };

  const getVisitUrgency = (baby: BabyWithMeta) => {
    if (!baby.nextVisitDay) return null;
    if (baby.ageInDays >= baby.nextVisitDay + 2) return 'OVERDUE';
    if (baby.ageInDays >= baby.nextVisitDay) return 'DUE';
    return 'UPCOMING';
  };

  const renderBabyCard = ({ item: b, index }: { item: BabyWithMeta; index: number }) => {
    const urgency = getVisitUrgency(b);
    const progress = b.completedVisits / 5;

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.card}
          onPress={() => navigation.navigate('BabyProfile', { babyId: b.id })}
        >
          {/* Top row */}
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <LinearGradient
                colors={['#1565C0', '#42A5F5']}
                style={styles.genderCircle}
              >
                <Ionicons name="happy" size={18} color="#fff" />
              </LinearGradient>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.babyName} numberOfLines={1}>{b.name || 'Unnamed'}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={11} color="#9E9E9E" />
                  <Text style={styles.metaText}>{b.motherName}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText}>{b.ageInDays}d old</Text>
                </View>
              </View>
            </View>

            {/* Status chip */}
            <View style={[styles.statusChip, { backgroundColor: getStatusColor(b.currentStatus) + '18' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(b.currentStatus) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(b.currentStatus) }]}>
                {b.currentStatus === 'NEONATAL_COMPLETE' ? 'Done' : 'Active'}
              </Text>
            </View>
          </View>

          {/* Visit progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Neonatal Visits</Text>
              <Text style={styles.progressCount}>{b.completedVisits}/5</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#0097A7', '#00BCD4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.max(progress * 100, 4)}%` }]}
              />
            </View>
            {/* Visit day dots */}
            <View style={styles.visitDots}>
              {VISIT_SCHEDULE.map(day => {
                const done = b.completedVisits > 0 && babies.length > 0; // simplified
                return (
                  <View key={day} style={styles.visitDotItem}>
                    <Text style={styles.visitDotLabel}>D{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Bottom row */}
          <View style={styles.cardBottom}>
            <View style={styles.infoChip}>
              <Ionicons name="scale-outline" size={13} color="#6B7280" />
              <Text style={styles.infoChipText}>{b.birthWeightKg || '?'} kg</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="calendar-outline" size={13} color="#6B7280" />
              <Text style={styles.infoChipText}>{b.dateOfBirth?.split('T')[0]}</Text>
            </View>

            {urgency && (
              <View style={[
                styles.urgencyChip,
                urgency === 'OVERDUE' && { backgroundColor: '#FFEBEE' },
                urgency === 'DUE' && { backgroundColor: '#FFF3E0' },
              ]}>
                <Text style={[
                  styles.urgencyText,
                  urgency === 'OVERDUE' && { color: '#C62828' },
                  urgency === 'DUE' && { color: '#E65100' },
                ]}>
                  {urgency === 'OVERDUE' ? `Day ${b.nextVisitDay} overdue!` : urgency === 'DUE' ? `Day ${b.nextVisitDay} due` : `Day ${b.nextVisitDay} soon`}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCircle}>
        <Ionicons name="happy-outline" size={48} color="#0097A7" />
      </View>
      <Text style={styles.emptyTitle}>No babies registered yet</Text>
      <Text style={styles.emptySub}>Babies will appear here after recording a delivery from a mother's profile</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#006064', '#0097A7', '#00BCD4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.headerTitle}>Babies</Text>
        <Text style={styles.headerSub}>{babies.length} registered • {babies.filter(b => b.currentStatus === 'ACTIVE').length} active</Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9E9E9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search baby or mother name..."
            placeholderTextColor="#9E9E9E"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9E9E9E" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {[
          { key: 'ALL', label: 'All', color: '#0097A7' },
          { key: 'ACTIVE', label: 'Active', color: '#0097A7' },
          { key: 'COMPLETE', label: 'Completed', color: '#4CAF50' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && { backgroundColor: f.color }]}
            onPress={() => setFilter(f.key as any)}
          >
            <Text style={[styles.filterText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            {f.key === 'ALL' && <Text style={[styles.filterCount, filter === f.key && { color: '#fff' }]}>{babies.length}</Text>}
            {f.key === 'ACTIVE' && <Text style={[styles.filterCount, filter === f.key && { color: '#fff' }]}>{babies.filter(b => b.currentStatus === 'ACTIVE').length}</Text>}
            {f.key === 'COMPLETE' && <Text style={[styles.filterCount, filter === f.key && { color: '#fff' }]}>{babies.filter(b => b.currentStatus === 'NEONATAL_COMPLETE').length}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Baby list */}
      <FlatList
        data={filtered}
        keyExtractor={b => b.id}
        renderItem={renderBabyCard}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FA' },

  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E', padding: 0 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E0F7FA', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#006064' },
  filterCount: { fontSize: 11, fontWeight: '700', color: '#006064', backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, overflow: 'hidden' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  genderCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  babyName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#9E9E9E' },
  metaDot: { color: '#D1D5DB', fontSize: 10 },

  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  progressSection: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  progressCount: { fontSize: 12, color: '#0097A7', fontWeight: '700' },
  progressBarBg: { height: 6, backgroundColor: '#E0F7FA', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  visitDots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  visitDotItem: { alignItems: 'center' },
  visitDotLabel: { fontSize: 10, color: '#9E9E9E', fontWeight: '600' },

  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  infoChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  urgencyChip: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  urgencyText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#E0F7FA', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
});

export default BabyListScreen;
