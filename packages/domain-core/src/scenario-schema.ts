export const CURRENT_SCENARIO_SCHEMA_VERSION = 1;

export type ModuleId = 'profit' | 'breakeven' | 'cashflow';

export interface ScenarioV1 {
  schemaVersion: 1;
  scenarioId: string;
  module: ModuleId;
  scenarioName: string;
  inputData: Record<string, unknown>;
  calculatedData?: Record<string, unknown>;
  updatedAt: string;
}

export interface ScenarioExportFileV1 {
  schemaVersion: 1;
  replaceStrategy: 'replace_all';
  exportedAt: string;
  scenarios: ScenarioV1[];
}

interface ScenarioLegacyV0 {
  schemaVersion?: 0;
  scenario_id?: unknown;
  scenarioId?: unknown;
  module?: unknown;
  module_id?: unknown;
  scenario_name?: unknown;
  scenarioName?: unknown;
  input_data?: unknown;
  inputData?: unknown;
  calculated_data?: unknown;
  calculatedData?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
}

export type ScenarioAnyVersion = ScenarioV1 | ScenarioLegacyV0 | Record<string, unknown>;

export type ScenarioValidationErrorCode =
  | 'NOT_OBJECT'
  | 'SCHEMA_VERSION_REQUIRED'
  | 'SCHEMA_VERSION_UNSUPPORTED'
  | 'SCENARIO_ID_REQUIRED'
  | 'MODULE_INVALID'
  | 'SCENARIO_NAME_REQUIRED'
  | 'INPUT_DATA_INVALID'
  | 'CALCULATED_DATA_INVALID'
  | 'UPDATED_AT_INVALID';

export interface ScenarioValidationError {
  code: ScenarioValidationErrorCode;
  message: string;
  path: string;
}

export interface ScenarioValidationResult {
  ok: boolean;
  errors: ScenarioValidationError[];
  value?: ScenarioV1;
}

export type ImportErrorCode =
  | 'JSON_INVALID'
  | 'FILE_NOT_OBJECT'
  | 'SCHEMA_VERSION_UNSUPPORTED'
  | 'SCENARIOS_REQUIRED'
  | 'SCENARIOS_EMPTY'
  | 'SCENARIO_INVALID';

export interface ImportError {
  code: ImportErrorCode;
  message: string;
  path: string;
}

export interface ImportReplaceAllResult {
  ok: boolean;
  mode: 'replace_all';
  scenarios: ScenarioV1[];
  errors: ImportError[];
  summary: {
    total: number;
    profit: number;
    breakeven: number;
    cashflow: number;
  };
}

const MODULES: ReadonlySet<string> = new Set(['profit', 'breakeven', 'cashflow']);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isIsoDateTime = (value: string): boolean => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && value.includes('T');
};

const asString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const normalizeScenario = (input: ScenarioAnyVersion): ScenarioV1 | null => {
  if (!isRecord(input)) {
    return null;
  }

  const schemaVersionRaw = input.schemaVersion;
  const schemaVersion = schemaVersionRaw === undefined ? 0 : schemaVersionRaw;

  if (schemaVersion === CURRENT_SCENARIO_SCHEMA_VERSION) {
    return {
      schemaVersion: 1,
      scenarioId: asString(input.scenarioId) ?? '',
      module: (asString(input.module) ?? '') as ModuleId,
      scenarioName: asString(input.scenarioName) ?? '',
      inputData: isRecord(input.inputData) ? input.inputData : {},
      calculatedData: isRecord(input.calculatedData) ? input.calculatedData : undefined,
      updatedAt: asString(input.updatedAt) ?? ''
    };
  }

  if (schemaVersion === 0) {
    const legacy = input as ScenarioLegacyV0;

    return {
      schemaVersion: 1,
      scenarioId: asString(legacy.scenarioId) ?? asString(legacy.scenario_id) ?? '',
      module: (asString(legacy.module) ?? asString(legacy.module_id) ?? '') as ModuleId,
      scenarioName: asString(legacy.scenarioName) ?? asString(legacy.scenario_name) ?? '',
      inputData: isRecord(legacy.inputData) ? legacy.inputData : isRecord(legacy.input_data) ? legacy.input_data : {},
      calculatedData: isRecord(legacy.calculatedData)
        ? legacy.calculatedData
        : isRecord(legacy.calculated_data)
          ? legacy.calculated_data
          : undefined,
      updatedAt: asString(legacy.updatedAt) ?? asString(legacy.updated_at) ?? ''
    };
  }

  return null;
};

export const migrateScenario = (input: ScenarioAnyVersion): ScenarioV1 => {
  const normalized = normalizeScenario(input);

  if (!normalized) {
    throw new Error('Unsupported or invalid scenario schema version.');
  }

  return normalized;
};

