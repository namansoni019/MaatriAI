import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../database/db';
import { AuthContext } from '../../context/AuthContext';
import { loadDemoData } from '../../utils/demoData';

const LoginScreen: React.FC = () => {
  const { signIn } = React.useContext(AuthContext);
  const { t } = useTranslation();
  const [ashaId, setAshaId] = useState('');
  const [pin, setPin] = useState('');
  const [isFocused, setIsFocused] = useState<'id' | 'pin' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    setErrorMsg('');
    if (!ashaId.trim()) {
      setErrorMsg(t('login.emptyIdError'));
      return;
    }
    if (pin.length !== 4) {
      setErrorMsg(t('login.invalidPinError'));
      return;
    }

    setIsLoading(true);
    try {
      // Step 2 & 3: Check AsyncStorage
      const session = await AsyncStorage.getItem('maatri_session');
      if (session) {
        const parsedSession = JSON.parse(session);
        if (parsedSession.id === ashaId.trim()) {
          setIsLoading(false);
          signIn();
          return;
        }
      }

      // Step 4: Check SQLite
      const query = `SELECT * FROM asha_workers WHERE id = ? AND pin = ?`;
      const worker: any = await db.getFirstAsync(query, [ashaId.trim(), pin]);
      
      // Step 5: Save & Navigate
      if (worker) {
        await AsyncStorage.setItem('maatri_session', JSON.stringify({
          id: worker.id,
          name: worker.name,
          phone: worker.phone,
          village: worker.village,
          district: worker.district,
          state: worker.state,
          preferredLanguage: worker.preferred_language
        }));
        setIsLoading(false);
        signIn();
      } else {
        // Step 6 & 7: Not found error
        setIsLoading(false);
        setErrorMsg(t('login.loginError'));
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(t('common.error'));
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top 40% */}
      <View style={styles.topSection}>
        <SafeAreaView>
          <Text style={styles.logoText}>{t('app.name')}</Text>
          <Text style={styles.taglineHi}>{t('app.tagline')}</Text>
          <Text style={styles.taglineEn}>{t('app.taglineEn')}</Text>
        </SafeAreaView>
      </View>

      {/* Bottom 60% */}
      <View style={styles.bottomSection}>
        <Text style={styles.title}>{t('login.title')}</Text>
        
        <Text style={styles.label}>{t('login.ashaIdLabel')}</Text>
        <TextInput
          style={[styles.input, isFocused === 'id' && styles.inputFocused]}
          placeholder={t('login.ashaIdPlaceholder')}
          keyboardType="numeric"
          value={ashaId}
          onChangeText={setAshaId}
          onFocus={() => setIsFocused('id')}
          onBlur={() => setIsFocused(null)}
        />

        <Text style={styles.label}>{t('login.pinLabel')}</Text>
        <TextInput
          style={[styles.input, isFocused === 'pin' && styles.inputFocused]}
          placeholder={t('login.pinPlaceholder')}
          secureTextEntry
          maxLength={4}
          keyboardType="numeric"
          value={pin}
          onChangeText={setPin}
          onFocus={() => setIsFocused('pin')}
          onBlur={() => setIsFocused(null)}
        />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity 
          style={styles.loginBtn} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>{t('login.loginBtn')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.setupText}>{t('login.setupText')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ marginTop: 24, padding: 10 }}
          onPress={async () => {
            setIsLoading(true);
            try {
              await loadDemoData();
              signIn();
            } catch (e) {
              console.error(e);
              setIsLoading(false);
            }
          }}
        >
          <Text style={{ textAlign: 'center', color: '#757575', fontSize: 13, fontWeight: 'bold' }}>
            🎯 Try Demo Mode
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2185B' },
  topSection: {
    flex: 0.4,
    backgroundColor: '#C2185B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logoText: { color: '#ffffff', fontWeight: 'bold', fontSize: 36, textAlign: 'center', marginBottom: 8 },
  taglineHi: { color: '#ffffff', fontSize: 15, textAlign: 'center', marginBottom: 4 },
  taglineEn: { color: '#ffffff', fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
  bottomSection: {
    flex: 0.6,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121', marginTop: 30, marginBottom: 24 },
  label: { color: '#9E9E9E', fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#212121'
  },
  inputFocused: { borderColor: '#C2185B' },
  errorText: { color: 'red', marginTop: 12, fontSize: 14, textAlign: 'center' },
  loginBtn: {
    backgroundColor: '#C2185B',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loginBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
  setupText: { color: '#9E9E9E', textAlign: 'center', marginTop: 16, fontSize: 14 }
});

export default LoginScreen;