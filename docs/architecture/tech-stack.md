## Technology Stack & Rationale (v1)

Date: 2026-03-01

This document explains **what technologies we use, why**, and how GitHub Copilot should apply them when generating code.
Scope: Web + iOS + Android (offline-first) + minimal AWS backend (EU).

---

## 1. High-Level Stack Summary

### Client
- **Web:** React + TypeScript + Vite
- **Mobile:** React Native (Bare) + TypeScript
- **Shared:** `domain-core` (TypeScript) for calculations + schema + migrations

### Local Storage
- **Mobile:** SQLite + **SQLCipher** (encrypted at rest)
- **Web:** IndexedDB (Dexie) + optional **Local Vault** (WebCrypto AES-GCM)

### Backend (AWS EU)
- API Gateway (HTTP API)
- Lambda (Node.js/TypeScript)
- DynamoDB (entitlements)
- S3 (telemetry raw + web assets)
- CloudFront + Route53
- KMS, Secrets Manager, CloudWatch
- IaC: **Terraform**

### Auth / Billing / Observability
- Auth: **Google OAuth**
- Billing: **Store billing on-device** + backend verification (Apple/Google)
- Crashes: dedicated crash SDK vendor (direct from clients)
- Telemetry: allowlist events + batching to backend + S3 raw storage

---

## 2. Why This Stack (Drivers → Tech Mapping)

### Offline-first + Low Cloud Cost
- Scenarios are **local-only in V1**, so the backend stays thin and cheap.
- All calculations run client-side via `domain-core`.
- Local-first storage: SQLite/IndexedDB.

### Cross-Platform Consistency
- TypeScript everywhere.
- Single `domain-core` avoids formula drift between Web and Mobile.

### Security / Compliance (EU-first)
- Minimal PII in backend; EU-region hosting.
- Mobile data encrypted with SQLCipher; secrets in Keychain/Keystore.
- Telemetry excludes monetary values.

### Global-ready Payments (Later Web Expansion)
- Mobile uses Apple/Google stores.
- Web uses **Paddle (Merchant of Record)** when introduced → reduces tax/legal overhead for multi-country growth.

---

## 3. Detailed Tech Choices (What + For What)

### 3.1 Web: React + Vite + TypeScript
**Use for:**
- SPA screens, routing, rendering charts/tables, importing/exporting JSON.

**Why:**
- Fast dev loop, small bundles, predictable TS typing.

**Copilot rules:**
- Keep UI “dumb”: no formulas, no DB direct calls.
- Use typed ViewModels (State Layer) and repositories.

---

### 3.2 Mobile: Bare React Native + TypeScript
**Use for:**
- Native-feel experience, store billing, encrypted storage.

**Why Bare RN (not Expo managed):**
- SQLCipher + billing SDKs + crypto require native control.

**Copilot rules:**
- Prefer native modules where needed (SQLCipher bindings).
- Keep platform-specific code isolated under adapters.

---

### 3.3 Shared Domain: `packages/domain-core`
**Contains:**
- **Calculation Core** (Profit / Break-even / Cashflow) as pure functions
- Scenario schema + validators
- Migrations between schema versions
- Rounding + formatting rules (logic-level)

**Why:**
- One source of truth; easiest regression testing.

**Copilot rules:**
- Domain functions must be pure (no I/O).
- Add golden test vectors for each formula set.

---

## 4. Numeric Precision (Safe Finance Math)

### Decision
- Monetary amounts stored as **minor units** (e.g., cents) using `bigint` where appropriate.
- Ratios/percentages use a **decimal library** (e.g., `decimal.js` or `big.js`).
- Rounding policy is explicit (e.g., HALF_UP) and centralized.

**Copilot rules:**
- Never do finance math using raw floating point.
- Always convert display ↔ minor units via a single helper module.
- Add tests for rounding boundaries.

---

## 5. Local Storage Strategy

### 5.1 Mobile: SQLite + SQLCipher
**What stored:**
- Scenarios (all numeric values)
- Entitlement cache (`lastVerifiedAt`, flags)
- Telemetry queue (batched)
- Settings

**How:**
- SQLCipher encrypts DB file.
- Encryption key stored in Keychain/Keystore.
- Repository layer provides CRUD and migrations.

