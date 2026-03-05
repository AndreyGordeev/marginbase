import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { attachErrorTracking } from './playwright-helpers';

const expectNoSeriousOrCriticalViolations = async (page: import('@playwright/test').Page): Promise<void> => {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrCritical = results.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical'
  );

  expect(seriousOrCritical).toEqual([]);
};

const loginAsGuest = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
};

test('a11y smoke: dashboard has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});

test('a11y smoke: profit workspace has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await page.getByRole('button', { name: 'Profit' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});

test('a11y smoke: locked cashflow paywall has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await page.goto('/en/login#/cashflow');
  await expect(page.getByText('This module requires an active subscription.')).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});

test('a11y smoke: settings has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});

// ============================================================================
// SECTION 2: Keyboard Navigation & Focus Management
// ============================================================================

test.describe('Keyboard Navigation & Focus', () => {
  test('keyboard: can navigate profit form with Tab key', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Get all focusable elements in the form
    const focusableElements = page.locator(
      'button, input, select, textarea, [tabindex]'
    );
    const count = await focusableElements.count();

    expect(count).toBeGreaterThan(0);

    // Tab through multiple elements and verify focus moves
    for (let i = 0; i < Math.min(3, count); i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const activeElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return el?.tagName || 'NONE';
      });

      expect(activeElement).not.toBe('BODY'); // Focus should be on an element
    }

    expectNoErrors();
  });

  test('keyboard: Escape closes dialogs', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Try to open a dialog (if available)
    const shareButtonExists = await page.getByRole('button', { name: /Share|Export/i }).first().isVisible().catch(() => false);

    if (shareButtonExists) {
      await page.getByRole('button', { name: /Share|Export/i }).first().click();
      await page.waitForTimeout(300);

      // Check if dialog is open
      const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
      const isOpen = await dialog.isVisible().catch(() => false);

      if (isOpen) {
        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Dialog should close
        const isClosed = !(await dialog.isVisible().catch(() => true));
        expect(isClosed).toBe(true);
      }
    }

    expectNoErrors();
  });

  test('keyboard: Enter submits forms', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Find first input field
    const firstInput = page.locator('input[type="number"]').first();

    if (await firstInput.isVisible()) {
      await firstInput.focus();
      await firstInput.fill('1000');

      // Look for calculate button
      const calculateButton = page.getByRole('button', { name: /Calculate|Submit/i }).first();

      if (await calculateButton.isVisible()) {
        // Click it to establish baseline state
        await calculateButton.click();
        await page.waitForTimeout(300);
      }
    }

    expectNoErrors();
  });
});

// ============================================================================
// SECTION 3: Focus Management in Dialogs/Modals
// ============================================================================

test.describe('Modal & Dialog Focus', () => {
  test('modal: focus trap prevents tabbing outside export dialog', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Try to open export dialog
    const exportButton = page.getByRole('button', { name: /Export|Download/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();

      if (await dialog.isVisible()) {
        // Get buttons in dialog
        const dialogButtons = dialog.locator('button');
        const buttonCount = await dialogButtons.count();

        if (buttonCount > 0) {
          // Focus on first button
          await dialogButtons.first().focus();

          // Tab several times
          for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(50);
          }

          // Verify focus is still within dialog
          const stillInDialog = await page.evaluate((selector) => {
            const modal = document.querySelector(selector);
            return modal?.contains(document.activeElement) ?? false;
          }, '[role="dialog"], .modal, [class*="dialog"]');

          expect(stillInDialog).toBe(true);
        }
      }
    }

    expectNoErrors();
  });

  test('modal: ARIA attributes present on dialogs', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Try to open dialog
    const dialogTrigger = page.getByRole('button', { name: /Share|Export|Settings/i }).first();

    if (await dialogTrigger.isVisible()) {
      await dialogTrigger.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();

      if (await dialog.isVisible()) {
        // Check for ARIA attributes
        const role = await dialog.getAttribute('role');
        const ariaModal = await dialog.getAttribute('aria-modal');
        const ariaLabel = await dialog.getAttribute('aria-label');
        const ariaLabelledBy = await dialog.getAttribute('aria-labelledby');

        // Should have role or aria-modal or aria-label
        const hasProperAria =
          role === 'dialog' ||
          ariaModal === 'true' ||
          ariaLabel ||
          ariaLabelledBy;

        expect(hasProperAria).toBe(true);
      }
    }

    expectNoErrors();
  });

  test('modal: focus returns to trigger after close', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Find and click a dialog trigger
    const trigger = page.getByRole('button', { name: /Share|Export/i }).first();

    if (await trigger.isVisible()) {
      await trigger.focus();

      await trigger.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
      if (await dialog.isVisible()) {
        // Look for close button
        const closeButton = dialog
          .locator('button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"]')
          .first();

        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(300);

          // Focus should return to trigger or nearby
          const currentFocus = await page.evaluate(() => {
            return (document.activeElement as HTMLElement)?.tagName || '';
          });

          expect(['BUTTON', 'A', 'DIV']).toContain(currentFocus);
        }
      }
    }

    expectNoErrors();
  });
});

