import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMotherById, updateMother } from '../../database/motherRepository';
import { addBaby } from '../../database/babyRepository';
import { addBabyVisit } from '../../database/babyVisitRepository';
import { Mother } from '../../types';

const RecordDeliveryScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { motherId, motherName } = route.params;

  const [mother, setMother] = useState<Mother | null>(null);
  
  // Section 1: Delivery
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryType, setDeliveryType] = useState<'NORMAL' | 'CAESAREAN' | 'ASSISTED'>('NORMAL');
  const [deliveryPlace, setDeliveryPlace] = useState('Home');

  // Section 2: Mother
  const [hasComplications, setHasComplications] = useState(false);
  const [complications, setComplications] = useState('');
  const [bloodLoss, setBloodLoss] = useState('Normal');
  const [motherCondition, setMotherCondition] = useState('Good');

  // Section 3: Baby
  const [bornAlive, setBornAlive] = useState(true);
  const [babyGender, setBabyGender] = useState<'MALE' | 'FEMALE' | 'UNKNOWN'>('UNKNOWN');
  const [babyWeight, setBabyWeight] = useState('');
  const [babyAppearance, setBabyAppearance] = useState<'NORMAL' | 'PREMATURE' | 'LBW'>('NORMAL');
  const [criedImmediately, setCriedImmediately] = useState(true);
  const [visibleProblems, setVisibleProblems] = useState(false);

  const [saving, setSaving] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const loadMother = async () => {
      const m = await getMotherById(motherId);
      if (m) setMother(m);
    };
    loadMother();
  }, []);

  const handleSave = async () => {
    if (!mother) return;
    if (bornAlive && (!babyWeight || isNaN(parseFloat(babyWeight)))) {
      Alert.alert('Error', 'Please enter a valid baby birth weight.');
      return;
    }

    setSaving(true);
    try {
      const weightNum = parseFloat(babyWeight);

      // 1. Update Mother
      await updateMother(motherId, {
        status: 'DELIVERED',
        deliveryDate,
        deliveryType,
        deliveryComplications: hasComplications ? complications : 'None',
        deliveryBabyWeight: bornAlive ? weightNum : 0
      });

      if (bornAlive) {
        // 2. Create Baby
        const newBabyId = await addBaby({
          motherId,
          ashaId: mother.ashaId,
          name: `Baby of ${motherName}`,
          gender: babyGender,
          dateOfBirth: deliveryDate,
          birthWeightKg: weightNum,
          birthType: babyAppearance,
          currentStatus: 'ACTIVE'
        });

        // 3. Auto-schedule 5 visits implicitly by doing nothing (they are dynamically calculated)
        // But we can create the first "Day 1" visit as a placeholder if needed,
        // or let BabyProfile dynamically generate the schedule.
        // The plan says "Auto-schedule 5 visits". Our getScheduledVisits dynamically returns the 5 days.
        
        Alert.alert(
          'Success ✅', 
          `Delivery recorded!\nBaby profile created.\nFirst visit due soon.`,
          [{ text: 'Go to Baby Profile', onPress: () => navigation.replace('BabyProfile', { babyId: newBabyId }) }]
        );
      } else {
        Alert.alert(
          'Record Saved', 
          'Delivery recorded. Please provide necessary postpartum care and support for the mother during this difficult time.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save delivery record.');
    } finally {
      setSaving(false);
    }
  };

  const SelectionButton = ({ label, selected, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.selBtn, selected && styles.selBtnActive]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.selBtnText, selected && styles.selBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View style={[styles.headerGradient, { paddingTop: insets.top + 16, opacity: fadeAnim }]}>
        <LinearGradient colors={['#880E4F', '#C2185B', '#E91E8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Delivery</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>{motherName}</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        
        {/* Section 1: Delivery Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Delivery Details</Text>
          <Text style={styles.label}>Date of Delivery (YYYY-MM-DD)</Text>
          <TextInput 
            style={styles.input} 
            value={deliveryDate} 
            onChangeText={setDeliveryDate}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>Type of Delivery</Text>
          <View style={styles.row}>
            <SelectionButton label="Normal" selected={deliveryType === 'NORMAL'} onPress={() => setDeliveryType('NORMAL')} />
            <SelectionButton label="C-Section" selected={deliveryType === 'CAESAREAN'} onPress={() => setDeliveryType('CAESAREAN')} />
            <SelectionButton label="Assisted" selected={deliveryType === 'ASSISTED'} onPress={() => setDeliveryType('ASSISTED')} />
          </View>

          <Text style={styles.label}>Place of Delivery</Text>
          <View style={styles.rowWrap}>
            {['Home', 'PHC', 'Hospital', 'In transit'].map(p => (
               <SelectionButton key={p} label={p} selected={deliveryPlace === p} onPress={() => setDeliveryPlace(p)} />
            ))}
          </View>
        </View>

        {/* Section 2: Mother Condition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Mother Condition</Text>
          <Text style={styles.label}>Any Complications?</Text>
          <View style={styles.row}>
            <SelectionButton label="No" selected={!hasComplications} onPress={() => setHasComplications(false)} />
            <SelectionButton label="Yes" selected={hasComplications} onPress={() => setHasComplications(true)} />
          </View>
          {hasComplications && (
            <TextInput 
              style={[styles.input, { marginTop: 12, height: 60 }]} 
              multiline
              placeholder="Describe complications..."
              value={complications}
              onChangeText={setComplications}
            />
          )}

          <Text style={styles.label}>Blood Loss</Text>
          <View style={styles.row}>
            <SelectionButton label="Normal" selected={bloodLoss === 'Normal'} onPress={() => setBloodLoss('Normal')} />
            <SelectionButton label="Excessive" selected={bloodLoss === 'Excessive'} onPress={() => setBloodLoss('Excessive')} />
          </View>

          <Text style={styles.label}>Overall Condition</Text>
          <View style={styles.rowWrap}>
            {['Good', 'Needs Monitoring', 'Critical'].map(c => (
               <SelectionButton key={c} label={c} selected={motherCondition === c} onPress={() => setMotherCondition(c)} />
            ))}
          </View>
        </View>

        {/* Section 3: Baby Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Baby Details</Text>
          <Text style={styles.label}>Was baby born alive?</Text>
          <View style={styles.row}>
            <SelectionButton label="Yes" selected={bornAlive} onPress={() => setBornAlive(true)} />
            <SelectionButton label="No" selected={!bornAlive} onPress={() => setBornAlive(false)} />
          </View>

          {!bornAlive && (
            <View style={styles.supportBox}>
              <Ionicons name="heart-half-outline" size={24} color="#C2185B" />
              <Text style={styles.supportText}>कृपया माँ को इस कठिन समय में सहायता और सांत्वना प्रदान करें। (Please provide support to the mother.)</Text>
            </View>
          )}

          {bornAlive && (
            <>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.row}>
                <SelectionButton label="Boy" selected={babyGender === 'MALE'} onPress={() => setBabyGender('MALE')} />
                <SelectionButton label="Girl" selected={babyGender === 'FEMALE'} onPress={() => setBabyGender('FEMALE')} />
                <SelectionButton label="Unknown" selected={babyGender === 'UNKNOWN'} onPress={() => setBabyGender('UNKNOWN')} />
              </View>

              <Text style={styles.label}>Birth Weight (kg)</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric"
                value={babyWeight} 
                onChangeText={setBabyWeight}
                placeholder="e.g. 2.8"
              />

              <Text style={styles.label}>Baby Appeared</Text>
              <View style={styles.rowWrap}>
                <SelectionButton label="Healthy" selected={babyAppearance === 'NORMAL'} onPress={() => setBabyAppearance('NORMAL')} />
                <SelectionButton label="Premature" selected={babyAppearance === 'PREMATURE'} onPress={() => setBabyAppearance('PREMATURE')} />
                <SelectionButton label="Low Weight" selected={babyAppearance === 'LBW'} onPress={() => setBabyAppearance('LBW')} />
              </View>

              <Text style={styles.label}>Cried Immediately?</Text>
              <View style={styles.row}>
                <SelectionButton label="Yes" selected={criedImmediately} onPress={() => setCriedImmediately(true)} />
                <SelectionButton label="No" selected={!criedImmediately} onPress={() => setCriedImmediately(false)} />
              </View>

              <Text style={styles.label}>Any visible problems?</Text>
              <View style={styles.row}>
                <SelectionButton label="No" selected={!visibleProblems} onPress={() => setVisibleProblems(false)} />
                <SelectionButton label="Yes" selected={visibleProblems} onPress={() => setVisibleProblems(true)} />
              </View>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={styles.saveBtnWrapper}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient colors={['#2E7D32', '#43A047']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.saveBtn}>
            <Ionicons name="checkmark-done" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Delivery Record'}</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 16, color: '#FFCDD2', textAlign: 'center' },

  scrollContent: { padding: 16 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#880E4F', marginBottom: 16 },
  
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginTop: 12, marginBottom: 8 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1A1A2E' },
  
  row: { flexDirection: 'row', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  
  selBtn: { flex: 1, minWidth: 80, backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  selBtnActive: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#C2185B' },
  selBtnText: { color: '#6B7280', fontWeight: '500' },
  selBtnTextActive: { color: '#C2185B', fontWeight: 'bold' },

  supportBox: { backgroundColor: '#FCE4EC', borderRadius: 12, padding: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center' },
  supportText: { color: '#880E4F', fontSize: 14, fontStyle: 'italic', marginLeft: 12, flex: 1, lineHeight: 20 },

  saveBtnWrapper: { borderRadius: 16, overflow: 'hidden', marginTop: 8, elevation: 4, shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default RecordDeliveryScreen;
