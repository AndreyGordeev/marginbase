import type { ModuleId } from '@marginbase/domain-core';
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
    return 'Profitable';
  }

  if (netProfitMinor < 0) {
    return 'Operating at a loss';
  }

  return 'Break-even';
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
    return 'Revenue is zero, so percentage metrics are unavailable.';
  }

  if (warningCode === 'V_ZERO') {
    return 'Variable cost per unit is zero, so markup percentage is unavailable.';
  }

  if (warningCode === 'INSUFFICIENT_DATA_TVC') {
    return 'Insufficient variable cost data was provided for a complete cost breakdown.';
  }

  return warningCode;
};

const toBreakEvenWarningLabel = (warningCode: string): string => {
  if (warningCode === 'UC_NON_POSITIVE') {
    return 'Unit contribution is non-positive, so break-even point cannot be calculated.';
  }

  if (warningCode === 'P_ZERO_PLANNED_REVENUE') {
    return 'Planned revenue was provided with zero price, so planned quantity cannot be resolved.';
  }

  return warningCode;
};

const toCashflowWarningLabel = (warningCode: string): string => {
  if (warningCode === 'NEGATIVE_GROWTH') {
    return 'Negative growth is applied, which may reduce cash balance over time.';
  }

  if (warningCode === 'IMMEDIATE_NEGATIVE') {
    return 'Cash balance becomes negative in the first forecast month.';
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
  heading.textContent = 'Warnings';
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
  summaryLabel.textContent = 'Net Profit';

  const summaryValue = document.createElement('div');
  summaryValue.className = `results-summary-value ${toPolarityClass(netProfitMinor)}`;
  summaryValue.textContent = formatMoneyFromMinor(netProfitMinor, currencyCode);

  const status = document.createElement('div');
  status.className = `results-summary-status ${toPolarityClass(netProfitMinor)}`;
  status.textContent = toStatusLabel(netProfitMinor);

  const lines = document.createElement('div');
  lines.className = 'results-secondary-lines';
  lines.innerHTML = `
    <div><span>Revenue</span><strong>${formatMoneyFromMinor(revenueMinor, currencyCode)}</strong></div>
    <div><span>Total Cost</span><strong>${formatMoneyFromMinor(totalCostMinor, currencyCode)}</strong></div>
    <div><span>Gross Profit</span><strong>${formatMoneyFromMinor(grossProfitMinor, currencyCode)}</strong></div>
  `;

  summary.appendChild(summaryLabel);
  summary.appendChild(summaryValue);
  summary.appendChild(status);
  summary.appendChild(lines);
  container.appendChild(summary);

  const metrics = document.createElement('section');
  metrics.className = 'results-metrics-grid';

  const metricsConfig = [
    { label: 'Contribution Margin %', value: toFiniteNumber(resultData.contributionMarginPct) },
    { label: 'Net Profit Margin %', value: toFiniteNumber(resultData.netProfitPct) },
    { label: 'Markup %', value: toFiniteNumber(resultData.markupPct) }
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
  summaryLabel.textContent = 'Break-even Quantity';

  const summaryValue = document.createElement('div');
  summaryValue.className = `results-summary-value ${toPolarityClass(-(breakEvenQuantity ?? 0))}`;
  summaryValue.textContent = breakEvenQuantity === null ? '—' : `${formatNumber(breakEvenQuantity, 2)} units`;

  const status = document.createElement('div');
  status.className = 'results-summary-status metric-neutral';
  status.textContent = breakEvenQuantity === null ? 'Break-even unavailable' : 'Break-even point calculated';

  const lines = document.createElement('div');
  lines.className = 'results-secondary-lines';
  lines.innerHTML = `
    <div><span>Break-even Revenue</span><strong>${breakEvenRevenueMinor === null ? '—' : formatMoneyFromMinor(breakEvenRevenueMinor, currencyCode)}</strong></div>
    <div><span>Required Qty (Target Profit)</span><strong>${requiredQuantity === null ? '—' : `${formatNumber(requiredQuantity, 2)} units`}</strong></div>
    <div><span>Required Revenue (Target Profit)</span><strong>${requiredRevenueMinor === null ? '—' : formatMoneyFromMinor(requiredRevenueMinor, currencyCode)}</strong></div>
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
      label: 'Unit Contribution',
      text: formatMoneyFromMinor(unitContributionMinor, currencyCode),
      value: unitContributionMinor
    },
    {
      label: 'Margin of Safety (Units)',
      text: marginOfSafetyUnits === null ? '—' : formatNumber(marginOfSafetyUnits, 2),
      value: marginOfSafetyUnits ?? 0
    },
    {
      label: 'Margin of Safety %',
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
  summaryLabel.textContent = 'Final Cash Balance';

  const summaryValue = document.createElement('div');
  summaryValue.className = `results-summary-value ${toPolarityClass(finalBalanceMinor)}`;
  summaryValue.textContent = formatMoneyFromMinor(finalBalanceMinor, currencyCode);

  const status = document.createElement('div');
  status.className = `results-summary-status ${toPolarityClass(finalBalanceMinor)}`;
  status.textContent = finalBalanceMinor > 0 ? 'Positive ending balance' : finalBalanceMinor < 0 ? 'Negative ending balance' : 'Break-even ending balance';

  const lines = document.createElement('div');
  lines.className = 'results-secondary-lines';
  lines.innerHTML = `
    <div><span>Runway Month</span><strong>${runwayMonth === null ? 'No depletion in forecast' : `${formatNumber(runwayMonth, 0)}`}</strong></div>
    <div><span>First Negative Month</span><strong>${firstNegativeMonth === null ? 'None' : `${formatNumber(firstNegativeMonth, 0)}`}</strong></div>
    <div><span>Projected Months</span><strong>${formatNumber(monthlyProjection.length, 0)}</strong></div>
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
      label: 'Net Cashflow (Last Month)',
      text: lastNetCashflowMinor === null ? '—' : formatMoneyFromMinor(lastNetCashflowMinor, currencyCode),
      value: lastNetCashflowMinor ?? 0
    },
    {
      label: 'Monthly Expenses',
      text: monthlyExpensesMinor === null ? '—' : formatMoneyFromMinor(monthlyExpensesMinor, currencyCode),
      value: -(monthlyExpensesMinor ?? 0)
    },
    {
      label: 'Runway Indicator',
      text: runwayMonth === null ? 'Within forecast' : `Depletes by month ${formatNumber(runwayMonth, 0)}`,
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