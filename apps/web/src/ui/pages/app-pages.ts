import type { ModuleId } from '@marginbase/domain-core';
import { type BreakEvenInputState, type CashflowInputState, type ProfitInputState, WebAppService } from '../../web-app-service';
import { type LegalBackTarget, type LegalRoute } from '../legal/legal-render';
import { renderModuleResults } from '../results/module-results';

export type AppRoutePath =
  | '/'
  | '/login'
  | '/gate'
  | '/dashboard'
  | '/profit'
  | '/break-even'
  | '/cashflow'
  | '/subscription'
  | '/data'
  | '/settings'
  | '/terms'
  | '/privacy'
  | '/legal'
  | '/cancellation'
  | '/refund'
  | '/cookies'
  | '/legal-center'
  | '/legal/privacy'
  | '/legal/terms';

type ActionButtonFactory = (label: string, onClick: () => void, className?: string) => HTMLButtonElement;
type EmptyStateFactory = (title: string, description: string, actionText?: string, onAction?: () => void) => HTMLElement;

type CommonDeps = {
  createActionButton: ActionButtonFactory;
  emptyState: EmptyStateFactory;
  goTo: (route: AppRoutePath) => void;
  setLegalBackTarget: (target: LegalBackTarget) => void;
  render: () => Promise<void>;
};

type WorkspaceDeps = CommonDeps & {
  debugResultsEnabled: boolean;
  getShowDebugJson: () => boolean;
  setShowDebugJson: (value: boolean) => void;
};

const MAX_SCENARIO_NAME_LENGTH = 120;
const FORM_ERROR_VISIBLE_MS = 5000;

const parseNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeScenarioName = (value: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error('Scenario name is required.');
  }

  if (normalized.length > MAX_SCENARIO_NAME_LENGTH) {
    throw new Error(`Scenario name must be ${MAX_SCENARIO_NAME_LENGTH} characters or fewer.`);
  }

  return normalized;
};

export const renderSidebar = (
  active: AppRoutePath,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo'>
): HTMLElement => {
  const { createActionButton, goTo } = deps;

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  const links: Array<{ label: string; route: AppRoutePath }> = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Profit', route: '/profit' },
    { label: 'Break-even', route: '/break-even' },
    { label: 'Cashflow', route: '/cashflow' },
    { label: 'Subscription', route: '/subscription' },
    { label: 'Data & Backup', route: '/data' },
    { label: 'Settings', route: '/settings' }
  ];

  const title = document.createElement('h3');
  title.textContent = 'Margin Base';
  sidebar.appendChild(title);

  for (const link of links) {
    sidebar.appendChild(
      createActionButton(link.label, () => goTo(link.route), link.route === active ? 'primary' : '')
    );
  }

  return sidebar;
};

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
  copy.innerHTML = '<h2>Access Status</h2><p>Unlock calculators to save and compare scenarios.</p>';

  const actions = document.createElement('div');
  actions.className = 'auth-actions';
  actions.appendChild(createActionButton('Start Free Trial', async () => {
    let checkoutUrl: string | null = null;

    try {
      checkoutUrl = await service.startCheckoutSession('bundle', 'local_web_user', 'local_web_user@marginbase.local');
    } catch {
      checkoutUrl = null;
    }

    if (checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }

    service.activateTrial();
    goTo('/dashboard');
  }, 'primary'));
  actions.appendChild(createActionButton('Continue to Dashboard', () => goTo('/dashboard')));

  card.appendChild(copy);
  card.appendChild(actions);
  page.appendChild(card);
  root.replaceChildren(page);
};

