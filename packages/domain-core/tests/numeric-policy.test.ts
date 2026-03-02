import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  ROUNDING_POLICY,
  addMoney,
  divideMoney,
  formatMinorUnitsToMajorString,
  multiplyMoneyByQuantity,
  parseMajorToMinorUnits,
  roundWithRule,
  subtractMoney,
  toMinorUnits
} from '../src';

describe('numeric policy', () => {
  it('validates minor units as integers', () => {
    expect(toMinorUnits(1500)).toBe(1500);
    expect(() => toMinorUnits(15.2)).toThrowError(/integer in minor units/i);
  });

  it('parses major units to minor units with explicit half-up rounding', () => {
    expect(parseMajorToMinorUnits('10.005')).toBe(1001);
    expect(parseMajorToMinorUnits('10.004')).toBe(1000);
  });

  it('formats minor units to major string', () => {
    expect(formatMinorUnitsToMajorString(1005)).toBe('10.05');
  });

  it('handles money arithmetic without floating-point math', () => {
    expect(addMoney(100, 250, 50).toString()).toBe('400');
    expect(subtractMoney(1000, 755).toString()).toBe('245');
    expect(multiplyMoneyByQuantity(199, 3).toString()).toBe('597');
    expect(divideMoney(1000, 8)?.toString()).toBe('125');
    expect(divideMoney(1000, 0)).toBeNull();
  });

  it('uses centralized rounding policy for boundaries', () => {
    const value = new Decimal('1.005');
    const rounded = roundWithRule(value, { decimalPlaces: 2, mode: ROUNDING_POLICY.ratioDisplay.mode });
    expect(rounded.toString()).toBe('1.01');
  });
});
