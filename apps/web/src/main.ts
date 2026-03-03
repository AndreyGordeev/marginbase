import { WebAppService } from './web-app-service';
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

const getRoute = (): RoutePath => {
  const hash = window.location.hash.replace('#', '') as RoutePath;
  if (ROUTES.includes(hash)) {
    return hash;
  }

  const path = window.location.pathname as RoutePath;
  return ROUTES.includes(path) ? path : '/login';
};

const goTo = (route: RoutePath): void => {
  window.location.hash = route;
};

const createActionButton = (label: string, onClick: () => void, className = ''): HTMLButtonElement => {
  const button = document.createElement('button');
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

  addBaseStyles();
  const route = getRoute();

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
    const path = window.location.pathname as RoutePath;
    if (!ROUTES.includes(path)) {
      goTo('/login');
    }
  }

  void render();
} else {
  console.log('Web app bundle built. Open in browser environment to run UI.');
}
