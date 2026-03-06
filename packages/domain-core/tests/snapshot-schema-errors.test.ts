import { describe, expect, it } from 'vitest';
import { migrateSnapshot, sanitizeScenarioForShare } from '../src';

/**
 * Snapshot Schema Error Path Coverage Tests
 *
 * Covers uncovered validation error paths in snapshot-schema.ts:
 * - Lines 27-28: null/undefined/array snapshot validation
 * - Lines 39-40: invalid module validation
 * - Lines 44-45: null/undefined/array inputData validation
 *
 * Target: 95%+ coverage for snapshot-schema.ts (from 82.85%)
 */
describe('snapshot-schema: error paths', () => {
  describe('migrateSnapshot validation', () => {
    it('rejects null snapshot', () => {
      expect(() => migrateSnapshot(null as Record<string, unknown>)).toThrow(
        /Snapshot must be an object/i,
      );
    });

    it('rejects undefined snapshot', () => {
      expect(() =>
        migrateSnapshot(undefined as Record<string, unknown>),
      ).toThrow(/Snapshot must be an object/i);
    });

    it('rejects array as snapshot', () => {
      expect(() =>
        migrateSnapshot([
          { schemaVersion: 1, module: 'profit', inputData: {} },
        ] as Record<string, unknown>),
      ).toThrow(/Snapshot must be an object/i);
    });

    it('rejects primitive string as snapshot', () => {
      expect(() =>
        migrateSnapshot('not-an-object' as Record<string, unknown>),
      ).toThrow(/Snapshot must be an object/i);
    });

    it('rejects primitive number as snapshot', () => {
      expect(() => migrateSnapshot(123 as Record<string, unknown>)).toThrow(
        /Snapshot must be an object/i,
      );
    });

    it('rejects snapshot with invalid module', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: 'invalid_module',
          inputData: {},
        }),
      ).toThrow(/Snapshot module must be one of profit, breakeven, cashflow/i);
    });

    it('rejects snapshot with empty module string', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: '',
          inputData: {},
        }),
      ).toThrow(/Snapshot module must be one of profit, breakeven, cashflow/i);
    });

    it('rejects snapshot with null module', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: null,
          inputData: {},
        }),
      ).toThrow(/Snapshot module must be one of profit, breakeven, cashflow/i);
    });

    it('rejects snapshot with missing inputData', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: 'profit',
          // inputData missing
        }),
      ).toThrow(/Snapshot inputData must be an object/i);
    });

    it('rejects snapshot with null inputData', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: 'profit',
          inputData: null,
        }),
      ).toThrow(/Snapshot inputData must be an object/i);
    });

    it('rejects snapshot with undefined inputData', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: 'profit',
          inputData: undefined,
        }),
      ).toThrow(/Snapshot inputData must be an object/i);
    });

    it('rejects snapshot with array as inputData', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: 'profit',
          inputData: [],
        }),
      ).toThrow(/Snapshot inputData must be an object/i);
    });

    it('rejects snapshot with primitive string as inputData', () => {
      expect(() =>
        migrateSnapshot({
          schemaVersion: 1,
          module: 'profit',
          inputData: 'not-an-object',
        }),
      ).toThrow(/Snapshot inputData must be an object/i);
    });
  });

  describe('migrateSnapshot success cases', () => {
    it('migrates snapshot without currencyCode (optional field)', () => {
      const result = migrateSnapshot({
        schemaVersion: 1,
        module: 'profit',
        inputData: {
          unitPriceMinor: 1000,
        },
      });

      expect(result.currencyCode).toBeUndefined();
      expect(result.inputData).toEqual({ unitPriceMinor: 1000 });
    });

    it('migrates snapshot with non-string currencyCode to undefined', () => {
      const result = migrateSnapshot({
        schemaVersion: 1,
        module: 'breakeven',
        inputData: {},
        currencyCode: 123, // Not a string
      });

      expect(result.currencyCode).toBeUndefined();
    });

    it('migrates snapshot with null currencyCode to undefined', () => {
      const result = migrateSnapshot({
        schemaVersion: 1,
        module: 'cashflow',
        inputData: {},
        currencyCode: null,
      });

      expect(result.currencyCode).toBeUndefined();
    });

    it('preserves valid string currencyCode', () => {
      const result = migrateSnapshot({
        schemaVersion: 1,
        module: 'profit',
        inputData: {},
        currencyCode: 'USD',
      });

      expect(result.currencyCode).toBe('USD');
    });

    it('migrates breakeven snapshot successfully', () => {
      const result = migrateSnapshot({
        schemaVersion: 1,
        module: 'breakeven',
        inputData: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 2000,
        },
      });

      expect(result.module).toBe('breakeven');
      expect(result.inputData).toEqual({
        unitPriceMinor: 1000,
        variableCostPerUnitMinor: 600,
        fixedCostsMinor: 2000,
      });
    });

    it('migrates cashflow snapshot successfully', () => {
      const result = migrateSnapshot({
        schemaVersion: 1,
        module: 'cashflow',
        inputData: {
          startingCashMinor: 10000,
          forecastMonths: 12,
        },
        currencyCode: 'GBP',
      });

      expect(result.module).toBe('cashflow');
      expect(result.currencyCode).toBe('GBP');
    });
  });

  describe('sanitizeScenarioForShare', () => {
    it('omits calculatedData from shared snapshot', () => {
      const snapshot = sanitizeScenarioForShare({
        schemaVersion: 1,
        scenarioId: 'test_1',
        module: 'profit',
        scenarioName: 'Private',
        inputData: { unitPriceMinor: 1000 },
        calculatedData: { netProfitMinor: 5000 },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect('calculatedData' in snapshot).toBe(false);
      expect('scenarioName' in snapshot).toBe(false);
      expect('scenarioId' in snapshot).toBe(false);
      expect('updatedAt' in snapshot).toBe(false);
    });

    it('extracts currencyCode from inputData if present', () => {
      const snapshot = sanitizeScenarioForShare({
        schemaVersion: 1,
        scenarioId: 'test_1',
        module: 'breakeven',
        scenarioName: 'Test',
        inputData: {
          unitPriceMinor: 1000,
          currencyCode: 'JPY',
        },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(snapshot.currencyCode).toBe('JPY');
    });

    it('omits currencyCode if not string in inputData', () => {
      const snapshot = sanitizeScenarioForShare({
        schemaVersion: 1,
        scenarioId: 'test_1',
        module: 'profit',
        scenarioName: 'Test',
        inputData: {
          unitPriceMinor: 1000,
          currencyCode: 123, // Not a string
        },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(snapshot.currencyCode).toBeUndefined();
    });

    it('handles scenario with nested objects in inputData', () => {
      const snapshot = sanitizeScenarioForShare({
        schemaVersion: 1,
        scenarioId: 'test_1',
        module: 'cashflow',
        scenarioName: 'Test',
        inputData: {
          startingCashMinor: 10000,
          metadata: { source: 'import', version: 2 },
          currencyCode: 'EUR',
        },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(snapshot.inputData.metadata).toEqual({
        source: 'import',
        version: 2,
      });
      expect(snapshot.currencyCode).toBe('EUR');
    });

    it('preserves all inputData fields including arrays', () => {
      const snapshot = sanitizeScenarioForShare({
        schemaVersion: 1,
        scenarioId: 'test_1',
        module: 'cashflow',
        scenarioName: 'Test',
        inputData: {
          monthlyData: [100, 200, 300],
          currencyCode: 'EUR',
        },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(snapshot.inputData.monthlyData).toEqual([100, 200, 300]);
    });
  });

  describe('roundtrip: sanitize → migrate', () => {
    it('successfully sanitizes and migrates profit scenario', () => {
      const original = {
        schemaVersion: 1 as const,
        scenarioId: 'profit_test',
        module: 'profit' as const,
        scenarioName: 'Original Scenario',
        inputData: {
          unitPriceMinor: 5000,
          quantity: 20,
          currencyCode: 'USD',
        },
        calculatedData: { netProfitMinor: 10000 },
        updatedAt: '2026-03-05T12:00:00.000Z',
      };

      const sanitized = sanitizeScenarioForShare(original);
      const migrated = migrateSnapshot(sanitized);

      expect(migrated.module).toBe('profit');
      expect(migrated.inputData.unitPriceMinor).toBe(5000);
      expect(migrated.inputData.quantity).toBe(20);
      expect(migrated.currencyCode).toBe('USD');
    });

    it('successfully sanitizes and migrates breakeven scenario', () => {
      const original = {
        schemaVersion: 1 as const,
        scenarioId: 'be_test',
        module: 'breakeven' as const,
        scenarioName: 'Breakeven Test',
        inputData: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 600,
          fixedCostsMinor: 3000,
          currencyCode: 'GBP',
        },
        updatedAt: '2026-03-05T12:00:00.000Z',
      };

      const sanitized = sanitizeScenarioForShare(original);
      const migrated = migrateSnapshot(sanitized);

      expect(migrated.module).toBe('breakeven');
      expect(migrated.currencyCode).toBe('GBP');
    });

    it('successfully sanitizes and migrates cashflow scenario', () => {
      const original = {
        schemaVersion: 1 as const,
        scenarioId: 'cf_test',
        module: 'cashflow' as const,
        scenarioName: 'Cashflow Test',
        inputData: {
          startingCashMinor: 50000,
          forecastMonths: 6,
          currencyCode: 'EUR',
        },
        updatedAt: '2026-03-05T12:00:00.000Z',
      };

      const sanitized = sanitizeScenarioForShare(original);
      const migrated = migrateSnapshot(sanitized);

      expect(migrated.module).toBe('cashflow');
      expect(migrated.inputData.forecastMonths).toBe(6);
      expect(migrated.currencyCode).toBe('EUR');
    });
  });
});
