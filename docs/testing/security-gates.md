# Security Gates

## Static Security Scanning

Workflow: `.github/workflows/security.yml`

### Semgrep

- Config file: `.semgrep.yml`
- Runs on every PR and on `main`.
- Findings with severity `ERROR` fail CI.
- JSON report is uploaded as artifact.

### Dependency Audit

- Command: `corepack pnpm audit --audit-level high --json`
- Runs on every PR and on `main`.
- Any high/critical vulnerability fails CI.
- Audit output is uploaded as artifact.

## Dynamic Security Scanning (DAST)

Workflow: `.github/workflows/dast.yml`

- Scanner: OWASP ZAP baseline (`ghcr.io/zaproxy/zaproxy:stable`).
- Scans local backend started in CI.
- Baseline targets include auth, billing, entitlements, and account API routes.
- Reports are uploaded as artifacts (`json`, `xml`, `html`, `md`).
