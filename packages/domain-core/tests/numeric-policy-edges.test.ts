import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  assertNonNegativeInteger,
  assertNonNegativeMinorUnits,
  toMinorUnits
} from '../src';
import { nonNegativeDecimal } from '../src/numeric-policy';

describe('numeric policy: edge validations', () => {
  it('assertNonNegativeMinorUnits rejects negative values', () => {
    expect(() => assertNonNegativeMinorUnits(-1, 'amount')).toThrowError(/amount must be greater than or equal to 0/i);
  });

  it('assertNonNegativeMinorUnits keeps valid values unchanged', () => {
    expect(assertNonNegativeMinorUnits(0, 'amount')).toBe(0);
    expect(assertNonNegativeMinorUnits(1500, 'amount')).toBe(1500);
  });

  it('assertNonNegativeInteger rejects negative values', () => {
    expect(() => assertNonNegativeInteger(-1, 'quantity')).toThrowError(/quantity must be a safe integer greater than or equal to 0/i);
  });

  it('assertNonNegativeInteger rejects non-integer and non-finite values', () => {
    expect(() => assertNonNegativeInteger(1.2, 'quantity')).toThrowError(/safe integer/i);
    expect(() => assertNonNegativeInteger(Number.POSITIVE_INFINITY, 'quantity')).toThrowError(/safe integer/i);
  });

  it('assertNonNegativeInteger accepts 0 and safe integers', () => {
    expect(assertNonNegativeInteger(0, 'quantity')).toBe(0);
    expect(assertNonNegativeInteger(42, 'quantity')).toBe(42);
  });

  it('nonNegativeDecimal rejects negative values', () => {
    expect(() => nonNegativeDecimal(new Decimal(-0.0001), 'ratio')).toThrowError(/ratio must be greater than or equal to 0/i);
  });

  it('nonNegativeDecimal accepts zero and positive values', () => {
    expect(nonNegativeDecimal(0, 'ratio').toString()).toBe('0');
    expect(nonNegativeDecimal('1.2345', 'ratio').toString()).toBe('1.2345');
  });

  it('toMinorUnits keeps fieldName in thrown message', () => {
    expect(() => toMinorUnits(1.5, 'unitPriceMinor')).toThrowError(/unitPriceMinor must be a safe integer in minor units/i);
  });
});
