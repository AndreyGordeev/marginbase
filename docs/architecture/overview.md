# MarginBase Architecture Overview (v1)
Date: 2026-03-04  |  Scope: Web + iOS + Android (offline-first, minimal backend)

## Decisions locked
- Data: scenarios stored locally-first; cloud sync is out of V1 scope.
- Telemetry: minimal and allowlist-based, privacy-first.
- Entitlements: cached locally to support offline usage; backend used for refresh.
- Mobile data security: encrypt local scenario storage using platform keystore-managed key.
- Localization: UI-only i18n in web app with supported languages `en,de,fr,es,pl,it,ru`.
- Canonical routing/i18n decision reference: `ADR-013` in `docs/decisions/adr.md`.

## Current delivered web capabilities
- Localized application UI across login, dashboard, workspace, subscription, settings, data/backup, reports, legal navigation, and result panels.
- Language-aware app routes (`/:lang/*`) with detection/canonicalization for non-localized app routes.
- Share snapshot route support (`/s/:token`) and embed calculators (`/embed/profit`, `/embed/breakeven`, `/embed/cashflow`).
- Embed UI texts localized via shared translation keys.

## Recommended defaults
- Entitlement cache TTL (offline grace): 72 hours since last successful verification. After that: keep dashboard accessible, lock modules, allow export.
- Entitlement refresh cadence: at app start (if online) + once per 24h in background when online.
- Import behavior in V1: Replace-all only (explicit warning + confirmation).
