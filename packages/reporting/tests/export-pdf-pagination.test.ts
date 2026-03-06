import { describe, expect, it } from 'vitest';
import { exportReportPdf } from '../src/export/pdf/export-pdf';
import type { ReportModel } from '../src/model/report-model';

describe('exportReportPdf: pagination branch coverage', () => {
  it('adds a new page when row rendering exceeds page height', async () => {
    const report: ReportModel = {
      summary: {
        title: 'Pagination Stress Report',
        generatedAtLocal: '2026-03-06T11:30:00.000Z',
        currencyCode: 'EUR',
        locale: 'en-US',
      },
      riskIndicators: Array.from({ length: 120 }, (_, index) => ({
        code: `RISK_${index + 1}`,
        severity: index % 2 === 0 ? 'warning' : 'info',
        message: `Synthetic risk indicator ${index + 1}`,
      })),
      disclaimer: 'Generated locally on your device.',
    };

    const pdfBytes = await exportReportPdf(report);

    expect(pdfBytes.byteLength).toBeGreaterThan(1000);
    expect(
      String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]),
    ).toBe('%PDF');
  });
});
