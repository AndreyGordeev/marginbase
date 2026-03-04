# MarginBase

Offline-first finance toolkit for small business.

## Current Scope (2026-03-04)

- Core calculators: Profit / Margin, Break-even, Cashflow
- Local Business Report export: PDF + XLSX
- Shareable scenario links: encrypted snapshots via `/s/:token#k=<shareKey>`
- Embeddable calculators: `/embed/:calculator` and `/embed/:lang/:calculator`
- UI localization for `en,de,fr,es,pl,it,ru` with language-aware app routing (`/:lang/*` for app pages)

## Architecture Guardrails

- Offline-first by default
- Formulas and schema/migrations only in `packages/domain-core`
- Raw financial scenario values are not sent to cloud
- Sharing is explicit user action; backend stores encrypted snapshot payload only, while decryption key stays in URL fragment (`#k=`)
- Telemetry uses strict allowlist and excludes monetary values

## Workspace

- `apps/web`, `apps/mobile`
- `packages/domain-core`, `packages/storage`, `packages/entitlements`, `packages/telemetry`, `packages/api-client`, `packages/reporting`
- `infra/aws`

See docs/INDEX.md for full documentation.
