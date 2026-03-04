import { WebAppService } from './web-app-service';
import { SUPPORTED_LANGUAGES, getCurrentLanguage, initializeI18nProvider, setCurrentLanguage, translate, type SupportedLanguage } from './i18n';
import { renderEmbedBreakevenRoute } from './routes/embedBreakeven';
import { renderEmbedCashflowRoute } from './routes/embedCashflow';
import { renderEmbedProfitRoute } from './routes/embedProfit';
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

const stripTrailingSlash = (path: string): string => {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }

  return path;
};

const isSupportedLanguage = (value: string): value is SupportedLanguage => {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
};

const splitPath = (path: string): string[] => {
  return stripTrailingSlash(path).split('/').filter((segment) => segment.trim().length > 0);
};

const parsePathWithOptionalLanguage = (path: string): {
  language: SupportedLanguage | null;
  normalizedPath: string;
} => {
  const normalizedInput = path && path.startsWith('/') ? path : '/';
  const segments = splitPath(normalizedInput);
  if (segments.length === 0) {
    return {
      language: null,
      normalizedPath: '/'
    };
  }

  const [first, ...rest] = segments;
  if (!isSupportedLanguage(first)) {
    return {
      language: null,
      normalizedPath: normalizedInput
    };
  }

  return {
    language: first,
    normalizedPath: rest.length > 0 ? `/${rest.join('/')}` : '/'
  };
};

const getHashPathWithoutLanguage = (): string => {
  const hashPath = window.location.hash.replace('#', '').trim();
  if (!hashPath) {
    return '';
  }

  return parsePathWithOptionalLanguage(hashPath).normalizedPath;
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
  const targetPath = normalizedPath === '/' ? '/login' : normalizedPath;
  const query = window.location.search ?? '';
  const hash = window.location.hash ?? '';
  const localizedUrl = `/${detectedLanguage}${targetPath}${query}${hash}`;
  const currentUrl = `${window.location.pathname}${query}${hash}`;

  if (localizedUrl !== currentUrl) {
    window.history.replaceState(null, '', localizedUrl);
  }
};

const getSharedToken = (pathnameWithoutLanguage: string): string | null => {
  const hash = getHashPathWithoutLanguage();
  if (hash.startsWith('/s/')) {
    const token = hash.slice('/s/'.length).trim();
    return token ? decodeURIComponent(token) : null;
  }

  const path = pathnameWithoutLanguage;
  if (path.startsWith('/s/')) {
    const token = path.slice('/s/'.length).trim();
    return token ? decodeURIComponent(token) : null;
  }

  return null;
};

const getEmbedRoute = (pathnameWithoutLanguage: string): {
  route: '/embed/profit' | '/embed/breakeven' | '/embed/cashflow';
  language: SupportedLanguage | null;
} | null => {
  const hashPath = getHashPathWithoutLanguage();
  const path = hashPath || pathnameWithoutLanguage;
  const segments = stripTrailingSlash(path).split('/').filter((segment) => segment.trim().length > 0);

  if (segments.length === 0 || segments[0] !== 'embed') {
    return null;
  }

  let language: SupportedLanguage | null = null;
  let calculatorSegment = segments[1] ?? '';

  if (segments.length >= 3 && isSupportedLanguage(segments[1])) {
    language = segments[1];
    calculatorSegment = segments[2] ?? '';
  }

  const normalizedCalculator = calculatorSegment === 'break-even' ? 'breakeven' : calculatorSegment;

  if (normalizedCalculator === 'profit') {
    return { route: '/embed/profit', language };
  }

  if (normalizedCalculator === 'breakeven') {
    return { route: '/embed/breakeven', language };
  }

  if (normalizedCalculator === 'cashflow') {
    return { route: '/embed/cashflow', language };
  }

  return null;
};

const getRoute = (pathnameWithoutLanguage: string): RoutePath => {
  const hash = getHashPathWithoutLanguage() as RoutePath;
  if (ROUTES.includes(hash)) {
    return hash;
  }

  const path = pathnameWithoutLanguage as RoutePath;
  return ROUTES.includes(path) ? path : '/login';
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

  const embedRoute = getEmbedRoute(pathnameContext.normalizedPath);
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

  const sharedToken = getSharedToken(pathnameContext.normalizedPath);
  if (sharedToken) {
    await renderSharedScenarioRoute(root, service, sharedToken, { createActionButton, goTo });
    return;
  }

  const route = getRoute(pathnameContext.normalizedPath);

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
    await render();
  };

  void bootstrap();
} else {
  console.log('Web app bundle built. Open in browser environment to run UI.');
}
