import * as Speech from 'expo-speech';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { NativeModules } from 'react-native';

export const speak = (text: string, language?: string): Promise<void> => {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: language || 'hi-IN',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
};

export const startListening = (language?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      Voice.onSpeechError = (e: SpeechErrorEvent) => {
        reject(e.error);
      };
      if (NativeModules.Voice) Voice.start(language || 'hi-IN');
      // Resolve immediately as start() is requested
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

export const stopListening = async (): Promise<void> => {
  try {
    if (NativeModules.Voice) await Voice.stop();
  } catch (e) {
    console.error('Error stopping voice', e);
  }
};

export const speakThenListen = async (text: string, language?: string): Promise<string> => {
  await speak(text, language);
  
  // Wait 500ms
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return new Promise(async (resolve, reject) => {
    try {
      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          resolve(e.value[0]);
        } else {
          resolve('');
        }
      };
      Voice.onSpeechError = (e: SpeechErrorEvent) => {
        reject(e.error);
      };
      if (NativeModules.Voice) {
        await Voice.start(language || 'hi-IN');
      } else {
        resolve('');
      }
    } catch (e) {
      reject(e);
    }
  });
};

export const isAvailable = async (): Promise<boolean> => {
  try {
    if (!NativeModules.Voice) return false;
    const services = await Voice.getSpeechRecognitionServices();
    return services && services.length > 0;
  } catch (e) {
    return false;
  }
};