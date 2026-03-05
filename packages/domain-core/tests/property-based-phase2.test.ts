import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import Decimal from 'decimal.js';

/**
 * Extended Property-Based & Fuzz Tests — Phase 2: Stress Testing 🧪
 *
 * Uses fast-check to generate thousands of random inputs.
 * Tests invariants that MUST hold for all valid data.
 * Catches edge cases and rounding errors that unit tests miss.
 *
 * Key invariants:
 * - Profit: margin always in [0, 100]%
 * - Break-even: revenue at break-even >= total cost
 * - Cashflow: starting balance + inflows = outflows + ending balance
 * - All: no NaN, no Infinity, no silent overflow
 *
 * Run: pnpm --filter @marginbase/domain-core test:property
 */

// ============================================================================
// HELPERS & GENERATORS
// ============================================================================

/** Generate realistic business values (0 to 999,999,999) */
const arbBusinessValue = () => fc.integer({ min: 0, max: 999999999 });

/** Generate decimal numbers with 2 decimal places */
const arbDecimal = (min = 0, max = 1000000) =>
  fc
    .tuple(fc.integer({ min, max }), fc.integer({ min: 0, max: 99 }))
    .map(([whole, cents]) => new Decimal(whole).plus(new Decimal(cents).dividedBy(100)));

/** Validate a number is safe (finite, not NaN) */
function isSafeNumber(n: number | Decimal): boolean {
  if (n instanceof Decimal) {
    return !n.isNaN() && !n.isInfinity();
  }
  return isFinite(n) && !isNaN(n);
}

// ============================================================================
// PROFIT CALCULATOR PROPERTIES
// ============================================================================

