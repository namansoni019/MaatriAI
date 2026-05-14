import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  Image, ActivityIndicator, Animated, Easing, Alert, Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { analyseNewbornImage, VisionResult } from '../../ai/visionAnalyser';
import { useTranslation } from 'react-i18next';

type ScanState = 'instructions' | 'camera' | 'preview' | 'analysing' | 'results';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_W = SCREEN_W * 0.8;
const FRAME_H = SCREEN_H * 0.45;

const VisionScanScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const newbornId = route.params?.newbornId;

  const [state, setState] = useState<ScanState>('instructions');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Analysis step animations
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);

  const cameraRef = useRef<any>(null);

  // ── Open camera
  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed for scanning.');
        return;
      }
    }
    setState('camera');
  };

  // ── Pick image from storage (for testing)
  const pickFromGallery = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
        setState('preview');
      }
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Could not pick image. Please try again.');
    }
  };

  // ── Take photo
  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        setPhotoUri(photo.uri);
        setState('preview');
      } catch (err) {
        console.error('Failed to take photo:', err);
        Alert.alert('Error', 'Could not capture photo. Please try again.');
      }
    }
  };

  // ── Start analysis
  const startAnalysis = async () => {
    setState('analysing');
    setStep1Done(false);
    setStep2Done(false);
    setStep3Done(false);

    // Progressive step completion
    setTimeout(() => setStep1Done(true), 1000);
    setTimeout(() => setStep2Done(true), 2000);
    setTimeout(() => setStep3Done(true), 2800);

    if (photoUri) {
      const analysisResult = await analyseNewbornImage(photoUri);
      setResult(analysisResult);
      setState('results');
    }
  };

  // ── Save results
  const saveResults = async () => {
    try {
      // TODO: Save to newborn record in SQLite via newbornRepository
      Alert.alert('Saved! / सहेजा गया!', 'Scan results saved successfully.\nजांच के नतीजे सहेजे गए।', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error saving vision scan:', e);
      Alert.alert('Error', 'Could not save results.');
    }
  };

  // ── Render step item
  const renderStep = (label: string, done: boolean) => (
    <View style={styles.stepRow}>
      {done ? (
        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
      ) : (
        <ActivityIndicator size="small" color="#C2185B" />
      )}
      <Text style={[styles.stepText, done && styles.stepDone]}>{label}</Text>
    </View>
  );

  // ═══════════════════════════════════════════════
  // STATE: instructions
  // ═══════════════════════════════════════════════
  if (state === 'instructions') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.instrScroll}>
          <Text style={styles.title}>{t('visionScan.title')}</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardRow}
          >
            <View style={styles.instrCard}>
              <Text style={styles.instrEmoji}>📷</Text>
              <Text style={styles.instrText}>{t('visionScan.instr1')}</Text>
            </View>
            <View style={styles.instrCard}>
              <Text style={styles.instrEmoji}>📏</Text>
              <Text style={styles.instrText}>{t('visionScan.instr2')}</Text>
            </View>
            <View style={styles.instrCard}>
              <Text style={styles.instrEmoji}>🔆</Text>
              <Text style={styles.instrText}>{t('visionScan.instr3')}</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.openCamBtn} onPress={openCamera}>
            <Ionicons name="camera" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.openCamBtnText}>{t('visionScan.openCam')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery}>
            <Ionicons name="images" size={22} color="#C2185B" style={{ marginRight: 8 }} />
            <Text style={styles.pickBtnText}>{t('visionScan.pickGallery')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════
  // STATE: camera
  // ═══════════════════════════════════════════════
  if (state === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
          flash={flashOn ? 'on' : 'off'}
        />

        {/* Frame overlay */}
        <View style={styles.overlay}>
          <View style={styles.frameBorder}>
            <Text style={styles.frameText}>{t('visionScan.frameText')}</Text>
          </View>
        </View>

        {/* Bottom controls */}
        <View style={styles.camControls}>
          <TouchableOpacity onPress={() => setState('instructions')}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setFlashOn(!flashOn)}>
            <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════
  // STATE: preview
  // ═══════════════════════════════════════════════
  if (state === 'preview' && photoUri) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
        <View style={styles.previewButtons}>
          <TouchableOpacity style={styles.useBtn} onPress={startAnalysis}>
            <Text style={styles.useBtnText}>{t('visionScan.usePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setState('camera')}>
            <Text style={styles.retakeBtnText}>{t('visionScan.retake')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════
  // STATE: analysing
  // ═══════════════════════════════════════════════
  if (state === 'analysing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analysingContainer}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.thumbImage} resizeMode="cover" />
          )}
          <Text style={styles.analysingTitle}>{t('visionScan.analysing')}</Text>
          <View style={styles.stepsContainer}>
            {renderStep(t('visionScan.step1'), step1Done)}
            {renderStep(t('visionScan.step2'), step2Done)}
            {renderStep(t('visionScan.step3'), step3Done)}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════
  // STATE: results
  // ═══════════════════════════════════════════════
  if (state === 'results' && result) {
    const jColor = result.jaundiceRisk === 'LOW' ? '#4CAF50' : result.jaundiceRisk === 'MEDIUM' ? '#FF9800' : '#F44336';
    const jBg = result.jaundiceRisk === 'LOW' ? '#E8F5E9' : result.jaundiceRisk === 'MEDIUM' ? '#FFF3E0' : '#FFEBEE';
    const jLabel = result.jaundiceRisk === 'LOW' ? t('visionScan.lowRisk')
      : result.jaundiceRisk === 'MEDIUM' ? t('visionScan.monitor')
      : t('visionScan.referPHC');

    const isLBW = result.estimatedWeightKg.max < 2.5;
    const wColor = isLBW ? '#F44336' : '#4CAF50';
    const wLabel = isLBW ? t('visionScan.lbw') : t('visionScan.normalWeight');

    const nColor = result.nutritionStatus === 'NORMAL' ? '#4CAF50' : result.nutritionStatus === 'MAM' ? '#FF9800' : '#F44336';
    const nLabel = result.nutritionStatus === 'NORMAL' ? t('visionScan.healthy')
      : result.nutritionStatus === 'MAM' ? t('visionScan.mam')
      : t('visionScan.sam');

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.resultTitle}>{t('visionScan.resultsTitle')}</Text>

          {/* Card 1: Jaundice */}
          <View style={styles.resultCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>🟡</Text>
              <Text style={styles.cardTitle}>{t('visionScan.jaundiceTitle')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: jBg }]}>
              <Text style={[styles.badgeText, { color: jColor }]}>{jLabel}</Text>
            </View>
            {result.jaundiceRisk === 'HIGH' && (
              <Text style={styles.alertNote}>{t('visionScan.jaundiceAlert')}</Text>
            )}
          </View>

          {/* Card 2: Weight Estimate */}
          <View style={styles.resultCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>⚖️</Text>
              <Text style={styles.cardTitle}>{t('visionScan.weightTitle')}</Text>
            </View>
            <Text style={styles.weightRange}>
              {result.estimatedWeightKg.min.toFixed(1)} – {result.estimatedWeightKg.max.toFixed(1)} kg
            </Text>
            <View style={[styles.badge, { backgroundColor: isLBW ? '#FFEBEE' : '#E8F5E9' }]}>
              <Text style={[styles.badgeText, { color: wColor }]}>{wLabel}</Text>
            </View>
            <Text style={styles.noteText}>{t('visionScan.weightNote')}</Text>
          </View>

          {/* Card 3: Nutrition */}
          <View style={styles.resultCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>📊</Text>
              <Text style={styles.cardTitle}>{t('visionScan.nutritionTitle')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: result.nutritionStatus === 'NORMAL' ? '#E8F5E9' : result.nutritionStatus === 'MAM' ? '#FFF3E0' : '#FFEBEE' }]}>
              <Text style={[styles.badgeText, { color: nColor }]}>{nLabel}</Text>
            </View>
          </View>

          {/* Confidence */}
          <Text style={styles.confText}>{t('visionScan.confidence')} {Math.round(result.confidence * 100)}%</Text>

          {/* Buttons */}
          <TouchableOpacity style={styles.saveBtn} onPress={saveResults}>
            <Text style={styles.saveBtnText}>{t('visionScan.saveResults')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanAgainBtn} onPress={() => { setResult(null); setPhotoUri(null); setState('instructions'); }}>
            <Text style={styles.scanAgainBtnText}>{t('visionScan.scanAgain')}</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>{result.analysisNote}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },

  // ── Instructions
  instrScroll: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E65100', textAlign: 'center', marginBottom: 24, marginTop: 16 },
  cardRow: { paddingBottom: 16, gap: 14 },
  instrCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, width: 240,
    elevation: 3, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  instrEmoji: { fontSize: 36, marginBottom: 10 },
  instrText: { fontSize: 15, color: '#424242', textAlign: 'center', fontWeight: '600', marginBottom: 6 },
  instrHindi: { fontSize: 13, color: '#757575', textAlign: 'center' },
  openCamBtn: {
    backgroundColor: '#C2185B', borderRadius: 14, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 28, elevation: 3,
  },
  openCamBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pickBtn: {
    borderWidth: 2, borderColor: '#C2185B', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 14,
  },
  pickBtnText: { color: '#C2185B', fontSize: 16, fontWeight: 'bold' },

  // ── Camera
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frameBorder: {
    width: FRAME_W, height: FRAME_H, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  frameText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  frameTextHindi: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
  camControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 20, paddingHorizontal: 32,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

  // ── Preview
  previewImage: { width: '100%', height: SCREEN_H * 0.5 },
  previewButtons: { padding: 24, flex: 1, justifyContent: 'center' },
  useBtn: {
    backgroundColor: '#C2185B', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', elevation: 3, marginBottom: 14,
  },
  useBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  retakeBtn: {
    borderWidth: 1.5, borderColor: '#BDBDBD', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  retakeBtnText: { color: '#757575', fontSize: 16, fontWeight: '600' },

  // ── Analysing
  analysingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  thumbImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 24, borderWidth: 3, borderColor: '#FFD54F' },
  analysingTitle: { fontSize: 20, fontWeight: 'bold', color: '#E65100', marginBottom: 28 },
  stepsContainer: { width: '100%', paddingHorizontal: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  stepText: { fontSize: 15, color: '#757575', marginLeft: 12, fontWeight: '500' },
  stepDone: { color: '#424242' },

  // ── Results
  resultScroll: { padding: 24, paddingBottom: 40 },
  resultTitle: { fontSize: 22, fontWeight: 'bold', color: '#E65100', textAlign: 'center', marginBottom: 20 },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardEmoji: { fontSize: 24, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#424242', flex: 1 },
  badge: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  badgeText: { fontSize: 14, fontWeight: 'bold' },
  alertNote: { fontSize: 13, color: '#C62828', marginTop: 10, lineHeight: 20, fontWeight: '500' },
  weightRange: { fontSize: 28, fontWeight: 'bold', color: '#212121', marginBottom: 10 },
  noteText: { fontSize: 12, color: '#9E9E9E', marginTop: 8, fontStyle: 'italic' },
  confText: { fontSize: 13, color: '#9E9E9E', textAlign: 'center', marginBottom: 20 },
  saveBtn: {
    backgroundColor: '#C2185B', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', elevation: 3, marginBottom: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scanAgainBtn: {
    borderWidth: 1.5, borderColor: '#BDBDBD', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  scanAgainBtnText: { color: '#757575', fontSize: 16, fontWeight: '600' },
  disclaimerText: { fontSize: 11, color: '#BDBDBD', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
});

export default VisionScanScreen;