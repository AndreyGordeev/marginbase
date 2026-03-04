# MarginBase Release Notes — V1 Appendix (Detailed History)

This appendix keeps the detailed historical narrative for V1 while `docs/release-notes-v1.md` remains concise and merge-friendly.

## V1 Baseline (Steps 0–13) — 2026-03-02

This release marks completion of roadmap Steps 0 through 13 with each step delivered in a dedicated branch and merged through a dedicated pull request.

### Delivery Status

- Steps completed: 0–13
- Delivery model: one step = one branch + one PR
- Current branch target: `main`
- Workspace health: build, lint, test, and typecheck are green

### What Shipped

#### Platform Foundation
- Monorepo workspace with shared TypeScript toolchain and package boundaries
- Core domain modules for numeric policy, profit, break-even, and cashflow
- Schema validation and import/export with replace-all behavior

#### Offline Data and Security
- Web storage via IndexedDB repository
- Mobile storage upgraded to SQLCipher model with key store abstraction
- Web Local Vault with AES-GCM encryption at repository boundary

#### Entitlements, Telemetry, and API
- Local entitlement policy with TTL grace and refresh debounce
- Telemetry queue and allowlist enforcement (financial fields rejected)
- Typed API client for auth, entitlements, telemetry, billing verification, and account deletion

#### Applications
- Web offline-complete shell with scenario CRUD, import/export, module gating
- Mobile offline-complete service flows with scenario CRUD and module gating
- Store billing integration: purchase verification flow and entitlement updates
- Legal/privacy route integration and launch-readiness account deletion flows

#### Backend and Infrastructure
- AWS Terraform stack in EU region with S3 + CloudFront + API Gateway + Lambda
- Backend endpoint logic for `/auth/verify`, `/entitlements`, `/telemetry/batch`, `/billing/verify`, `/account/delete`
- Entitlement persistence/update/delete flow and launch-readiness CloudWatch dashboard
- Cost guardrails via retention/lifecycle settings and infra validation scripts

### Launch Readiness Outcomes

- Account deletion endpoint implemented with entitlement + minimal user data deletion
- Privacy and Terms integration added in client flows
- Monitoring configured for key error/latency visibility
- Offline calculation capability remains functional independent of backend availability

## Stripe Subscription Scope Closure — 2026-03-03

Stripe production-launch scope is delivered in incremental PR slices and merged to `main`.

### Billing Flow
- Web paywall CTA wired to backend checkout session creation (`POST /billing/checkout/session`)
- Stripe webhook endpoint contract and infra route added (`POST /billing/webhook/stripe`)
- Entitlements lifecycle fields standardized: `status`, `source`, `currentPeriodEnd`, `trialEnd`

### Backend/Infra Readiness
- Terraform Stripe configuration added: `stripe_secret_key`, `stripe_webhook_secret`, `stripe_mode`
- Billing webhook processing is idempotent for duplicate event delivery
- Lifecycle transitions covered in backend tests (`trialing` → `active` → `past_due` / `canceled`)

### Compliance and UI Alignment
- Terms, Privacy, Cancellation, and Refund legal artifacts aligned with Stripe lifecycle model
- Payment failure and chargeback/dispute handling clauses added
- Runtime legal disclosure copy and legal route content synchronized

### Test and Go-Live Artifacts
- Stripe test-mode checklist added: `docs/testing/stripe-test-mode-e2e.md`
- Production evidence/sign-off template added: `docs/testing/stripe-production-readiness-evidence.md`
- Deployment and infra runbooks linked to checklist + evidence package

### Definition of Done Status
- Trial activation and conversion path: documented and test-covered
- Auto-renew lifecycle handling: documented and test-covered
- Access revocation on cancellation: implemented and test-covered
- Offline grace compatibility, legal disclosure alignment, and deployable infra config: completed

## i18n Coverage & Documentation Governance — 2026-03-04

### Web i18n rollout
- i18n provider and language-aware app routing delivered for web UI.
- Non-English locales (`de`, `fr`, `es`, `pl`, `it`, `ru`) synchronized with expanded keyspace and translated user-facing strings.
- Shared scenario, embed views, reports, validation messages, results panels, dashboard/workspace/settings/data pages fully switched to translation keys.
- Localization consistency pass completed for previously mixed anglicisms in non-English locales.

### Quality status
- Web checks after localization batches remained green:
  - `corepack pnpm --filter @marginbase/web typecheck`
  - `corepack pnpm --filter @marginbase/web test` (29/29)

