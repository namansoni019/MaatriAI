import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMothers, searchMothers } from '../../database/motherRepository';
import { Mother } from '../../types';
import RiskBadge from '../../components/RiskBadge';
import { useTranslation } from 'react-i18next';

const MotherListScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [mothers, setMothers] = useState<Mother[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMothers = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        let data = [];
        if (searchQuery.trim()) {
          data = await searchMothers(session.id, searchQuery.trim());
        } else {
          data = await getAllMothers(session.id);
        }
        
        // Sorting: RED -> AMBER -> GREEN, then by name
        const sortedData = data.sort((a, b) => {
          const tierRank = { 'RED': 1, 'AMBER': 2, 'GREEN': 3 };
          const rankA = tierRank[a.riskTier as keyof typeof tierRank] || 4;
          const rankB = tierRank[b.riskTier as keyof typeof tierRank] || 4;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name);
        });

        setMothers(sortedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadMothers();
    }
  }, [isFocused, searchQuery]);

  const getDaysSince = (dateStr: string) => {
    if (!dateStr) return null;
    const past = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - past.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderMotherCard = ({ item }: { item: Mother }) => {
    let barColor = '#4CAF50';
    if (item.riskTier === 'RED') barColor = '#F44336';
    if (item.riskTier === 'AMBER') barColor = '#FF9800';

    const daysSince = getDaysSince(item.lastVisitDate);
    let daysColor = '#388E3C';
    if (daysSince !== null && daysSince > 14) daysColor = '#D32F2F';
    else if (daysSince !== null && daysSince > 7) daysColor = '#F57C00';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('MotherProfile', { motherId: item.id, motherName: item.name })}
      >
        <View style={[styles.colorBar, { backgroundColor: barColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardRow1}>
            <Text style={styles.motherName} numberOfLines={1}>{item.name}</Text>
            <RiskBadge tier={item.riskTier} />
          </View>
          
          <Text style={styles.cardRow2}>
            📍 {item.village || t('motherList.unknownLocation')}   🤰 {item.weeksPregnant} {t('motherList.weeks')}
          </Text>
          
          <Text style={styles.cardRow3}>
            {t('motherList.lastVisit')} {item.lastVisitDate ? new Date(item.lastVisitDate).toLocaleDateString() : t('motherList.notVisitedYet')}
          </Text>
          
          {daysSince !== null && (
            <Text style={[styles.cardRow4, { color: daysColor }]}>
              {t('motherList.daysSinceVisit', { days: daysSince })}
            </Text>
          )}

          <TouchableOpacity 
            style={styles.startVisitContainer}
            onPress={() => navigation.navigate('StartVisit', { motherId: item.id })}
          >
            <Text style={styles.startVisitText}>{t('motherList.startVisitBtn')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return <ActivityIndicator size="large" color="#C2185B" style={{ marginTop: 40 }} />;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🤰</Text>
        <Text style={styles.emptyTitle}>{t('motherList.noMothersTitle')}</Text>
        <Text style={styles.emptySub}>{t('motherList.noMothersSub')}</Text>
        <TouchableOpacity 
          style={styles.addFirstBtn}
          onPress={() => navigation.navigate('AddMother')}
        >
          <Text style={styles.addFirstBtnText}>{t('motherList.addFirstBtn')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9E9E9E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('motherList.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.totalText}>{t('motherList.totalMothers', { count: mothers.length })}</Text>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddMother')}
          >
            <Text style={styles.addBtnText}>{t('motherList.addMother')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={mothers}
        keyExtractor={(item) => item.id}
        renderItem={renderMotherCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  headerArea: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    marginBottom: 16
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#212121' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { color: '#757575', fontSize: 14, fontWeight: '500' },
  addBtn: { backgroundColor: '#C2185B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  listContent: { paddingVertical: 12 },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    overflow: 'hidden'
  },
  colorBar: { width: 6 },
  cardContent: { flex: 1, padding: 12 },
  cardRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  motherName: { fontSize: 17, fontWeight: 'bold', color: '#212121', flex: 1, marginRight: 8 },
  cardRow2: { color: '#757575', fontSize: 13, marginBottom: 4 },
  cardRow3: { color: '#9E9E9E', fontSize: 12, marginBottom: 2 },
  cardRow4: { fontSize: 12, fontWeight: '500', marginBottom: 8 },
  startVisitContainer: { alignSelf: 'flex-end', marginTop: 4 },
  startVisitText: { color: '#C2185B', fontWeight: 'bold', fontSize: 14 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
  emptySub: { fontSize: 14, color: '#757575', marginBottom: 24 },
  addFirstBtn: { backgroundColor: '#C2185B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  addFirstBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 }
});

export default MotherListScreen;