import { utils, write } from 'xlsx';
import type { ReportModel } from '../../model/report-model';
import { minorToDecimal, normalizePercentage } from '../utils/format';

export interface ReportXlsxExportOptions {
  watermarkText?: string;
}

export const exportReportXlsx = (report: ReportModel, options: ReportXlsxExportOptions = {}): Uint8Array => {
  const workbook = utils.book_new();

  const summaryRows: Array<Record<string, string | number>> = [
    { key: 'Title', value: report.summary.title },
    { key: 'GeneratedAtLocal', value: report.summary.generatedAtLocal },
    { key: 'CurrencyCode', value: report.summary.currencyCode },
    { key: 'Locale', value: report.summary.locale },
    { key: 'Disclaimer', value: report.disclaimer }
  ];

  if (report.riskIndicators.length > 0) {
    summaryRows.push(...report.riskIndicators.map((risk) => ({
      key: `Risk:${risk.code}`,
      value: `${risk.severity}:${risk.message}`
    })));
  }

  const watermarkText = options.watermarkText?.trim();
  if (watermarkText) {
    summaryRows.push({
      key: 'Watermark',
      value: watermarkText
    });
  }

  utils.book_append_sheet(workbook, utils.json_to_sheet(summaryRows), 'Summary');

  const profitabilityRows: Array<Record<string, string | number | null>> = report.profitability
    ? [
        { metric: 'Revenue', value: minorToDecimal(report.profitability.revenueTotalMinor) },
        { metric: 'TotalCost', value: minorToDecimal(report.profitability.totalCostMinor) },
        { metric: 'GrossProfit', value: minorToDecimal(report.profitability.grossProfitMinor) },
        { metric: 'NetProfit', value: minorToDecimal(report.profitability.netProfitMinor) },
        { metric: 'ContributionMarginPct', value: normalizePercentage(report.profitability.contributionMarginPct) },
        { metric: 'NetProfitPct', value: normalizePercentage(report.profitability.netProfitPct) },
        { metric: 'MarkupPct', value: normalizePercentage(report.profitability.markupPct) }
      ]
    : [{ metric: 'NoData', value: null }];

  utils.book_append_sheet(workbook, utils.json_to_sheet(profitabilityRows), 'Profitability');

  const breakEvenRows: Array<Record<string, string | number | null>> = report.breakeven
    ? [
        { metric: 'UnitContribution', value: minorToDecimal(report.breakeven.unitContributionMinor) },
        { metric: 'BreakEvenQuantity', value: report.breakeven.breakEvenQuantity },
        { metric: 'BreakEvenRevenue', value: report.breakeven.breakEvenRevenueMinor === null ? null : minorToDecimal(report.breakeven.breakEvenRevenueMinor) },
        { metric: 'RequiredQuantityForTargetProfit', value: report.breakeven.requiredQuantityForTargetProfit },
        { metric: 'RequiredRevenueForTargetProfit', value: report.breakeven.requiredRevenueForTargetProfitMinor === null ? null : minorToDecimal(report.breakeven.requiredRevenueForTargetProfitMinor) },
        { metric: 'MarginOfSafetyUnits', value: report.breakeven.marginOfSafetyUnits },
        { metric: 'MarginOfSafetyPct', value: normalizePercentage(report.breakeven.marginOfSafetyPct) }
      ]
    : [{ metric: 'NoData', value: null }];

  utils.book_append_sheet(workbook, utils.json_to_sheet(breakEvenRows), 'Break-even');

  const cashflowRows: Array<Record<string, string | number | null>> = report.cashflow
    ? report.cashflow.monthlyProjection.map((row) => ({
        monthIndex: row.monthIndex,
        revenue: minorToDecimal(row.revenueMinor),
        expenses: minorToDecimal(row.expensesMinor),
        netCashflow: minorToDecimal(row.netCashflowMinor),
        cashBalance: minorToDecimal(row.cashBalanceMinor)
      }))
    : [{ monthIndex: 'NoData', revenue: null, expenses: null, netCashflow: null, cashBalance: null }];

  utils.book_append_sheet(workbook, utils.json_to_sheet(cashflowRows), 'Cashflow');

  return write(workbook, { bookType: 'xlsx', type: 'buffer' });
};
