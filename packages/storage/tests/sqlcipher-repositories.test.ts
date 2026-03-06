import { describe, expect, it } from 'vitest';
import {
  InMemorySecureKeyStore,
  SqlCipherConnection,
  SqlCipherEntitlementRepository,
  SqlCipherScenarioRepository,
  SqlCipherSchemaStateRepository,
  SqlCipherSettingsRepository,
  SqlitePlaceholderConnection,
  SqlitePlaceholderScenarioRepository,
  SqlitePlaceholderSettingsRepository,
} from '../src';

const sampleScenario = {
  schemaVersion: 1 as const,
  scenarioId: 'scenario_sqlcipher_1',
  module: 'cashflow' as const,
  scenarioName: 'SQLCipher Scenario',
  inputData: { startingCashMinor: 2500 },
  updatedAt: '2026-03-02T10:00:00.000Z',
};

describe('sqlcipher repositories', () => {
  it('stores keys in keychain or keystore and verifies encrypted at rest', async () => {
    const iosStore = new InMemorySecureKeyStore('ios-keychain');
    const iosConnection = await SqlCipherConnection.initialize({
      secureKeyStore: iosStore,
      keyAlias: 'marginbase.mobile.db',
      migrationStrategy: 'wipe',
    });

    expect(iosConnection.verifyEncryptedAtRest()).toBe(true);
    expect(iosConnection.getEncryptionInfo().keyStorePlatform).toBe(
      'ios-keychain',
    );
    expect(iosConnection.getEncryptionInfo().keyAlias).toBe(
      'marginbase.mobile.db',
    );

    const androidStore = new InMemorySecureKeyStore('android-keystore');
    const androidConnection = await SqlCipherConnection.initialize({
      secureKeyStore: androidStore,
      migrationStrategy: 'wipe',
    });

    expect(androidConnection.verifyEncryptedAtRest()).toBe(true);
    expect(androidConnection.getEncryptionInfo().keyStorePlatform).toBe(
      'android-keystore',
    );

    const reusedKeyA = await androidStore.getOrCreateKey('same-alias');
    const reusedKeyB = await androidStore.getOrCreateKey('same-alias');
    expect(reusedKeyA).toBe(reusedKeyB);
  });

  it('executes scenario, settings, entitlements and schema operations after encryption integration', async () => {
    const connection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe',
    });

    const scenarioRepository = new SqlCipherScenarioRepository(connection);
    const settingsRepository = new SqlCipherSettingsRepository(connection);
    const entitlementRepository = new SqlCipherEntitlementRepository(
      connection,
    );
    const schemaStateRepository = new SqlCipherSchemaStateRepository(
      connection,
    );

    await scenarioRepository.upsertScenario(sampleScenario);
    expect((await scenarioRepository.listScenarios()).length).toBe(1);
    expect((await scenarioRepository.listScenarios('cashflow')).length).toBe(1);
    expect((await scenarioRepository.listScenarios('profit')).length).toBe(0);

    await settingsRepository.setSetting({
      key: 'theme',
      value: 'dark',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });
    expect((await settingsRepository.getSetting('theme'))?.value).toBe('dark');

    await entitlementRepository.setEntitlementCache({
      userId: 'user_sqlcipher_1',
      lastVerifiedAt: '2026-03-02T10:00:00.000Z',
      entitlementSet: {
        bundle: false,
        profit: true,
        breakeven: false,
        cashflow: false,
      },
    });
    expect(
      (await entitlementRepository.getEntitlementCache('user_sqlcipher_1'))
        ?.entitlementSet.profit,
    ).toBe(true);
    expect(
      await entitlementRepository.clearEntitlementCache('missing_user'),
    ).toBe(false);
    await entitlementRepository.clearAllEntitlementCache();
    expect(
      await entitlementRepository.getEntitlementCache('user_sqlcipher_1'),
    ).toBeNull();

    await settingsRepository.clearSettings();
    expect((await settingsRepository.listSettings()).length).toBe(0);

    expect(await scenarioRepository.deleteScenario('missing_scenario')).toBe(
      false,
    );
    await scenarioRepository.clearScenarios();
    expect((await scenarioRepository.listScenarios()).length).toBe(0);

    expect(await schemaStateRepository.getSchemaVersion()).toBe(0);
    await schemaStateRepository.setSchemaVersion(3);
    expect(await schemaStateRepository.getSchemaVersion()).toBe(3);
  });

  it('supports migration strategy wipe from plaintext sqlite', async () => {
    const source = new SqlitePlaceholderConnection();
    const sourceScenarioRepository = new SqlitePlaceholderScenarioRepository(
      source,
    );

    await sourceScenarioRepository.upsertScenario(sampleScenario);
    expect((await sourceScenarioRepository.listScenarios()).length).toBe(1);

    const encrypted = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe',
      sourcePlaintextConnection: source,
    });

    const encryptedScenarioRepository = new SqlCipherScenarioRepository(
      encrypted,
    );
    expect((await encryptedScenarioRepository.listScenarios()).length).toBe(0);
    expect((await sourceScenarioRepository.listScenarios()).length).toBe(0);
    expect(encrypted.getEncryptionInfo().migrationStrategy).toBe('wipe');
  });

  it('supports migration strategy migrate from plaintext sqlite', async () => {
    const source = new SqlitePlaceholderConnection();
    const sourceScenarioRepository = new SqlitePlaceholderScenarioRepository(
      source,
    );
    const sourceSettingsRepository = new SqlitePlaceholderSettingsRepository(
      source,
    );

    await sourceScenarioRepository.upsertScenario(sampleScenario);
    await sourceSettingsRepository.setSetting({
      key: 'numberFormat',
      value: 'eu',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });
    source.getState().schemaVersion = 2;

    const encrypted = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('ios-keychain'),
      migrationStrategy: 'migrate',
      sourcePlaintextConnection: source,
    });

    const encryptedScenarioRepository = new SqlCipherScenarioRepository(
      encrypted,
    );
    const encryptedSettingsRepository = new SqlCipherSettingsRepository(
      encrypted,
    );
    const encryptedSchemaStateRepository = new SqlCipherSchemaStateRepository(
      encrypted,
    );

    expect((await encryptedScenarioRepository.listScenarios()).length).toBe(1);
    expect(
      (await encryptedSettingsRepository.getSetting('numberFormat'))?.value,
    ).toBe('eu');
    expect(await encryptedSchemaStateRepository.getSchemaVersion()).toBe(2);
    expect((await sourceScenarioRepository.listScenarios()).length).toBe(0);
    expect(encrypted.getEncryptionInfo().migrationStrategy).toBe('migrate');
  });

  it('replaces all scenarios - clears old and inserts new batch', async () => {
    const connection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe',
    });

    const scenarioRepository = new SqlCipherScenarioRepository(connection);

    // Insert initial scenarios
    await scenarioRepository.upsertScenario(sampleScenario);
    await scenarioRepository.upsertScenario({
      schemaVersion: 1 as const,
      scenarioId: 'scenario_sqlcipher_2',
      module: 'profit' as const,
      scenarioName: 'Some Other Scenario',
      inputData: { unitPriceMinor: 5000 },
      updatedAt: '2026-03-02T11:00:00.000Z',
    });

    expect((await scenarioRepository.listScenarios()).length).toBe(2);
    expect((await scenarioRepository.listScenarios('cashflow')).length).toBe(1);
    expect((await scenarioRepository.listScenarios('profit')).length).toBe(1);

    // Replace all scenarios with new batch
    const newScenarios = [
      {
        schemaVersion: 1 as const,
        scenarioId: 'scenario_sqlcipher_new_1',
        module: 'breakeven' as const,
        scenarioName: 'New Scenario A',
        inputData: { fixedCostMinor: 10000 },
        updatedAt: '2026-03-02T12:00:00.000Z',
      },
      {
        schemaVersion: 1 as const,
        scenarioId: 'scenario_sqlcipher_new_2',
        module: 'breakeven' as const,
        scenarioName: 'New Scenario B',
        inputData: { fixedCostMinor: 20000 },
        updatedAt: '2026-03-02T13:00:00.000Z',
      },
    ];

    await scenarioRepository.replaceAllScenarios(newScenarios);

    expect((await scenarioRepository.listScenarios()).length).toBe(2);
    expect((await scenarioRepository.listScenarios('breakeven')).length).toBe(
      2,
    );
    expect((await scenarioRepository.listScenarios('cashflow')).length).toBe(0);
    expect((await scenarioRepository.listScenarios('profit')).length).toBe(0);

    const retrievedScenario = await scenarioRepository.getScenarioById(
      'scenario_sqlcipher_new_1',
    );
    expect(retrievedScenario?.scenarioName).toBe('New Scenario A');
  });

  it('deletes scenario and returns true when found, false when not found', async () => {
    const connection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe',
    });

    const scenarioRepository = new SqlCipherScenarioRepository(connection);
    await scenarioRepository.upsertScenario(sampleScenario);

    const deleteExisting = await scenarioRepository.deleteScenario(
      'scenario_sqlcipher_1',
    );
    expect(deleteExisting).toBe(true);
    expect((await scenarioRepository.listScenarios()).length).toBe(0);

    const deleteNonExisting = await scenarioRepository.deleteScenario(
      'scenario_sqlcipher_1',
    );
    expect(deleteNonExisting).toBe(false);
  });

  it('handles empty replaceAll scenarios batch', async () => {
    const connection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe',
    });

    const scenarioRepository = new SqlCipherScenarioRepository(connection);
    await scenarioRepository.upsertScenario(sampleScenario);

    expect((await scenarioRepository.listScenarios()).length).toBe(1);

    // Replace with empty list - should clear all
    await scenarioRepository.replaceAllScenarios([]);

    expect((await scenarioRepository.listScenarios()).length).toBe(0);
  });

  it('settings repository - manage settings and null cases', async () => {
    const connection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe',
    });

    const settingsRepository = new SqlCipherSettingsRepository(connection);

    // Test null when setting doesn't exist
    expect(await settingsRepository.getSetting('missingKey')).toBeNull();
    expect((await settingsRepository.listSettings()).length).toBe(0);

    // Set and retrieve
    await settingsRepository.setSetting({
      key: 'numberFormat',
      value: 'eu',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });
    expect(await settingsRepository.getSetting('numberFormat')).not.toBeNull();
    expect((await settingsRepository.listSettings()).length).toBe(1);

    // Set another and verify both exist
    await settingsRepository.setSetting({
      key: 'locale',
      value: 'de-DE',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });
    expect((await settingsRepository.listSettings()).length).toBe(2);

    // Clear all settings
    await settingsRepository.clearSettings();
    expect((await settingsRepository.listSettings()).length).toBe(0);
    expect(await settingsRepository.getSetting('numberFormat')).toBeNull();
  });

  it('entitlements repository - manage cache with null cases', async () => {
    const connection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe',
    });

    const entitlementsRepository = new SqlCipherEntitlementRepository(
      connection,
    );

    // Test null when cache doesn't exist
    expect(
      await entitlementsRepository.getEntitlementCache('user1'),
    ).toBeNull();

    // Set cache
    await entitlementsRepository.setEntitlementCache({
      userId: 'user1',
      lastVerifiedAt: '2026-03-02T10:00:00.000Z',
      entitlementSet: {
        bundle: false,
        profit: true,
        breakeven: true,
        cashflow: false,
      },
    });
    expect(
      (await entitlementsRepository.getEntitlementCache('user1'))?.userId,
    ).toBe('user1');

    // Clear non-existent returns false
    expect(
      await entitlementsRepository.clearEntitlementCache('user_nonexistent'),
    ).toBe(false);

    // Clear existing returns true
    expect(await entitlementsRepository.clearEntitlementCache('user1')).toBe(
      true,
    );
    expect(
      await entitlementsRepository.getEntitlementCache('user1'),
    ).toBeNull();
  });

  it('migrate strategy copies data from plaintext connection', async () => {
    // Create a source plaintext connection with data
    const sourceConnection = new SqlitePlaceholderConnection();
    const sourceScenarioRepository = new SqlitePlaceholderScenarioRepository(
      sourceConnection,
    );
    const sourceSettingsRepository = new SqlitePlaceholderSettingsRepository(
      sourceConnection,
    );

    await sourceScenarioRepository.upsertScenario(sampleScenario);
    await sourceSettingsRepository.setSetting({
      key: 'numberFormat',
      value: 'eu',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });

    // Create encrypted connection with migrate strategy
    const encryptedConnection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'migrate',
      sourcePlaintextConnection: sourceConnection,
    });

    const encryptedScenarioRepository = new SqlCipherScenarioRepository(
      encryptedConnection,
    );
    const encryptedSettingsRepository = new SqlCipherSettingsRepository(
      encryptedConnection,
    );

    // Verify data was migrated
    expect((await encryptedScenarioRepository.listScenarios()).length).toBe(1);
    expect(
      await encryptedScenarioRepository.getScenarioById('scenario_sqlcipher_1'),
    ).not.toBeNull();
    expect(
      (await encryptedSettingsRepository.getSetting('numberFormat'))?.value,
    ).toBe('eu');

    // Verify source was wiped
    expect((await sourceScenarioRepository.listScenarios()).length).toBe(0);
    expect(
      await sourceSettingsRepository.getSetting('numberFormat'),
    ).toBeNull();

    // Test getting non-existent scenario returns null
    expect(
      await encryptedScenarioRepository.getScenarioById('missing'),
    ).toBeNull();

    // Test getting non-existent setting returns null
    expect(await encryptedSettingsRepository.getSetting('missing')).toBeNull();
  });
});
