# MarginBase --- MAX-COVERAGE Testing & Automation Master Plan (Copilot Instructions)

This is the **single source of truth** for automated testing in
MarginBase.

**Non-negotiable rule:** unless explicitly told otherwise, GitHub
Copilot must implement the **maximum practical coverage using ALL test
types that exist today**, across the whole repository, without asking
whether a test type is needed.

The goal is to eliminate manual testing as a dependency and prevent
regressions across multiple projects.

------------------------------------------------------------------------

# A. Global Non‑Negotiables

## A1. Privacy First (Hard Gate)

Financial scenario values must **never leave the device**.

Automated tests must verify:

-   telemetry payloads never contain financial values
-   API requests never contain scenario values
-   exported/shared artifacts do not leak identifiers or sensitive
    fields

**Forbidden keys** (examples; extend by scanning domain schema + numeric
fields):\
`revenue, cost, profit, margin, cashflow, price, units, fixedCost, variableCost, scenario, inputs, assumptions`

Tests must **fail** if any forbidden key/value is observed in: -
telemetry events - network requests - share payloads - logs (where
feasible)

------------------------------------------------------------------------

## A2. Offline‑First (Hard Gate)

The app must remain usable when: - network is disabled - backend fails -
service worker cache is active - storage is slow or temporarily
unavailable

Critical flows must work offline: - calculate - save scenario - load
scenario - export report (PDF/XLSX) - open embed calculator

------------------------------------------------------------------------

## A3. Determinism & Numerical Safety (Hard Gate)

No calculator output may be: - NaN - Infinity - silently overflowed -
inconsistent across runs

------------------------------------------------------------------------

## A4. UI Must Not Break (Hard Gate)

Critical regression rule:

**Forms must never overlap/collapse ("forms must not stick together").**

Automated tests must enforce layout stability across breakpoints and
dynamic content.

------------------------------------------------------------------------

# B. Test Stack (Must Implement All)

Copilot must implement tests across these layers:

1.  **Unit tests**
2.  **Integration tests**
3.  **Component tests**
4.  **End‑to‑End tests**
5.  **Visual regression tests**
6.  **Layout/overlap guards**
7.  **Accessibility tests**
8.  **Property‑based tests**
9.  **Fuzz tests**
10. **UI torture tests**
11. **Contract tests (API & schemas)**
12. **Security tests (SAST/DAST/deps)**
13. **Chaos/resilience tests**
14. **Storage corruption & migration tests**
15. **i18n stress tests**
16. **Performance/load tests**
17. **Mutation tests**
18. **Differential/oracle tests**
19. **Browser/device compatibility tests**
20. **CI quality gates & reporting**

All must be automated and runnable in CI (some as nightly if heavy).

------------------------------------------------------------------------

# C. Repository Targets & Ownership

## C1. Domain

Location: `packages/domain-core`\
Targets: - coverage: **\>95%** (statements/branches where sensible) -
property-based + fuzz mandatory

## C2. Storage

Location: `packages/storage`\
Targets: - coverage: **\>90%** - IndexedDB + vault encryption +
migration tests

## C3. Entitlements

Location: `packages/entitlements`\
Targets: - coverage: **\>90%** - offline grace logic hard-gated

## C4. API Client

Location: `packages/api-client`\
Targets: - coverage: **\>85%** - contract + parsing + error shape tests

## C5. Telemetry

Location: `packages/telemetry`\
Targets: - 100% coverage on allowlist/guards where feasible - strict
privacy enforcement tests

## C6. Reporting

Location: `packages/reporting`\
Targets: - PDF/XLSX correctness + golden checks + schema stability

## C7. Web UI

Location: `apps/web`\
Targets: - coverage: **\>80%** plus E2E/visual/a11y gates for critical
flows

## C8. Mobile Shell

Location: `apps/mobile`\
Targets: - smoke + offline + storage integration (where applicable)

------------------------------------------------------------------------

# D. Test Types (Detailed Requirements)

## D1. Unit Tests (Vitest)

-   calculators: profit, break-even, cashflow
-   numeric policy (rounding, formatting)
-   edge cases: zero, negative, large numbers, tiny decimals
-   deterministic outputs

**Must include explicit regression tests for all known bugs.**

