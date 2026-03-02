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
