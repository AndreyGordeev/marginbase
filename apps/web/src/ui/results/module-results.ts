import type { ModuleId } from '@marginbase/domain-core';
import { translate } from '../../i18n';
import { formatMoneyFromMinor, formatPct } from '../format/formatters';

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const resolveCurrencyCode = (inputData?: Record<string, unknown>): string => {
  const currency = inputData?.currencyCode;
  if (typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) {
    return currency;
  }

  return 'EUR';
};

const toStatusLabel = (netProfitMinor: number): string => {
  if (netProfitMinor > 0) {
    return translate('results.status.profitable');
  }

  if (netProfitMinor < 0) {
    return translate('results.status.loss');
  }

  return translate('results.status.breakeven');
};

const toPolarityClass = (numericValue: number): 'metric-positive' | 'metric-negative' | 'metric-neutral' => {
  if (numericValue > 0) {
    return 'metric-positive';
  }

  if (numericValue < 0) {
    return 'metric-negative';
  }

  return 'metric-neutral';
};

const toProfitWarningLabel = (warningCode: string): string => {
  if (warningCode === 'R_ZERO') {
    return translate('results.warning.profit.rZero');
  }

  if (warningCode === 'V_ZERO') {
    return translate('results.warning.profit.vZero');
  }

  if (warningCode === 'INSUFFICIENT_DATA_TVC') {
    return translate('results.warning.profit.insufficientDataTvc');
  }

  return warningCode;
};

const toBreakEvenWarningLabel = (warningCode: string): string => {
  if (warningCode === 'UC_NON_POSITIVE') {
    return translate('results.warning.breakeven.ucNonPositive');
  }

  if (warningCode === 'P_ZERO_PLANNED_REVENUE') {
    return translate('results.warning.breakeven.pZeroPlannedRevenue');
  }

  return warningCode;
};

const toCashflowWarningLabel = (warningCode: string): string => {
  if (warningCode === 'NEGATIVE_GROWTH') {
    return translate('results.warning.cashflow.negativeGrowth');
  }

  if (warningCode === 'IMMEDIATE_NEGATIVE') {
    return translate('results.warning.cashflow.immediateNegative');
  }

  return warningCode;
};

const formatNumber = (value: number | null, decimals = 2): string => {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, decimals)
  }).format(value);
};

const createWarningsList = (warnings: string[]): HTMLElement | null => {
  if (warnings.length === 0) {
    return null;
  }

  const section = document.createElement('section');
  section.className = 'results-warnings';

  const heading = document.createElement('h4');
  heading.textContent = translate('results.warnings');
  section.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'results-warning-list';

  for (const warning of warnings) {
    const item = document.createElement('li');
    item.textContent = warning;
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
};

const renderProfitResults = (resultData: Record<string, unknown>, currencyCode: string): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'results-panel';

  const netProfitMinor = toFiniteNumber(resultData.netProfitMinor) ?? 0;
  const revenueMinor = toFiniteNumber(resultData.revenueTotalMinor) ?? 0;
  const totalCostMinor = toFiniteNumber(resultData.totalCostMinor) ?? 0;
  const grossProfitMinor = toFiniteNumber(resultData.grossProfitMinor) ?? 0;

  const summary = document.createElement('section');
  summary.className = 'results-summary';

  const summaryLabel = document.createElement('div');
  summaryLabel.className = 'results-summary-label';
  summaryLabel.textContent = translate('results.netProfit');

  const summaryValue = document.createElement('div');
  summaryValue.className = `results-summary-value ${toPolarityClass(netProfitMinor)}`;
  summaryValue.textContent = formatMoneyFromMinor(netProfitMinor, currencyCode);

  const status = document.createElement('div');
  status.className = `results-summary-status ${toPolarityClass(netProfitMinor)}`;
  status.textContent = toStatusLabel(netProfitMinor);

  const lines = document.createElement('div');
  lines.className = 'results-secondary-lines';
  lines.innerHTML = `
    <div><span>${translate('results.revenue')}</span><strong>${formatMoneyFromMinor(revenueMinor, currencyCode)}</strong></div>
    <div><span>${translate('results.totalCost')}</span><strong>${formatMoneyFromMinor(totalCostMinor, currencyCode)}</strong></div>
    <div><span>${translate('results.grossProfit')}</span><strong>${formatMoneyFromMinor(grossProfitMinor, currencyCode)}</strong></div>
  `;

  summary.appendChild(summaryLabel);
  summary.appendChild(summaryValue);
  summary.appendChild(status);
  summary.appendChild(lines);
  container.appendChild(summary);

  const metrics = document.createElement('section');
  metrics.className = 'results-metrics-grid';

  const metricsConfig = [
    { label: translate('results.contributionMarginPct'), value: toFiniteNumber(resultData.contributionMarginPct) },
    { label: translate('results.netProfitMarginPct'), value: toFiniteNumber(resultData.netProfitPct) },
    { label: translate('results.markupPct'), value: toFiniteNumber(resultData.markupPct) }
  ];

  for (const metric of metricsConfig) {
    const card = document.createElement('article');
    card.className = 'results-metric-card';

    const label = document.createElement('div');
    label.className = 'results-metric-label';
    label.textContent = metric.label;

    const value = document.createElement('div');
    value.className = `results-metric-value ${toPolarityClass(metric.value ?? 0)}`;
    value.textContent = metric.value === null ? '—' : formatPct(metric.value, 2);

    card.appendChild(label);
    card.appendChild(value);
    metrics.appendChild(card);
  }

  container.appendChild(metrics);

  const warningCodes = Array.isArray(resultData.warnings)
    ? resultData.warnings.filter((warning): warning is string => typeof warning === 'string')
    : [];

  const warnings = createWarningsList(warningCodes.map(toProfitWarningLabel));
  if (warnings) {
    container.appendChild(warnings);
  }

  return container;
};

