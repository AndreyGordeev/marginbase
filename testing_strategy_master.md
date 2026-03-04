# MarginBase — Master Testing Strategy ("No more manual QA")

## Status snapshot (2026-03-04)

- ✅ Phase 1 started: property-based tests (`fast-check`) added in `packages/domain-core/tests/property-based.test.ts`.
- ✅ Coverage execution baseline added for `domain-core` (`test:coverage` + `vitest.config.ts` baseline gate).
- ✅ Added cross-package integration test (`storage + domain-core`) roundtrip in `packages/storage/tests/storage-domain-roundtrip.integration.test.ts`.
- ✅ Telemetry privacy guard tests expanded in `packages/telemetry/tests/telemetry-privacy-guard.test.ts` (forbidden monetary-looking keys, runtime event/shape validation).
- ✅ API contract suite added in `packages/api-client/tests/contract/api-contract.test.ts` (endpoint/method matrix, auth header contracts, error-shape matrix, encrypted share payload contract).
- 🎯 Long-term target unchanged: raise `domain-core` to 95% lines/branches after schema-branch backfill tests.
- ⏭️ Next in sequence: minimal stable Playwright E2E quartet.

Goal: **max confidence without you acting as a human test runner**. We use a layered strategy (test pyramid + contracts + privacy/safety guards) so most failures are caught *before* you open the UI.

---

## 0) What we already have

- `packages/domain-core` already runs **Vitest** unit tests (`profit`, `breakeven`, `cashflow`). ✅

This is the right start (domain-first). Now we make it “industrial grade”.

---

## 1) Test pyramid for MarginBase

### A. Unit / Pure tests (fast, 70–80% of tests)
**Where:** `packages/*` (domain-core, entitlements, telemetry, storage, api-client)

**Why:** Catch regressions in math, policies, guards, and adapters in milliseconds.

**Must-have categories**
- **Domain math correctness** (`domain-core`)
- **Numeric policy invariants** (rounding, minor-units, % bounds)
- **Warnings and edge cases** (zero/negative inputs, insufficient data)
- **Policy engines** (`entitlements`, `telemetry` allowlist/forbidden key guard)
- **Storage repository behavior** (`storage`): schema migrations, repo semantics, encryption/vault wrapper behavior

### B. Integration tests (medium speed, 15–25%)
**Where:** mostly `packages/storage`, `apps/web` services

**Why:** Validate that multiple components work together (e.g., repository + migration + serialization + numeric policy).

Examples
- `storage` + `domain-core` scenario roundtrip (save → load → compute → export)
- IndexedDB/Dexie with `fake-indexeddb`
- WebVault AES-GCM encrypt/decrypt with known vectors + corrupted payload tests

### C. Contract tests (medium speed, few but critical)
**Where:** `packages/api-client` and backend endpoints

**Why:** Prevent “frontend expects A, backend returns B” issues.

Examples
- Validate client against **OpenAPI** (recommended) or Pact-style consumer contracts
- Verify error shapes (401/403/429/5xx) and entitlements payload stability

### D. UI tests (small number, high value)
**Component tests** (Vitest + Testing Library) for key UI logic.

### E. E2E tests (few, but cover business-critical flows)
**Tool:** Playwright

Flows
- Auth → Dashboard → Profit calculator compute
- Subscription gate (soft gate / hard gate) behavior
- Import/Export (local) and “no scenario values in telemetry” invariant

### F. Non-functional automated checks
- **Accessibility**: axe checks on key screens
- **Visual regression**: Playwright screenshots for calculator layouts (stable viewport)
- **Privacy/security**: assert telemetry payload never includes forbidden keys and scenario values

---

## 2) “Definition of Done” for features

Every feature PR must include:

1) **Domain-core tests** for the new/changed math/policy.
2) **At least one integration test** if storage/API/UI wiring changed.
3) **If an endpoint is touched** → contract test update.
4) **If UI screen logic changed** → component test OR E2E assertion.
5) **No increase in forbidden telemetry keys** (guard tests must pass).

---

## 3) Concrete coverage targets (realistic and enforceable)

Not all code deserves the same coverage. We enforce where it matters.

### Coverage thresholds (suggested)
- `packages/domain-core`: **95% lines / 95% branches**
- `packages/entitlements`: **95%**
- `packages/telemetry`: **95%** (guards are critical)
- `packages/storage`: **85%** (harder due to adapters)
- `apps/web`: **70%** (UI is best covered by E2E + a few components)

