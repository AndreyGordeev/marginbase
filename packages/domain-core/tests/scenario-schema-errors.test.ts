import { describe, expect, it } from 'vitest';
import {
  validateScenario,
  importScenariosReplaceAllFromJson,
  createScenarioExport,
} from '../src';

/**
 * Scenario Schema Error Path Coverage Tests
 *
 * Covers uncovered validation error paths in scenario-schema.ts:
 * - Lines 181-288: All validation error branches
 * - Lines 307-314: Import validation edge cases
 *
 * Target: 95%+ branch coverage for validation logic
 */
describe('scenario-schema: validation error paths', () => {
  describe('scenarioId validation', () => {
    it('rejects empty scenarioId', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: '',
        module: 'profit',
        scenarioName: 'Test',
        inputData: { unitPriceMinor: 1000 },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'SCENARIO_ID_REQUIRED',
            path: '$.scenarioId',
          }),
        ]),
      );
    });

    it('rejects whitespace-only scenarioId', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: '   ',
        module: 'profit',
        scenarioName: 'Test',
        inputData: { unitPriceMinor: 1000 },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(false);
      expect(result.errors.map((e) => e.code)).toContain(
        'SCENARIO_ID_REQUIRED',
      );
    });
  });

  describe('module validation', () => {
    it('rejects invalid module name', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'invalid_module',
        scenarioName: 'Test',
        inputData: {},
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MODULE_INVALID',
            path: '$.module',
          }),
        ]),
      );
    });

    it('rejects empty module', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: '',
        scenarioName: 'Test',
        inputData: {},
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(false);
      expect(result.errors.map((e) => e.code)).toContain('MODULE_INVALID');
    });
  });

  describe('scenarioName validation', () => {
    it('rejects empty scenarioName', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: '',
        inputData: { unitPriceMinor: 1000 },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'SCENARIO_NAME_REQUIRED',
            path: '$.scenarioName',
          }),
        ]),
      );
    });

    it('rejects whitespace-only scenarioName', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: '  \t  ',
        inputData: {},
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(false);
      expect(result.errors.map((e) => e.code)).toContain(
        'SCENARIO_NAME_REQUIRED',
      );
    });
  });

  describe('inputData validation', () => {
    it('normalizes non-object inputData to empty object (coercion)', () => {
      // Note: normalizeScenario coerces invalid inputData to {} instead of failing
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: 'not-an-object' as Record<string, unknown>,
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      // Validation passes because normalization coerces to {}
      expect(result.ok).toBe(true);
      expect(result.value?.inputData).toEqual({});
    });

    it('normalizes null inputData to empty object', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: null as Record<string, unknown>,
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.inputData).toEqual({});
    });

    it('normalizes array inputData to empty object', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: [] as Record<string, unknown>,
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.inputData).toEqual({});
    });

    it('accepts valid object inputData', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: { unitPriceMinor: 5000, unitCostMinor: 3000 },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.inputData).toEqual({
        unitPriceMinor: 5000,
        unitCostMinor: 3000,
      });
    });
  });

  describe('updatedAt validation', () => {
    it('rejects non-ISO8601 timestamp', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: {},
        updatedAt: 'not-a-timestamp',
      });

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UPDATED_AT_INVALID',
            path: '$.updatedAt',
          }),
        ]),
      );
    });

    it('rejects malformed date string', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: {},
        updatedAt: '2026-13-45T99:99:99.000Z', // Invalid month/day/time
      });

      expect(result.ok).toBe(false);
      expect(result.errors.map((e) => e.code)).toContain('UPDATED_AT_INVALID');
    });

    it('rejects empty timestamp', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: {},
        updatedAt: '',
      });

      expect(result.ok).toBe(false);
      expect(result.errors.map((e) => e.code)).toContain('UPDATED_AT_INVALID');
    });
  });

  describe('calculatedData validation', () => {
    it('accepts missing calculatedData (optional field)', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: { unitPriceMinor: 1000 },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.calculatedData).toBeUndefined();
    });

    it('normalizes non-object calculatedData to undefined (coercion)', () => {
      // normalizeScenario coerces invalid calculatedData to undefined
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: {},
        calculatedData: 'not-an-object' as Record<string, unknown>,
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.calculatedData).toBeUndefined();
    });

    it('normalizes array calculatedData to undefined', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'cashflow',
        scenarioName: 'Test',
        inputData: {},
        calculatedData: [] as Record<string, unknown>,
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.calculatedData).toBeUndefined();
    });

    it('accepts valid object calculatedData', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: 'scn_test',
        module: 'profit',
        scenarioName: 'Test',
        inputData: {},
        calculatedData: { netProfitMinor: 2000 },
        updatedAt: '2026-03-05T10:00:00.000Z',
      });

      expect(result.ok).toBe(true);
      expect(result.value?.calculatedData).toEqual({ netProfitMinor: 2000 });
    });
  });

  describe('multiple validation errors accumulation', () => {
    it('accumulates all validation errors at once', () => {
      const result = validateScenario({
        schemaVersion: 99,
        scenarioId: '',
        module: 'invalid',
        scenarioName: '',
        inputData: 'not-an-object' as Record<string, unknown>,
        calculatedData: [] as Record<string, unknown>,
        updatedAt: 'not-a-date',
      });

      expect(result.ok).toBe(false);

      // schemaVersion is checked early, so other errors might not appear
      const errorCodes = result.errors.map((e) => e.code);
      expect(errorCodes).toContain('SCHEMA_VERSION_UNSUPPORTED');
    });

    it('accumulates field-level validation errors (valid schemaVersion)', () => {
      const result = validateScenario({
        schemaVersion: 1,
        scenarioId: '',
        module: 'invalid_module',
        scenarioName: '  ',
        inputData: {},
        updatedAt: 'not-a-date',
      });

      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);

      const errorCodes = result.errors.map((e) => e.code);
      expect(errorCodes).toContain('SCENARIO_ID_REQUIRED');
      expect(errorCodes).toContain('MODULE_INVALID');
      expect(errorCodes).toContain('SCENARIO_NAME_REQUIRED');
      expect(errorCodes).toContain('UPDATED_AT_INVALID');
    });
  });
});