const renderBreakEvenResults = (resultData: Record<string, unknown>, currencyCode: string): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'results-panel';

  const breakEvenQuantity = toFiniteNumber(resultData.breakEvenQuantity);
  const breakEvenRevenueMinor = toFiniteNumber(resultData.breakEvenRevenueMinor);
  const requiredQuantity = toFiniteNumber(resultData.requiredQuantityForTargetProfit);
  const requiredRevenueMinor = toFiniteNumber(resultData.requiredRevenueForTargetProfitMinor);
  const unitContributionMinor = toFiniteNumber(resultData.unitContributionMinor) ?? 0;
  const marginOfSafetyUnits = toFiniteNumber(resultData.marginOfSafetyUnits);
  const marginOfSafetyPct = toFiniteNumber(resultData.marginOfSafetyPct);

  const summary = document.createElement('section');
  summary.className = 'results-summary';

  const summaryLabel = document.createElement('div');
  summaryLabel.className = 'results-summary-label';
  summaryLabel.textContent = translate('results.breakEvenQuantity');

  const summaryValue = document.createElement('div');
  summaryValue.className = `results-summary-value ${toPolarityClass(-(breakEvenQuantity ?? 0))}`;
  summaryValue.textContent = breakEvenQuantity === null ? '—' : `${formatNumber(breakEvenQuantity, 2)} ${translate('results.units')}`;

  const status = document.createElement('div');
  status.className = 'results-summary-status metric-neutral';
  status.textContent = breakEvenQuantity === null ? translate('results.breakEvenUnavailable') : translate('results.breakEvenCalculated');

  const lines = document.createElement('div');
  lines.className = 'results-secondary-lines';
  lines.innerHTML = `
    <div><span>${translate('results.breakEvenRevenue')}</span><strong>${breakEvenRevenueMinor === null ? '—' : formatMoneyFromMinor(breakEvenRevenueMinor, currencyCode)}</strong></div>
    <div><span>${translate('results.requiredQtyTargetProfit')}</span><strong>${requiredQuantity === null ? '—' : `${formatNumber(requiredQuantity, 2)} ${translate('results.units')}`}</strong></div>
    <div><span>${translate('results.requiredRevenueTargetProfit')}</span><strong>${requiredRevenueMinor === null ? '—' : formatMoneyFromMinor(requiredRevenueMinor, currencyCode)}</strong></div>
  `;

  summary.appendChild(summaryLabel);
  summary.appendChild(summaryValue);
  summary.appendChild(status);
  summary.appendChild(lines);
  container.appendChild(summary);

  const metrics = document.createElement('section');
  metrics.className = 'results-metrics-grid';

  const metricRows = [
    {
      label: translate('results.unitContribution'),
      text: formatMoneyFromMinor(unitContributionMinor, currencyCode),
      value: unitContributionMinor
    },
    {
      label: translate('results.marginOfSafetyUnits'),
      text: marginOfSafetyUnits === null ? '—' : formatNumber(marginOfSafetyUnits, 2),
      value: marginOfSafetyUnits ?? 0
    },
    {
      label: translate('results.marginOfSafetyPct'),
      text: marginOfSafetyPct === null ? '—' : formatPct(marginOfSafetyPct, 2),
      value: marginOfSafetyPct ?? 0
    }
  ];

  for (const metric of metricRows) {
    const card = document.createElement('article');
    card.className = 'results-metric-card';

    const label = document.createElement('div');
    label.className = 'results-metric-label';
    label.textContent = metric.label;

    const value = document.createElement('div');
    value.className = `results-metric-value ${toPolarityClass(metric.value)}`;
    value.textContent = metric.text;

    card.appendChild(label);
    card.appendChild(value);
    metrics.appendChild(card);
  }

  container.appendChild(metrics);

  const warningCodes = Array.isArray(resultData.warnings)
    ? resultData.warnings.filter((warning): warning is string => typeof warning === 'string')
    : [];

  const warnings = createWarningsList(warningCodes.map(toBreakEvenWarningLabel));
  if (warnings) {
    container.appendChild(warnings);
  }

  return container;
};

