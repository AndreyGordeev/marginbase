import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReportModel } from '../../model/report-model';

const money = (minor: number, currencyCode: string, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(minor / 100);
};

const pct = (value: number | null, locale: string): string => {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

const line = (value: string, indent = 0): string => `${' '.repeat(indent)}${value}`;

export interface ReportPdfExportOptions {
  watermarkText?: string;
}

export const exportReportPdf = async (report: ReportModel, options: ReportPdfExportOptions = {}): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const rows: string[] = [];
  rows.push(report.summary.title);
  rows.push(`Generated: ${report.summary.generatedAtLocal}`);
  rows.push('');

  if (report.profitability) {
    rows.push('Profitability');
    rows.push(line(`Revenue: ${money(report.profitability.revenueTotalMinor, report.summary.currencyCode, report.summary.locale)}`, 2));
    rows.push(line(`Total Cost: ${money(report.profitability.totalCostMinor, report.summary.currencyCode, report.summary.locale)}`, 2));
    rows.push(line(`Gross Profit: ${money(report.profitability.grossProfitMinor, report.summary.currencyCode, report.summary.locale)}`, 2));
    rows.push(line(`Net Profit: ${money(report.profitability.netProfitMinor, report.summary.currencyCode, report.summary.locale)}`, 2));
    rows.push(line(`Contribution Margin: ${pct(report.profitability.contributionMarginPct, report.summary.locale)}`, 2));
    rows.push(line(`Net Margin: ${pct(report.profitability.netProfitPct, report.summary.locale)}`, 2));
    rows.push('');
  }

  if (report.breakeven) {
    rows.push('Break-even');
    rows.push(line(`Break-even Quantity: ${report.breakeven.breakEvenQuantity ?? '—'}`, 2));
    rows.push(line(`Break-even Revenue: ${report.breakeven.breakEvenRevenueMinor === null ? '—' : money(report.breakeven.breakEvenRevenueMinor, report.summary.currencyCode, report.summary.locale)}`, 2));
    rows.push(line(`Required Quantity (Target): ${report.breakeven.requiredQuantityForTargetProfit ?? '—'}`, 2));
    rows.push(line(`Required Revenue (Target): ${report.breakeven.requiredRevenueForTargetProfitMinor === null ? '—' : money(report.breakeven.requiredRevenueForTargetProfitMinor, report.summary.currencyCode, report.summary.locale)}`, 2));
    rows.push('');
  }

  if (report.cashflow) {
    rows.push('Cashflow');
    rows.push(line(`Final Balance: ${money(report.cashflow.finalBalanceMinor, report.summary.currencyCode, report.summary.locale)}`, 2));
    rows.push(line(`First Negative Month: ${report.cashflow.firstNegativeMonth ?? '—'}`, 2));
    rows.push(line('12-month projection (Month: Revenue | Expenses | Net | Balance):', 2));

    for (const projection of report.cashflow.monthlyProjection.slice(0, 12)) {
      rows.push(
        line(
          `${projection.monthIndex}: ${money(projection.revenueMinor, report.summary.currencyCode, report.summary.locale)} | ${money(projection.expensesMinor, report.summary.currencyCode, report.summary.locale)} | ${money(projection.netCashflowMinor, report.summary.currencyCode, report.summary.locale)} | ${money(projection.cashBalanceMinor, report.summary.currencyCode, report.summary.locale)}`,
          4
        )
      );
    }
    rows.push('');
  }

  if (report.riskIndicators.length > 0) {
    rows.push('Risk Indicators');
    for (const risk of report.riskIndicators) {
      rows.push(line(`${risk.severity.toUpperCase()}: ${risk.message}`, 2));
    }
    rows.push('');
  }

  rows.push(report.disclaimer);

  let y = height - 48;

  for (const row of rows) {
    if (y < 48) {
      y = height - 48;
      pdf.addPage([595, 842]);
    }

    const isHeader = row === report.summary.title || row === 'Profitability' || row === 'Break-even' || row === 'Cashflow' || row === 'Risk Indicators';

    const activePage = pdf.getPages()[pdf.getPageCount() - 1];
    activePage.drawText(row, {
      x: 40,
      y,
      size: isHeader ? 13 : 10,
      font: isHeader ? bold : font,
      color: isHeader ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
      maxWidth: width - 80
    });

    y -= isHeader ? 18 : 14;
  }

  const watermarkText = options.watermarkText?.trim();
  if (watermarkText) {
    for (const currentPage of pdf.getPages()) {
      currentPage.drawText(watermarkText, {
        x: 40,
        y: 24,
        size: 9,
        font,
        color: rgb(0.6, 0.6, 0.6),
        maxWidth: width - 80
      });
    }
  }

  return pdf.save();
};