### Documentation governance
- Mandatory documentation-sync policy added and linked:
  - `docs/documentation-sync-policy.md`
  - `PROJECT_CONTEXT.md` (`Documentation Sync (Mandatory)`)
  - `.github/pull_request_template.md` documentation checklist

## PR-5: Local Export Watermark Policy — 2026-03-04

### What changed
- Local business report exports remain fully offline for both PDF and XLSX.
- Free plan exports now include watermark text: `Generated by MarginBase`.
- Paid bundle exports remain clean (no watermark).

### UX and policy alignment
- Data & Backup now surfaces the free export watermark note in-context.
- Export remains available for all users to preserve data portability.

## PR-6: Encrypted Share Links — 2026-03-04

### What changed
- Share snapshot creation now sends only encrypted payloads to `/share/create`.
- Shared-scenario retrieval supports encrypted payload decrypt on client side.
- Share URLs now include decryption key in URL fragment (`#k=`) while token remains in `/s/:token`.

### Privacy and architecture outcomes
- Backend stores only encrypted blob + token metadata + expiry; no plaintext snapshot values.
- Existing plaintext snapshot response remains read-compatible during migration.

## PR-7: Embed Calculators Stateless Routes — 2026-03-04

### What changed
- Embed calculators now support both route styles: `/embed/<calculator>` and `/embed/<lang>/<calculator>`.
- Embed views remain stateless and local-only for computation (no account, no scenario persistence).
- Added local JSON export for current embed inputs (`Export inputs (JSON)`).

### UX outcome
- Embed pages stay minimal and iframe-friendly with a single in-app CTA and optional powered-by footer.

## Billing UX follow-up: Checkout + Portal actions in Subscription page — 2026-03-04

### What changed
- Subscription page now includes direct Stripe checkout action for upgrade flow (`POST /billing/checkout/session` via web service).
- Added “Manage Subscription” action that opens Stripe Billing Portal (`POST /billing/portal-session`) for signed-in users.
- Checkout and portal failures now surface user-facing messages and keep local fallback path (`Activate Bundle Local`) available for offline/demo flow.

## Stripe webhook signature hardening — 2026-03-04

### What changed
- Billing webhook handler now verifies Stripe-style `Stripe-Signature` HMAC (`sha256`) against raw request body and configured webhook secret.
- Invalid signatures are rejected with `INVALID_SIGNATURE` and counted in webhook failure observability path.
- Webhook idempotency records now persist with explicit TTL metadata (`expiresAt`, 30 days) for replay-window control.
- Backend lambda tests updated to generate valid signed webhook headers and include explicit invalid-signature rejection coverage.

## Production-readiness tests follow-up: reporting coverage gate — 2026-03-04

### What changed
- Added `@marginbase/reporting` Vitest coverage thresholds and package-level `test:coverage` script.
- Expanded reporting exporter unit tests to cover PDF export (including watermark option path) in addition to XLSX assertions.
- Root `test:coverage` now runs both `@marginbase/domain-core` and `@marginbase/reporting` coverage gates.

## NO MANUAL testing follow-up: visual regression baseline — 2026-03-04

### What changed
- Added dedicated Playwright visual suite: `apps/web/tests/e2e/visual.spec.ts`.
- Added committed baseline snapshots for 8 critical screens under `apps/web/tests/e2e/visual.spec.ts-snapshots/`.
- Suite runs with deterministic Playwright settings (fixed viewport/locale, disabled animations) and passes against baselines.

## NO MANUAL testing follow-up: i18n E2E + language switch hardening — 2026-03-04

### What changed
- Added dedicated i18n E2E suite: `apps/web/tests/e2e/i18n.spec.ts`.
- New checks cover language switching to `pl` and `ru` plus persistence after reload.
- Fixed language switch routing in `apps/web/src/i18n/LanguageSwitcher.ts` to rewrite URL path language prefix (`/en/...` -> `/pl/...`) instead of query-only override.

## NO MANUAL testing follow-up: offline persistence E2E — 2026-03-04

### What changed
- Added dedicated offline critical-path E2E: `apps/web/tests/e2e/offline.spec.ts`.
- New check validates: scenario saved online -> browser offline mode -> dashboard/workspace navigation -> recalculation still works from local data.

## NO MANUAL testing follow-up: privacy payload assertions — 2026-03-04

### What changed
- Added reusable forbidden key scanner and canonical forbidden key list in `scripts/privacy-forbidden-keys.ts`.
- Added Playwright network privacy E2E: `apps/web/tests/e2e/privacy.spec.ts`.
- Added API client contract assertion that request bodies remain free of forbidden financial key names.
- Telemetry privacy tests now reuse the same forbidden-key source.
