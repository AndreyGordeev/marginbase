import type { ModuleId } from '@marginbase/domain-core';
import { WebAppService } from '../web-app-service';
import { renderModuleResults } from '../ui/results/module-results';

type ActionButtonFactory = (label: string, onClick: () => void, className?: string) => HTMLButtonElement;

export const renderSharedScenarioRoute = async (
  root: HTMLElement,
  service: WebAppService,
  token: string,
  deps: {
    createActionButton: ActionButtonFactory;
    goTo: (route: '/profit' | '/break-even' | '/cashflow' | '/login' | '/subscription') => void;
  }
): Promise<void> => {
  const page = document.createElement('div');
  page.className = 'page';

  const card = document.createElement('section');
  card.className = 'card';
  card.innerHTML = '<h2>Shared Scenario</h2><p>Loaded from a sanitized share snapshot.</p>';

  try {
    const shared = await service.getSharedScenarioView(token);

    const results = document.createElement('div');
    results.className = 'card';
    results.appendChild(renderModuleResults(shared.module as ModuleId, shared.calculatedData, shared.inputData));

    const actions = document.createElement('div');
    actions.className = 'button-row';

    const openRoute = shared.module === 'profit' ? '/profit' : shared.module === 'breakeven' ? '/break-even' : '/cashflow';

    actions.appendChild(deps.createActionButton('Import this scenario', async () => {
      try {
        const importedModule = await service.importSharedScenario(token);
        const importedRoute = importedModule === 'profit' ? '/profit' : importedModule === 'breakeven' ? '/break-even' : '/cashflow';
        window.alert('Scenario imported to local storage.');
        deps.goTo(importedRoute);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed.';
        window.alert(message);
        if (message.toLowerCase().includes('sign in')) {
          deps.goTo('/login');
        }
      }
    }));

    actions.appendChild(deps.createActionButton('Save to My Scenarios', async () => {
      try {
        const savedModule = await service.saveSharedScenario(token);
        const savedRoute = savedModule === 'profit' ? '/profit' : savedModule === 'breakeven' ? '/break-even' : '/cashflow';
        window.alert('Scenario saved.');
        deps.goTo(savedRoute);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Save failed.';
        window.alert(message);
        const lower = message.toLowerCase();
        if (lower.includes('sign in')) {
          deps.goTo('/login');
        }
        if (lower.includes('entitlement')) {
          deps.goTo('/subscription');
        }
      }
    }));

    actions.appendChild(deps.createActionButton('Open in MarginBase', () => deps.goTo(openRoute), 'primary'));
    actions.appendChild(deps.createActionButton('Back to Login', () => deps.goTo('/login')));

    page.appendChild(card);
    page.appendChild(results);
    page.appendChild(actions);
  } catch (error) {
    const errorCard = document.createElement('section');
    errorCard.className = 'card';
    const message = error instanceof Error ? error.message : 'Failed to load shared scenario.';
    errorCard.innerHTML = `<h3>Unable to open shared scenario</h3><p>${message}</p>`;
    errorCard.appendChild(deps.createActionButton('Back to Login', () => deps.goTo('/login'), 'primary'));
    page.appendChild(card);
    page.appendChild(errorCard);
  }

  root.replaceChildren(page);
};
