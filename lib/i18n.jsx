"use client";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import pt from './locales/pt';
import de from './locales/de';
import it from './locales/it';
import nl from './locales/nl';
import ja from './locales/ja';
import zh from './locales/zh';

const locales = { en, es, fr, pt, de, it, nl, ja, zh };

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

const I18nContext = createContext(null);

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function detectLanguage() {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('vector_language');
  if (stored && locales[stored]) return stored;
  const supported = Object.keys(locales);
  for (const lang of (navigator.languages || [navigator.language])) {
    const code = lang?.split('-')[0]?.toLowerCase();
    if (supported.includes(code)) return code;
  }
  return 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    setLangState(detectLanguage());
  }, []);

  const setLang = useCallback((code) => {
    if (locales[code]) {
      setLangState(code);
      localStorage.setItem('vector_language', code);
    }
  }, []);

  const t = useCallback((key, params = {}) => {
    const str = getNestedValue(locales[lang], key) || getNestedValue(locales.en, key) || key;
    if (typeof str !== 'string') return key;
    return Object.entries(params).reduce(
      (result, [k, v]) => result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      str
    );
  }, [lang]);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components outside provider
    return {
      t: (key) => {
        const str = getNestedValue(locales.en, key);
        return typeof str === 'string' ? str : key;
      },
      lang: 'en',
      setLang: () => {},
    };
  }
  return ctx;
}
