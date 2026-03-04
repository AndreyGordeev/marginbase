import { WebAppService } from './web-app-service';
import { getCurrentLanguage, initializeI18nProvider, setCurrentLanguage, translate, type SupportedLanguage } from './i18n';
import { renderEmbedBreakevenRoute } from './routes/embedBreakeven';
import { renderEmbedCashflowRoute } from './routes/embedCashflow';
import { renderEmbedProfitRoute } from './routes/embedProfit';
import { getEmbedRoute, getHashPathWithoutLanguageFromHash, getRoute, getSharedToken, parsePathWithOptionalLanguage } from './routes/route-utils';
import { renderSharedScenarioRoute } from './routes/sharedScenario';
import { renderLoginPage } from './ui/auth/login-page';
import { type LegalRoute, renderLegalCenter, renderLegalDocument, setLegalBackTarget } from './ui/legal/legal-render';
import { LEGAL_DOCS } from './ui/legal/legal-docs';
import { type AppRoutePath, renderDashboardPage, renderDataBackupPage, renderGatePage, renderSettingsPage, renderSubscriptionPage, renderWorkspacePage } from './ui/pages/app-pages';
import { addBaseStyles } from './ui/styles/base-styles';

declare const __MB_SHOW_DEBUG_RESULTS__: boolean;

type RoutePath = AppRoutePath;

const ROUTES: RoutePath[] = [
  '/',
  '/login',
  '/gate',
  '/dashboard',
  '/profit',
  '/break-even',
  '/cashflow',
  '/subscription',
  '/data',
  '/settings',
  '/terms',
  '/privacy',
  '/legal',
  '/cancellation',
  '/refund',
  '/cookies',
  '/legal-center',
  '/legal/privacy',
  '/legal/terms'
];

const getHashPathWithoutLanguage = (): string => {
  return getHashPathWithoutLanguageFromHash(window.location.hash);
};

const getPathnameLanguageContext = (): {
  language: SupportedLanguage | null;
  normalizedPath: string;
} => {
  return parsePathWithOptionalLanguage(window.location.pathname);
};

const ensureLanguagePrefixedPath = async (): Promise<void> => {
  const pathnameContext = getPathnameLanguageContext();

  if (pathnameContext.language) {
    await setCurrentLanguage(pathnameContext.language);
    return;
  }

  const normalizedPath = pathnameContext.normalizedPath;
  const isLegacyPublicPath =
    normalizedPath.startsWith('/s/') ||
    normalizedPath === '/s' ||
    normalizedPath.startsWith('/embed/') ||
    normalizedPath === '/embed';

  if (isLegacyPublicPath) {
    return;
  }

  const detectedLanguage = getCurrentLanguage();
  const targetPath = normalizedPath === '/' ? '/dashboard' : normalizedPath;
  const query = window.location.search ?? '';
  const hash = window.location.hash ?? '';
  const localizedUrl = `/${detectedLanguage}${targetPath}${query}${hash}`;
  const currentUrl = `${window.location.pathname}${query}${hash}`;

  if (localizedUrl !== currentUrl) {
    window.history.replaceState(null, '', localizedUrl);
  }
};

const goTo = (route: RoutePath): void => {
  window.location.hash = route;
};

const createActionButton = (label: string, onClick: () => void, className = ''): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = className;
  button.onclick = onClick;
  return button;
};

const emptyState = (title: string, description: string, actionText?: string, onAction?: () => void): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'empty-state';
  container.innerHTML = `<h3>${title}</h3><p>${description}</p>`;

  if (actionText && onAction) {
    container.appendChild(createActionButton(actionText, onAction));
  }

  return container;
};

const DEBUG_RESULTS_ENABLED = __MB_SHOW_DEBUG_RESULTS__;
let showDebugJson = false;

const service = WebAppService.createDefault();

const processBillingReturn = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const checkoutState = params.get('checkout');

  if (checkoutState !== 'success') {
    return;
  }

  if (service.isSignedIn()) {
    const signedInUserId = service.getSignedInUserId();
    const refreshToken = signedInUserId && signedInUserId.length > 0 ? signedInUserId : 'local_web_user';

    try {
      await service.forceRefreshEntitlements(refreshToken);
    } catch {
    }
  }

  params.delete('checkout');
  const remainingQuery = params.toString();
  const nextSearch = remainingQuery.length > 0 ? `?${remainingQuery}` : '';
  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
};

