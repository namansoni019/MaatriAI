import { useState, useEffect, useCallback } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import { NativeModules } from 'react-native';

export const useVoice = (language = 'hi-IN') => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setTranscript(e.value[0]);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
    };

    return () => {
      if (NativeModules.Voice) {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

  const startListening = useCallback(async (lang?: string) => {
    try {
      setTranscript('');
      if (NativeModules.Voice) await Voice.start(lang || language);
    } catch (e) {
      console.error('Error starting voice', e);
    }
  }, [language]);

  const stopListening = useCallback(async () => {
    try {
      if (NativeModules.Voice) await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error('Error stopping voice', e);
    }
  }, []);

  const speak = useCallback((text: string, lang?: string) => {
    return new Promise<void>((resolve) => {
      setIsSpeaking(true);
      Speech.speak(text, {
        language: lang || language,
        rate: 0.85,
        pitch: 1.0,
        onDone: () => {
          setIsSpeaking(false);
          resolve();
        },
        onError: () => {
          setIsSpeaking(false);
          resolve();
        }
      });
    });
  }, [language]);

  const reset = useCallback(() => {
    setTranscript('');
    setIsListening(false);
    setIsSpeaking(false);
    if (NativeModules.Voice) Voice.stop();
    Speech.stop();
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    speak,
    reset
  };
};
