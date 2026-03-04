import { expect, test } from '@playwright/test';

test('share link can be opened and imported back into app', async ({ page }) => {
  let capturedEncryptedSnapshot: Record<string, unknown> | null = null;
  let capturedToken = 'share_e2e_token';

  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });

  await page.route('**/share/create', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    capturedEncryptedSnapshot = body.encryptedSnapshot as Record<string, unknown>;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: capturedToken,
        expiresAt: '2026-04-03T10:00:00.000Z'
      })
    });
  });

  await page.route('**/share/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const token = url.pathname.split('/').filter(Boolean).at(-1) ?? '';

    if (request.method() === 'GET' && token === capturedToken && capturedEncryptedSnapshot) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          encryptedSnapshot: capturedEncryptedSnapshot
        })
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const profitCard = page.locator('.card', { hasText: 'Profit Calculator' }).first();
  await profitCard.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await page.getByRole('button', { name: 'Share Scenario' }).click();
  await expect(page.getByRole('heading', { name: 'Shared Scenario' })).toBeVisible();

  const shareUrl = await page.locator('textarea').first().inputValue();
  expect(shareUrl).toContain('/s/');
  expect(shareUrl).toContain('#k=');

  await page.goto(shareUrl);
  await expect(page.getByRole('heading', { name: 'Shared Scenario' })).toBeVisible();

  await page.getByRole('button', { name: 'Import this scenario' }).click();
  await page.goto('/en/login#/profit');
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();
  await expect(page.locator('.scenario-item', { hasText: 'Imported Shared Scenario' })).toBeVisible();
});
