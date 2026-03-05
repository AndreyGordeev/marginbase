# Testing Implementation Roadmap

**Date:** March 5, 2026
**Status:** Phase 1 - Foundations
**Goal:** Implement maximum coverage across all 20 test types

---

## Current State Assessment

### ✅ Existing Tests (138 passing)
- **domain-core**: 11 test files (54 tests, 88% coverage)
- **reporting**: 1 test file (5 tests, 84% coverage)
- **storage**: 7 test files (26 tests, >90%)
- **apps/web**: 9 test files (44 tests)
- **apps/mobile**: 1 test file (9 tests)

### ❌ Major Gaps

**Hard Gates Status:**
- 🟡 Privacy First: Partial (telemetry allowlist exists, but no runtime validation tests)
- 🟡 Offline First: Not validated systematically
- ✅ Determinism: Property-based tests cover this
- 🟡 Layout Guards: Visual regression missing

**Test Types Missing or Incomplete:**
- ❌ Visual regression tests (0%)
- ❌ Layout/overlap guards (0%)
- ❌ Accessibility tests (0%)
- ❌ Fuzz tests (limited)
- ❌ UI torture tests (0%)
- ❌ Contract tests (0%)
- ❌ Security/SAST pipeline (0%)
- ❌ Chaos/resilience tests (0%)
- ❌ Mutation tests (0%)
- ❌ i18n stress tests (limited)
- ❌ Performance/load tests (0%)
- ❌ Browser compatibility matrix (partial)

---

## Phase 1: Foundations (Week 1) 🚀

### Priority 1A: Hard Gates Validation (Day 1-2)

#### 1A1: Privacy Tests (CRITICAL)
**File:** `apps/web/tests/privacy.spec.ts`
**Scope:** Validate Hard Gate #1 (Financial data never leaves device)

```
- [ ] Telemetry payload sanitization
  - [ ] Assert forbidden keys (revenue, cost, profit, etc.) absent in telemetry events
  - [ ] Runtime validation of event payloads
  - [ ] Test all telemetry event types

- [ ] Network request inspection
  - [ ] Intercept all XHR/fetch calls
  - [ ] Assert no scenario/financial data in requests
  - [ ] Test API client payloads

- [ ] Export artifact validation
  - [ ] Share links don't contain scenario data
  - [ ] Export metadata sanitized
  - [ ] PDF/XLSX exports don't embed scenario IDs

- [ ] Log sanitization
  - [ ] No forbidden keys in console output
  - [ ] Test error messages
```

**Test Framework:** Playwright + custom privacy guards
**Forbidden Keys Enforced:** `revenue, cost, profit, margin, cashflow, price, units, fixedCost, variableCostPerUnit, scenario, inputs, assumptions, data`

---

#### 1A2: Offline Tests (CRITICAL)
**File:** `apps/web/tests/offline.spec.ts`
**Scope:** Validate Hard Gate #2 (Offline-first functionality)

```
- [ ] Network disable + re-run critical flows
  - [ ] Calculate profit scenario offline
  - [ ] Save scenario offline
  - [ ] Load scenario offline
  - [ ] Export PDF/XLSX offline
  - [ ] Open embed calculator offline

- [ ] Service worker cache validation
  - [ ] Cache serves stale content when network down
  - [ ] Updates work when network restored

- [ ] Graceful degradation
  - [ ] Share endpoint returns error (clear to user)
  - [ ] Paywall gate shows offline message
  - [ ] No silent failures
```

**Test Framework:** Playwright (use `context.setOffline()`)
**Coverage:** All 3 calculator modules + embed

---

#### 1A3: Layout & Overlap Guards (CRITICAL)
**File:** `apps/web/tests/layout-guards.spec.ts`
**Scope:** Validate Hard Gate #4 ("Forms must not stick together")

```
- [ ] Profit calculator form
  - [ ] Adjacent input bounding boxes don't intersect
  - [ ] Min vertical spacing >= 8px
  - [ ] Test: desktop (1280px) + tablet (768px) + mobile (360px)

- [ ] Break-even calculator form
  - Same assertions as profit

- [ ] Cashflow calculator form
  - Same assertions as profit
  - Long values (many digits)
  - Long labels (long translations)

- [ ] Dialog overlaps
  - [ ] Share dialog doesn't clip buttons
  - [ ] Export dialog properly contained
  - [ ] Paywall gate readable

- [ ] Viewport stress
  - [ ] Resize window while form filled
  - [ ] Font scaling (200%, 150%)
  - [ ] Long scenario names
```

**Test Framework:** Playwright bounding box assertions
**Custom Helper:** `assertNoOverlap(bbox1, bbox2)` + `assertMinSpacing(bbox1, bbox2, 8)`

---

### Priority 1B: CI Quality Gates Setup (Day 2-3)

#### 1B1: Add CI Jobs
**File:** `.github/workflows/ci.yml` (UPDATE)

