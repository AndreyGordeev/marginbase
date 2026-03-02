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

interface SqlitePlaceholderState {
  scenarios: Map<string, PersistedScenario>;
  settings: Map<string, SettingsRecord>;
  entitlements: Map<string, EntitlementCacheRecord>;
  schemaVersion: number;
}

const createState = (): SqlitePlaceholderState => {
  return {
    scenarios: new Map<string, PersistedScenario>(),
    settings: new Map<string, SettingsRecord>(),
    entitlements: new Map<string, EntitlementCacheRecord>(),
    schemaVersion: 0
  };
};

export class SqlitePlaceholderConnection {
  private state: SqlitePlaceholderState;

  public constructor() {
    this.state = createState();
  }

  public getState(): SqlitePlaceholderState {
    return this.state;
  }
}

export class SqlitePlaceholderScenarioRepository implements ScenarioRepository {
  public constructor(private readonly connection: SqlitePlaceholderConnection) {}

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

export class SqlitePlaceholderSettingsRepository implements SettingsRepository {
  public constructor(private readonly connection: SqlitePlaceholderConnection) {}

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

export class SqlitePlaceholderEntitlementRepository implements EntitlementRepository {
  public constructor(private readonly connection: SqlitePlaceholderConnection) {}

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

export class SqlitePlaceholderSchemaStateRepository implements StorageSchemaStateRepository {
  public constructor(private readonly connection: SqlitePlaceholderConnection) {}

  public async getSchemaVersion(): Promise<number> {
    return this.connection.getState().schemaVersion;
  }

  public async setSchemaVersion(version: number): Promise<void> {
    this.connection.getState().schemaVersion = version;
  }
}