Also add **mutation testing** later for domain-core (optional but very powerful): StrykerJS.

---

## 4) Upgrades we should implement next (ordered, highest ROI first)

### 4.1 Property-based tests for domain-core (fast-check)
Why: calculators are math-heavy; example-based tests miss weird corners.

Add tests like:
- Profit:
  - `revenueTotalMinor >= 0`
  - `grossProfit = revenue - variableCost`
  - `netProfit = grossProfit - fixedCosts`
  - Percent metrics are `null` when denominator is 0
  - Contribution margin % stays within [-1, 1] (or whatever your policy defines)

- Break-even:
  - If `unitContribution <= 0` → break-even is `null` and warning present
  - If `fixedCosts == 0` and contribution positive → break-even qty is 0

- Cashflow:
  - Projection length equals `forecastMonths`
  - `finalBalanceMinor` equals last month balance
  - If starting cash 0 and costs>revenue → runwayMonth is 1

### 4.2 Storage adapter integration tests
- Use `fake-indexeddb` to run Dexie in CI
- Cover migrations: v1 → v2 (and future) with golden fixtures

### 4.3 Telemetry “forbidden monetary key guard” tests
We already have a strict allowlist concept—tests must guarantee:
- Anything that looks like scenario values is blocked
- Payload is stable and minimal

### 4.4 Contract tests for backend (OpenAPI-first)
Recommended approach:
- Keep an `openapi.yaml` (or generated) describing `/auth/verify`, `/entitlements`, `/telemetry/batch`, `/billing/verify`, `/account/delete`
- Client tests validate that:
  - responses match schema
  - errors match schema

---

## 5) Tooling plan (TS/PNPM/Vitest + Playwright)

### Unit + integration: Vitest
- Use workspace-level Vitest config or per-package config.
- Use `--coverage` with `@vitest/coverage-v8`.

### E2E: Playwright
- Run `apps/web` in preview mode (or `vite dev` with fixed port)
- Use test user / mocked auth if possible

### Component tests for web
- `@testing-library/react` + `@testing-library/user-event` + `jsdom`

### Accessibility
- `@axe-core/playwright`

### Visual regression
- Playwright snapshot testing on key screens with deterministic data.

---

## 6) CI pipeline (GitHub Actions) — required checks

**PR required checks**
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (unit + integration)
- `pnpm --filter @marginbase/web test:e2e` (Playwright) — can be "required" once stable
- Coverage thresholds enforced

**Nightly** (optional but ideal)
- Full E2E suite
- Mutation tests (domain-core)

---

## 7) Minimal E2E suite (so it stays stable)

Keep E2E small but deadly:

1) **Profit compute**: open calculator → enter numbers → verify output.
2) **Soft gate**: locked module shows expected paywall/CTA.
3) **Import/Export**: export scenario → clear storage → import → values restored.
4) **Telemetry privacy**: action that emits telemetry → intercept network → assert forbidden keys absent.

Everything else should be caught by unit/integration.

---

## 8) “Next commit” checklist (what we implement immediately)

1) Add root dev deps:
   - `@vitest/coverage-v8`
   - `fast-check`
   - `@playwright/test`
   - `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
   - `fake-indexeddb`
   - `@axe-core/playwright`

2) Add scripts:
   - root: `test:unit`, `test:coverage`, `test:e2e`
   - web: `test`, `test:e2e`

3) Add Playwright config (workspace) + first 4 E2E tests.

4) Enforce coverage thresholds for the critical packages.

---

## Appendix A — Where tests should live

- `packages/domain-core/tests/*.test.ts`
- `packages/entitlements/tests/*.test.ts`
- `packages/telemetry/tests/*.test.ts`
- `packages/storage/tests/unit/*.test.ts`
- `packages/storage/tests/integration/*.test.ts`
- `packages/api-client/tests/contract/*.test.ts`
- `apps/web/tests/components/*.test.tsx`
- `apps/web/tests/e2e/*.spec.ts`

---

## Appendix B — Philosophy (so it stays sane)

- **Domain math must be close to perfect** (unit + property tests).
- **Adapters are tricky** → integration tests.
- **UI is for flows** → small E2E suite + a few component tests.
- **Privacy is non-negotiable** → dedicated guard tests + E2E interception.

