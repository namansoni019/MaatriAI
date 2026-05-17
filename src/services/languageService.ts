import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';
import en from '../locales/en.json';
import ta from '../locales/ta.json';
import bn from '../locales/bn.json';
import te from '../locales/te.json';

const LANGUAGE_KEY = 'preferred_language';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ta: { translation: ta },
      bn: { translation: bn },
      te: { translation: te },
    },
    lng: 'hi', // Default language
    fallbackLng: 'hi',
    interpolation: { escapeValue: false },
  });

export const loadSavedLanguage = async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved) {
      await i18n.changeLanguage(saved);
    }
  } catch (e) {
    console.error('Failed to load language', e);
  }
};

export const changeLanguage = async (code: string) => {
  try {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem(LANGUAGE_KEY, code);
  } catch (e) {
    console.error('Failed to save language', e);
  }
};

export const getCurrentLanguage = () => i18n.language;

export const speakTranslation = async (key: string) => {
  const text = i18n.t(key);
  try {
    const Speech = await import('expo-speech');
    Speech.speak(text, { language: getCurrentLanguage() + '-IN', rate: 0.85 });
  } catch (e) {
    console.error('Failed to speak translation', e);
  }
};

export default i18n;