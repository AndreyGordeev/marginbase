import { toMinorUnits } from '@marginbase/domain-core';
import type { ScenarioRepository } from '@marginbase/storage';
import type { EntitlementSet } from '@marginbase/entitlements';
import { TELEMETRY_EVENT_ALLOWLIST } from '@marginbase/telemetry';
import type { ApiClientConfig } from '@marginbase/api-client';

const placeholderScreen = {
  platform: 'web',
  title: 'MarginBase Web Placeholder Screen'
};

const exampleMinorUnits = toMinorUnits(1250);
const _repoShape: ScenarioRepository | null = null;
const _entitlements: EntitlementSet = {
  bundle: false,
  profit: true,
  breakeven: false,
  cashflow: false
};
const _apiClient: ApiClientConfig = { baseUrl: 'http://localhost' };

console.log(placeholderScreen, exampleMinorUnits, TELEMETRY_EVENT_ALLOWLIST, _repoShape, _entitlements, _apiClient);
