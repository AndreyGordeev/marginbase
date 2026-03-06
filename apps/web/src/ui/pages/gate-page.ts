import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import type { CommonDeps } from './page-types';

export const renderGatePage = (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo'>,
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
  actions.appendChild(
    createActionButton(
      translate('gate.startTrial'),
      async () => {
        await service.trackUpgradeClicked();
        const userId = service.getSignedInUserId() || 'guest';
        let checkoutUrl: string | null = null;

        try {
          // Use real user ID and a placeholder email for now
          // In a real app, this would come from the verified token
          const email = `${userId}@marginbase.app`;
          checkoutUrl = await service.startCheckoutSession(
            'bundle',
            userId,
            email,
          );
        } catch (error) {
          console.error('Failed to create checkout session:', error);
          checkoutUrl = null;
        }

        if (checkoutUrl) {
          await service.trackCheckoutRedirected();
          window.location.href = checkoutUrl;
          return;
        }

        // Fallback in development only: activate trial locally if checkout fails
        if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
          service.activateTrial();
          goTo('/dashboard');
        } else {
          window.alert(
            'Checkout unavailable. Please try again later or contact support.',
          );
        }
      },
      'primary',
    ),
  );
  actions.appendChild(
    createActionButton(translate('gate.continueDashboard'), () =>
      goTo('/dashboard'),
    ),
  );

  card.appendChild(copy);
  card.appendChild(actions);
  page.appendChild(card);
  root.replaceChildren(page);
};
