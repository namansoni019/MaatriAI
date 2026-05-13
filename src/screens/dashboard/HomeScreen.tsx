import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../database/db';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [totalMothers, setTotalMothers] = useState(0);
  const [highRiskMothers, setHighRiskMothers] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [breathScans, setBreathScans] = useState(0);
  const [abnormalScans, setAbnormalScans] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setUserName(session.name || 'ASHA Worker');

        // Fetch stats from SQLite
        const motherCount: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM mothers');
        const highRiskCount: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM mothers WHERE risk_tier = 'RED'");
        const visitCount: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM visits');
        
        // Calculate pending sync items
        const unsyncedM: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM mothers WHERE is_synced = 0');
        const unsyncedV: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM visits WHERE is_synced = 0');
        const unsyncedN: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM newborns WHERE is_synced = 0');
        const unsyncedB: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM breath_scans WHERE is_synced = 0');
        
        // Breath scan stats
        const breathCount: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM breath_scans');
        const abnormalCount: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM breath_scans WHERE status = 'ABNORMAL'");

        setTotalMothers(motherCount?.count || 0);
        setHighRiskMothers(highRiskCount?.count || 0);
        setTotalVisits(visitCount?.count || 0);
        setBreathScans(breathCount?.count || 0);
        setAbnormalScans(abnormalCount?.count || 0);
        setPendingSync((unsyncedM?.count || 0) + (unsyncedV?.count || 0) + (unsyncedN?.count || 0) + (unsyncedB?.count || 0));
      }
    } catch (e) {
      console.error('Error loading dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadDashboardData();
    }
  }, [isFocused]);

  const renderStatCard = (title: string, count: number, icon: any, color: string, isAlert = false) => (
    <View style={[styles.statCard, isAlert && styles.statCardAlert]}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  if (loading && !userName) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C2185B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Profile Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>नमस्ते / Hello,</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity style={styles.profileIcon}>
          <Ionicons name="person-circle" size={54} color="#FCE4EC" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Maatri.AI Assistant</Text>
            <Text style={styles.bannerSub}>Your offline companion for maternal & neonatal care.</Text>
          </View>
          <Ionicons name="medical" size={48} color="#C2185B" style={{ opacity: 0.2 }} />
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview / अवलोकन</Text>
        <View style={styles.statsGrid}>
          {renderStatCard('Total Mothers', totalMothers, 'people', '#2196F3')}
          {renderStatCard('High Risk (RED)', highRiskMothers, 'warning', '#F44336', true)}
          {renderStatCard('Total Visits', totalVisits, 'home', '#4CAF50')}
          {renderStatCard('Breath Scans', breathScans, 'fitness', '#9C27B0')}
          {renderStatCard('Abnormal Scans', abnormalScans, 'alert-circle', abnormalScans > 0 ? '#E65100' : '#9E9E9E', abnormalScans > 0)}
          {renderStatCard('Pending Sync', pendingSync, 'cloud-upload', pendingSync > 0 ? '#FF9800' : '#9E9E9E')}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions / त्वरित कार्य</Text>
        
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => {
            navigation.navigate('Mothers', { screen: 'MotherList' });
            setTimeout(() => navigation.navigate('Mothers', { screen: 'AddMother' }), 100);
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#C2185B' }]}>
            <Ionicons name="person-add" size={24} color="#fff" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Register New Mother</Text>
            <Text style={styles.actionSub}>नई माँ का पंजीकरण करें</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#BDBDBD" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Mothers', { screen: 'MotherList' })}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="list" size={24} color="#fff" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>View Mother List</Text>
            <Text style={styles.actionSub}>माताओं की सूची देखें</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#BDBDBD" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    backgroundColor: '#C2185B',
    padding: 24,
    paddingTop: 48,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  greeting: { color: '#FCE4EC', fontSize: 16 },
  userName: { color: '#ffffff', fontSize: 26, fontWeight: 'bold', marginTop: 4 },
  profileIcon: { borderRadius: 27 },

  scrollContent: { padding: 20, paddingBottom: 40 },
  
  banner: {
    backgroundColor: '#FCE4EC',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F8BBD0'
  },
  bannerTextContainer: { flex: 1, paddingRight: 10 },
  bannerTitle: { color: '#C2185B', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bannerSub: { color: '#880E4F', fontSize: 13, lineHeight: 18 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#212121', marginBottom: 16 },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  statCardAlert: { borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statCount: { fontSize: 28, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
  statTitle: { fontSize: 13, color: '#757575', fontWeight: '500' },

  actionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 2 },
  actionSub: { fontSize: 13, color: '#757575' }
});

export default HomeScreen;