import Decimal from 'decimal.js';
import {
  MinorUnits,
  assertNonNegativeInteger,
  assertNonNegativeMinorUnits,
  nonNegativeDecimal
} from './numeric-policy';

export type ProfitWarning = 'R_ZERO' | 'V_ZERO' | 'INSUFFICIENT_DATA_TVC';

export interface ProfitUnitModeInput {
  mode: 'unit';
  unitPriceMinor: MinorUnits;
  quantity: number;
  variableCostPerUnitMinor: MinorUnits;
  fixedCostsMinor: MinorUnits;
  additionalVariableCostsMinor?: MinorUnits;
}

export interface ProfitRevenueModeInput {
  mode: 'revenue';
  totalRevenueMinor: MinorUnits;
  fixedCostsMinor: MinorUnits;
  totalVariableCostsMinor?: MinorUnits;
  variableCostPerUnitMinor?: MinorUnits;
  quantity?: number;
  additionalVariableCostsMinor?: MinorUnits;
}

export type ProfitInput = ProfitUnitModeInput | ProfitRevenueModeInput;

export interface ProfitResult {
  revenueTotalMinor: Decimal;
  variableCostTotalMinor: Decimal;
  fixedCostTotalMinor: Decimal;
  totalCostMinor: Decimal;
  grossProfitMinor: Decimal;
  netProfitMinor: Decimal;
  contributionMarginMinor: Decimal;
  contributionMarginPct: Decimal | null;
  netProfitPct: Decimal | null;
  markupPct: Decimal | null;
  warnings: ProfitWarning[];
}

export const calculateProfit = (input: ProfitInput): ProfitResult => {
  const warnings = new Set<ProfitWarning>();
  const fixedCostsMinor = assertNonNegativeMinorUnits(input.fixedCostsMinor, 'fixedCostsMinor');

  let revenueTotalMinor: Decimal;
  let variableCostTotalMinor: Decimal;

  if (input.mode === 'unit') {
    const unitPriceMinor = assertNonNegativeMinorUnits(input.unitPriceMinor, 'unitPriceMinor');
    const quantity = assertNonNegativeInteger(input.quantity, 'quantity');
    const variableCostPerUnitMinor = assertNonNegativeMinorUnits(input.variableCostPerUnitMinor, 'variableCostPerUnitMinor');
    const additionalVariableCostsMinor = assertNonNegativeMinorUnits(
      input.additionalVariableCostsMinor ?? 0,
      'additionalVariableCostsMinor'
    );

    revenueTotalMinor = new Decimal(unitPriceMinor).mul(quantity);
    variableCostTotalMinor = new Decimal(variableCostPerUnitMinor).mul(quantity).plus(additionalVariableCostsMinor);
  } else {
    const totalRevenueMinor = assertNonNegativeMinorUnits(input.totalRevenueMinor, 'totalRevenueMinor');
    const additionalVariableCostsMinor = assertNonNegativeMinorUnits(
      input.additionalVariableCostsMinor ?? 0,
      'additionalVariableCostsMinor'
    );

    revenueTotalMinor = new Decimal(totalRevenueMinor);

    if (input.totalVariableCostsMinor !== undefined) {
      variableCostTotalMinor = new Decimal(assertNonNegativeMinorUnits(input.totalVariableCostsMinor, 'totalVariableCostsMinor'));
    } else if (input.variableCostPerUnitMinor !== undefined && input.quantity !== undefined) {
      const variableCostPerUnitMinor = assertNonNegativeMinorUnits(input.variableCostPerUnitMinor, 'variableCostPerUnitMinor');
      const quantity = assertNonNegativeInteger(input.quantity, 'quantity');
      variableCostTotalMinor = new Decimal(variableCostPerUnitMinor).mul(quantity).plus(additionalVariableCostsMinor);
    } else {
      warnings.add('INSUFFICIENT_DATA_TVC');
      variableCostTotalMinor = new Decimal(additionalVariableCostsMinor);
    }
  }

  const grossProfitMinor = revenueTotalMinor.minus(variableCostTotalMinor);
  const netProfitMinor = grossProfitMinor.minus(fixedCostsMinor);
  const totalCostMinor = variableCostTotalMinor.plus(fixedCostsMinor);
  const contributionMarginMinor = grossProfitMinor;
  let markupPct: Decimal | null = null;

  let contributionMarginPct: Decimal | null = null;
  let netProfitPct: Decimal | null = null;

  if (totalCostMinor.gt(0)) {
    markupPct = netProfitMinor.div(totalCostMinor);
  } else {
    warnings.add('V_ZERO');
  }

  if (revenueTotalMinor.gt(0)) {
    contributionMarginPct = contributionMarginMinor.div(revenueTotalMinor);
    netProfitPct = netProfitMinor.div(revenueTotalMinor);
  } else {
    warnings.add('R_ZERO');
  }

  nonNegativeDecimal(fixedCostsMinor, 'fixedCostTotalMinor');

  return {
    revenueTotalMinor,
    variableCostTotalMinor,
    fixedCostTotalMinor: new Decimal(fixedCostsMinor),
    totalCostMinor,
    grossProfitMinor,
    netProfitMinor,
    contributionMarginMinor,
    contributionMarginPct,
    netProfitPct,
    markupPct,
    warnings: Array.from(warnings)
  };
};
