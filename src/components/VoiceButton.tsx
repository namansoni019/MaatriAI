import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Alert, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { speak } from '../services/voiceService';

export interface VoiceButtonProps {
  onResult: (transcript: string) => void;
  language?: string;
  promptText?: string;
  size?: 'small' | 'large';
  disabled?: boolean;
}

type VoiceState = 'idle' | 'speaking' | 'listening' | 'processing' | 'done';

const VoiceButton: React.FC<VoiceButtonProps> = ({
  onResult,
  language = 'hi-IN',
  promptText,
  size = 'large',
  disabled = false
}) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setTranscript(e.value[0]);
        setState('done');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      Alert.alert('Speech Not Recognized', 'Could not understand. Please try again.');
      setState('idle');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    return () => {
      if (NativeModules.Voice) {
        Voice.destroy().then(Voice.removeAllListeners);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [state]);

  const handlePress = async () => {
    if (disabled) return;

    if (state === 'idle') {
      setTranscript('');
      if (promptText) {
        setState('speaking');
        await speak(promptText, language);
      }
      
      setState('listening');
      try {
        if (!NativeModules.Voice) {
          Alert.alert('Expo Go', 'Voice recognition requires a custom dev build and does not work in Expo Go. Please type your answer instead.');
          setState('idle');
          return;
        }

        await Voice.start(language);
        
        // Auto stop after 8 seconds
        timeoutRef.current = setTimeout(() => {
          setState((currentState) => {
            if (currentState === 'listening') {
              Voice.stop();
              return 'processing';
            }
            return currentState;
          });
        }, 8000);
      } catch (e) {
        console.error(e);
        setState('idle');
      }
    } else if (state === 'listening') {
      try {
        if (NativeModules.Voice) await Voice.stop();
        setState('processing');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } catch (e) {
        console.error(e);
        setState('idle');
      }
    }
  };

  const handleAccept = () => {
    onResult(transcript);
    setState('idle');
  };

  const handleReject = () => {
    setState('idle');
    setTranscript('');
  };

  // UI mapping
  let bgColor = '#C2185B';
  let iconName: keyof typeof Ionicons.glyphMap = 'mic';
  let statusText = 'बोलने के लिए दबाएं\nTap to speak';

  if (state === 'speaking') {
    bgColor = '#7B1FA2';
    iconName = 'volume-high';
    statusText = 'सुनिए...\nPlease listen...';
  } else if (state === 'listening') {
    bgColor = '#C2185B';
    iconName = 'mic';
    statusText = 'बोलिए...\nSpeak now...';
  } else if (state === 'processing') {
    bgColor = '#9E9E9E';
    iconName = 'mic'; // Hidden by loader anyway
    statusText = 'समझ रहा हूं...\nProcessing...';
  } else if (state === 'done') {
    bgColor = '#4CAF50';
    iconName = 'checkmark';
    statusText = '';
  }

  const isSmall = size === 'small';
  const buttonSize = isSmall ? 50 : 80;
  const iconSize = isSmall ? 24 : 32;

  const renderButton = () => (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[
          styles.circleBtn, 
          { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2, backgroundColor: disabled ? '#E0E0E0' : bgColor }
        ]}
        onPress={handlePress}
        disabled={disabled || state === 'processing' || state === 'done'}
      >
        {state === 'processing' ? (
          <ActivityIndicator color="#fff" size={isSmall ? "small" : "large"} />
        ) : (
          <Ionicons name={iconName} size={iconSize} color="#fff" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  if (isSmall) {
    return renderButton();
  }

  return (
    <View style={styles.largeContainer}>
      {renderButton()}
      
      {state !== 'done' && (
        <Text style={styles.statusText}>{statusText}</Text>
      )}

      {state === 'done' && (
        <View style={styles.doneContainer}>
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <Text style={styles.acceptText}>✓ यह सही है</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
              <Text style={styles.rejectText}>✗ फिर बोलें</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  largeContainer: {
    alignItems: 'center',
    padding: 20
  },
  circleBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4
  },
  statusText: {
    textAlign: 'center',
    color: '#757575',
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22
  },
  doneContainer: {
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 280
  },
  transcriptBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  transcriptText: {
    fontSize: 15,
    color: '#212121',
    textAlign: 'center'
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  acceptText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  rejectText: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 14
  }
});

export default VoiceButton;