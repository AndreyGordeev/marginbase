# MarginBase --- Testing Residual Gaps Remediation

## Goal

Complete the remaining testing gaps so that the MarginBase project fully
satisfies the testing rule:

> Implement maximum feasible coverage across all modern testing
> categories (unit, integration, e2e, property-based, fuzz, mutation,
> visual, accessibility, performance, security, chaos, etc.) and enforce
> them via CI quality gates.

This task must be executed **in a single implementation pass**.

Do not ask to split work into phases.\
Do not request confirmation between steps.\
Implement everything described below and then produce a summary.

------------------------------------------------------------------------

# Current Context

The repository already includes strong coverage in:

-   unit tests
-   integration tests
-   e2e tests
-   property-based tests
-   fuzz tests
-   visual regression
-   layout guard tests
-   accessibility tests
-   performance tests
-   chaos tests
-   i18n tests
-   storage/migration tests
-   contract tests
-   mobile offline tests
-   CI coverage gates

Remaining gaps are:

1.  Mutation testing not fully integrated
2.  Security scanning not enforced as CI gate
3.  No DAST baseline
4.  Browser/device matrix not formalized
5.  Component-level UI tests incomplete
6.  Negative-path depth for auth/billing
7.  CI testing policy not codified as Definition of Done

------------------------------------------------------------------------

# Tasks

## 1. Mutation Testing Integration

Use **Stryker**.

Scope:

packages/domain-core\
packages/entitlements\
packages/backend-server

Requirements:

-   enable mutation testing config
-   set mutation score threshold (example: 60--70%)
-   add CI job
-   mutation job must fail pipeline if threshold not met
-   document exclusions where mutation is not meaningful

Deliverables:

-   stryker.config.\*
-   mutation CI job
-   mutation score threshold
-   mutation test documentation

------------------------------------------------------------------------

# 2. Security Scanning as CI Hard Gate

Enable real security scanning.

Tools allowed:

-   Semgrep
-   dependency audit
-   optional CodeQL

Requirements:

-   remove `continue-on-error` for security scans
-   fail CI for:
    -   critical vulnerabilities
    -   high vulnerabilities
-   ensure scans run on every PR and main branch

Deliverables:

-   `.github/workflows/security.yml`
-   Semgrep configuration
-   dependency audit job
-   documentation of security gates

------------------------------------------------------------------------

# 3. DAST Baseline

Introduce a lightweight dynamic security scan against the running app.

Use one of:

-   OWASP ZAP baseline
-   similar automated scanner

Targets:

/auth/\*\
/billing/\*\
/entitlements/\*\
/api/\*

Check for:

-   missing security headers
-   obvious injection vectors
-   open redirect
-   insecure responses
-   CORS misconfiguration

Requirements:

-   run scan against locally started test server
-   integrate into CI
-   produce machine-readable report

Deliverables:

-   DAST CI job
-   baseline scan config
-   report artifact

------------------------------------------------------------------------

# 4. Browser / Device Matrix

Formalize test matrix for Playwright.

Required browsers:

-   Chromium
-   Firefox
-   WebKit

Required viewport/device classes:

-   desktop
-   tablet
-   mobile-small
-   mobile-large

Requirements:

-   configure matrix in CI
-   run critical E2E tests across matrix
-   ensure layout tests run at least for mobile + desktop

Deliverables:

-   Playwright matrix configuration
-   CI matrix execution
-   test documentation

------------------------------------------------------------------------

# 5. Component-Level UI Tests

Add component tests for critical UI modules.

Web:

-   login widget
-   calculator forms
-   scenario list/editor
-   settings screen
-   consent UI

Mobile:

-   calculator editors
-   offline storage UI
-   navigation flows

Use appropriate component test framework for the current stack.

Requirements:

-   isolate UI modules
-   verify rendering and interaction logic
-   keep tests fast and deterministic

Deliverables:

-   component test suite
-   test helpers
-   component coverage

------------------------------------------------------------------------

# 6. Auth/Billing Negative Path Expansion

Increase failure-path coverage.

Add tests for:

Auth:

-   invalid token
-   expired token
-   tampered token
-   missing token
-   revoked session
-   missing env config

Billing:

-   malformed webhook payload
-   duplicate webhook delivery
-   provider failure
-   missing env config
-   price mismatch
-   receipt verification failure

Entitlements:

-   expired trial
-   invalid userId
-   storage corruption
-   concurrent entitlement updates

Requirements:

-   verify correct HTTP responses
-   ensure idempotency where required
-   verify no sensitive data leakage

------------------------------------------------------------------------

# 7. CI Testing Policy (Definition of Done)

Create a formal testing policy document.

File:

docs/testing/Testing_DoD.md

Define mandatory gates:

-   unit tests
-   integration tests
-   e2e smoke
-   mutation threshold
-   security scans
-   DAST baseline
-   coverage minimum
-   visual regression
-   accessibility tests

Ensure CI reflects these gates.

------------------------------------------------------------------------

# Implementation Constraints

Do not:

-   ask whether to proceed to next step
-   split this work into phases
-   produce placeholders without implementation

Instead:

-   implement all tasks
-   modify CI
-   add tests
-   update documentation

------------------------------------------------------------------------

# Definition of Done

All tasks implemented and verified.

CI pipeline includes:

-   unit
-   integration
-   e2e
-   mutation
-   security scan
-   DAST
-   coverage
-   visual/layout
-   accessibility
-   matrix execution

Pipeline must fail when quality gates are violated.

------------------------------------------------------------------------

# Final Output

After implementation provide a summary including:

1.  files created/modified
2.  CI jobs added
3.  mutation threshold
4.  security gates configured
5.  DAST scanner used
6.  browser/device matrix implemented
7.  new test counts by category
