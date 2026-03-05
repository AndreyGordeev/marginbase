import type { ReportModel } from '@marginbase/reporting';
import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import { renderAppHeader } from './app-header';
import { renderSidebar } from './page-shared';
import type { CommonDeps } from './page-types';

const formatReportMoney = (minor: number, currencyCode: string, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(minor / 100);
};

const formatReportPct = (value: number | null, locale: string): string => {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

const renderBusinessReportPreview = (report: ReportModel): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'modal';

  const summary = document.createElement('div');
  summary.innerHTML = `<h3>${report.summary.title}</h3><p>${translate('report.generatedLocally')}: ${report.summary.generatedAtLocal}</p>`;
  container.appendChild(summary);

  if (report.profitability) {
    const section = document.createElement('div');
    section.innerHTML = `
      <h4>${translate('report.profitability')}</h4>
      <p>${translate('report.revenue')}: ${formatReportMoney(report.profitability.revenueTotalMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.totalCost')}: ${formatReportMoney(report.profitability.totalCostMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.grossProfit')}: ${formatReportMoney(report.profitability.grossProfitMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.netProfit')}: ${formatReportMoney(report.profitability.netProfitMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.contributionMargin')}: ${formatReportPct(report.profitability.contributionMarginPct, report.summary.locale)}</p>
      <p>${translate('report.netMargin')}: ${formatReportPct(report.profitability.netProfitPct, report.summary.locale)}</p>
      <p>${translate('report.markup')}: ${formatReportPct(report.profitability.markupPct, report.summary.locale)}</p>
    `;
    container.appendChild(section);
  }

  if (report.breakeven) {
    const section = document.createElement('div');
    section.innerHTML = `
      <h4>${translate('report.breakeven')}</h4>
      <p>${translate('report.breakEvenQuantity')}: ${report.breakeven.breakEvenQuantity ?? '—'}</p>
      <p>${translate('report.breakEvenRevenue')}: ${report.breakeven.breakEvenRevenueMinor === null ? '—' : formatReportMoney(report.breakeven.breakEvenRevenueMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.requiredQuantityTarget')}: ${report.breakeven.requiredQuantityForTargetProfit ?? '—'}</p>
      <p>${translate('report.requiredRevenueTarget')}: ${report.breakeven.requiredRevenueForTargetProfitMinor === null ? '—' : formatReportMoney(report.breakeven.requiredRevenueForTargetProfitMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.marginOfSafety')}: ${report.breakeven.marginOfSafetyUnits ?? '—'} (${formatReportPct(report.breakeven.marginOfSafetyPct, report.summary.locale)})</p>
    `;
    container.appendChild(section);
  }

  if (report.cashflow) {
    const section = document.createElement('div');
    const projectionRows = report.cashflow.monthlyProjection.slice(0, 12).map((entry) => {
      return `<li>${translate('report.month')} ${entry.monthIndex}: ${formatReportMoney(entry.revenueMinor, report.summary.currencyCode, report.summary.locale)} | ${formatReportMoney(entry.expensesMinor, report.summary.currencyCode, report.summary.locale)} | ${formatReportMoney(entry.netCashflowMinor, report.summary.currencyCode, report.summary.locale)} | ${formatReportMoney(entry.cashBalanceMinor, report.summary.currencyCode, report.summary.locale)}</li>`;
    }).join('');

    section.innerHTML = `
      <h4>${translate('report.cashflow')}</h4>
      <p>${translate('report.finalBalance')}: ${formatReportMoney(report.cashflow.finalBalanceMinor, report.summary.currencyCode, report.summary.locale)}</p>
      <p>${translate('report.firstNegativeMonth')}: ${report.cashflow.firstNegativeMonth ?? '—'}</p>
      <ul>${projectionRows}</ul>
    `;
    container.appendChild(section);
  }

  if (report.riskIndicators.length > 0) {
    const section = document.createElement('div');
    const risks = report.riskIndicators.map((risk) => `<li>${risk.severity.toUpperCase()}: ${risk.message}</li>`).join('');
    section.innerHTML = `<h4>${translate('report.riskIndicators')}</h4><ul>${risks}</ul>`;
    container.appendChild(section);
  }

  const disclaimer = document.createElement('p');
  disclaimer.textContent = report.disclaimer;
  container.appendChild(disclaimer);

  return container;
};

