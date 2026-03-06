import { indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  IndexedDbConnection,
  IndexedDbEntitlementRepository,
  IndexedDbScenarioRepository,
  IndexedDbSchemaStateRepository,
  IndexedDbSettingsRepository,
} from '../src';

const sampleScenario = {
  schemaVersion: 1 as const,
  scenarioId: 'scenario_1',
  module: 'profit' as const,
  scenarioName: 'IndexedDb Scenario',
  inputData: { revenue: 1000 },
  updatedAt: '2026-03-02T10:00:00.000Z',
};

describe('indexeddb repositories', () => {
  beforeEach(() => {
    globalThis.indexedDB = indexedDB;
  });

  it('executes scenario CRUD and replace-all via repository', async () => {
    const connection = new IndexedDbConnection(`test-db-${Date.now()}`);
    const repository = new IndexedDbScenarioRepository(connection);

    await repository.upsertScenario(sampleScenario);
    expect(await repository.getScenarioById('scenario_1')).not.toBeNull();
    expect((await repository.listScenarios()).length).toBe(1);

    await repository.replaceAllScenarios([
      {
        ...sampleScenario,
        scenarioId: 'scenario_2',
        module: 'breakeven',
        scenarioName: 'Replaced',
      },
    ]);

    expect(await repository.getScenarioById('scenario_1')).toBeNull();
    expect((await repository.listScenarios('breakeven')).length).toBe(1);

    expect(await repository.deleteScenario('scenario_2')).toBe(true);
    expect((await repository.listScenarios()).length).toBe(0);
  });

  it('stores settings and entitlement cache via repositories', async () => {
    const connection = new IndexedDbConnection(`test-db-${Date.now()}`);
    const settings = new IndexedDbSettingsRepository(connection);
    const entitlements = new IndexedDbEntitlementRepository(connection);

    await settings.setSetting({
      key: 'theme',
      value: 'dark',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });
    expect((await settings.getSetting('theme'))?.value).toBe('dark');
    expect((await settings.listSettings()).length).toBe(1);

    await entitlements.setEntitlementCache({
      userId: 'user_1',
      lastVerifiedAt: '2026-03-02T10:00:00.000Z',
      entitlementSet: {
        bundle: true,
        profit: true,
        breakeven: false,
        cashflow: false,
      },
    });

    expect(
      (await entitlements.getEntitlementCache('user_1'))?.entitlementSet.bundle,
    ).toBe(true);
    expect(await entitlements.clearEntitlementCache('user_1')).toBe(true);

    // Non-existing cache clear returns false branch.
    expect(await entitlements.clearEntitlementCache('missing_user')).toBe(
      false,
    );

    await entitlements.setEntitlementCache({
      userId: 'user_2',
      lastVerifiedAt: '2026-03-02T10:00:00.000Z',
      entitlementSet: {
        bundle: false,
        profit: true,
        breakeven: true,
        cashflow: true,
      },
    });
    await entitlements.clearAllEntitlementCache();
    expect(await entitlements.getEntitlementCache('user_2')).toBeNull();

    await settings.clearSettings();
    expect((await settings.listSettings()).length).toBe(0);
  });

  it('persists and reads schema version state', async () => {
    const connection = new IndexedDbConnection(`test-db-${Date.now()}`);
    const state = new IndexedDbSchemaStateRepository(connection);

    expect(await state.getSchemaVersion()).toBe(0);
    await state.setSchemaVersion(3);
    expect(await state.getSchemaVersion()).toBe(3);
  });

  it('returns false for deleting non-existing scenario and supports clearScenarios', async () => {
    const connection = new IndexedDbConnection(`test-db-${Date.now()}`);
    const repository = new IndexedDbScenarioRepository(connection);

    expect(await repository.deleteScenario('missing_id')).toBe(false);

    await repository.upsertScenario(sampleScenario);
    await repository.clearScenarios();
    expect((await repository.listScenarios()).length).toBe(0);
  });
});
