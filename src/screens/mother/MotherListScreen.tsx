import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  FlatList, Animated, Easing, SafeAreaView, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAllMothers, searchMothers } from '../../database/motherRepository';
import { Mother } from '../../types';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ──
interface ScoredMother extends Mother {
  daysSinceVisit: number;
  isOverdue: boolean;
}

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

const MotherListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  const [mothers, setMothers] = useState<ScoredMother[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'RED' | 'AMBER' | 'GREEN' | 'OVERDUE'>('ALL');

  const loadMothers = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      if (!sessionStr) return;
      const session = JSON.parse(sessionStr);
      const aid = session.odId || session.id || '';

      let data = [];
      if (searchQuery.trim()) {
        data = await searchMothers(aid, searchQuery.trim());
      } else {
        data = await getAllMothers(aid);
      }
      
      const scoredData: ScoredMother[] = data.map(m => {
        const daysSinceVisit = m.lastVisitDate
          ? Math.floor((Date.now() - new Date(m.lastVisitDate).getTime()) / 86400000)
          : 999;
        return { ...m, daysSinceVisit, isOverdue: daysSinceVisit > 14 && daysSinceVisit < 999 };
      });

      // Sort: RED -> AMBER -> GREEN, then Overdue first, then Name
      scoredData.sort((a, b) => {
        const tierRank = { 'RED': 1, 'AMBER': 2, 'GREEN': 3 };
        const rankA = tierRank[a.riskTier as keyof typeof tierRank] || 4;
        const rankB = tierRank[b.riskTier as keyof typeof tierRank] || 4;
        
        if (rankA !== rankB) return rankA - rankB;
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        
        return a.name.localeCompare(b.name);
      });

      setMothers(scoredData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadMothers();
  }, [isFocused, searchQuery]);

  const filteredMothers = mothers.filter(m => {
    if (filterMode === 'ALL') return true;
    if (filterMode === 'OVERDUE') return m.isOverdue;
    return m.riskTier === filterMode;
  });

  const renderFilterChip = (label: string, mode: typeof filterMode, colors: string[]) => {
    const isActive = filterMode === mode;
    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => setFilterMode(mode)}
        style={[styles.filterChip, isActive && { borderColor: colors[1], backgroundColor: colors[0] + '15' }]}
      >
        <Text style={[styles.filterText, isActive && { color: colors[1], fontWeight: 'bold' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderMotherCard = ({ item }: { item: ScoredMother }) => {
    const rColors = item.riskTier === 'RED' ? ['#C62828', '#E53935'] : item.riskTier === 'AMBER' ? ['#E65100', '#F57C00'] : ['#00695C', '#00897B'];
    const rBadge = item.riskTier === 'RED' ? t('motherList.filterHighRisk') : item.riskTier === 'AMBER' ? t('motherList.filterMonitor') : t('motherList.filterRoutine');

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MotherProfile', { motherId: item.id, motherName: item.name })}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <LinearGradient colors={rColors as any} style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{item.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.motherName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color="#6B7280" />
                <Text style={styles.metaText} numberOfLines={1}>{item.village || t('motherList.unknownLocation')}</Text>
                <Ionicons name="medical-outline" size={12} color="#6B7280" style={{ marginLeft: 8 }} />
                <Text style={styles.metaText}>{item.weeksPregnant} {t('motherList.weeks')}</Text>
              </View>
            </View>
          </View>
          <View style={styles.cardTopRight}>
            <View style={[styles.riskBadge, { backgroundColor: rColors[0] }]}>
              <Text style={styles.riskBadgeText}>{rBadge}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#9E9E9E" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>
              {item.lastVisitDate ? new Date(item.lastVisitDate).toLocaleDateString() : t('motherList.notVisitedYet')}
            </Text>
            {item.lastVisitDate && (
              <Text style={[styles.daysAgoText, item.isOverdue && { color: '#C62828' }]}>
                {' • '}
                {item.daysSinceVisit >= 999 ? t('motherList.neverVisited') : `${item.daysSinceVisit}d ${t('motherList.daysAgo')}`}
              </Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.startVisitBtn}
            onPress={() => navigation.navigate('StartVisit', { motherId: item.id })}
          >
            <Text style={styles.startVisitText}>{t('motherList.startVisitBtn')}</Text>
            <Ionicons name="arrow-forward" size={12} color="#C2185B" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1,2,3,4,5].map(i => (
        <View key={i} style={styles.card}>
          <View style={styles.cardTop}>
            <PremiumSkeleton width={44} height={44} borderRadius={22} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <PremiumSkeleton width="60%" height={16} style={{ marginBottom: 6 }} />
              <PremiumSkeleton width="40%" height={12} />
            </View>
            <PremiumSkeleton width={50} height={20} borderRadius={10} />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardBottom}>
            <PremiumSkeleton width="50%" height={14} />
            <PremiumSkeleton width={80} height={24} borderRadius={12} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return renderSkeleton();
    
    const iconName = filterMode === 'ALL' ? 'people-circle-outline' : filterMode === 'OVERDUE' ? 'time-outline' : 'shield-checkmark-outline';
    const msg = filterMode === 'ALL' ? t('motherList.noMothersSub') : "No mothers match this filter.";
    
    return (
      <View style={styles.premiumEmpty}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name={iconName} size={48} color="#C2185B" />
        </View>
        <Text style={styles.emptyTitle}>{t('motherList.noMothersTitle')}</Text>
        <Text style={styles.emptySub}>{msg}</Text>
        {filterMode === 'ALL' && (
          <TouchableOpacity onPress={() => navigation.navigate('AddMother')}>
            <LinearGradient colors={['#C2185B', '#E91E8C']} style={styles.emptyBtn}>
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.emptyBtnText}>{t('motherList.addFirstBtn')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{t('app.myMothers')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{mothers.length}</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9E9E9E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('motherList.searchPlaceholder')}
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9E9E9E" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {renderFilterChip(t('motherList.filterAll'), 'ALL', ['#9E9E9E', '#1A1A2E'])}
          {renderFilterChip(t('motherList.filterHighRisk'), 'RED', ['#C62828', '#C62828'])}
          {renderFilterChip(t('motherList.filterMonitor'), 'AMBER', ['#F57C00', '#F57C00'])}
          {renderFilterChip(t('motherList.filterRoutine'), 'GREEN', ['#00897B', '#00897B'])}
          {renderFilterChip(t('motherList.filterDueVisit'), 'OVERDUE', ['#C2185B', '#C2185B'])}
        </ScrollView>
      </View>

      <FlatList
        data={filteredMothers}
        keyExtractor={(item) => item.id}
        renderItem={renderMotherCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fabContainer} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddMother')}
      >
        <LinearGradient colors={['#C2185B', '#E91E8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.fabText}>{t('motherList.fabAdd')}</Text>
        </LinearGradient>
      </TouchableOpacity>
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  headerWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  countBadge: { backgroundColor: '#FCE4EC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12 },
  countText: { color: '#C2185B', fontWeight: 'bold', fontSize: 13 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  filterScroll: { paddingHorizontal: 16, paddingBottom: 4 },
  filterChip: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
  filterText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  
  listContent: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTopLeft: { flexDirection: 'row', flex: 1, alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  motherName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: '#6B7280', fontSize: 12, marginLeft: 4, flexShrink: 1 },
  cardTopRight: { alignItems: 'flex-end', marginLeft: 8 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  riskBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dateText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  daysAgoText: { fontSize: 12, fontWeight: 'bold', color: '#6B7280' },
  startVisitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCE4EC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  startVisitText: { color: '#C2185B', fontWeight: 'bold', fontSize: 12, marginRight: 4 },

  premiumEmpty: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', marginTop: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FCE4EC', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99 },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  fabContainer: { position: 'absolute', bottom: 20, right: 20, elevation: 8, shadowColor: '#C2185B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  fab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, borderRadius: 24 },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 6 }
});

export default MotherListScreen;