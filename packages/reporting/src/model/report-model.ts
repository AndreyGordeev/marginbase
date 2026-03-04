export interface ReportSummary {
  title: string;
  generatedAtLocal: string;
  currencyCode: string;
  locale: string;
}

export interface ReportProfitabilitySection {
  revenueTotalMinor: number;
  totalCostMinor: number;
  grossProfitMinor: number;
  netProfitMinor: number;
  contributionMarginPct: number | null;
  netProfitPct: number | null;
  markupPct: number | null;
  warnings: string[];
}

export interface ReportBreakEvenSection {
  unitContributionMinor: number;
  breakEvenQuantity: number | null;
  breakEvenRevenueMinor: number | null;
  requiredQuantityForTargetProfit: number | null;
  requiredRevenueForTargetProfitMinor: number | null;
  marginOfSafetyUnits: number | null;
  marginOfSafetyPct: number | null;
  warnings: string[];
}

export interface ReportCashflowRow {
  monthIndex: number;
  revenueMinor: number;
  expensesMinor: number;
  netCashflowMinor: number;
  cashBalanceMinor: number;
}

export interface ReportCashflowSection {
  runwayMonth: number | null;
  firstNegativeMonth: number | null;
  finalBalanceMinor: number;
  monthlyProjection: ReportCashflowRow[];
  warnings: string[];
}

export interface ReportRiskIndicator {
  code: string;
  message: string;
  severity: 'info' | 'warning';
}

export interface ReportModel {
  summary: ReportSummary;
  profitability?: ReportProfitabilitySection;
  breakeven?: ReportBreakEvenSection;
  cashflow?: ReportCashflowSection;
  riskIndicators: ReportRiskIndicator[];
  disclaimer: string;
}
