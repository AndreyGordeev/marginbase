/**
 * @marginbase/testkit
 *
 * Shared test utilities, factories, and helpers for NO MANUAL testing.
 * Use these across unit, integration, and E2E tests to ensure consistency.
 *
 * Categories:
 * - factories/scenario: Create test scenarios (profit/breakeven/cashflow)
 * - factories/entitlements: Create entitlement cache states
 * - factories/i18n: Create language/locale test states
 * - helpers/vitest: Unit & integration test utilities
 * - helpers/playwright: E2E test utilities
 */

// Scenario factories
export {
  type ScenarioFactoryOptions,
  breakEvenScenarioFactory,
  cashflowScenarioFactory,
  profitScenarioFactory,
  scenarioBatchFactory,
  scenarioFactory
} from './factories/scenario';

// Entitlement factories
export {
  type EntitlementCacheFactoryOptions,
  bundleEntitlementFactory,
  canceledEntitlementFactory,
  freeEntitlementFactory,
  pastDueEntitlementFactory,
  proSingleModuleFactory,
  staleEntitlementFactory,
  trialEntitlementFactory
} from './factories/entitlements';

// i18n factories
export {
  type LanguageState,
  type LocaleViewportConfig,
  type SupportedLocale,
  SUPPORTED_LOCALES,
  allLanguageStatesFactory,
  languageStateFactory,
  localeViewportFactory,
  primaryTestLocalesFactory
} from './factories/i18n';

// Vitest helpers
export {
  expectDecimalClose,
  expectMutationFields,
  expectNoForbiddenKeys,
  expectObjectShapeMatch,
  expectValidEntitlementSet,
  expectValidIsoDateTime,
  expectValidMinorUnits,
  expectValidModuleId,
  expectValidRatio,
  expectValidScenarioId,
  type MutationTestCase
} from './helpers/vitest';

// Playwright helpers
export {
  type ConsoleErrorBudgetConfig,
  type NetworkInterceptorConfig,
  DEFAULT_CONSOLE_BUDGET,
  attachConsoleErrorTracking,
  configurePageForVisualTesting,
  trackNetworkPayloads
} from './helpers/playwright';
