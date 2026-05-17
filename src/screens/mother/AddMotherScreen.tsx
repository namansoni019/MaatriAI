import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMother } from '../../database/motherRepository';
import { useTranslation } from 'react-i18next';

const AddMotherScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();

  // Section 1: Personal Info
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');

  // Section 2: Pregnancy Details
  const [weeksPregnant, setWeeksPregnant] = useState('');
  const [parity, setParity] = useState('0');
  const [abhaId, setAbhaId] = useState('');

  // Section 3: Health Measurements
  const [hemoglobin, setHemoglobin] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // UI State
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Auto-calculate BMI
  const h = parseFloat(height);
  const w = parseFloat(weight);
  let bmiValue = 0;
  if (!isNaN(h) && !isNaN(w) && h > 0) {
    bmiValue = w / ((h / 100) * (h / 100));
  }
  const bmiDisplay = bmiValue > 0 ? bmiValue.toFixed(1) : '-';

  // Helper for Hemoglobin hint
  const getHbHint = () => {
    const val = parseFloat(hemoglobin);
    if (isNaN(val) || val <= 0) return null;
    if (val < 7) return <Text style={[styles.hintText, { color: '#D32F2F' }]}>{t('addMother.anemiaSevere')}</Text>;
    if (val >= 7 && val < 11) return <Text style={[styles.hintText, { color: '#F57C00' }]}>{t('addMother.anemiaMild')}</Text>;
    return <Text style={[styles.hintText, { color: '#388E3C' }]}>{t('addMother.anemiaNormal')}</Text>;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) newErrors.name = t('addMother.errRequired');
    
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 15 || ageNum > 50) {
      newErrors.age = t('addMother.errAge');
    }

    if (!village.trim()) newErrors.village = t('addMother.errRequired');

    const weeksNum = parseInt(weeksPregnant);
    if (!weeksPregnant || isNaN(weeksNum) || weeksNum < 1 || weeksNum > 42) {
      newErrors.weeksPregnant = t('addMother.errWeeks');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      if (!sessionStr) {
        setIsLoading(false);
        return;
      }
      const session = JSON.parse(sessionStr);
      const ashaId = session.id;

      // Parse fields
      const a = parseInt(age) || 0;
      const wp = parseInt(weeksPregnant) || 0;
      const p = parseInt(parity) || 0;
      const hb = parseFloat(hemoglobin) || 0;
      const sys = parseInt(systolicBP) || 0;
      const dia = parseInt(diastolicBP) || 0;
      const bs = parseFloat(bloodSugar) || 0;

      // Auto-calculate risk score
      let score = 0;
      if (sys > 140) score += 30;
      if (hb > 0 && hb < 11) score += 20;
      if (bs > 140) score += 15;
      if (a > 35 || a < 18) score += 10;
      if (p > 4) score += 10;

      const riskTier = score < 30 ? 'GREEN' : score < 60 ? 'AMBER' : 'RED';

      await addMother({
        ashaId,
        name: name.trim(),
        age: a,
        village: village.trim(),
        district: district.trim(),
        state: stateName.trim(),
        weeksPregnant: wp,
        parity: p,
        hemoglobin: hb,
        systolicBP: sys,
        diastolicBP: dia,
        bloodSugar: bs,
        bmi: bmiValue,
        height: parseFloat(height) || 0,
        weight: parseFloat(weight) || 0,
        riskTier,
        riskScore: score,
        phone: phone.trim(),
        abhaId: abhaId.trim(),
        lastVisitDate: '',
        nextVisitDate: '',
        isSynced: false,
        status: 'PREGNANT',
      });

      setIsLoading(false);
      setShowSuccessToast(true);

      setTimeout(() => {
        setShowSuccessToast(false);
        navigation.goBack();
      }, 1500);

    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const renderInput = (
    label: string, 
    value: string, 
    setter: (val: string) => void, 
    keyName: string, 
    options?: { keyboardType?: any, placeholder?: string, maxLength?: number, error?: string }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, isFocused === keyName && styles.inputFocused]}
        value={value}
        onChangeText={setter}
        placeholder={options?.placeholder}
        keyboardType={options?.keyboardType || 'default'}
        maxLength={options?.maxLength}
        onFocus={() => setIsFocused(keyName)}
        onBlur={() => setIsFocused(null)}
      />
      {options?.error ? <Text style={styles.errorText}>{options.error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Info Banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{t('addMother.offlineBanner')}</Text>
          </View>

          {/* Section 1 */}
          <Text style={styles.sectionHeader}>{t('addMother.basicDetails')}</Text>
          {renderInput(t('addMother.fullName'), name, setName, 'name', { error: errors.name, placeholder: t('addMother.namePlaceholder') })}
          {renderInput(t('addMother.age'), age, setAge, 'age', { keyboardType: 'numeric', error: errors.age, placeholder: t('addMother.agePlaceholder') })}
          {renderInput(t('addMother.phone'), phone, setPhone, 'phone', { keyboardType: 'numeric', maxLength: 10 })}
          {renderInput(t('addMother.village'), village, setVillage, 'village', { error: errors.village })}
          {renderInput(t('addMother.district'), district, setDistrict, 'district')}
          {renderInput(t('addMother.state'), stateName, setStateName, 'stateName')}

          {/* Section 2 */}
          <Text style={styles.sectionHeader}>{t('addMother.pregnancyDetails')}</Text>
          {renderInput(t('addMother.weeksPregnant'), weeksPregnant, setWeeksPregnant, 'weeksPregnant', { keyboardType: 'numeric', error: errors.weeksPregnant, placeholder: t('addMother.weeksPlaceholder') })}
          {renderInput(t('addMother.parity'), parity, setParity, 'parity', { keyboardType: 'numeric', placeholder: t('addMother.parityPlaceholder') })}
          {renderInput('ABHA ID', abhaId, setAbhaId, 'abhaId', { placeholder: t('common.optional') })}

          {/* Section 3 */}
          <Text style={styles.sectionHeader}>{t('addMother.vitals')}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('addMother.hb')}</Text>
            <TextInput
              style={[styles.input, isFocused === 'hemoglobin' && styles.inputFocused]}
              value={hemoglobin}
              onChangeText={setHemoglobin}
              keyboardType="decimal-pad"
              onFocus={() => setIsFocused('hemoglobin')}
              onBlur={() => setIsFocused(null)}
            />
            {getHbHint()}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              {renderInput(t('addMother.sysBp'), systolicBP, setSystolicBP, 'systolicBP', { keyboardType: 'numeric' })}
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              {renderInput(t('addMother.diaBp'), diastolicBP, setDiastolicBP, 'diastolicBP', { keyboardType: 'numeric' })}
            </View>
          </View>
          {parseFloat(systolicBP) > 140 && (
            <Text style={[styles.hintText, { color: '#D32F2F', marginTop: -10, marginBottom: 16 }]}>⚠️ High BP detected</Text>
          )}

          {renderInput(t('addMother.sugar'), bloodSugar, setBloodSugar, 'bloodSugar', { keyboardType: 'decimal-pad' })}

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              {renderInput(t('addMother.height'), height, setHeight, 'height', { keyboardType: 'decimal-pad' })}
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              {renderInput(t('addMother.weight'), weight, setWeight, 'weight', { keyboardType: 'decimal-pad' })}
            </View>
          </View>

          <View style={styles.bmiContainer}>
            <Text style={styles.label}>BMI (Auto-calculated)</Text>
            <View style={styles.bmiBox}>
              <Text style={styles.bmiText}>{bmiDisplay}</Text>
            </View>
            <Text style={styles.bmiHint}>Normal: 18.5–24.9 | Underweight: {"<"}18.5 | Overweight: {">"}25</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t('addMother.saveBtn')}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>

        {/* Success Toast */}
        {showSuccessToast && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>✓ {t('addMother.successMsg')}</Text>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  banner: {
    backgroundColor: '#FCE4EC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  bannerText: {
    color: '#C2185B',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2
  },
  sectionHeader: {
    color: '#C2185B',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#757575',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500'
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#212121'
  },
  inputFocused: {
    borderColor: '#C2185B',
    backgroundColor: '#ffffff'
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bmiContainer: {
    marginBottom: 24,
  },
  bmiBox: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center'
  },
  bmiText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575'
  },
  bmiHint: {
    color: '#9E9E9E',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center'
  },
  saveBtn: {
    backgroundColor: '#C2185B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toastText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default AddMotherScreen;