const render = async (): Promise<void> => {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  if (typeof document !== 'undefined') {
    document.title = String(translate('appName'));
  }

  addBaseStyles();
  const pathnameContext = getPathnameLanguageContext();
  if (pathnameContext.language) {
    await setCurrentLanguage(pathnameContext.language);
  }

  const hashPathWithoutLanguage = getHashPathWithoutLanguage();
  const embedRoute = getEmbedRoute(pathnameContext.normalizedPath, hashPathWithoutLanguage);
  if (embedRoute?.language) {
    await setCurrentLanguage(embedRoute.language);
  }

  if (embedRoute?.route === '/embed/profit') {
    renderEmbedProfitRoute(root, service);
    return;
  }

  if (embedRoute?.route === '/embed/breakeven') {
    renderEmbedBreakevenRoute(root, service);
    return;
  }

  if (embedRoute?.route === '/embed/cashflow') {
    renderEmbedCashflowRoute(root, service);
    return;
  }

  const sharedToken = getSharedToken(pathnameContext.normalizedPath, hashPathWithoutLanguage);
  if (sharedToken) {
    await renderSharedScenarioRoute(root, service, sharedToken, { createActionButton, goTo });
    return;
  }

  const route = getRoute(pathnameContext.normalizedPath, hashPathWithoutLanguage, ROUTES);

  if (route === '/' || route === '/login') {
    renderLoginPage(root, { createActionButton, goTo, setLegalBackTarget });
    return;
  }

  if (route === '/gate') {
    renderGatePage(root, service, { createActionButton, goTo });
    return;
  }

  if (route === '/dashboard') {
    await renderDashboardPage(root, service, { createActionButton, emptyState, goTo });
    return;
  }

  if (route === '/profit' || route === '/break-even' || route === '/cashflow') {
    await renderWorkspacePage(root, service, route, {
      createActionButton,
      emptyState,
      goTo,
      setLegalBackTarget,
      render,
      debugResultsEnabled: DEBUG_RESULTS_ENABLED,
      getShowDebugJson: () => showDebugJson,
      setShowDebugJson: (value) => {
        showDebugJson = value;
      }
    });
    return;
  }

  if (route === '/subscription') {
    renderSubscriptionPage(root, service, { createActionButton, goTo, setLegalBackTarget });
    return;
  }

  if (route === '/data') {
    await renderDataBackupPage(root, service, { createActionButton, goTo, render });
    return;
  }

  if (route === '/settings') {
    await renderSettingsPage(root, service, { createActionButton, goTo, setLegalBackTarget });
    return;
  }

  if (route === '/legal-center') {
    renderLegalCenter(root, goTo);
    return;
  }

  const legalRouteMap: Record<RoutePath, LegalRoute | null> = {
    '/': null,
    '/login': null,
    '/gate': null,
    '/dashboard': null,
    '/profit': null,
    '/break-even': null,
    '/cashflow': null,
    '/subscription': null,
    '/data': null,
    '/settings': null,
    '/terms': '/terms',
    '/privacy': '/privacy',
    '/legal': '/legal',
    '/cancellation': '/cancellation',
    '/refund': '/refund',
    '/cookies': '/cookies',
    '/legal-center': null,
    '/legal/privacy': '/privacy',
    '/legal/terms': '/terms'
  };

  const mappedLegalRoute = legalRouteMap[route];
  if (mappedLegalRoute) {
    renderLegalDocument(root, mappedLegalRoute, LEGAL_DOCS, goTo);
  }
};

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (!document.getElementById('app')) {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }

  window.addEventListener('hashchange', () => {
    void render();
  });

  if (!window.location.hash) {
    const path = getPathnameLanguageContext().normalizedPath as RoutePath;
    if (!ROUTES.includes(path)) {
      goTo('/login');
    }
  }

  const bootstrap = async (): Promise<void> => {
    await initializeI18nProvider();
    await ensureLanguagePrefixedPath();
    await processBillingReturn();
    await service.ensureFirstRunDemoScenarios();
    await render();
  };

  void bootstrap();
} else {
  console.log('Web app bundle built. Open in browser environment to run UI.');
}
