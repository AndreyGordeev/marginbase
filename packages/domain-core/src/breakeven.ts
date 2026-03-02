import Decimal from 'decimal.js';
import { MinorUnits, assertNonNegativeMinorUnits, nonNegativeDecimal } from './numeric-policy';

export type BreakEvenWarning = 'UC_NON_POSITIVE' | 'P_ZERO_PLANNED_REVENUE';

export interface BreakEvenInput {
  unitPriceMinor: MinorUnits;
  variableCostPerUnitMinor: MinorUnits;
  fixedCostsMinor: MinorUnits;
  targetProfitMinor?: MinorUnits;
  plannedQuantity?: Decimal.Value;
  plannedRevenueMinor?: MinorUnits;
}

export interface BreakEvenResult {
  unitContributionMinor: Decimal;
  breakEvenQuantity: Decimal | null;
  breakEvenRevenueMinor: Decimal | null;
  requiredQuantityForTargetProfit: Decimal | null;
  requiredRevenueForTargetProfitMinor: Decimal | null;
  plannedQuantityResolved: Decimal | null;
  marginOfSafetyUnits: Decimal | null;
  marginOfSafetyPct: Decimal | null;
  warnings: BreakEvenWarning[];
}

export const calculateBreakEven = (input: BreakEvenInput): BreakEvenResult => {
  const warnings = new Set<BreakEvenWarning>();

  const unitPriceMinor = assertNonNegativeMinorUnits(input.unitPriceMinor, 'unitPriceMinor');
  const variableCostPerUnitMinor = assertNonNegativeMinorUnits(input.variableCostPerUnitMinor, 'variableCostPerUnitMinor');
  const fixedCostsMinor = assertNonNegativeMinorUnits(input.fixedCostsMinor, 'fixedCostsMinor');
  const targetProfitMinor = assertNonNegativeMinorUnits(input.targetProfitMinor ?? 0, 'targetProfitMinor');

  const unitContributionMinor = new Decimal(unitPriceMinor).minus(variableCostPerUnitMinor);

  let breakEvenQuantity: Decimal | null = null;
  let breakEvenRevenueMinor: Decimal | null = null;
  let requiredQuantityForTargetProfit: Decimal | null = null;
  let requiredRevenueForTargetProfitMinor: Decimal | null = null;

  if (unitContributionMinor.gt(0)) {
    breakEvenQuantity = new Decimal(fixedCostsMinor).div(unitContributionMinor);
    breakEvenRevenueMinor = breakEvenQuantity.mul(unitPriceMinor);
    requiredQuantityForTargetProfit = new Decimal(fixedCostsMinor).plus(targetProfitMinor).div(unitContributionMinor);
    requiredRevenueForTargetProfitMinor = requiredQuantityForTargetProfit.mul(unitPriceMinor);
  } else {
    warnings.add('UC_NON_POSITIVE');
  }

  let plannedQuantityResolved: Decimal | null = null;

  if (input.plannedQuantity !== undefined) {
    plannedQuantityResolved = nonNegativeDecimal(input.plannedQuantity, 'plannedQuantity');
  } else if (input.plannedRevenueMinor !== undefined) {
    const plannedRevenueMinor = assertNonNegativeMinorUnits(input.plannedRevenueMinor, 'plannedRevenueMinor');

    if (unitPriceMinor > 0) {
      plannedQuantityResolved = new Decimal(plannedRevenueMinor).div(unitPriceMinor);
    } else {
      warnings.add('P_ZERO_PLANNED_REVENUE');
    }
  }

  const marginOfSafetyUnits =
    plannedQuantityResolved !== null && breakEvenQuantity !== null
      ? plannedQuantityResolved.minus(breakEvenQuantity)
      : null;

  const marginOfSafetyPct =
    plannedQuantityResolved !== null && plannedQuantityResolved.gt(0) && marginOfSafetyUnits !== null
      ? marginOfSafetyUnits.div(plannedQuantityResolved)
      : null;

  return {
    unitContributionMinor,
    breakEvenQuantity,
    breakEvenRevenueMinor,
    requiredQuantityForTargetProfit,
    requiredRevenueForTargetProfitMinor,
    plannedQuantityResolved,
    marginOfSafetyUnits,
    marginOfSafetyPct,
    warnings: Array.from(warnings)
  };
};
