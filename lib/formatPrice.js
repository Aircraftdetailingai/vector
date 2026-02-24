// Centralized price formatting with thousand separators

/**
 * Format a number as currency with thousand separators and 2 decimal places.
 * e.g. 1234.5 → "1,234.50"
 */
export function formatPrice(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format a number as currency with thousand separators, no decimals.
 * e.g. 1234.5 → "1,235"
 */
export function formatPriceWhole(amount) {
  const num = parseFloat(amount) || 0;
  return Math.round(num).toLocaleString('en-US');
}
