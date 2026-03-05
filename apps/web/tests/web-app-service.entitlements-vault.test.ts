import { describe, expect, it } from 'vitest';
import { WebVaultAccessError } from '@marginbase/storage';
import { createRepository, createService, installLocalStorage } from './helpers/web-app-service-fixtures';
import { WebAppService } from '../src/web-app-service';

describe('WebAppService entitlements + vault', () => {
  it('applies local entitlement gate behavior', async () => {
    const service = createService();

    expect(service.canOpenModule('profit')).toBe(true);
    expect(service.canOpenModule('breakeven')).toBe(false);

    service.activateBundle();

    expect(service.canOpenModule('profit')).toBe(true);
    expect(service.canOpenModule('breakeven')).toBe(true);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });

  it('allows local vault only for paid entitlement', async () => {
    installLocalStorage();

    const service = createService();

    expect(service.canUseVault()).toBe(false);
    await expect(service.enableLocalVault('no-paid-entitlement')).rejects.toThrow(/paid entitlements/i);

    service.activateBundle();

    expect(service.canUseVault()).toBe(true);
    await service.enableLocalVault('paid-user-passphrase');
    expect(service.isVaultEnabled()).toBe(true);
  });

  it('encrypts data at repository boundary when vault is enabled', async () => {
    installLocalStorage();

    const repository = createRepository();
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

    const repository = createRepository();
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
    const service = createService({
      refreshEntitlements: async () => {
        refreshCalls += 1;
        return {
          userId: 'user_1',
          lastVerifiedAt: '2026-03-05T10:00:00.000Z',
          entitlements: {
            bundle: true,
            profit: true,
            breakeven: true,
            cashflow: true
          },
          trial: {
            active: false,
            expiresAt: '2026-04-01T10:00:00.000Z'
          },
          status: 'active',
          source: 'stripe',
          currentPeriodEnd: null,
          trialEnd: null
        };
      }
    });

    const firstRefresh = await service.refreshEntitlementsIfNeeded('id-token');
    const secondRefresh = await service.refreshEntitlementsIfNeeded('id-token');

    expect(firstRefresh).toBe(true);
    expect(secondRefresh).toBe(false);
    expect(refreshCalls).toBe(1);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });

  it('forces entitlements refresh ignoring debounce gate', async () => {
    installLocalStorage();

    let refreshCalls = 0;
    const service = createService({
      refreshEntitlements: async () => {
        refreshCalls += 1;
        return {
          userId: 'user_1',
          lastVerifiedAt: '2026-03-05T10:00:00.000Z',
          entitlements: {
            bundle: true,
            profit: true,
            breakeven: true,
            cashflow: true
          },
          trial: {
            active: false,
            expiresAt: '2026-04-01T10:00:00.000Z'
          },
          status: 'active',
          source: 'stripe',
          currentPeriodEnd: null,
          trialEnd: null
        };
      }
    });

    const firstRefresh = await service.refreshEntitlementsIfNeeded('id-token');
    const forcedRefresh = await service.forceRefreshEntitlements('id-token');

    expect(firstRefresh).toBe(true);
    expect(forcedRefresh).toBe(true);
    expect(refreshCalls).toBe(2);
    expect(service.canOpenModule('cashflow')).toBe(true);
  });

  it('supports account deletion and resets local entitlement cache', async () => {
    installLocalStorage();

    const service = createService({
      deleteAccount: async () => {
        return {
          deleted: true,
          userId: 'user_1',
          deletedEntitlements: true,
          deletedUserProfile: true
        };
      }
    });

    service.activateBundle();
    expect(service.canOpenModule('cashflow')).toBe(true);

    const deleted = await service.deleteAccount('user_1');
    expect(deleted).toBe(true);
    expect(service.canOpenModule('cashflow')).toBe(false);
  });
});
