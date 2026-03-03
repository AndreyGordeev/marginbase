# MarginBase Release Notes — V1 (Steps 0–13)

Date: 2026-03-02

This release marks completion of roadmap Steps 0 through 13 with each step delivered in a dedicated branch and merged through a dedicated pull request.

## Delivery Status

- Steps completed: 0–13
- Delivery model: one step = one branch + one PR
- Current branch target: `main`
- Workspace health: build, lint, test, and typecheck are green

## What Shipped

### Platform Foundation
- Monorepo workspace with shared TypeScript toolchain and package boundaries
- Core domain modules for numeric policy, profit, break-even, and cashflow
- Schema validation and import/export with replace-all behavior

### Offline Data and Security
- Web storage via IndexedDB repository
- Mobile storage upgraded to SQLCipher model with key store abstraction
- Web Local Vault with AES-GCM encryption at repository boundary

### Entitlements, Telemetry, and API
- Local entitlement policy with TTL grace and refresh debounce
- Telemetry queue and allowlist enforcement (financial fields rejected)
- Typed API client for auth, entitlements, telemetry, billing verification, and account deletion

### Applications
- Web offline-complete shell with scenario CRUD, import/export, module gating
- Mobile offline-complete service flows with scenario CRUD and module gating
- Store billing integration: purchase verification flow and entitlement updates
- Legal/privacy route integration and launch-readiness account deletion flows

### Backend and Infrastructure
- AWS Terraform stack in EU region with S3 + CloudFront + API Gateway + Lambda
- Backend endpoint logic for `/auth/verify`, `/entitlements`, `/telemetry/batch`, `/billing/verify`, `/account/delete`
- Entitlement persistence/update/delete flow and launch-readiness CloudWatch dashboard
- Cost guardrails via retention/lifecycle settings and infra validation scripts

## Launch Readiness Outcomes

- Account deletion endpoint implemented with entitlement + minimal user data deletion
- Privacy and Terms integration added in client flows
- Monitoring configured for key error/latency visibility
- Offline calculation capability remains functional independent of backend availability

---

## Stripe Subscription Scope Closure (2026-03-03)

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
