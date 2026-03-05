import type { ModuleId } from '@marginbase/domain-core';
import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import { TEST_IDS } from '../test-ids';
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
  shell.setAttribute('data-testid', TEST_IDS.APP_SHELL);
  shell.appendChild(renderSidebar('/dashboard', { createActionButton, goTo }));

  const main = document.createElement('main');
  main.className = 'main';
  main.setAttribute('data-testid', TEST_IDS.DASHBOARD_PAGE);
  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = `<h2>${translate('dashboard.title')}</h2><span class="status">${translate('dashboard.softGateEnabled')}</span>`;
  main.appendChild(header);

  const moduleGrid = document.createElement('div');
  moduleGrid.className = 'grid-3';
  moduleGrid.setAttribute('data-testid', TEST_IDS.MODULE_GRID);
  const modules: Array<{ title: string; route: AppRoutePath; moduleId: ModuleId; testId: string }> = [
    { title: translate('dashboard.module.profit'), route: '/profit', moduleId: 'profit', testId: TEST_IDS.MODULE_CARD_PROFIT },
    { title: translate('dashboard.module.breakeven'), route: '/break-even', moduleId: 'breakeven', testId: TEST_IDS.MODULE_CARD_BREAKEVEN },
    { title: translate('dashboard.module.cashflow'), route: '/cashflow', moduleId: 'cashflow', testId: TEST_IDS.MODULE_CARD_CASHFLOW }
  ];

  for (const moduleItem of modules) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-testid', moduleItem.testId);
    const allowed = service.canOpenModule(moduleItem.moduleId);
    card.innerHTML = `<h3>${moduleItem.title}</h3><p>${translate('dashboard.status')}: ${allowed ? translate('dashboard.active') : translate('dashboard.locked')}</p>`;
    const btn = createActionButton(translate('dashboard.open'), () => (allowed ? goTo(moduleItem.route) : goTo('/subscription')), allowed ? 'primary' : '');
    btn.setAttribute('data-testid', TEST_IDS.MODULE_OPEN_BUTTON);
    card.appendChild(btn);
    moduleGrid.appendChild(card);
  }

  main.appendChild(moduleGrid);

  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  recentCard.setAttribute('data-testid', TEST_IDS.RECENT_SCENARIOS);
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
