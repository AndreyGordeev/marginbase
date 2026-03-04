import { describe, expect, it, vi } from 'vitest';
import { createService } from './helpers/web-app-service-fixtures';

describe('WebAppService reports + telemetry', () => {
  it('does not emit telemetry events when consent is disabled by default', async () => {
    const sendTelemetryBatch = vi.fn(async () => {
      return {
        accepted: true,
        count: 1,
        objectKey: '2026/03/04/anonymous/test.json'
      };
    });

    const service = createService({ sendTelemetryBatch });

    await service.trackEmbedOpened('profit', true);
    await service.trackEmbedCtaClicked('profit');

    expect(sendTelemetryBatch).not.toHaveBeenCalled();
  });

  it('emits embed telemetry events with allowlisted attributes only', async () => {
    const sendTelemetryBatch = vi.fn(async () => {
      return {
        accepted: true,
        count: 1,
        objectKey: '2026/03/04/anonymous/test.json'
      };
    });

    const service = createService({ sendTelemetryBatch });
  service.setTelemetryConsentState('enabled');

    await service.trackEmbedOpened('profit', true);
    await service.trackEmbedCtaClicked('profit');

    expect(sendTelemetryBatch).toHaveBeenCalledTimes(2);
    expect(sendTelemetryBatch).toHaveBeenNthCalledWith(1, {
      userId: 'anonymous',
      events: [
        expect.objectContaining({
          name: 'embed_opened',
          attributes: {
            moduleId: 'profit',
            poweredBy: true
          }
        })
      ]
    });
    expect(sendTelemetryBatch).toHaveBeenNthCalledWith(2, {
      userId: 'anonymous',
      events: [
        expect.objectContaining({
          name: 'embed_cta_clicked',
          attributes: {
            moduleId: 'profit'
          }
        })
      ]
    });
  });

  it('emits required funnel telemetry events', async () => {
    const sendTelemetryBatch = vi.fn(async () => {
      return {
        accepted: true,
        count: 1,
        objectKey: '2026/03/04/anonymous/test.json'
      };
    });

    const service = createService({ sendTelemetryBatch });
    service.setTelemetryConsentState('enabled');

    await service.trackAppOpened();
    await service.trackModuleOpened('profit');
    await service.trackPaywallShown('profit');
    await service.trackUpgradeClicked();
    await service.trackCheckoutRedirected();
    await service.trackPurchaseConfirmed(true);
    await service.trackExportClicked('pdf');

    const emittedEventNames = sendTelemetryBatch.mock.calls.map((call) => call[0].events[0].name);

    expect(emittedEventNames).toEqual([
      'app_opened',
      'module_opened',
      'paywall_shown',
      'upgrade_clicked',
      'checkout_redirected',
      'purchase_confirmed',
      'export_clicked'
    ]);
  });

  it('exports business report PDF locally from saved scenarios', async () => {
    const service = createService();

    await service.saveProfitScenario({
      scenarioName: 'Report Profit',
      unitPriceMinor: 1200,
      quantity: 12,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 1000
    });

    await service.saveBreakEvenScenario({
      scenarioName: 'Report BE',
      unitPriceMinor: 1200,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 1000,
      targetProfitMinor: 500,
      plannedQuantity: 10
    });

    await service.saveCashflowScenario({
      scenarioName: 'Report CF',
      startingCashMinor: 10_000,
      baseMonthlyRevenueMinor: 4_000,
      fixedMonthlyCostsMinor: 2_000,
      variableMonthlyCostsMinor: 800,
      forecastMonths: 6,
      monthlyGrowthRate: 0.01
    });

    const pdfBytes = await service.exportBusinessReportPdf();

    expect(pdfBytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3])).toBe('%PDF');
  });

  it('builds business report model for local preview', async () => {
    const service = createService();

    await service.saveProfitScenario({
      scenarioName: 'Preview Profit',
      unitPriceMinor: 2000,
      quantity: 5,
      variableCostPerUnitMinor: 800,
      fixedCostsMinor: 1000
    });

    const report = await service.getBusinessReportModel();

    expect(report.summary.title).toBe('Business Report');
    expect(report.profitability?.netProfitMinor).toBe(5000);
    expect(report.disclaimer).toMatch(/locally/i);
  });

  it('exports business report xlsx locally from saved scenarios', async () => {
    const service = createService();

    await service.saveProfitScenario({
      scenarioName: 'Xlsx Profit',
      unitPriceMinor: 1200,
      quantity: 12,
      variableCostPerUnitMinor: 600,
      fixedCostsMinor: 1000
    });

    const xlsxBytes = await service.exportBusinessReportXlsx();

    expect(xlsxBytes.byteLength).toBeGreaterThan(200);
    expect(String.fromCharCode(xlsxBytes[0], xlsxBytes[1])).toBe('PK');
  });

  it('uses watermark for free exports and clean export for paid bundle', () => {
    const service = createService();

    expect(service.isExportWatermarked()).toBe(true);
    expect(service.getBusinessReportExportWatermark()).toBe('Generated by MarginBase');

    service.activateBundle();

    expect(service.isExportWatermarked()).toBe(false);
    expect(service.getBusinessReportExportWatermark()).toBeNull();
  });
});
