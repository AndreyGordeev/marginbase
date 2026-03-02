import { calculateProfit } from '@marginbase/domain-core';
import { describe, expect, it } from 'vitest';
import { SqlitePlaceholderConnection, SqlitePlaceholderScenarioRepository } from '@marginbase/storage';
import { MOBILE_SCREENS } from '../src/main';
import { MOBILE_SCREEN_ROUTES, MobileAppService } from '../src/mobile-app-service';

describe('mobile screen coverage', () => {
  it('implements all routes defined in mobile screen map', () => {
    const implemented = new Set(MOBILE_SCREENS.map((screen) => screen.route));

    for (const route of MOBILE_SCREEN_ROUTES) {
      expect(implemented.has(route)).toBe(true);
    }
  });
});

describe('MobileAppService offline workflow', () => {
  it('supports scenario CRUD offline via repository', async () => {
    const service = new MobileAppService(new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()));

    const scenario = await service.saveProfitScenario({
      scenarioName: 'Mobile Profit',
      unitPriceMinor: 1200,
      quantity: 20,
      variableCostPerUnitMinor: 700,
      fixedCostsMinor: 3000
    });

    expect((await service.listScenarios('profit')).length).toBe(1);

    const duplicate = await service.duplicateScenario(scenario.scenarioId);
    expect(duplicate).not.toBeNull();
    expect((await service.listScenarios('profit')).length).toBe(2);

    await service.deleteScenario(scenario.scenarioId);
    expect((await service.listScenarios('profit')).length).toBe(1);
  });

  it('keeps calculation outputs consistent with domain-core', async () => {
    const service = new MobileAppService(new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()));

    const saved = await service.saveProfitScenario({
      scenarioName: 'Consistency Test',
      unitPriceMinor: 1500,
      quantity: 15,
      variableCostPerUnitMinor: 800,
      fixedCostsMinor: 2000
    });

    const expected = calculateProfit({
      mode: 'unit',
      unitPriceMinor: 1500,
      quantity: 15,
      variableCostPerUnitMinor: 800,
      fixedCostsMinor: 2000
    });

    const calculated = saved.calculatedData ?? {};
    expect(String(calculated.netProfitMinor)).toBe(expected.netProfitMinor.toString());
    expect(String(calculated.revenueTotalMinor)).toBe(expected.revenueTotalMinor.toString());
  });

  it('integrates entitlement gate logic', async () => {
    const service = new MobileAppService(new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()));

    expect(service.canOpenModule('profit')).toBe(true);
    expect(service.canOpenModule('breakeven')).toBe(false);
    expect(service.canOpenModule('cashflow')).toBe(false);

    service.activateBundle();

    expect(service.canOpenModule('profit')).toBe(true);
    expect(service.canOpenModule('breakeven')).toBe(true);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });

  it('exports and imports scenarios with replace-all behavior', async () => {
    const service = new MobileAppService(new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()));

    await service.saveCashflowScenario({
      scenarioName: 'Cashflow A',
      startingCashMinor: 100000,
      baseMonthlyRevenueMinor: 35000,
      fixedMonthlyCostsMinor: 22000,
      variableMonthlyCostsMinor: 8000,
      forecastMonths: 6,
      monthlyGrowthRate: 0.01
    });

    const exported = await service.exportScenariosJson();
    const preview = service.previewImport(exported);
    expect(preview.ok).toBe(true);

    const importResult = await service.applyImport(preview);
    expect(importResult.kind).toBe('import_success');
    expect(importResult.totalScenarios).toBe(1);
    expect((await service.listAllScenarios()).length).toBe(1);
  });
});
