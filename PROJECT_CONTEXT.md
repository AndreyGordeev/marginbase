# MarginBase — PROJECT_CONTEXT

Date: 2026-03-01

This file is the **primary Copilot anchor**. Keep it short and authoritative.

## Product
MarginBase is an offline-first finance toolkit for SMB with 3 calculators:
- Profit / Margin
- Break-even
- Cashflow forecast

## Non-negotiable Principles
1. **Offline-first:** create/edit/calc/export works fully offline.
2. **Thin backend:** backend is only for auth verification, entitlements, and telemetry ingest.
3. **No scenario values in cloud:** scenario numeric values are local-only in V1.
4. **Shared domain-core:** all formulas + schema + migrations live in `packages/domain-core` as pure functions.
5. **Numeric safety:** money uses minor units (e.g., cents) + explicit rounding; never float-math for money.
6. **EU-first hosting:** AWS resources in an EU region.
7. **Security:** mobile local DB encrypted at rest (SQLite + SQLCipher); secrets in Keychain/Keystore.
8. **Web Local Vault:** optional passphrase-based encryption for local data, available to **all paid users**.

## Hard Rules for Code Generation
- UI must not implement formulas.
- UI must not access DB directly (use repositories).
- Telemetry must not include monetary values.
- Never log tokens/receipts/payloads with sensitive fields.

## Delivery Workflow (Mandatory)
- Each roadmap step is implemented in a dedicated git branch.
- Each roadmap step is delivered as a separate pull request.
- No mixed-step PRs.
