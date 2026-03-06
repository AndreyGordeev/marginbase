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
});
