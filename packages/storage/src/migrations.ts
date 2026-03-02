import type {
  EntitlementRepository,
  ScenarioRepository,
  SettingsRepository,
  StorageSchemaStateRepository
} from './contracts';

export interface StorageMigrationContext {
  scenarioRepository: ScenarioRepository;
  settingsRepository: SettingsRepository;
  entitlementRepository: EntitlementRepository;
}

export interface StorageMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (context: StorageMigrationContext) => Promise<void>;
}

export interface RunStorageMigrationsInput {
  stateRepository: StorageSchemaStateRepository;
  migrations: StorageMigration[];
  context: StorageMigrationContext;
  targetVersion: number;
}

const sortMigrations = (migrations: StorageMigration[]): StorageMigration[] => {
  return [...migrations].sort((left, right) => left.fromVersion - right.fromVersion);
};

export const runStorageMigrations = async ({
  stateRepository,
  migrations,
  context,
  targetVersion
}: RunStorageMigrationsInput): Promise<number> => {
  let currentVersion = await stateRepository.getSchemaVersion();

  if (targetVersion < currentVersion) {
    throw new Error(`Target version ${targetVersion} cannot be lower than current version ${currentVersion}.`);
  }

  const ordered = sortMigrations(migrations);

  while (currentVersion < targetVersion) {
    const nextMigration = ordered.find((migration) => migration.fromVersion === currentVersion);

    if (!nextMigration) {
      throw new Error(`No migration found from version ${currentVersion}.`);
    }

    await nextMigration.migrate(context);
    currentVersion = nextMigration.toVersion;
    await stateRepository.setSchemaVersion(currentVersion);
  }

  return currentVersion;
};
