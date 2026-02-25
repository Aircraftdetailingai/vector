export const languages = {
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Español', flag: '🇪🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  pt: { name: 'Português', flag: '🇧🇷' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  nl: { name: 'Nederlands', flag: '🇳🇱' },
  ja: { name: '日本語', flag: '🇯🇵' },
  zh: { name: '中文', flag: '🇨🇳' },
};

export function t(key, lang = 'en', translations) {
  const keys = key.split('.');
  let value = translations[lang];
  for (const k of keys) {
    value = value?.[k];
  }
  if (value !== undefined) return value;
  let fallback = translations['en'];
  for (const k of keys) {
    fallback = fallback?.[k];
  }
  return fallback || key;
}

export { LanguageProvider as I18nProvider, useTranslation, LANGUAGES } from './useTranslation';
