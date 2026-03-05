# MarginBase Testing Principles & Architecture

## Overview

MarginBase implements **maximum practical coverage across ALL test types**, eliminating manual testing as a dependency and preventing regressions.

**This document is the architectural baseline for the testing strategy.**

---

## Part A: Hard Gates (Non-Negotiable)

### A1. Privacy First 🔒

**Financial scenario values must NEVER leave the device.**

#### What This Means
- Telemetry payloads: ❌ No financial data
- API requests: ❌ No scenario values
- Shared artifacts: ❌ No sensitive identifiers
- Logs: ❌ No money-like fields

#### Forbidden Keys
```
revenue, cost, profit, margin, cashflow, price, units, fixedCost,
variableCostPerUnit, scenario, inputs, assumptions, data
```

#### Test Strategy
**Every test must verify:**
- Telemetry event payloads don't contain forbidden keys
- Network requests (API calls) don't leak scenario data
- Export/share payloads sanitized correctly
- Logs scrubbed of sensitive fields

---

### A2. Offline First 🌐

**The app remains fully usable without network.**

#### Critical Flows (Must Work Offline)
- ✅ Open calculator
- ✅ Enter values & calculate
- ✅ Save scenario to local storage
- ✅ Load scenario from storage
- ✅ Export report (PDF/XLSX)
- ✅ Open embed calculator
- ✅ View cached share snapshot

#### Test Strategy
**Integration & E2E tests must:**
- Disable network, re-run all critical flows
- Verify no crashes or silent data loss
- Check graceful error messages when backend required
- Test service worker cache invalidation

---

### A3. Determinism & Numerical Safety 🔢

**Calculator outputs are deterministic and safe.**

#### Rules
- ❌ No NaN or Infinity
- ❌ No silent overflow
- ❌ Consistent results across runs
- ✅ Bounded by input assumptions
- ✅ Rounding policy explicit

#### Test Strategy
**Unit & property-based tests verify:**
- All calculator functions produce finite, safe numbers
- Rounding rules applied consistently
- Edge cases (zero, negative, tiny decimals, max safe integer) handled correctly
- Property invariants hold across input space

---

### A4. UI Stability & Layout Guards 📐

**"Forms must not stick together" — layout integrity guaranteed.**

#### Rule
Critical regression: **Forms must never overlap, collapse, or become unusable.**

#### Test Strategy
**Playwright layout guards verify:**
- Adjacent input bounding boxes do NOT intersect
- Minimum vertical spacing ≥ 8px between fields
- No clipped labels or buttons
- No unintended horizontal scroll on standard layouts
- Stability across viewports: mobile (320px) → tablet (768px) → desktop (1280px+)
- Stability under long content (long names, long translations)

---

## Part B: Test Suite Architecture (20 Types)

### B1. Unit Tests (Vitest)
**Coverage: >95% for domain-core**

Focus Areas:
- ✅ Calculator functions (profit, break-even, cashflow)
- ✅ Numeric policy (rounding, formatting)
- ✅ Edge cases (zero, negative, large numbers)
- ✅ Deterministic outputs
- ✅ Regression tests for known bugs

### B2. Integration Tests (Vitest)
**Coverage: >90% for storage, entitlements, reporting**

Focus Areas:
- ✅ IndexedDB end-to-end (CRUD operations)
- ✅ Vault encryption/decryption + wrong key rejection
- ✅ Entitlements refresh + offline grace period
- ✅ Reporting pipeline (scenario → report → PDF/XLSX bytes)

### B3. Component Tests (Vitest + Testing Library)
**Coverage: >80% for web UI components**

Focus Areas:
- ✅ Calculator forms (input behavior, validation)
- ✅ Dialogs (share, export, paywall)
- ✅ Input formatting under typing/paste
- ✅ Loading, empty, error states

### B4. End-to-End Tests (Playwright)
**Coverage: All critical user flows**

Critical Flows:
1. Open calculator
2. Enter values → Calculate
3. Save scenario
4. Reload scenario from storage
5. Export PDF/XLSX
6. Create share link
7. Open shared view
8. Open embed calculator
9. Paywall/upgrade flow (where applicable)
10. Offline variants (disable network, re-run flows)

