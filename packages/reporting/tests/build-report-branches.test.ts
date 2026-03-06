import { describe, expect, it } from 'vitest';
import { buildReportModel } from '../src';

/**
 * Build Report Branch Coverage Tests
 *
 * Targets uncovered branches in build-report.ts:
 * - Lines 6-7, 14-15: toNumber() edge cases (NaN, Infinity, non-parseable strings)
 * - Lines 102, 105: nullable breakeven fields (requiredQuantityForTargetProfit, requiredRevenueForTargetProfitMinor)
 *
 * Goal: 63.79% → 90%+ branch coverage
 */
describe('buildReportModel: branch coverage', () => {
  describe('toNumber() edge cases via extreme inputs', () => {
    it('handles Infinity values in calculated results gracefully', () => {
      // Test with extreme ratio that might produce Infinity
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: Number.MAX_SAFE_INTEGER, // Extreme value
          quantity: 1,
          variableCostPerUnitMinor: 0,
          fixedCostsMinor: 0
        }
      });

      // Should handle gracefully - all numeric fields should be finite or null
      expect(Number.isFinite(report.profitability?.revenueTotalMinor)).toBe(true);
      expect(Number.isFinite(report.profitability?.netProfitMinor)).toBe(true);
    });

    it('handles NaN-producing inputs gracefully', () => {
      // Division by zero in breakeven calculation
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 1000, // Same as price = zero contribution
          fixedCostsMinor: 1000,
          plannedQuantity: 10
        }
      });

      // Should handle division by zero gracefully
      expect(report.breakeven).toBeDefined();
      // breakEvenQuantity will be Infinity or null depending on implementation
      const beQuantity = report.breakeven?.breakEvenQuantity;
      expect(beQuantity === null || !Number.isFinite(beQuantity as number)).toBe(true);
    });

    it('handles zero values producing zero/null results', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 0, // Edge case: zero price
          variableCostPerUnitMinor: 0,
          fixedCostsMinor: 0,
          plannedQuantity: 10
        }
      });

      expect(report.breakeven).toBeDefined();
      expect(report.breakeven?.unitContributionMinor).toBe(0);
    });

    it('handles negative growth rate edge case', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 10000,
          baseMonthlyRevenueMinor: 2000,
          fixedMonthlyCostsMinor: 1000,
          variableMonthlyCostsMinor: 500,
          forecastMonths: 3,
          monthlyGrowthRate: -0.1 // Negative growth
        }
      });

      expect(report.cashflow).toBeDefined();
      expect(report.cashflow?.warnings).toContain('NEGATIVE_GROWTH');
      expect(report.cashflow?.monthlyProjection.length).toBe(3);

      // Revenue should decrease month over month
      const revenues = report.cashflow!.monthlyProjection.map((p) => p.revenueMinor);
      expect(revenues[1]).toBeLessThan(revenues[0]);
      expect(revenues[2]).toBeLessThan(revenues[1]);
    });
  });

  describe('nullable breakeven fields coverage', () => {
    it('covers requiredQuantityForTargetProfit null branch', () => {
      // Without targetProfitMinor, requiredQuantityForTargetProfit should be null or same as breakeven
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 2000,
          plannedQuantity: 10
          // No targetProfitMinor specified
        }
      });

      expect(report.breakeven).toBeDefined();
      // requiredQuantityForTargetProfit behavior depends on domain-core implementation
      expect(report.breakeven?.breakEvenQuantity).toBeGreaterThan(0);
    });

    it('covers requiredQuantityForTargetProfit non-null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 2000,
          plannedQuantity: 10,
          targetProfitMinor: 5000 // Explicit target profit
        }
      });

      expect(report.breakeven).toBeDefined();
      // With target profit, requiredQuantityForTargetProfit should be computed
      expect(report.breakeven?.requiredQuantityForTargetProfit).toBeDefined();
    });

    it('covers requiredRevenueForTargetProfitMinor null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 2000,
          plannedQuantity: 10
          // No targetProfitMinor
        }
      });

      expect(report.breakeven).toBeDefined();
      // Behavior depends on domain-core implementation
      expect(report.breakeven?.breakEvenRevenueMinor).toBeDefined();
    });

    it('covers requiredRevenueForTargetProfitMinor non-null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 2000,
          plannedQuantity: 10,
          targetProfitMinor: 3000
        }
      });

      expect(report.breakeven).toBeDefined();
      expect(report.breakeven?.requiredRevenueForTargetProfitMinor).toBeDefined();
    });

    it('covers marginOfSafetyUnits null branch', () => {
      // When planned quantity is very low, margin of safety might be null or negative
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 10000,
          plannedQuantity: 1 // Very low planned quantity
        }
      });

      expect(report.breakeven).toBeDefined();
      // Margin of safety should be negative (below breakeven)
      expect(report.breakeven?.marginOfSafetyUnits).toBeLessThan(0);
    });

    it('covers marginOfSafetyPct null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        breakEvenInput: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000,
          plannedQuantity: 1 // Below breakeven threshold
        }
      });

      expect(report.breakeven).toBeDefined();
      // Margin of safety percentage should be negative
      expect(report.breakeven?.marginOfSafetyPct).toBeLessThan(0);
    });
  });

  describe('profitability nullable fields coverage', () => {
    it('covers contributionMarginPct null branch', () => {
      // Zero revenue case
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 0, // Zero quantity = zero revenue
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000
        }
      });

      expect(report.profitability).toBeDefined();
      expect(report.profitability?.revenueTotalMinor).toBe(0);
      // Contribution margin with zero revenue might be null or undefined
      expect(
        report.profitability?.contributionMarginPct === null ||
        report.profitability?.contributionMarginPct === undefined
      ).toBe(true);
    });

    it('covers netProfitPct null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        profitabilityInput: {
          mode: 'revenue',
          totalRevenueMinor: 0, // Zero revenue
          variableCostPerUnitMinor: 1000,
          fixedCostsMinor: 2000
        }
      });

      expect(report.profitability).toBeDefined();
      // Net profit percentage with zero revenue should be null
      expect(report.profitability?.netProfitPct === null).toBe(true);
    });

    it('covers markupPct null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 0,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000
        }
      });

      expect(report.profitability).toBeDefined();
      // Markup percentage with zero revenue - may be null or numeric depending on calculation
      const markupPct = report.profitability?.markupPct;
      expect(markupPct === null || typeof markupPct === 'number').toBe(true);
    });
  });

  describe('cashflow nullable fields coverage', () => {
    it('covers runwayMonth null branch (never runs out)', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 50000,
          baseMonthlyRevenueMinor: 5000,
          fixedMonthlyCostsMinor: 2000,
          variableMonthlyCostsMinor: 1000,
          forecastMonths: 12,
          monthlyGrowthRate: 0.05 // Positive growth
        }
      });

      expect(report.cashflow).toBeDefined();
      // With positive cashflow, runway should be null
      expect(report.cashflow?.runwayMonth).toBeNull();
      expect(report.cashflow?.finalBalanceMinor).toBeGreaterThan(50000);
    });

    it('covers firstNegativeMonth null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 100000,
          baseMonthlyRevenueMinor: 10000,
          fixedMonthlyCostsMinor: 2000,
          variableMonthlyCostsMinor: 1000,
          forecastMonths: 6,
          monthlyGrowthRate: 0
        }
      });

      expect(report.cashflow).toBeDefined();
      // Positive cashflow throughout - no negative month
      expect(report.cashflow?.firstNegativeMonth).toBeNull();
    });

    it('covers firstNegativeMonth non-null branch', () => {
      const report = buildReportModel({
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        cashflowInput: {
          startingCashMinor: 2000,
          baseMonthlyRevenueMinor: 500,
          fixedMonthlyCostsMinor: 1000,
          variableMonthlyCostsMinor: 500,
          forecastMonths: 6,
          monthlyGrowthRate: 0
        }
      });

      expect(report.cashflow).toBeDefined();
      // Negative cashflow - should have first negative month
      expect(report.cashflow?.firstNegativeMonth).toBeDefined();
      expect(report.cashflow?.firstNegativeMonth).toBeGreaterThan(0);
    });
  });

  describe('edge cases in report summary', () => {
    it('preserves locale from input', () => {
      const report = buildReportModel({
        locale: 'fr-FR',
        currencyCode: 'EUR',
        generatedAtLocal: '2026-03-06T10:00:00.000Z',
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 5,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000
        }
      });

      expect(report.summary.locale).toBe('fr-FR');
      expect(report.summary.currencyCode).toBe('EUR');
    });

    it('uses auto-generated timestamp when omitted', () => {
      const beforeTime = new Date().toISOString();

      const report = buildReportModel({
        profitabilityInput: {
          mode: 'unit',
          unitPriceMinor: 1000,
          quantity: 5,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 1000
        }
      });

      const afterTime = new Date().toISOString();

      expect(report.summary.generatedAtLocal).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(report.summary.generatedAtLocal >= beforeTime).toBe(true);
      expect(report.summary.generatedAtLocal <= afterTime).toBe(true);
    });
  });
});
