import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { calculateBreakEven, calculateProfit } from '../src';

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
      { numRuns: 200 }
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
      { numRuns: 200 }
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
      { numRuns: 200 }
    );
  });
});
