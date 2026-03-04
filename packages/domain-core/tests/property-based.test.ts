import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import Decimal from 'decimal.js';
import { calculateBreakEven, calculateCashflow, calculateProfit } from '../src';

describe('property-based invariants', () => {
  it('profit unit mode keeps accounting identities', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (unitPriceMinor, quantity, variableCostPerUnitMinor, fixedCostsMinor, additionalVariableCostsMinor) => {
          const result = calculateProfit({
            mode: 'unit',
            unitPriceMinor,
            quantity,
            variableCostPerUnitMinor,
            fixedCostsMinor,
            additionalVariableCostsMinor
          });

          expect(result.revenueTotalMinor.equals(unitPriceMinor * quantity)).toBe(true);
          expect(result.grossProfitMinor.equals(result.revenueTotalMinor.minus(result.variableCostTotalMinor))).toBe(true);
          expect(result.netProfitMinor.equals(result.grossProfitMinor.minus(result.fixedCostTotalMinor))).toBe(true);

          if (result.revenueTotalMinor.equals(0)) {
            expect(result.contributionMarginPct).toBeNull();
            expect(result.netProfitPct).toBeNull();
            expect(result.warnings).toContain('R_ZERO');
          } else {
            expect(result.contributionMarginPct).not.toBeNull();
            expect(result.netProfitPct).not.toBeNull();
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('profit net result is monotonic when revenue increases and costs stay constant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 0, max: 500_000 }),
        (baseRevenueMinor, extraRevenueMinor, totalVariableCostsMinor, fixedCostsMinor) => {
          const lowRevenue = baseRevenueMinor;
          const highRevenue = baseRevenueMinor + extraRevenueMinor;

          const low = calculateProfit({
            mode: 'revenue',
            totalRevenueMinor: lowRevenue,
            totalVariableCostsMinor,
            fixedCostsMinor
          });

          const high = calculateProfit({
            mode: 'revenue',
            totalRevenueMinor: highRevenue,
            totalVariableCostsMinor,
            fixedCostsMinor
          });

          expect(high.netProfitMinor.greaterThanOrEqualTo(low.netProfitMinor)).toBe(true);

          if (high.netProfitPct !== null) {
            expect(high.netProfitPct.isFinite()).toBe(true);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('break-even is null when unit contribution is non-positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (unitPriceMinor, variableCostPerUnitMinor, fixedCostsMinor) => {
          fc.pre(unitPriceMinor <= variableCostPerUnitMinor);

          const result = calculateBreakEven({
            unitPriceMinor,
            variableCostPerUnitMinor,
            fixedCostsMinor
          });

          expect(result.breakEvenQuantity).toBeNull();
          expect(result.breakEvenRevenueMinor).toBeNull();
          expect(result.requiredQuantityForTargetProfit).toBeNull();
          expect(result.requiredRevenueForTargetProfitMinor).toBeNull();
          expect(result.warnings).toContain('UC_NON_POSITIVE');
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('break-even quantity is zero when fixed costs are zero and contribution positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 0, max: 99_999 }),
        (unitPriceMinor, variableCostPerUnitMinor) => {
          fc.pre(unitPriceMinor > variableCostPerUnitMinor);

          const result = calculateBreakEven({
            unitPriceMinor,
            variableCostPerUnitMinor,
            fixedCostsMinor: 0
          });

          expect(result.breakEvenQuantity?.equals(0)).toBe(true);
          expect(result.breakEvenRevenueMinor?.equals(0)).toBe(true);
          expect(result.warnings).toEqual([]);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('break-even and target quantities stay non-negative for non-negative inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 0, max: 99_999 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (unitPriceMinor, variableCostPerUnitMinor, fixedCostsMinor, targetProfitMinor) => {
          fc.pre(unitPriceMinor > variableCostPerUnitMinor);

          const result = calculateBreakEven({
            unitPriceMinor,
            variableCostPerUnitMinor,
            fixedCostsMinor,
            targetProfitMinor
          });

          expect(result.breakEvenQuantity?.greaterThanOrEqualTo(0)).toBe(true);
          expect(result.requiredQuantityForTargetProfit?.greaterThanOrEqualTo(0)).toBe(true);
          expect(result.requiredQuantityForTargetProfit?.greaterThanOrEqualTo(result.breakEvenQuantity ?? 0)).toBe(true);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('cashflow balance equals start plus cumulative monthly net cashflow', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 300_000 }),
        fc.integer({ min: 0, max: 300_000 }),
        fc.integer({ min: 0, max: 300_000 }),
        fc.integer({ min: 1, max: 24 }),
        fc.double({ min: -0.3, max: 0.5, noNaN: true, noDefaultInfinity: true }),
        (startingCashMinor, baseMonthlyRevenueMinor, fixedMonthlyCostsMinor, variableMonthlyCostsMinor, forecastMonths, monthlyGrowthRate) => {
          const result = calculateCashflow({
            startingCashMinor,
            baseMonthlyRevenueMinor,
            fixedMonthlyCostsMinor,
            variableMonthlyCostsMinor,
            forecastMonths,
            monthlyGrowthRate
          });

          let cumulativeNet = new Decimal(0);

          for (const month of result.monthlyProjection) {
            expect(month.netCashflowMinor.equals(month.revenueMinor.minus(month.expensesMinor))).toBe(true);
            cumulativeNet = cumulativeNet.plus(month.netCashflowMinor);
          }

          const expectedFinal = new Decimal(startingCashMinor).plus(cumulativeNet);
          const finalDelta = result.finalBalanceMinor.minus(expectedFinal).abs();
          expect(finalDelta.lte(new Decimal('0.000001'))).toBe(true);

          if (result.firstNegativeMonth !== null) {
            expect(result.firstNegativeMonth).toBeGreaterThanOrEqual(1);
            expect(result.firstNegativeMonth).toBeLessThanOrEqual(forecastMonths);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});