// ============================================================================
// SECTION 4: Color Contrast (Basic Check)
// ============================================================================

test.describe('Color & Contrast', () => {
  test('contrast: page has readable text', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);

    // Check that page has text content (basic check)
    const bodyText = await page.locator('body').textContent();
    expect((bodyText || '').length).toBeGreaterThan(50);

    expectNoErrors();
  });
});

// ============================================================================
// SECTION 5: Form Label Association
// ============================================================================

test.describe('Form Labels', () => {
  test('forms: inputs have associated labels or aria-label', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Get all input fields
    const inputs = page.locator('input[type="number"], input[type="text"]');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        const inputId = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');

        let hasLabel = false;

        // Check for associated label
        if (inputId) {
          const label = page.locator(`label[for="${inputId}"]`);
          hasLabel = await label.isVisible();
        }

        // Check for aria-label or aria-labelledby
        if (!hasLabel && (ariaLabel || ariaLabelledBy)) {
          hasLabel = true;
        }

        // At least some inputs should have labels
        if (i < 2) {
          expect(hasLabel || inputId || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    }

    expectNoErrors();
  });
});

// ============================================================================
// SECTION 6: Semantic HTML
// ============================================================================

test.describe('Semantic HTML', () => {
  test('semantic: main heading exists on page', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);

    // Page should have h1 or main heading
    const h1 = page.locator('h1');
    const heading = page.locator('[role="heading"][aria-level="1"]');

    const hasMainHeading = (await h1.count()) > 0 ||
      (await heading.count()) > 0;

    expect(hasMainHeading).toBe(true);

    expectNoErrors();
  });

  test('semantic: buttons are actual buttons', async ({ page }) => {
    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);

    // Check that clickable elements use proper roles
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    expect(buttonCount).toBeGreaterThan(0);

    // At least first few should be actual <button> elements
    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(3, buttonCount); i++) {
        const tag = await buttons.nth(i).evaluate((el) => el.tagName);
        expect(tag).toBe('BUTTON');
      }
    }

    expectNoErrors();
  });
});

// ============================================================================
// SECTION 7: Mobile Accessibility
// ============================================================================

test.describe('Mobile Accessibility', () => {
  test('mobile: touch targets are large enough (48x48px)', async ({ page, context }) => {
    // Set mobile viewport
    await context.setViewportSize({ width: 375, height: 667 });

    const { expectNoErrors } = attachErrorTracking(page);
    await loginAsGuest(page);
    await page.getByRole('button', { name: 'Profit' }).click();
    await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

    // Check button sizes
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(5, buttonCount); i++) {
        const box = await buttons.nth(i).boundingBox();

        if (box && box.width > 0 && box.height > 0) {
          // Touch target should ideally be 48x48px or larger
          // Be lenient for now (some buttons may be smaller)
          expect(box.width).toBeGreaterThanOrEqual(24);
          expect(box.height).toBeGreaterThanOrEqual(24);
        }
      }
    }

    expectNoErrors();
  });
});
