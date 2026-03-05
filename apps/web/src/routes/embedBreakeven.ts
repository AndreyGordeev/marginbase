import { calculateBreakEven } from '@marginbase/domain-core';
import { createEmbedShell, createPoweredByFooter, parseEmbedOptions } from '../features/embed/EmbedLayout';
import { downloadEmbedInputsJson } from '../features/embed/export-inputs';
import { encodePrefill } from '../features/embed/prefill';
import { translate } from '../i18n';
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

export const renderEmbedBreakevenRoute = (root: HTMLElement, service: WebAppService): void => {
  const options = parseEmbedOptions(window.location.search);
  const shell = createEmbedShell(translate('embed.breakeven.title'), options);
  void service.trackEmbedOpened('breakeven', options.poweredBy);

  const state = {
    unitPriceMinor: 1000,
    variableCostPerUnitMinor: 700,
    fixedCostsMinor: 5000,
    targetProfitMinor: 0,
    plannedQuantity: 20
  };

  const editor = document.createElement('section');
  editor.className = 'card';
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label>${translate('field.unitPriceMinor')}<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
    <label>${translate('field.variableCostPerUnitMinor')}<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
    <label>${translate('field.fixedCostsMinor')}<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
    <label>${translate('field.targetProfitMinor')}<input name="targetProfitMinor" type="number" value="${state.targetProfitMinor}" /></label>
    <label>${translate('field.plannedQuantity')}<input name="plannedQuantity" type="number" value="${state.plannedQuantity}" /></label>
  `;

  const results = document.createElement('section');
  results.className = 'card';

  const recalc = (): void => {
    const data = new FormData(form);
    state.unitPriceMinor = Number(data.get('unitPriceMinor') ?? state.unitPriceMinor);
    state.variableCostPerUnitMinor = Number(data.get('variableCostPerUnitMinor') ?? state.variableCostPerUnitMinor);
    state.fixedCostsMinor = Number(data.get('fixedCostsMinor') ?? state.fixedCostsMinor);
    state.targetProfitMinor = Number(data.get('targetProfitMinor') ?? state.targetProfitMinor);
    state.plannedQuantity = Number(data.get('plannedQuantity') ?? state.plannedQuantity);

    const calculated = calculateBreakEven({
      unitPriceMinor: state.unitPriceMinor,
      variableCostPerUnitMinor: state.variableCostPerUnitMinor,
      fixedCostsMinor: state.fixedCostsMinor,
      targetProfitMinor: state.targetProfitMinor,
      plannedQuantity: state.plannedQuantity
    });

    const cta = document.createElement('a');
    cta.href = `/break-even?prefill=${encodeURIComponent(encodePrefill({ module: 'breakeven', inputData: { ...state } }))}`;
    cta.textContent = translate('embed.openInApp');
    cta.onclick = () => {
      void service.trackEmbedCtaClicked('breakeven');
    };

    const exportInputsButton = document.createElement('button');
    exportInputsButton.type = 'button';
    exportInputsButton.textContent = translate('embed.exportInputs');
    exportInputsButton.onclick = () => {
      downloadEmbedInputsJson('breakeven', { ...state });
    };

    const actions = document.createElement('div');
    actions.className = 'button-row';
    actions.appendChild(cta);
    actions.appendChild(exportInputsButton);

    results.replaceChildren(renderModuleResults('breakeven', toPlainJson(calculated) as Record<string, unknown>, {
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
