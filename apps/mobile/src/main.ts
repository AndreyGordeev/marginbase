import { MOBILE_SCREEN_ROUTES, MobileAppService, type MobileScreenRoute } from './mobile-app-service';

export interface MobileScreenModel {
  route: MobileScreenRoute;
  title: string;
  purpose: string;
}

export const MOBILE_SCREENS: MobileScreenModel[] = [
  { route: '/splash', title: 'Splash Screen', purpose: 'Initial app entry state.' },
  { route: '/login', title: 'Google Sign-In', purpose: 'Authenticate user.' },
  { route: '/gate', title: 'Trial / Subscription Gate', purpose: 'Soft gate status and trial entry.' },
  { route: '/home', title: 'Home / Dashboard', purpose: 'Module launch and recent scenarios.' },
  { route: '/module/:moduleId/scenarios', title: 'Scenario List', purpose: 'List/create/duplicate/delete scenarios.' },
  { route: '/module/profit/editor/:scenarioId', title: 'Profit Editor', purpose: 'Profit scenario editing and results.' },
  { route: '/module/breakeven/editor/:scenarioId', title: 'Break-even Editor', purpose: 'Break-even scenario editing and results.' },
  { route: '/module/cashflow/editor/:scenarioId', title: 'Cashflow Editor', purpose: 'Cashflow forecasting and warnings.' },
  { route: '/subscription', title: 'Subscription', purpose: 'Plan status and plan actions.' },
  { route: '/settings', title: 'Settings', purpose: 'Preferences + data import/export actions.' },
  { route: '/legal/privacy', title: 'Privacy Policy', purpose: 'Legal privacy disclosures and data handling details.' },
  { route: '/legal/terms', title: 'Terms of Service', purpose: 'Product terms and subscription conditions.' },
  { route: '/import-export-result', title: 'Import / Export Result', purpose: 'Success/error summary after data transfer.' },
  { route: '/error-modal', title: 'Error / Validation Modal', purpose: 'Validation, destructive, and system error states.' },
  { route: '/empty-state', title: 'Empty State', purpose: 'No scenarios/no activity reusable state.' }
];

const assertAllDefinedScreensPresent = (): void => {
  const implementedRoutes = new Set(MOBILE_SCREENS.map((screen) => screen.route));

  for (const route of MOBILE_SCREEN_ROUTES) {
    if (!implementedRoutes.has(route)) {
      throw new Error(`Missing mobile screen implementation for route: ${route}`);
    }
  }
};

const describeModuleAccess = (service: MobileAppService): string => {
  return [
    `profit=${service.canOpenModule('profit') ? 'active' : 'locked'}`,
    `breakeven=${service.canOpenModule('breakeven') ? 'active' : 'locked'}`,
    `cashflow=${service.canOpenModule('cashflow') ? 'active' : 'locked'}`
  ].join(', ');
};

const boot = async (): Promise<void> => {
  assertAllDefinedScreensPresent();

  const service = await MobileAppService.createDefault();

  console.log('MarginBase Mobile Offline App Ready');
  console.log('Screens:', MOBILE_SCREENS.map((screen) => screen.title).join(' | '));
  console.log('Module access:', describeModuleAccess(service));
};

void boot();
