import { describe, expect, it } from 'vitest';
import {
  SqlitePlaceholderConnection,
  SqlitePlaceholderEntitlementRepository,
  SqlitePlaceholderScenarioRepository,
  SqlitePlaceholderSchemaStateRepository,
  SqlitePlaceholderSettingsRepository,
} from '../src';

const sampleScenario = {
  schemaVersion: 1 as const,
  scenarioId: 'scenario_sqlite_1',
  module: 'cashflow' as const,
  scenarioName: 'SQLite Placeholder Scenario',
  inputData: { startingCashMinor: 1000 },
  updatedAt: '2026-03-02T10:00:00.000Z',
};

describe('sqlite placeholder repositories', () => {
  it('executes scenario CRUD and replace-all via repository', async () => {
    const connection = new SqlitePlaceholderConnection();
    const repository = new SqlitePlaceholderScenarioRepository(connection);

    await repository.upsertScenario(sampleScenario);
    expect((await repository.listScenarios()).length).toBe(1);

    await repository.replaceAllScenarios([
      {
        ...sampleScenario,
        scenarioId: 'scenario_sqlite_2',
        module: 'profit',
        scenarioName: 'Replaced scenario',
      },
    ]);

    expect(await repository.getScenarioById('scenario_sqlite_1')).toBeNull();
    expect((await repository.listScenarios('profit')).length).toBe(1);
    expect(await repository.deleteScenario('scenario_sqlite_2')).toBe(true);
    expect((await repository.listScenarios()).length).toBe(0);
  });

  it('stores settings and entitlement cache via repositories', async () => {
    const connection = new SqlitePlaceholderConnection();
    const settings = new SqlitePlaceholderSettingsRepository(connection);
    const entitlements = new SqlitePlaceholderEntitlementRepository(connection);

    await settings.setSetting({
      key: 'locale',
      value: 'en-US',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });
    expect((await settings.getSetting('locale'))?.value).toBe('en-US');

    await entitlements.setEntitlementCache({
      userId: 'user_sqlite_1',
      lastVerifiedAt: '2026-03-02T10:00:00.000Z',
      entitlementSet: {
        bundle: false,
        profit: true,
        breakeven: true,
        cashflow: false,
      },
    });
    expect(
      (await entitlements.getEntitlementCache('user_sqlite_1'))?.entitlementSet
        .breakeven,
    ).toBe(true);
    expect(await entitlements.clearEntitlementCache('user_sqlite_1')).toBe(
      true,
    );
    expect(await entitlements.clearEntitlementCache('missing_user')).toBe(
      false,
    );

    await entitlements.setEntitlementCache({
      userId: 'user_sqlite_2',
      lastVerifiedAt: '2026-03-02T10:00:00.000Z',
      entitlementSet: {
        bundle: true,
        profit: true,
        breakeven: true,
        cashflow: true,
      },
    });
    await entitlements.clearAllEntitlementCache();
    expect(await entitlements.getEntitlementCache('user_sqlite_2')).toBeNull();

    await settings.clearSettings();
    expect((await settings.listSettings()).length).toBe(0);
  });

  it('persists and reads schema version state', async () => {
    const connection = new SqlitePlaceholderConnection();
    const state = new SqlitePlaceholderSchemaStateRepository(connection);

    expect(await state.getSchemaVersion()).toBe(0);
    await state.setSchemaVersion(2);
    expect(await state.getSchemaVersion()).toBe(2);
  });

  it('returns false for missing scenario deletion and clears scenarios', async () => {
    const connection = new SqlitePlaceholderConnection();
    const repository = new SqlitePlaceholderScenarioRepository(connection);

    expect(await repository.deleteScenario('missing')).toBe(false);

    await repository.upsertScenario(sampleScenario);
    await repository.clearScenarios();
    expect((await repository.listScenarios()).length).toBe(0);
  });
});
