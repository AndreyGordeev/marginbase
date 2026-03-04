import { calculateCashflow } from '@marginbase/domain-core';
import { createEmbedShell, createPoweredByFooter, parseEmbedOptions } from '../features/embed/EmbedLayout';
import { encodePrefill } from '../features/embed/prefill';
import { renderModuleResults } from '../ui/results/module-results';
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
  const shell = createEmbedShell('Embed: Cashflow Calculator', options);
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
    <label>Starting cash<input name="startingCashMinor" type="number" value="${state.startingCashMinor}" /></label>
    <label>Base revenue<input name="baseMonthlyRevenueMinor" type="number" value="${state.baseMonthlyRevenueMinor}" /></label>
    <label>Fixed monthly costs<input name="fixedMonthlyCostsMinor" type="number" value="${state.fixedMonthlyCostsMinor}" /></label>
    <label>Variable monthly costs<input name="variableMonthlyCostsMinor" type="number" value="${state.variableMonthlyCostsMinor}" /></label>
    <label>Months<input name="forecastMonths" type="number" value="${state.forecastMonths}" /></label>
    <label>Growth rate<input name="monthlyGrowthRate" type="number" step="0.01" value="${state.monthlyGrowthRate}" /></label>
  `;

  const results = document.createElement('section');
  results.className = 'card';

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
    cta.textContent = 'Open in MarginBase';
    cta.onclick = () => {
      void service.trackEmbedCtaClicked('cashflow');
    };

    results.replaceChildren(renderModuleResults('cashflow', toPlainJson(calculated) as Record<string, unknown>, {
      ...state,
      currencyCode: options.currencyCode
    }), cta);
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
