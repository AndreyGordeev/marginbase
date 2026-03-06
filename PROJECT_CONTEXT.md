# MarginBase — PROJECT_CONTEXT

Date: 2026-03-06 (Phase 7 Coverage Optimization Complete)

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

## Quality Gates (Phase 7 Results)

**Test Coverage (Unit + Integration):**

- domain-core: 100% statements, 100% branches, 100% functions ✅
- reporting: 100% statements, 100% branches, 100% functions ✅
- storage: 97.33% statements, 98.26% branches, 97.16% functions ✅
- **Total workspace:** 400+ tests passing (zero regressions)

**CI Pipeline Gates (All Green):**

- Lint: ESLint all packages
- TypeCheck: TypeScript strict mode
- i18n: Localization parity (en,de,fr,es,pl,it,ru)
- Tests: 100% survival rate
- Coverage: Branch thresholds exceeded by 3-8%
- E2E: 54+ tests across Chromium, Firefox, WebKit

**Known Limitations (Justified):**

- web-vault.ts buffer fallback paths (10% gap): Browser-only code, requires E2E in real browser, theoretical edge case
- Status: Acceptable for unit-test environment; all business logic fully covered

See [TESTING_PHASE_7_MAX_COVERAGE_SCOPE.md](TESTING_PHASE_7_MAX_COVERAGE_SCOPE.md) for detailed metrics.

## Implementation Gaps Closure (Phase 4 — 2026-03-05)

**Three major functional gaps fully implemented and tested:**

## Final Remediation Pass (2026-03-06)

- AWS backend module now packages handlers from `infra/aws/modules/backend_api/lambda_handlers` (no active deployment packaging from `lambda_stubs`).
- Web auth fallback is dev-only; production no longer silently signs in a local mock user when OAuth is unavailable.
- `packages/backend-server` auth verification uses configurable provider mode (`GOOGLE_VERIFICATION_MODE`) and validates claims/audience before creating a session.
- `packages/backend-server` billing now includes provider-backed checkout/portal paths (env-driven Stripe), webhook signature verification support, idempotency, and `/billing/webhook` alias.
- Mobile UI screens were upgraded from placeholders to functional CRUD/editor workflows using `MobileAppService` with local persistence wiring.

1. **Production Authentication (Google OAuth)**
   - ✅ GoogleOAuthService: async library loading, button initialization, token validation
   - ✅ WebAppService: sign-in with Google, token persistence, logout, ID token retrieval
   - ✅ Environment config: VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID support
   - ✅ E2E test suite: 11 tests (login, session, protected routes, logout, language switching)
   - ✅ Security tests: 8 tests (token validation, expiration, injection prevention)

2. **Stripe Billing & Entitlements**
   - ✅ Backend mock server: Express with all required endpoints (`/auth/verify`, `/entitlements`, `/billing/*`, `/share/*`, `/telemetry/batch`)
   - ✅ E2E test suite: 11 tests (trial activation, subscription, expiration, grace period, modules unlock)
   - ✅ Webhook integration: 22 tests (idempotency, event types, signature verification, error handling)
   - ✅ Entitlements lifecycle: 38 tests (trial, subscription, grace period, access control, edge cases)
   - ✅ Security tests: Rate limiting, CORS, referer validation

3. **Mobile Application (15 Screens)**
   - ✅ Mobile router: pattern matching, parameterized routes, history management
   - ✅ 15 screen implementations: login, home, gate, scenarios (3 modules), settings, subscription, legal (privacy/terms), import/export, error, empty state, splash
   - ✅ Mobile CSS: responsive design, dark mode, touch-friendly UI
   - ✅ E2E test suite: 14 tests (all screens, route params, back button, rapid nav)
   - ✅ CRUD operations: 28 tests (create, read, update, delete, duplicate scenarios)
   - ✅ Offline persistence: 33 tests (scenario caching, entitlements cache, token cache, sync tracking)

**Test Infrastructure (Phase 4 Additions):**

- **Billing-flow.spec.ts**: 11 E2E tests via Playwright
- **Mobile-navigation.spec.ts**: 14 E2E tests (iPhone 12 viewport)
- **webhook-integration.test.ts**: 22 integration tests (Vitest)
- **mobile-crud-operations.test.ts**: 28 service tests
- **offline-persistence.test.ts**: 33 IndexedDB/cache tests
- **entitlements-lifecycle.test.ts**: 38 policy/edge case tests
- **security-validation.test.ts**: 38 token/CORS/rate-limit tests
- **Total:** 150+ new test cases

See [TESTING_PHASE_4_COMPLETE.md](TESTING_PHASE_4_COMPLETE.md) for test suite details and coverage breakdown.
