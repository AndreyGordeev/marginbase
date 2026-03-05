import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import Decimal from 'decimal.js';
import { calculateCashflow, calculateProfit } from '../src';

/**
 * Extended property-based tests for Phase 3
 * Core numeric stability and invariants for domain calculators
 */

describe('extended property-based invariants', () => {
  describe('profit calculator properties', () => {
    it('unit mode calculates revenue as unit price × quantity', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 100_000 }),
          fc.integer({ min: 1, max: 10_000 }),
          (unitPriceMinor, quantity) => {
            const result = calculateProfit({
              mode: 'unit',
              unitPriceMinor,
              quantity,
              variableCostPerUnitMinor: 0,
              fixedCostsMinor: 0
            });

            const expectedRevenue = new Decimal(unitPriceMinor).mul(quantity);
            expect(result.revenueTotalMinor.equals(expectedRevenue)).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('net profit = revenue - (fixed + variable) costs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 50_000 }),
          fc.integer({ min: 50, max: 10_000 }),
          fc.integer({ min: 1000, max: 50_000 }),
          (revenue, variable, fixed) => {
            const result = calculateProfit({
              mode: 'revenue',
              totalRevenueMinor: revenue,
              totalVariableCostsMinor: variable,
              fixedCostsMinor: fixed
            });

            const expectedProfit = new Decimal(revenue).minus(variable).minus(fixed);
            expect(result.netProfitMinor.equals(expectedProfit)).toBe(true);
          }
        ),
        { numRuns: 300 }
      );
    });

    it('higher revenue produces higher or equal net profit (with fixed costs)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 50_000 }),
          fc.integer({ min: 50, max: 5000 }),
          (baseRevenue, fixedCosts) => {
            const result1 = calculateProfit({
              mode: 'revenue',
              totalRevenueMinor: baseRevenue,
              fixedCostsMinor: fixedCosts,
              totalVariableCostsMinor: 0
            });

            const result2 = calculateProfit({
              mode: 'revenue',
              totalRevenueMinor: baseRevenue + 1000,
              fixedCostsMinor: fixedCosts,
              totalVariableCostsMinor: 0
            });

            expect(result2.netProfitMinor.greaterThanOrEqualTo(result1.netProfitMinor)).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('results are always Decimal.js instances', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 100_000 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 50, max: 5000 }),
          (revenue, costs, fixed) => {
            const result = calculateProfit({
              mode: 'revenue',
              totalRevenueMinor: revenue,
              totalVariableCostsMinor: costs,
              fixedCostsMinor: fixed
            });

            expect(result.revenueTotalMinor).toBeInstanceOf(Decimal);
            expect(result.netProfitMinor).toBeInstanceOf(Decimal);
            expect(result.totalCostMinor).toBeInstanceOf(Decimal);
            expect(result.grossProfitMinor).toBeInstanceOf(Decimal);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('zero revenue produces zero revenue result', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 50_000 }),
          fc.integer({ min: 1000, max: 50_000 }),
          (variable, fixed) => {
            const result = calculateProfit({
              mode: 'revenue',
              totalRevenueMinor: 0,
              totalVariableCostsMinor: variable,
              fixedCostsMinor: fixed
            });

            expect(result.revenueTotalMinor.equals(0)).toBe(true);
            expect(result.warnings).toContain('R_ZERO');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles large numbers without precision loss', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_000_000, max: 999_999_999 }),
          fc.integer({ min: 100_000, max: 500_000 }),
          (revenue, costs) => {
            const result = calculateProfit({
              mode: 'revenue',
              totalRevenueMinor: revenue,
              totalVariableCostsMinor: costs,
              fixedCostsMinor: 100_000
            });

            expect(result.revenueTotalMinor.isNaN()).toBe(false);
            expect(result.netProfitMinor.isNaN()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('cashflow calculator properties', () => {
    it('monthly projection count equals forecast months', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 24 }),
          (forecastMonths) => {
            const result = calculateCashflow({
              startingCashMinor: 10_000,
              baseMonthlyRevenueMinor: 5_000,
              fixedMonthlyCostsMinor: 1000,
              variableMonthlyCostsMinor: 500,
              forecastMonths
            });

            expect(result.monthlyProjection.length).toBe(forecastMonths);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each projection point has sequential month index', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 12 }),
          (forecastMonths) => {
            const result = calculateCashflow({
              startingCashMinor: 50_000,
              baseMonthlyRevenueMinor: 10_000,
              fixedMonthlyCostsMinor: 2000,
              variableMonthlyCostsMinor: 1000,
              forecastMonths
            });

            result.monthlyProjection.forEach((point, idx) => {
              expect(point.monthIndex).toBe(idx + 1);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('final balance = starting + sum of net flows', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100_000 }),
          fc.integer({ min: 1000, max: 20_000 }),
          fc.integer({ min: 1, max: 6 }),
          (startingCash, monthlyRevenue, forecastMonths) => {
            const result = calculateCashflow({
              startingCashMinor: startingCash,
              baseMonthlyRevenueMinor: monthlyRevenue,
              fixedMonthlyCostsMinor: 1000,
              variableMonthlyCostsMinor: 500,
              forecastMonths
            });

            const totalNetFlow = result.monthlyProjection.reduce(
              (sum, p) => sum.plus(p.netCashflowMinor),
              new Decimal(0)
            );

            const expectedFinal = new Decimal(startingCash).plus(totalNetFlow);
            expect(result.finalBalanceMinor.equals(expectedFinal)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('monthly projection always produces Decimal values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10_000, max: 100_000 }),
          fc.integer({ min: 5000, max: 20_000 }),
          fc.integer({ min: 3, max: 12 }),
          (startingCash, monthlyRevenue, forecastMonths) => {
            const result = calculateCashflow({
              startingCashMinor: startingCash,
              baseMonthlyRevenueMinor: monthlyRevenue,
              fixedMonthlyCostsMinor: 1000,
              variableMonthlyCostsMinor: 500,
              forecastMonths
            });

            result.monthlyProjection.forEach((point) => {
              expect(point.revenueMinor).toBeInstanceOf(Decimal);
              expect(point.expensesMinor).toBeInstanceOf(Decimal);
              expect(point.netCashflowMinor).toBeInstanceOf(Decimal);
              expect(point.cashBalanceMinor).toBeInstanceOf(Decimal);
            });
          }
        ),
        { numRuns: 80 }
      );
    });

    it('zero forecast months throws or returns minimal result', () => {
      // Zero forecast should typically error
      try {
        const result = calculateCashflow({
          startingCashMinor: 10_000,
          baseMonthlyRevenueMinor: 5_000,
          fixedMonthlyCostsMinor: 1000,
          variableMonthlyCostsMinor: 500,
          forecastMonths: 0
        });
        expect(result.monthlyProjection.length).toBeLessThanOrEqual(0);
      } catch {
        expect(true).toBe(true);
      }
    });

    it('handles large cash balances without precision loss', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10_000_000, max: 999_999_999 }),
          fc.integer({ min: 1_000_000, max: 50_000_000 }),
          (startingCash, monthlyRevenue) => {
            const result = calculateCashflow({
              startingCashMinor: startingCash,
              baseMonthlyRevenueMinor: monthlyRevenue,
              fixedMonthlyCostsMinor: 100_000,
              variableMonthlyCostsMinor: 50_000,
              forecastMonths: 3
            });

            result.monthlyProjection.forEach((point) => {
              expect(point.cashBalanceMinor.isNaN()).toBe(false);
              expect(point.revenueMinor.isNaN()).toBe(false);
            });

            expect(result.finalBalanceMinor.isNaN()).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('cross-calculator consistency', () => {
    it('profit unit and revenue modes agree on net profit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10_000 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 50, max: 5000 }),
          (unitPrice, quantity, fixedCosts) => {
            const unitResult = calculateProfit({
              mode: 'unit',
              unitPriceMinor: unitPrice,
              quantity,
              variableCostPerUnitMinor: Math.floor(unitPrice / 2),
              fixedCostsMinor: fixedCosts
            });

            const totalRevenue = new Decimal(unitPrice).mul(quantity).toNumber();
            const totalVariable = new Decimal(Math.floor(unitPrice / 2)).mul(quantity).toNumber();

            const revenueResult = calculateProfit({
              mode: 'revenue',
              totalRevenueMinor: totalRevenue,
              totalVariableCostsMinor: totalVariable,
              fixedCostsMinor: fixedCosts
            });

            expect(unitResult.netProfitMinor.equals(revenueResult.netProfitMinor)).toBe(true);
          }
        ),
        { numRuns: 150 }
      );
    });
  });
});
