import type { ModuleId } from '@marginbase/domain-core';
import { getPrefillFromSearch } from '../../features/embed/prefill';
import { renderShareScenarioDialog } from '../../features/share/ShareScenarioDialog';
import { translate } from '../../i18n';
import { type BreakEvenInputState, type CashflowInputState, type ProfitInputState, WebAppService } from '../../web-app-service';
import { TEST_IDS } from '../test-ids';
import { renderModuleResults } from '../results/module-results';
import { normalizeScenarioName, parseRequiredNumber, renderSidebar, toUserFriendlyValidationMessage } from './page-shared';
import type { WorkspaceDeps } from './page-types';

const FORM_ERROR_VISIBLE_MS = 5000;

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
  await service.trackModuleOpened(moduleId);

  if (!allowed) {
    await service.trackPaywallShown(moduleId);
  }

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
  shell.setAttribute('data-testid', TEST_IDS.APP_SHELL);
  shell.appendChild(renderSidebar(route, { createActionButton, goTo }));

  const main = document.createElement('main');
  main.className = 'main';
  const workspace = document.createElement('div');
  workspace.className = 'workspace';
  workspace.setAttribute('data-testid', TEST_IDS.WORKSPACE_ROOT);

  const listPanel = document.createElement('section');
  listPanel.className = 'card scenario-list';
  listPanel.innerHTML = `<h3>${moduleTitle} ${translate('workspace.scenarios')}</h3>`;
  listPanel.appendChild(createActionButton(translate('workspace.newScenario'), async () => {
    const canCreateScenario = await service.canCreateScenarioForCurrentPlan();
    if (!canCreateScenario) {
      await service.trackPaywallShown(moduleId);
      await service.trackUpgradeClicked();
      showFormError(translate('workspace.scenarioLimitReached'));
      goTo('/subscription');
      return;
    }

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
    (() => {
      const btn = createActionButton(translate('workspace.calculateScenario'), async () => {
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
      }, 'primary form-submit');
      btn.setAttribute('data-testid', TEST_IDS.CALCULATE_BUTTON);
      return btn;
    })()
  );

  center.appendChild(form);
  const ad = document.createElement('div');
  ad.className = 'ad-placeholder';
  ad.textContent = translate('common.adPlaceholder');
  center.appendChild(ad);

  const results = document.createElement('section');
  results.className = 'card';
  results.setAttribute('data-testid', TEST_IDS.RESULTS_SECTION);
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
  shareButton.setAttribute('data-testid', TEST_IDS.SHARE_BUTTON);

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
    actions.appendChild(createActionButton(translate('workspace.goToSubscription'), async () => {
      await service.trackUpgradeClicked();
      goTo('/subscription');
    }, 'primary'));
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
