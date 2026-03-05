import { translate } from '../../i18n';
import type { ScenarioV1 } from '@marginbase/domain-core';
import type { CashflowInputState, BreakEvenInputState, ProfitInputState } from '../../web-app-service';

interface ScenarioEditorFormDeps {
  createActionButton: (label: string, onClick: () => void, className?: string) => HTMLButtonElement;
  onSubmit: (formData: FormData) => Promise<void>;
}

export const renderScenarioEditorForm = (
  moduleId: 'profit' | 'breakeven' | 'cashflow',
  moduleTitle: string,
  selectedScenario: ScenarioV1 | null,
  inputState: ProfitInputState | BreakEvenInputState | CashflowInputState,
  deps: ScenarioEditorFormDeps
): HTMLElement => {
  const { createActionButton, onSubmit } = deps;

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

  const showFormError = (message: string): void => {
    formError.hidden = false;
    formError.textContent = message;
    setTimeout(() => {
      formError.hidden = true;
      formError.textContent = '';
    }, 5000);
  };

  if (moduleId === 'profit') {
    const state = inputState as ProfitInputState;
    form.innerHTML = `
      <label>${translate('field.scenarioName')}<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>${translate('field.unitPriceMinor')}<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
      <label>${translate('field.quantity')}<input name="quantity" type="number" value="${state.quantity}" /></label>
      <label>${translate('field.variableCostPerUnitMinor')}<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
      <label>${translate('field.fixedCostsMinor')}<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
    `;
  }

  if (moduleId === 'breakeven') {
    const state = inputState as BreakEvenInputState;
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
    const state = inputState as CashflowInputState;
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
      formError.hidden = true;

      try {
        await onSubmit(new FormData(form));
      } catch (error) {
        const message = error instanceof Error ? error.message : translate('workspace.validationFailed');
        showFormError(message);
      }
    }, 'primary form-submit')
  );

  center.appendChild(form);
  return center;
};
