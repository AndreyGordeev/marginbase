# SMB Finance Toolkit --- Project Roadmap (Definition of Done Only)

Date: 2026-03-01

This document defines sequential implementation steps. Each step is
considered complete only when its Definition of Done (DoD) is satisfied.

Execution rule (mandatory): each step must be implemented in a dedicated
git branch and merged through a separate pull request.

------------------------------------------------------------------------

## Step 0 --- Monorepo & Tooling Setup

**DoD:** - Monorepo structure created (`apps/`, `packages/`,
`infra/`). - Workspace configuration working (install, build, test
commands). - Web and Mobile apps boot with placeholder screens. - Shared
packages compile and can be imported across apps. - Lint + test commands
run successfully.

------------------------------------------------------------------------

## Step 1 --- Domain Core (Numeric Safety + Calculators)

**DoD:** - Monetary values represented in minor units. - Decimal library
integrated for ratios/percentages. - Explicit rounding policy
implemented. - Profit, Break-even, Cashflow modules implemented as pure
functions. - Golden test vectors implemented and passing. - No floating
point math used for money.

------------------------------------------------------------------------

## Step 2 --- Scenario Schema & Import/Export

**DoD:** - Versioned schema (`schemaVersion`) implemented. - Scenario
validator implemented. - Replace-all import behavior implemented. -
Export produces valid JSON matching schema. - Import rejects invalid or
incompatible versions. - Tests cover valid, invalid, and
version-mismatch cases.

------------------------------------------------------------------------

## Step 3 --- Storage Layer (Web + Mobile Basic)

**DoD:** - Repository interfaces defined. - IndexedDB adapter
implemented for Web. - SQLite adapter implemented for Mobile
(unencrypted placeholder). - CRUD operations tested via repositories (no
UI dependency). - Migration mechanism implemented and tested.

------------------------------------------------------------------------

## Step 4 --- Entitlements (Local Logic)

**DoD:** - `EntitlementSet` type implemented. - 72h TTL grace logic
implemented and tested. - Gate helpers (`canUseModule`, `canExport`)
implemented. - Edge cases tested (fresh, stale, boundary conditions).

------------------------------------------------------------------------

## Step 5 --- Telemetry Queue (Local Only)

**DoD:** - Allowlist event schema implemented. - Local queue implemented
with batching. - Payload size cap enforced. - Tests confirm disallowed
fields are rejected. - Queue flush returns correctly structured batch.

------------------------------------------------------------------------

## Step 6 --- Web Application (Offline Complete)

**DoD:** - All defined Web screens implemented. - Scenario
create/edit/delete working offline. - Calculations wired only through
domain-core. - Import/export working. - Entitlement gate working
locally. - No direct DB access from UI components.

------------------------------------------------------------------------

## Step 7 --- Mobile Application (Offline Complete)

**DoD:** - All defined Mobile screens implemented. - Scenario CRUD
working offline. - Calculations consistent with Web outputs. -
Entitlement gate logic integrated. - No formula logic duplicated in UI.

------------------------------------------------------------------------

## Step 8 --- Mobile Encryption (SQLCipher)

**DoD:** - SQLite replaced with SQLCipher. - Encryption key stored in
Keychain/Keystore. - Database file verified encrypted at rest. -
Migration strategy defined (wipe or migrate). - App continues
functioning after encryption integration.

------------------------------------------------------------------------

## Step 9 --- Web Local Vault (Paid Feature)

**DoD:** - AES-GCM encryption wrapper implemented using WebCrypto. - Key
derived from passphrase (not stored). - Vault available only when user
has any paid entitlement. - Data encrypted/decrypted at repository
boundary. - Loss of passphrase renders data inaccessible (expected
behavior).

------------------------------------------------------------------------

## Step 10 --- AWS Infrastructure (Dev Environment)

**DoD:** - Terraform modules implemented. - EU region enforced. - S3 +
CloudFront hosting working. - API Gateway + 3 Lambda stubs deployed. -
DynamoDB + S3 telemetry bucket created. - Log retention configured. -
Dev environment deployable end-to-end.

------------------------------------------------------------------------

## Step 11 --- Backend Core Logic

**DoD:** - `/auth/verify` verifies Google token. - `/entitlements`
returns valid `EntitlementSet` contract. - `/telemetry/batch` validates
and writes to S3. - No sensitive values logged. - Client can refresh
entitlements successfully.

------------------------------------------------------------------------

## Step 12 --- Store Billing Integration

**DoD:** - iOS and Android purchase flows working on device. - Backend
verifies receipts/subscriptions. - DynamoDB updated with entitlement
status. - Clients refresh entitlements with correct TTL behavior. -
Subscription gating verified end-to-end.

------------------------------------------------------------------------

## Step 13 --- Launch Readiness

**DoD:** - Account deletion endpoint implemented. - Entitlements and
minimal user data deletable. - Privacy policy and legal pages
integrated. - Monitoring dashboards configured (error rate, latency). -
Cost guardrails configured (log retention, S3 lifecycle). - App usable
end-to-end without backend dependency for calculations.

------------------------------------------------------------------------

Production readiness is achieved when all steps above satisfy their DoD.
