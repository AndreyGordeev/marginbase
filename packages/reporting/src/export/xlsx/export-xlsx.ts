import { utils, write } from 'xlsx';
import type { ReportModel } from '../../model/report-model';

const money = (minor: number): number => minor / 100;

const pct = (value: number | null): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

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
        { metric: 'Revenue', value: money(report.profitability.revenueTotalMinor) },
        { metric: 'TotalCost', value: money(report.profitability.totalCostMinor) },
        { metric: 'GrossProfit', value: money(report.profitability.grossProfitMinor) },
        { metric: 'NetProfit', value: money(report.profitability.netProfitMinor) },
        { metric: 'ContributionMarginPct', value: pct(report.profitability.contributionMarginPct) },
        { metric: 'NetProfitPct', value: pct(report.profitability.netProfitPct) },
        { metric: 'MarkupPct', value: pct(report.profitability.markupPct) }
      ]
    : [{ metric: 'NoData', value: null }];

  utils.book_append_sheet(workbook, utils.json_to_sheet(profitabilityRows), 'Profitability');

  const breakEvenRows: Array<Record<string, string | number | null>> = report.breakeven
    ? [
        { metric: 'UnitContribution', value: money(report.breakeven.unitContributionMinor) },
        { metric: 'BreakEvenQuantity', value: report.breakeven.breakEvenQuantity },
        { metric: 'BreakEvenRevenue', value: report.breakeven.breakEvenRevenueMinor === null ? null : money(report.breakeven.breakEvenRevenueMinor) },
        { metric: 'RequiredQuantityForTargetProfit', value: report.breakeven.requiredQuantityForTargetProfit },
        { metric: 'RequiredRevenueForTargetProfit', value: report.breakeven.requiredRevenueForTargetProfitMinor === null ? null : money(report.breakeven.requiredRevenueForTargetProfitMinor) },
        { metric: 'MarginOfSafetyUnits', value: report.breakeven.marginOfSafetyUnits },
        { metric: 'MarginOfSafetyPct', value: pct(report.breakeven.marginOfSafetyPct) }
      ]
    : [{ metric: 'NoData', value: null }];

  utils.book_append_sheet(workbook, utils.json_to_sheet(breakEvenRows), 'Break-even');

  const cashflowRows: Array<Record<string, string | number | null>> = report.cashflow
    ? report.cashflow.monthlyProjection.map((row) => ({
        monthIndex: row.monthIndex,
        revenue: money(row.revenueMinor),
        expenses: money(row.expensesMinor),
        netCashflow: money(row.netCashflowMinor),
        cashBalance: money(row.cashBalanceMinor)
      }))
    : [{ monthIndex: 'NoData', revenue: null, expenses: null, netCashflow: null, cashBalance: null }];

  utils.book_append_sheet(workbook, utils.json_to_sheet(cashflowRows), 'Cashflow');

  return write(workbook, { bookType: 'xlsx', type: 'buffer' });
};
