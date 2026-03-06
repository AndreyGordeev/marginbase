import type { MobileScreen, MobileScreenProps } from '../screen-types';
import { createScreenElement, createButton, createCard } from '../screen-types';

// Gate / Subscription paywall
export const createGateScreen = (): MobileScreen => ({
  route: '/gate',
  title: 'Upgrade to Pro',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-gate', 'Start Your Free Trial');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('Join MarginBase', '14 days free, then €9/month'),
    );
    content.appendChild(
      createButton(
        'Start Free Trial',
        () => {
          props.service.activateTrial();
          props.onNavigate('/home');
        },
        'primary',
      ),
    );
    content.appendChild(
      createButton('View Plans', () => props.onNavigate('/subscription')),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Scenario list
export const createScenarioListScreen = (): MobileScreen => ({
  route: '/module/:moduleId/scenarios',
  title: 'Scenarios',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement(
      'screen-scenarios',
      `${props.params?.moduleId || 'Module'} Scenarios`,
    );
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard(
        'No scenarios yet',
        'Create your first scenario to get started',
      ),
    );
    content.appendChild(
      createButton('➕ New Scenario', () =>
        props.onNavigate('/module/profit/editor/new'),
      ),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Profit editor
export const createProfitEditorScreen = (): MobileScreen => ({
  route: '/module/profit/editor/:scenarioId',
  title: 'Profit Calculator',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-editor', 'Profit Calculation');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(createCard('Revenue', 'Enter your revenue amount'));
    content.appendChild(createCard('Costs', 'Enter your total costs'));
    content.appendChild(createCard('Margin', '0% (Calculate)'));
    content.appendChild(
      createButton('💾 Save', () => props.onNavigate('/home')),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Breakeven editor
export const createBreakevenEditorScreen = (): MobileScreen => ({
  route: '/module/breakeven/editor/:scenarioId',
  title: 'Break-even Calculator',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-editor', 'Break-even Analysis');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(createCard('Fixed Costs', 'Enter your fixed costs'));
    content.appendChild(
      createCard('Variable Costs', 'Enter variable cost per unit'),
    );
    content.appendChild(createCard('Price', 'Enter unit price'));
    content.appendChild(createCard('Break-even Units', '0 units'));
    content.appendChild(
      createButton('💾 Save', () => props.onNavigate('/home')),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Cashflow editor
export const createCashflowEditorScreen = (): MobileScreen => ({
  route: '/module/cashflow/editor/:scenarioId',
  title: 'Cashflow Forecast',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-editor', 'Monthly Cashflow');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('Starting Cash', 'Enter your starting balance'),
    );
    content.appendChild(
      createCard('Monthly Revenue', 'Enter average monthly revenue'),
    );
    content.appendChild(
      createCard('Monthly Costs', 'Enter total monthly costs'),
    );
    content.appendChild(createCard('Forecast', '6-month projection'));
    content.appendChild(
      createButton('💾 Save', () => props.onNavigate('/home')),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Settings
export const createSettingsScreen = (): MobileScreen => ({
  route: '/settings',
  title: 'Settings',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement(
      'screen-settings',
      'Account & Preferences',
    );
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(createCard('Data & Backup', 'Import/Export scenarios'));
    content.appendChild(
      createButton('📥 Import', () =>
        props.onNavigate('/import-export-result'),
      ),
    );
    content.appendChild(
      createButton('📤 Export', () =>
        props.onNavigate('/import-export-result'),
      ),
    );
    content.appendChild(
      createButton('🚪 Sign Out', () => props.onNavigate('/login')),
    );
    content.appendChild(
      createButton('🗑️ Delete Account', () => props.onNavigate('/error-modal')),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Subscription
export const createSubscriptionScreen = (): MobileScreen => ({
  route: '/subscription',
  title: 'Plans & Billing',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement(
      'screen-subscription',
      'Subscription Plans',
    );
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('Free Plan', 'Limited to Profit calculator'),
    );
    content.appendChild(createCard('Pro Plan', '€9/month - All calculators'));
    content.appendChild(
      createButton('✨ Upgrade Now', () => props.onNavigate('/gate')),
    );
    content.appendChild(
      createButton('💳 Manage Billing', () =>
        props.onNavigate('/subscription'),
      ),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Legal pages
export const createPrivacyScreen = (): MobileScreen => ({
  route: '/legal/privacy',
  title: 'Privacy Policy',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-legal', 'Privacy Policy');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    const policy = document.createElement('p');
    policy.innerHTML =
      '<strong>MarginBase Privacy Policy</strong><br/>Your scenarios are stored locally on your device. We do not collect financial data.';
    content.appendChild(policy);
    content.appendChild(
      createButton('Back', () => props.onNavigate('/settings')),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createTermsScreen = (): MobileScreen => ({
  route: '/legal/terms',
  title: 'Terms of Service',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-legal', 'Terms of Service');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    const terms = document.createElement('p');
    terms.innerHTML =
      '<strong>MarginBase Terms</strong><br/>MarginBase provides financial calculators for SMB planning. See full terms at marginbase.app/terms';
    content.appendChild(terms);
    content.appendChild(
      createButton('Back', () => props.onNavigate('/settings')),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Import/Export result
export const createImportExportResultScreen = (): MobileScreen => ({
  route: '/import-export-result',
  title: 'Transfer Complete',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-result', 'Success');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('✅ Complete', 'Your scenarios have been transferred'),
    );
    content.appendChild(
      createButton('Back Home', () => props.onNavigate('/home')),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Error modal
export const createErrorModalScreen = (): MobileScreen => ({
  route: '/error-modal',
  title: 'Error',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-modal screen-error', 'Error');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard(
        '⚠️ Error',
        'An error occurred. Please check your input and try again.',
      ),
    );
    content.appendChild(createButton('OK', () => props.onNavigate('/home')));
    screen.appendChild(content);
    return screen;
  },
});

// Empty state
export const createEmptyStateScreen = (): MobileScreen => ({
  route: '/empty-state',
  title: 'Empty',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-empty', 'No Items');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard(
        '📋 No scenarios yet',
        'Get started by creating your first scenario',
      ),
    );
    content.appendChild(
      createButton('Create Scenario', () =>
        props.onNavigate('/module/profit/scenarios'),
      ),
    );
    screen.appendChild(content);
    return screen;
  },
});

// Splash screen
export const createSplashScreen = (): MobileScreen => ({
  route: '/splash',
  title: 'Splash',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-splash');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    const heading = document.createElement('h1');
    heading.textContent = 'MarginBase';
    const subheading = document.createElement('p');
    subheading.textContent = 'SMB Finance Toolkit';
    content.appendChild(heading);
    content.appendChild(subheading);
    const loader = document.createElement('div');
    loader.className = 'mobile-loader';
    loader.textContent = 'Loading...';
    content.appendChild(loader);
    // Auto-navigate after 2 seconds
    setTimeout(() => props.onNavigate('/login'), 2000);
    screen.appendChild(content);
    return screen;
  },
});
