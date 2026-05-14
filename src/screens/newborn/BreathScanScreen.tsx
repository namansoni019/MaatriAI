import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Animated, Easing, Alert, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speak } from '../../services/voiceService';
import { analyseBreath, BreathResult } from '../../ai/breathAnalyser';
import { saveBreathScan } from '../../database/breathScanRepository';
import { useTranslation } from 'react-i18next';

type ScanState = 'instructions' | 'ready' | 'recording' | 'analysing' | 'result';

const BreathScanScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const newbornId = route.params?.newbornId;

  const [state, setState] = useState<ScanState>('instructions');
  const [countdown, setCountdown] = useState(30);
  const [result, setResult] = useState<BreathResult | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Waveform animation refs (12 bars)
  const barAnims = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(15))
  ).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopRecording();
    };
  }, []);

  // Speak alert on abnormal result
  useEffect(() => {
    if (state === 'result' && result?.status === 'ABNORMAL') {
      speak(t('breathScan.audioAlert'));
    }
  }, [state, result]);

  // ── Waveform animation
  useEffect(() => {
    if (state !== 'recording') return;

    const animations = barAnims.map((anim) => {
      const animate = () => {
        const targetHeight = 10 + Math.random() * 50;
        const duration = 200 + Math.random() * 300;
        Animated.timing(anim, {
          toValue: targetHeight,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }).start(() => {
          if (state === 'recording') animate();
        });
      };
      animate();
      return anim;
    });

    return () => {
      animations.forEach((a) => a.stopAnimation());
    };
  }, [state]);

  // ── Start Recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed for breath scanning.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      setState('recording');
      setCountdown(30);

      // Countdown timer
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-stop after 30 seconds
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 30000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  // ── Stop Recording
  const stopRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }

    try {
      if (recordingRef.current) {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        if (uri) {
          setAudioUri(uri);
          setState('analysing');

          // Run analysis
          const analysisResult = await analyseBreath(uri);
          setResult(analysisResult);
          setState('result');
        }
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setState('ready');
    }
  };

  // ── Save Result
  const saveResult = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('maatri_session');
      const session = sessionStr ? JSON.parse(sessionStr) : {};
      const ashaId = session.odId || 'unknown';

      if (result && audioUri) {
        await saveBreathScan({
          motherId: newbornId || 'unknown',
          ashaId,
          status: result.status,
          confidence: result.confidence,
          probabilityNormal: result.probabilityNormal,
          probabilityAbnormal: result.probabilityAbnormal,
          analysisNote: result.analysisNote,
          audioUri,
        });
      }

      Alert.alert('Saved! / सहेजा गया!', 'Breath scan result saved successfully.\nसांस जांच का परिणाम सहेजा गया।', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      console.error('Error saving breath scan:', e);
      Alert.alert('Error', 'Could not save result. Please try again.');
    }
  };

  // ── Render: Instructions
  if (state === 'instructions') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.instructionsScroll}>
          <Text style={styles.babyIcon}>🍼</Text>
          <Text style={styles.title}>{t('breathScan.title')}</Text>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionEmoji}>📱</Text>
            <Text style={styles.instructionText}>{t('breathScan.instr1')}</Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionEmoji}>🤫</Text>
            <Text style={styles.instructionText}>{t('breathScan.instr2')}</Text>
          </View>

          <View style={styles.instructionCard}>
            <Text style={styles.instructionEmoji}>⏱️</Text>
            <Text style={styles.instructionText}>{t('breathScan.instr3')}</Text>
          </View>

          <TouchableOpacity style={styles.readyBtn} onPress={() => setState('ready')}>
            <Text style={styles.readyBtnText}>{t('breathScan.readyBtn')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Ready
  if (state === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.readyContainer}>
          <TouchableOpacity style={styles.micButton} onPress={startRecording}>
            <Ionicons name="mic" size={48} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.tapText}>{t('breathScan.tapStart')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Recording
  if (state === 'recording') {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.recordingContainer}>
          <Text style={styles.countdown}>{timeStr}</Text>

          <View style={styles.waveformContainer}>
            {barAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[styles.waveBar, { height: anim }]}
              />
            ))}
          </View>

          <Text style={styles.recordingText}>{t('breathScan.recording')}</Text>

          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <Text style={styles.stopBtnText}>{t('breathScan.stopEarly')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Analysing
  if (state === 'analysing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analysingContainer}>
          <ActivityIndicator size="large" color="#C2185B" />
          <Text style={styles.analysingText}>{t('breathScan.analysing')}</Text>
          <Text style={styles.analysingNote}>{t('breathScan.analysingNote')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Result
  if (state === 'result' && result) {
    const isNormal = result.status === 'NORMAL';

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={[styles.resultCircle, { backgroundColor: isNormal ? '#E8F5E9' : '#FFEBEE' }]}>
            <Ionicons
              name={isNormal ? 'checkmark-circle' : 'warning'}
              size={80}
              color={isNormal ? '#4CAF50' : '#F44336'}
            />
          </View>

          <Text style={[styles.resultTitle, { color: isNormal ? '#2E7D32' : '#C62828' }]}>
            {isNormal ? t('breathScan.resultNormal') : t('breathScan.resultAbnormal')}
          </Text>

          <Text style={styles.resultDesc}>
            {isNormal
              ? t('breathScan.descNormal')
              : t('breathScan.descAbnormal')
            }
          </Text>

          <Text style={styles.confidenceText}>
            Confidence: {Math.round(result.confidence * 100)}%
          </Text>

          {isNormal ? (
            <>
              <TouchableOpacity style={styles.saveBtn} onPress={saveResult}>
                <Text style={styles.saveBtnText}>{t('breathScan.saveResult')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setResult(null); setState('ready'); }}>
                <Text style={styles.retryBtnText}>{t('breathScan.recordAgain')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.phcBtn}>
                <Text style={styles.phcBtnText}>{t('breathScan.goPhc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setResult(null); setState('ready'); }}>
                <Text style={styles.retryBtnText}>{t('breathScan.recordAgain')}</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.noteText}>{result.analysisNote}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCE4EC' },

  // ── Instructions
  instructionsScroll: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  babyIcon: { fontSize: 64, marginTop: 20, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#880E4F', textAlign: 'center', marginBottom: 28 },

  instructionCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%',
    marginBottom: 16, elevation: 2, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  instructionEmoji: { fontSize: 32, marginBottom: 8 },
  instructionText: { fontSize: 16, color: '#424242', textAlign: 'center', fontWeight: '600' },
  instructionHindi: { fontSize: 14, color: '#757575', textAlign: 'center', marginTop: 4 },

  readyBtn: {
    backgroundColor: '#C2185B', borderRadius: 14, paddingVertical: 18, paddingHorizontal: 40,
    marginTop: 20, width: '100%', alignItems: 'center', elevation: 3,
  },
  readyBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // ── Ready
  readyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  micButton: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#C2185B',
    justifyContent: 'center', alignItems: 'center', elevation: 8,
    shadowColor: '#C2185B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
  tapText: { fontSize: 18, color: '#880E4F', fontWeight: '600', marginTop: 28 },
  tapTextHindi: { fontSize: 16, color: '#AD1457', marginTop: 6 },

  // ── Recording
  recordingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  countdown: { fontSize: 56, fontWeight: 'bold', color: '#C2185B', fontVariant: ['tabular-nums'] },

  waveformContainer: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    height: 80, marginVertical: 30, gap: 6,
  },
  waveBar: {
    width: 8, borderRadius: 4, backgroundColor: '#C2185B',
  },

  recordingText: { fontSize: 16, color: '#880E4F', fontWeight: '600', marginBottom: 30 },
  stopBtn: {
    borderWidth: 1, borderColor: '#9E9E9E', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28,
  },
  stopBtnText: { color: '#757575', fontSize: 14 },

  // ── Analysing
  analysingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  analysingText: { fontSize: 18, color: '#880E4F', fontWeight: '600', marginTop: 24 },
  analysingHindi: { fontSize: 16, color: '#AD1457', marginTop: 4 },
  analysingNote: { fontSize: 13, color: '#9E9E9E', textAlign: 'center', marginTop: 20 },

  // ── Result
  resultScroll: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  resultCircle: {
    width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center',
    marginTop: 20, marginBottom: 20,
  },
  resultTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  resultTitleHindi: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  resultDesc: { fontSize: 15, color: '#424242', textAlign: 'center', marginTop: 16, lineHeight: 24 },
  confidenceText: { fontSize: 13, color: '#9E9E9E', marginTop: 12 },

  saveBtn: {
    backgroundColor: '#C2185B', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40,
    marginTop: 28, width: '100%', alignItems: 'center', elevation: 3,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  phcBtn: {
    backgroundColor: '#F44336', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40,
    marginTop: 28, width: '100%', alignItems: 'center', elevation: 3,
  },
  phcBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  retryBtn: {
    borderWidth: 1.5, borderColor: '#BDBDBD', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40,
    marginTop: 14, width: '100%', alignItems: 'center',
  },
  retryBtnText: { color: '#757575', fontSize: 16, fontWeight: '600' },

  noteText: { fontSize: 11, color: '#BDBDBD', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
});

export default BreathScanScreen;