/**
 * Test ID Constants
 * 
 * Centralized constants for data-testid attributes used in E2E tests.
 * This ensures consistency across the codebase and makes tests resilient to refactoring.
 * 
 * Usage:
 * ```tsx
 * <div data-testid={TEST_IDS.APP_SHELL}>
 * </div>
 * ```
 */

export const TEST_IDS = Object.freeze({
  // App shell
  APP_SHELL: 'app-shell',
  APP_NAV: 'app-nav',
  SIDEBAR: 'sidebar',
  MAIN_CONTENT: 'main-content',
  
  // Navigation
  LANGUAGE_SWITCHER: 'language-switcher',
  NAV_LINK_DASHBOARD: 'nav-link-dashboard',
  NAV_LINK_PROFIT: 'nav-link-profit',
  NAV_LINK_BREAKEVEN: 'nav-link-breakeven',
  NAV_LINK_CASHFLOW: 'nav-link-cashflow',
  NAV_LINK_SUBSCRIPTION: 'nav-link-subscription',
  NAV_LINK_DATA_BACKUP: 'nav-link-data-backup',
  NAV_LINK_SETTINGS: 'nav-link-settings',
  
  // Dashboard
  DASHBOARD_PAGE: 'dashboard-page',
  DASHBOARD_HEADER: 'dashboard-header',
  MODULE_GRID: 'module-grid',
  MODULE_CARD_PROFIT: 'module-card-profit',
  MODULE_CARD_BREAKEVEN: 'module-card-breakeven',
  MODULE_CARD_CASHFLOW: 'module-card-cashflow',
  MODULE_OPEN_BUTTON: 'module-open-button',
  RECENT_SCENARIOS: 'recent-scenarios',
  
  // Workspace
  WORKSPACE_ROOT: 'workspace-root',
  WORKSPACE_HEADER: 'workspace-header',
  SCENARIO_SELECTOR: 'scenario-selector',
  SCENARIO_NAME_INPUT: 'scenario-name-input',
  CALCULATE_BUTTON: 'calculate-button',
  SAVE_SCENARIO_BUTTON: 'save-scenario-button',
  DELETE_SCENARIO_BUTTON: 'delete-scenario-button',
  EXPORT_BUTTON: 'export-button',
  SHARE_BUTTON: 'share-button',
  RESULTS_SECTION: 'results-section',
  
  // Paywall / Gate
  GATE_PAGE: 'gate-page',
  PAYWALL_HEADING: 'paywall-heading',
  UPGRADE_CTA: 'upgrade-cta',
  TRIAL_CTA: 'trial-cta',
  
  // Settings
  SETTINGS_PAGE: 'settings-page',
  TELEMETRY_TOGGLE: 'telemetry-toggle',
  CONSENT_LABEL: 'consent-label',
  
  // Data Backup
  DATA_BACKUP_PAGE: 'data-backup-page',
  EXPORT_ALL_BUTTON: 'export-all-button',
  IMPORT_FILE_INPUT: 'import-file-input',
  IMPORT_BUTTON: 'import-button',
  
  // Subscription
  SUBSCRIPTION_PAGE: 'subscription-page',
  ACTIVATE_TRIAL_BUTTON: 'activate-trial-button',
  BILLING_PORTAL_LINK: 'billing-portal-link',
  
  // Embed
  EMBED_SHELL: 'embed-shell',
  EMBED_CONTAINER: 'embed-container',
  EMBED_POWERED_BY: 'embed-powered-by',
  EMBED_OPEN_IN_APP_BUTTON: 'embed-open-in-app-button',
  EMBED_EXPORT_INPUTS_BUTTON: 'embed-export-inputs-button',
  EMBED_RESULTS: 'embed-results',
  
  // Share
  SHARE_DIALOG: 'share-dialog',
  SHARE_LINK_INPUT: 'share-link-input',
  SHARE_LINK_COPY_BUTTON: 'share-link-copy-button',
  SHARE_IMPORT_BUTTON: 'share-import-button',
  SHARE_SAVE_BUTTON: 'share-save-button',
  
  // Auth
  LOGIN_PAGE: 'login-page',
  CONTINUE_AS_GUEST_BUTTON: 'continue-as-guest-button',
  CONTINUE_WITH_GOOGLE_BUTTON: 'continue-with-google-button',
  
  // Utilities (for dynamic/hidden content)
  DYNAMIC_TIMESTAMP: 'dynamic-timestamp',
  RANDOM_ID: 'random-id'
});

/**
 * Helper to render an element with a test ID
 * 
 * @example
 * ```tsx
 * const div = createTestElement('div', TEST_IDS.APP_SHELL);
 * ```
 */
export const createTestElement = (
  tag: string,
  testId?: string,
  className?: string
): HTMLElement => {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (testId) {
    el.setAttribute('data-testid', testId);
  }
  return el;
};
