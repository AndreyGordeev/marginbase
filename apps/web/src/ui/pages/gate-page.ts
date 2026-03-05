import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import { TEST_IDS } from '../test-ids';
import type { CommonDeps } from './page-types';

export const renderGatePage = (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo'>
): void => {
  const { createActionButton, goTo } = deps;

  const page = document.createElement('div');
  page.className = 'page page-centered';
  page.setAttribute('data-testid', TEST_IDS.GATE_PAGE);
  const card = document.createElement('div');
  card.className = 'card auth-card';

  const copy = document.createElement('div');
  copy.className = 'auth-copy';
  copy.innerHTML = `<h2 data-testid="${TEST_IDS.PAYWALL_HEADING}">${translate('gate.title')}</h2><p>${translate('gate.subtitle')}</p>`;

  const actions = document.createElement('div');
  actions.className = 'auth-actions';
  const trialBtn = createActionButton(translate('gate.startTrial'), async () => {
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
  }, 'primary');
  trialBtn.setAttribute('data-testid', TEST_IDS.TRIAL_CTA);
  actions.appendChild(trialBtn);
  
  const continuBtn = createActionButton(translate('gate.continueDashboard'), () => goTo('/dashboard'));
  continuBtn.setAttribute('data-testid', TEST_IDS.UPGRADE_CTA);
  actions.appendChild(continuBtn);

  card.appendChild(copy);
  card.appendChild(actions);
  page.appendChild(card);
  root.replaceChildren(page);
};
