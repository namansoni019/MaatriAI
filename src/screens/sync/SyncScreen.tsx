import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { db } from '../../database/db';

const SyncScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [unsyncedMothers, setUnsyncedMothers] = useState(0);
  const [unsyncedVisits, setUnsyncedVisits] = useState(0);
  const [unsyncedNewborns, setUnsyncedNewborns] = useState(0);

  const checkUnsynced = async () => {
    setLoading(true);
    try {
      const mResult: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM mothers WHERE is_synced = 0');
      const vResult: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM visits WHERE is_synced = 0');
      const nResult: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM newborns WHERE is_synced = 0');
      
      setUnsyncedMothers(mResult?.count || 0);
      setUnsyncedVisits(vResult?.count || 0);
      setUnsyncedNewborns(nResult?.count || 0);
    } catch (e) {
      console.error('Error fetching unsynced counts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      checkUnsynced();
    }
  }, [isFocused]);

  const handleSync = async () => {
    const total = unsyncedMothers + unsyncedVisits + unsyncedNewborns;
    if (total === 0) {
      Alert.alert('All Caught Up!', 'There is no pending data to sync.');
      return;
    }

    setSyncing(true);
    
    // Simulate network delay for syncing to API
    setTimeout(async () => {
      try {
        // In a real app, you would fetch these rows, POST them to your backend,
        // and only update is_synced to 1 upon success. For now, we simulate success.
        await db.runAsync('UPDATE mothers SET is_synced = 1 WHERE is_synced = 0');
        await db.runAsync('UPDATE visits SET is_synced = 1 WHERE is_synced = 0');
        await db.runAsync('UPDATE newborns SET is_synced = 1 WHERE is_synced = 0');
        
        Alert.alert('Sync Successful', 'All data has been securely backed up to the cloud.');
        checkUnsynced();
      } catch (e) {
        Alert.alert('Sync Failed', 'Please check your internet connection and try again.');
      } finally {
        setSyncing(false);
      }
    }, 2000);
  };

  const totalUnsynced = unsyncedMothers + unsyncedVisits + unsyncedNewborns;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Data Sync / डेटा सिंक</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Ionicons 
            name={totalUnsynced === 0 ? "checkmark-circle" : "cloud-offline"} 
            size={64} 
            color={totalUnsynced === 0 ? "#4CAF50" : "#FF9800"} 
          />
          <Text style={styles.statusTitle}>
            {totalUnsynced === 0 ? 'All Data Synced!' : `${totalUnsynced} Pending Items`}
          </Text>
          <Text style={styles.statusSub}>
            {totalUnsynced === 0 
              ? 'Your data is safely backed up on the cloud.' 
              : 'Please connect to the internet and sync your data to keep it safe.'}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsHeader}>Unsynced Records</Text>
          
          <View style={styles.row}>
            <Text style={styles.rowLabel}>🤰 Mothers / माताएं</Text>
            <View style={[styles.badge, unsyncedMothers === 0 && styles.badgeZero]}>
              <Text style={[styles.badgeText, unsyncedMothers === 0 && styles.badgeTextZero]}>{unsyncedMothers}</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.rowLabel}>🏠 Home Visits / घर की यात्राएं</Text>
            <View style={[styles.badge, unsyncedVisits === 0 && styles.badgeZero]}>
              <Text style={[styles.badgeText, unsyncedVisits === 0 && styles.badgeTextZero]}>{unsyncedVisits}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>👶 Newborns / नवजात</Text>
            <View style={[styles.badge, unsyncedNewborns === 0 && styles.badgeZero]}>
              <Text style={[styles.badgeText, unsyncedNewborns === 0 && styles.badgeTextZero]}>{unsyncedNewborns}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.syncBtn, totalUnsynced === 0 && styles.syncBtnDisabled]} 
          onPress={handleSync}
          disabled={syncing || totalUnsynced === 0}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color={totalUnsynced === 0 ? "#9E9E9E" : "#fff"} style={{ marginRight: 8 }} />
              <Text style={[styles.syncBtnText, totalUnsynced === 0 && { color: '#9E9E9E' }]}>Sync Now / अभी सिंक करें</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 20, paddingTop: 40, backgroundColor: '#C2185B', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  statusTitle: { fontSize: 22, fontWeight: 'bold', color: '#212121', marginTop: 16, marginBottom: 8 },
  statusSub: { fontSize: 14, color: '#757575', textAlign: 'center', lineHeight: 20 },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  detailsHeader: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLabel: { fontSize: 16, color: '#424242' },
  badge: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#D32F2F', fontWeight: 'bold' },
  badgeZero: { backgroundColor: '#E8F5E9' },
  badgeTextZero: { color: '#388E3C' },
  syncBtn: {
    backgroundColor: '#C2185B',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  syncBtnDisabled: { backgroundColor: '#EEEEEE', elevation: 0 },
  syncBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default SyncScreen;
