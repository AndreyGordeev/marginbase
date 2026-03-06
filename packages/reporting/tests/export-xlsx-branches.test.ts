import { describe, expect, it } from 'vitest';
import { read, utils } from 'xlsx';
import { buildReportModel } from '../src/builders/build-report';
import { exportReportXlsx } from '../src/export/xlsx/export-xlsx';

describe('exportReportXlsx: summary branch coverage', () => {
  it('adds risk indicator rows to Summary sheet when risks exist', () => {
    const report = buildReportModel({
      generatedAtLocal: '2026-03-06T11:00:00.000Z',
      profitabilityInput: {
        mode: 'unit',
        unitPriceMinor: 1000,
        quantity: 0,
        variableCostPerUnitMinor: 500,
        fixedCostsMinor: 1000,
      },
      cashflowInput: {
        startingCashMinor: 500,
        baseMonthlyRevenueMinor: 200,
        fixedMonthlyCostsMinor: 400,
        variableMonthlyCostsMinor: 100,
        forecastMonths: 6,
        monthlyGrowthRate: -0.01,
      },
    });

    expect(report.riskIndicators.length).toBeGreaterThan(0);

    const xlsxBytes = exportReportXlsx(report);
    const workbook = read(xlsxBytes, { type: 'array' });
    const summaryRows = utils.sheet_to_json<Array<string | number>>(
      workbook.Sheets.Summary,
      {
        header: 1,
      },
    );

    const riskRows = summaryRows.filter(
      (row) => typeof row[0] === 'string' && String(row[0]).startsWith('Risk:'),
    );
    expect(riskRows.length).toBeGreaterThan(0);
  });

  it('writes non-null break-even revenue fields as decimal values', () => {
    const report = buildReportModel({
      generatedAtLocal: '2026-03-06T11:00:00.000Z',
      breakEvenInput: {
        unitPriceMinor: 1000,
        variableCostPerUnitMinor: 600,
        fixedCostsMinor: 2000,
        plannedQuantity: 10,
        targetProfitMinor: 3000,
      },
    });

    const xlsxBytes = exportReportXlsx(report);
    const workbook = read(xlsxBytes, { type: 'array' });
    const breakEvenRows = utils.sheet_to_json<Array<string | number | null>>(
      workbook.Sheets['Break-even'],
      {
        header: 1,
      },
    );

    const breakEvenRevenueRow = breakEvenRows.find(
      (row) => row[0] === 'BreakEvenRevenue',
    );
    const requiredRevenueRow = breakEvenRows.find(
      (row) => row[0] === 'RequiredRevenueForTargetProfit',
    );

    expect(typeof breakEvenRevenueRow?.[1]).toBe('number');
    expect(typeof requiredRevenueRow?.[1]).toBe('number');
  });

  it('keeps break-even revenue fields null when unit contribution is non-positive', () => {
    const report = buildReportModel({
      generatedAtLocal: '2026-03-06T11:00:00.000Z',
      breakEvenInput: {
        unitPriceMinor: 100,
        variableCostPerUnitMinor: 100,
        fixedCostsMinor: 2000,
        plannedQuantity: 10,
      },
    });

    const xlsxBytes = exportReportXlsx(report);
    const workbook = read(xlsxBytes, { type: 'array' });
    const breakEvenRows = utils.sheet_to_json<Array<string | number | null>>(
      workbook.Sheets['Break-even'],
      {
        header: 1,
      },
    );

    const breakEvenRevenueRow = breakEvenRows.find(
      (row) => row[0] === 'BreakEvenRevenue',
    );
    const requiredRevenueRow = breakEvenRows.find(
      (row) => row[0] === 'RequiredRevenueForTargetProfit',
    );

    expect(
      breakEvenRevenueRow?.[1] === null ||
        breakEvenRevenueRow?.[1] === undefined,
    ).toBe(true);
    expect(
      requiredRevenueRow?.[1] === null || requiredRevenueRow?.[1] === undefined,
    ).toBe(true);
  });
});
