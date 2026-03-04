import { describe, expect, it } from 'vitest';
import { buildReportModel, exportReportXlsx } from '../src';

describe('buildReportModel', () => {
  it('builds report model with deterministic values', () => {
    const report = buildReportModel({
      generatedAtLocal: '2026-03-04T12:00:00.000Z',
      profitabilityInput: {
        mode: 'unit',
        unitPriceMinor: 1000,
        quantity: 10,
        variableCostPerUnitMinor: 600,
        fixedCostsMinor: 1000
      },
      breakEvenInput: {
        unitPriceMinor: 1000,
        variableCostPerUnitMinor: 600,
        fixedCostsMinor: 1000,
        plannedQuantity: 10
      },
      cashflowInput: {
        startingCashMinor: 5000,
        baseMonthlyRevenueMinor: 1000,
        fixedMonthlyCostsMinor: 500,
        variableMonthlyCostsMinor: 200,
        forecastMonths: 3,
        monthlyGrowthRate: 0
      }
    });

    expect(report.summary.generatedAtLocal).toBe('2026-03-04T12:00:00.000Z');
    expect(report.profitability?.netProfitMinor).toBe(3000);
    expect(report.breakeven?.breakEvenQuantity).toBe(2.5);
    expect(report.cashflow?.monthlyProjection.length).toBe(3);
    expect(report.disclaimer).toMatch(/Generated locally/i);
  });

  it('throws when no module input is provided', () => {
    expect(() => buildReportModel({})).toThrowError(/at least one calculator input/i);
  });

  it('exports report as xlsx workbook bytes', () => {
    const report = buildReportModel({
      generatedAtLocal: '2026-03-04T12:00:00.000Z',
      profitabilityInput: {
        mode: 'unit',
        unitPriceMinor: 1000,
        quantity: 10,
        variableCostPerUnitMinor: 600,
        fixedCostsMinor: 1000
      }
    });

    const xlsxBytes = exportReportXlsx(report);

    expect(xlsxBytes.byteLength).toBeGreaterThan(200);
    expect(String.fromCharCode(xlsxBytes[0], xlsxBytes[1])).toBe('PK');
  });
});