------------------------------------------------------------------------

## D2. Integration Tests

-   storage repositories (IndexedDB/Dexie) end-to-end
-   vault encryption/decryption with wrong key behavior
-   entitlements refresh + caching + offline grace
-   reporting pipeline: scenario -\> report -\> file bytes

------------------------------------------------------------------------

## D3. Component Tests (Testing Library)

-   calculator forms
-   dialogs: share/export/paywall
-   input formatting behavior under typing/paste
-   loading/empty/error states

------------------------------------------------------------------------

## D4. E2E Tests (Playwright)

Critical flows: 1. open calculator 2. enter values 3. compute result 4.
save scenario 5. reload scenario 6. export PDF/XLSX 7. create share link
8. open shared view (where applicable) 9. open embed calculator 10.
upgrade/paywall basic flow (if present)

Offline E2E: - disable network and re-run flows (save/load/export)

Privacy E2E: - intercept network and assert no scenario values

------------------------------------------------------------------------

## D5. Visual Regression Tests (Playwright)

Snapshots required for: - desktop / tablet / mobile - each calculator
page - share/export dialogs - embed pages

Must include long content variants: - long scenario names - long
translation strings - large numbers

------------------------------------------------------------------------

## D6. Layout/Overlap Guards (Playwright bounding boxes)

Implement explicit geometric assertions: - key input bounding boxes do
not intersect - minimum vertical spacing between adjacent fields \>=
**8px** (configurable) - no clipped labels or buttons - no unintended
horizontal scroll on standard layouts

This is the direct fix for "forms stick together".

------------------------------------------------------------------------

## D7. Accessibility (Playwright + axe)

-   no critical violations on key pages
-   keyboard navigation and focus order
-   dialogs accessible with correct ARIA
-   focus returns correctly after modal close

------------------------------------------------------------------------

## D8. Property‑Based Tests (fast-check)

Domain invariants (examples; extend with real schema): - profit =
revenue - cost - margin = profit / revenue (when revenue != 0) -
break-even units \>= 0 (bounded by input assumptions) - monotonicity
checks where applicable (e.g., higher price should not reduce profit in
simplistic models)

Must run enough cases to be meaningful (e.g., 1k--10k).

------------------------------------------------------------------------

## D9. Fuzz Tests (fast-check / custom generators)

Generate random scenarios including: - separators/locales - extreme
ranges - adversarial inputs that try to break formatting/parsing

Assertions: - never NaN/Infinity - never crash - deterministic

------------------------------------------------------------------------

## D10. UI Torture Tests (Playwright stress)

Stress dimensions: - random viewport sizes (320--430, 768--1024,
1280--1920) - font scaling - rapid open/close of dialogs - random
typing/pasting into inputs - resize while modal open

Assertions: - no overlap/collapse - primary CTA reachable - no focus
trap - app stays responsive

------------------------------------------------------------------------

## D11. Contract Tests (API + Schemas)

Must include: - **schema validation** for api-client responses -
backward compatibility checks - error shape tests - share payload schema
validation - export metadata schema validation

Recommended: - generate JSON Schemas from TypeScript types (or maintain
hand-written schemas) - validate runtime responses against schemas

If OpenAPI exists: validate against OpenAPI. If not: create minimal
OpenAPI or schemas for critical endpoints.

------------------------------------------------------------------------

## D12. Security Tests (SAST/DAST/Dependencies)

Must include CI steps + tests for: - dependency scanning (npm audit +
OSV or equivalent) - static analysis (CodeQL and/or Semgrep) - secrets
scanning (prevent committing keys) - basic DAST smoke on deployed
preview (optional; can be nightly)

Also add tests ensuring: - no dangerous telemetry fields - no leaking
sensitive data into logs

------------------------------------------------------------------------

## D13. Chaos / Resilience Tests

Automate failure injection: - network flaps during save/load/export -
artificial latency spikes - random API failures - storage timeouts and
temporary failures

Assertions: - app does not crash - user can recover - no silent data
loss

Run in CI as a separate job; heavy scenarios can be nightly.

------------------------------------------------------------------------

## D14. Storage Corruption & Migration Tests

Create tests that: - load scenarios from older schema versions -
simulate corrupted IndexedDB records - missing fields / extra fields -
invalid encrypted payloads

