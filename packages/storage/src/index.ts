export type {
  EntitlementCacheRecord,
  EntitlementRepository,
  PersistedScenario,
  ScenarioRepository,
  SettingsRecord,
  SettingsRepository,
  StorageSchemaStateRepository
} from './contracts';

export {
  runStorageMigrations,
  type RunStorageMigrationsInput,
  type StorageMigration,
  type StorageMigrationContext
} from './migrations';

export {
  IndexedDbConnection,
  IndexedDbEntitlementRepository,
  IndexedDbScenarioRepository,
  IndexedDbSchemaStateRepository,
  IndexedDbSettingsRepository
} from './adapters/indexeddb';

export {
  SqlitePlaceholderConnection,
  SqlitePlaceholderEntitlementRepository,
  SqlitePlaceholderScenarioRepository,
  SqlitePlaceholderSchemaStateRepository,
  SqlitePlaceholderSettingsRepository
} from './adapters/sqlite-placeholder';

export {
  InMemorySecureKeyStore,
  type CreateSqlCipherConnectionInput,
  type SecureKeyStore,
  type SecureKeyStorePlatform,
  SqlCipherConnection,
  SqlCipherEntitlementRepository,
  type SqlCipherEncryptionInfo,
  type SqlCipherMigrationStrategy,
  SqlCipherScenarioRepository,
  SqlCipherSchemaStateRepository,
  SqlCipherSettingsRepository
} from './adapters/sqlcipher';
