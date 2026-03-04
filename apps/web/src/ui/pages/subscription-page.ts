import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import { renderSidebar } from './page-shared';
import type { CommonDeps } from './page-types';

export const renderSubscriptionPage = (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo' | 'setLegalBackTarget'>
): void => {
  const { createActionButton, goTo, setLegalBackTarget } = deps;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/subscription', { createActionButton, goTo }));
  const main = document.createElement('main');
  main.className = 'main';
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h2>${translate('subscription.title')}</h2><p>${translate('subscription.monthlyPlans')}</p>`;

  const actions = document.createElement('div');
  actions.className = 'button-row';
  actions.appendChild(createActionButton(translate('subscription.activateBundleLocal'), () => {
    service.activateBundle();
    goTo('/dashboard');
  }, 'primary'));
  actions.appendChild(createActionButton(translate('subscription.refreshStatus'), () => goTo('/subscription')));

  const disclosure = document.createElement('div');
  disclosure.className = 'inline-error';
  disclosure.innerHTML = `<p>${translate('subscription.disclosureTrial')}</p><p>${translate('subscription.disclosureRenewal')}</p>`;

  const disclosureLinks = document.createElement('div');
  disclosureLinks.className = 'button-row';
  const termsLink = document.createElement('button');
  termsLink.className = 'link-muted';
  termsLink.textContent = translate('legal.terms');
  termsLink.onclick = () => {
    setLegalBackTarget('/');
    goTo('/terms');
  };

  const cancellationLink = document.createElement('button');
  cancellationLink.className = 'link-muted';
  cancellationLink.textContent = translate('legal.cancellation');
  cancellationLink.onclick = () => {
    setLegalBackTarget('/');
    goTo('/cancellation');
  };

  disclosureLinks.appendChild(termsLink);
  disclosureLinks.appendChild(cancellationLink);

  card.appendChild(actions);
  card.appendChild(disclosure);
  card.appendChild(disclosureLinks);
  main.appendChild(card);
  shell.appendChild(main);
  root.replaceChildren(shell);
};