Assertions: - graceful recovery or clear error - migrations produce
stable results - no crash loops

------------------------------------------------------------------------

## D15. i18n Stress Tests

Must test: - missing translation keys detection (hard fail) - long
strings (German-style), extreme lengths - pseudo-locale (accented) to
catch hardcoded strings - layout stability under translated labels

Optional: - RTL smoke (even if not a target language) to catch layout
assumptions

------------------------------------------------------------------------

## D16. Performance & Load Tests

Performance guards: - core calculation \< **5ms** (or realistic
threshold per device class) - save/load scenario under defined limit -
export PDF/XLSX under defined limit

Add load tests where relevant: - share endpoint usage (if backend is
used) - telemetry batch endpoint (if backend exists)

Tools: - Playwright performance traces - k6 (for backend endpoints) or
equivalent

------------------------------------------------------------------------

## D17. Mutation Testing

Purpose: ensure tests are meaningful.

Tools: - Stryker (JS/TS)

Run at least on: - domain-core - critical policy logic (telemetry
guards, entitlements)

If too heavy for every PR, run nightly and gate merges on "no major
regression".

------------------------------------------------------------------------

## D18. Differential / Oracle Testing

Where possible: - compare domain results against an independent
implementation (e.g., a reference math implementation inside tests) -
verify XLSX export values match domain calculations (oracle =
domain-core) - verify PDF totals match XLSX totals for same scenario

------------------------------------------------------------------------

## D19. Browser / Device Compatibility

Automate Playwright runs across: - Chromium, Firefox, WebKit (where
available) - mobile emulation (at least 1) - touch interactions where
relevant

Assertions: - no layout break - inputs usable - export/share flows
stable

------------------------------------------------------------------------

## D20. CI Quality Gates & Reporting

CI must: - run unit/integration/component tests on every PR - run E2E +
a11y + layout guards on every PR (smoke) - run visual regression on
every PR (critical screens) - run heavy suites nightly: - chaos -
mutation - large fuzz - full browser matrix

Quality gates: - coverage thresholds enforced - no critical a11y
violations - no privacy violations - no overlap/collapse detected - no
forbidden telemetry keys

Artifacts: - Playwright HTML report - screenshots + diffs - coverage
reports - performance traces (optional)

------------------------------------------------------------------------

# E. Copilot Implementation Tasks (Do This Without Questions)

Copilot must:

1.  Scan the repo and locate untested code paths in:
    -   packages/\*
    -   apps/web
    -   apps/mobile
2.  Implement missing test suites for ALL categories above.
3.  Add helpers/utilities for:
    -   overlap detection (bounding boxes)
    -   network interception privacy assertions
    -   random scenario generators (fast-check)
    -   corruption/migration fixtures
4.  Add CI workflows/jobs to run the suite with appropriate split (PR vs
    nightly).
5.  Ensure tests are stable (no flaky timing); prefer deterministic
    waits and explicit conditions.

------------------------------------------------------------------------

# F. Immediate Regression: "Forms stick together" (Must Fix via Tests)

Add Playwright tests that: - open each calculator page - fill inputs
with realistic and large values - assert bounding boxes of adjacent
inputs **do not intersect** - assert min vertical spacing \>= 8px - run
across mobile/tablet/desktop viewports - take snapshots and compare

This must be added even if the UI fix is separate --- the test is the
guardrail.

------------------------------------------------------------------------

# G. Coverage Targets Summary

-   domain-core: \>95%
-   storage: \>90%
-   entitlements: \>90%
-   api-client: \>85%
-   telemetry: as high as feasible; guards effectively 100%
-   web UI: \>80% + E2E/visual/a11y gates

------------------------------------------------------------------------

# H. Definition of Done (Testing)

A change is "done" only if: - all PR suites pass -
privacy/offline/layout hard gates pass - coverage gates pass - no
regressions in visual diffs (or explicitly approved updates) - heavy
suites are scheduled and tracked (nightly) with alerts on failure

------------------------------------------------------------------------

# I. Notes

This plan is intentionally exhaustive. If any category is not applicable
due to platform/tooling limits, Copilot must: - document why - implement
the closest equivalent automated check - keep the hard gates
(privacy/offline/layout) intact