export const renderDashboardPage = async (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'emptyState' | 'goTo'>
): Promise<void> => {
  const { createActionButton, emptyState, goTo } = deps;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/dashboard', { createActionButton, goTo }));

  const main = document.createElement('main');
  main.className = 'main';
  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = '<h2>Dashboard</h2><span class="status">Soft gate enabled</span>';
  main.appendChild(header);

  const moduleGrid = document.createElement('div');
  moduleGrid.className = 'grid-3';
  const modules: Array<{ title: string; route: AppRoutePath; moduleId: ModuleId }> = [
    { title: 'Profit Calculator', route: '/profit', moduleId: 'profit' },
    { title: 'Break-even Calculator', route: '/break-even', moduleId: 'breakeven' },
    { title: 'Cashflow Forecaster', route: '/cashflow', moduleId: 'cashflow' }
  ];

  for (const moduleItem of modules) {
    const card = document.createElement('div');
    card.className = 'card';
    const allowed = service.canOpenModule(moduleItem.moduleId);
    card.innerHTML = `<h3>${moduleItem.title}</h3><p>Status: ${allowed ? 'Active' : 'Locked'}</p>`;
    card.appendChild(
      createActionButton('Open', () => (allowed ? goTo(moduleItem.route) : goTo('/subscription')), allowed ? 'primary' : '')
    );
    moduleGrid.appendChild(card);
  }

  main.appendChild(moduleGrid);

  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  recentCard.innerHTML = '<h3>Recent scenarios</h3>';
  const allScenarios = await service.listAllScenarios();

  if (allScenarios.length === 0) {
    recentCard.appendChild(emptyState('No recent activity', 'Your recent scenarios will appear here.', 'Open Profit Calculator', () => goTo('/profit')));
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
  ad.innerHTML = '<div class="ad-placeholder">Ad block placeholder</div>';
  main.appendChild(ad);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

export const renderWorkspacePage = async (
  root: HTMLElement,
  service: WebAppService,
  route: '/profit' | '/break-even' | '/cashflow',
  deps: WorkspaceDeps
): Promise<void> => {
  const {
    createActionButton,
    emptyState,
    goTo,
    render,
    debugResultsEnabled,
    getShowDebugJson,
    setShowDebugJson
  } = deps;

  const moduleMap: Record<typeof route, ModuleId> = {
    '/profit': 'profit',
    '/break-even': 'breakeven',
    '/cashflow': 'cashflow'
  };
  const moduleTitleMap: Record<ModuleId, string> = {
    profit: 'Profit',
    breakeven: 'Break-even',
    cashflow: 'Cashflow'
  };

  const moduleId = moduleMap[route];
  const moduleTitle = moduleTitleMap[moduleId];
  const allowed = service.canOpenModule(moduleId);
  const scenarios = await service.listScenarios(moduleId);
  const selectedScenario = scenarios[0] ?? null;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar(route, { createActionButton, goTo }));

  const main = document.createElement('main');
  main.className = 'main';
  const workspace = document.createElement('div');
  workspace.className = 'workspace';

  const listPanel = document.createElement('section');
  listPanel.className = 'card scenario-list';
  listPanel.innerHTML = `<h3>${moduleTitle} Scenarios</h3>`;
  listPanel.appendChild(createActionButton('+ New Scenario', async () => {
    await service.createDefaultScenario(moduleId);
    await render();
  }, 'primary scenario-create'));

  if (scenarios.length === 0) {
    listPanel.appendChild(emptyState('No scenarios yet', 'Create your first scenario to start analyzing.'));
  } else {
    for (const scenario of scenarios) {
      const row = document.createElement('div');
      row.className = 'scenario-item';
      row.innerHTML = `<span>${scenario.scenarioName}</span>`;
      row.appendChild(createActionButton('Delete', async () => {
        await service.deleteScenario(scenario.scenarioId);
        await render();
      }));
      listPanel.appendChild(row);
    }
  }

  const center = document.createElement('section');
  center.className = 'card';
  center.innerHTML = `<h3>${moduleTitle} Editor</h3>`;

  const form = document.createElement('form');
  form.className = 'form-grid';
  form.onsubmit = (event) => {
    event.preventDefault();
  };

  const formError = document.createElement('div');
  formError.className = 'inline-error';
  formError.hidden = true;
  let formErrorTimer: ReturnType<typeof setTimeout> | undefined;

  const clearFormError = (): void => {
    if (formErrorTimer) {
      clearTimeout(formErrorTimer);
      formErrorTimer = undefined;
    }
    formError.hidden = true;
    formError.textContent = '';
  };

  const showFormError = (message: string): void => {
    if (formErrorTimer) {
      clearTimeout(formErrorTimer);
    }

    formError.hidden = false;
    formError.textContent = message;

    formErrorTimer = setTimeout(() => {
      formError.hidden = true;
      formError.textContent = '';
      formErrorTimer = undefined;
    }, FORM_ERROR_VISIBLE_MS);
  };

  if (moduleId === 'profit') {
    const state: ProfitInputState = service.getProfitInputState(selectedScenario?.inputData);
    form.innerHTML = `
      <label>Scenario Name<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>Unit price (minor)<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
      <label>Quantity<input name="quantity" type="number" value="${state.quantity}" /></label>
      <label>Variable cost / unit<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
      <label>Fixed costs<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
    `;
  }

  if (moduleId === 'breakeven') {
    const state: BreakEvenInputState = service.getBreakEvenInputState(selectedScenario?.inputData);
    form.innerHTML = `
      <label>Scenario Name<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>Unit price (minor)<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
      <label>Variable cost / unit<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
      <label>Fixed costs<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
      <label>Target profit<input name="targetProfitMinor" type="number" value="${state.targetProfitMinor}" /></label>
      <label>Planned quantity<input name="plannedQuantity" type="number" value="${state.plannedQuantity}" /></label>
    `;
  }

  if (moduleId === 'cashflow') {
    const state: CashflowInputState = service.getCashflowInputState(selectedScenario?.inputData);
    form.innerHTML = `
      <label>Scenario Name<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>Starting cash<input name="startingCashMinor" type="number" value="${state.startingCashMinor}" /></label>
      <label>Base revenue<input name="baseMonthlyRevenueMinor" type="number" value="${state.baseMonthlyRevenueMinor}" /></label>
      <label>Fixed monthly costs<input name="fixedMonthlyCostsMinor" type="number" value="${state.fixedMonthlyCostsMinor}" /></label>
      <label>Variable monthly costs<input name="variableMonthlyCostsMinor" type="number" value="${state.variableMonthlyCostsMinor}" /></label>
      <label>Months<input name="forecastMonths" type="number" value="${state.forecastMonths}" /></label>
      <label>Growth rate<input name="monthlyGrowthRate" type="number" step="0.01" value="${state.monthlyGrowthRate}" /></label>
    `;
  }

  form.appendChild(
    createActionButton('Culculate Scenario', async () => {
      clearFormError();

      try {
        const data = new FormData(form);
        const scenarioName = normalizeScenarioName(String(data.get('scenarioName') ?? ''));

        if (moduleId === 'profit') {
          await service.saveProfitScenario({
            scenarioId: selectedScenario?.scenarioId,
            scenarioName,
            unitPriceMinor: parseNumber(String(data.get('unitPriceMinor') ?? '0'), 0),
            quantity: parseNumber(String(data.get('quantity') ?? '0'), 0),
            variableCostPerUnitMinor: parseNumber(String(data.get('variableCostPerUnitMinor') ?? '0'), 0),
            fixedCostsMinor: parseNumber(String(data.get('fixedCostsMinor') ?? '0'), 0)
          });
        }

        if (moduleId === 'breakeven') {
          await service.saveBreakEvenScenario({
            scenarioId: selectedScenario?.scenarioId,
            scenarioName,
            unitPriceMinor: parseNumber(String(data.get('unitPriceMinor') ?? '0'), 0),
            variableCostPerUnitMinor: parseNumber(String(data.get('variableCostPerUnitMinor') ?? '0'), 0),
            fixedCostsMinor: parseNumber(String(data.get('fixedCostsMinor') ?? '0'), 0),
            targetProfitMinor: parseNumber(String(data.get('targetProfitMinor') ?? '0'), 0),
            plannedQuantity: parseNumber(String(data.get('plannedQuantity') ?? '0'), 0)
          });
        }

        if (moduleId === 'cashflow') {
          await service.saveCashflowScenario({
            scenarioId: selectedScenario?.scenarioId,
            scenarioName,
            startingCashMinor: parseNumber(String(data.get('startingCashMinor') ?? '0'), 0),
            baseMonthlyRevenueMinor: parseNumber(String(data.get('baseMonthlyRevenueMinor') ?? '0'), 0),
            fixedMonthlyCostsMinor: parseNumber(String(data.get('fixedMonthlyCostsMinor') ?? '0'), 0),
            variableMonthlyCostsMinor: parseNumber(String(data.get('variableMonthlyCostsMinor') ?? '0'), 0),
            forecastMonths: parseNumber(String(data.get('forecastMonths') ?? '1'), 1),
            monthlyGrowthRate: parseNumber(String(data.get('monthlyGrowthRate') ?? '0'), 0)
          });
        }

        await render();
      } catch (error) {
        showFormError(error instanceof Error ? error.message : 'Validation failed. Please review your inputs.');
      }
    }, 'primary form-submit')
  );

  center.appendChild(formError);
  center.appendChild(form);
  const ad = document.createElement('div');
  ad.className = 'ad-placeholder';
  ad.textContent = 'Ad block placeholder';
  center.appendChild(ad);

  const results = document.createElement('section');
  results.className = 'card';
  results.innerHTML = '<h3>Results</h3>';
  if (selectedScenario?.calculatedData) {
    results.appendChild(renderModuleResults(moduleId, selectedScenario.calculatedData, selectedScenario.inputData));

    if (debugResultsEnabled) {
      const toggleRow = document.createElement('label');
      toggleRow.className = 'results-debug-toggle';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = getShowDebugJson();
      checkbox.onchange = async () => {
        setShowDebugJson(checkbox.checked);
        await render();
      };

      const text = document.createElement('span');
      text.textContent = 'Show debug JSON';

      toggleRow.appendChild(checkbox);
      toggleRow.appendChild(text);
      results.appendChild(toggleRow);

      if (getShowDebugJson()) {
        const pre = document.createElement('pre');
        pre.className = 'results-json';
        pre.textContent = JSON.stringify(selectedScenario.calculatedData, null, 2);
        results.appendChild(pre);
      }
    }
  } else {
    results.appendChild(emptyState('No results yet', 'Calculate scenario to view formatted outputs.'));
  }

  if (!allowed) {
    const overlay = document.createElement('div');
    overlay.className = 'locked-overlay';
    overlay.innerHTML = '<strong>This module requires an active subscription.</strong>';
    overlay.appendChild(createActionButton('Go to Subscription', () => goTo('/subscription'), 'primary'));
    overlay.appendChild(createActionButton('Back to Dashboard', () => goTo('/dashboard')));
    results.appendChild(overlay);
  }

  workspace.appendChild(listPanel);
  workspace.appendChild(center);
  workspace.appendChild(results);
  main.appendChild(workspace);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

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
  card.innerHTML = '<h2>Subscription</h2><p>Monthly plans (Price TBD)</p>';

  const actions = document.createElement('div');
  actions.className = 'button-row';
  actions.appendChild(createActionButton('Activate Bundle (Local Mock)', () => {
    service.activateBundle();
    goTo('/dashboard');
  }, 'primary'));
  actions.appendChild(createActionButton('Refresh Subscription Status', () => goTo('/subscription')));

  const disclosure = document.createElement('div');
  disclosure.className = 'inline-error';
  disclosure.innerHTML = '<p>Free trial requires a payment method.</p><p>After the trial, your subscription renews automatically unless cancelled.</p>';

  const disclosureLinks = document.createElement('div');
  disclosureLinks.className = 'button-row';
  const termsLink = document.createElement('button');
  termsLink.className = 'link-muted';
  termsLink.textContent = 'Terms of Service';
  termsLink.onclick = () => {
    setLegalBackTarget('/');
    goTo('/terms');
  };

  const cancellationLink = document.createElement('button');
  cancellationLink.className = 'link-muted';
  cancellationLink.textContent = 'Cancellation Policy';
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

export const renderDataBackupPage = async (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo' | 'render'>
): Promise<void> => {
  const { createActionButton, goTo: _goTo, render } = deps;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/data', { createActionButton, goTo: _goTo }));

  const main = document.createElement('main');
  main.className = 'main';

  const title = document.createElement('h2');
  title.textContent = 'Data & Backup';

  const sections = document.createElement('div');
  sections.className = 'space-y-6';

  const exportButton = createActionButton('Export all scenarios (JSON)', async () => {
    const payload = await service.exportScenariosJson();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'marginbase-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
    window.alert('Export completed.');
  }, 'primary');

  const importInput = document.createElement('textarea');
  importInput.placeholder = 'Paste import JSON here';
  importInput.rows = 10;

  const importSummary = document.createElement('div');
  importSummary.className = 'modal';

  const previewButton = createActionButton('Preview Import', () => {
    const preview = service.previewImport(importInput.value);
    if (!preview.ok) {
      importSummary.innerHTML = `<div class="inline-error"><strong>Preview failed.</strong> ${preview.errors[0]?.message ?? 'Import preview failed.'}</div>`;
      return;
    }

    importSummary.innerHTML = `
      <h3>Import Scenarios</h3>
      <p>Total: ${preview.summary.total}</p>
      <p>Profit: ${preview.summary.profit}</p>
      <p>Break-even: ${preview.summary.breakeven}</p>
      <p>Cashflow: ${preview.summary.cashflow}</p>
      <p><strong>This will replace all existing scenarios.</strong></p>
    `;
  });

  const confirmButton = createActionButton('Confirm Import (Replace all)', async () => {
    const result = service.previewImport(importInput.value);
    if (!result.ok) {
      window.alert('Import failed.');
      return;
    }

    await service.applyImport(result);
    window.alert('Import completed.');
    await render();
  }, 'primary');

  const exportCard = document.createElement('section');
  exportCard.className = 'card';
  exportCard.innerHTML = '<h3>Export</h3><p>Export all local scenarios to a JSON file.</p>';
  exportCard.appendChild(exportButton);

  const importCard = document.createElement('section');
  importCard.className = 'card';
  importCard.innerHTML = '<h3>Import</h3><p>Import scenarios from JSON. This replaces all existing scenarios.</p>';
  const importActions = document.createElement('div');
  importActions.className = 'button-row';
  importCard.appendChild(importInput);
  importActions.appendChild(previewButton);
  importActions.appendChild(confirmButton);
  importCard.appendChild(importActions);
  importCard.appendChild(importSummary);

  sections.appendChild(exportCard);
  sections.appendChild(importCard);

  main.appendChild(title);
  main.appendChild(sections);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

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
  card.innerHTML = '<h2>Settings</h2><p>Account actions and future configuration options.</p>';

  const deleteAccountButton = createActionButton('Delete account data', async () => {
    const deleted = await service.deleteAccount('local_web_user');
    if (deleted) {
      window.alert('Account data deleted.');
      goTo('/login');
    }
  });

  card.appendChild(deleteAccountButton);

  const legalCard = document.createElement('div');
  legalCard.className = 'card';
  legalCard.innerHTML = '<h3>Legal</h3>';

  const legalLinks = document.createElement('ul');
  legalLinks.className = 'legal-links';
  const settingsEntries: Array<{ label: string; route: LegalRoute }> = [
    { label: 'Terms of Service', route: '/terms' },
    { label: 'Privacy Policy', route: '/privacy' },
    { label: 'Cancellation & Withdrawal', route: '/cancellation' },
    { label: 'Refund Policy', route: '/refund' },
    { label: 'Legal Notice', route: '/legal' },
    { label: 'Cookie Policy', route: '/cookies' }
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
  main.appendChild(legalCard);
  shell.appendChild(main);
  root.replaceChildren(shell);
};