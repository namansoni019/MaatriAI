import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import { changeLanguage, getCurrentLanguage } from '../../services/languageService';

const LANGUAGES = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'hi', name: 'Hindi', native: 'हिंदी' },
  { id: 'mr', name: 'Marathi', native: 'मराठी' },
  { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা' },
  { id: 'te', name: 'Telugu', native: 'తెలుగు' },
];

const ProfileScreen: React.FC = () => {
  const { signOut } = useContext(AuthContext);
  const { t } = useTranslation();
  const [worker, setWorker] = useState<any>(null);
  const [lang, setLang] = useState(getCurrentLanguage());

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const session = await AsyncStorage.getItem('maatri_session');
        if (session) setWorker(JSON.parse(session));
      } catch (e) {
        console.error(e);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutAlertTitle'),
      t('profile.logoutAlertMsg'),
      [
        { text: t('common.cancel'), style: "cancel" },
        { 
          text: t('profile.logout'), 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('maatri_session');
            signOut();
          }
        }
      ]
    );
  };

  const toggleLanguage = async () => {
    const currentIndex = LANGUAGES.findIndex(l => l.id === lang);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    const newLang = LANGUAGES[nextIndex].id;

    await changeLanguage(newLang);
    setLang(newLang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{worker?.name?.charAt(0) || 'A'}</Text>
          </View>
          <Text style={styles.name}>{worker?.name || t('profile.defaultName')}</Text>
          <Text style={styles.id}>{t('profile.id')}: {worker?.id || '---'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.details')}</Text>
          
          <View style={styles.row}>
            <Ionicons name="call" size={20} color="#757575" />
            <Text style={styles.rowText}>{worker?.phone || t('profile.noPhone')}</Text>
          </View>
          
          <View style={styles.row}>
            <Ionicons name="location" size={20} color="#757575" />
            <Text style={styles.rowText}>
              {worker?.village ? `${worker.village}, ` : ''}
              {worker?.district ? `${worker.district}` : t('profile.unknownLocation')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={toggleLanguage}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="language" size={20} color="#757575" />
              <Text style={styles.rowText}>{t('profile.language')}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {LANGUAGES.find(l => l.id === lang)?.native || 'English'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#C2185B', padding: 20, paddingTop: 40, paddingBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  scroll: { padding: 16 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, elevation: 2 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FCE4EC', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#C2185B' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#212121', marginBottom: 4 },
  id: { fontSize: 14, color: '#757575' },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#212121', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rowText: { fontSize: 16, color: '#424242', marginLeft: 12 },
  
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  badge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#1976D2', fontSize: 12, fontWeight: 'bold' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEBEE', padding: 16, borderRadius: 16, marginTop: 8 },
  logoutText: { color: '#D32F2F', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});

export default ProfileScreen;
