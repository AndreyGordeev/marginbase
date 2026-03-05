import { translate } from '../../i18n';
import type { CommonDeps, AppRoutePath } from './page-types';

const MAX_SCENARIO_NAME_LENGTH = 120;
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

export const parseRequiredNumber = (value: string, fieldLabel: string): number => {
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

export const normalizeScenarioName = (value: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(translate('validation.scenarioNameRequired'));
  }

  if (normalized.length > MAX_SCENARIO_NAME_LENGTH) {
    throw new Error(translate('validation.scenarioNameMax', { max: MAX_SCENARIO_NAME_LENGTH }));
  }

  return normalized;
};

export const toUserFriendlyValidationMessage = (message: string): string => {
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

  for (const link of links) {
    sidebar.appendChild(
      createActionButton(link.label, () => goTo(link.route), link.route === active ? 'primary' : '')
    );
  }

  return sidebar;
};
