import { expect, test } from '@playwright/test';

test('business report PDF and XLSX exports download successfully', async ({ page }) => {
  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });

  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Data & Backup' }).click();
  await expect(page.getByRole('heading', { name: 'Data & Backup' })).toBeVisible();

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export business report (PDF)' }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toBe('marginbase-business-report.pdf');
  expect(await pdfDownload.path()).toBeTruthy();

  const xlsxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export business report (Excel)' }).click();
  const xlsxDownload = await xlsxDownloadPromise;
  expect(xlsxDownload.suggestedFilename()).toBe('marginbase-business-report.xlsx');
  expect(await xlsxDownload.path()).toBeTruthy();
});
