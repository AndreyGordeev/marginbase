# Testing Definition of Done

This document codifies mandatory testing gates for every PR and for `main`.
A change is considered done only when all listed gates pass.

## Mandatory CI Gates

1. Unit tests: all package test suites must pass.
2. Integration tests: repository, storage, API integration tests must pass.
3. E2E smoke: critical user flows must pass.
4. Mutation testing: minimum mutation score threshold must be met.
5. Security scans: Semgrep ERROR findings and dependency high/critical vulnerabilities must fail CI.
6. DAST baseline: OWASP ZAP baseline must pass against local running backend.
7. Coverage minimum: configured line/branch thresholds must pass.
8. Visual regression: visual checks run and publish reports.
9. Accessibility tests: WCAG-focused checks must pass.
10. Browser/device matrix: critical E2E flows run across Chromium/Firefox/WebKit and desktop/tablet/mobile classes.

## Mutation Threshold

- `@marginbase/domain-core`: threshold 65, fatal 50
- `@marginbase/entitlements`: threshold 65, fatal 50
- `@marginbase/backend-server`: threshold 65, fatal 50

## Security Gate Policy

- Dependency audit is run with `--audit-level high`.
- Any high/critical vulnerability fails the pipeline.
- Semgrep runs on every PR and `main` push.
- Semgrep findings with severity `ERROR` fail the pipeline.

## DAST Policy

- Scanner: OWASP ZAP baseline.
- Target: local backend runtime on CI.
- Baseline endpoints include auth, billing, entitlements, and API-like account routes.
- Machine-readable artifacts are uploaded (`zap-report.json`, `zap-report.xml`).

## Browser/Device Matrix Policy

- Browsers: Chromium, Firefox, WebKit.
- Device classes: desktop, tablet, mobile-small, mobile-large.
- Critical E2E suite runs across all matrix projects.
- Layout guards must run at least on desktop + mobile.

## Merge Requirement

If any gate above fails, the change is not done and must not be merged.
