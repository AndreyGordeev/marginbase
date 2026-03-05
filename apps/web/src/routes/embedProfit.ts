import { calculateProfit } from '@marginbase/domain-core';
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

export const renderEmbedProfitRoute = (root: HTMLElement, service: WebAppService): void => {
  const options = parseEmbedOptions(window.location.search);
  const shell = createEmbedShell(translate('embed.profit.title'), options);
  void service.trackEmbedOpened('profit', options.poweredBy);

  const state = {
    unitPriceMinor: 1000,
    quantity: 10,
    variableCostPerUnitMinor: 700,
    fixedCostsMinor: 1000
  };

  const editor = document.createElement('section');
  editor.className = 'card';
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.innerHTML = `
    <label>${translate('field.unitPriceMinor')}<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
    <label>${translate('field.quantity')}<input name="quantity" type="number" value="${state.quantity}" /></label>
    <label>${translate('field.variableCostPerUnitMinor')}<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
    <label>${translate('field.fixedCostsMinor')}<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
  `;

  const results = document.createElement('section');
  results.className = 'card';
  results.setAttribute('data-testid', TEST_IDS.EMBED_RESULTS);

  const recalc = (): void => {
    const data = new FormData(form);
    state.unitPriceMinor = Number(data.get('unitPriceMinor') ?? state.unitPriceMinor);
    state.quantity = Number(data.get('quantity') ?? state.quantity);
    state.variableCostPerUnitMinor = Number(data.get('variableCostPerUnitMinor') ?? state.variableCostPerUnitMinor);
    state.fixedCostsMinor = Number(data.get('fixedCostsMinor') ?? state.fixedCostsMinor);

    const calculated = calculateProfit({
      mode: 'unit',
      unitPriceMinor: state.unitPriceMinor,
      quantity: state.quantity,
      variableCostPerUnitMinor: state.variableCostPerUnitMinor,
      fixedCostsMinor: state.fixedCostsMinor
    });

    const cta = document.createElement('a');
    cta.href = `/profit?prefill=${encodeURIComponent(encodePrefill({ module: 'profit', inputData: { ...state } }))}`;
    cta.textContent = translate('embed.openInApp');
    cta.setAttribute('data-testid', TEST_IDS.EMBED_OPEN_IN_APP_BUTTON);
    cta.onclick = () => {
      void service.trackEmbedCtaClicked('profit');
    };

    const exportInputsButton = document.createElement('button');
    exportInputsButton.type = 'button';
    exportInputsButton.textContent = translate('embed.exportInputs');
    exportInputsButton.setAttribute('data-testid', TEST_IDS.EMBED_EXPORT_INPUTS_BUTTON);
    exportInputsButton.onclick = () => {
      downloadEmbedInputsJson('profit', { ...state });
    };

    const actions = document.createElement('div');
    actions.className = 'button-row';
    actions.appendChild(cta);
    actions.appendChild(exportInputsButton);

    results.replaceChildren(renderModuleResults('profit', toPlainJson(calculated) as Record<string, unknown>, {
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
