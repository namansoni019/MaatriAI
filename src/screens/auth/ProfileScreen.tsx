import React, { useEffect, useState, useContext, useRef } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ScrollView, Alert, Animated, Easing 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import { changeLanguage, getCurrentLanguage } from '../../services/languageService';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  
  const [worker, setWorker] = useState<any>(null);
  const [lang, setLang] = useState(getCurrentLanguage());

  const animHeader = useRef(new Animated.Value(0)).current;
  const animCards = useRef(new Animated.Value(0)).current;

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

    Animated.stagger(150, [
      Animated.timing(animHeader, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(animCards, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
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

  const currentLangObj = LANGUAGES.find(l => l.id === lang);

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
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>{t('app.tabProfile')}</Text>
          </View>

          <View style={styles.profileMeta}>
            <View style={styles.avatarBorder}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{worker?.name?.charAt(0).toUpperCase() || 'A'}</Text>
              </View>
            </View>
            <View style={styles.metaTextWrapper}>
              <Text style={styles.nameText}>{worker?.name || t('profile.defaultName')}</Text>
              <View style={styles.idPill}>
                <Ionicons name="id-card-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.idText}>{worker?.id || '---'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
        <Animated.View style={getFadeSlide(animCards)}>
          
          <Text style={styles.sectionTitle}>{t('profile.details')}</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2F1' }]}>
                <Ionicons name="call" size={20} color="#00897B" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{worker?.phone || t('profile.noPhone')}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="location" size={20} color="#8E24AA" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {worker?.village ? `${worker.village}, ` : ''}
                  {worker?.district ? `${worker.district}` : t('profile.unknownLocation')}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.infoRow} onPress={toggleLanguage} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="language" size={20} color="#1E88E5" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoLabel}>App Language</Text>
                <Text style={styles.infoValue}>{currentLangObj?.native} ({currentLangObj?.name})</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.infoRow} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="log-out" size={20} color="#E53935" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={[styles.infoValue, { color: '#E53935' }]}>{t('profile.logout')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  
  headerGradient: { paddingHorizontal: 20, paddingBottom: 32, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 8, shadowColor: '#C2185B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  headerTop: { marginBottom: 24, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  profileMeta: { flexDirection: 'row', alignItems: 'center' },
  avatarBorder: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#C2185B' },
  metaTextWrapper: { marginLeft: 16, flex: 1 },
  nameText: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  idPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start' },
  idText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 12, marginLeft: 4 },
  
  card: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoTextWrapper: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: '#9E9E9E', marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 60 }
});

export default ProfileScreen;
