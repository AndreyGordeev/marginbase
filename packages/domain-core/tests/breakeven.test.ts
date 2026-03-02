import { describe, expect, it } from 'vitest';
import { calculateBreakEven } from '../src';

describe('calculateBreakEven', () => {
  it('calculates break-even and target-profit metrics', () => {
    const result = calculateBreakEven({
      unitPriceMinor: 2500,
      variableCostPerUnitMinor: 1000,
      fixedCostsMinor: 90000,
      targetProfitMinor: 30000,
      plannedQuantity: 90
    });

    expect(result.unitContributionMinor.toString()).toBe('1500');
    expect(result.breakEvenQuantity?.toString()).toBe('60');
    expect(result.breakEvenRevenueMinor?.toString()).toBe('150000');
    expect(result.requiredQuantityForTargetProfit?.toString()).toBe('80');
    expect(result.requiredRevenueForTargetProfitMinor?.toString()).toBe('200000');
    expect(result.marginOfSafetyUnits?.toString()).toBe('30');
    expect(result.marginOfSafetyPct?.toString()).toBe('0.33333333333333333333');
    expect(result.warnings).toEqual([]);
  });

  it('handles non-positive contribution with warnings', () => {
    const result = calculateBreakEven({
      unitPriceMinor: 1000,
      variableCostPerUnitMinor: 1000,
      fixedCostsMinor: 50000,
      targetProfitMinor: 10000
    });

    expect(result.breakEvenQuantity).toBeNull();
    expect(result.breakEvenRevenueMinor).toBeNull();
    expect(result.requiredQuantityForTargetProfit).toBeNull();
    expect(result.requiredRevenueForTargetProfitMinor).toBeNull();
    expect(result.warnings).toContain('UC_NON_POSITIVE');
  });

  it('resolves planned quantity from planned revenue', () => {
    const result = calculateBreakEven({
      unitPriceMinor: 2000,
      variableCostPerUnitMinor: 1200,
      fixedCostsMinor: 16000,
      plannedRevenueMinor: 100000
    });

    expect(result.plannedQuantityResolved?.toString()).toBe('50');
  });

  it('warns when planned revenue is provided but price is zero', () => {
    const result = calculateBreakEven({
      unitPriceMinor: 0,
      variableCostPerUnitMinor: 0,
      fixedCostsMinor: 0,
      plannedRevenueMinor: 10000
    });

    expect(result.plannedQuantityResolved).toBeNull();
    expect(result.warnings).toContain('P_ZERO_PLANNED_REVENUE');
  });
});
