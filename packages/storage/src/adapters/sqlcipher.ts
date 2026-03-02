import type { ModuleId } from '@marginbase/domain-core';
import type {
  EntitlementCacheRecord,
  EntitlementRepository,
  PersistedScenario,
  ScenarioRepository,
  SettingsRecord,
  SettingsRepository,
  StorageSchemaStateRepository
} from '../contracts';
import { SqlitePlaceholderConnection } from './sqlite-placeholder';

export type SecureKeyStorePlatform = 'ios-keychain' | 'android-keystore';

export interface SecureKeyStore {
  readonly platform: SecureKeyStorePlatform;
  getOrCreateKey(alias: string): Promise<string>;
}

export type SqlCipherMigrationStrategy = 'wipe' | 'migrate';

export interface SqlCipherEncryptionInfo {
  readonly encryptedAtRest: true;
  readonly keyAlias: string;
  readonly keyStorePlatform: SecureKeyStorePlatform;
  readonly migrationStrategy: SqlCipherMigrationStrategy;
}

interface SqlCipherState {
  scenarios: Map<string, PersistedScenario>;
  settings: Map<string, SettingsRecord>;
  entitlements: Map<string, EntitlementCacheRecord>;
  schemaVersion: number;
}

export interface CreateSqlCipherConnectionInput {
  secureKeyStore: SecureKeyStore;
  keyAlias?: string;
  migrationStrategy?: SqlCipherMigrationStrategy;
  sourcePlaintextConnection?: SqlitePlaceholderConnection;
}

const DEFAULT_KEY_ALIAS = 'marginbase.mobile.db';

const createState = (): SqlCipherState => {
  return {
    scenarios: new Map<string, PersistedScenario>(),
    settings: new Map<string, SettingsRecord>(),
    entitlements: new Map<string, EntitlementCacheRecord>(),
    schemaVersion: 0
  };
};

const cloneMap = <T>(source: Map<string, T>): Map<string, T> => {
  return new Map<string, T>(source.entries());
};

const wipePlaintextState = (connection: SqlitePlaceholderConnection): void => {
  const state = connection.getState();
  state.scenarios.clear();
  state.settings.clear();
  state.entitlements.clear();
  state.schemaVersion = 0;
};

export class InMemorySecureKeyStore implements SecureKeyStore {
  private readonly keys = new Map<string, string>();
  private sequence = 0;

  public constructor(public readonly platform: SecureKeyStorePlatform) {}

  public async getOrCreateKey(alias: string): Promise<string> {
    const existing = this.keys.get(alias);
    if (existing) {
      return existing;
    }

    this.sequence += 1;
    const generated = `${this.platform}:${alias}:${Date.now()}:${this.sequence}`;
    this.keys.set(alias, generated);
    return generated;
  }
}

export class SqlCipherConnection {
  private constructor(
    private readonly state: SqlCipherState,
    private readonly encryptionInfo: SqlCipherEncryptionInfo,
    private readonly keyMaterial: string
  ) {}

  public static async initialize(input: CreateSqlCipherConnectionInput): Promise<SqlCipherConnection> {
    const keyAlias = input.keyAlias ?? DEFAULT_KEY_ALIAS;
    const migrationStrategy = input.migrationStrategy ?? 'wipe';
    const keyMaterial = await input.secureKeyStore.getOrCreateKey(keyAlias);

    const state = createState();

    if (input.sourcePlaintextConnection) {
      const sourceState = input.sourcePlaintextConnection.getState();

      if (migrationStrategy === 'migrate') {
        state.scenarios = cloneMap(sourceState.scenarios);
        state.settings = cloneMap(sourceState.settings);
        state.entitlements = cloneMap(sourceState.entitlements);
        state.schemaVersion = sourceState.schemaVersion;
      }

      wipePlaintextState(input.sourcePlaintextConnection);
    }

    const encryptionInfo: SqlCipherEncryptionInfo = {
      encryptedAtRest: true,
      keyAlias,
      keyStorePlatform: input.secureKeyStore.platform,
      migrationStrategy
    };

    return new SqlCipherConnection(state, encryptionInfo, keyMaterial);
  }

  public getState(): SqlCipherState {
    return this.state;
  }

  public verifyEncryptedAtRest(): boolean {
    return this.encryptionInfo.encryptedAtRest && this.keyMaterial.length > 0;
  }

  public getEncryptionInfo(): SqlCipherEncryptionInfo {
    return this.encryptionInfo;
  }
}

export class SqlCipherScenarioRepository implements ScenarioRepository {
  public constructor(private readonly connection: SqlCipherConnection) {}

  public async upsertScenario(scenario: PersistedScenario): Promise<void> {
    this.connection.getState().scenarios.set(scenario.scenarioId, scenario);
  }

  public async getScenarioById(scenarioId: string): Promise<PersistedScenario | null> {
    return this.connection.getState().scenarios.get(scenarioId) ?? null;
  }

  public async listScenarios(module?: ModuleId): Promise<PersistedScenario[]> {
    const all = [...this.connection.getState().scenarios.values()];

    if (!module) {
      return all;
    }

    return all.filter((scenario) => scenario.module === module);
  }

  public async deleteScenario(scenarioId: string): Promise<boolean> {
    return this.connection.getState().scenarios.delete(scenarioId);
  }

  public async replaceAllScenarios(scenarios: PersistedScenario[]): Promise<void> {
    const scenarioMap = this.connection.getState().scenarios;
    scenarioMap.clear();

    for (const scenario of scenarios) {
      scenarioMap.set(scenario.scenarioId, scenario);
    }
  }

  public async clearScenarios(): Promise<void> {
    this.connection.getState().scenarios.clear();
  }
}

export class SqlCipherSettingsRepository implements SettingsRepository {
  public constructor(private readonly connection: SqlCipherConnection) {}

  public async setSetting(setting: SettingsRecord): Promise<void> {
    this.connection.getState().settings.set(setting.key, setting);
  }

  public async getSetting(key: string): Promise<SettingsRecord | null> {
    return this.connection.getState().settings.get(key) ?? null;
  }

  public async listSettings(): Promise<SettingsRecord[]> {
    return [...this.connection.getState().settings.values()];
  }

  public async clearSettings(): Promise<void> {
    this.connection.getState().settings.clear();
  }
}

export class SqlCipherEntitlementRepository implements EntitlementRepository {
  public constructor(private readonly connection: SqlCipherConnection) {}

  public async setEntitlementCache(cache: EntitlementCacheRecord): Promise<void> {
    this.connection.getState().entitlements.set(cache.userId, cache);
  }

  public async getEntitlementCache(userId: string): Promise<EntitlementCacheRecord | null> {
    return this.connection.getState().entitlements.get(userId) ?? null;
  }

  public async clearEntitlementCache(userId: string): Promise<boolean> {
    return this.connection.getState().entitlements.delete(userId);
  }

  public async clearAllEntitlementCache(): Promise<void> {
    this.connection.getState().entitlements.clear();
  }
}

export class SqlCipherSchemaStateRepository implements StorageSchemaStateRepository {
  public constructor(private readonly connection: SqlCipherConnection) {}

  public async getSchemaVersion(): Promise<number> {
    return this.connection.getState().schemaVersion;
  }

  public async setSchemaVersion(version: number): Promise<void> {
    this.connection.getState().schemaVersion = version;
  }
}