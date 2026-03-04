# MarginBase — PROJECT_CONTEXT

Date: 2026-03-04

This file is the **primary Copilot anchor**. Keep it short and authoritative.

## Product
MarginBase is an offline-first finance toolkit for SMB with 3 calculators:
- Profit / Margin
- Break-even
- Cashflow forecast

Current scope also includes:
- Local Business Report export (PDF + XLSX)
- Shareable scenario links via encrypted snapshots (`/s/:token#k=<shareKey>`)
- Embeddable stateless calculators (`/embed/:calculator`, `/embed/:lang/:calculator`)

## Non-negotiable Principles
1. **Offline-first:** create/edit/calc/export works fully offline.
2. **Thin backend:** backend is only for auth verification, entitlements, and telemetry ingest.
3. **No raw scenario values in cloud:** scenario numeric values are local-only by default; only explicit user-initiated share snapshots are allowed server-side, and only as encrypted payloads (TTL + owner metadata).
4. **Shared domain-core:** all formulas + schema + migrations live in `packages/domain-core` as pure functions.
5. **Numeric safety:** money uses minor units (e.g., cents) + explicit rounding; never float-math for money.
6. **EU-first hosting:** AWS resources in an EU region.
7. **Security:** mobile local DB encrypted at rest (SQLite + SQLCipher); secrets in Keychain/Keystore.
8. **Web Local Vault:** optional passphrase-based encryption for local data, available to **all paid users**.

## Hard Rules for Code Generation
- UI must not implement formulas.
- UI must not access DB directly (use repositories).
- Telemetry must not include monetary values.
- Telemetry event names/properties must stay in allowlist (including embed analytics without financial fields).
- Never log tokens/receipts/payloads with sensitive fields.

## Package Boundaries (authoritative)
- `packages/domain-core`: formulas, scenario/snapshot schema, migrations, numeric policy (pure functions only)
- `packages/storage`: local repositories/adapters only
- `packages/entitlements`: policy + gating decisions
- `packages/telemetry`: event allowlist + local queue/batching
- `packages/api-client`: typed minimal API endpoints
- `packages/reporting`: local report model builder + PDF/XLSX exporters

## Growth Features Status
- Report export: implemented and tested (local-only)
- Share links: implemented and tested (sanitize -> encrypt -> store, migrate/decrypt on read, create/get/list/revoke, owner checks)
- Embeds: implemented and tested (query options, CTA prefill, embed CSP)
- Optional embed analytics: implemented with allowlist-safe events

## Delivery Workflow (Mandatory)
- Each roadmap step is implemented in a dedicated git branch.
- Each roadmap step is delivered as a separate pull request.
- No mixed-step PRs.

## Documentation Sync (Mandatory)
- Every change to behavior, API, data model, security policy, architecture, or UX must include matching documentation updates in the same PR.
- If code changes and docs do not, the change is incomplete.
- Keep these files aligned when applicable:
	- `README.md` for scope, setup, and high-level capabilities
	- `docs/contracts/api.md` for endpoint/request/response changes
	- `docs/decisions/adr.md` for architectural decisions and trade-offs
	- `docs/architecture/*.md` for boundary, deployment, or quality-attribute changes
	- `docs/release-notes-v1.md` for user-visible behavior changes
- If any `.docx` artifact is added/maintained, keep an equivalent authoritative `.md` version in `docs/` and update both together.
