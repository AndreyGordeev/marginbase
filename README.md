# MarginBase

Offline-first finance toolkit for small business.

[![Tests](https://img.shields.io/badge/tests-400%2B%20passing-brightgreen)]() [![Coverage](https://img.shields.io/badge/coverage-98%25%20branches-brightgreen)]() [![Phase 7](https://img.shields.io/badge/Phase%207-COMPLETE-success)]()  

## Current Scope (2026-03-06 — Phase 7 Complete)

- Core calculators: Profit / Margin, Break-even, Cashflow
- Local Business Report export: PDF + XLSX
- Shareable scenario links: encrypted snapshots via `/s/:token#k=<shareKey>`
- Embeddable calculators: `/embed/:calculator` and `/embed/:lang/:calculator`
- UI localization for `en,de,fr,es,pl,it,ru` with language-aware app routing (`/:lang/*` for app pages)

## Quick Start

```bash
# Install dependencies
corepack pnpm install

# Development
corepack pnpm boot:web      # Start web app at http://127.0.0.1:4173

# Full validation (CI-equivalent)
corepack pnpm validate:all  # lint + typecheck + i18n + test + coverage
corepack pnpm test:e2e:all  # E2E across Chromium, Firefox, WebKit
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for complete development guide.

## Architecture Guardrails

- **Offline-first** by default
- **Formulas** and schema/migrations only in `packages/domain-core`
- **Raw financial scenario values** are not sent to cloud
- **Sharing** is explicit user action; backend stores encrypted snapshot payload only, while decryption key stays in URL fragment (`#k=`)
- **Telemetry** uses strict allowlist and excludes monetary values

## Workspace Structure

```
apps/
  web/          - React + Vite + TailwindCSS web application
  mobile/       - Mobile app (future)

packages/
  domain-core/  - Pure business logic + formulas (no I/O)
  storage/      - IndexedDB (web) + SQLite (mobile) adapters
  entitlements/ - Subscription + offline grace period logic
  telemetry/    - Event queue with allowlist enforcement
  api-client/   - Typed HTTP client for backend
  reporting/    - PDF + XLSX export logic

infra/
  aws/          - Terraform for Lambda + DynamoDB + CloudFront
```

## Testing & Coverage (Phase 7: Maximum Optimization)

**Coverage Metrics:**
- `packages/domain-core`: **100% branches** (186 tests) ✅
- `packages/reporting`: **100% branches** (105 tests) ✅
- `packages/storage`: **98.26% branches** (44 tests) ✅
- **Workspace total**: 400+ tests with zero regressions

**Test Types:**
- Unit tests: Deterministic + edge-case focused
- Integration tests: Real persistence + crypto roundtrips
- Property-based: 1000+ runs per invariant (fast-check)
- Stress tests: Large data, performance, special characters
- Visual regression: Screenshot comparison via Playwright

**I/O Gates (Hard Blocks):**
- ✅ Lint: All packages pass
- ✅ TypeCheck: Strict mode across workspace
- ✅ i18n Parity: All locales verified
- ✅ Coverage: All targets exceeded by 3-8%
- ✅ E2E: 54+ tests across 3 browsers

See [TESTING_PHASE_7_MAX_COVERAGE_SCOPE.md](TESTING_PHASE_7_MAX_COVERAGE_SCOPE.md) for complete Phase 7 results.

## Documentation

- [docs/INDEX.md](docs/INDEX.md) - Documentation index
- [docs/architecture/overview.md](docs/architecture/overview.md) - System architecture
- [docs/architecture/logical.md](docs/architecture/logical.md) - Component diagram
- [docs/decisions/adr.md](docs/decisions/adr.md) - Architecture decision records
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) - Project context (primary source of truth)
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide

## License

Proprietary. All rights reserved.