const renderCashflowResults = (resultData: Record<string, unknown>, currencyCode: string): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'results-panel';

  const finalBalanceMinor = toFiniteNumber(resultData.finalBalanceMinor) ?? 0;
  const runwayMonth = toFiniteNumber(resultData.runwayMonth);
  const firstNegativeMonth = toFiniteNumber(resultData.firstNegativeMonth);
  const monthlyProjection = Array.isArray(resultData.monthlyProjection)
    ? resultData.monthlyProjection.filter((point): point is Record<string, unknown> => typeof point === 'object' && point !== null)
    : [];
  const lastPoint = monthlyProjection.length > 0 ? monthlyProjection[monthlyProjection.length - 1] : null;
  const lastNetCashflowMinor = toFiniteNumber(lastPoint?.netCashflowMinor);
  const monthlyExpensesMinor = toFiniteNumber(lastPoint?.expensesMinor);

  const summary = document.createElement('section');
  summary.className = 'results-summary';

  const summaryLabel = document.createElement('div');
  summaryLabel.className = 'results-summary-label';
  summaryLabel.textContent = translate('results.finalCashBalance');

  const summaryValue = document.createElement('div');
  summaryValue.className = `results-summary-value ${toPolarityClass(finalBalanceMinor)}`;
  summaryValue.textContent = formatMoneyFromMinor(finalBalanceMinor, currencyCode);

  const status = document.createElement('div');
  status.className = `results-summary-status ${toPolarityClass(finalBalanceMinor)}`;
  status.textContent = finalBalanceMinor > 0
    ? translate('results.positiveEndingBalance')
    : finalBalanceMinor < 0
      ? translate('results.negativeEndingBalance')
      : translate('results.breakEvenEndingBalance');

  const lines = document.createElement('div');
  lines.className = 'results-secondary-lines';
  lines.innerHTML = `
    <div><span>${translate('results.runwayMonth')}</span><strong>${runwayMonth === null ? translate('results.noDepletionForecast') : `${formatNumber(runwayMonth, 0)}`}</strong></div>
    <div><span>${translate('results.firstNegativeMonth')}</span><strong>${firstNegativeMonth === null ? translate('results.none') : `${formatNumber(firstNegativeMonth, 0)}`}</strong></div>
    <div><span>${translate('results.projectedMonths')}</span><strong>${formatNumber(monthlyProjection.length, 0)}</strong></div>
  `;

  summary.appendChild(summaryLabel);
  summary.appendChild(summaryValue);
  summary.appendChild(status);
  summary.appendChild(lines);
  container.appendChild(summary);

  const metrics = document.createElement('section');
  metrics.className = 'results-metrics-grid';

  const metricRows = [
    {
      label: translate('results.netCashflowLastMonth'),
      text: lastNetCashflowMinor === null ? '—' : formatMoneyFromMinor(lastNetCashflowMinor, currencyCode),
      value: lastNetCashflowMinor ?? 0
    },
    {
      label: translate('results.monthlyExpenses'),
      text: monthlyExpensesMinor === null ? '—' : formatMoneyFromMinor(monthlyExpensesMinor, currencyCode),
      value: -(monthlyExpensesMinor ?? 0)
    },
    {
      label: translate('results.runwayIndicator'),
      text: runwayMonth === null ? translate('results.withinForecast') : `${translate('results.depletesByMonth')} ${formatNumber(runwayMonth, 0)}`,
      value: runwayMonth === null ? 1 : -1
    }
  ];

  for (const metric of metricRows) {
    const card = document.createElement('article');
    card.className = 'results-metric-card';

    const label = document.createElement('div');
    label.className = 'results-metric-label';
    label.textContent = metric.label;

    const value = document.createElement('div');
    value.className = `results-metric-value ${toPolarityClass(metric.value)}`;
    value.textContent = metric.text;

    card.appendChild(label);
    card.appendChild(value);
    metrics.appendChild(card);
  }

  container.appendChild(metrics);

  const warningCodes = Array.isArray(resultData.warnings)
    ? resultData.warnings.filter((warning): warning is string => typeof warning === 'string')
    : [];

  const warnings = createWarningsList(warningCodes.map(toCashflowWarningLabel));
  if (warnings) {
    container.appendChild(warnings);
  }

  return container;
};

export const renderModuleResults = (
  moduleId: ModuleId,
  resultData: Record<string, unknown>,
  inputData?: Record<string, unknown>
): HTMLElement => {
  const currencyCode = resolveCurrencyCode(inputData);

  if (moduleId === 'profit') {
    return renderProfitResults(resultData, currencyCode);
  }

  if (moduleId === 'breakeven') {
    return renderBreakEvenResults(resultData, currencyCode);
  }

  return renderCashflowResults(resultData, currencyCode);
};