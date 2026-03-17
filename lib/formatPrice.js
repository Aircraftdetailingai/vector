import { getUserCurrencySymbol } from './currency';

// Centralized price formatting with thousand separators

/**
 * Get the user's currency symbol (client-side only, falls back to $).
 */
function sym() {
  try { return getUserCurrencySymbol(); } catch { return '$'; }
}

/**
 * Format a number as currency with thousand separators and 2 decimal places.
 * e.g. 1234.5 → "$1,234.50"  (or "€1,234.50" etc.)
 */
export function formatPrice(amount) {
  const num = Math.round(parseFloat(amount) || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Format a number as currency with thousand separators, no decimals.
 * e.g. 1234.5 → "1,235"
 */
export function formatPriceWhole(amount) {
  const num = parseFloat(amount) || 0;
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Get the currency symbol for display. Use this instead of hardcoding '$'.
 * Returns the user's preferred currency symbol from localStorage.
 */
export function currencySymbol() {
  return sym();
}
