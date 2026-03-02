import { describe, expect, it } from 'vitest';
import {
  WebVaultAccessError,
  SqlitePlaceholderConnection,
  SqlitePlaceholderScenarioRepository
} from '@marginbase/storage';
import { WebAppService } from '../src/web-app-service';

const createLocalStorageMock = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    }
  };
};

const installLocalStorage = (): Storage => {
  const mock = createLocalStorageMock();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: mock
  });

  return mock;
};

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

  it('allows local vault only for paid entitlement', async () => {
    installLocalStorage();

    const repository = new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection());
    const service = new WebAppService(repository);

    expect(service.canUseVault()).toBe(false);
    await expect(service.enableLocalVault('no-paid-entitlement')).rejects.toThrow(/paid entitlements/i);

    service.activateBundle();

    expect(service.canUseVault()).toBe(true);
    await service.enableLocalVault('paid-user-passphrase');
    expect(service.isVaultEnabled()).toBe(true);
  });

  it('encrypts data at repository boundary when vault is enabled', async () => {
    installLocalStorage();

    const repository = new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection());
    const service = new WebAppService(repository);

    service.activateBundle();
    await service.enableLocalVault('vault-passphrase-1');

    await service.saveProfitScenario({
      scenarioName: 'Encrypted web scenario',
      unitPriceMinor: 1500,
      quantity: 10,
      variableCostPerUnitMinor: 700,
      fixedCostsMinor: 1200
    });

    const rawStored = await repository.listScenarios();
    expect(rawStored.length).toBe(1);
    expect(rawStored[0].scenarioName).toBe('__vault_encrypted__');
    expect((rawStored[0].inputData as { unitPriceMinor?: number }).unitPriceMinor).toBeUndefined();

    const decrypted = await service.listScenarios('profit');
    expect(decrypted[0].scenarioName).toBe('Encrypted web scenario');
  });

  it('renders encrypted data inaccessible when passphrase is lost', async () => {
    const localStorageMock = installLocalStorage();

    const repository = new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection());
    const writerService = new WebAppService(repository);
    writerService.activateBundle();
    await writerService.enableLocalVault('correct-passphrase');

    await writerService.saveProfitScenario({
      scenarioName: 'Passphrase loss scenario',
      unitPriceMinor: 1300,
      quantity: 9,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 900
    });

    const readerWithWrongPassphrase = new WebAppService(repository);
    readerWithWrongPassphrase.activateBundle();

    await expect(readerWithWrongPassphrase.enableLocalVault('wrong-passphrase')).rejects.toBeInstanceOf(WebVaultAccessError);
    expect(localStorageMock.getItem('marginbase_vault_salt')).not.toBeNull();
    expect(localStorageMock.getItem('marginbase_vault_salt')).not.toContain('correct-passphrase');
  });

  it('refreshes entitlements with debounce TTL behavior', async () => {
    installLocalStorage();

    let refreshCalls = 0;
    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          refreshCalls += 1;
          return {
            userId: 'user_1',
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
        }
      }
    );

    const firstRefresh = await service.refreshEntitlementsIfNeeded('id-token');
    const secondRefresh = await service.refreshEntitlementsIfNeeded('id-token');

    expect(firstRefresh).toBe(true);
    expect(secondRefresh).toBe(false);
    expect(refreshCalls).toBe(1);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });
});
