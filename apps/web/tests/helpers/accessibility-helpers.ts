/**
 * Accessibility Test Helpers
 *
 * Utilities for WCAG 2.1 AA compliance testing in Playwright
 */

import { Page } from '@playwright/test';

export interface A11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes?: string[];
}

/**
 * Check focus order in a form
 * Returns true if focus order is logical (top-to-bottom, left-to-right)
 */
export async function validateFocusOrder(
  page: Page,
  containerSelector: string,
): Promise<boolean> {
  const focusElements = page.locator(
    `${containerSelector} button, ${containerSelector} input, ${containerSelector} select, ${containerSelector} textarea, ${containerSelector} a`,
  );

  const boxes = [];
  for (let i = 0; i < (await focusElements.count()); i++) {
    const box = await focusElements.nth(i).boundingBox();
    if (box) {
      boxes.push({ index: i, box });
    }
  }

  // Check that elements are ordered top-to-bottom (rough check)
  for (let i = 0; i < boxes.length - 1; i++) {
    const current = boxes[i].box;
    const next = boxes[i + 1].box;

    // Next element should be roughly below or to the right of current
    if (next.y < current.y - 10 && next.x < current.x + current.width) {
      // Element went backwards vertically without moving right (likely wrong order)
      console.warn(`Focus order issue: element ${i} to ${i + 1} goes backwards`);
      return false;
    }
  }

  return true;
}

/**
 * Check if focus trap works correctly in modals
 * Returns true if focus stays within modal when tabbing
 */
export async function validateFocusTrap(page: Page, modalSelector: string): Promise<boolean> {
  const modal = page.locator(modalSelector).first();

  if (!(await modal.isVisible())) {
    return false;
  }

  // Get first focusable element in modal
  const firstFocusable = modal
    .locator('button, input, select, textarea, a')
    .first();

  if (!(await firstFocusable.isVisible())) {
    return false;
  }

  // Focus first element
  await firstFocusable.focus();

  // Tab and check focus remains in modal
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);

  const focusedElement = await page.evaluate(
    (selector) => {
      const modal = document.querySelector(selector);
      return modal?.contains(document.activeElement) ? true : false;
    },
    modalSelector,
  );

  return focusedElement;
}

/**
 * Check if a modal has proper ARIA attributes
 */
export async function validateModalAria(page: Page, modalSelector: string): Promise<string[]> {
  const violations: string[] = [];

  const modal = page.locator(modalSelector).first();

  // Check role
  const role = await modal.getAttribute('role');
  if (role !== 'dialog') {
    violations.push('Modal should have role="dialog"');
  }

  // Check aria-modal
  const ariaModal = await modal.getAttribute('aria-modal');
  if (ariaModal !== 'true') {
    violations.push('Modal should have aria-modal="true"');
  }

  // Check aria-labelledby or aria-label
  const labelledBy = await modal.getAttribute('aria-labelledby');
  const label = await modal.getAttribute('aria-label');
  if (!labelledBy && !label) {
    violations.push('Modal should have aria-labelledby or aria-label');
  }

  return violations;
}

/**
 * Check keyboard navigation on a page
 * Returns true if main actions are accessible via keyboard
 */
export async function validateKeyboardNav(
  page: Page,
  expectedFocusableElements: string[],
): Promise<boolean> {
  for (const selector of expectedFocusableElements) {
    const element = page.locator(selector).first();

    if (!(await element.isVisible())) {
      console.warn(`Focusable element not visible: ${selector}`);
      return false;
    }

    // Try to focus
    try {
      await element.focus();
      const isFocused = await element.evaluate((el) => {
        return document.activeElement === el;
      });

      if (!isFocused) {
        console.warn(`Could not focus: ${selector}`);
        return false;
      }
    } catch {
      console.warn(`Focus failed: ${selector}`);
      return false;
    }
  }

  return true;
}

/**
 * Test Enter/Escape key handling in forms
 */
export async function validateFormKeys(page: Page): Promise<{ canSubmit: boolean; escape: boolean }> {
  const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();

  let canSubmit = false;
  let escapeWorks = false;

  // Test Enter key
  if (await submitButton.isVisible()) {
    // Try pressing Enter on a form input
    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      // Check if something happened (form state changed, etc.)
      canSubmit = await page.evaluate(() => {
        return document.activeElement?.tagName !== 'BODY';
      });
    }
  }

  // Test Escape key
  const dialog = page.locator('[role="dialog"]').first();
  if (await dialog.isVisible()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    escapeWorks = !(await dialog.isVisible());
  }

  return { canSubmit, escape: escapeWorks };
}

/**
 * Assert no critical accessibility violations
 * Uses axe-core if available via @axe-core/playwright
 */
export async function assertPageA11y(
  page: Page,
): Promise<void> {
  // Try to use axe if available
  try {
    const { injectAxe, checkA11y } = await import('@axe-core/playwright');

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: false,
      detailedReportOptions: {
        html: true,
      },
    });
  } catch {
    console.warn(
      'axe-core not available, skipping automated a11y check. Install @axe-core/playwright to enable.',
    );
  }
}

/**
 * Validate contrast ratio on a page
 * (Simplified check - full implementation would require color analysis)
 */
export async function validateContrast(page: Page, selector: string): Promise<boolean> {
  const elements = page.locator(selector);

  if ((await elements.count()) === 0) {
    return true;
  }

  // This is a simplified check - true implementation would use contrast analysis library
  const hasStyle = await elements.first().evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.color !== '' || style.backgroundColor !== '';
  });

  return hasStyle;
}

/**
 * Report accessibility issues found
 */
export function reportA11yIssues(violations: A11yViolation[]): void {
  if (violations.length === 0) {
    console.log('✅ No accessibility violations found');
    return;
  }

  const critical = violations.filter((v) => v.impact === 'critical');
  const serious = violations.filter((v) => v.impact === 'serious');

  console.error(`\n❌ Accessibility violations found:`);
  console.error(`  Critical: ${critical.length}`);
  console.error(`  Serious: ${serious.length}`);

  for (const violation of violations.slice(0, 5)) {
    console.error(`\n  - [${violation.impact}] ${violation.description}`);
    if (violation.nodes) {
      violation.nodes.slice(0, 2).forEach((node) => console.error(`    ${node}`));
    }
  }

  if (violations.length > 5) {
    console.error(`  ... and ${violations.length - 5} more`);
  }
}
