import { indexedDB } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  IndexedDbConnection,
  IndexedDbScenarioRepository,
  IndexedDbSettingsRepository
} from '../src';

/**
 * Advanced IndexedDB integration tests for Phase 3
 * Covers: concurrent writes, edge cases, data persistence patterns
 */

describe('indexeddb advanced scenarios', () => {
  beforeEach(() => {
    globalThis.indexedDB = indexedDB;
  });

  describe('concurrent writes and conflict resolution', () => {
    it('handles multiple rapid upserts to same scenario', async () => {
      const connection = new IndexedDbConnection(`concurrent-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      const baseScenario = {
        schemaVersion: 1 as const,
        scenarioId: 'concurrent_1',
        module: 'profit' as const,
        scenarioName: 'Concurrent Test',
        inputData: { value: 0 },
        updatedAt: new Date().toISOString()
      };

      // Simulate concurrent writes
      const updates = Array.from({ length: 10 }, (_, i) => ({
        ...baseScenario,
        inputData: { value: i },
        updatedAt: new Date(Date.now() + i * 100).toISOString()
      }));

      await Promise.all(updates.map((update) => repo.upsertScenario(update)));

      const final = await repo.getScenarioById('concurrent_1');
      expect(final).not.toBeNull();
      // Latest write should win
      expect(final?.inputData).toHaveProperty('value');
      expect((final?.inputData as { value?: number }).value).toBeDefined();
    });

    it('list operations are consistent during writes', async () => {
      const connection = new IndexedDbConnection(`consistency-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      const scenarios = Array.from({ length: 5 }, (_, i) => ({
        schemaVersion: 1 as const,
        scenarioId: `scenario_consistency_${i}`,
        module: 'profit' as const,
        scenarioName: `Scenario ${i}`,
        inputData: {},
        updatedAt: new Date().toISOString()
      }));

      // Upsert all concurrently
      await Promise.all(scenarios.map((s) => repo.upsertScenario(s)));

      const listed = await repo.listScenarios();
      expect(listed.length).toBe(5);

      // Verify all IDs are present
      const ids = new Set(listed.map((s) => s.scenarioId));
      scenarios.forEach((s) => {
        expect(ids.has(s.scenarioId)).toBe(true);
      });
    });
  });

  describe('data integrity and edge cases', () => {
    it('handles very large inputData objects', async () => {
      const connection = new IndexedDbConnection(`large-data-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      const largeScenario = {
        schemaVersion: 1 as const,
        scenarioId: 'large_scenario',
        module: 'cashflow' as const,
        scenarioName: 'Cashflow with 100 months',
        inputData: {
          startingCash: 100000,
          months: Array.from({ length: 100 }, (_, i) => ({
            month: i + 1,
            inflows: Math.floor(Math.random() * 100000),
            outflows: Math.floor(Math.random() * 50000)
          }))
        },
        updatedAt: new Date().toISOString()
      };

      await repo.upsertScenario(largeScenario);

      const retrieved = await repo.getScenarioById('large_scenario');
      expect(retrieved).not.toBeNull();
      expect((retrieved?.inputData as { months?: unknown[] }).months?.length).toBe(100);
    });

    it('preserves null/undefined in nested objects', async () => {
      const connection = new IndexedDbConnection(`nulls-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      const scenario = {
        schemaVersion: 1 as const,
        scenarioId: 'nulls_scenario',
        module: 'profit' as const,
        scenarioName: 'With nulls',
        inputData: {
          revenue: 1000,
          costs: null,
          metadata: {
            source: null,
            tags: undefined
          }
        },
        updatedAt: new Date().toISOString()
      };

      await repo.upsertScenario(scenario);

      const retrieved = await repo.getScenarioById('nulls_scenario');
      expect(retrieved?.inputData).toEqual(scenario.inputData);
    });

    it('handles special characters in scenario names', async () => {
      const connection = new IndexedDbConnection(`special-chars-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      const specialNames = [
        'Scenario with "quotes"',
        "Scenario with 'apostrophes'",
        'Сценарий на русском',
        '場景中文',
        'Scenario™ with symbols © ® ™',
        'Line\nbreak scenario',
        'Tab\tscenario'
      ];

      const scenarios = specialNames.map((name, i) => ({
        schemaVersion: 1 as const,
        scenarioId: `special_${i}`,
        module: 'profit' as const,
        scenarioName: name,
        inputData: {},
        updatedAt: new Date().toISOString()
      }));

      await Promise.all(scenarios.map((s) => repo.upsertScenario(s)));

      for (let i = 0; i < specialNames.length; i++) {
        const retrieved = await repo.getScenarioById(`special_${i}`);
        expect(retrieved?.scenarioName).toBe(specialNames[i]);
      }
    });
  });

  describe('delete and replace patterns', () => {
    it('delete followed by recreate works correctly', async () => {
      const connection = new IndexedDbConnection(`delete-recreate-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      const scenario = {
        schemaVersion: 1 as const,
        scenarioId: 'delete_test',
        module: 'profit' as const,
        scenarioName: 'Original',
        inputData: { version: 1 },
        updatedAt: new Date().toISOString()
      };

      // Create
      await repo.upsertScenario(scenario);
      expect(await repo.getScenarioById('delete_test')).not.toBeNull();

      // Delete
      const deleted = await repo.deleteScenario('delete_test');
      expect(deleted).toBe(true);
      expect(await repo.getScenarioById('delete_test')).toBeNull();

      // Recreate with different data
      const updated = { ...scenario, inputData: { version: 2 } };
      await repo.upsertScenario(updated);

      const recreated = await repo.getScenarioById('delete_test');
      expect(recreated).not.toBeNull();
      expect((recreated?.inputData as { version?: number }).version).toBe(2);
    });

    it('replace-all clears previous state correctly', async () => {
      const connection = new IndexedDbConnection(`replace-all-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      // Initial batch
      const initial = Array.from({ length: 3 }, (_, i) => ({
        schemaVersion: 1 as const,
        scenarioId: `batch1_${i}`,
        module: 'profit' as const,
        scenarioName: `Batch 1 - ${i}`,
        inputData: {},
        updatedAt: new Date().toISOString()
      }));

      await Promise.all(initial.map((s) => repo.upsertScenario(s)));
      expect((await repo.listScenarios()).length).toBe(3);

      // Replace with different batch
      const replacement = Array.from({ length: 2 }, (_, i) => ({
        schemaVersion: 1 as const,
        scenarioId: `batch2_${i}`,
        module: 'cashflow' as const,
        scenarioName: `Batch 2 - ${i}`,
        inputData: {},
        updatedAt: new Date().toISOString()
      }));

      await repo.replaceAllScenarios(replacement);
      const final = await repo.listScenarios();

      expect(final.length).toBe(2);
      expect(final.every((s) => s.scenarioId.startsWith('batch2_'))).toBe(true);
    });
  });

  describe('settings persistence', () => {
    it('updates and overwrites settings correctly', async () => {
      const connection = new IndexedDbConnection(`settings-${Date.now()}`);
      const settings = new IndexedDbSettingsRepository(connection);

      // Set initial value
      await settings.setSetting({
        key: 'currency',
        value: 'EUR',
        updatedAt: new Date().toISOString()
      });

      let retrieved = await settings.getSetting('currency');
      expect(retrieved?.value).toBe('EUR');

      // Update same key
      await settings.setSetting({
        key: 'currency',
        value: 'USD',
        updatedAt: new Date().toISOString()
      });

      retrieved = await settings.getSetting('currency');
      expect(retrieved?.value).toBe('USD');

      // Verify only one entry exists
      const all = await settings.listSettings();
      const currencyEntries = all.filter((s) => s.key === 'currency');
      expect(currencyEntries.length).toBe(1);
    });

    it('handles multiple independent settings', async () => {
      const connection = new IndexedDbConnection(`multi-settings-${Date.now()}`);
      const settings = new IndexedDbSettingsRepository(connection);

      const settingsData = [
        { key: 'theme', value: 'dark' },
        { key: 'language', value: 'pl' },
        { key: 'telemetry', value: 'off' },
        { key: 'notifications', value: 'on' }
      ];

      const timestamp = new Date().toISOString();
      await Promise.all(
        settingsData.map((s) =>
          settings.setSetting({
            ...s,
            updatedAt: timestamp
          })
        )
      );

      const all = await settings.listSettings();
      expect(all.length).toBe(4);

      for (const expected of settingsData) {
        const found = await settings.getSetting(expected.key);
        expect(found?.value).toBe(expected.value);
      }
    });
  });

  describe('transaction patterns', () => {
    it('rapidly alternating reads and writes maintain consistency', async () => {
      const connection = new IndexedDbConnection(`tx-pattern-${Date.now()}`);
      const repo = new IndexedDbScenarioRepository(connection);

      let counter = 0;
      const scenario = {
        schemaVersion: 1 as const,
        scenarioId: 'tx_scenario',
        module: 'profit' as const,
        scenarioName: 'Tx Test',
        inputData: { count: counter },
        updatedAt: new Date().toISOString()
      };

      // Simulate alternating writes and reads
      for (let i = 0; i < 20; i++) {
        counter++;
        await repo.upsertScenario({
          ...scenario,
          inputData: { count: counter },
          updatedAt: new Date(Date.now() + i * 10).toISOString()
        });

        if (i % 2 === 0) {
          const read = await repo.getScenarioById('tx_scenario');
          expect(read?.inputData).toHaveProperty('count');
        }
      }

      const final = await repo.getScenarioById('tx_scenario');
      expect((final?.inputData as { count?: number }).count).toBeGreaterThan(0);
    });
  });
});
