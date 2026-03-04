import { describe, expect, it, vi } from 'vitest';
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
        },
        deleteAccount: async () => {
          return {
            deleted: true,
            userId: 'user_1',
            deletedEntitlements: true,
            deletedUserProfile: true
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

  it('supports account deletion and resets local entitlement cache', async () => {
    installLocalStorage();

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          return {
            deleted: true,
            userId: 'user_1',
            deletedEntitlements: true,
            deletedUserProfile: true
          };
        }
      }
    );

    service.activateBundle();
    expect(service.canOpenModule('cashflow')).toBe(true);

    const deleted = await service.deleteAccount('user_1');
    expect(deleted).toBe(true);
    expect(service.canOpenModule('cashflow')).toBe(false);
  });

  it('keeps calculations usable when backend endpoints are unavailable', async () => {
    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('backend unavailable');
        },
        deleteAccount: async () => {
          throw new Error('backend unavailable');
        }
      }
    );

    await service.saveProfitScenario({
      scenarioName: 'Offline web calc',
      unitPriceMinor: 1200,
      quantity: 11,
      variableCostPerUnitMinor: 500,
      fixedCostsMinor: 900
    });

    expect((await service.listScenarios('profit')).length).toBe(1);
  });

  it('emits embed telemetry events with allowlisted attributes only', async () => {
    installLocalStorage();

    const sendTelemetryBatch = vi.fn(async () => {
      return {
        accepted: true,
        count: 1,
        objectKey: '2026/03/04/anonymous/test.json'
      };
    });

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
        sendTelemetryBatch
      }
    );

    service.setTelemetryConsent(true);

    await service.trackEmbedOpened('profit', true);
    await service.trackEmbedCtaClicked('profit');

    expect(sendTelemetryBatch).toHaveBeenCalledTimes(2);
    expect(sendTelemetryBatch).toHaveBeenNthCalledWith(1, {
      userId: 'anonymous',
      events: [
        expect.objectContaining({
          name: 'embed_opened',
          attributes: {
            moduleId: 'profit',
            poweredBy: true
          }
        })
      ]
    });
    expect(sendTelemetryBatch).toHaveBeenNthCalledWith(2, {
      userId: 'anonymous',
      events: [
        expect.objectContaining({
          name: 'embed_cta_clicked',
          attributes: {
            moduleId: 'profit'
          }
        })
      ]
    });
  });

  it('does not emit telemetry when consent is disabled', async () => {
    installLocalStorage();

    const sendTelemetryBatch = vi.fn(async () => {
      return {
        accepted: true,
        count: 1,
        objectKey: '2026/03/04/anonymous/test.json'
      };
    });

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
        sendTelemetryBatch
      }
    );

    service.setTelemetryConsent(false);
    await service.trackEmbedOpened('cashflow', true);

    expect(sendTelemetryBatch).not.toHaveBeenCalled();
  });

  it('exports business report PDF locally from saved scenarios', async () => {
    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection())
    );

    await service.saveProfitScenario({
      scenarioName: 'Report Profit',
      unitPriceMinor: 1200,
      quantity: 12,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 1000
    });

    await service.saveBreakEvenScenario({
      scenarioName: 'Report BE',
      unitPriceMinor: 1200,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 1000,
      targetProfitMinor: 500,
      plannedQuantity: 10
    });

    await service.saveCashflowScenario({
      scenarioName: 'Report CF',
      startingCashMinor: 10_000,
      baseMonthlyRevenueMinor: 4_000,
      fixedMonthlyCostsMinor: 2_000,
      variableMonthlyCostsMinor: 800,
      forecastMonths: 6,
      monthlyGrowthRate: 0.01
    });

    const pdfBytes = await service.exportBusinessReportPdf();

    expect(pdfBytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3])).toBe('%PDF');
  });

  it('builds business report model for local preview', async () => {
    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection())
    );

    await service.saveProfitScenario({
      scenarioName: 'Preview Profit',
      unitPriceMinor: 2000,
      quantity: 5,
      variableCostPerUnitMinor: 800,
      fixedCostsMinor: 1000
    });

    const report = await service.getBusinessReportModel();

    expect(report.summary.title).toBe('Business Report');
    expect(report.profitability?.netProfitMinor).toBe(5000);
    expect(report.disclaimer).toMatch(/locally/i);
  });

  it('exports business report xlsx locally from saved scenarios', async () => {
    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection())
    );

    await service.saveProfitScenario({
      scenarioName: 'Xlsx Profit',
      unitPriceMinor: 1200,
      quantity: 12,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 1000
    });

    const xlsxBytes = await service.exportBusinessReportXlsx();

    expect(xlsxBytes.byteLength).toBeGreaterThan(200);
    expect(String.fromCharCode(xlsxBytes[0], xlsxBytes[1])).toBe('PK');
  });

  it('creates share snapshot from sanitized scenario data', async () => {
    const createShareSnapshot = vi.fn(async ({ snapshot }: { snapshot: { schemaVersion: number; module: string; inputData: Record<string, unknown> } }) => {
      expect(snapshot.schemaVersion).toBe(1);
      expect(snapshot.module).toBe('profit');
      expect('scenarioName' in snapshot).toBe(false);
      return {
        token: 'share_123',
        expiresAt: '2026-04-03T10:00:00.000Z'
      };
    });

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
        createShareSnapshot
      }
    );

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
    expect(createShareSnapshot).toHaveBeenCalledTimes(1);
  });

  it('loads shared scenario and computes results locally', async () => {
    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
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
      }
    );

    const shared = await service.getSharedScenarioView('token_1');

    expect(shared.module).toBe('breakeven');
    expect(shared.calculatedData.breakEvenQuantity).toBeDefined();
  });

  it('requires sign-in to import shared scenarios', async () => {
    installLocalStorage();

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
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
      }
    );

    await expect(service.importSharedScenario('token_1')).rejects.toThrow(/sign in/i);
  });

  it('imports and saves shared scenarios with sign-in and entitlement policy', async () => {
    const localStorageMock = installLocalStorage();
    localStorageMock.setItem('marginbase_signed_in', 'true');

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
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
      }
    );

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

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
        deleteShareSnapshot
      }
    );

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

    const service = new WebAppService(
      new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection()),
      {
        refreshEntitlements: async () => {
          throw new Error('not used');
        },
        deleteAccount: async () => {
          throw new Error('not used');
        },
        listShareSnapshots,
        deleteShareSnapshot
      }
    );

    const items = await service.listMyShareSnapshots();
    expect(items).toHaveLength(1);
    expect(listShareSnapshots).toHaveBeenCalledWith('local_web_user');

    const revoked = await service.revokeMyShareSnapshot('share_1');
    expect(revoked).toBe(true);
    expect(deleteShareSnapshot).toHaveBeenCalledWith('share_1', undefined);
  });
});
