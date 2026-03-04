import type { ModuleId } from '@marginbase/domain-core';
import type { ReportModel } from '@marginbase/reporting';
import { createLanguageSwitcher, translate } from '../../i18n';
import { getPrefillFromSearch } from '../../features/embed/prefill';
import { renderShareScenarioDialog } from '../../features/share/ShareScenarioDialog';
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
const MAX_SAFE_INTEGER_TEXT = Number.MAX_SAFE_INTEGER.toLocaleString('en-US');

const getValidationFieldLabels = (): Record<string, string> => ({
  scenarioName: translate('validation.scenarioName'),
  unitPriceMinor: translate('validation.unitPrice'),
  quantity: translate('validation.quantity'),
  variableCostPerUnitMinor: translate('validation.variableCostPerUnit'),
  fixedCostsMinor: translate('validation.fixedCosts'),
  targetProfitMinor: translate('validation.targetProfit'),
  plannedQuantity: translate('validation.plannedQuantity'),
  startingCashMinor: translate('validation.startingCash'),
  baseMonthlyRevenueMinor: translate('validation.baseRevenue'),
  fixedMonthlyCostsMinor: translate('validation.fixedMonthlyCosts'),
  variableMonthlyCostsMinor: translate('validation.variableMonthlyCosts'),
  forecastMonths: translate('validation.months'),
  monthlyGrowthRate: translate('validation.growthRate'),
  netProfitMinor: translate('validation.netProfit'),
  totalCostMinor: translate('validation.totalCost')
});

