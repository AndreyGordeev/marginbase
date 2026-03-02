import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCENARIO_SCHEMA_VERSION,
  migrateScenario,
  validateScenario
} from '../src';

describe('scenario schema validator and migration', () => {
  it('validates a valid v1 scenario', () => {
    const result = validateScenario({
      schemaVersion: 1,
      scenarioId: 'scn_1',
      module: 'profit',
      scenarioName: 'Profit baseline',
      inputData: { unitPriceMinor: 1000 },
      calculatedData: { netProfitMinor: 100 },
      updatedAt: '2026-03-02T10:00:00.000Z'
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.value?.schemaVersion).toBe(1);
  });

  it('rejects unsupported schema version', () => {
    const result = validateScenario({
      schemaVersion: 99,
      scenarioId: 'scn_1',
      module: 'profit',
      scenarioName: 'x',
      inputData: {},
      updatedAt: '2026-03-02T10:00:00.000Z'
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain('SCHEMA_VERSION_UNSUPPORTED');
  });

  it('rejects invalid scenario fields', () => {
    const result = validateScenario({
      schemaVersion: 1,
      scenarioId: '',
      module: 'unknown',
      scenarioName: '',
      inputData: [],
      updatedAt: 'not-a-date'
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(['SCENARIO_ID_REQUIRED', 'MODULE_INVALID', 'SCENARIO_NAME_REQUIRED', 'UPDATED_AT_INVALID'])
    );
  });

  it('migrates legacy v0 scenario to v1', () => {
    const migrated = migrateScenario({
      scenario_id: 'legacy_1',
      module_id: 'breakeven',
      scenario_name: 'Legacy break-even',
      input_data: { fixedCostsMinor: 10000 },
      calculated_data: { breakEvenQuantity: 10 },
      updated_at: '2026-03-02T10:00:00.000Z'
    });

    expect(migrated).toEqual({
      schemaVersion: CURRENT_SCENARIO_SCHEMA_VERSION,
      scenarioId: 'legacy_1',
      module: 'breakeven',
      scenarioName: 'Legacy break-even',
      inputData: { fixedCostsMinor: 10000 },
      calculatedData: { breakEvenQuantity: 10 },
      updatedAt: '2026-03-02T10:00:00.000Z'
    });
  });

  it('throws when migration input has unsupported version', () => {
    expect(() => migrateScenario({ schemaVersion: 7 })).toThrowError(/unsupported/i);
  });
});
