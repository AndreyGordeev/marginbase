# MarginBase

Offline-first finance toolkit for small business.

[![Tests](https://img.shields.io/badge/tests-255%20passing-brightgreen)]() [![E2E](https://img.shields.io/badge/E2E-102%20tests%20×%203%20browsers-blue)]() [![Coverage](https://img.shields.io/badge/coverage-%3E90%25-brightgreen)]()

## Current Scope (2026-03-04)

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

## Testing

- **255 tests total**: 153 unit/integration + 102 E2E × 3 browsers = 306 validations
- **Property-based testing**: 1000+ runs per invariant using fast-check
- **Visual regression**: Screenshot comparison for critical UI flows
- **CI pipeline**: GitHub Actions with intelligent caching (~8-10min execution)

See [testing_strategy_master.md](testing_strategy_master.md) for complete testing architecture.

## Documentation

- [docs/INDEX.md](docs/INDEX.md) - Documentation index
- [docs/architecture/overview.md](docs/architecture/overview.md) - System architecture
- [docs/architecture/logical.md](docs/architecture/logical.md) - Component diagram
- [docs/decisions/adr.md](docs/decisions/adr.md) - Architecture decision records
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) - Project context (primary source of truth)
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide

## License

Proprietary. All rights reserved.
