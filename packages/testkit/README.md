# @marginbase/testkit

Shared test utilities, factories, and helpers for **NO MANUAL** testing across MarginBase.

## Goal

Reduce test boilerplate and ensure consistency across unit, integration, and E2E tests by providing reusable **factories** (realistic test data) and **helpers** (assertions, tracking, configuration).

## Structure

### Factories

Create deterministic test data:

- **`factories/scenario`** — Profit/Break-Even/Cashflow scenarios
- **`factories/entitlements`** — Entitlement cache states (free, pro, trial, past-due, stale)
- **`factories/i18n`** — Language/locale configurations

### Helpers

Utilities for common test patterns:

- **`helpers/vitest`** — Unit/integration test assertions (numeric, structure, mutations)
- **`helpers/playwright`** — E2E test utilities (console budget, visual config, network tracking)

## Usage Examples

### Unit Tests (Vitest)

```typescript
import { profitScenarioFactory, expectValidMinorUnits } from '@marginbase/testkit';

describe('profit calculator', () => {
  it('calculates correctly', () => {
    const scenario = profitScenarioFactory({ scenarioName: 'Q1 Forecast' });
    expect(scenario.module).toBe('profit');
    expectValidMinorUnits(scenario.inputData.revenue, 'revenue');
  });
});
```

### Entitlements Tests

```typescript
import { bundleEntitlementFactory, trialEntitlementFactory } from '@marginbase/testkit';

describe('module access', () => {
  it('grants access with bundle entitlement', () => {
    const cache = bundleEntitlementFactory();
    expect(canUseModule('breakeven', cache)).toBe(true);
  });

  it('enforces trial expiration', () => {
    const cache = trialEntitlementFactory();
    expect(cache.status).toBe('trialing');
  });
});
```

### E2E Tests (Playwright)

```typescript
import { attachConsoleErrorTracking, primaryTestLocalesFactory } from '@marginbase/testkit';

test('no console errors on critical flow', async ({ page }) => {
  const { expectNoErrors } = attachConsoleErrorTracking(page);

  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();

  expectNoErrors(); // ← Fails test if any console.error occurred
});

test('test all primary locales', async ({ page }) => {
  for (const locale of primaryTestLocalesFactory()) {
    await page.goto(`/${locale}/dashboard`);
    // ... assertions
  }
});
```

### i18n Tests

```typescript
import { allLanguageStatesFactory } from '@marginbase/testkit';

describe('language switching', () => {
  for (const langState of allLanguageStatesFactory()) {
    it(`displays correctly in ${langState.currentLocale}`, () => {
      // test with this language state
    });
  }
});
```

## Integration with CI

1. Install testkit in your package:
   ```bash
   pnpm add @marginbase/testkit --save-dev
   ```

2. Import and use in tests:
   ```typescript
   import { scenarioFactory, expectValidScenarioId } from '@marginbase/testkit';
   ```

3. CI automatically picks up from monorepo workspace.

## Guidelines

- **Factories:** Use to create **deterministic** test data (don't randomize unless intentional).
- **Helpers:** Use to enforce **consistency** — all E2E tests should use `attachConsoleErrorTracking`.
- **Privacy:** Helpers include guards to prevent monetary values in payloads.

## Contributing

When adding new test patterns:
1. Add factory to appropriate `factories/*.ts` file
2. Export from `src/index.ts`
3. Add JSDoc examples in comments
4. Test with all three test layers (unit/integration/e2e)

---

**See also:**
- `MarginBase_NO_MANUAL_Testing_Plan_Copilot.md`
- `docs/architecture/quality-attributes.md`