export const validateScenario = (input: ScenarioAnyVersion): ScenarioValidationResult => {
  const errors: ScenarioValidationError[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ code: 'NOT_OBJECT', message: 'Scenario must be an object.', path: '$' }]
    };
  }

  if (input.schemaVersion === undefined) {
    errors.push({
      code: 'SCHEMA_VERSION_REQUIRED',
      message: 'Scenario schemaVersion is required.',
      path: '$.schemaVersion'
    });
  } else if (input.schemaVersion !== 0 && input.schemaVersion !== CURRENT_SCENARIO_SCHEMA_VERSION) {
    errors.push({
      code: 'SCHEMA_VERSION_UNSUPPORTED',
      message: `Unsupported scenario schemaVersion: ${String(input.schemaVersion)}.`,
      path: '$.schemaVersion'
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const migrated = migrateScenario(input);

  if (!migrated.scenarioId.trim()) {
    errors.push({
      code: 'SCENARIO_ID_REQUIRED',
      message: 'scenarioId is required.',
      path: '$.scenarioId'
    });
  }

  if (!MODULES.has(migrated.module)) {
    errors.push({
      code: 'MODULE_INVALID',
      message: 'module must be one of profit, breakeven, cashflow.',
      path: '$.module'
    });
  }

  if (!migrated.scenarioName.trim()) {
    errors.push({
      code: 'SCENARIO_NAME_REQUIRED',
      message: 'scenarioName is required.',
      path: '$.scenarioName'
    });
  }

  if (!isRecord(migrated.inputData)) {
    errors.push({
      code: 'INPUT_DATA_INVALID',
      message: 'inputData must be an object.',
      path: '$.inputData'
    });
  }

  if (migrated.calculatedData !== undefined && !isRecord(migrated.calculatedData)) {
    errors.push({
      code: 'CALCULATED_DATA_INVALID',
      message: 'calculatedData must be an object when provided.',
      path: '$.calculatedData'
    });
  }

  if (!migrated.updatedAt || !isIsoDateTime(migrated.updatedAt)) {
    errors.push({
      code: 'UPDATED_AT_INVALID',
      message: 'updatedAt must be a valid ISO datetime string.',
      path: '$.updatedAt'
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length === 0 ? migrated : undefined
  };
};

export const createScenarioExport = (scenarios: ScenarioAnyVersion[], exportedAt = new Date().toISOString()): ScenarioExportFileV1 => {
  const normalizedScenarios = scenarios.map((scenario) => {
    const validation = validateScenario(scenario);

    if (!validation.ok || !validation.value) {
      throw new Error(`Cannot export invalid scenario: ${JSON.stringify(validation.errors)}`);
    }

    return validation.value;
  });

  return {
    schemaVersion: 1,
    replaceStrategy: 'replace_all',
    exportedAt,
    scenarios: normalizedScenarios
  };
};

export const exportScenariosToJson = (scenarios: ScenarioAnyVersion[], exportedAt?: string): string => {
  const payload = createScenarioExport(scenarios, exportedAt);
  return JSON.stringify(payload, null, 2);
};

export const importScenariosReplaceAllFromJson = (jsonText: string): ImportReplaceAllResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      mode: 'replace_all',
      scenarios: [],
      errors: [{ code: 'JSON_INVALID', message: 'Input is not valid JSON.', path: '$' }],
      summary: { total: 0, profit: 0, breakeven: 0, cashflow: 0 }
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      mode: 'replace_all',
      scenarios: [],
      errors: [{ code: 'FILE_NOT_OBJECT', message: 'Import payload must be an object.', path: '$' }],
      summary: { total: 0, profit: 0, breakeven: 0, cashflow: 0 }
    };
  }

  if (parsed.schemaVersion !== CURRENT_SCENARIO_SCHEMA_VERSION) {
    return {
      ok: false,
      mode: 'replace_all',
      scenarios: [],
      errors: [
        {
          code: 'SCHEMA_VERSION_UNSUPPORTED',
          message: `Unsupported import schemaVersion: ${String(parsed.schemaVersion)}.`,
          path: '$.schemaVersion'
        }
      ],
      summary: { total: 0, profit: 0, breakeven: 0, cashflow: 0 }
    };
  }

  if (!Array.isArray(parsed.scenarios)) {
    return {
      ok: false,
      mode: 'replace_all',
      scenarios: [],
      errors: [{ code: 'SCENARIOS_REQUIRED', message: 'scenarios must be an array.', path: '$.scenarios' }],
      summary: { total: 0, profit: 0, breakeven: 0, cashflow: 0 }
    };
  }

  if (parsed.scenarios.length === 0) {
    return {
      ok: false,
      mode: 'replace_all',
      scenarios: [],
      errors: [{ code: 'SCENARIOS_EMPTY', message: 'scenarios array must not be empty.', path: '$.scenarios' }],
      summary: { total: 0, profit: 0, breakeven: 0, cashflow: 0 }
    };
  }

  const scenarios: ScenarioV1[] = [];
  const errors: ImportError[] = [];

  parsed.scenarios.forEach((scenario, index) => {
    const validation = validateScenario(scenario as ScenarioAnyVersion);

    if (!validation.ok || !validation.value) {
      errors.push({
        code: 'SCENARIO_INVALID',
        message: `Scenario at index ${index} is invalid.`,
        path: `$.scenarios[${index}]`
      });
      return;
    }

    scenarios.push(validation.value);
  });

  const summary = {
    total: scenarios.length,
    profit: scenarios.filter((scenario) => scenario.module === 'profit').length,
    breakeven: scenarios.filter((scenario) => scenario.module === 'breakeven').length,
    cashflow: scenarios.filter((scenario) => scenario.module === 'cashflow').length
  };

  return {
    ok: errors.length === 0,
    mode: 'replace_all',
    scenarios,
    errors,
    summary
  };
};