const parseRequiredNumber = (value: string, fieldLabel: string): number => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a valid number.`);
  }

  return parsed;
};

const normalizeScenarioName = (value: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(translate('validation.scenarioNameRequired'));
  }

  if (normalized.length > MAX_SCENARIO_NAME_LENGTH) {
    throw new Error(translate('validation.scenarioNameMax', { max: MAX_SCENARIO_NAME_LENGTH }));
  }

  return normalized;
};

const toUserFriendlyValidationMessage = (message: string): string => {
  let formattedMessage = message;

  for (const [fieldName, label] of Object.entries(getValidationFieldLabels())) {
    const fieldPattern = new RegExp(`\\b${fieldName}\\b`, 'g');
    formattedMessage = formattedMessage.replace(fieldPattern, label);
  }

  formattedMessage = formattedMessage
    .replace(/must be a safe integer greater than or equal to 0\.?/gi, translate('validation.safeIntegerNonNegative', { max: MAX_SAFE_INTEGER_TEXT }))
    .replace(/must be a safe integer in minor units\.?/gi, translate('validation.safeIntegerMinorUnits', { max: MAX_SAFE_INTEGER_TEXT }))
    .replace(/must be an integer greater than or equal to 0\.?/gi, translate('validation.integerNonNegative'))
    .replace(/must be an integer in minor units\.?/gi, translate('validation.integerMinorUnits'));

  return formattedMessage;
};

const formatReportMoney = (minor: number, currencyCode: string, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(minor / 100);
};

const formatReportPct = (value: number | null, locale: string): string => {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

const renderBusinessReportPreview = (report: ReportModel): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'modal';

  const summary = document.createElement('div');
  summary.innerHTML = `<h3>${report.summary.title}</h3><p>${translate('report.generatedLocally')}: ${report.summary.generatedAtLocal}</p>`;
  container.appendChild(summary);

  if (report.profitability) {
    const section = document.createElement('div');
    section.innerHTML = `
      <h4>${translate('report.profitability')}</h4>
      <p>${translate('report.revenue')}: ${formatReportMoney(report.profitability.revenueTotalMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.totalCost')}: ${formatReportMoney(report.profitability.totalCostMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.grossProfit')}: ${formatReportMoney(report.profitability.grossProfitMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.netProfit')}: ${formatReportMoney(report.profitability.netProfitMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.contributionMargin')}: ${formatReportPct(report.profitability.contributionMarginPct, report.summary.locale)}</p>
      <p>${translate('report.netMargin')}: ${formatReportPct(report.profitability.netProfitPct, report.summary.locale)}</p>
      <p>${translate('report.markup')}: ${formatReportPct(report.profitability.markupPct, report.summary.locale)}</p>
    `;
    container.appendChild(section);
  }

  if (report.breakeven) {
    const section = document.createElement('div');
    section.innerHTML = `
      <h4>${translate('report.breakeven')}</h4>
      <p>${translate('report.breakEvenQuantity')}: ${report.breakeven.breakEvenQuantity ?? '—'}</p>
      <p>${translate('report.breakEvenRevenue')}: ${report.breakeven.breakEvenRevenueMinor === null ? '—' : formatReportMoney(report.breakeven.breakEvenRevenueMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.requiredQuantityTarget')}: ${report.breakeven.requiredQuantityForTargetProfit ?? '—'}</p>
      <p>${translate('report.requiredRevenueTarget')}: ${report.breakeven.requiredRevenueForTargetProfitMinor === null ? '—' : formatReportMoney(report.breakeven.requiredRevenueForTargetProfitMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.marginOfSafety')}: ${report.breakeven.marginOfSafetyUnits ?? '—'} (${formatReportPct(report.breakeven.marginOfSafetyPct, report.summary.locale)})</p>
    `;
    container.appendChild(section);
  }

  if (report.cashflow) {
    const section = document.createElement('div');
    const projectionRows = report.cashflow.monthlyProjection.slice(0, 12).map((entry) => {
      return `<li>${translate('report.month')} ${entry.monthIndex}: ${formatReportMoney(entry.revenueMinor, report.summary.currencyCode, report.summary.locale)} | ${formatReportMoney(entry.expensesMinor, report.summary.currencyCode, report.summary.locale)} | ${formatReportMoney(entry.netCashflowMinor, report.summary.currencyCode, report.summary.locale)} | ${formatReportMoney(entry.cashBalanceMinor, report.summary.currencyCode, report.summary.locale)}</li>`;
    }).join('');

    section.innerHTML = `
      <h4>${translate('report.cashflow')}</h4>
      <p>${translate('report.finalBalance')}: ${formatReportMoney(report.cashflow.finalBalanceMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.firstNegativeMonth')}: ${report.cashflow.firstNegativeMonth ?? '—'}</p>
      <ul>${projectionRows}</ul>
    `;
    container.appendChild(section);
  }

  if (report.riskIndicators.length > 0) {
    const section = document.createElement('div');
    const risks = report.riskIndicators.map((risk) => `<li>${risk.severity.toUpperCase()}: ${risk.message}</li>`).join('');
    section.innerHTML = `<h4>${translate('report.riskIndicators')}</h4><ul>${risks}</ul>`;
    container.appendChild(section);
  }

  const disclaimer = document.createElement('p');
  disclaimer.textContent = report.disclaimer;
  container.appendChild(disclaimer);

  return container;
};

export const renderSidebar = (
  active: AppRoutePath,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo'>
): HTMLElement => {
  const { createActionButton, goTo } = deps;

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  const links: Array<{ label: string; route: AppRoutePath }> = [
    { label: translate('sidebar.dashboard'), route: '/dashboard' },
    { label: translate('sidebar.profit'), route: '/profit' },
    { label: translate('sidebar.breakeven'), route: '/break-even' },
    { label: translate('sidebar.cashflow'), route: '/cashflow' },
    { label: translate('sidebar.subscription'), route: '/subscription' },
    { label: translate('sidebar.dataBackup'), route: '/data' },
    { label: translate('sidebar.settings'), route: '/settings' }
  ];

  const title = document.createElement('h3');
  title.textContent = translate('sidebar.title');
  sidebar.appendChild(title);
  sidebar.appendChild(createLanguageSwitcher());

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
  copy.innerHTML = `<h2>${translate('gate.title')}</h2><p>${translate('gate.subtitle')}</p>`;

  const actions = document.createElement('div');
  actions.className = 'auth-actions';
  actions.appendChild(createActionButton(translate('gate.startTrial'), async () => {
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
  actions.appendChild(createActionButton(translate('gate.continueDashboard'), () => goTo('/dashboard')));

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
    profit: translate('workspace.module.profit'),
    breakeven: translate('workspace.module.breakeven'),
    cashflow: translate('workspace.module.cashflow')
  };

  const moduleId = moduleMap[route];
  const moduleTitle = moduleTitleMap[moduleId];
  const allowed = service.canOpenModule(moduleId);
  const scenarios = await service.listScenarios(moduleId);
  const selectedScenario = scenarios[0] ?? null;
  const prefill = typeof window !== 'undefined' ? getPrefillFromSearch(window.location.search) : null;

  const prefillInputData = (() => {
    if (!prefill) {
      return undefined;
    }

    if (moduleId === 'profit' && prefill.module === 'profit') {
      return prefill.inputData;
    }

    if (moduleId === 'breakeven' && prefill.module === 'breakeven') {
      return prefill.inputData;
    }

    if (moduleId === 'cashflow' && prefill.module === 'cashflow') {
      return prefill.inputData;
    }

    return undefined;
  })();

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar(route, { createActionButton, goTo }));

  const main = document.createElement('main');
  main.className = 'main';
  const workspace = document.createElement('div');
  workspace.className = 'workspace';

  const listPanel = document.createElement('section');
  listPanel.className = 'card scenario-list';
  listPanel.innerHTML = `<h3>${moduleTitle} ${translate('workspace.scenarios')}</h3>`;
  listPanel.appendChild(createActionButton(translate('workspace.newScenario'), async () => {
    await service.createDefaultScenario(moduleId);
    await render();
  }, 'primary scenario-create'));

  if (scenarios.length === 0) {
    listPanel.appendChild(emptyState(translate('workspace.noScenarios'), translate('workspace.noScenariosDesc')));
  } else {
    for (const scenario of scenarios) {
      const row = document.createElement('div');
      row.className = 'scenario-item';
      row.innerHTML = `<span>${scenario.scenarioName}</span>`;
      row.appendChild(createActionButton(translate('workspace.delete'), async () => {
        await service.deleteScenario(scenario.scenarioId);
        await render();
      }));
      listPanel.appendChild(row);
    }
  }

  const center = document.createElement('section');
  center.className = 'card';
  center.innerHTML = `<h3>${moduleTitle} ${translate('workspace.editor')}</h3>`;

  const form = document.createElement('form');
  form.className = 'form-grid';
  form.onsubmit = (event) => {
    event.preventDefault();
  };

  const formError = document.createElement('div');
  formError.className = 'inline-error form-inline-error';
  formError.hidden = true;
  formError.setAttribute('aria-live', 'polite');
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
    const state: ProfitInputState = service.getProfitInputState(selectedScenario?.inputData ?? prefillInputData);
    form.innerHTML = `
      <label>${translate('field.scenarioName')}<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>${translate('field.unitPriceMinor')}<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
      <label>${translate('field.quantity')}<input name="quantity" type="number" value="${state.quantity}" /></label>
      <label>${translate('field.variableCostPerUnitMinor')}<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
      <label>${translate('field.fixedCostsMinor')}<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
    `;
  }

  if (moduleId === 'breakeven') {
    const state: BreakEvenInputState = service.getBreakEvenInputState(selectedScenario?.inputData ?? prefillInputData);
    form.innerHTML = `
      <label>${translate('field.scenarioName')}<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>${translate('field.unitPriceMinor')}<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
      <label>${translate('field.variableCostPerUnitMinor')}<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
      <label>${translate('field.fixedCostsMinor')}<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
      <label>${translate('field.targetProfitMinor')}<input name="targetProfitMinor" type="number" value="${state.targetProfitMinor}" /></label>
      <label>${translate('field.plannedQuantity')}<input name="plannedQuantity" type="number" value="${state.plannedQuantity}" /></label>
    `;
  }

  if (moduleId === 'cashflow') {
    const state: CashflowInputState = service.getCashflowInputState(selectedScenario?.inputData ?? prefillInputData);
    form.innerHTML = `
      <label>${translate('field.scenarioName')}<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>${translate('field.startingCashMinor')}<input name="startingCashMinor" type="number" value="${state.startingCashMinor}" /></label>
      <label>${translate('field.baseMonthlyRevenueMinor')}<input name="baseMonthlyRevenueMinor" type="number" value="${state.baseMonthlyRevenueMinor}" /></label>
      <label>${translate('field.fixedMonthlyCostsMinor')}<input name="fixedMonthlyCostsMinor" type="number" value="${state.fixedMonthlyCostsMinor}" /></label>
      <label>${translate('field.variableMonthlyCostsMinor')}<input name="variableMonthlyCostsMinor" type="number" value="${state.variableMonthlyCostsMinor}" /></label>
      <label>${translate('field.forecastMonths')}<input name="forecastMonths" type="number" value="${state.forecastMonths}" /></label>
      <label>${translate('field.monthlyGrowthRate')}<input name="monthlyGrowthRate" type="number" step="0.01" value="${state.monthlyGrowthRate}" /></label>
    `;
  }

  form.insertAdjacentElement('afterbegin', formError);

  form.appendChild(
    createActionButton(translate('workspace.calculateScenario'), async () => {
      clearFormError();

      try {
        const data = new FormData(form);
        const scenarioName = normalizeScenarioName(String(data.get('scenarioName') ?? ''));

        if (moduleId === 'profit') {
          await service.saveProfitScenario({
            scenarioId: selectedScenario?.scenarioId,
            scenarioName,
            unitPriceMinor: parseRequiredNumber(String(data.get('unitPriceMinor') ?? ''), translate('field.unitPrice')),
            quantity: parseRequiredNumber(String(data.get('quantity') ?? ''), translate('field.quantity')),
            variableCostPerUnitMinor: parseRequiredNumber(String(data.get('variableCostPerUnitMinor') ?? ''), translate('field.variableCostPerUnit')),
            fixedCostsMinor: parseRequiredNumber(String(data.get('fixedCostsMinor') ?? ''), translate('field.fixedCosts'))
          });
        }

        if (moduleId === 'breakeven') {
          await service.saveBreakEvenScenario({
            scenarioId: selectedScenario?.scenarioId,
            scenarioName,
            unitPriceMinor: parseRequiredNumber(String(data.get('unitPriceMinor') ?? ''), translate('field.unitPrice')),
            variableCostPerUnitMinor: parseRequiredNumber(String(data.get('variableCostPerUnitMinor') ?? ''), translate('field.variableCostPerUnit')),
            fixedCostsMinor: parseRequiredNumber(String(data.get('fixedCostsMinor') ?? ''), translate('field.fixedCosts')),
            targetProfitMinor: parseRequiredNumber(String(data.get('targetProfitMinor') ?? ''), translate('field.targetProfit')),
            plannedQuantity: parseRequiredNumber(String(data.get('plannedQuantity') ?? ''), translate('field.plannedQuantity'))
          });
        }

        if (moduleId === 'cashflow') {
          await service.saveCashflowScenario({
            scenarioId: selectedScenario?.scenarioId,
            scenarioName,
            startingCashMinor: parseRequiredNumber(String(data.get('startingCashMinor') ?? ''), translate('field.startingCash')),
            baseMonthlyRevenueMinor: parseRequiredNumber(String(data.get('baseMonthlyRevenueMinor') ?? ''), translate('field.baseRevenue')),
            fixedMonthlyCostsMinor: parseRequiredNumber(String(data.get('fixedMonthlyCostsMinor') ?? ''), translate('field.fixedMonthlyCosts')),
            variableMonthlyCostsMinor: parseRequiredNumber(String(data.get('variableMonthlyCostsMinor') ?? ''), translate('field.variableMonthlyCosts')),
            forecastMonths: parseRequiredNumber(String(data.get('forecastMonths') ?? ''), translate('field.months')),
            monthlyGrowthRate: parseRequiredNumber(String(data.get('monthlyGrowthRate') ?? ''), translate('field.growthRate'))
          });
        }

        await render();
      } catch (error) {
        const message = error instanceof Error ? toUserFriendlyValidationMessage(error.message) : translate('workspace.validationFailed');
        showFormError(message);
      }
    }, 'primary form-submit')
  );

  center.appendChild(form);
  const ad = document.createElement('div');
  ad.className = 'ad-placeholder';
  ad.textContent = translate('common.adPlaceholder');
  center.appendChild(ad);

  const results = document.createElement('section');
  results.className = 'card';
  results.innerHTML = `<h3>${translate('workspace.results')}</h3>`;

  const shareDialogHost = document.createElement('div');
  shareDialogHost.className = 'modal';

  const shareButton = createActionButton(translate('workspace.shareScenario'), async () => {
    if (!selectedScenario) {
      showFormError(translate('workspace.createScenarioBeforeShare'));
      return;
    }

    try {
      const share = await service.createShareSnapshotFromScenario(selectedScenario, 30);
      const shareUrl = `${window.location.origin}/s/${encodeURIComponent(share.token)}#k=${encodeURIComponent(share.shareKey)}`;

      const dialog = renderShareScenarioDialog({
        shareUrl,
        expiresAt: share.expiresAt,
        onCopy: async () => {
          await navigator.clipboard.writeText(shareUrl);
          window.alert(translate('workspace.shareLinkCopied'));
        },
        onClose: () => {
          shareDialogHost.replaceChildren();
        },
        createActionButton
      });

      shareDialogHost.replaceChildren(dialog);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('workspace.shareLinkCreateFailed');
      showFormError(message);
    }
  });

  results.appendChild(shareButton);
  results.appendChild(shareDialogHost);

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
      text.textContent = translate('workspace.showDebugJson');

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
    results.appendChild(emptyState(translate('workspace.noResults'), translate('workspace.noResultsDesc')));
  }

  if (!allowed) {
    const overlay = document.createElement('div');
    overlay.className = 'locked-overlay';

    const message = document.createElement('strong');
    message.textContent = translate('workspace.requiresSubscription');

    const actions = document.createElement('div');
    actions.className = 'button-row';
    actions.appendChild(createActionButton(translate('workspace.goToSubscription'), () => goTo('/subscription'), 'primary'));
    actions.appendChild(createActionButton(translate('workspace.backToDashboard'), () => goTo('/dashboard')));

    overlay.appendChild(message);
    overlay.appendChild(actions);
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
  title.textContent = translate('data.title');

  const sections = document.createElement('div');
  sections.className = 'space-y-6';

  const exportButton = createActionButton(translate('data.exportAllJson'), async () => {
    const payload = await service.exportScenariosJson();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'marginbase-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
    window.alert(translate('data.exportCompleted'));
  }, 'primary');

  const reportExportButton = createActionButton(translate('data.reportExportPdf'), async () => {
    try {
      const payload = await service.exportBusinessReportPdf();
      const pdfBytes = new Uint8Array(payload);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'marginbase-business-report.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      window.alert(translate('data.reportExported'));
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.reportExportFailed');
      window.alert(message);
    }
  });

  const reportExportExcelButton = createActionButton(translate('data.reportExportExcel'), async () => {
    try {
      const payload = await service.exportBusinessReportXlsx();
      const xlsxBytes = new Uint8Array(payload);
      const blob = new Blob([xlsxBytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'marginbase-business-report.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
      window.alert(translate('data.reportExported'));
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.reportExportFailed');
      window.alert(message);
    }
  });

  const reportPreview = document.createElement('div');
  reportPreview.className = 'modal';

  const reportPreviewButton = createActionButton(translate('data.previewReport'), async () => {
    try {
      const report = await service.getBusinessReportModel();
      const closeButton = createActionButton(translate('data.closePreview'), () => {
        reportPreview.replaceChildren();
      });

      const content = renderBusinessReportPreview(report);
      reportPreview.replaceChildren(content, closeButton);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.reportPreviewFailed');
      window.alert(message);
    }
  });

  const importInput = document.createElement('textarea');
  importInput.placeholder = translate('data.importPlaceholder');
  importInput.rows = 10;

  const importSummary = document.createElement('div');
  importSummary.className = 'modal';

  const shareLinksSummary = document.createElement('div');
  shareLinksSummary.className = 'modal';

  const refreshSharedLinks = async (): Promise<void> => {
    try {
      const items = await service.listMyShareSnapshots();
      if (items.length === 0) {
        shareLinksSummary.innerHTML = `<p>${translate('data.share.empty')}</p>`;
        return;
      }

      shareLinksSummary.replaceChildren();
      const list = document.createElement('div');
      list.className = 'space-y-6';

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'card';
        row.innerHTML = `<p><strong>${item.module}</strong></p><p>${translate('data.share.token')}: ${item.token}</p><p>${translate('data.share.created')}: ${item.createdAt}</p><p>${translate('data.share.expires')}: ${item.expiresAt}</p>`;
        row.appendChild(createActionButton(translate('data.share.revoke'), async () => {
          await service.revokeMyShareSnapshot(item.token);
          await refreshSharedLinks();
        }));
        list.appendChild(row);
      }

      shareLinksSummary.appendChild(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.share.loadFailed');
      shareLinksSummary.innerHTML = `<div class="inline-error">${message}</div>`;
    }
  };

  const previewButton = createActionButton(translate('data.previewImport'), () => {
    const preview = service.previewImport(importInput.value);
    if (!preview.ok) {
      importSummary.innerHTML = `<div class="inline-error"><strong>${translate('data.previewFailed')}</strong> ${preview.errors[0]?.message ?? translate('data.importPreviewFailed')}</div>`;
      return;
    }

    importSummary.innerHTML = `
      <h3>${translate('data.importScenarios')}</h3>
      <p>${translate('data.total')}: ${preview.summary.total}</p>
      <p>${translate('data.profit')}: ${preview.summary.profit}</p>
      <p>${translate('data.breakeven')}: ${preview.summary.breakeven}</p>
      <p>${translate('data.cashflow')}: ${preview.summary.cashflow}</p>
      <p><strong>${translate('data.replaceWarning')}</strong></p>
    `;
  });

  const confirmButton = createActionButton(translate('data.confirmImportReplace'), async () => {
    const result = service.previewImport(importInput.value);
    if (!result.ok) {
      window.alert(translate('data.importFailed'));
      return;
    }

    await service.applyImport(result);
    window.alert(translate('data.importCompleted'));
    await render();
  }, 'primary');

  const exportCard = document.createElement('section');
  exportCard.className = 'card';
  exportCard.innerHTML = `<h3>${translate('data.exportCardTitle')}</h3><p>${translate('data.exportCardDesc')}</p>`;
  exportCard.appendChild(exportButton);
  exportCard.appendChild(reportPreviewButton);
  exportCard.appendChild(reportExportButton);
  exportCard.appendChild(reportExportExcelButton);
  exportCard.appendChild(reportPreview);

  const importCard = document.createElement('section');
  importCard.className = 'card';
  importCard.innerHTML = `<h3>${translate('data.importCardTitle')}</h3><p>${translate('data.importCardDesc')}</p>`;
  const importActions = document.createElement('div');
  importActions.className = 'button-row';
  importCard.appendChild(importInput);
  importActions.appendChild(previewButton);
  importActions.appendChild(confirmButton);
  importCard.appendChild(importActions);
  importCard.appendChild(importSummary);

  const shareCard = document.createElement('section');
  shareCard.className = 'card';
  shareCard.innerHTML = `<h3>${translate('data.share.title')}</h3><p>${translate('data.share.desc')}</p>`;
  shareCard.appendChild(createActionButton(translate('data.share.refresh'), () => {
    void refreshSharedLinks();
  }, 'primary'));
  shareCard.appendChild(shareLinksSummary);

  sections.appendChild(exportCard);
  sections.appendChild(importCard);
  sections.appendChild(shareCard);

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
  card.innerHTML = `<h2>${translate('settings.title')}</h2><p>${translate('settings.subtitle')}</p>`;

  const deleteAccountButton = createActionButton(translate('settings.deleteAccountData'), async () => {
    const deleted = await service.deleteAccount('local_web_user');
    if (deleted) {
      window.alert(translate('settings.accountDeleted'));
      goTo('/login');
    }
  });

  card.appendChild(deleteAccountButton);

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
  main.appendChild(legalCard);
  shell.appendChild(main);
  root.replaceChildren(shell);
};