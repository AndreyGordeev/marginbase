import { describe, it, expect } from 'vitest';
import { validateScenario } from '../src/scenario-schema';

describe('normalizeScenario: V1 schema branches (lines 114-121)', () => {
  it('handles V1 schema with all fields present', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: 'Test',
      inputData: { someKey: 'value' },
      calculatedData: { result: 123 },
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value).toBeDefined();
    expect(result.value?.scenarioId).toBe('scn_test');
    expect(result.value?.module).toBe('profit');
    expect(result.value?.scenarioName).toBe('Test');
    expect(result.value?.inputData).toEqual({ someKey: 'value' });
    expect(result.value?.calculatedData).toEqual({ result: 123 });
  });

  it('handles V1 schema when inputData is not a record (branch line 119)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: 'Test',
      inputData: null, // Not a record
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.inputData).toEqual({}); // Should fall back to empty object
  });

  it('handles V1 schema when inputData is array instead of record (line 119)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: 'Test',
      inputData: [1, 2, 3], // Array, not record
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.inputData).toEqual({}); // Should fall back to empty object
  });

  it('handles V1 schema when calculatedData is missing (branch line 120, first part)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: 'Test',
      inputData: {},
      // calculatedData deliberately omitted
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.calculatedData).toBeUndefined();
  });

  it('handles V1 schema when calculatedData is not a record (line 120, second part)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: 'Test',
      inputData: {},
      calculatedData: 'not-a-record',
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.calculatedData).toBeUndefined();
  });

  it('handles V1 schema when scenarioId is not a string (line 116)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 123, // Not a string
      module: 'profit',
      scenarioName: 'Test',
      inputData: {},
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'SCENARIO_ID_REQUIRED' }),
    );
  });

  it('handles V1 schema when module is not a string (line 117)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: null, // Not a string
      scenarioName: 'Test',
      inputData: {},
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MODULE_INVALID' }),
    );
  });

  it('handles V1 schema when scenarioName is not a string (line 118)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: { name: 'Test' }, // Not a string
      inputData: {},
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'SCENARIO_NAME_REQUIRED' }),
    );
  });

  it('handles V1 schema when scenarioName is empty string (line 121)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: '', // Empty string
      inputData: {},
      updatedAt: '2026-03-05T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'SCENARIO_NAME_REQUIRED' }),
    );
  });

  it('handles V1 schema when updatedAt is not a string (line 121+ for updatedAt)', () => {
    const input = {
      schemaVersion: 1,
      scenarioId: 'scn_test',
      module: 'profit',
      scenarioName: 'Test',
      inputData: {},
      updatedAt: 12345, // Not a string
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'UPDATED_AT_INVALID' }),
    );
  });
});