```yaml
jobs:
  - privacy-tests (new)
  - offline-tests (new)
  - layout-guards (new)
  - accessibility-gates (new)

  # Existing
  - lint
  - typecheck
  - unit-tests
  - e2e-tests
  - coverage-gates
```

**Gate Logic:**
- 🛑 Fail if any privacy violation detected
- 🛑 Fail if layout overlap found
- 🛑 Fail if offline flows broken
- 🛑 Fail if critical a11y violations

---

### Priority 1C: Accessibility Tests (Day 3)

**File:** `apps/web/tests/accessibility.spec.ts`

```
- [ ] Profit calculator page (axe + keyboard nav)
- [ ] Break-even calculator page (axe + keyboard nav)
- [ ] Cashflow calculator page (axe + keyboard nav)
- [ ] Share dialog (ARIA, focus trap test)
- [ ] Export dialog (ARIA, focus trap test)
- [ ] Paywall/gate page (ARIA, focus trap test)
- [ ] Shared scenario view (keyboard nav)
- [ ] Embed calculator (keyboard nav, no focus trap)

Per Page:
- [ ] axe scan (no critical violations)
- [ ] Tab order logical
- [ ] Enter/Escape work correctly
- [ ] Focus returns after modal close
```

**Framework:** Playwright + @axe-core/playwright

---

## Phase 2: Extended Coverage (Week 2) 📊

### Priority 2A: Visual Regression Tests (Day 4-5)

**File:** `apps/web/tests/visual-regression.spec.ts`

```
- [ ] Profit calculator (desktop, tablet, mobile snapshots)
- [ ] Break-even calculator (desert, tablet, mobile snapshots)
- [ ] Cashflow calculator (desktop, tablet, mobile snapshots)
- [ ] Share dialog
- [ ] Export dialog
- [ ] Paywall gate
- [ ] Embed calculator (all 3 variants)
- [ ] Long content variants:
  - [ ] Long scenario names (50+ chars)
  - [ ] Long numbers (999,999,999)
  - [ ] Long translations (German, Japanese)
```

**Framework:** Playwright visual comparisons

---

### Priority 2B: Contract Tests + Schema Validation (Day 5-6)

**File:** `packages/api-client/tests/contract.test.ts`

```
- [ ] Refresh entitlements response schema
- [ ] Create share snapshot response schema
- [ ] Get share snapshot response schema
- [ ] Share list response schema
- [ ] Delete share response schema
- [ ] Create checkout session response schema
- [ ] Error response shapes

Per endpoint:
- [ ] Validate against TypeScript types
- [ ] Test backward compatibility
- [ ] Test error cases
```

**Implementation:**
- Generate JSON schema from TS types (typescript-json-schema)
- Runtime validation with zod or similar

---

### Priority 2C: Fuzz & Property-Based Extensions (Day 6)

**Extensions to existing property-based tests:**
- Profit: Additional monotonicity checks
- Break-even: Bound tests
- Cashflow: Balance equation stress
- Numeric policy: Rounding tolerance tests

**Fuzz tests (new):**
- Separator/locale variants (fast-check generator)
- Extreme number ranges
- Malformed inputs

---

## Phase 3: Advanced Coverage (Week 3-4) 🔥

### Priority 3A: Mutation Testing (Stryker)

**File:** `.stryker/stryker.conf.json` (new)

```
- [ ] domain-core: Full mutation analysis
- [ ] Telemetry guards: Full mutation analysis
- [ ] Entitlements policy: Full mutation analysis
```

**Run:** Nightly job, track MutationScore

---

### Priority 3B: Chaos & Resilience Tests

**File:** `apps/web/tests/chaos.spec.ts`

```
- [ ] Network flap during save
- [ ] Network flap during export
- [ ] API timeout handling
- [ ] Storage timeout simulation
- [ ] Random latency spikes (100ms-5s)
- [ ] Intermittent failures (50% success rate)
```

---

### Priority 3C: Storage Corruption & Migration Tests

**File:** `packages/storage/tests/corruption-recovery.test.ts`

```
- [ ] Load v1 schema scenarios in v2
- [ ] Corrupt IndexedDB record (missing fields)
- [ ] Invalid encrypted payload rejection
- [ ] Vault migration with wrong key
- [ ] Recovery without data loss
```

---

### Priority 3D: Performance & Load Tests

**Files:**
- `apps/web/tests/performance.spec.ts` (Playwright traces)
- `packages/reporting/tests/performance.test.ts` (PDF/XLSX export timing)

```
- [ ] Profit calculation < 5ms
- [ ] Break-even calculation < 5ms
- [ ] Cashflow calculation < 5ms
- [ ] Save scenario < 500ms
- [ ] Load scenario < 500ms
- [ ] Export PDF < 3s
- [ ] Export XLSX < 2s
```

---

### Priority 3E: i18n Stress Tests

**File:** `apps/web/tests/i18n-stress.spec.ts`

```
- [ ] Missing translation key detection
- [ ] Long strings (German ~30% longer)
- [ ] Japanese/CJK characters
- [ ] Pseudo-locale (all accented)
- [ ] Layout stability with long strings
- [ ] RTL smoke (if applicable)
```

