import { describe, expect, it } from 'vitest';
import { calculateProfit } from '../src';

describe('calculateProfit', () => {
  it('calculates metrics in unit mode', () => {
    const result = calculateProfit({
      mode: 'unit',
      unitPriceMinor: 2000,
      quantity: 100,
      variableCostPerUnitMinor: 1200,
      fixedCostsMinor: 30000,
      additionalVariableCostsMinor: 5000
    });

    expect(result.revenueTotalMinor.toString()).toBe('200000');
    expect(result.variableCostTotalMinor.toString()).toBe('125000');
    expect(result.grossProfitMinor.toString()).toBe('75000');
    expect(result.netProfitMinor.toString()).toBe('45000');
    expect(result.contributionMarginPct?.toString()).toBe('0.375');
    expect(result.netProfitPct?.toString()).toBe('0.225');
    expect(result.markupPct?.toString()).toBe('0.66666666666666666667');
    expect(result.warnings).toEqual([]);
  });

  it('supports revenue mode with total variable costs override', () => {
    const result = calculateProfit({
      mode: 'revenue',
      totalRevenueMinor: 100000,
      fixedCostsMinor: 20000,
      totalVariableCostsMinor: 70000
    });

    expect(result.revenueTotalMinor.toString()).toBe('100000');
    expect(result.variableCostTotalMinor.toString()).toBe('70000');
    expect(result.netProfitMinor.toString()).toBe('10000');
    expect(result.markupPct).toBeNull();
  });

  it('emits warning for insufficient TVC data in revenue mode', () => {
    const result = calculateProfit({
      mode: 'revenue',
      totalRevenueMinor: 50000,
      fixedCostsMinor: 2000
    });

    expect(result.warnings).toContain('INSUFFICIENT_DATA_TVC');
    expect(result.variableCostTotalMinor.toString()).toBe('0');
  });

  it('emits R_ZERO warning when revenue is zero', () => {
    const result = calculateProfit({
      mode: 'unit',
      unitPriceMinor: 0,
      quantity: 10,
      variableCostPerUnitMinor: 0,
      fixedCostsMinor: 100
    });

    expect(result.contributionMarginPct).toBeNull();
    expect(result.netProfitPct).toBeNull();
    expect(result.warnings).toContain('R_ZERO');
    expect(result.warnings).toContain('V_ZERO');
  });
});
