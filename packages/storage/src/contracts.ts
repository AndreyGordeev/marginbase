import type { ModuleId, ScenarioV1 } from '@marginbase/domain-core';

export type PersistedScenario = ScenarioV1;

export interface SettingsRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface EntitlementCacheRecord {
  userId: string;
  lastVerifiedAt: string;
  entitlementSet: {
    bundle: boolean;
    profit: boolean;
    breakeven: boolean;
    cashflow: boolean;
  };
  trial?: {
    active: boolean;
    expiresAt: string;
  };
}

export interface ScenarioRepository {
  upsertScenario(scenario: PersistedScenario): Promise<void>;
  getScenarioById(scenarioId: string): Promise<PersistedScenario | null>;
  listScenarios(module?: ModuleId): Promise<PersistedScenario[]>;
  deleteScenario(scenarioId: string): Promise<boolean>;
  replaceAllScenarios(scenarios: PersistedScenario[]): Promise<void>;
  clearScenarios(): Promise<void>;
}

export interface SettingsRepository {
  setSetting(setting: SettingsRecord): Promise<void>;
  getSetting(key: string): Promise<SettingsRecord | null>;
  listSettings(): Promise<SettingsRecord[]>;
  clearSettings(): Promise<void>;
}

export interface EntitlementRepository {
  setEntitlementCache(cache: EntitlementCacheRecord): Promise<void>;
  getEntitlementCache(userId: string): Promise<EntitlementCacheRecord | null>;
  clearEntitlementCache(userId: string): Promise<boolean>;
  clearAllEntitlementCache(): Promise<void>;
}

export interface StorageSchemaStateRepository {
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;
}
