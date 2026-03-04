import { calculateProfit, exportScenariosToJson, importScenariosReplaceAllFromJson } from '@marginbase/domain-core';
import { indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { IndexedDbConnection, IndexedDbScenarioRepository } from '../src';

describe('storage + domain-core roundtrip integration', () => {
  beforeEach(() => {
    globalThis.indexedDB = indexedDB;
  });

  it('saves, loads, computes and roundtrips scenarios through export/import', async () => {
    const sourceConnection = new IndexedDbConnection(`integration-src-${Date.now()}`);
    const sourceRepository = new IndexedDbScenarioRepository(sourceConnection);

    const scenario = {
      schemaVersion: 1 as const,
      scenarioId: 'profit_roundtrip_1',
      module: 'profit' as const,
      scenarioName: 'Roundtrip Profit Scenario',
      inputData: {
        mode: 'unit',
        unitPriceMinor: 2000,
        quantity: 100,
        variableCostPerUnitMinor: 1200,
        fixedCostsMinor: 30000,
        additionalVariableCostsMinor: 5000
      },
      updatedAt: '2026-03-04T10:00:00.000Z'
    };

    await sourceRepository.upsertScenario(scenario);

    const loaded = await sourceRepository.getScenarioById('profit_roundtrip_1');
    expect(loaded).not.toBeNull();

    const computed = calculateProfit(loaded!.inputData as Parameters<typeof calculateProfit>[0]);
    expect(computed.netProfitMinor.toString()).toBe('45000');

    const sourceScenarios = await sourceRepository.listScenarios();
    const exportJson = exportScenariosToJson(sourceScenarios, '2026-03-04T10:05:00.000Z');
    const imported = importScenariosReplaceAllFromJson(exportJson);

    expect(imported.ok).toBe(true);
    expect(imported.summary.total).toBe(1);
    expect(imported.summary.profit).toBe(1);

    const targetConnection = new IndexedDbConnection(`integration-dst-${Date.now()}`);
    const targetRepository = new IndexedDbScenarioRepository(targetConnection);
    await targetRepository.replaceAllScenarios(imported.scenarios);

    const reloaded = await targetRepository.getScenarioById('profit_roundtrip_1');
    expect(reloaded?.scenarioName).toBe('Roundtrip Profit Scenario');

    const recomputed = calculateProfit(reloaded!.inputData as Parameters<typeof calculateProfit>[0]);
    expect(recomputed.netProfitMinor.toString()).toBe(computed.netProfitMinor.toString());
  });
});
