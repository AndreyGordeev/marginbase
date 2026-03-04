import type { ModuleId, ScenarioV1 } from './scenario-schema';

export const CURRENT_SNAPSHOT_SCHEMA_VERSION = 1;

export interface SharedSnapshotV1 {
  schemaVersion: 1;
  module: ModuleId;
  inputData: Record<string, unknown>;
  currencyCode?: string;
}

export type SharedSnapshotAnyVersion = SharedSnapshotV1 | Record<string, unknown>;

export const sanitizeScenarioForShare = (scenario: ScenarioV1): SharedSnapshotV1 => {
  const inputData = scenario.inputData;

  return {
    schemaVersion: CURRENT_SNAPSHOT_SCHEMA_VERSION,
    module: scenario.module,
    inputData,
    currencyCode: typeof inputData.currencyCode === 'string' ? inputData.currencyCode : undefined
  };
};

export const migrateSnapshot = (snapshot: SharedSnapshotAnyVersion): SharedSnapshotV1 => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Snapshot must be an object.');
  }

  const asRecord = snapshot as Record<string, unknown>;
  const schemaVersion = asRecord.schemaVersion;

  if (schemaVersion !== CURRENT_SNAPSHOT_SCHEMA_VERSION) {
    throw new Error(`Unsupported snapshot schemaVersion: ${String(schemaVersion)}.`);
  }

  const module = asRecord.module;
  if (module !== 'profit' && module !== 'breakeven' && module !== 'cashflow') {
    throw new Error('Snapshot module must be one of profit, breakeven, cashflow.');
  }

  const inputData = asRecord.inputData;
  if (!inputData || typeof inputData !== 'object' || Array.isArray(inputData)) {
    throw new Error('Snapshot inputData must be an object.');
  }

  const currencyCode = asRecord.currencyCode;

  return {
    schemaVersion: 1,
    module,
    inputData: inputData as Record<string, unknown>,
    currencyCode: typeof currencyCode === 'string' ? currencyCode : undefined
  };
};
