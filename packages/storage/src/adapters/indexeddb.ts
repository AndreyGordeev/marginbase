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

const SCENARIOS_STORE = 'scenarios';
const SETTINGS_STORE = 'settings';
const ENTITLEMENTS_STORE = 'entitlements';
const META_STORE = 'meta';
const SCHEMA_VERSION_KEY = 'schemaVersion';

interface MetaEntry {
  key: string;
  value: number;
}

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
};

export class IndexedDbConnection {
  private dbPromise: Promise<IDBDatabase>;

  public constructor(private readonly dbName = 'marginbase-storage', private readonly dbVersion = 1) {
    this.dbPromise = this.open();
  }

  public async getDatabase(): Promise<IDBDatabase> {
    return this.dbPromise;
  }

  private async open(): Promise<IDBDatabase> {
    const request = globalThis.indexedDB.open(this.dbName, this.dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SCENARIOS_STORE)) {
        db.createObjectStore(SCENARIOS_STORE, { keyPath: 'scenarioId' });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(ENTITLEMENTS_STORE)) {
        db.createObjectStore(ENTITLEMENTS_STORE, { keyPath: 'userId' });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    return requestToPromise(request);
  }

  public async withStore<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => Promise<T>): Promise<T> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = await operation(store);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    });

    return result;
  }
}

export class IndexedDbScenarioRepository implements ScenarioRepository {
  public constructor(private readonly connection: IndexedDbConnection) {}

  public async upsertScenario(scenario: PersistedScenario): Promise<void> {
    await this.connection.withStore(SCENARIOS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.put(scenario));
    });
  }

  public async getScenarioById(scenarioId: string): Promise<PersistedScenario | null> {
    return this.connection.withStore(SCENARIOS_STORE, 'readonly', async (store) => {
      const result = await requestToPromise(store.get(scenarioId));
      return (result as PersistedScenario | undefined) ?? null;
    });
  }

  public async listScenarios(module?: ModuleId): Promise<PersistedScenario[]> {
    return this.connection.withStore(SCENARIOS_STORE, 'readonly', async (store) => {
      const result = (await requestToPromise(store.getAll())) as PersistedScenario[];
      if (!module) {
        return result;
      }

      return result.filter((scenario) => scenario.module === module);
    });
  }

  public async deleteScenario(scenarioId: string): Promise<boolean> {
    const existing = await this.getScenarioById(scenarioId);

    if (!existing) {
      return false;
    }

    await this.connection.withStore(SCENARIOS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.delete(scenarioId));
    });

    return true;
  }

  public async replaceAllScenarios(scenarios: PersistedScenario[]): Promise<void> {
    await this.connection.withStore(SCENARIOS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.clear());

      for (const scenario of scenarios) {
        await requestToPromise(store.put(scenario));
      }
    });
  }

  public async clearScenarios(): Promise<void> {
    await this.connection.withStore(SCENARIOS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.clear());
    });
  }
}

export class IndexedDbSettingsRepository implements SettingsRepository {
  public constructor(private readonly connection: IndexedDbConnection) {}

  public async setSetting(setting: SettingsRecord): Promise<void> {
    await this.connection.withStore(SETTINGS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.put(setting));
    });
  }

  public async getSetting(key: string): Promise<SettingsRecord | null> {
    return this.connection.withStore(SETTINGS_STORE, 'readonly', async (store) => {
      const result = await requestToPromise(store.get(key));
      return (result as SettingsRecord | undefined) ?? null;
    });
  }

  public async listSettings(): Promise<SettingsRecord[]> {
    return this.connection.withStore(SETTINGS_STORE, 'readonly', async (store) => {
      return (await requestToPromise(store.getAll())) as SettingsRecord[];
    });
  }

  public async clearSettings(): Promise<void> {
    await this.connection.withStore(SETTINGS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.clear());
    });
  }
}

export class IndexedDbEntitlementRepository implements EntitlementRepository {
  public constructor(private readonly connection: IndexedDbConnection) {}

  public async setEntitlementCache(cache: EntitlementCacheRecord): Promise<void> {
    await this.connection.withStore(ENTITLEMENTS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.put(cache));
    });
  }

  public async getEntitlementCache(userId: string): Promise<EntitlementCacheRecord | null> {
    return this.connection.withStore(ENTITLEMENTS_STORE, 'readonly', async (store) => {
      const result = await requestToPromise(store.get(userId));
      return (result as EntitlementCacheRecord | undefined) ?? null;
    });
  }

  public async clearEntitlementCache(userId: string): Promise<boolean> {
    const existing = await this.getEntitlementCache(userId);

    if (!existing) {
      return false;
    }

    await this.connection.withStore(ENTITLEMENTS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.delete(userId));
    });

    return true;
  }

  public async clearAllEntitlementCache(): Promise<void> {
    await this.connection.withStore(ENTITLEMENTS_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.clear());
    });
  }
}

export class IndexedDbSchemaStateRepository implements StorageSchemaStateRepository {
  public constructor(private readonly connection: IndexedDbConnection) {}

  public async getSchemaVersion(): Promise<number> {
    return this.connection.withStore(META_STORE, 'readonly', async (store) => {
      const result = (await requestToPromise(store.get(SCHEMA_VERSION_KEY))) as MetaEntry | undefined;
      return result?.value ?? 0;
    });
  }

  public async setSchemaVersion(version: number): Promise<void> {
    await this.connection.withStore(META_STORE, 'readwrite', async (store) => {
      await requestToPromise(store.put({ key: SCHEMA_VERSION_KEY, value: version } as MetaEntry));
    });
  }
}
