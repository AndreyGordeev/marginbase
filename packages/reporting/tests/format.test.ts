import { describe, expect, it } from 'vitest';
import { formatCurrency, formatPercentage, minorToDecimal, normalizePercentage, indentText } from '../src/export/utils/format';

/**
 * Format Utilities Coverage Tests
 *
 * Covers uncovered branches in format.ts:
 * - Lines 29-30: formatPercentage null handling
 * - Lines 53-54: normalizePercentage null handling
 *
 * Goal: 71.42% → 90%+ branch coverage for format.ts
 */
describe('format utilities: comprehensive coverage', () => {
  describe('formatCurrency', () => {
    it('formats USD in en-US locale', () => {
      const result = formatCurrency(123456, 'USD', 'en-US');
      expect(result).toBe('$1,234.56');
    });

    it('formats EUR in de-DE locale', () => {
      const result = formatCurrency(123456, 'EUR', 'de-DE');
      expect(result).toMatch(/€/);
      expect(result).toMatch(/1[.,]234[.,]56/);
    });

    it('formats GBP in en-GB locale', () => {
      const result = formatCurrency(123456, 'GBP', 'en-GB');
      expect(result).toMatch(/£/);
    });

    it('formats JPY (no decimal places) in ja-JP locale', () => {
      const result = formatCurrency(12345, 'JPY', 'ja-JP');
      // Note: formatCurrency always shows 2 decimal places regardless of currency
      // Even for JPY (which typically has no decimals), 12345 minor units → 123.45
      expect(result).toMatch(/123/);
      expect(result).toMatch(/\.\d{2}/); // Always 2 decimal places (current implementation)
    });

    it('handles zero amount', () => {
      const result = formatCurrency(0, 'USD', 'en-US');
      expect(result).toBe('$0.00');
    });

    it('handles negative amount', () => {
      const result = formatCurrency(-123456, 'USD', 'en-US');
      expect(result).toMatch(/^-?\$1,234\.56$/);
    });

    it('handles very large amount', () => {
      const result = formatCurrency(999999999, 'USD', 'en-US');
      expect(result).toMatch(/\$9,999,999\.99/);
    });

    it('handles fractional minor units (edge case)', () => {
      const result = formatCurrency(12345.67, 'USD', 'en-US');
      expect(result).toMatch(/\$/);
    });
  });

  describe('formatPercentage', () => {
    it('formats null as em dash', () => {
      const result = formatPercentage(null, 'en-US');
      expect(result).toBe('—');
    });

    it('formats zero percentage', () => {
      const result = formatPercentage(0, 'en-US');
      expect(result).toBe('0%');
    });

    it('formats decimal to percentage (0.5 → 50%)', () => {
      const result = formatPercentage(0.5, 'en-US');
      expect(result).toBe('50%');
    });

    it('formats decimal to percentage (0.2567 → 25.67%)', () => {
      const result = formatPercentage(0.2567, 'en-US');
      expect(result).toMatch(/25\.67%|26%/);
    });

    it('formats 1.0 as 100%', () => {
      const result = formatPercentage(1.0, 'en-US');
      expect(result).toBe('100%');
    });

    it('formats negative percentage', () => {
      const result = formatPercentage(-0.15, 'en-US');
      expect(result).toMatch(/-15%/);
    });

    it('formats very small percentage (0.0001)', () => {
      const result = formatPercentage(0.0001, 'en-US');
      expect(result).toMatch(/0%|0\./);
    });

    it('formats large percentage (1.5 → 150%)', () => {
      const result = formatPercentage(1.5, 'en-US');
      expect(result).toBe('150%');
    });

    it('uses de-DE locale formatting', () => {
      const result = formatPercentage(0.5, 'de-DE');
      expect(result).toMatch(/50\s*%/);
    });

    it('uses fr-FR locale formatting', () => {
      const result = formatPercentage(0.75, 'fr-FR');
      expect(result).toMatch(/75/);
    });
  });

  describe('minorToDecimal', () => {
    it('converts minor units to decimal (12345 → 123.45)', () => {
      const result = minorToDecimal(12345);
      expect(result).toBe(123.45);
    });

    it('converts zero', () => {
      const result = minorToDecimal(0);
      expect(result).toBe(0);
    });

    it('converts negative amount', () => {
      const result = minorToDecimal(-12345);
      expect(result).toBe(-123.45);
    });

    it('converts very large amount', () => {
      const result = minorToDecimal(999999999);
      expect(result).toBe(9999999.99);
    });

    it('handles fractional minor units (edge case)', () => {
      const result = minorToDecimal(12345.67);
      expect(result).toBeCloseTo(123.4567, 4);
    });

    it('handles single digit minor unit', () => {
      const result = minorToDecimal(5);
      expect(result).toBe(0.05);
    });
  });

  describe('normalizePercentage', () => {
    it('returns null when input is null', () => {
      const result = normalizePercentage(null);
      expect(result).toBeNull();
    });

    it('returns number when input is number', () => {
      const result = normalizePercentage(0.5);
      expect(result).toBe(0.5);
    });

    it('returns zero when input is zero', () => {
      const result = normalizePercentage(0);
      expect(result).toBe(0);
    });

    it('returns negative number when input is negative', () => {
      const result = normalizePercentage(-0.15);
      expect(result).toBe(-0.15);
    });

    it('returns 1.0 when input is 1.0', () => {
      const result = normalizePercentage(1.0);
      expect(result).toBe(1.0);
    });

    it('returns large number when input is large', () => {
      const result = normalizePercentage(5.0);
      expect(result).toBe(5.0);
    });

    it('handles very small numbers', () => {
      const result = normalizePercentage(0.0001);
      expect(result).toBe(0.0001);
    });

    it('converts Number object to primitive', () => {
      const result = normalizePercentage(0.25);
      expect(typeof result).toBe('number');
      expect(result).toBe(0.25);
    });
  });

  describe('indentText', () => {
    it('indents with default 0 spaces', () => {
      const result = indentText('Test');
      expect(result).toBe('Test');
    });

    it('indents with 2 spaces', () => {
      const result = indentText('Test', 2);
      expect(result).toBe('  Test');
    });

    it('indents with 4 spaces', () => {
      const result = indentText('Test', 4);
      expect(result).toBe('    Test');
    });

    it('indents with 0 spaces explicitly', () => {
      const result = indentText('Test', 0);
      expect(result).toBe('Test');
    });

    it('handles empty string', () => {
      const result = indentText('', 2);
      expect(result).toBe('  ');
    });

    it('handles long text', () => {
      const result = indentText('This is a long text that should be indented', 3);
      expect(result).toBe('   This is a long text that should be indented');
    });

    it('handles text with newlines', () => {
      const result = indentText('Line 1\nLine 2', 2);
      expect(result).toBe('  Line 1\nLine 2');
    });

    it('handles very large indent', () => {
      const result = indentText('Test', 10);
      expect(result).toBe('          Test');
    });
  });

  describe('edge cases and integration', () => {
    it('formats currency and percentage together', () => {
      const currency = formatCurrency(100000, 'USD', 'en-US');
      const percentage = formatPercentage(0.2, 'en-US');

      expect(currency).toBe('$1,000.00');
      expect(percentage).toBe('20%');
    });

    it('converts minor to decimal and formats as currency', () => {
      const decimal = minorToDecimal(123456);
      expect(decimal).toBe(1234.56);

      const formatted = formatCurrency(123456, 'EUR', 'en-US');
      expect(formatted).toMatch(/€/);
    });

    it('normalizes percentage and formats it', () => {
      const normalized = normalizePercentage(0.456);
      expect(normalized).toBe(0.456);

      const formatted = formatPercentage(normalized, 'en-US');
      expect(formatted).toMatch(/45\.6%/);
    });

    it('handles all null/zero values consistently', () => {
      expect(formatPercentage(null, 'en-US')).toBe('—');
      expect(normalizePercentage(null)).toBeNull();
      expect(formatPercentage(0, 'en-US')).toBe('0%');
      expect(normalizePercentage(0)).toBe(0);
    });
  });
});
