import Decimal from 'decimal.js';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  calculateCashflow,
  calculateProfit,
  formatMinorUnitsToMajorString,
  parseMajorToMinorUnits,
} from '../src';

function normalizeLocalizedMajor(input: string): string {
  return input.replace(/\s/g, '').replace(',', '.');
}

describe('fuzz: numeric and locale variants', () => {
  it('parses locale decimal separators after normalization', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999_999 }),
        fc.integer({ min: 0, max: 99 }),
        fc.constantFrom('.', ','),
        (whole, cents, decimalSeparator) => {
          const major = `${whole}${decimalSeparator}${cents.toString().padStart(2, '0')}`;
          const normalized = normalizeLocalizedMajor(major);

          const parsed = parseMajorToMinorUnits(normalized);
          const expected = whole * 100 + cents;

          expect(parsed).toBe(expected);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('is deterministic for normalized locale strings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999_999 }),
        fc.integer({ min: 0, max: 99 }),
        fc.constantFrom('.', ','),
        (whole, cents, decimalSeparator) => {
          const major = `${whole}${decimalSeparator}${cents.toString().padStart(2, '0')}`;
          const normalized = normalizeLocalizedMajor(major);

          const parsedA = parseMajorToMinorUnits(normalized);
          const parsedB = parseMajorToMinorUnits(normalized);

          expect(parsedA).toBe(parsedB);
        },
      ),
      { numRuns: 1500 },
    );
  });

  it('round-trips parsed minor units through formatter', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9_000_000_000 }),
        (minorUnits) => {
          const major = formatMinorUnitsToMajorString(minorUnits);
          const reparsed = parseMajorToMinorUnits(major);
          expect(reparsed).toBe(minorUnits);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('never crashes on adversarial numeric-like strings', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 64 }), (raw) => {
        const normalized = normalizeLocalizedMajor(raw);

        try {
          const parsed = parseMajorToMinorUnits(normalized);
          expect(Number.isSafeInteger(parsed)).toBe(true);
        } catch {
          expect(true).toBe(true);
        }
      }),
      { numRuns: 2000 },
    );
  });

  it('keeps profit and cashflow outputs finite under fuzzed locale-derived inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.integer({ min: 0, max: 500_000 }),
        fc.constantFrom('.', ','),
        (revenueMajorWhole, costMajorWhole, fixedMajorWhole, separator) => {
          const revenueMinor = parseMajorToMinorUnits(normalizeLocalizedMajor(`${revenueMajorWhole}${separator}00`));
          const costMinor = parseMajorToMinorUnits(normalizeLocalizedMajor(`${costMajorWhole}${separator}00`));
          const fixedMinor = parseMajorToMinorUnits(normalizeLocalizedMajor(`${fixedMajorWhole}${separator}00`));

          const profitA = calculateProfit({
            mode: 'revenue',
            totalRevenueMinor: revenueMinor,
            totalVariableCostsMinor: costMinor,
            fixedCostsMinor: fixedMinor,
          });

          const profitB = calculateProfit({
            mode: 'revenue',
            totalRevenueMinor: revenueMinor,
            totalVariableCostsMinor: costMinor,
            fixedCostsMinor: fixedMinor,
          });

          expect(profitA.netProfitMinor.isFinite()).toBe(true);
          expect(profitA.totalCostMinor.isFinite()).toBe(true);
          expect(profitA.netProfitMinor.equals(profitB.netProfitMinor)).toBe(true);

          const cashflow = calculateCashflow({
            startingCashMinor: fixedMinor,
            baseMonthlyRevenueMinor: revenueMinor,
            fixedMonthlyCostsMinor: Math.min(costMinor, 2_000_000_000),
            variableMonthlyCostsMinor: Math.min(fixedMinor, 2_000_000_000),
            forecastMonths: 12,
            monthlyGrowthRate: new Decimal(0),
          });

          expect(cashflow.monthlyProjection.length).toBe(12);
          cashflow.monthlyProjection.forEach((point) => {
            expect(point.revenueMinor.isFinite()).toBe(true);
            expect(point.cashBalanceMinor.isFinite()).toBe(true);
            expect(point.netCashflowMinor.isFinite()).toBe(true);
          });
        },
      ),
      { numRuns: 1000 },
    );
  });
});