export const renderDataBackupPage = async (
  root: HTMLElement,
  service: WebAppService,
  deps: Pick<CommonDeps, 'createActionButton' | 'goTo' | 'render'>
): Promise<void> => {
  const { createActionButton, goTo: _goTo, render } = deps;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderAppHeader());
  shell.appendChild(renderSidebar('/data', { createActionButton, goTo: _goTo }));

  const main = document.createElement('main');
  main.className = 'main';

  const title = document.createElement('h2');
  title.textContent = translate('data.title');

  const sections = document.createElement('div');
  sections.className = 'space-y-6';

  const exportButton = createActionButton(translate('data.exportAllJson'), async () => {
    const payload = await service.exportScenariosJson();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'marginbase-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
    window.alert(translate('data.exportCompleted'));
  }, 'primary');

  const reportExportButton = createActionButton(translate('data.reportExportPdf'), async () => {
    try {
      await service.trackExportClicked('pdf');
      const payload = await service.exportBusinessReportPdf();
      const pdfBytes = new Uint8Array(payload);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'marginbase-business-report.pdf';
      anchor.click();
      URL.revokeObjectURL(url);
      window.alert(translate('data.reportExported'));
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.reportExportFailed');
      window.alert(message);
    }
  });

  const reportExportExcelButton = createActionButton(translate('data.reportExportExcel'), async () => {
    try {
      await service.trackExportClicked('xlsx');
      const payload = await service.exportBusinessReportXlsx();
      const xlsxBytes = new Uint8Array(payload);
      const blob = new Blob([xlsxBytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'marginbase-business-report.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
      window.alert(translate('data.reportExported'));
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.reportExportFailed');
      window.alert(message);
    }
  });

  const reportPreview = document.createElement('div');
  reportPreview.className = 'modal';

  const reportPreviewButton = createActionButton(translate('data.previewReport'), async () => {
    try {
      const report = await service.getBusinessReportModel();
      const closeButton = createActionButton(translate('data.closePreview'), () => {
        reportPreview.replaceChildren();
      });

      const content = renderBusinessReportPreview(report);
      reportPreview.replaceChildren(content, closeButton);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.reportPreviewFailed');
      window.alert(message);
    }
  });

  const importInput = document.createElement('textarea');
  importInput.placeholder = translate('data.importPlaceholder');
  importInput.rows = 10;

  const importSummary = document.createElement('div');
  importSummary.className = 'modal';

  const shareLinksSummary = document.createElement('div');
  shareLinksSummary.className = 'modal';

  const refreshSharedLinks = async (): Promise<void> => {
    try {
      const items = await service.listMyShareSnapshots();
      if (items.length === 0) {
        shareLinksSummary.innerHTML = `<p>${translate('data.share.empty')}</p>`;
        return;
      }

      shareLinksSummary.replaceChildren();
      const list = document.createElement('div');
      list.className = 'space-y-6';

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'card';
        row.innerHTML = `<p><strong>${item.module}</strong></p><p>${translate('data.share.token')}: ${item.token}</p><p>${translate('data.share.created')}: ${item.createdAt}</p><p>${translate('data.share.expires')}: ${item.expiresAt}</p>`;
        row.appendChild(createActionButton(translate('data.share.revoke'), async () => {
          await service.revokeMyShareSnapshot(item.token);
          await refreshSharedLinks();
        }));
        list.appendChild(row);
      }

      shareLinksSummary.appendChild(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate('data.share.loadFailed');
      shareLinksSummary.innerHTML = `<div class="inline-error">${message}</div>`;
    }
  };

  const previewButton = createActionButton(translate('data.previewImport'), () => {
    const preview = service.previewImport(importInput.value);
    if (!preview.ok) {
      importSummary.innerHTML = `<div class="inline-error"><strong>${translate('data.previewFailed')}</strong> ${preview.errors[0]?.message ?? translate('data.importPreviewFailed')}</div>`;
      return;
    }

    importSummary.innerHTML = `
      <h3>${translate('data.importScenarios')}</h3>
      <p>${translate('data.total')}: ${preview.summary.total}</p>
      <p>${translate('data.profit')}: ${preview.summary.profit}</p>
      <p>${translate('data.breakeven')}: ${preview.summary.breakeven}</p>
      <p>${translate('data.cashflow')}: ${preview.summary.cashflow}</p>
      <p><strong>${translate('data.replaceWarning')}</strong></p>
    `;
  });

  const confirmButton = createActionButton(translate('data.confirmImportReplace'), async () => {
    const result = service.previewImport(importInput.value);
    if (!result.ok) {
      window.alert(translate('data.importFailed'));
      return;
    }

    await service.applyImport(result);
    window.alert(translate('data.importCompleted'));
    await render();
  }, 'primary');

  const exportCard = document.createElement('section');
  exportCard.className = 'card';
  exportCard.innerHTML = `<h3>${translate('data.exportCardTitle')}</h3><p>${translate('data.exportCardDesc')}</p>`;
  exportCard.appendChild(exportButton);
  exportCard.appendChild(reportPreviewButton);
  exportCard.appendChild(reportExportButton);
  exportCard.appendChild(reportExportExcelButton);
  if (service.isExportWatermarked()) {
    const exportRestriction = document.createElement('p');
    exportRestriction.textContent = `${translate('data.exportWatermarkFree')} ${translate('data.exportWatermarkUpgrade')}`;
    exportCard.appendChild(exportRestriction);
  }
  exportCard.appendChild(reportPreview);

  const importCard = document.createElement('section');
  importCard.className = 'card';
  importCard.innerHTML = `<h3>${translate('data.importCardTitle')}</h3><p>${translate('data.importCardDesc')}</p>`;
  const importActions = document.createElement('div');
  importActions.className = 'button-row';
  importCard.appendChild(importInput);
  importActions.appendChild(previewButton);
  importActions.appendChild(confirmButton);
  importCard.appendChild(importActions);
  importCard.appendChild(importSummary);

  const shareCard = document.createElement('section');
  shareCard.className = 'card';
  shareCard.innerHTML = `<h3>${translate('data.share.title')}</h3><p>${translate('data.share.desc')}</p>`;
  shareCard.appendChild(createActionButton(translate('data.share.refresh'), () => {
    void refreshSharedLinks();
  }, 'primary'));
  shareCard.appendChild(shareLinksSummary);

  sections.appendChild(exportCard);
  sections.appendChild(importCard);
  sections.appendChild(shareCard);

  main.appendChild(title);
  main.appendChild(sections);
  shell.appendChild(main);
  root.replaceChildren(shell);
};
