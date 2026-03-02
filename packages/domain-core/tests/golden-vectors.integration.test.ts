import { describe, expect, it } from 'vitest';
import { calculateBreakEven, calculateCashflow, calculateProfit } from '../src';

describe('golden vectors integration', () => {
  it('profit vectors remain stable', () => {
    const vectors = [
      {
        input: {
          mode: 'unit' as const,
          unitPriceMinor: 1500,
          quantity: 120,
          variableCostPerUnitMinor: 900,
          fixedCostsMinor: 25000,
          additionalVariableCostsMinor: 5000
        },
        expected: {
          revenueTotalMinor: '180000',
          variableCostTotalMinor: '113000',
          netProfitMinor: '42000',
          contributionMarginPct: '0.37222222222222222222',
          netProfitPct: '0.23333333333333333333'
        }
      },
      {
        input: {
          mode: 'revenue' as const,
          totalRevenueMinor: 80000,
          fixedCostsMinor: 5000,
          totalVariableCostsMinor: 40000
        },
        expected: {
          revenueTotalMinor: '80000',
          variableCostTotalMinor: '40000',
          netProfitMinor: '35000',
          contributionMarginPct: '0.5',
          netProfitPct: '0.4375'
        }
      }
    ];

    for (const vector of vectors) {
      const result = calculateProfit(vector.input);
      expect(result.revenueTotalMinor.toString()).toBe(vector.expected.revenueTotalMinor);
      expect(result.variableCostTotalMinor.toString()).toBe(vector.expected.variableCostTotalMinor);
      expect(result.netProfitMinor.toString()).toBe(vector.expected.netProfitMinor);
      expect(result.contributionMarginPct?.toString() ?? null).toBe(vector.expected.contributionMarginPct);
      expect(result.netProfitPct?.toString() ?? null).toBe(vector.expected.netProfitPct);
    }
  });

  it('break-even vectors remain stable', () => {
    const vectors = [
      {
        input: {
          unitPriceMinor: 2400,
          variableCostPerUnitMinor: 1000,
          fixedCostsMinor: 84000,
          targetProfitMinor: 14000,
          plannedQuantity: 80
        },
        expected: {
          unitContributionMinor: '1400',
          breakEvenQuantity: '60',
          breakEvenRevenueMinor: '144000',
          requiredQuantityForTargetProfit: '70',
          marginOfSafetyUnits: '20'
        }
      }
    ];

    for (const vector of vectors) {
      const result = calculateBreakEven(vector.input);
      expect(result.unitContributionMinor.toString()).toBe(vector.expected.unitContributionMinor);
      expect(result.breakEvenQuantity?.toString() ?? null).toBe(vector.expected.breakEvenQuantity);
      expect(result.breakEvenRevenueMinor?.toString() ?? null).toBe(vector.expected.breakEvenRevenueMinor);
      expect(result.requiredQuantityForTargetProfit?.toString() ?? null).toBe(vector.expected.requiredQuantityForTargetProfit);
      expect(result.marginOfSafetyUnits?.toString() ?? null).toBe(vector.expected.marginOfSafetyUnits);
    }
  });

  it('cashflow vectors remain stable', () => {
    const vectors = [
      {
        input: {
          startingCashMinor: 50000,
          baseMonthlyRevenueMinor: 20000,
          monthlyGrowthRate: '0.05',
          fixedMonthlyCostsMinor: 15000,
          variableMonthlyCostsMinor: 2000,
          forecastMonths: 4
        },
        expected: {
          month4RevenueMinor: '23152.5',
          finalBalanceMinor: '68202.5',
          runwayMonth: null
        }
      }
    ];

    for (const vector of vectors) {
      const result = calculateCashflow(vector.input);
      expect(result.monthlyProjection[3].revenueMinor.toString()).toBe(vector.expected.month4RevenueMinor);
      expect(result.finalBalanceMinor.toString()).toBe(vector.expected.finalBalanceMinor);
      expect(result.runwayMonth).toBe(vector.expected.runwayMonth);
    }
  });
});