### B5. Visual Regression Tests (Playwright)
**Coverage: All calculator pages, dialogs, embed pages**

Snapshots Required:
- ✅ Desktop / Tablet / Mobile viewports
- ✅ Each calculator page (profit, break-even, cashflow)
- ✅ Share, export, paywall dialogs
- ✅ Embed pages
- ✅ Long content variants (long names, numbers)

### B6. Layout & Overlap Guards (Playwright)
**Coverage: Enforce "forms must not stick together"**

Geometric Assertions:
- ✅ Key input bounding boxes don't intersect
- ✅ Min vertical spacing ≥ 8px
- ✅ No clipped labels/buttons
- ✅ No horizontal scroll on standard layouts
- ✅ All viewports: mobile → tablet → desktop

### B7. Accessibility Tests (Playwright + axe)
**Coverage: WCAG 2.1 Level AA minimum**

Focus Areas:
- ✅ No critical axe violations on key pages
- ✅ Keyboard navigation works
- ✅ Focus order logical
- ✅ ARIA on dialogs correct
- ✅ Focus returns after modal close

### B8. Property-Based Tests (fast-check)
**Coverage: Domain invariants**

Invariants to Verify:
- ✅ Profit = Revenue - Cost
- ✅ Margin = Profit / Revenue (when Revenue ≠ 0)
- ✅ Break-even units ≥ 0
- ✅ Monotonicity (higher price → higher profit)
- ✅ Cashflow balance equation holds

Run: 1k–10k cases per property.

### B9. Fuzz Tests (fast-check)
**Coverage: Adversarial input handling**

Generate Random:
- ✅ Separator/locale variants
- ✅ Extreme ranges (very large, very small)
- ✅ Malformed inputs
- ✅ Rapid typing/pasting

Assertions:
- ✅ Never NaN/Infinity
- ✅ Never crashes
- ✅ Deterministic

### B10. UI Torture Tests (Playwright stress)
**Coverage: Stress and race conditions**

Stress Dimensions:
- ✅ Random viewports (320–1920px)
- ✅ Font scaling
- ✅ Rapid modal open/close
- ✅ Random typing/pasting
- ✅ Resize while modal open

Assertions:
- ✅ No overlap/collapse
- ✅ CTA reachable
- ✅ No focus trap
- ✅ App responsive

### B11. Contract Tests (API & Schemas)
**Coverage: API correctness and stability**

Must Include:
- ✅ Schema validation (responses vs TypeScript types)
- ✅ Backward compatibility checks
- ✅ Error shape validation
- ✅ Share/export payload schema validation

Implementation:
- Generate JSON Schemas from TypeScript types
- Validate runtime responses against schemas
- If OpenAPI exists, validate against it

### B12. Security Tests (SAST/DAST/Dependencies)
**Coverage: Dependency & code security**

CI Steps:
- ✅ Dependency scanning (npm audit + OSV)
- ✅ Static analysis (CodeQL, Semgrep)
- ✅ Secrets scanning (prevent key commits)
- ✅ Basic DAST smoke on previews

Code Tests:
- ✅ No dangerous telemetry fields
- ✅ Sensitive data not in logs
- ✅ Privacy guards intact

### B13. Chaos & Resilience Tests (Playwright/custom)
**Coverage: Failure scenarios**

Failure Injection:
- ✅ Network flaps during save/load/export
- ✅ Artificial latency spikes
- ✅ Random API failures
- ✅ Storage timeouts

Assertions:
- ✅ No crash
- ✅ User can recover
- ✅ No silent data loss

### B14. Storage Corruption & Migration Tests (Vitest)
**Coverage: Data integrity**

Scenarios:
- ✅ Load old schema versions
- ✅ Corrupt IndexedDB records
- ✅ Missing/extra fields
- ✅ Invalid encrypted payloads

Assertions:
- ✅ Graceful recovery or clear error
- ✅ Migrations stable
- ✅ No crash loops

