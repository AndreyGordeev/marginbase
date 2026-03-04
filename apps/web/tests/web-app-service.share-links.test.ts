import { describe, expect, it, vi } from 'vitest';
import { createService, installLocalStorage } from './helpers/web-app-service-fixtures';

describe('WebAppService share links', () => {
  it('creates encrypted share snapshot payload for backend storage', async () => {
    const createShareSnapshot = vi.fn(async ({ encryptedSnapshot }: { encryptedSnapshot: { schemaVersion: number; algorithm: string; ivBase64Url: string; ciphertextBase64Url: string } }) => {
      expect(encryptedSnapshot.schemaVersion).toBe(1);
      expect(encryptedSnapshot.algorithm).toBe('A256GCM');
      expect(encryptedSnapshot.ivBase64Url.length).toBeGreaterThan(10);
      expect(encryptedSnapshot.ciphertextBase64Url.length).toBeGreaterThan(10);
      return {
        token: 'share_123',
        expiresAt: '2026-04-03T10:00:00.000Z'
      };
    });

    const service = createService({ createShareSnapshot });

    await service.saveProfitScenario({
      scenarioName: 'Share me',
      unitPriceMinor: 1000,
      quantity: 4,
      variableCostPerUnitMinor: 500,
      fixedCostsMinor: 300
    });

    const scenario = (await service.listScenarios('profit'))[0];
    const result = await service.createShareSnapshotFromScenario(scenario);

    expect(result.token).toBe('share_123');
    expect(result.shareKey.length).toBeGreaterThan(20);
    expect(createShareSnapshot).toHaveBeenCalledTimes(1);
  });

  it('loads shared scenario and computes results locally', async () => {
    const service = createService({
      getShareSnapshot: async () => {
        return {
          snapshot: {
            schemaVersion: 1,
            module: 'breakeven',
            inputData: {
              unitPriceMinor: 1000,
              variableCostPerUnitMinor: 600,
              fixedCostsMinor: 1000,
              targetProfitMinor: 0,
              plannedQuantity: 10
            }
          }
        };
      }
    });

    const shared = await service.getSharedScenarioView('token_1');

    expect(shared.module).toBe('breakeven');
    expect(shared.calculatedData.breakEvenQuantity).toBeDefined();
  });

  it('decrypts encrypted shared snapshot using link key from location hash', async () => {
    let encryptedPayload: {
      schemaVersion: number;
      algorithm: 'A256GCM';
      ivBase64Url: string;
      ciphertextBase64Url: string;
    } | null = null;
    let linkKey = '';

    const creatorService = createService({
      createShareSnapshot: async ({ encryptedSnapshot }) => {
        encryptedPayload = encryptedSnapshot;
        return {
          token: 'enc_token_1',
          expiresAt: '2026-04-03T10:00:00.000Z'
        };
      }
    });

    await creatorService.saveProfitScenario({
      scenarioName: 'Encrypted share',
      unitPriceMinor: 1000,
      quantity: 12,
      variableCostPerUnitMinor: 500,
      fixedCostsMinor: 400
    });

    const sourceScenario = (await creatorService.listScenarios('profit'))[0];
    const created = await creatorService.createShareSnapshotFromScenario(sourceScenario);
    linkKey = created.shareKey;

    const originalWindow = (globalThis as { window?: unknown }).window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        location: {
          hash: `#k=${linkKey}`
        }
      }
    });

    const readerService = createService({
      getShareSnapshot: async () => {
        return {
          encryptedSnapshot: encryptedPayload ?? undefined
        };
      }
    });

    const shared = await readerService.getSharedScenarioView('enc_token_1');
    expect(shared.module).toBe('profit');
    expect(shared.inputData.unitPriceMinor).toBe(1000);

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: originalWindow
    });
  });

  it('requires sign-in to import shared scenarios', async () => {
    installLocalStorage();

    const service = createService({
      getShareSnapshot: async () => {
        return {
          snapshot: {
            schemaVersion: 1,
            module: 'profit',
            inputData: {
              unitPriceMinor: 1000,
              quantity: 10,
              variableCostPerUnitMinor: 600,
              fixedCostsMinor: 1000
            }
          }
        };
      }
    });

    await expect(service.importSharedScenario('token_1')).rejects.toThrow(/sign in/i);
  });

  it('imports and saves shared scenarios with sign-in and entitlement policy', async () => {
    const localStorageMock = installLocalStorage();
    localStorageMock.setItem('marginbase_signed_in', 'true');

    const service = createService({
      getShareSnapshot: async () => {
        return {
          snapshot: {
            schemaVersion: 1,
            module: 'breakeven',
            inputData: {
              unitPriceMinor: 1000,
              variableCostPerUnitMinor: 600,
              fixedCostsMinor: 1000,
              plannedQuantity: 10,
              targetProfitMinor: 0
            }
          }
        };
      }
    });

    await service.importSharedScenario('token_2');
    expect((await service.listScenarios('breakeven')).length).toBe(1);

    await expect(service.saveSharedScenario('token_2')).rejects.toThrow(/entitlement/i);

    service.activateBundle();
    await service.saveSharedScenario('token_2');
    expect((await service.listScenarios('breakeven')).length).toBe(2);
  });

  it('deletes share snapshot via api client when available', async () => {
    const deleteShareSnapshot = vi.fn(async () => {
      return { revoked: true, token: 'token_del' };
    });

    const service = createService({ deleteShareSnapshot });

    const deleted = await service.deleteShareSnapshot('token_del');
    expect(deleted).toBe(true);
    expect(deleteShareSnapshot).toHaveBeenCalledWith('token_del', undefined);
  });

  it('lists and revokes my share snapshots when signed in', async () => {
    const localStorageMock = installLocalStorage();
    localStorageMock.setItem('marginbase_signed_in', 'true');
    localStorageMock.setItem('marginbase_signed_in_user_id', 'local_web_user');

    const listShareSnapshots = vi.fn(async () => {
      return {
        items: [
          {
            token: 'share_1',
            module: 'profit',
            createdAt: '2026-03-04T10:00:00.000Z',
            expiresAt: '2026-04-03T10:00:00.000Z'
          }
        ]
      };
    });

    const deleteShareSnapshot = vi.fn(async () => {
      return {
        revoked: true,
        token: 'share_1'
      };
    });

    const service = createService({
      listShareSnapshots,
      deleteShareSnapshot
    });

    const items = await service.listMyShareSnapshots();
    expect(items).toHaveLength(1);
    expect(listShareSnapshots).toHaveBeenCalledWith('local_web_user');

    const revoked = await service.revokeMyShareSnapshot('share_1');
    expect(revoked).toBe(true);
    expect(deleteShareSnapshot).toHaveBeenCalledWith('share_1', undefined);
  });
});
