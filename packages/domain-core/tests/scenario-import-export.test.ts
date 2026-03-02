import { describe, expect, it } from 'vitest';
import {
  createScenarioExport,
  exportScenariosToJson,
  importScenariosReplaceAllFromJson
} from '../src';

const sampleScenarios = [
  {
    schemaVersion: 1 as const,
    scenarioId: 'profit_1',
    module: 'profit' as const,
    scenarioName: 'Profit Scenario',
    inputData: { unitPriceMinor: 1000, quantity: 50 },
    updatedAt: '2026-03-02T10:00:00.000Z'
  },
  {
    schemaVersion: 1 as const,
    scenarioId: 'be_1',
    module: 'breakeven' as const,
    scenarioName: 'BE Scenario',
    inputData: { unitPriceMinor: 1500 },
    updatedAt: '2026-03-02T10:00:00.000Z'
  },
  {
    schemaVersion: 1 as const,
    scenarioId: 'cf_1',
    module: 'cashflow' as const,
    scenarioName: 'CF Scenario',
    inputData: { startingCashMinor: 100000 },
    updatedAt: '2026-03-02T10:00:00.000Z'
  }
];

describe('scenario import/export', () => {
  it('creates export payload with replace-all strategy', () => {
    const payload = createScenarioExport(sampleScenarios, '2026-03-02T12:00:00.000Z');

    expect(payload.schemaVersion).toBe(1);
    expect(payload.replaceStrategy).toBe('replace_all');
    expect(payload.scenarios).toHaveLength(3);
  });

  it('exports and imports scenarios with roundtrip consistency', () => {
    const json = exportScenariosToJson(sampleScenarios, '2026-03-02T12:00:00.000Z');
    const imported = importScenariosReplaceAllFromJson(json);

    expect(imported.ok).toBe(true);
    expect(imported.mode).toBe('replace_all');
    expect(imported.scenarios).toHaveLength(3);
    expect(imported.summary).toEqual({ total: 3, profit: 1, breakeven: 1, cashflow: 1 });
  });

  it('rejects invalid json payload', () => {
    const imported = importScenariosReplaceAllFromJson('not-json');

    expect(imported.ok).toBe(false);
    expect(imported.errors[0].code).toBe('JSON_INVALID');
  });

  it('rejects incompatible file schema version', () => {
    const imported = importScenariosReplaceAllFromJson(
      JSON.stringify({
        schemaVersion: 2,
        replaceStrategy: 'replace_all',
        exportedAt: '2026-03-02T12:00:00.000Z',
        scenarios: sampleScenarios
      })
    );

    expect(imported.ok).toBe(false);
    expect(imported.errors[0].code).toBe('SCHEMA_VERSION_UNSUPPORTED');
  });

  it('rejects empty scenarios list', () => {
    const imported = importScenariosReplaceAllFromJson(
      JSON.stringify({
        schemaVersion: 1,
        replaceStrategy: 'replace_all',
        exportedAt: '2026-03-02T12:00:00.000Z',
        scenarios: []
      })
    );

    expect(imported.ok).toBe(false);
    expect(imported.errors[0].code).toBe('SCENARIOS_EMPTY');
  });

  it('rejects invalid scenario entries', () => {
    const imported = importScenariosReplaceAllFromJson(
      JSON.stringify({
        schemaVersion: 1,
        replaceStrategy: 'replace_all',
        exportedAt: '2026-03-02T12:00:00.000Z',
        scenarios: [
          ...sampleScenarios,
          {
            schemaVersion: 1,
            scenarioId: '',
            module: 'profit',
            scenarioName: '',
            inputData: {},
            updatedAt: '2026-03-02T10:00:00.000Z'
          }
        ]
      })
    );

    expect(imported.ok).toBe(false);
    expect(imported.errors[0].code).toBe('SCENARIO_INVALID');
  });
});
