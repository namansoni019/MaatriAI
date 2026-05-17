import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { getBabyById, updateBaby } from '../../database/babyRepository';
import { addBabyVisit } from '../../database/babyVisitRepository';
import { Baby, BabyVisit } from '../../types';

const BabyVisitScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { babyId, visitDay } = route.params;

  const [baby, setBaby] = useState<Baby | null>(null);
  const [ageDays, setAgeDays] = useState(0);

  // Common State
  const [weight, setWeight] = useState('');
  const [feeding, setFeeding] = useState<'BREASTFEEDING' | 'FORMULA' | 'MIXED'>('BREASTFEEDING');
  const [isActive, setIsActive] = useState(true);
  const [hasFever, setHasFever] = useState(false);

  // Dynamic States
  const [umbilicusClean, setUmbilicusClean] = useState(true);
  const [passedUrine, setPassedUrine] = useState(true);
  const [passedMeconium, setPassedMeconium] = useState(true);
  const [skinColor, setSkinColor] = useState('Pink');
  
  const [jaundiceScanDone, setJaundiceScanDone] = useState(false);
  const [breathScanDone, setBreathScanDone] = useState(false);
  
  const [bfEstablished, setBfEstablished] = useState(true);
  
  const [bcgGiven, setBcgGiven] = useState(false);
  const [jaundiceResolved, setJaundiceResolved] = useState(true);
  const [umbilicusFallen, setUmbilicusFallen] = useState(false);

  const [socialSmile, setSocialSmile] = useState(true);
  const [abnormalMoves, setAbnormalMoves] = useState(false);

  const [polioHepGiven, setPolioHepGiven] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadBaby = async () => {
      const b = await getBabyById(babyId);
      if (b) {
        setBaby(b);
        const msDiff = Date.now() - new Date(b.dateOfBirth).getTime();
        setAgeDays(Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24))));
      }
    };
    loadBaby();
  }, [babyId]);

  const speakAssessment = (text: string) => {
    Speech.speak(text, { language: 'hi-IN', rate: 0.9 });
  };

  const handleSave = async () => {
    if (!baby) return;
    if (!weight || isNaN(parseFloat(weight))) {
      Alert.alert('Required', 'Please enter current weight.');
      return;
    }
    
    if (visitDay === 3 && !jaundiceScanDone) {
      Alert.alert('Required', 'Jaundice Scan is mandatory on Day 3.');
      return;
    }

    setSaving(true);
    const wNum = parseFloat(weight);
    let weightStatus: 'STABLE' | 'GAINING' | 'LOSING' = 'STABLE';
    if (wNum > baby.birthWeightKg) weightStatus = 'GAINING';
    else if (wNum < baby.birthWeightKg) weightStatus = 'LOSING';

    const dangerSigns: string[] = [];
    if (!isActive) dangerSigns.push('Lethargic');
    if (hasFever) dangerSigns.push('Fever');
    if (visitDay === 1 && (!passedUrine || !passedMeconium)) dangerSigns.push('No Urine/Meconium');
    if (visitDay === 1 && skinColor !== 'Pink') dangerSigns.push(`Skin: ${skinColor}`);
    if (visitDay === 14 && abnormalMoves) dangerSigns.push('Abnormal Movements');

    let assessment: 'SAFE' | 'MONITOR' | 'REFER' = 'SAFE';
    let voiceMsg = 'बच्चा स्वस्थ है।';

    if (dangerSigns.length > 0) {
      if (dangerSigns.includes('Lethargic') || dangerSigns.includes('Fever')) {
        assessment = 'REFER';
        voiceMsg = 'बच्चे में खतरे के लक्षण हैं। कृपया तुरंत पी एच सी ले जाएं।';
      } else {
        assessment = 'MONITOR';
        voiceMsg = 'बच्चे की निगरानी करें। कुछ लक्षण सामान्य नहीं हैं।';
      }
    } else if (weightStatus === 'LOSING' && visitDay >= 7) {
      assessment = 'MONITOR';
      voiceMsg = 'बच्चे का वजन घट रहा है, स्तनपान पर ध्यान दें।';
    }

    try {
      await addBabyVisit({
        babyId,
        motherId: baby.motherId,
        ashaId: baby.ashaId,
        visitDay,
        visitDate: new Date().toISOString(),
        weightKg: wNum,
        weightStatus,
        jaundiceScanDone,
        breathScanDone,
        feedingStatus: feeding,
        dangerSigns,
        overallAssessment: assessment,
        notes: ''
      });

      if (visitDay === 28) {
        await updateBaby(babyId, { currentStatus: 'NEONATAL_COMPLETE' });
        voiceMsg += ' नवजात शिशु देखभाल की अवधि सफलतापूर्वक पूरी हो गई है।';
      }

      speakAssessment(voiceMsg);
      
      Alert.alert('Visit Saved', `Assessment: ${assessment}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save visit.');
    } finally {
      setSaving(false);
    }
  };

  const SelectionButton = ({ label, selected, onPress }: any) => (
    <TouchableOpacity style={[styles.selBtn, selected && styles.selBtnActive]} onPress={onPress}>
      <Text style={[styles.selBtnText, selected && styles.selBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#E91E8C', '#C2185B']} style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Day {visitDay} Visit</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>{baby?.name} • {ageDays} days old</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Routine Checks (All Visits)</Text>
          
          <Text style={styles.label}>Current Weight (kg) *</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={weight} onChangeText={setWeight} placeholder="e.g. 3.2" />
          
          <Text style={styles.label}>Feeding Status</Text>
          <View style={styles.row}>
            <SelectionButton label="Breast" selected={feeding === 'BREASTFEEDING'} onPress={() => setFeeding('BREASTFEEDING')} />
            <SelectionButton label="Formula" selected={feeding === 'FORMULA'} onPress={() => setFeeding('FORMULA')} />
            <SelectionButton label="Mixed" selected={feeding === 'MIXED'} onPress={() => setFeeding('MIXED')} />
          </View>

          <Text style={styles.label}>Baby seems active?</Text>
          <View style={styles.row}>
            <SelectionButton label="Yes" selected={isActive} onPress={() => setIsActive(true)} />
            <SelectionButton label="No" selected={!isActive} onPress={() => setIsActive(false)} />
          </View>

          <Text style={styles.label}>Any Fever?</Text>
          <View style={styles.row}>
            <SelectionButton label="No" selected={!hasFever} onPress={() => setHasFever(false)} />
            <SelectionButton label="Yes" selected={hasFever} onPress={() => setHasFever(true)} />
          </View>
        </View>

        {visitDay === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Day 1 Specific</Text>
            
            <Text style={styles.label}>Umbilical Cord clean & dry?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={umbilicusClean} onPress={() => setUmbilicusClean(true)} /><SelectionButton label="No" selected={!umbilicusClean} onPress={() => setUmbilicusClean(false)} /></View>
            
            <Text style={styles.label}>Passed urine in 24hrs?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={passedUrine} onPress={() => setPassedUrine(true)} /><SelectionButton label="No" selected={!passedUrine} onPress={() => setPassedUrine(false)} /></View>

            <Text style={styles.label}>Skin Color</Text>
            <View style={styles.row}><SelectionButton label="Pink" selected={skinColor === 'Pink'} onPress={() => setSkinColor('Pink')} /><SelectionButton label="Yellow" selected={skinColor === 'Yellow'} onPress={() => setSkinColor('Yellow')} /><SelectionButton label="Pale/Blue" selected={skinColor === 'Pale'} onPress={() => setSkinColor('Pale')} /></View>
          </View>
        )}

        {visitDay === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Day 3 Specific</Text>
            <Text style={styles.label}>Jaundice Scan (Required) *</Text>
            <View style={styles.row}><SelectionButton label="Done" selected={jaundiceScanDone} onPress={() => setJaundiceScanDone(true)} /><SelectionButton label="Not Done" selected={!jaundiceScanDone} onPress={() => setJaundiceScanDone(false)} /></View>
            <Text style={styles.label}>Breastfeeding Established?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={bfEstablished} onPress={() => setBfEstablished(true)} /><SelectionButton label="No" selected={!bfEstablished} onPress={() => setBfEstablished(false)} /></View>
          </View>
        )}

        {visitDay === 7 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Day 7 Specific</Text>
            <Text style={styles.label}>Umbilical Cord Fallen Off?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={umbilicusFallen} onPress={() => setUmbilicusFallen(true)} /><SelectionButton label="No" selected={!umbilicusFallen} onPress={() => setUmbilicusFallen(false)} /></View>
            <Text style={styles.label}>BCG Given?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={bcgGiven} onPress={() => setBcgGiven(true)} /><SelectionButton label="No" selected={!bcgGiven} onPress={() => setBcgGiven(false)} /></View>
            <Text style={styles.label}>Jaundice Resolved?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={jaundiceResolved} onPress={() => setJaundiceResolved(true)} /><SelectionButton label="No" selected={!jaundiceResolved} onPress={() => setJaundiceResolved(false)} /></View>
          </View>
        )}

        {visitDay === 14 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Day 14 Specific</Text>
            <Text style={styles.label}>Social Smile Starting?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={socialSmile} onPress={() => setSocialSmile(true)} /><SelectionButton label="No" selected={!socialSmile} onPress={() => setSocialSmile(false)} /></View>
            <Text style={styles.label}>Abnormal Movements?</Text>
            <View style={styles.row}><SelectionButton label="No" selected={!abnormalMoves} onPress={() => setAbnormalMoves(false)} /><SelectionButton label="Yes" selected={abnormalMoves} onPress={() => setAbnormalMoves(true)} /></View>
          </View>
        )}

        {visitDay === 28 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Day 28 Specific (Final)</Text>
            <Text style={styles.label}>Polio + Hep B Given?</Text>
            <View style={styles.row}><SelectionButton label="Yes" selected={polioHepGiven} onPress={() => setPolioHepGiven(true)} /><SelectionButton label="No" selected={!polioHepGiven} onPress={() => setPolioHepGiven(false)} /></View>
            <Text style={[styles.label, { color: '#00796B', fontStyle: 'italic', marginTop: 12 }]}>Note: Weight should be 400-500g above birth weight.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtnWrapper} onPress={handleSave} disabled={saving}>
          <LinearGradient colors={['#2E7D32', '#43A047']} style={styles.saveBtn}>
            <Ionicons name="shield-checkmark" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : visitDay === 28 ? 'Complete Neonatal Period' : 'Save Assessment'}</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4F9' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 16, color: '#FFCDD2', textAlign: 'center' },

  scrollContent: { padding: 16 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#C2185B', marginBottom: 16 },
  
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginTop: 12, marginBottom: 8 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1A1A2E' },
  
  row: { flexDirection: 'row', gap: 8 },
  selBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  selBtnActive: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#C2185B' },
  selBtnText: { color: '#6B7280', fontWeight: '500' },
  selBtnTextActive: { color: '#C2185B', fontWeight: 'bold' },

  saveBtnWrapper: { borderRadius: 16, overflow: 'hidden', marginTop: 8, elevation: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default BabyVisitScreen;
