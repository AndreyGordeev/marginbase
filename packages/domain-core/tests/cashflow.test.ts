import { describe, expect, it } from 'vitest';
import { calculateCashflow } from '../src';

describe('calculateCashflow', () => {
  it('builds monthly projection and final balance', () => {
    const result = calculateCashflow({
      startingCashMinor: 100000,
      baseMonthlyRevenueMinor: 50000,
      monthlyGrowthRate: '0.10',
      fixedMonthlyCostsMinor: 20000,
      variableMonthlyCostsMinor: 5000,
      forecastMonths: 3
    });

    expect(result.monthlyProjection).toHaveLength(3);
    expect(result.monthlyProjection[0].revenueMinor.toString()).toBe('50000');
    expect(result.monthlyProjection[1].revenueMinor.toString()).toBe('55000');
    expect(result.monthlyProjection[2].revenueMinor.toString()).toBe('60500');
    expect(result.monthlyProjection[2].cashBalanceMinor.toString()).toBe('190500');
    expect(result.finalBalanceMinor.toString()).toBe('190500');
    expect(result.runwayMonth).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it('detects immediate negative runway', () => {
    const result = calculateCashflow({
      startingCashMinor: 0,
      baseMonthlyRevenueMinor: 1000,
      monthlyGrowthRate: 0,
      fixedMonthlyCostsMinor: 10000,
      variableMonthlyCostsMinor: 0,
      forecastMonths: 6
    });

    expect(result.runwayMonth).toBe(1);
    expect(result.firstNegativeMonth).toBe(1);
    expect(result.warnings).toContain('IMMEDIATE_NEGATIVE');
  });

  it('allows negative growth and emits warning', () => {
    const result = calculateCashflow({
      startingCashMinor: 20000,
      baseMonthlyRevenueMinor: 10000,
      monthlyGrowthRate: '-0.10',
      fixedMonthlyCostsMinor: 9000,
      variableMonthlyCostsMinor: 500,
      forecastMonths: 4
    });

    expect(result.warnings).toContain('NEGATIVE_GROWTH');
    expect(result.monthlyProjection[3].revenueMinor.toString()).toBe('7290');
  });

  it('rejects invalid forecast horizon', () => {
    expect(() =>
      calculateCashflow({
        startingCashMinor: 100,
        baseMonthlyRevenueMinor: 100,
        fixedMonthlyCostsMinor: 100,
        variableMonthlyCostsMinor: 0,
        forecastMonths: 0
      })
    ).toThrowError(/forecastMonths must be greater than or equal to 1/i);
  });
});