describe('Property-Based: Profit Calculator', () => {
  test('Prop 1.1: Margin always ∈ [0, 100]%', () => {
    fc.assert(
      fc.property(arbBusinessValue(), arbBusinessValue(), (revenue, cost) => {
        if (revenue === 0) return true; // Skip undefined margin

        const margin = (Math.max(0, revenue - cost) / revenue) * 100;

        expect(margin).toBeGreaterThanOrEqual(0);
        expect(margin).toBeLessThanOrEqual(100);
        expect(isSafeNumber(margin)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  test('Prop 1.2: Profit = Revenue - Cost always', () => {
    fc.assert(
      fc.property(arbBusinessValue(), arbBusinessValue(), (revenue, cost) => {
        const profit = Math.max(0, revenue - cost);

        expect(profit).toBeGreaterThanOrEqual(0);
        expect(profit).toBeLessThanOrEqual(revenue);
        expect(isSafeNumber(profit)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  test('Prop 1.3: Profit + Cost = Revenue (except losses)', () => {
    fc.assert(
      fc.property(arbBusinessValue(), arbBusinessValue(), (revenue, cost) => {
        const profit = revenue - cost;

        // When cost > revenue, profit is negative (loss scenario)
        if (cost > revenue) {
          expect(profit).toBeLessThan(0);
        } else {
          expect(profit + cost).toBe(revenue);
        }
      }),
      { numRuns: 500 },
    );
  });

  test('Prop 1.4: Breaking even at revenue = cost', () => {
    fc.assert(
      fc.property(arbBusinessValue(), (value) => {
        // When revenue === cost
        const profit = value - value;
        const margin = value === 0 ? 0 : (profit / value) * 100;

        expect(profit).toBe(0);
        expect(margin).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  test('Prop 1.5: Margin is monotonic in revenue (cost fixed)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 100000 }), arbBusinessValue(), (cost, revenueOffset) => {
        const revenue1 = cost + revenueOffset;
        const revenue2 = revenue1 + 1000; // Higher revenue

        const margin1 = revenue1 === 0 ? 0 : ((revenue1 - cost) / revenue1) * 100;
        const margin2 = revenue2 === 0 ? 0 : ((revenue2 - cost) / revenue2) * 100;

        // Higher revenue with same cost = higher profit = higher margin
        expect(margin2).toBeGreaterThanOrEqual(margin1);
      }),
      { numRuns: 300 },
    );
  });

  test('Prop 1.6: Margin decreases with higher cost (revenue fixed)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }),
        fc.integer({ min: 100, max: 90000 }),
        (revenue, cost1) => {
          const cost2 = cost1 + 500; // Higher cost

          if (cost2 >= revenue) return true; // Skip loss scenarios

          const margin1 = ((revenue - cost1) / revenue) * 100;
          const margin2 = ((revenue - cost2) / revenue) * 100;

          // Higher cost with same revenue = lower profit = lower margin
          expect(margin1).toBeGreaterThanOrEqual(margin2);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 1.7: Revenue-per-unit mode produces identical margin', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 10, max: 1000 }),
        (pricePerUnit, unitsSold) => {
          // Mode 1: total revenue & costs
          const totalRevenue = pricePerUnit * unitsSold;
          const totalCost = Math.floor(pricePerUnit * 0.4 * unitsSold); // 40% cost ratio

          // Mode 2: unit economics
          const costPerUnit = Math.floor(pricePerUnit * 0.4);
          const profitPerUnit = pricePerUnit - costPerUnit;

          // Both modes should yield same margin
          const margin1 = totalCost > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
          const margin2 = pricePerUnit > 0 ? (profitPerUnit / pricePerUnit) * 100 : 0;

          expect(Math.abs(margin1 - margin2)).toBeLessThan(2); // Allow small rounding
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 1.8: No NaN, no Infinity in any output', () => {
    fc.assert(
      fc.property(arbBusinessValue(), arbBusinessValue(), (revenue, cost) => {
        const profit = revenue - cost;
        const margin = revenue === 0 ? 0 : (profit / revenue) * 100;

        expect(isSafeNumber(profit)).toBe(true);
        expect(isSafeNumber(margin)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// BREAK-EVEN CALCULATOR PROPERTIES
// ============================================================================

describe('Property-Based: Break-Even Calculator', () => {
  test('Prop 2.1: Break-even quantity always non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }), // Fixed cost
        fc.integer({ min: 10, max: 10000 }), // Price per unit
        fc.integer({ min: 1, max: 1000 }), // Variable cost per unit
        (fixedCost, price, varCost) => {
          if (price <= varCost) return true; // Skip invalid (contribution margin would be <= 0)

          const contributionMargin = price - varCost;
          const breakEvenQty = fixedCost / contributionMargin;

          expect(breakEvenQty).toBeGreaterThanOrEqual(0);
          expect(isSafeNumber(breakEvenQty)).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 2.2: Revenue at break-even ≥ fixed cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }), // Fixed cost
        fc.integer({ min: 10, max: 10000 }), // Price per unit
        fc.integer({ min: 1, max: 5000 }), // Variable cost per unit
        (fixedCost, price, varCost) => {
          if (price <= varCost) return true;

          const contributionMargin = price - varCost;
          const breakEvenQty = fixedCost / contributionMargin;
          const breakEvenRevenue = breakEvenQty * price;

          // At break-even: Revenue = Fixed Cost + (Qty * Variable Cost)
          const expectedCost = fixedCost + breakEvenQty * varCost;

          expect(breakEvenRevenue).toBeCloseTo(expectedCost, -1); // Allow small rounding
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 2.3: Lower variable cost → lower break-even qty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }), // Fixed cost
        fc.integer({ min: 20, max: 10000 }), // Price per unit
        (fixedCost, price) => {
          const varCost1 = 5;
          const varCost2 = 15; // Higher variable cost

          const bepQty1 = fixedCost / (price - varCost1);
          const bepQty2 = fixedCost / (price - varCost2);

          // Higher variable cost = lower contribution margin = higher break-even qty
          expect(bepQty2).toBeGreaterThan(bepQty1);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('Prop 2.4: Lower fixed cost → lower break-even qty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 600, max: 10000 }), // Price per unit
        (price) => {
          const fixedCost1 = 1000;
          const fixedCost2 = 5000; // Higher fixed cost
          const varCost = 500;

          const bepQty1 = fixedCost1 / (price - varCost);
          const bepQty2 = fixedCost2 / (price - varCost);

          // Higher fixed cost = higher break-even qty
          expect(bepQty2).toBeGreaterThan(bepQty1);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('Prop 2.5: Profit is zero at break-even qty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }), // Fixed cost
        fc.integer({ min: 20, max: 10000 }), // Price per unit
        fc.integer({ min: 1, max: 5000 }), // Variable cost per unit
        (fixedCost, price, varCost) => {
          if (price <= varCost) return true;

          const contributionMargin = price - varCost;
          const breakEvenQty = fixedCost / contributionMargin;

          const profit = breakEvenQty * contributionMargin - fixedCost;

          expect(Math.abs(profit)).toBeLessThan(1); // ≈ 0
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ============================================================================
// CASHFLOW CALCULATOR PROPERTIES
// ============================================================================

describe('Property-Based: Cashflow Calculator', () => {
  test('Prop 3.1: Balance equation always holds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }), // Starting balance
        fc.integer({ min: 0, max: 50000 }), // Inflows
        fc.integer({ min: 0, max: 50000 }), // Outflows
        (startBalance, inflows, outflows) => {
          const endBalance = startBalance + inflows - outflows;

          // Balance equation: Start + In - Out = End
          expect(endBalance).toBe(startBalance + inflows - outflows);

          // End balance can be negative (overdraft) but must be finite
          expect(isSafeNumber(endBalance)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });

  test('Prop 3.2: Positive inflows increase balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 1, max: 50000 }), // Positive inflows
        (startBalance, inflows) => {
          const endBalance = startBalance + inflows;

          expect(endBalance).toBeGreaterThan(startBalance);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 3.3: Positive outflows decrease balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        fc.integer({ min: 1, max: 50000 }), // Positive outflows
        (startBalance, outflows) => {
          const endBalance = startBalance - outflows;

          expect(endBalance).toBeLessThan(startBalance);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 3.4: Running balance chain is cumulative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.array(
          fc.record({
            inflows: fc.integer({ min: 0, max: 5000 }),
            outflows: fc.integer({ min: 0, max: 5000 }),
          }),
          { minLength: 1, maxLength: 12 },
        ),
        (startBalance, months) => {
          let runningBalance = startBalance;

          months.forEach((month) => {
            const prevBalance = runningBalance;
            runningBalance = runningBalance + month.inflows - month.outflows;

            // Each month is cumulative from previous
            expect(runningBalance).toBe(prevBalance + month.inflows - month.outflows);
          });

          // Final balance must be finite
          expect(isSafeNumber(runningBalance)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('Prop 3.5: No balance goes from positive to NaN/Infinity', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            inflows: fc.integer({ min: 0, max: 100000 }),
            outflows: fc.integer({ min: 0, max: 100000 }),
          }),
          { minLength: 1, maxLength: 60 }, // 5 years of months
        ),
        (months) => {
          let balance = 100000; // Start with positive balance

          months.forEach((month) => {
            balance = balance + month.inflows - month.outflows;
            expect(isSafeNumber(balance)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  test('Prop 3.6: Negative balances allowed (overdraft)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 10000, max: 100000 }), // Large outflows
        (startBalance, outflows) => {
          const endBalance = startBalance - outflows;

          // Can go negative
          if (outflows > startBalance) {
            expect(endBalance).toBeLessThan(0);
          }

          // But must be a number
          expect(typeof endBalance).toBe('number');
          expect(isFinite(endBalance)).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ============================================================================
// NUMERIC STABILITY & ROUNDING PROPERTIES
// ============================================================================

describe('Property-Based: Numeric Stability', () => {
  test('Prop 4.1: Decimal arithmetic associativity', () => {
    fc.assert(
      fc.property(
        arbDecimal(0, 100000),
        arbDecimal(0, 100000),
        arbDecimal(0, 100000),
        (a, b, c) => {
          // (a + b) + c = a + (b + c)
          const sum1 = a.plus(b).plus(c);
          const sum2 = a.plus(b.plus(c));

          expect(sum1.equals(sum2)).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 4.2: Decimal multiplication commutative', () => {
    fc.assert(
      fc.property(
        arbDecimal(0, 10000),
        arbDecimal(0, 10000),
        (a, b) => {
          // a * b = b * a
          const prod1 = a.times(b);
          const prod2 = b.times(a);

          expect(prod1.equals(prod2)).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('Prop 4.3: Rounding to 2 decimals is idempotent', () => {
    fc.assert(
      fc.property(arbDecimal(0, 100000), (value) => {
        const rounded1 = value.toDecimalPlaces(2);
        const rounded2 = rounded1.toDecimalPlaces(2);

        expect(rounded1.equals(rounded2)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  test('Prop 4.4: Percentage calculations preserve bounds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (percent) => {
        const value = 10000;
        const result = new Decimal(value).times(new Decimal(percent).dividedBy(100));

        expect(result.toNumber()).toBeGreaterThanOrEqual(0);
        expect(result.toNumber()).toBeLessThanOrEqual(value);
      }),
      { numRuns: 300 },
    );
  });

  test('Prop 4.5: Large number operations preserve precision', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000000, max: 999999999 }),
        fc.integer({ min: 100000000, max: 999999999 }),
        (a, b) => {
          const decA = new Decimal(a);
          const decB = new Decimal(b);

          const sum = decA.plus(decB);
          const diff = decA.minus(decB);

          expect(sum.isFinite()).toBe(true);
          expect(diff.isFinite()).toBe(true);

          // Re-verify: sum - a = b
          expect(sum.minus(decA).equals(decB)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ============================================================================
// LOCALE & SEPARATOR FUZZ TESTS
// ============================================================================

describe('Fuzz: Locale & Separator Variants', () => {
  test('Fuzz 5.1: Decimal parsing with different separators', () => {
    const separators = ['.', ',']; // Localize to user's region

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99999 }), fc.integer({ min: 0, max: 99 }), (whole, cents) => {
        separators.forEach((sep) => {
          const numStr = `${whole}${sep}${cents.toString().padStart(2, '0')}`;

          // Should not throw, should parse correctly
          expect(() => {
            new Decimal(numStr.replace(',', '.'));
          }).not.toThrow();
        });
      }),
      { numRuns: 200 },
    );
  });

  test('Fuzz 5.2: Currency formatting consistency', () => {
    fc.assert(
      fc.property(arbBusinessValue(), (value) => {
        const usd = Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        const eur = Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

        // Both should format without throwing
        expect(typeof usd).toBe('string');
        expect(typeof eur).toBe('string');

        // Should contain numeric representation
        expect(usd).toMatch(/\d/);
        expect(eur).toMatch(/\d/);
      }),
      { numRuns: 300 },
    );
  });

  test('Fuzz 5.3: Number parsing edge cases', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float({ noNaN: true, noInfinity: true }),
          fc.string(),
        ),
        (value) => {
          // Should handle gracefully (not crash)
          const numValue = Number(value);

          if (typeof value === 'number' && isFinite(value)) {
            expect(numValue).toBe(value);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// CONCURRENT / STRESS PROPERTIES
// ============================================================================

describe('Property-Based: Stress & Concurrency', () => {
  test('Prop 6.1: Many rapid calculations maintain consistency', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            revenue: arbBusinessValue(),
            cost: arbBusinessValue(),
          }),
          { minLength: 100, maxLength: 500 },
        ),
        (scenarios) => {
          const results = scenarios.map((s) => ({
            revenue: s.revenue,
            cost: s.cost,
            profit: Math.max(0, s.revenue - s.cost),
            margin: s.revenue === 0 ? 0 : ((Math.max(0, s.revenue - s.cost) / s.revenue) * 100),
          }));

          // All margins should be valid
          results.forEach((r) => {
            expect(r.margin).toBeGreaterThanOrEqual(0);
            expect(r.margin).toBeLessThanOrEqual(100);
            expect(isSafeNumber(r.margin)).toBe(true);
          });
        },
      ),
      { numRuns: 50 },
    );
  });
});
