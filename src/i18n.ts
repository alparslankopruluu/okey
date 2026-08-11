import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en.json';
import tr from './translations/tr.json';

const initialLanguage = Localization.getLocales()[0].languageCode === 'tr' ? 'tr' : 'en';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: initialLanguage,
  fallbackLng: 'en',
  resources: { en: { translation: en }, tr: { translation: tr } },
  interpolation: { escapeValue: false },
});

export { i18n };
