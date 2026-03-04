import { describe, expect, it } from 'vitest';
import { createRepository, createService } from './helpers/web-app-service-fixtures';
import { WebAppService } from '../src/web-app-service';

describe('WebAppService repository + core scenarios', () => {
  it('supports offline scenario create/edit/delete through repository layer', async () => {
    const repository = createRepository();
    const service = new WebAppService(repository);

    await service.saveProfitScenario({
      scenarioName: 'Profit one',
      unitPriceMinor: 1000,
      quantity: 10,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 1000
    });

    const profitScenarios = await service.listScenarios('profit');
    expect(profitScenarios.length).toBe(1);

    const scenarioId = profitScenarios[0].scenarioId;
    await service.saveProfitScenario({
      scenarioId,
      scenarioName: 'Profit updated',
      unitPriceMinor: 1200,
      quantity: 12,
      variableCostPerUnitMinor: 700,
      fixedCostsMinor: 1100
    });

    const updated = await service.listScenarios('profit');
    expect(updated[0].scenarioName).toBe('Profit updated');

    await service.deleteScenario(scenarioId);
    expect((await service.listScenarios('profit')).length).toBe(0);
  });

  it('exports and imports scenarios using replace-all', async () => {
    const service = createService();

    await service.saveBreakEvenScenario({
      scenarioName: 'BE one',
      unitPriceMinor: 1000,
      variableCostPerUnitMinor: 500,
      fixedCostsMinor: 2000,
      targetProfitMinor: 100,
      plannedQuantity: 15
    });

    const exported = await service.exportScenariosJson();
    const preview = service.previewImport(exported);

    expect(preview.ok).toBe(true);
    expect(preview.mode).toBe('replace_all');
    expect(preview.summary.total).toBe(1);

    await service.applyImport(preview);
    expect((await service.listAllScenarios()).length).toBe(1);
  });

  it('keeps calculations usable when backend endpoints are unavailable', async () => {
    const service = createService({
      refreshEntitlements: async () => {
        throw new Error('backend unavailable');
      },
      deleteAccount: async () => {
        throw new Error('backend unavailable');
      }
    });

    await service.saveProfitScenario({
      scenarioName: 'Offline web calc',
      unitPriceMinor: 1200,
      quantity: 11,
      variableCostPerUnitMinor: 500,
      fixedCostsMinor: 900
    });

    expect((await service.listScenarios('profit')).length).toBe(1);
  });
});
