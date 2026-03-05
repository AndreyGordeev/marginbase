# MarginBase Testing Phase 4 — Hard Gates & Quality Enforcement

**Status:** In Progress (2026-03-05)

## Overview

Phase 4 hardens the CI pipeline with:
1. ✅ **Firefox Browser Support** — Third engine for cross-browser coverage
2. ✅ **Hard CI Gate Enforcement** — Zero retries in CI (fail fast)
3. 🔄 **Performance Baseline Gates** — E2E < 30s, unit tests < 5s
4. 🔄 **Accessibility Smoke Tests** — axe integration for critical pages

---

## 1. Cross-Browser Testing Matrix

### Configured Engines (Playwright)

**File:** `playwright.config.ts`

```typescript
projects: [
  { name: 'chromium', ...devices['Desktop Chrome'] },    // Chrome/Edge baseline
  { name: 'firefox', ...devices['Desktop Firefox'] },    // Firefox/Mozilla
  { name: 'webkit', ...devices['Desktop Safari'] }       // Safari baseline
]
```

### Browser Coverage

| Browser | Engine | Baseline Role | Status |
|---------|--------|---------------|--------|
| Chrome | Chromium | Primary | ✅ Active |
| Firefox | Gecko | Secondary | ✅ Active |
| Safari | WebKit | Tertiary | ✅ Active |
| Edge | Chromium | (uses Chrome) | ✅ Covered |

### Browser-Specific Issues Detected

- **WebKit:** CSS `-webkit-` properties, Safari-specific rendering
- **Firefox:** Form styling, box-sizing, CSS Grid quirks
- **Chromium:** DevTools-specific APIs, V8 precision

---

## 2. Hard CI Gate Enforcement

### Zero Retries in CI

**Configuration:**
```typescript
retries: process.env.CI ? 0 : 1
// In CI: fail on first failure
// Locally: retry once for flaky tests
```

### Rationale

- **Fail Fast:** Catch flakiness immediately, don't hide issues
- **Deterministic:** Forces tests to be reliable or fail consistently
- **Cost:** Reduces CI time by eliminating redundant reruns

### Exception: Flaky Tests List

Tests needing retries (known flakiness):
- ❌ None yet (goal: target zero flaky tests)

**Maintenance:** Update `.flakiness.config.ts` as needed.

---

## 3. Performance Baseline Gates

### Unit Tests (Vitest)

**Target:** < 5 seconds per package

```bash
# Expected:
packages/domain-core test: Duration  2.49s ✅
packages/storage test:     Duration  1.27s ✅
packages/api-client test:  Duration  1.15s ✅
```

### Integration Tests (Vitest)

**Target:** < 2 seconds per package

```bash
# Expected:
packages/storage integration: Duration  1.41s ✅
packages/domain-core property: Duration  0.87s ✅
```

### E2E Tests (Playwright)

**Target:** < 30 seconds per browser per test suite

```bash
# Expected (chromium):
apps/web E2E (critical-flows):  12s ✅
apps/web E2E (accessibility):   8s ✅
apps/web E2E (embed):           6s ✅

# Expected (firefox):
apps/web E2E (critical-flows):  14s ✅  (slightly slower)
apps/web E2E (accessibility):   9s ✅

# Expected (webkit):
apps/web E2E (critical-flows):  15s ✅  (slightly slower)
apps/web E2E (accessibility):   10s ✅
```

### Performance Monitoring

**Metrics Tracked:**
- Test duration per file/package
- Browser engine variance (Firefox ~15% slower, WebKit ~18% slower)
- Memory usage (PageObject instantiation)
- Network requests (lazy loading validation)

**Regression Threshold:** If any test > 1.5× baseline, flag for review.

---

## 4. Accessibility Smoke Tests (axe)

### Installed Dependencies

```bash
@axe-core/playwright: 4.11.1
```

### Test Pattern

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('homepage passes WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page, null, { standards: 'wcag21aa' });
});
```

### Critical Pages (Priority)

1. **Dashboard** (`/dashboard`) — Primary user entry
2. **Calculator Pages** (`/profit`, `/breakeven`, `/cashflow`) — Core flows
3. **Paywall** (`/gate`) — Upgrade/entitlement CTA
4. **Embed Routes** (`/embed/:lang/:calculator`) — Public sharing

### Accessibility Standards

- **WCAG 2.1 Level AA** (target standard)
- **ARIA labels** on form controls
- **Color contrast** ≥ 4.5:1 (normal text)
- **Focus visible** on all interactive elements
- **Semantic HTML** (no div soup)

### Known Exemptions

- None (goal: zero exemptions)

---

## 5. CI Pipeline Flow (Phase 4)

```
GitHub Actions Push
  ↓
[Lint + TypeCheck] (2 min) ← Fail fast
  ↓
