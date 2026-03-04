import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import type { LegalRoute } from '../legal/legal-render';
import { renderSidebar } from './page-shared';
import type { CommonDeps } from './page-types';

export const renderSettingsPage = async (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo' | 'setLegalBackTarget'>
): Promise<void> => {
  const { createActionButton, goTo, setLegalBackTarget } = deps;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/settings', { createActionButton, goTo }));

  const main = document.createElement('main');
  main.className = 'main';

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h2>${translate('settings.title')}</h2><p>${translate('settings.subtitle')}</p>`;

  const deleteAccountButton = createActionButton(translate('settings.deleteAccountData'), async () => {
    const deleted = await service.deleteAccount('local_web_user');
    if (deleted) {
      window.alert(translate('settings.accountDeleted'));
      goTo('/login');
    }
  });

  card.appendChild(deleteAccountButton);

  const telemetryCard = document.createElement('div');
  telemetryCard.className = 'card';
  telemetryCard.innerHTML = `<h3>${translate('settings.telemetry.title')}</h3><p>${translate('settings.telemetry.subtitle')}</p>`;

  const telemetryState = document.createElement('p');
  telemetryState.textContent = `${translate('settings.telemetry.state')}: ${translate(`settings.telemetry.${service.getTelemetryConsentState()}`)}`;
  telemetryCard.appendChild(telemetryState);

  const telemetryActions = document.createElement('div');
  telemetryActions.className = 'button-row';

  telemetryActions.appendChild(createActionButton(translate('settings.telemetry.enable'), () => {
    service.setTelemetryConsentState('enabled');
    telemetryState.textContent = `${translate('settings.telemetry.state')}: ${translate('settings.telemetry.enabled')}`;
  }, 'primary'));

  telemetryActions.appendChild(createActionButton(translate('settings.telemetry.disable'), () => {
    service.setTelemetryConsentState('disabled');
    telemetryState.textContent = `${translate('settings.telemetry.state')}: ${translate('settings.telemetry.disabled')}`;
  }));

  telemetryActions.appendChild(createActionButton(translate('settings.telemetry.reset'), () => {
    service.setTelemetryConsentState('not_decided');
    telemetryState.textContent = `${translate('settings.telemetry.state')}: ${translate('settings.telemetry.not_decided')}`;
  }));

  telemetryCard.appendChild(telemetryActions);

  const legalCard = document.createElement('div');
  legalCard.className = 'card';
  legalCard.innerHTML = `<h3>${translate('settings.legal')}</h3>`;

  const legalLinks = document.createElement('ul');
  legalLinks.className = 'legal-links';
  const settingsEntries: Array<{ label: string; route: LegalRoute }> = [
    { label: translate('legal.terms'), route: '/terms' },
    { label: translate('legal.privacy'), route: '/privacy' },
    { label: translate('legal.cancellation'), route: '/cancellation' },
    { label: translate('legal.refund'), route: '/refund' },
    { label: translate('legal.notice'), route: '/legal' },
    { label: translate('legal.cookies'), route: '/cookies' }
  ];

  for (const entry of settingsEntries) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = entry.label;
    link.onclick = (event) => {
      event.preventDefault();
      setLegalBackTarget('/');
      goTo(entry.route);
    };
    item.appendChild(link);
    legalLinks.appendChild(item);
  }

  legalCard.appendChild(legalLinks);
  main.appendChild(card);
  main.appendChild(telemetryCard);
  main.appendChild(legalCard);

  shell.appendChild(main);
  root.replaceChildren(shell);
};
