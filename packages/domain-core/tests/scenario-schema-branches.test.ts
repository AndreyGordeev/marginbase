import { describe, expect, it } from 'vitest';
import { migrateScenario, validateScenario, ScenarioAnyVersion } from '../src';

describe('scenario schema: branch coverage', () => {
  it('migrateScenario throws for non-object payloads', () => {
    expect(() =>
      migrateScenario(null as unknown as Record<string, unknown>),
    ).toThrowError(/Unsupported or invalid scenario schema version/i);
    expect(() =>
      migrateScenario('invalid' as unknown as Record<string, unknown>),
    ).toThrowError(/Unsupported or invalid scenario schema version/i);
  });

  it('migrates legacy v0 with calculatedData object branch', () => {
    const migrated = migrateScenario({
      schemaVersion: 0,
      scenario_id: 'legacy_1',
      module_id: 'profit',
      scenario_name: 'Legacy Scenario',
      input_data: { unitPriceMinor: 1000 },
      calculated_data: { netProfitMinor: 500 },
      updated_at: '2026-03-05T12:00:00.000Z',
    });

    expect(migrated.calculatedData).toEqual({ netProfitMinor: 500 });
  });

  it('migrates legacy v0 and coerces invalid calculatedData to undefined', () => {
    const migrated = migrateScenario({
      schemaVersion: 0,
      scenario_id: 'legacy_2',
      module_id: 'profit',
      scenario_name: 'Legacy Scenario',
      input_data: { unitPriceMinor: 1000 },
      calculated_data: 'invalid',
      updated_at: '2026-03-05T12:00:00.000Z',
    });

    expect(migrated.calculatedData).toBeUndefined();
  });

  it('migrates legacy v0 with camelCase calculatedData field', () => {
    const migrated = migrateScenario({
      schemaVersion: 0,
      scenario_id: 'legacy_3',
      module_id: 'profit',
      scenario_name: 'Legacy Scenario',
      input_data: { unitPriceMinor: 1000 },
      calculatedData: { netProfitMinor: 700 },
      updated_at: '2026-03-05T12:00:00.000Z',
    });

    expect(migrated.calculatedData).toEqual({ netProfitMinor: 700 });
  });

  it('validateScenario returns NOT_OBJECT for non-object input', () => {
    const result = validateScenario(null as unknown as Record<string, unknown>);

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe('NOT_OBJECT');
  });

  it('validateScenario returns early when schemaVersion is missing', () => {
    const result = validateScenario({
      scenarioId: 'scn_1',
      module: 'profit',
      scenarioName: 'Test',
      inputData: { unitPriceMinor: 1000 },
      updatedAt: '2026-03-05T12:00:00.000Z',
    } as ScenarioAnyVersion);

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain(
      'SCHEMA_VERSION_REQUIRED',
    );
  });
});
