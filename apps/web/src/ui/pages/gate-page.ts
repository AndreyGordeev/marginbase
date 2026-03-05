import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import type { CommonDeps } from './page-types';

export const renderGatePage = (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo'>
): void => {
  const { createActionButton, goTo } = deps;

  const page = document.createElement('div');
  page.className = 'page page-centered';
  const card = document.createElement('div');
  card.className = 'card auth-card';

  const copy = document.createElement('div');
  copy.className = 'auth-copy';
  copy.innerHTML = `<h2>${translate('gate.title')}</h2><p>${translate('gate.subtitle')}</p>`;

  const actions = document.createElement('div');
  actions.className = 'auth-actions';
  actions.appendChild(createActionButton(translate('gate.startTrial'), async () => {
    await service.trackUpgradeClicked();

    let checkoutUrl: string | null = null;

    try {
      checkoutUrl = await service.startCheckoutSession('bundle', 'local_web_user', 'local_web_user@marginbase.local');
    } catch {
      checkoutUrl = null;
    }

    if (checkoutUrl) {
      await service.trackCheckoutRedirected();
      window.location.href = checkoutUrl;
      return;
    }

    service.activateTrial();
    goTo('/dashboard');
  }, 'primary'));
  actions.appendChild(createActionButton(translate('gate.continueDashboard'), () => goTo('/dashboard')));

  card.appendChild(copy);
  card.appendChild(actions);
  page.appendChild(card);
  root.replaceChildren(page);
};
