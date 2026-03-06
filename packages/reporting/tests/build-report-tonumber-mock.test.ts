import { describe, expect, it, vi } from 'vitest';
import { calculateProfit } from '@marginbase/domain-core';

vi.mock('@marginbase/domain-core', () => ({
  calculateProfit: vi.fn(() => ({
    revenueTotalMinor: { toString: () => 123 as unknown as string },
    totalCostMinor: { toString: () => 'not-a-number' },
    grossProfitMinor: { toString: () => 'NaN' },
    netProfitMinor: { toString: () => 'Infinity' },
    contributionMarginPct: {
      toString: () => ({ bad: true }) as unknown as string,
    },
    netProfitPct: null,
    markupPct: null,
    warnings: [],
  })),
  calculateBreakEven: vi.fn(() => ({
    unitContributionMinor: { toString: () => 'bad' },
    breakEvenQuantity: { toString: () => '3' },
    breakEvenRevenueMinor: { toString: () => '300' },
    requiredQuantityForTargetProfit: { toString: () => '5' },
    requiredRevenueForTargetProfitMinor: { toString: () => '500' },
    marginOfSafetyUnits: { toString: () => '1' },
    marginOfSafetyPct: { toString: () => '0.2' },
    warnings: [],
  })),
  calculateCashflow: vi.fn(() => ({
    runwayMonth: null,
    firstNegativeMonth: null,
    finalBalanceMinor: { toString: () => 'bad' },
    monthlyProjection: [
      {
        monthIndex: 1,
        revenueMinor: { toString: () => 'bad' },
        expensesMinor: { toString: () => 'bad' },
        netCashflowMinor: { toString: () => 'bad' },
        cashBalanceMinor: { toString: () => 'bad' },
      },
    ],
    warnings: [],
  })),
}));

import { buildReportModel } from '../src/builders/build-report';

describe('buildReportModel: toNumber fallback branches via mocked calculator output', () => {
  it('accepts number-like values and falls back for unparseable values', () => {
    const report = buildReportModel({
      generatedAtLocal: '2026-03-06T11:00:00.000Z',
      profitabilityInput: {
        mode: 'unit',
        unitPriceMinor: 1000,
        quantity: 1,
        variableCostPerUnitMinor: 100,
        fixedCostsMinor: 100,
      },
      breakEvenInput: {
        unitPriceMinor: 1000,
        variableCostPerUnitMinor: 500,
        fixedCostsMinor: 100,
        plannedQuantity: 5,
      },
      cashflowInput: {
        startingCashMinor: 1000,
        baseMonthlyRevenueMinor: 500,
        fixedMonthlyCostsMinor: 200,
        variableMonthlyCostsMinor: 100,
        forecastMonths: 1,
        monthlyGrowthRate: 0,
      },
    });

    // Covers toNumber number branch (lines 6-7): value returned as number.
    expect(report.profitability?.revenueTotalMinor).toBe(123);

    // Covers toNumber parse-failure branch and ?? 0 fallbacks.
    expect(report.profitability?.totalCostMinor).toBe(0);
    expect(report.profitability?.grossProfitMinor).toBe(0);
    expect(report.profitability?.netProfitMinor).toBe(0);

    // Covers toNumber null branch (lines 14-15): non-number/non-string input.
    expect(report.profitability?.contributionMarginPct).toBeNull();

    expect(report.breakeven?.unitContributionMinor).toBe(0);
    expect(report.cashflow?.finalBalanceMinor).toBe(0);
    expect(report.cashflow?.monthlyProjection[0]?.revenueMinor).toBe(0);
    expect(report.cashflow?.monthlyProjection[0]?.expensesMinor).toBe(0);
    expect(report.cashflow?.monthlyProjection[0]?.netCashflowMinor).toBe(0);
    expect(report.cashflow?.monthlyProjection[0]?.cashBalanceMinor).toBe(0);
  });

  it('falls back revenueTotalMinor to 0 when parser returns null', () => {
    vi.mocked(calculateProfit).mockImplementationOnce(
      () =>
        ({
          revenueTotalMinor: { toString: () => 'invalid' },
          totalCostMinor: { toString: () => '200' },
          grossProfitMinor: { toString: () => '50' },
          netProfitMinor: { toString: () => '25' },
          contributionMarginPct: null,
          netProfitPct: null,
          markupPct: null,
          warnings: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    );

    const report = buildReportModel({
      profitabilityInput: {
        mode: 'unit',
        unitPriceMinor: 1000,
        quantity: 1,
        variableCostPerUnitMinor: 100,
        fixedCostsMinor: 100,
      },
    });

    expect(report.profitability?.revenueTotalMinor).toBe(0);
  });
});
