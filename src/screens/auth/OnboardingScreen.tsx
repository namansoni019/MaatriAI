import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../database/db';
import { AuthContext } from '../../context/AuthContext';

const LANGUAGES = [
  { id: 'hi', name: 'Hindi', native: 'हिंदी' },
  { id: 'mr', name: 'Marathi', native: 'मराठी' },
  { id: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা' },
  { id: 'te', name: 'Telugu', native: 'తెలుగు' },
];

const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState(1);
  const navigation = useNavigation<any>();
  const { signIn } = React.useContext(AuthContext);

  // Step 1 State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('hi');

  // Step 2 State
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');

  // Step 3 State
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const handleNext = async () => {
    setErrorMsg('');
    if (step === 1) {
      if (!fullName.trim() || phone.length !== 10) {
        setErrorMsg('Please enter a valid name and 10-digit phone number');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!village.trim() || !district.trim() || !stateName.trim()) {
        setErrorMsg('Please fill in all location details');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (pin.length !== 4) {
        setErrorMsg('PIN must be 4 digits');
        return;
      }
      if (pin !== confirmPin) {
        setErrorMsg('PINs do not match');
        return;
      }
      
      // Save & Start
      try {
        const id = Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();

        await db.runAsync(
          `INSERT INTO asha_workers (id, name, phone, village, district, state, preferred_language, pin, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, fullName, phone, village, district, stateName, language, pin, now]
        );

        await AsyncStorage.setItem('maatri_session', JSON.stringify({
          id,
          name: fullName,
          phone,
          village,
          district,
          state: stateName,
          preferredLanguage: language
        }));

        signIn();
      } catch (err) {
        console.error(err);
        setErrorMsg('Error creating account');
      }
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={[styles.dot, step >= s ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderDots()}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {step === 1 && (
            <View>
              <Text style={styles.title}>Personal Details / व्यक्तिगत जानकारी</Text>
              
              <Text style={styles.label}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
              />
              
              <Text style={styles.label}>Phone Number</Text>
              <TextInput 
                style={styles.input} 
                placeholder="10-digit mobile number"
                keyboardType="numeric"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.label}>Preferred Language</Text>
              <View style={styles.languageContainer}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity 
                    key={lang.id} 
                    style={[styles.langBtn, language === lang.id && styles.langBtnActive]}
                    onPress={() => setLanguage(lang.id)}
                  >
                    <Text style={[styles.langText, language === lang.id && styles.langTextActive]}>
                      {lang.name} ({lang.native})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.title}>Your Location / आपका स्थान</Text>
              
              <Text style={styles.label}>Village / Town Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Rampur"
                value={village}
                onChangeText={setVillage}
              />
              
              <Text style={styles.label}>District</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Pune"
                value={district}
                onChangeText={setDistrict}
              />

              <Text style={styles.label}>State</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Maharashtra"
                value={stateName}
                onChangeText={setStateName}
              />
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.title}>Create PIN / PIN बनाएं</Text>
              
              <Text style={styles.label}>4-digit PIN</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter 4-digit PIN"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={pin}
                onChangeText={setPin}
              />
              
              <Text style={styles.label}>Confirm PIN</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Re-enter PIN"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={confirmPin}
                onChangeText={setConfirmPin}
              />
            </View>
          )}

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>{step === 3 ? 'Save & Start / शुरू करें' : 'Next / आगे'}</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, padding: 24, paddingTop: Platform.OS === 'android' ? 40 : 24 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4, flex: 1, maxWidth: 40 },
  dotActive: { backgroundColor: '#C2185B' },
  dotInactive: { backgroundColor: '#E0E0E0' },
  scrollContent: { paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212121', marginBottom: 24 },
  label: { color: '#9E9E9E', fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#212121'
  },
  languageContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  langBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  langBtnActive: { backgroundColor: '#C2185B', borderColor: '#C2185B' },
  langText: { color: '#757575', fontSize: 14 },
  langTextActive: { color: '#ffffff', fontWeight: 'bold' },
  errorText: { color: 'red', marginTop: 16, fontSize: 14, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 16 },
  backBtn: {
    borderWidth: 1,
    borderColor: '#9E9E9E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backBtnText: { color: '#9E9E9E', fontWeight: 'bold', fontSize: 16 },
  nextBtn: {
    backgroundColor: '#C2185B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 16
  },
  nextBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 }
});

export default OnboardingScreen;