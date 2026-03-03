import { describe, expect, it } from 'vitest';
import { formatMoneyFromMinor, formatPct, formatSignedMoneyFromMinor } from './formatters';

describe('formatters', () => {
  it('formats money from minor units to major units', () => {
    expect(formatMoneyFromMinor(785, 'EUR')).toContain('7');
    expect(formatMoneyFromMinor(785, 'EUR')).toContain('85');
  });

  it('formats percent with rounding up to 2 decimals', () => {
    expect(formatPct('0.123456', 2)).toContain('12.35');
  });

  it('formats negative values for money and percent', () => {
    expect(formatMoneyFromMinor(-1234, 'USD')).toContain('12.34');
    expect(formatPct(-0.125, 2)).toContain('-12.5');
  });

  it('formats signed positive money with plus sign', () => {
    expect(formatSignedMoneyFromMinor(500, 'EUR')).toContain('+');
  });
});
