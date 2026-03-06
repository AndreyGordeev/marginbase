import type {
  MobileScreen,
  MobileScreenRoute,
  MobileScreenProps,
} from './screen-types';
import { createLoginScreen } from './screens/login-screen';
import { createHomeScreen } from './screens/home-screen';
import {
  createGateScreen,
  createScenarioListScreen,
  createProfitEditorScreen,
  createBreakevenEditorScreen,
  createCashflowEditorScreen,
  createSettingsScreen,
  createSubscriptionScreen,
  createPrivacyScreen,
  createTermsScreen,
  createImportExportResultScreen,
  createErrorModalScreen,
  createEmptyStateScreen,
  createSplashScreen,
} from './screens/all-screens';
import { MobileAppService } from '../mobile-app-service';

export class MobileRouter {
  private screens: Map<MobileScreenRoute, MobileScreen>;
  private currentRoute: MobileScreenRoute = '/splash';
  private currentParams: Record<string, string> = {};
  private container: HTMLElement;
  private service: MobileAppService;

  public constructor(container: HTMLElement, service: MobileAppService) {
    this.container = container;
    this.service = service;

    // Register all screens
    this.screens = new Map([
      this.createScreen(createSplashScreen()),
      this.createScreen(createLoginScreen()),
      this.createScreen(createGateScreen()),
      this.createScreen(createHomeScreen()),
      this.createScreen(createScenarioListScreen()),
      this.createScreen(createProfitEditorScreen()),
      this.createScreen(createBreakevenEditorScreen()),
      this.createScreen(createCashflowEditorScreen()),
      this.createScreen(createSettingsScreen()),
      this.createScreen(createSubscriptionScreen()),
      this.createScreen(createPrivacyScreen()),
      this.createScreen(createTermsScreen()),
      this.createScreen(createImportExportResultScreen()),
      this.createScreen(createErrorModalScreen()),
      this.createScreen(createEmptyStateScreen()),
    ]);

    this.setupHistoryListener();
  }

  private createScreen = (
    screen: MobileScreen,
  ): [MobileScreenRoute, MobileScreen] => {
    return [screen.route, screen];
  };

  public navigateTo = (
    route: MobileScreenRoute,
    params?: Record<string, string>,
  ): void => {
    this.currentRoute = route;
    if (params) {
      this.currentParams = params;
    }
    this.render();

    // Update URL hash
    let hash = route;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      hash = `${route}?${queryString}`;
    }
    window.location.hash = hash;
  };

  private findMatchingScreen = (
    route: MobileScreenRoute,
  ): { screen: MobileScreen; params: Record<string, string> } | null => {
    // Direct match
    if (this.screens.has(route)) {
      return { screen: this.screens.get(route)!, params: {} };
    }

    // Pattern match (e.g., /module/profit/scenarios matches /module/:moduleId/scenarios)
    for (const [screenRoute, screen] of this.screens) {
      const isMatch = this.routeMatches(route, screenRoute as string);
      if (isMatch) {
        const params = this.extractParams(route, screenRoute as string);
        return { screen, params };
      }
    }

    return null;
  };

  private routeMatches = (actual: string, pattern: string): boolean => {
    const actualParts = actual.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);

    if (actualParts.length !== patternParts.length) {
      return false;
    }

    return actualParts.every((part, i) => {
      const patternPart = patternParts[i];
      return patternPart === part || patternPart.startsWith(':');
    });
  };

  private extractParams = (
    actual: string,
    pattern: string,
  ): Record<string, string> => {
    const actualParts = actual.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);
    const params: Record<string, string> = {};

    actualParts.forEach((part, i) => {
      const patternPart = patternParts[i];
      if (patternPart?.startsWith(':')) {
        const key = patternPart.substring(1);
        params[key] = part;
      }
    });

    return params;
  };

  public render = (): void => {
    const match = this.findMatchingScreen(this.currentRoute);

    if (!match) {
      console.error(`No screen found for route: ${this.currentRoute}`);
      this.container.innerHTML =
        '<div class="mobile-error">Screen not found</div>';
      return;
    }

    const { screen, params } = match;
    const screenProps: MobileScreenProps = {
      service: this.service,
      params: { ...this.currentParams, ...params },
      onNavigate: this.navigateTo,
    };

    const screenElement = screen.render(screenProps);
    this.container.replaceChildren(screenElement);
    document.title = screen.title;
  };

  private setupHistoryListener = (): void => {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const [route, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString);
        const paramsObj: Record<string, string> = {};
        params.forEach((value, key) => {
          paramsObj[key] = value;
        });
        this.navigateTo(route as MobileScreenRoute, paramsObj);
      }
    });
  };
}

export const initializeMobileApp = async (
  container: HTMLElement,
): Promise<void> => {
  const service = await MobileAppService.createDefault();
  const router = new MobileRouter(container, service);

  // Initial render
  router.navigateTo('/splash');
};
