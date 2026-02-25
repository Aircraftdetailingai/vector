// Currency symbols and formatting config
export const CURRENCY_MAP = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', locale: 'en-US' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', locale: 'en-GB' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar', locale: 'en-AU' },
  NZD: { symbol: 'NZ$', code: 'NZD', name: 'New Zealand Dollar', locale: 'en-NZ' },
  CHF: { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen', locale: 'ja-JP' },
  SGD: { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar', locale: 'en-SG' },
  HKD: { symbol: 'HK$', code: 'HKD', name: 'Hong Kong Dollar', locale: 'en-HK' },
  MXN: { symbol: 'MX$', code: 'MXN', name: 'Mexican Peso', locale: 'es-MX' },
  BRL: { symbol: 'R$', code: 'BRL', name: 'Brazilian Real', locale: 'pt-BR' },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', locale: 'en-IN' },
  AED: { symbol: 'د.إ', code: 'AED', name: 'UAE Dirham', locale: 'ar-AE' },
  ZAR: { symbol: 'R', code: 'ZAR', name: 'South African Rand', locale: 'en-ZA' },
  SEK: { symbol: 'kr', code: 'SEK', name: 'Swedish Krona', locale: 'sv-SE' },
  NOK: { symbol: 'kr', code: 'NOK', name: 'Norwegian Krone', locale: 'nb-NO' },
  DKK: { symbol: 'kr', code: 'DKK', name: 'Danish Krone', locale: 'da-DK' },
  PLN: { symbol: 'zł', code: 'PLN', name: 'Polish Złoty', locale: 'pl-PL' },
  CZK: { symbol: 'Kč', code: 'CZK', name: 'Czech Koruna', locale: 'cs-CZ' },
};

const STORAGE_KEY = 'vector_currency';

/**
 * Get the user's saved currency code from localStorage.
 * Falls back to 'USD'.
 */
export function getUserCurrency() {
  if (typeof window === 'undefined') return 'USD';
  try {
    return localStorage.getItem(STORAGE_KEY) || 'USD';
  } catch {
    return 'USD';
  }
}

/**
 * Save currency code to localStorage.
 */
export function setUserCurrency(code) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

/**
 * Get the symbol for a currency code.
 */
export function getCurrencySymbol(code) {
  return CURRENCY_MAP[code]?.symbol || '$';
}

/**
 * Get the symbol for the user's saved currency.
 */
export function getUserCurrencySymbol() {
  return getCurrencySymbol(getUserCurrency());
}
