import {
  type BreakEvenInput,
  type CashflowInput,
  type ProfitInput,
  type ScenarioV1
} from '@marginbase/domain-core';
import { buildReportModel, type ReportModel } from '@marginbase/reporting';

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

const getLatestScenariosByModule = (scenarios: ScenarioV1[]): Partial<Record<ScenarioV1['module'], ScenarioV1>> => {
  const latest: Partial<Record<ScenarioV1['module'], ScenarioV1>> = {};

  for (const scenario of scenarios) {
    const current = latest[scenario.module];
    if (!current || new Date(scenario.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      latest[scenario.module] = scenario;
    }
  }

  return latest;
};

const toProfitInput = (scenario?: ScenarioV1): ProfitInput | undefined => {
  if (!scenario || scenario.module !== 'profit') {
    return undefined;
  }

  const unitPriceMinor = toFiniteNumber(scenario.inputData.unitPriceMinor);
  const quantity = toFiniteNumber(scenario.inputData.quantity);
  const variableCostPerUnitMinor = toFiniteNumber(scenario.inputData.variableCostPerUnitMinor);
  const fixedCostsMinor = toFiniteNumber(scenario.inputData.fixedCostsMinor);

  if (
    unitPriceMinor === null ||
    quantity === null ||
    variableCostPerUnitMinor === null ||
    fixedCostsMinor === null
  ) {
    return undefined;
  }

  return {
    mode: 'unit',
    unitPriceMinor,
    quantity,
    variableCostPerUnitMinor,
    fixedCostsMinor
  };
};

const toBreakEvenInput = (scenario?: ScenarioV1): BreakEvenInput | undefined => {
  if (!scenario || scenario.module !== 'breakeven') {
    return undefined;
  }

  const unitPriceMinor = toFiniteNumber(scenario.inputData.unitPriceMinor);
  const variableCostPerUnitMinor = toFiniteNumber(scenario.inputData.variableCostPerUnitMinor);
  const fixedCostsMinor = toFiniteNumber(scenario.inputData.fixedCostsMinor);
  const targetProfitMinor = toFiniteNumber(scenario.inputData.targetProfitMinor);
  const plannedQuantity = toFiniteNumber(scenario.inputData.plannedQuantity);

  if (unitPriceMinor === null || variableCostPerUnitMinor === null || fixedCostsMinor === null) {
    return undefined;
  }

  return {
    unitPriceMinor,
    variableCostPerUnitMinor,
    fixedCostsMinor,
    targetProfitMinor: targetProfitMinor ?? undefined,
    plannedQuantity: plannedQuantity ?? undefined
  };
};

const toCashflowInput = (scenario?: ScenarioV1): CashflowInput | undefined => {
  if (!scenario || scenario.module !== 'cashflow') {
    return undefined;
  }

  const startingCashMinor = toFiniteNumber(scenario.inputData.startingCashMinor);
  const baseMonthlyRevenueMinor = toFiniteNumber(scenario.inputData.baseMonthlyRevenueMinor);
  const fixedMonthlyCostsMinor = toFiniteNumber(scenario.inputData.fixedMonthlyCostsMinor);
  const variableMonthlyCostsMinor = toFiniteNumber(scenario.inputData.variableMonthlyCostsMinor);
  const forecastMonths = toFiniteNumber(scenario.inputData.forecastMonths);
  const monthlyGrowthRate = toFiniteNumber(scenario.inputData.monthlyGrowthRate);

  if (
    startingCashMinor === null ||
    baseMonthlyRevenueMinor === null ||
    fixedMonthlyCostsMinor === null ||
    variableMonthlyCostsMinor === null ||
    forecastMonths === null
  ) {
    return undefined;
  }

  return {
    startingCashMinor,
    baseMonthlyRevenueMinor,
    fixedMonthlyCostsMinor,
    variableMonthlyCostsMinor,
    forecastMonths,
    monthlyGrowthRate: monthlyGrowthRate ?? 0
  };
};

export const buildBusinessReportModelFromScenarios = (
  scenarios: ScenarioV1[],
  generatedAtLocal: string
): ReportModel => {
  const latestByModule = getLatestScenariosByModule(scenarios);

  return buildReportModel({
    generatedAtLocal,
    currencyCode: 'EUR',
    locale: 'en-US',
    profitabilityInput: toProfitInput(latestByModule.profit),
    breakEvenInput: toBreakEvenInput(latestByModule.breakeven),
    cashflowInput: toCashflowInput(latestByModule.cashflow)
  });
};
