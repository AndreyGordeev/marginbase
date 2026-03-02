# SMB Finance Toolkit Architecture (v1)
Date: 2026-02-28  |  Scope: Web + iOS + Android (offline-first, minimal backend)

## Decisions locked
- Data: scenarios stored locally-first; cloud sync is out of V1 scope.
- Telemetry: minimal (crashes + a small set of product events), privacy-first.
- Entitlements: cached locally to support offline usage; backend used for refresh.
- Mobile data security: encrypt local scenario storage using platform keystore-managed key.

## Recommended defaults
- Entitlement cache TTL (offline grace): 72 hours since last successful verification. After that: keep dashboard accessible, lock modules, allow export.
- Entitlement refresh cadence: at app start (if online) + once per 24h in background when online.
- Import behavior in V1: Replace-all only (explicit warning + confirmation).
