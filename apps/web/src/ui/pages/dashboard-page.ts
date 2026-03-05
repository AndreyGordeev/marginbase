import type { ModuleId } from '@marginbase/domain-core';
import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import { renderAppHeader } from './app-header';
import { renderSidebar } from './page-shared';
import type { AppRoutePath, CommonDeps } from './page-types';

export const renderDashboardPage = async (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'emptyState' | 'goTo'>
): Promise<void> => {
  const { createActionButton, emptyState, goTo } = deps;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderAppHeader());
  shell.appendChild(renderSidebar('/dashboard', { createActionButton, goTo }));

  const main = document.createElement('main');
  main.className = 'main';
  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = `<h2>${translate('dashboard.title')}</h2><span class="status">${translate('dashboard.softGateEnabled')}</span>`;
  main.appendChild(header);

  const moduleGrid = document.createElement('div');
  moduleGrid.className = 'grid-3';
  const modules: Array<{ title: string; route: AppRoutePath; moduleId: ModuleId }> = [
    { title: translate('dashboard.module.profit'), route: '/profit', moduleId: 'profit' },
    { title: translate('dashboard.module.breakeven'), route: '/break-even', moduleId: 'breakeven' },
    { title: translate('dashboard.module.cashflow'), route: '/cashflow', moduleId: 'cashflow' }
  ];

  for (const moduleItem of modules) {
    const card = document.createElement('div');
    card.className = 'card';
    const allowed = service.canOpenModule(moduleItem.moduleId);
    card.innerHTML = `<h3>${moduleItem.title}</h3><p>${translate('dashboard.status')}: ${allowed ? translate('dashboard.active') : translate('dashboard.locked')}</p>`;
    card.appendChild(
      createActionButton(translate('dashboard.open'), () => (allowed ? goTo(moduleItem.route) : goTo('/subscription')), allowed ? 'primary' : '')
    );
    moduleGrid.appendChild(card);
  }

  main.appendChild(moduleGrid);

  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  recentCard.innerHTML = `<h3>${translate('dashboard.recent')}</h3>`;
  const allScenarios = await service.listAllScenarios();

  if (allScenarios.length === 0) {
    recentCard.appendChild(emptyState(translate('dashboard.noRecent'), translate('dashboard.noRecentDesc'), translate('dashboard.openProfit'), () => goTo('/profit')));
  } else {
    const list = document.createElement('ul');
    for (const scenario of allScenarios.slice(0, 5)) {
      const item = document.createElement('li');
      item.textContent = `${scenario.module}: ${scenario.scenarioName} (${scenario.updatedAt})`;
      list.appendChild(item);
    }
    recentCard.appendChild(list);
  }

  main.appendChild(recentCard);
  const ad = document.createElement('div');
  ad.className = 'card';
  ad.innerHTML = `<div class="ad-placeholder">${translate('common.adPlaceholder')}</div>`;
  main.appendChild(ad);
  shell.appendChild(main);
  root.replaceChildren(shell);
};
