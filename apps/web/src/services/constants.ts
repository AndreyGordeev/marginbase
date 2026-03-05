export const SIGNED_IN_STORAGE_KEY = 'marginbase_signed_in';
export const SIGNED_IN_USER_ID_STORAGE_KEY = 'marginbase_signed_in_user_id';
export const TELEMETRY_CONSENT_STORAGE_KEY = 'marginbase_telemetry_consent';
export const FIRST_RUN_DEMO_SCENARIOS_KEY = 'marginbase_first_run_demo_scenarios_seeded';
export const VAULT_SALT_STORAGE_KEY = 'marginbase_vault_salt';
export const FREE_PLAN_SCENARIO_LIMIT = 3;

export const nowIso = (): string => new Date().toISOString();

export type ModuleId = 'profit' | 'breakeven' | 'cashflow';

export type TelemetryConsentState = 'enabled' | 'disabled' | 'not_decided';

export const isTelemetryConsentState = (value: string): value is TelemetryConsentState => {
  return value === 'enabled' || value === 'disabled' || value === 'not_decided';
};
