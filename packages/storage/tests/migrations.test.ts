import { describe, expect, it } from 'vitest';
import {
  SqlitePlaceholderConnection,
  SqlitePlaceholderEntitlementRepository,
  SqlitePlaceholderScenarioRepository,
  SqlitePlaceholderSchemaStateRepository,
  SqlitePlaceholderSettingsRepository,
  runStorageMigrations,
  type StorageMigration,
} from '../src';

describe('runStorageMigrations', () => {
  it('applies sequential migrations and updates schema version', async () => {
    const connection = new SqlitePlaceholderConnection();
    const scenarioRepository = new SqlitePlaceholderScenarioRepository(
      connection,
    );
    const settingsRepository = new SqlitePlaceholderSettingsRepository(
      connection,
    );
    const entitlementRepository = new SqlitePlaceholderEntitlementRepository(
      connection,
    );
    const stateRepository = new SqlitePlaceholderSchemaStateRepository(
      connection,
    );

    const migrations: StorageMigration[] = [
      {
        fromVersion: 0,
        toVersion: 1,
        migrate: async (context) => {
          await context.settingsRepository.setSetting({
            key: 'migration_0_1',
            value: true,
            updatedAt: '2026-03-02T10:00:00.000Z',
          });
        },
      },
      {
        fromVersion: 1,
        toVersion: 2,
        migrate: async (context) => {
          await context.entitlementRepository.setEntitlementCache({
            userId: 'migration_user',
            lastVerifiedAt: '2026-03-02T10:00:00.000Z',
            entitlementSet: {
              bundle: false,
              profit: true,
              breakeven: false,
              cashflow: false,
            },
          });
        },
      },
    ];

    const finalVersion = await runStorageMigrations({
      stateRepository,
      migrations,
      context: {
        scenarioRepository,
        settingsRepository,
        entitlementRepository,
      },
      targetVersion: 2,
    });

    expect(finalVersion).toBe(2);
    expect(await stateRepository.getSchemaVersion()).toBe(2);
    expect((await settingsRepository.getSetting('migration_0_1'))?.value).toBe(
      true,
    );
    expect(
      await entitlementRepository.getEntitlementCache('migration_user'),
    ).not.toBeNull();
  });

  it('throws when migration path has gaps', async () => {
    const connection = new SqlitePlaceholderConnection();

    await expect(
      runStorageMigrations({
        stateRepository: new SqlitePlaceholderSchemaStateRepository(connection),
        migrations: [
          {
            fromVersion: 1,
            toVersion: 2,
            migrate: async () => {
              return;
            },
          },
        ],
        context: {
          scenarioRepository: new SqlitePlaceholderScenarioRepository(
            connection,
          ),
          settingsRepository: new SqlitePlaceholderSettingsRepository(
            connection,
          ),
          entitlementRepository: new SqlitePlaceholderEntitlementRepository(
            connection,
          ),
        },
        targetVersion: 2,
      }),
    ).rejects.toThrowError(/no migration found/i);
  });

  it('throws when target version is lower than current version', async () => {
    const connection = new SqlitePlaceholderConnection();
    const stateRepository = new SqlitePlaceholderSchemaStateRepository(
      connection,
    );
    await stateRepository.setSchemaVersion(2);

    await expect(
      runStorageMigrations({
        stateRepository,
        migrations: [],
        context: {
          scenarioRepository: new SqlitePlaceholderScenarioRepository(
            connection,
          ),
          settingsRepository: new SqlitePlaceholderSettingsRepository(
            connection,
          ),
          entitlementRepository: new SqlitePlaceholderEntitlementRepository(
            connection,
          ),
        },
        targetVersion: 1,
      }),
    ).rejects.toThrowError(/cannot be lower than current version/i);
  });
});
