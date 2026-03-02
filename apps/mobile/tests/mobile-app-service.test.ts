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
  it('supports iOS and Android purchase flows and unlocks subscription gating', async () => {
    const service = new MobileAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used in this test');
        },
        verifyBillingPurchase: async (request) => {
          return {
            verified: true,
            userId: request.userId,
            lastVerifiedAt: '2026-03-02T10:00:00.000Z',
            entitlements: {
              bundle: true,
              profit: true,
              breakeven: true,
              cashflow: true
            },
            subscription: {
              platform: request.platform,
              productId: request.productId,
              status: 'active',
              expiresAt: '2026-04-01T10:00:00.000Z'
            }
          };
        },
        deleteAccount: async () => {
          return { deleted: true };
        }
      }
    );

    const iosResult = await service.verifyPurchaseOnDevice({
      userId: 'user-1',
      platform: 'ios',
      productId: 'bundle_monthly',
      receiptToken: 'ios:valid:receipt-1'
    });

    const androidResult = await service.verifyPurchaseOnDevice({
      userId: 'user-1',
      platform: 'android',
      productId: 'bundle_monthly',
      receiptToken: 'android:valid:receipt-1'
    });

    expect(iosResult.verified).toBe(true);
    expect(androidResult.verified).toBe(true);
    expect(service.canOpenModule('breakeven')).toBe(true);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });

  it('refreshes entitlements with correct TTL debounce behavior', async () => {
    let refreshCalls = 0;
    const now = new Date('2026-03-02T10:00:00.000Z');

    const service = new MobileAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          refreshCalls += 1;
          return {
            userId: 'user-1',
            lastVerifiedAt: '2026-03-02T10:00:00.000Z',
            entitlements: {
              bundle: true,
              profit: true,
              breakeven: true,
              cashflow: true
            },
            trial: {
              active: false,
              expiresAt: '2026-04-01T10:00:00.000Z'
            }
          };
        },
        verifyBillingPurchase: async () => {
          throw new Error('not used in this test');
        },
        deleteAccount: async () => {
          return { deleted: true };
        }
      },
      () => now
    );

    const firstRefresh = await service.refreshEntitlementsIfNeeded('id-token');
    const secondRefresh = await service.refreshEntitlementsIfNeeded('id-token');

    expect(firstRefresh).toBe(true);
    expect(secondRefresh).toBe(false);
    expect(refreshCalls).toBe(1);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });

  it('keeps calculations usable when backend refresh endpoints are unavailable', async () => {
    const service = new MobileAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('backend unavailable');
        },
        verifyBillingPurchase: async () => {
          throw new Error('backend unavailable');
        },
        deleteAccount: async () => {
          throw new Error('backend unavailable');
        }
      }
    );

    await service.saveCashflowScenario({
      scenarioName: 'Offline still works',
      startingCashMinor: 50000,
      baseMonthlyRevenueMinor: 20000,
      fixedMonthlyCostsMinor: 14000,
      variableMonthlyCostsMinor: 3000,
      forecastMonths: 6,
      monthlyGrowthRate: 0.02
    });

    expect((await service.listScenarios('cashflow')).length).toBe(1);
  });

  it('keeps app workflow functional with encrypted default storage', async () => {
    const service = await MobileAppService.createDefault();

    await service.saveProfitScenario({
      scenarioName: 'Encrypted default storage scenario',
      unitPriceMinor: 900,
      quantity: 30,
      variableCostPerUnitMinor: 500,
      fixedCostsMinor: 4000
    });

    expect((await service.listScenarios('profit')).length).toBe(1);
  });

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
