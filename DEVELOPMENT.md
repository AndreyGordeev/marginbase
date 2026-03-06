# Development Guide

## Quick Start

```bash
# Install dependencies
corepack pnpm install

# Run all validations
corepack pnpm validate:all

# Run tests
corepack pnpm test          # All unit/integration tests
corepack pnpm test:e2e      # E2E tests (requires build)
corepack pnpm test:coverage # Coverage with gates

# Development
corepack pnpm boot:web      # Start web app dev server
corepack pnpm boot:mobile   # Start mobile app (placeholder)
```

## Scripts Reference

### Testing

- `test` - Run all unit and integration tests across workspace
- `test:unit` - Run only package tests (domain-core, entitlements, etc.)
- `test:coverage` - Run coverage with thresholds (95% lines, 90% branches)
- `test:e2e` - Run Playwright E2E tests (requires preview server)
- `test:e2e:all` - Build testkit + run E2E (CI-compatible)
- `test:deterministic` - Run tests 3x to catch flaky tests

### Quality Checks

- `lint` - ESLint across all packages
- `typecheck` - TypeScript type checking
- `i18n:parity` - Validate all locales have same keys
- `check:console-logs` - Ensure no console.log in production code
- `check:bundle-size` - Build web app and report dist size
- `audit:security` - Run pnpm audit with moderate threshold
- `validate:all` - **Run all checks** (lint + typecheck + i18n + test + coverage)

### Build & Deploy

- `build` - Build all packages in dependency order
- `boot:web` - Start web dev server (Vite)
- `boot:mobile` - Start mobile dev environment

## CI Pipeline

GitHub Actions runs 3 parallel jobs:

1. **lint_typecheck** - ESLint + TypeScript + Security audit
2. **build** - Compile all packages + bundle size check
3. **tests** - Unit/integration tests + i18n parity + coverage gates
4. **e2e** - Playwright on Chromium/Firefox/WebKit (102 tests)

### CI Optimizations

- Playwright browser caching (~2min savings)
- pnpm store caching (~30s savings)
- Parallel job execution (~3min total runtime)
- Hard mode: zero retries, forbid `.only()`

## Test Architecture

### Layers

1. **Unit** (Vitest) - 54 tests in domain-core, 26 in storage
2. **Property-based** (fast-check) - 1000+ runs per invariant
3. **Integration** (Vitest) - IndexedDB, SQLite, Vault
4. **E2E** (Playwright) - 102 tests × 3 browsers = 306 validations

### Coverage Gates

- `domain-core`: 95% lines, 90% branches
- `reporting`: enforced thresholds
- Property-based: 1000 runs minimum

## Code Quality Rules

### Enforced

- No `console.log` in production code (main.ts and scripts/ excluded)
- All locale files must have matching keys
- Bundle size < 10MB (current: ~2-3MB)
- Zero TypeScript errors
- Zero ESLint errors
- All E2E tests pass on 3 browsers

### Recommendations

- Use `data-testid` for E2E-tested elements
- Keep functions pure in domain-core
- Never store financial values in telemetry
- Keep vault logic in storage package only

## Property-Based Testing

We use `fast-check` for numeric invariants:

```typescript
// Profit calculator maintains accounting identities
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 100_000 }),
    (revenue) => {
      const result = calculateProfit({ ... });
      expect(result.netProfit.equals(
        result.revenue.minus(result.costs)
      )).toBe(true);
    }
  ),
  { numRuns: 1000 }
);
```

### Covered Invariants

- Profit: revenue = price × quantity
- Profit: net = revenue - (fixed + variable)
- Breakeven: quantity × contribution = fixed costs
- Cashflow: ending = starting + sum(monthly net)

## Visual Regression Testing

Playwright captures screenshots for:

- Dashboard layout
- Profit workspace (filled form)
- Paywall modal
- Share dialog
- Settings page
- Data export dialog
- Login screen
- Subscription page

Baselines stored in `apps/web/tests/e2e/*.spec.ts-snapshots/`

Update snapshots: `playwright test --update-snapshots`

## Debugging

### E2E Test Failures

```bash
# Run single test
corepack pnpm exec playwright test smoke.spec.ts

# Run with UI mode
corepack pnpm exec playwright test --ui

# Run specific browser
corepack pnpm exec playwright test --project=firefox

# Generate trace
corepack pnpm exec playwright show-report
```

### Unit Test Failures

```bash
# Watch mode
corepack pnpm --filter @marginbase/domain-core test --watch

# Single test file
corepack pnpm --filter @marginbase/domain-core test profit.test.ts

# Coverage report
corepack pnpm --filter @marginbase/domain-core test:coverage
```

## Quick Coverage Check (Phase 7: Complete)

**Current Status (2026-03-06):** 98%+ coverage achieved across critical packages

### Coverage by Package

| Package      | Branches   | Statements | Functions | Lines  | Status       |
| ------------ | ---------- | ---------- | --------- | ------ | ------------ |
| domain-core  | **100%**   | 100%       | 100%      | 100%   | ✅ Maximum   |
| reporting    | **100%**   | 100%       | 100%      | 100%   | ✅ Maximum   |
| storage      | **98.26%** | 97.33%     | 97.16%    | 97.33% | ✅ Optimal\* |
| entitlements | 95%+       | 95%+       | 95%+      | 95%+   | ✅ Target    |

\*Storage optimal coverage: Remaining 1.74% gap is web-vault browser fallback (unreachable in Node.js unit tests). See [Phase 7 completion notes](./TESTING_PHASE_7_MAX_COVERAGE_SCOPE.md) for details.

### Run Coverage Locally

```bash
# Full workspace coverage with gates
corepack pnpm test:coverage

# Individual package coverage
corepack pnpm --filter @marginbase/domain-core test:coverage
corepack pnpm --filter @marginbase/storage test:coverage
corepack pnpm --filter @marginbase/reporting test:coverage

# View HTML coverage report
open coverage/index.html
```

### Testing Statistics

- **Total tests:** 400+ across all packages
- **E2E tests:** 54+ Playwright specs (3 browsers = 162+ validations)
- **Property-based:** 1000+ algorithmic property runs per invariant
- **Integration:** IndexedDB, SQLite, Web Vault roundtrips
- **Regressions:** Zero test failures in Phase 7

See full details in [TESTING_PHASE_7_MAX_COVERAGE_SCOPE.md](./TESTING_PHASE_7_MAX_COVERAGE_SCOPE.md).

## Pre-Commit Checklist

Before pushing:

1. ✅ `corepack pnpm validate:all` passes
2. ✅ `corepack pnpm test:e2e:all` passes
3. ✅ No `console.log` in production code
4. ✅ Bundle size reasonable (~2-3MB)
5. ✅ Documentation updated if contracts changed

Or run: `corepack pnpm validate:all && corepack pnpm test:e2e:all`