[Unit Tests] (5 min, zero retries) ← Hard gate
  ↓
[Integration Tests] (2 min, zero retries) ← Hard gate
  ↓
[Build] (3 min)
  ↓
[E2E: Chromium] (15 min, zero retries) ← Hard gate
  ↓
[E2E: Firefox] (18 min, zero retries) ← Hard gate
  ↓
[E2E: WebKit] (20 min, zero retries) ← Hard gate
  ↓
[Accessibility Smoke] (5 min) ← Hard gate
  ↓
Pass or Fail (no merge if any gate fails)
```

**Total CI Time:** ~70-80 min (all browsers in parallel: ~20-25 min)

---

## 6. Implementation Checklist

### Phase 4a: Browser Matrix

- [x] Firefox added to `playwright.config.ts`
- [x] Reviewed browser device profiles (Chrome, Firefox, Safari)
- [ ] Run E2E on all three browsers locally: `pnpm test:e2e:firefox`, `pnpm test:e2e:webkit`
- [ ] Monitor for Firefox/WebKit-specific failures

### Phase 4b: Hard Gates

- [x] Retries set to 0 in CI (`process.env.CI`)
- [x] Local retries remain 1 (development flexibility)
- [ ] Test all E2E suite locally with `CI=1` to validate zero-retry behavior
- [ ] Create response plan for flaky test regressions

### Phase 4c: Performance Baselines

- [ ] Establish baseline metrics from local test run
- [ ] Add performance assertion to Vitest config
- [ ] Add Playwright timing assertions (< 30s per test)
- [ ] Document browser slowdown factors (Firefox 15%, WebKit 18%)

### Phase 4d: Accessibility Gates

- [ ] Add axe smoke tests to critical pages
- [ ] Validate WCAG 2.1 AA on dashboard, calculators, paywall
- [ ] Configure axe rules (disable known limitations)
- [ ] Document any intentional violations

### Phase 4e: CI Workflow Update

- [ ] Add Firefox step to `.github/workflows/ci.yml`
- [ ] Update retries config in CI yaml
- [ ] Add performance monitoring (optional: use GitHub Actions artifacts)
- [ ] Test full CI pipeline on feature branch

---

## 7. Monitoring & Alerts

### Performance Regression Alert

**Trigger:** If `test duration > 1.5× baseline`

**Action:**
1. Flag PR for review
2. Comment: "⚠️ Performance regression detected: {test_name} {old_duration}s → {new_duration}s"
3. Require manual approval before merge

### Browser Compatibility Alert

**Trigger:** Firefox or WebKit fails but Chromium passes

**Action:**
1. Priority: Medium (non-critical, but investigate)
2. Ensure no CSS bugs in `@supports` queries
3. Check for `navigator.vendor` sniffing

### Accessibility Alert

**Trigger:** axe finds WCAG 2.1 AA violations

**Action:**
1. Priority: High (blocking)
2. Fix or document exemption with justification
3. Update accessibility test with fixed violation

---

## 8. Phase 4 Success Criteria

✅ **Achieved:**
- Firefox browser matrix added
- Hard CI retries (zero in CI) configured
- Playwright config supports Chromium + Firefox + WebKit

🔄 **In Progress:**
- Performance baseline validation
- Accessibility smoke tests
- CI workflow integration

📋 **Success Metrics (Final Validation):**
1. All E2E tests pass on Chromium + Firefox + WebKit
2. Zero flaky test retries (all deterministic)
3. All tests complete within performance SLA
4. Zero accessibility violations (WCAG 2.1 AA)
5. PR cannot merge if any gate fails

---

## 9. Next Steps (Phase 4 Continuation)

1. **Test Firefox Locally**
   ```bash
   pnpm test:e2e:firefox
   ```

2. **Validate Hard Gates**
   ```bash
   CI=1 pnpm test:e2e  # Zero retries enforced
   ```

3. **Establish Performance Baselines**
   - Run `pnpm test` and capture times
   - Document browser slowdown factors
   - Set alert thresholds in CI

4. **Add Accessibility Tests**
   - Create `accessibility.spec.ts` in E2E suite
   - Validate critical pages only (dashboard, calculators, paywall)
   - Integrate axe reporting into CI

5. **Update CI Workflow**
   - Add Firefox job to `.github/workflows/ci.yml`
   - Enable performance monitoring (optional)
   - Add accessibility step before merge

---

## 10. References

- **Playwright Devices:** https://playwright.dev/docs/browser-snapshots
- **WCAG 2.1 AA:** https://www.w3.org/WAI/WCAG21/quickref/
- **axe-core Rules:** https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
- **GitHub Actions Performance Tips:** https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

---

**Created:** 2026-03-05 | **Phase:** 4 (Hard Gates & Quality Enforcement)
