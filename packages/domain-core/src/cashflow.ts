import Decimal from 'decimal.js';
import { MinorUnits, assertNonNegativeInteger, assertNonNegativeMinorUnits } from './numeric-policy';

export type CashflowWarning = 'NEGATIVE_GROWTH' | 'IMMEDIATE_NEGATIVE';

export interface CashflowInput {
  startingCashMinor: MinorUnits;
  baseMonthlyRevenueMinor: MinorUnits;
  monthlyGrowthRate?: Decimal.Value;
  fixedMonthlyCostsMinor: MinorUnits;
  variableMonthlyCostsMinor: MinorUnits;
  forecastMonths: number;
}

export interface CashflowProjectionPoint {
  monthIndex: number;
  revenueMinor: Decimal;
  expensesMinor: Decimal;
  netCashflowMinor: Decimal;
  cashBalanceMinor: Decimal;
}

export interface CashflowResult {
  monthlyProjection: CashflowProjectionPoint[];
  runwayMonth: number | null;
  firstNegativeMonth: number | null;
  finalBalanceMinor: Decimal;
  warnings: CashflowWarning[];
}

export const calculateCashflow = (input: CashflowInput): CashflowResult => {
  const warnings = new Set<CashflowWarning>();

  const startingCashMinor = assertNonNegativeMinorUnits(input.startingCashMinor, 'startingCashMinor');
  const baseMonthlyRevenueMinor = assertNonNegativeMinorUnits(input.baseMonthlyRevenueMinor, 'baseMonthlyRevenueMinor');
  const fixedMonthlyCostsMinor = assertNonNegativeMinorUnits(input.fixedMonthlyCostsMinor, 'fixedMonthlyCostsMinor');
  const variableMonthlyCostsMinor = assertNonNegativeMinorUnits(input.variableMonthlyCostsMinor, 'variableMonthlyCostsMinor');
  const forecastMonths = assertNonNegativeInteger(input.forecastMonths, 'forecastMonths');

  if (forecastMonths < 1) {
    throw new Error('forecastMonths must be greater than or equal to 1.');
  }

  const monthlyGrowthRate = new Decimal(input.monthlyGrowthRate ?? 0);

  if (monthlyGrowthRate.isNeg()) {
    warnings.add('NEGATIVE_GROWTH');
  }

  const onePlusGrowth = new Decimal(1).plus(monthlyGrowthRate);
  const monthlyProjection: CashflowProjectionPoint[] = [];
  const monthlyExpensesMinor = new Decimal(fixedMonthlyCostsMinor).plus(variableMonthlyCostsMinor);

  let previousCashBalanceMinor = new Decimal(startingCashMinor);
  let firstNegativeMonth: number | null = null;

  for (let monthIndex = 1; monthIndex <= forecastMonths; monthIndex += 1) {
    const revenueMinor = new Decimal(baseMonthlyRevenueMinor).mul(onePlusGrowth.pow(monthIndex - 1));
    const netCashflowMinor = revenueMinor.minus(monthlyExpensesMinor);
    const cashBalanceMinor = previousCashBalanceMinor.plus(netCashflowMinor);

    if (firstNegativeMonth === null && cashBalanceMinor.lte(0)) {
      firstNegativeMonth = monthIndex;
    }

    monthlyProjection.push({
      monthIndex,
      revenueMinor,
      expensesMinor: monthlyExpensesMinor,
      netCashflowMinor,
      cashBalanceMinor
    });

    previousCashBalanceMinor = cashBalanceMinor;
  }

  if (firstNegativeMonth === 1) {
    warnings.add('IMMEDIATE_NEGATIVE');
  }

  return {
    monthlyProjection,
    runwayMonth: firstNegativeMonth,
    firstNegativeMonth,
    finalBalanceMinor: monthlyProjection[monthlyProjection.length - 1].cashBalanceMinor,
    warnings: Array.from(warnings)
  };
};
