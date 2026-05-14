import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { syncService } from '../services/syncService';
import NetInfo from '@react-native-community/netinfo';

interface SyncStatusBarProps {
  ashaId: string;
}

type SyncState = 'offline' | 'online_pending' | 'syncing' | 'synced';

const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ ashaId }) => {
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncText, setLastSyncText] = useState('Never');
  const [visible, setVisible] = useState(true);

  const checkStatus = async () => {
    if (syncState === 'syncing') return;

    const isOnline = await syncService.isOnline();
    const count = await syncService.getPendingSyncCount(ashaId);
    setPendingCount(count);

    if (!isOnline) {
      setSyncState('offline');
      setVisible(true);
    } else if (count > 0) {
      setSyncState('online_pending');
      setVisible(true);
    } else {
      // If we were previously pending/syncing and now 0, show synced briefly
      if (syncState !== 'synced') {
        const lastSync = await syncService.getLastSyncTime();
        if (lastSync) {
          const diffMins = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000);
          setLastSyncText(diffMins < 1 ? 'Just now' : `${diffMins}m ago`);
        }
        setSyncState('synced');
        setVisible(true);
        // Hide after 3 seconds if synced
        setTimeout(() => setVisible(false), 3000);
      }
    }
  };

  useEffect(() => {
    checkStatus();

    // Set up polling every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    // Listen to network changes
    const unsubscribeNet = NetInfo.addEventListener(() => {
      checkStatus();
    });

    return () => {
      clearInterval(interval);
      unsubscribeNet();
    };
  }, [ashaId, syncState]);

  const handleSyncPress = async () => {
    if (syncState !== 'online_pending') return;
    
    setSyncState('syncing');
    const result = await syncService.syncAll(ashaId);
    
    if (result.success) {
      setPendingCount(0);
      setSyncState('synced');
      setLastSyncText('Just now');
      setTimeout(() => setVisible(false), 3000);
    } else {
      // If failed, revert to pending so user can try again
      setSyncState('online_pending');
      alert(`Sync failed: ${result.errors.join(', ')}`);
    }
  };

  if (!visible) return null;

  if (syncState === 'offline') {
    return (
      <View style={[styles.container, { backgroundColor: '#757575' }]}>
        <Text style={styles.text}>● Offline • {pendingCount} records pending</Text>
      </View>
    );
  }

  if (syncState === 'online_pending') {
    return (
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: '#FF9800' }]} 
        onPress={handleSyncPress}
        activeOpacity={0.8}
      >
        <Text style={styles.text}>↑ {pendingCount} records to sync • Tap to sync now</Text>
      </TouchableOpacity>
    );
  }

  if (syncState === 'syncing') {
    return (
      <View style={[styles.container, { backgroundColor: '#1565C0', flexDirection: 'row', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6, transform: [{ scale: 0.7 }] }} />
        <Text style={styles.text}>⟳ Syncing {pendingCount} records...</Text>
      </View>
    );
  }

  if (syncState === 'synced') {
    return (
      <View style={[styles.container, { backgroundColor: '#2E7D32' }]}>
        <Text style={styles.text}>✓ All synced • {lastSyncText}</Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    height: 32,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  }
});

export default SyncStatusBar;