import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../database/db';
import { AuthContext } from '../../context/AuthContext';

const LoginScreen: React.FC = () => {
  const { signIn } = React.useContext(AuthContext);
  const [ashaId, setAshaId] = useState('');
  const [pin, setPin] = useState('');
  const [isFocused, setIsFocused] = useState<'id' | 'pin' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    setErrorMsg('');
    if (!ashaId.trim()) {
      setErrorMsg('ASHA ID cannot be empty');
      return;
    }
    if (pin.length !== 4) {
      setErrorMsg('PIN must be 4 digits');
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
        setErrorMsg('ASHA ID or PIN not found. Please register first.');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('An error occurred during login');
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
          <Text style={styles.logoText}>Maatri.AI</Text>
          <Text style={styles.taglineHi}>माँ और शिशु की देखभाल</Text>
          <Text style={styles.taglineEn}>Maternal & Neonatal Care AI</Text>
        </SafeAreaView>
      </View>

      {/* Bottom 60% */}
      <View style={styles.bottomSection}>
        <Text style={styles.title}>ASHA Worker Login</Text>
        
        <Text style={styles.label}>ASHA ID</Text>
        <TextInput
          style={[styles.input, isFocused === 'id' && styles.inputFocused]}
          placeholder="Enter your ASHA ID"
          keyboardType="numeric"
          value={ashaId}
          onChangeText={setAshaId}
          onFocus={() => setIsFocused('id')}
          onBlur={() => setIsFocused(null)}
        />

        <Text style={styles.label}>4-digit PIN</Text>
        <TextInput
          style={[styles.input, isFocused === 'pin' && styles.inputFocused]}
          placeholder="Enter 4-digit PIN"
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
            <Text style={styles.loginBtnText}>Login / लॉगिन</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.setupText}>First time? पहली बार? Setup account</Text>
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