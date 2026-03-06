import { describe, expect, it } from 'vitest';
import { read } from 'xlsx';
import { buildReportModel, exportReportXlsx, exportReportPdf } from '../src';

/**
 * Build Report Edge Case Tests
 *
 * Covers uncovered branches and edge cases in build-report.ts:
 * - Lines 36, 38-42: Risk indicator branches
 * - Lines 55-60: Edge cases in report building logic
 * - Lines 102, 105: Conditional formatting and null handling
 *
 * Target: ≥90% branch coverage for build-report.ts
 */
describe('buildReportModel: edge case coverage', () => {
  describe('risk indicators', () => {
    it('generates NEGATIVE_MARGIN_OF_SAFETY indicator', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 10000,
          plannedQuantity: 5, // Below breakeven (25 units needed)
        },
      });

      expect(report.riskIndicators).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'NEGATIVE_MARGIN_OF_SAFETY',
            severity: 'warning',
          }),
        ]),
      );
    });

    it('generates NEGATIVE_CASH_BALANCE indicator', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 1000,
          baseMonthlyRevenueMinor: 500,
          fixedMonthlyCostsMinor: 1500,
          variableMonthlyCostsMinor: 200,
          forecastMonths: 6,
          monthlyGrowthRate: 0,
        },
      });

      expect(report.riskIndicators).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'NEGATIVE_CASH_BALANCE',
            severity: 'warning',
          }),
        ]),
      );
      expect(report.cashflow?.firstNegativeMonth).not.toBeNull();
    });

    it('generates NEGATIVE_GROWTH indicator', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 5000,
          baseMonthlyRevenueMinor: 2000,
          fixedMonthlyCostsMinor: 800,
          variableMonthlyCostsMinor: 400,
          forecastMonths: 6,
          monthlyGrowthRate: -0.05, // Negative growth
        },
      });

      expect(report.riskIndicators).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'NEGATIVE_GROWTH',
            severity: 'info',
          }),
        ]),
      );
      expect(report.cashflow?.warnings).toContain('NEGATIVE_GROWTH');
    });

    it('generates PROFIT_NON_POSITIVE indicator', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 5,
          variableCostPerUnitMinor: 800,
          fixedCostsMinor: 2000, // Results in negative profit
        },
      });

      expect(report.riskIndicators).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'PROFIT_NON_POSITIVE',
            severity: 'warning',
          }),
        ]),
      );
      expect(report.profitability?.netProfitMinor).toBeLessThanOrEqual(0);
    });

    it('accumulates multiple risk indicators simultaneously', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 500,
          quantity: 2,
          variableCostPerUnitMinor: 400,
          fixedCostsMinor: 1000,
        },
        breakEvenInput: {
          unitPriceMinor: 500,
          variableCostPerUnitMinor: 400,
          fixedCostsMinor: 1000,
          plannedQuantity: 3, // Below breakeven (10 units needed)
        },
        cashflowInput: {
          startingCashMinor: 500,
          baseMonthlyRevenueMinor: 200,
          fixedMonthlyCostsMinor: 400,
          variableMonthlyCostsMinor: 100,
          forecastMonths: 6,
          monthlyGrowthRate: -0.02,
        },
      });

      expect(report.riskIndicators.length).toBeGreaterThanOrEqual(3);
      const codes = report.riskIndicators.map((r) => r.code);
      expect(codes).toContain('PROFIT_NON_POSITIVE');
      expect(codes).toContain('NEGATIVE_MARGIN_OF_SAFETY');
      expect(codes).toContain('NEGATIVE_CASH_BALANCE');
      expect(codes).toContain('NEGATIVE_GROWTH');
    });
  });

  describe('null handling and edge values', () => {
    it('handles null target profit in breakeven calculation', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000,
          plannedQuantity: 10,
          targetProfitMinor: null,
        },
      });

      // When targetProfitMinor is null, calculator still computes breakeven quantity
      expect(report.breakeven?.breakEvenQuantity).toBeGreaterThan(0);
      // But target profit specific fields may be null or same as breakeven
      expect(report.breakeven).toBeDefined();
    });

    it('handles zero fixed costs (no breakeven needed)', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 0,
          plannedQuantity: 5,
        },
      });

      expect(report.breakeven?.breakEvenQuantity).toBe(0);
    });

    it('handles zero quantity in profitability calculation', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 0,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000,
        },
      });

      expect(report.profitability?.revenueTotalMinor).toBe(0);
      expect(report.profitability?.netProfitMinor).toBeLessThan(0);
    });

    it('handles very large numbers (near max safe integer)', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 999999999, // Near max safe minor units
          quantity: 100,
          variableCostPerUnitMinor: 500000000,
          fixedCostsMinor: 10000000,
        },
      });

      expect(report.profitability?.revenueTotalMinor).toBeGreaterThan(0);
      expect(Number.isFinite(report.profitability?.netProfitMinor)).toBe(true);
    });
  });

  describe('export edge cases', () => {
    it('exports report with only profitability module', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        profitabilityInput: {
          mode: 'revenue',
          totalRevenueMinor: 10000,
          variableCostPerUnitMinor: 6000,
          fixedCostsMinor: 2000,
        },
      });

      const xlsxBytes = exportReportXlsx(report);
      const workbook = read(xlsxBytes, { type: 'array' });

      expect(workbook.SheetNames).toContain('Summary');
      expect(report.profitability).toBeDefined();
      expect(report.breakeven).toBeUndefined();
      expect(report.cashflow).toBeUndefined();
    });

    it('exports report with only breakeven module', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 2000,
          plannedQuantity: 10,
        },
      });

      const xlsxBytes = exportReportXlsx(report);
      const workbook = read(xlsxBytes, { type: 'array' });

      expect(workbook.SheetNames).toContain('Summary');
      expect(report.breakeven).toBeDefined();
      expect(report.profitability).toBeUndefined();
      expect(report.cashflow).toBeUndefined();
    });

    it('exports report with only cashflow module', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 5000,
          baseMonthlyRevenueMinor: 2000,
          fixedMonthlyCostsMinor: 800,
          variableMonthlyCostsMinor: 400,
          forecastMonths: 12,
          monthlyGrowthRate: 0.03,
        },
      });

      const xlsxBytes = exportReportXlsx(report);
      const workbook = read(xlsxBytes, { type: 'array' });

      expect(workbook.SheetNames).toContain('Summary');
      expect(report.cashflow).toBeDefined();
      expect(report.profitability).toBeUndefined();
      expect(report.breakeven).toBeUndefined();
    });

    it('exports PDF with minimal cashflow projection', async () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 1000,
          baseMonthlyRevenueMinor: 500,
          fixedMonthlyCostsMinor: 300,
          variableMonthlyCostsMinor: 100,
          forecastMonths: 1, // Minimal projection
          monthlyGrowthRate: 0,
        },
      });

      const pdfBytes = await exportReportPdf(report);

      expect(pdfBytes.byteLength).toBeGreaterThan(500);
      expect(report.cashflow?.monthlyProjection.length).toBe(1);
    });

    it('exports PDF with empty watermark text (omits watermark)', async () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-05T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 10,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000,
        },
      });

      const pdfBytesNoWatermark = await exportReportPdf(report, {
        watermarkText: '',
      });
      const pdfBytesWithWatermark = await exportReportPdf(report, {
        watermarkText: 'MarginBase v1',
      });

      // Both should be valid PDFs, watermark text affects content size slightly
      expect(pdfBytesNoWatermark.byteLength).toBeGreaterThan(500);
      expect(pdfBytesWithWatermark.byteLength).toBeGreaterThan(
        pdfBytesNoWatermark.byteLength,
      );
    });
  });

  describe('custom metadata', () => {
    it('uses custom title and locale', () => {
      const report = buildReportModel({
        title: 'Custom Report Title',
        locale: 'de-DE',
        currencyCode: 'USD',
        generatedAtLocal: '2026-03-05T15:30:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 5,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000,
        },
      });

      expect(report.summary.title).toBe('Custom Report Title');
      expect(report.summary.locale).toBe('de-DE');
      expect(report.summary.currencyCode).toBe('USD');
      expect(report.summary.generatedAtLocal).toBe('2026-03-05T15:30:00.000Z');
    });

    it('defaults title, locale, and currency when omitted', () => {
      const report = buildReportModel({
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 5,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000,
        },
      });

      expect(report.summary.title).toBe('Business Report');
      expect(report.summary.locale).toBe('en-US');
      expect(report.summary.currencyCode).toBe('EUR');
      expect(report.summary.generatedAtLocal).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO datetime
    });
  });
});