describe('scenario-schema: import validation error paths', () => {
  describe('importScenariosReplaceAllFromJson validation', () => {
    it('rejects non-JSON string', () => {
      const result = importScenariosReplaceAllFromJson('not valid json {{{');

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'JSON_INVALID',
          }),
        ]),
      );
    });

    it('rejects JSON without schemaVersion=1', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify({
          schemaVersion: 99,
          scenarios: [],
        }),
      );

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'SCHEMA_VERSION_UNSUPPORTED',
          }),
        ]),
      );
    });

    it('rejects JSON without scenarios array', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify({
          schemaVersion: 1,
          // scenarios missing
        }),
      );

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'SCENARIOS_REQUIRED',
            path: '$.scenarios',
          }),
        ]),
      );
    });

    it('rejects empty scenarios array', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify({
          schemaVersion: 1,
          scenarios: [],
        }),
      );

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'SCENARIOS_EMPTY',
            path: '$.scenarios',
          }),
        ]),
      );
      expect(result.summary.total).toBe(0);
    });

    it('rejects scenarios as non-array', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify({
          schemaVersion: 1,
          scenarios: 'not-an-array',
        }),
      );

      expect(result.ok).toBe(false);
      expect(result.errors.map((e) => e.code)).toContain('SCENARIOS_REQUIRED');
    });

    it('handles partial success with invalid scenarios', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify({
          schemaVersion: 1,
          scenarios: [
            {
              schemaVersion: 1,
              scenarioId: 'valid_1',
              module: 'profit',
              scenarioName: 'Valid',
              inputData: { unitPriceMinor: 1000 },
              updatedAt: '2026-03-05T10:00:00.000Z',
            },
            {
              schemaVersion: 1,
              scenarioId: '', // Invalid
              module: 'invalid',
              scenarioName: '',
              inputData: {},
              updatedAt: 'not-a-date',
            },
          ],
        }),
      );

      expect(result.ok).toBe(false);
      expect(result.scenarios.length).toBe(1); // Only valid scenario imported
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('SCENARIO_INVALID');
      expect(result.errors[0].path).toBe('$.scenarios[1]');
    });

    it('validates all scenarios and accumulates errors', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify({
          schemaVersion: 1,
          scenarios: [
            {
              schemaVersion: 1,
              scenarioId: '',
              module: 'invalid',
              scenarioName: '',
              inputData: 'not-object',
              updatedAt: 'bad-date',
            },
            {
              schemaVersion: 1,
              scenarioId: ' ',
              module: '',
              scenarioName: '  ',
              inputData: [],
              updatedAt: '',
            },
          ],
        }),
      );

      expect(result.ok).toBe(false);
      expect(result.scenarios.length).toBe(0);
      expect(result.errors.length).toBe(2); // Both scenarios invalid
      expect(result.errors.every((e) => e.code === 'SCENARIO_INVALID')).toBe(
        true,
      );
    });
  });

  describe('export and re-import validation', () => {
    it('successfully exports and re-imports valid scenarios', () => {
      const scenarios = [
        {
          schemaVersion: 1 as const,
          scenarioId: 'exp_1',
          module: 'profit' as const,
          scenarioName: 'Export Test',
          inputData: { unitPriceMinor: 5000, unitCostMinor: 3000 },
          calculatedData: { netProfitMinor: 2000 },
          updatedAt: '2026-03-05T10:00:00.000Z',
        },
      ];

      const exported = createScenarioExport(scenarios);
      const json = JSON.stringify(exported);
      const reimported = importScenariosReplaceAllFromJson(json);

      expect(reimported.ok).toBe(true);
      expect(reimported.scenarios.length).toBe(1);
      expect(reimported.scenarios[0].scenarioId).toBe('exp_1');
    });

    it('handles export-import cycle with multiple modules', () => {
      const scenarios = [
        {
          schemaVersion: 1 as const,
          scenarioId: 'prof_1',
          module: 'profit' as const,
          scenarioName: 'Profit',
          inputData: {},
          updatedAt: '2026-03-05T10:00:00.000Z',
        },
        {
          schemaVersion: 1 as const,
          scenarioId: 'be_1',
          module: 'breakeven' as const,
          scenarioName: 'Break-even',
          inputData: {},
          updatedAt: '2026-03-05T10:00:00.000Z',
        },
        {
          schemaVersion: 1 as const,
          scenarioId: 'cf_1',
          module: 'cashflow' as const,
          scenarioName: 'Cashflow',
          inputData: {},
          updatedAt: '2026-03-05T10:00:00.000Z',
        },
      ];

      const exported = createScenarioExport(scenarios);
      const reimported = importScenariosReplaceAllFromJson(
        JSON.stringify(exported),
      );

      expect(reimported.ok).toBe(true);
      expect(reimported.summary.profit).toBe(1);
      expect(reimported.summary.breakeven).toBe(1);
      expect(reimported.summary.cashflow).toBe(1);
      expect(reimported.summary.total).toBe(3);
    });

    it('throws when exporting invalid scenario', () => {
      const invalidScenarios = [
        {
          schemaVersion: 1 as const,
          scenarioId: '',
          module: 'invalid' as Record<string, unknown>,
          scenarioName: '',
          inputData: {},
          updatedAt: 'not-a-date',
        },
      ];

      expect(() => createScenarioExport(invalidScenarios)).toThrow(
        /Cannot export invalid scenario/i,
      );
    });

    it('rejects import when JSON is not an object (array instead)', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify([{ scenarioId: 'test' }]),
      );

      expect(result.ok).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'FILE_NOT_OBJECT',
          }),
        ]),
      );
    });

    it('rejects import when JSON is primitive (string)', () => {
      const result = importScenariosReplaceAllFromJson(
        JSON.stringify('just a string'),
      );

      expect(result.ok).toBe(false);
      expect(result.errors[0].code).toBe('FILE_NOT_OBJECT');
    });
  });
});
