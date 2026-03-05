import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Layout & Overlap Guards — Hard Gate #4: "Forms Must Not Stick Together" 📐
 *
 * Validates geometric layout integrity across all calculator pages.
 * Critical regression: Forms collapsing or overlapping = immediate block.
 *
 * Hard block if any overlaps or spacing violations detected.
 */

// Helper: Check if two boxes intersect
function boxesIntersect(
  box1: { x: number; y: number; width: number; height: number } | null,
  box2: { x: number; y: number; width: number; height: number } | null,
): boolean {
  if (!box1 || !box2) return false;

  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

// Helper: Get vertical distance between boxes
function getVerticalDistance(
  box1: { x: number; y: number; width: number; height: number } | null,
  box2: { x: number; y: number; width: number; height: number } | null,
): number {
  if (!box1 || !box2) return 0;

  // If box2 is below box1
  if (box2.y > box1.y + box1.height) {
    return box2.y - (box1.y + box1.height);
  }

  // If box1 is below box2
  if (box1.y > box2.y + box2.height) {
    return box1.y - (box2.y + box2.height);
  }

  // Overlapping
  return -1;
}


test.describe('Layout Guards: Hard Gate #4 - Form Integrity', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  // ============================================================================
  // SECTION 1: Profit Calculator Form Layout
  // ============================================================================

  test.describe('1: Profit Calculator Layout', () => {
    test('1A: No field overlap on desktop (1280px)', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      // Get input fields (may be in a form or scattered)
      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count >= 2) {
        for (let i = 0; i < count - 1; i++) {
          for (let j = i + 1; j < count; j++) {
            const box1 = await inputs.nth(i).boundingBox();
            const box2 = await inputs.nth(j).boundingBox();

            expect(!boxesIntersect(box1, box2)).toBeTruthy(
              `Input ${i} and input ${j} overlap on desktop`,
            );
          }
        }
      }
    });

    test('1B: Minimum spacing between fields on desktop', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count >= 2) {
        // Check adjacent fields have >= 8px spacing
        for (let i = 0; i < count - 1; i++) {
          const box1 = await inputs.nth(i).boundingBox();
          const box2 = await inputs.nth(i + 1).boundingBox();

          if (box1 && box2) {
            const distance = getVerticalDistance(box1, box2);
            expect(distance === -1 || distance >= 8).toBeTruthy(
              `Spacing between field ${i} and ${i + 1}: ${distance}px (minimum: 8px)`,
            );
          }
        }
      }
    });

    test('1C: No field overlap on tablet (768px)', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count >= 2) {
        for (let i = 0; i < count - 1; i++) {
          for (let j = i + 1; j < count; j++) {
            const box1 = await inputs.nth(i).boundingBox();
            const box2 = await inputs.nth(j).boundingBox();

            expect(!boxesIntersect(box1, box2)).toBeTruthy(
              `Input ${i} and input ${j} overlap on tablet`,
            );
          }
        }
      }
    });

    test('1D: No field overlap on mobile (360px)', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count >= 2) {
        for (let i = 0; i < count - 1; i++) {
          for (let j = i + 1; j < count; j++) {
            const box1 = await inputs.nth(i).boundingBox();
            const box2 = await inputs.nth(j).boundingBox();

            expect(!boxesIntersect(box1, box2)).toBeTruthy(
              `Input ${i} and input ${j} overlap on mobile`,
            );
          }
        }
      }
    });

    test('1E: Labels not clipped by adjacent fields', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      // Find labels
      const labels = page.locator('label');
      const inputs = page.locator('input[type="number"]');

      if ((await labels.count()) > 0 && (await inputs.count()) > 0) {
        for (let i = 0; i < (await labels.count()); i++) {
          const label = labels.nth(i);
          const labelBox = await label.boundingBox();

          if (labelBox) {
            // Check label is not clipped by being too small
            expect(labelBox.height).toBeGreaterThanOrEqual(16, `Label ${i} height too small`);
            expect(labelBox.width).toBeGreaterThanOrEqual(30, `Label ${i} width too small`);
          }
        }
      }
    });
  });

  // ============================================================================
  // SECTION 2: Break-Even Calculator Form Layout
  // ============================================================================

  test.describe('2: Break-Even Calculator Layout', () => {
    test('2A: No field overlap on desktop', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/break-even');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count >= 2) {
        for (let i = 0; i < count - 1; i++) {
          for (let j = i + 1; j < count; j++) {
            const box1 = await inputs.nth(i).boundingBox();
            const box2 = await inputs.nth(j).boundingBox();

            expect(!boxesIntersect(box1, box2)).toBeTruthy(
              `Break-even input ${i} and ${j} overlap`,
            );
          }
        }
      }
    });

    test('2B: No field overlap on mobile', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/break-even');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input[type="number"]');
      const count = await inputs.count();

      if (count >= 2) {
        for (let i = 0; i < count - 1; i++) {
          for (let j = i + 1; j < count; j++) {
            const box1 = await inputs.nth(i).boundingBox();
            const box2 = await inputs.nth(j).boundingBox();

            expect(!boxesIntersect(box1, box2)).toBeTruthy(
              `Break-even input ${i} and ${j} overlap on mobile`,
            );
          }
        }
      }
    });
  });

  // ============================================================================
  // SECTION 3: Cashflow Calculator Form Layout
  // ============================================================================

  test.describe('3: Cashflow Calculator Layout', () => {
    test('3A: Projection table not overlapping with controls', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/cashflow');
      await page.waitForLoadState('networkidle');

      const controls = page.locator('input, button, select').first();
      const table = page.locator('table').first();

      if ((await controls.boundingBox()) && (await table.boundingBox())) {
        const controlsBox = await controls.boundingBox();
        const tableBox = await table.boundingBox();

        expect(!boxesIntersect(controlsBox, tableBox)).toBeTruthy(
          'Cashflow controls and table should not overlap',
        );
      }
    });
  });

  // ============================================================================
  // SECTION 4: Dialog Layout Validation
  // ============================================================================

  test.describe('4: Dialog Layout Guards', () => {
    test('4A: Share dialog buttons not clipped', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      // Open share dialog
      await page.click('button:has-text("Share")').catch(() => {});
      await page.waitForTimeout(500);

      const shareDialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();

      if (await shareDialog.isVisible()) {
        const buttons = shareDialog.locator('button');
        const count = await buttons.count();

        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const buttonBox = await buttons.nth(i).boundingBox();
            expect(buttonBox?.width).toBeGreaterThanOrEqual(60, `Button ${i} too narrow`);
            expect(buttonBox?.height).toBeGreaterThanOrEqual(25, `Button ${i} too short`);
          }
        }
      }
    });

    test('4B: Export dialog not clipped on mobile', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/profit');

      // Open export dialog
      await page.click('button:has-text("Export")').catch(() => {});
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();

      if (await dialog.isVisible()) {
        const dialogBox = await dialog.boundingBox();
        const dialogContent = dialog.locator('*').first();
        const contentBox = await dialogContent.boundingBox();

        if (dialogBox && contentBox) {
          // Dialog content should fit within viewport with padding
          expect(contentBox.x).toBeGreaterThanOrEqual(8, 'Dialog too close to left edge');
          expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(
            360 - 8,
            'Dialog too close to right edge',
          );
        }
      }
    });
  });

  // ============================================================================
  // SECTION 5: Viewport Resize Stability
  // ============================================================================

  test.describe('5: Layout Stability Under Resize', () => {
    test('5A: Desktop to mobile resize maintains layout integrity', async () => {
      await page.goto('http://localhost:5173/profit');

      // Start with desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForLoadState('networkidle');

      const inputs1 = page.locator('input[type="number"]');
      const count1 = await inputs1.count();

      // Resize to mobile
      await page.setViewportSize({ width: 360, height: 800 });
      await page.waitForTimeout(500);

      const inputs2 = page.locator('input[type="number"]');
      const count2 = await inputs2.count();

      // Should have same number of fields
      expect(count2).toBe(count1);

      // No overlaps after resize
      if (count2 >= 2) {
        for (let i = 0; i < count2 - 1; i++) {
          const box1 = await inputs2.nth(i).boundingBox();
          const box2 = await inputs2.nth(i + 1).boundingBox();

          expect(!boxesIntersect(box1, box2)).toBeTruthy(
            `Fields ${i} and ${i + 1} overlap after resize to mobile`,
          );
        }
      }
    });

    test('5B: Mobile to desktop resize maintains layout integrity', async () => {
      await page.goto('http://localhost:5173/profit');

      // Start with mobile
      await page.setViewportSize({ width: 360, height: 800 });
      await page.waitForLoadState('networkidle');

      // Resize to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);

      const inputs2 = page.locator('input[type="number"]');
      const count2 = await inputs2.count();

      // No overlaps
      if (count2 >= 2) {
        for (let i = 0; i < count2 - 1; i++) {
          const box1 = await inputs2.nth(i).boundingBox();
          const box2 = await inputs2.nth(i + 1).boundingBox();

          expect(!boxesIntersect(box1, box2)).toBeTruthy(
            `Fields ${i} and ${i + 1} overlap after resize to desktop`,
          );
        }
      }
    });
  });

  // ============================================================================
  // SECTION 6: Long Content Handling
  // ============================================================================

  test.describe('6: Layout Stress - Long Content', () => {
    test('6A: Long input values don\'t break layout', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      const inputs = page.locator('input[type="number"]');
      if ((await inputs.count()) > 0) {
        // Fill with very long numbers
        await inputs.first().fill('999999999999999999');
        await page.waitForTimeout(300);

        // Page should not have horizontal scroll
        const hasHorizontalScroll = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );

        expect(hasHorizontalScroll).toBe(false);
      }
    });

    test('6B: Long labels don\'t break layout', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/profit');

      const inputs = page.locator('input[type="number"]');

      if ((await inputs.count()) > 0) {
        // Labels might be long in certain locales
        const labels = page.locator('label');

        if ((await labels.count()) > 0) {
          for (let i = 0; i < (await labels.count()); i++) {
            const labelBox = await labels.nth(i).boundingBox();

            if (labelBox) {
              // Label should fit in viewport
              expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(360);
            }
          }
        }
      }
    });

    test('6C: Scenario name truncation prevents overflow', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/profit');

      // Check scenario name display (if user enters long name)
      const scenarioName = page.locator('[class*="scenario"], [class*="title"]').first();

      if (await scenarioName.isVisible()) {
        const box = await scenarioName.boundingBox();

        if (box) {
          // Name container should fit in viewport
          expect(box.x + box.width).toBeLessThanOrEqual(768);
        }
      }
    });
  });

  // ============================================================================
  // SECTION 7: Font Scaling Stability
  // ============================================================================

  test('7A: Layout survives browser font scaling (130%)', async () => {
    // Set zoom level
    await page.goto('http://localhost:5173/profit');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '130%';
    });

    const inputs = page.locator('input[type="number"]');
    const count = await inputs.count();

    if (count >= 2) {
      // Should not have overlaps even at 130% font size
      for (let i = 0; i < count - 1; i++) {
        const box1 = await inputs.nth(i).boundingBox();
        const box2 = await inputs.nth(i + 1).boundingBox();

        expect(!boxesIntersect(box1, box2)).toBeTruthy(
          `Fields ${i} and ${i + 1} overlap at 130% font scale`,
        );
      }
    }
  });

  // ============================================================================
  // SECTION 8: All Calculators - Layout Regression Matrix
  // ============================================================================

  test.describe('8: Regression Matrix', () => {
    const calculators = ['profit', 'break-even', 'cashflow'];
    const viewports = [
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 360, height: 800, name: 'mobile' },
    ];

    for (const calc of calculators) {
      for (const vp of viewports) {
        test(`8X: ${calc} calculator layout stable on ${vp.name}`, async () => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(`http://localhost:5173/${calc}`);
          await page.waitForLoadState('networkidle');

          const inputs = page.locator('input[type="number"]');
          const count = await inputs.count();

          if (count >= 2) {
            for (let i = 0; i < count - 1; i++) {
              const box1 = await inputs.nth(i).boundingBox();
              const box2 = await inputs.nth(i + 1).boundingBox();

              expect(!boxesIntersect(box1, box2)).toBeTruthy(
                `${calc} inputs overlap on ${vp.name}`,
              );
            }
          }
        });
      }
    }
  });
});
