import { calculateBreakEven, calculateCashflow, calculateProfit, type BreakEvenInput, type CashflowInput, type ProfitInput } from '@marginbase/domain-core';
import type { ReportModel, ReportRiskIndicator } from '../model/report-model';

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export interface BuildReportInput {
  title?: string;
  locale?: string;
  currencyCode?: string;
  generatedAtLocal?: string;
  profitabilityInput?: ProfitInput;
  breakEvenInput?: BreakEvenInput;
  cashflowInput?: CashflowInput;
}

const createRiskIndicators = (report: Omit<ReportModel, 'riskIndicators'>): ReportRiskIndicator[] => {
  const indicators: ReportRiskIndicator[] = [];

  if (report.profitability && report.profitability.netProfitMinor <= 0) {
    indicators.push({
      code: 'PROFIT_NON_POSITIVE',
      severity: 'warning',
      message: 'Net profit is non-positive.'
    });
  }

  if (report.breakeven && report.breakeven.marginOfSafetyUnits !== null && report.breakeven.marginOfSafetyUnits < 0) {
    indicators.push({
      code: 'NEGATIVE_MARGIN_OF_SAFETY',
      severity: 'warning',
      message: 'Planned volume is below the break-even threshold.'
    });
  }

  if (report.cashflow && report.cashflow.firstNegativeMonth !== null) {
    indicators.push({
      code: 'NEGATIVE_CASH_BALANCE',
      severity: 'warning',
      message: `Cash balance turns negative in month ${report.cashflow.firstNegativeMonth}.`
    });
  }

  if (report.cashflow && report.cashflow.warnings.includes('NEGATIVE_GROWTH')) {
    indicators.push({
      code: 'NEGATIVE_GROWTH',
      severity: 'info',
      message: 'Negative growth rate is applied in forecast assumptions.'
    });
  }

  return indicators;
};

export const buildReportModel = (input: BuildReportInput): ReportModel => {
  if (!input.profitabilityInput && !input.breakEvenInput && !input.cashflowInput) {
    throw new Error('At least one calculator input is required to build a report.');
  }

  const summary = {
    title: input.title ?? 'Business Report',
    generatedAtLocal: input.generatedAtLocal ?? new Date().toISOString(),
    currencyCode: input.currencyCode ?? 'EUR',
    locale: input.locale ?? 'en-US'
  };

  const profitabilityResult = input.profitabilityInput ? calculateProfit(input.profitabilityInput) : undefined;
  const breakEvenResult = input.breakEvenInput ? calculateBreakEven(input.breakEvenInput) : undefined;
  const cashflowResult = input.cashflowInput ? calculateCashflow(input.cashflowInput) : undefined;

  const baseReport: Omit<ReportModel, 'riskIndicators'> = {
    summary,
    profitability: profitabilityResult
      ? {
          revenueTotalMinor: toNumber(profitabilityResult.revenueTotalMinor.toString()) ?? 0,
          totalCostMinor: toNumber(profitabilityResult.totalCostMinor.toString()) ?? 0,
          grossProfitMinor: toNumber(profitabilityResult.grossProfitMinor.toString()) ?? 0,
          netProfitMinor: toNumber(profitabilityResult.netProfitMinor.toString()) ?? 0,
          contributionMarginPct: profitabilityResult.contributionMarginPct ? toNumber(profitabilityResult.contributionMarginPct.toString()) : null,
          netProfitPct: profitabilityResult.netProfitPct ? toNumber(profitabilityResult.netProfitPct.toString()) : null,
          markupPct: profitabilityResult.markupPct ? toNumber(profitabilityResult.markupPct.toString()) : null,
          warnings: profitabilityResult.warnings
        }
      : undefined,
    breakeven: breakEvenResult
      ? {
          unitContributionMinor: toNumber(breakEvenResult.unitContributionMinor.toString()) ?? 0,
          breakEvenQuantity: breakEvenResult.breakEvenQuantity ? toNumber(breakEvenResult.breakEvenQuantity.toString()) : null,
          breakEvenRevenueMinor: breakEvenResult.breakEvenRevenueMinor ? toNumber(breakEvenResult.breakEvenRevenueMinor.toString()) : null,
          requiredQuantityForTargetProfit: breakEvenResult.requiredQuantityForTargetProfit
            ? toNumber(breakEvenResult.requiredQuantityForTargetProfit.toString())
            : null,
          requiredRevenueForTargetProfitMinor: breakEvenResult.requiredRevenueForTargetProfitMinor
            ? toNumber(breakEvenResult.requiredRevenueForTargetProfitMinor.toString())
            : null,
          marginOfSafetyUnits: breakEvenResult.marginOfSafetyUnits ? toNumber(breakEvenResult.marginOfSafetyUnits.toString()) : null,
          marginOfSafetyPct: breakEvenResult.marginOfSafetyPct ? toNumber(breakEvenResult.marginOfSafetyPct.toString()) : null,
          warnings: breakEvenResult.warnings
        }
      : undefined,
    cashflow: cashflowResult
      ? {
          runwayMonth: cashflowResult.runwayMonth,
          firstNegativeMonth: cashflowResult.firstNegativeMonth,
          finalBalanceMinor: toNumber(cashflowResult.finalBalanceMinor.toString()) ?? 0,
          monthlyProjection: cashflowResult.monthlyProjection.map((point) => ({
            monthIndex: point.monthIndex,
            revenueMinor: toNumber(point.revenueMinor.toString()) ?? 0,
            expensesMinor: toNumber(point.expensesMinor.toString()) ?? 0,
            netCashflowMinor: toNumber(point.netCashflowMinor.toString()) ?? 0,
            cashBalanceMinor: toNumber(point.cashBalanceMinor.toString()) ?? 0
          })),
          warnings: cashflowResult.warnings
        }
      : undefined,
    disclaimer: 'Generated locally on your device.'
  };

  return {
    ...baseReport,
    riskIndicators: createRiskIndicators(baseReport)
  };
};
