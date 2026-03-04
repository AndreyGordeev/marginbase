import { describe, expect, it } from 'vitest';
import { migrateSnapshot, sanitizeScenarioForShare } from '../src';

describe('snapshot schema', () => {
  it('sanitizes scenario for sharing without scenario metadata', () => {
    const snapshot = sanitizeScenarioForShare({
      schemaVersion: 1,
      scenarioId: 'profit_1',
      module: 'profit',
      scenarioName: 'Private name',
      inputData: {
        unitPriceMinor: 1000,
        quantity: 10,
        currencyCode: 'EUR'
      },
      calculatedData: {
        netProfitMinor: 12345
      },
      updatedAt: '2026-03-04T10:00:00.000Z'
    });

    expect(snapshot).toEqual({
      schemaVersion: 1,
      module: 'profit',
      inputData: {
        unitPriceMinor: 1000,
        quantity: 10,
        currencyCode: 'EUR'
      },
      currencyCode: 'EUR'
    });
    expect('scenarioName' in snapshot).toBe(false);
    expect('scenarioId' in snapshot).toBe(false);
  });

  it('migrates a valid v1 snapshot', () => {
    const migrated = migrateSnapshot({
      schemaVersion: 1,
      module: 'cashflow',
      inputData: {
        startingCashMinor: 100000
      }
    });

    expect(migrated.module).toBe('cashflow');
    expect(migrated.inputData.startingCashMinor).toBe(100000);
  });

  it('rejects unsupported snapshot version', () => {
    expect(() =>
      migrateSnapshot({
        schemaVersion: 99,
        module: 'profit',
        inputData: {}
      })
    ).toThrow(/Unsupported snapshot schemaVersion/i);
  });
});
