import { expect, test } from '@playwright/test';
import { findForbiddenKeyPaths } from '../../../../scripts/privacy-forbidden-keys';

test('network payloads keep financial key names out of telemetry and share requests', async ({ page }) => {
  const interceptedTelemetryBodies: Array<Record<string, unknown>> = [];
  const interceptedShareBodies: Array<Record<string, unknown>> = [];

  await page.route('**/telemetry/batch', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    interceptedTelemetryBodies.push(body);

    const forbiddenPaths = findForbiddenKeyPaths(body);
    expect(forbiddenPaths).toEqual([]);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accepted: true, count: 1, objectKey: 'telemetry/obj_1.json' })
    });
  });

  await page.route('**/share/create', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    interceptedShareBodies.push(body);

    expect(body.encryptedSnapshot).toBeDefined();
    expect(body.snapshot).toBeUndefined();
    expect(body.inputData).toBeUndefined();
    expect(body.calculatedData).toBeUndefined();

    const forbiddenPaths = findForbiddenKeyPaths(body);
    expect(forbiddenPaths).toEqual([]);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'share_privacy_token',
        expiresAt: '2026-04-03T10:00:00.000Z'
      })
    });
  });

  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Enable telemetry' }).click();

  await page.getByRole('button', { name: 'Profit' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await expect(page.getByRole('button', { name: 'Share Scenario' })).toBeVisible();
  await page.getByRole('button', { name: 'Share Scenario' }).click();
  await expect(page.getByRole('heading', { name: 'Shared Scenario' })).toBeVisible();

  expect(interceptedTelemetryBodies.length).toBeGreaterThan(0);
  expect(interceptedShareBodies.length).toBeGreaterThan(0);
});
