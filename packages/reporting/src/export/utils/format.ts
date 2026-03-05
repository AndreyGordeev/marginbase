/**
 * Shared formatting utilities for report exports (PDF, XLSX)
 */

/**
 * Format minor units (cents) as currency string
 * @param minor - Amount in minor units (cents)
 * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'EUR')
 * @param locale - BCP 47 locale tag (e.g., 'en-US', 'de-DE')
 * @returns Formatted currency string
 */
export const formatCurrency = (minor: number, currencyCode: string, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(minor / 100);
};

/**
 * Format percentage value
 * @param value - Decimal number (0-1) or null
 * @param locale - BCP 47 locale tag
 * @returns Formatted percentage string or '—' if null
 */
export const formatPercentage = (value: number | null, locale: string): string => {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Convert minor units to decimal (for XLSX export)
 * @param minor - Amount in minor units (cents)
 * @returns Decimal amount
 */
export const minorToDecimal = (minor: number): number => minor / 100;

/**
 * Normalize percentage for storage/export
 * @param value - Decimal number (0-1) or null
 * @returns Decimal number or null
 */
export const normalizePercentage = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

/**
 * Indent text for hierarchical display in reports
 * @param value - Text to indent
 * @param indent - Number of spaces (default: 0)
 * @returns Indented text
 */
export const indentText = (value: string, indent = 0): string => `${' '.repeat(indent)}${value}`;
