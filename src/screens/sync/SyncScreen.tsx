import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../../database/db';
import { useTranslation } from 'react-i18next';

const SyncScreen: React.FC = () => {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [unsyncedMothers, setUnsyncedMothers] = useState(0);
  const [unsyncedVisits, setUnsyncedVisits] = useState(0);
  const [unsyncedNewborns, setUnsyncedNewborns] = useState(0);

  const animHeader = useRef(new Animated.Value(0)).current;
  const animStatus = useRef(new Animated.Value(0)).current;
  const animDetails = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const checkUnsynced = async () => {
    setLoading(true);
    try {
      const mResult: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM mothers WHERE is_synced = 0');
      const vResult: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM visits WHERE is_synced = 0');
      const nResult: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM babies WHERE is_synced = 0');
      
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
      
      Animated.stagger(150, [
        Animated.timing(animHeader, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(animStatus, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(animDetails, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
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
        await db.runAsync('UPDATE mothers SET is_synced = 1 WHERE is_synced = 0');
        await db.runAsync('UPDATE visits SET is_synced = 1 WHERE is_synced = 0');
        await db.runAsync('UPDATE babies SET is_synced = 1 WHERE is_synced = 0');
        
        Alert.alert(t('syncScreen.successMsg'), '');
        checkUnsynced();
      } catch (e) {
        Alert.alert(t('syncScreen.failMsg'), '');
      } finally {
        setSyncing(false);
      }
    }, 2000);
  };

  const totalUnsynced = unsyncedMothers + unsyncedVisits + unsyncedNewborns;
  const isAllSynced = totalUnsynced === 0;

  const getFadeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
  });

  return (
    <View style={styles.container}>
      <Animated.View style={getFadeSlide(animHeader)}>
        <LinearGradient 
          colors={['#880E4F', '#C2185B', '#E91E8C']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <Text style={styles.headerTitle}>{t('syncScreen.title')}</Text>
        </LinearGradient>
      </Animated.View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Animated.View style={[styles.statusCard, getFadeSlide(animStatus)]}>
          <Animated.View style={[
            styles.iconPulseBg, 
            { backgroundColor: isAllSynced ? '#E8F5E9' : '#FFF3E0', transform: [{ scale: !isAllSynced ? pulseAnim : 1 }] }
          ]}>
            <Ionicons 
              name={isAllSynced ? "checkmark-circle" : "cloud-upload"} 
              size={56} 
              color={isAllSynced ? "#4CAF50" : "#F57C00"} 
            />
          </Animated.View>
          <Text style={styles.statusTitle}>
            {isAllSynced ? t('syncScreen.status') : `${totalUnsynced} ${t('syncScreen.pendingItems', { defaultValue: 'Pending Items' })}`}
          </Text>
          <Text style={styles.statusSub}>
            {isAllSynced 
              ? t('syncScreen.noPending') 
              : t('syncScreen.syncAdvice', { defaultValue: 'Please connect to the internet and sync your data to keep it safe.' })}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.detailsCard, getFadeSlide(animDetails)]}>
          <Text style={styles.detailsHeader}>{t('syncScreen.unsyncedRecords', { defaultValue: 'Unsynced Records' })}</Text>
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIconCircle, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="people-outline" size={20} color="#C2185B" />
              </View>
              <Text style={styles.rowLabel}>{t('syncScreen.unsyncedMothers')}</Text>
            </View>
            <View style={[styles.badge, unsyncedMothers === 0 ? styles.badgeZero : styles.badgeActive]}>
              <Text style={[styles.badgeText, unsyncedMothers === 0 ? styles.badgeTextZero : styles.badgeTextActive]}>
                {unsyncedMothers}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIconCircle, { backgroundColor: '#E0F2F1' }]}>
                <Ionicons name="clipboard-outline" size={20} color="#00897B" />
              </View>
              <Text style={styles.rowLabel}>{t('syncScreen.unsyncedVisits')}</Text>
            </View>
            <View style={[styles.badge, unsyncedVisits === 0 ? styles.badgeZero : styles.badgeActive]}>
              <Text style={[styles.badgeText, unsyncedVisits === 0 ? styles.badgeTextZero : styles.badgeTextActive]}>
                {unsyncedVisits}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="body-outline" size={20} color="#F57C00" />
              </View>
              <Text style={styles.rowLabel}>{t('syncScreen.unsyncedNewborns')}</Text>
            </View>
            <View style={[styles.badge, unsyncedNewborns === 0 ? styles.badgeZero : styles.badgeActive]}>
              <Text style={[styles.badgeText, unsyncedNewborns === 0 ? styles.badgeTextZero : styles.badgeTextActive]}>
                {unsyncedNewborns}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={getFadeSlide(animDetails)}>
          <TouchableOpacity 
            activeOpacity={0.8}
            style={styles.syncBtnWrapper}
            onPress={handleSync}
            disabled={syncing || isAllSynced}
          >
            <LinearGradient 
              colors={isAllSynced ? ['#E0E0E0', '#E0E0E0'] : ['#2E7D32', '#43A047']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={[styles.syncBtn, isAllSynced && { elevation: 0 }]}
            >
              {syncing ? (
                <>
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.syncBtnText}>{t('syncScreen.syncing', { defaultValue: 'Syncing...' })}</Text>
                </>
              ) : (
                <>
                  <Ionicons name={isAllSynced ? "checkmark-done" : "cloud-upload"} size={24} color={isAllSynced ? "#9E9E9E" : "#fff"} style={{ marginRight: 8 }} />
                  <Text style={[styles.syncBtnText, isAllSynced && { color: '#9E9E9E' }]}>{isAllSynced ? t('syncScreen.noPending') : t('syncScreen.syncNow')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 48, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8, shadowColor: '#C2185B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  
  content: { paddingHorizontal: 20, flex: 1 },
  
  statusCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', marginTop: -40, marginBottom: 24, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  iconPulseBg: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 8 },
  statusSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  detailsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
  detailsHeader: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 16 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#4B5563' },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 52 },
  
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 40, alignItems: 'center' },
  badgeActive: { backgroundColor: '#FFEBEE' },
  badgeZero: { backgroundColor: '#F3F4F6' },
  badgeText: { fontWeight: 'bold', fontSize: 14 },
  badgeTextActive: { color: '#D32F2F' },
  badgeTextZero: { color: '#9CA3AF' },

  syncBtnWrapper: { borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default SyncScreen;