**Copilot rules:**
- UI must not access SQLite directly.
- Use repository interfaces + adapter implementations.
- Ensure atomic writes and migration tests.

### 5.2 Web: IndexedDB (Dexie) + Optional Local Vault
**Default:**
- IndexedDB for scenarios/settings/events.
- Document that web at-rest encryption is not guaranteed by platform.

**Local Vault (available to all paid users):**
- Optional passphrase-based encryption:
    - derive key via WebCrypto
    - encrypt values AES-GCM
- Passphrase is never stored or sent to backend.

**Copilot rules:**
- Implement Local Vault as a wrapper around repository layer (encrypt/decrypt at boundary).
- Keep “vault enabled” state in settings and enforce paywall via `EntitlementSet`.

---

## 6. Backend Stack (AWS EU)

### 6.1 API Gateway (HTTP API)
Endpoints:
- `POST /auth/verify`
- `GET /entitlements`
- `POST /telemetry/batch`

**Copilot rules:**
- Strict request/response validation.
- Return typed errors with stable codes (no stack traces).

### 6.2 Lambda (Node.js/TypeScript)
Functions:
- Auth verification (verify Google token)
- Entitlements (verify receipts + return entitlement set)
- Telemetry ingest (allowlist + write to S3)

**Copilot rules:**
- Never log secrets, tokens, receipts.
- Keep functions stateless.
- Use structured logs with redaction.
- Keep CloudWatch logs minimal.

### 6.3 DynamoDB (Entitlements)
**What stored:**
- Minimal PII: `userId`, entitlement flags, trial timestamps, updatedAt
- No scenario values ever

**Copilot rules:**
- Keep table simple; design can be expanded later.
- Encrypt with KMS.

### 6.4 Telemetry Storage (S3)
- Raw events, time-partitioned keys
- Lifecycle retention 30–90 days

**Copilot rules:**
- Enforce allowlist and payload size caps.
- Do not store amounts.

---

## 7. Auth & Billing

### 7.1 Google OAuth
- Client sign-in
- Backend verification as needed

**Copilot rules:**
- Tokens never in logs.
- Mobile tokens stored only in secure storage.

### 7.2 Store Billing
- Purchases happen on device
- Backend does verification (Apple/Google) and issues entitlements

**Copilot rules:**
- Keep provider-specific code behind interfaces (BillingAdapter).
- Unify results into one `EntitlementSet` contract.

### 7.3 Web Billing (Later): Paddle (MoR)
- Handles taxes and receipts as merchant of record
- Integrates into same entitlements model

---

## 8. Infrastructure as Code: Terraform

**Why:**
- Standard, reproducible, env separation.

**Copilot rules:**
- Use module-based structure.
- Keep dev/prod isolated state.
- Outputs: API base URL, CloudFront domain, bucket names.

Suggested layout:
```
infra/
  envs/dev
  envs/prod
  modules/
    edge_cloudfront_s3/
    api_gateway_http/
    lambda_service/
    dynamodb_entitlements/
    s3_telemetry_raw/
    security_kms_secrets/
    observability_cloudwatch/
```

---

## 9. “Copilot Do / Don’t” (Hard Rules)

### DO
- Put formulas only into `domain-core`.
- Use minor-units and explicit rounding helpers.
- Keep DB behind repositories.
- Batch telemetry, debounce entitlements refresh.
- Keep backend stateless and minimal.

### DON’T
- Duplicate formulas in UI.
- Use float math for money.
- Store scenario values in backend or telemetry.
- Log tokens/receipts or full telemetry payloads.
- Make backend required for core usage (offline-first must hold).

---

## 10. Implementation Checklist (First Sprint)

1. Create monorepo skeleton: `apps/web`, `apps/mobile`, `packages/domain-core`
2. Implement numeric helpers + rounding policy in `domain-core`
3. Implement scenario schema v1 + validators + golden test vectors
4. Implement LocalDB repositories for web (Dexie) and mobile (SQLite placeholder)
5. Implement basic entitlement cache + gate behavior in client
6. Stub backend endpoints (Terraform + Lambda skeleton) in EU region
