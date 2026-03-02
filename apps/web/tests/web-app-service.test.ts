import { describe, expect, it } from 'vitest';
import {
  SqlitePlaceholderConnection,
  SqlitePlaceholderScenarioRepository
} from '@marginbase/storage';
import { WebAppService } from '../src/web-app-service';

describe('WebAppService', () => {
  it('supports offline scenario create/edit/delete through repository layer', async () => {
    const repository = new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection());
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
    const repository = new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection());
    const service = new WebAppService(repository);

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

  it('applies local entitlement gate behavior', async () => {
    const repository = new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection());
    const service = new WebAppService(repository);

    expect(service.canOpenModule('profit')).toBe(true);
    expect(service.canOpenModule('breakeven')).toBe(false);

    service.activateBundle();

    expect(service.canOpenModule('profit')).toBe(true);
    expect(service.canOpenModule('breakeven')).toBe(true);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });
});