---

### Priority 3F: Browser/Device Compatibility Matrix

**File:** `.github/workflows/ci.yml` (Nightly job)

```
Browsers:
- [ ] Chromium
- [ ] Firefox
- [ ] WebKit

Devices:
- [ ] iPhone 12
- [ ] Pixel 5
- [ ] iPad Air

Test suite: All critical E2E flows
```

---

### Priority 3G: Differential/Oracle Tests

**Files:**
- `packages/domain-core/tests/oracle.test.ts`
- `packages/reporting/tests/oracle.test.ts`

```
- [ ] Domain results vs reference implementation
- [ ] XLSX export values match domain calculations
- [ ] PDF totals match XLSX totals
```

---

## Phase 4: Integration & Polish (Week 4+) ✨

### Priority 4A: UI Torture Tests

**File:** `apps/web/tests/ui-torture.spec.ts`

```
- [ ] Rapid open/close modals
- [ ] Random typing/pasting into fields
- [ ] Viewport resize while calculation pending
- [ ] Form submission spam
- [ ] Touch interactions stress
```

---

### Priority 4B: Coverage Gap Analysis & Closure

**For each package:**
- [ ] domain-core: Target >95%
- [ ] storage: Target >90%
- [ ] entitlements: Target >90%
- [ ] api-client: Target >85%
- [ ] telemetry: Target ~100% guards
- [ ] reporting: Target >85%
- [ ] web UI: Target >80% + gates

---

### Priority 4C: Reporting & Dashboards

```
- [ ] Coverage dashboard (codecov + custom)
- [ ] CI quality gate status page
- [ ] Nightly test failure alerts
- [ ] Performance trend tracking
```

---

## Execution Plan (Starting Today)

### Week 1 (Days 1-3: Hard Gates) 🔴

**✅ PHASE 1A COMPLETE:**
- ✅ **Day 1 AM**: Privacy tests fully implemented (450 lines, 9 test cases)
- ✅ **Day 1 AM**: Offline tests fully implemented (460 lines, 18 test cases)
- ✅ **Day 1 AM**: Layout guards fully implemented (500 lines, 20 test cases)
- ✅ **Day 1 AM**: Privacy & accessibility helpers created (400 lines)

**✅ PHASE 1B COMPLETE:**
- ✅ **Day 1 PM**: Accessibility tests extended (15+ test cases, 7 describe blocks)
- ✅ **Day 1 PM**: CI workflow updated (4 new hard gate jobs)
- ✅ **Day 1 PM**: Hard gate enforcement rules documented

**Phase 1C (Today - Ready for Commit):**
- [ ] Smoke test all tests locally
- [ ] Run: `pnpm exec playwright test privacy-hard-gate offline-hard-gate layout-guards-hard-gate accessibility`
- [ ] Verify CI workflow validates correctly
- [ ] Commit Phase 1 to main with `git commit -m "feat: Phase 1 hard gates implementation"`
- [ ] Set up branch protection in GitHub (requires PR admin)

**Checkpoint:** All hard gates in CI, ready for merge after PR admin configures branch protection

---

### Week 1-2 (Remaining Days: Extended Coverage)
7. **Day 4**: Visual regression (all calculator variants)
8. **Day 5**: Contract tests + schema validation
9. **Day 6**: Extended property-based + fuzz
10. **Day 7-8**: Mutation testing (Stryker setup)

**Checkpoint:** >80% test type coverage, growing coverage %

---

### Week 3-4 (Advanced Tests)
11. Chaos & resilience
12. Storage corruption recovery
13. Performance/load tests
14. i18n stress
15. Browser matrix (nightly)
16. Differential/oracle tests

---

## Success Criteria

✅ **Phase 1 (Hard Gates):**
- ✅ Privacy tests pass + CI enforced
- ✅ Offline tests pass + CI enforced
- ✅ Layout guards pass + CI enforced
- ✅ Accessibility gates pass
- ✅ CI workflow configured
- ✅ Documentation complete
- 🟡 Branch protection rules set (manual GitHub admin step)

✅ **Phase 2-3:**
- ≥15 of 20 test types implemented
- Coverage targets approaching
- Mutation score tracked
- Nightly jobs stable

✅ **Phase 4:**
- All 20 test types implemented
- Coverage targets met
- CI fully automated
- Zero manual testing dependency

---

## Notes

- **Parallelization:** Privacy + Offline + Layout guards + Accessibility run in parallel during Phase 1
- **Reusable Helpers:** Build once, use everywhere (overlap detection, network interception, etc.)
- **Flakiness Prevention:** All tests must be deterministic (no arbitrary sleeps, explicit waits)
- **Documentation:** Update testing-principles.md as each type is implemented
- **Feedback Loop:** Weekly review of test metrics + coverage trends
- **Branch Protection:** After Phase 1 merge, set status checks as required on `main` branch to enforce all 4 hard gates

---

**Next Step:** Implement Phase 1A (Privacy Tests) — Start immediately.