### B15. i18n Stress Tests (Vitest + Playwright)
**Coverage: Internationalization robustness**

Test Cases:
- ✅ Missing translation keys detection (hard fail)
- ✅ Long strings (German, Japanese)
- ✅ Pseudo-locale (accented chars)
- ✅ Layout stability under translated labels
- ✅ RTL smoke test (catch layout assumptions)

### B16. Performance & Load Tests (Playwright/k6)
**Coverage: Speed & scalability**

Guards:
- ✅ Core calculation < 5ms
- ✅ Save/load scenario under limit
- ✅ Export PDF/XLSX under limit

Tools:
- ✅ Playwright performance traces
- ✅ k6 for backend endpoints

### B17. Mutation Testing (Stryker)
**Coverage: Test quality validation**

Purpose: Ensure tests are meaningful (catch bugs).

Run On:
- ✅ domain-core (always)
- ✅ Critical policy (telemetry, entitlements)

Frequency:
- PR: Nightly only (if heavy)
- Gate: No major regression tolerance

### B18. Differential & Oracle Testing (Custom)
**Coverage: Cross-validation**

Verify:
- ✅ Domain results vs independent implementation
- ✅ XLSX export values match domain calculations
- ✅ PDF totals match XLSX totals

### B19. Browser & Device Compatibility (Playwright)
**Coverage: Cross-browser/platform**

Matrix:
- ✅ Chromium, Firefox, WebKit
- ✅ Mobile emulation (iOS, Android)
- ✅ Touch interactions

Assertions:
- ✅ No layout break
- ✅ Inputs usable
- ✅ Export/share stable

### B20. CI Quality Gates & Reporting (GitHub Actions)
**Coverage: Automated enforcement**

PR Checks:
- ✅ Unit/integration/component tests
- ✅ E2E + a11y + layout guards (smoke)
- ✅ Visual regression (critical screens)

Nightly Checks:
- ✅ Chaos tests
- ✅ Mutation tests
- ✅ Large fuzz runs
- ✅ Full browser matrix

Quality Gates:
- ✅ Coverage thresholds enforced
- ✅ No critical a11y violations
- ✅ No privacy violations
- ✅ No overlap/collapse detected
- ✅ No forbidden telemetry keys

Artifacts:
- ✅ Playwright HTML report
- ✅ Screenshots + diffs
- ✅ Coverage reports
- ✅ Performance traces

---

## Part C: Coverage Targets

| Package | Target | Priority |
|---------|--------|----------|
| domain-core | >95% | 🔴 CRITICAL |
| storage | >90% | 🔴 CRITICAL |
| entitlements | >90% | 🔴 CRITICAL |
| api-client | >85% | 🔴 CRITICAL |
| telemetry | ~100% guards | 🔴 CRITICAL |
| reporting | >85% | 🟡 HIGH |
| web UI | >80% + gates | 🟡 HIGH |
| mobile | smoke + offline | 🟡 HIGH |

---

## Part D: Definition of Done (Testing)

A change is "done" only if:

- ✅ All PR test suites pass
- ✅ Privacy/offline/layout hard gates pass
- ✅ Coverage gates pass
- ✅ No regressions in visual diffs (or explicitly approved)
- ✅ Heavy suites scheduled & tracked (nightly)
- ✅ Alerts on nightly failure

---

## Implementation Notes

1. **Test Types Are Cumulative**: A single feature needs unit + integration + E2E + visual + accessibility tests.
2. **Hard Gates Are Non-Negotiable**: Privacy, offline, layout must pass every change.
3. **Heavy Suites (Chaos, Mutation) Can Be Nightly**: But must be tracked and gated.
4. **Flakiness Hurts Velocity**: Prefer deterministic waits, explicit conditions, no arbitrary sleeps.
5. **Documentation + Tests = Single Source of Truth**: Update docs when adding new test categories.

---

## Related Documents

- [Architecture Overview](overview.md) — System design
- [Decision Records](../decisions/adr.md) — Key architectural decisions
- [Quality Attributes](quality-attributes.md) — System properties we guard