describe('normalizeScenario: V0 schema branches (lines 130-139)', () => {
  it('handles legacy V0 schema with snake_case fields', () => {
    const input = {
      schemaVersion: 0,
      scenario_id: 'scn_legacy',
      module_id: 'breakeven',
      scenario_name: 'Legacy Test',
      input_data: { legacyKey: 'value' },
      calculated_data: { legacyResult: 456 },
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.scenarioId).toBe('scn_legacy');
    expect(result.value?.module).toBe('breakeven');
    expect(result.value?.scenarioName).toBe('Legacy Test');
    expect(result.value?.inputData).toEqual({ legacyKey: 'value' });
    expect(result.value?.calculatedData).toEqual({ legacyResult: 456 });
  });

  it('handles V0 schema when scenario_id is missing but scenarioId present (branch line 130)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      // scenario_id missing
      scenarioId: 'scn_fallback',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: {},
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.scenarioId).toBe('scn_fallback');
  });

  it('handles V0 schema when input_data is missing but inputData present (branch line 132)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      // input_data missing
      inputData: { camelCaseKey: 'value' },
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.inputData).toEqual({ camelCaseKey: 'value' });
  });

  it('handles V0 schema when both input_data and inputData are missing (line 132)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      // both missing
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.inputData).toEqual({});
  });

  it('handles V0 schema when input_data is not a record and inputData missing (line 132, second part)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: 'not-a-record', // Not a record
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.inputData).toEqual({});
  });

  it('handles V0 schema when calculated_data is missing but calculatedData present (branch line 133, first part)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: {},
      // calculated_data missing
      calculatedData: { camelCaseResult: 789 },
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.calculatedData).toEqual({ camelCaseResult: 789 });
  });

  it('handles V0 schema when calculated_data is not a record but calculatedData is (line 133, second part)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: {},
      calculated_data: 'not-a-record', // Not a record
      calculatedData: { camelCaseResult: 789 },
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.calculatedData).toEqual({ camelCaseResult: 789 });
  });

  it('handles V0 schema when updated_at is missing but updatedAt present (branch line 139)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: {},
      // updated_at missing
      updatedAt: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.updatedAt).toBe('2026-03-04T10:00:00.000Z');
  });

  it('handles V0 schema when module_id is missing but module present (line 131)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      // module_id missing
      module: 'cashflow',
      scenario_name: 'Test',
      input_data: {},
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.module).toBe('cashflow');
  });

  it('handles V0 schema when scenario_name is missing but scenarioName present (line 130)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      // scenario_name missing
      scenarioName: 'Camel Case Test',
      input_data: {},
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    expect(result.value?.scenarioName).toBe('Camel Case Test');
  });

  it('handles V0 schema with both camelCase and snake_case - uses camelCase first (line 130)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_snake',
      scenarioId: 'scn_camel',
      module_id: 'breakeven',
      module: 'profit',
      scenario_name: 'Snake Case Name',
      scenarioName: 'Camel Case Name',
      input_data: {},
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    // CamelCase should be preferred (checked first in ?? chain)
    expect(result.value?.scenarioId).toBe('scn_camel');
    expect(result.value?.scenarioName).toBe('Camel Case Name');
    expect(result.value?.module).toBe('profit');
  });

  it('handles V0 schema when all fallback chains are exhausted (line 130-132)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      // scenarioId (camel) and scenario_id (snake) both missing - should fall back to ''
      // module (camel) and module_id (snake) both missing - should fall back to ''
      // scenarioName (camel) and scenario_name (snake) both missing - should fall back to ''
      input_data: {},
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    // All three IDs are empty strings after fallback, triggering validation errors
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'SCENARIO_ID_REQUIRED' }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MODULE_INVALID' }),
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'SCENARIO_NAME_REQUIRED' }),
    );
  });

  it('handles V0 schema when input_data is not a record but inputData is array (line 132)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: { valid: 'object' },
      inputData: ['should', 'not', 'use'],
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    // input_data is first in chain and is a record, so it should be used
    expect(result.value?.inputData).toEqual({ valid: 'object' });
  });

  it('handles V0 schema when updated_at is not a string but updatedAt is (line 139)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: {},
      updated_at: 123456, // Not a string
      updatedAt: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    // updated_at is not a string, so asString returns falsy,fallback to updatedAt
    expect(result.value?.updatedAt).toBe('2026-03-04T10:00:00.000Z');
  });

  it('handles V0 schema when both updated_at and updatedAt are non-strings (line 139)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: {},
      updated_at: 123456, // Not a string
      updatedAt: null, // Not a string
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'UPDATED_AT_INVALID' }),
    );
  });

  it('handles V0 schema when calculated_data is array instead of record (line 133)', () => {
    const input: Record<string, unknown> = {
      schemaVersion: 0,
      scenario_id: 'scn_test',
      module_id: 'profit',
      scenario_name: 'Test',
      input_data: {},
      calculated_data: [1, 2, 3], // Array, not record
      calculatedData: { valid: 'object' },
      updated_at: '2026-03-04T10:00:00.000Z',
    };

    const result = validateScenario(input);
    expect(result.ok).toBe(true);
    // calculated_data is not a record, so fallback to calculatedData
    expect(result.value?.calculatedData).toEqual({ valid: 'object' });
  });
});
