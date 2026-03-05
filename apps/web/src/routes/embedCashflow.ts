import { calculateCashflow } from '@marginbase/domain-core';
import { createEmbedShell, createPoweredByFooter, parseEmbedOptions } from '../features/embed/EmbedLayout';
import { downloadEmbedInputsJson } from '../features/embed/export-inputs';
import { encodePrefill } from '../features/embed/prefill';
import { translate } from '../i18n';
import { renderModuleResults } from '../ui/results/module-results';
import { TEST_IDS } from '../ui/test-ids';
import { type WebAppService } from '../web-app-service';

const toPlainJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => toPlainJson(entry));
  }

  if (value && typeof value === 'object') {
    if ('toJSON' in value && typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
      return (value as { toJSON: () => unknown }).toJSON();
    }

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = toPlainJson(entry);
    }
    return output;
  }

  return value;
};

export const renderEmbedCashflowRoute = (root: HTMLElement, service: WebAppService): void => {
  const options = parseEmbedOptions(window.location.search);
  const shell = createEmbedShell(translate('embed.cashflow.title'), options);
  void service.trackEmbedOpened('cashflow', options.poweredBy);

  const state = {
    startingCashMinor: 100000,
    baseMonthlyRevenueMinor: 30000,
    fixedMonthlyCostsMinor: 20000,
    variableMonthlyCostsMinor: 5000,
    forecastMonths: 12,
    monthlyGrowthRate: 0.02
  };

  const editor = document.createElement('section');
  editor.className = 'card';
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label>${translate('field.startingCashMinor')}<input name="startingCashMinor" type="number" value="${state.startingCashMinor}" /></label>
    <label>${translate('field.baseMonthlyRevenueMinor')}<input name="baseMonthlyRevenueMinor" type="number" value="${state.baseMonthlyRevenueMinor}" /></label>
    <label>${translate('field.fixedMonthlyCostsMinor')}<input name="fixedMonthlyCostsMinor" type="number" value="${state.fixedMonthlyCostsMinor}" /></label>
    <label>${translate('field.variableMonthlyCostsMinor')}<input name="variableMonthlyCostsMinor" type="number" value="${state.variableMonthlyCostsMinor}" /></label>
    <label>${translate('field.forecastMonths')}<input name="forecastMonths" type="number" value="${state.forecastMonths}" /></label>
    <label>${translate('field.monthlyGrowthRate')}<input name="monthlyGrowthRate" type="number" step="0.01" value="${state.monthlyGrowthRate}" /></label>
  `;

  const results = document.createElement('section');
  results.className = 'card';
  results.setAttribute('data-testid', TEST_IDS.EMBED_RESULTS);

  const recalc = (): void => {
    const data = new FormData(form);
    state.startingCashMinor = Number(data.get('startingCashMinor') ?? state.startingCashMinor);
    state.baseMonthlyRevenueMinor = Number(data.get('baseMonthlyRevenueMinor') ?? state.baseMonthlyRevenueMinor);
    state.fixedMonthlyCostsMinor = Number(data.get('fixedMonthlyCostsMinor') ?? state.fixedMonthlyCostsMinor);
    state.variableMonthlyCostsMinor = Number(data.get('variableMonthlyCostsMinor') ?? state.variableMonthlyCostsMinor);
    state.forecastMonths = Number(data.get('forecastMonths') ?? state.forecastMonths);
    state.monthlyGrowthRate = Number(data.get('monthlyGrowthRate') ?? state.monthlyGrowthRate);

    const calculated = calculateCashflow({
      startingCashMinor: state.startingCashMinor,
      baseMonthlyRevenueMinor: state.baseMonthlyRevenueMinor,
      fixedMonthlyCostsMinor: state.fixedMonthlyCostsMinor,
      variableMonthlyCostsMinor: state.variableMonthlyCostsMinor,
      forecastMonths: state.forecastMonths,
      monthlyGrowthRate: state.monthlyGrowthRate
    });

    const cta = document.createElement('a');
    cta.href = `/cashflow?prefill=${encodeURIComponent(encodePrefill({ module: 'cashflow', inputData: { ...state } }))}`;
    cta.textContent = translate('embed.openInApp');
    cta.setAttribute('data-testid', TEST_IDS.EMBED_OPEN_IN_APP_BUTTON);
    cta.onclick = () => {
      void service.trackEmbedCtaClicked('cashflow');
    };

    const exportInputsButton = document.createElement('button');
    exportInputsButton.type = 'button';
    exportInputsButton.textContent = translate('embed.exportInputs');
    exportInputsButton.setAttribute('data-testid', TEST_IDS.EMBED_EXPORT_INPUTS_BUTTON);
    exportInputsButton.onclick = () => {
      downloadEmbedInputsJson('cashflow', { ...state });
    };

    const actions = document.createElement('div');
    actions.className = 'button-row';
    actions.appendChild(cta);
    actions.appendChild(exportInputsButton);

    results.replaceChildren(renderModuleResults('cashflow', toPlainJson(calculated) as Record<string, unknown>, {
      ...state,
      currencyCode: options.currencyCode
    }), actions);
  };

  form.addEventListener('input', recalc);
  editor.appendChild(form);
  shell.appendChild(editor);
  shell.appendChild(results);

  const footer = createPoweredByFooter(options);
  if (footer) {
    shell.appendChild(footer);
  }

  recalc();
  root.replaceChildren(shell);
};
