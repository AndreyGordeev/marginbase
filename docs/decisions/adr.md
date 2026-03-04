## Architecture Decision Records (v1)

Date: 2026-03-01
Status: Accepted (baseline decisions before implementation)

# ADR-001: Unified TypeScript Stack and Shared Domain Core

Date: 2026-03-01
Status: Accepted

## Context

Need cross-platform consistency, minimal duplication, strong typing, and
Copilot-friendly development.

## Decision

Use TypeScript across Web and Mobile. Implement shared `domain-core`
package with pure calculation functions and shared types.

## Consequences

### Positive

-   Single source of truth for calculations
-   Reduced drift between platforms
-   Strong typing across layers

### Negative

-   Requires discipline to keep domain-core framework-free
-   Floating point risks must be explicitly handled

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-002: Offline-First Data Ownership

Date: 2026-03-01
Status: Accepted

## Context

Core driver is offline-first usage and minimal cloud cost.

## Decision

Store all scenarios locally (SQLite mobile, IndexedDB web). No cloud
sync in V1.

## Consequences

### Positive

-   Works without network
-   Lower compliance risk
-   Minimal backend storage costs

### Negative

-   No cross-device sync in V1
-   Requires robust local migration strategy

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-003: Numeric Precision Strategy

Date: 2026-03-01
Status: Accepted

## Context

Financial calculations require deterministic, safe numeric handling.

## Decision

Store monetary values as minor units (cents). Use decimal library for
ratios and enforce explicit rounding policy.

## Consequences

### Positive

-   Eliminates floating point drift
-   Predictable financial outputs

### Negative

-   Slight increase in implementation complexity

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-004: Encrypted Mobile Storage

Date: 2026-03-01
Status: Accepted

## Context

Financial scenario data is business-sensitive.

## Decision

Use SQLite + SQLCipher. Store encryption key in Keychain/Keystore.

## Consequences

### Positive

-   Encryption at rest on mobile
-   Stronger security posture

### Negative

-   More complex native setup
-   Slight performance overhead

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-005: Web Local Vault (Paid Users)

Date: 2026-03-01
Status: Accepted

## Context

Web local storage cannot guarantee device-level encryption.

## Decision

Provide optional passphrase-based encryption (WebCrypto AES-GCM)
available to all paid users.

## Consequences

### Positive

-   Additional security for web users
-   No cloud exposure of keys

### Negative

-   If passphrase lost, data unrecoverable
-   Additional UX complexity

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-006: React Native Runtime Choice

Date: 2026-03-01
Status: Accepted

## Context

Need flexibility for encryption, billing SDKs, and long-term
maintainability.

## Decision

Use Bare React Native (not Expo managed).

## Consequences

### Positive

-   Full native control
-   Easier integration of encryption and billing SDKs

### Negative

-   More setup complexity vs Expo managed

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-007: Minimal AWS Backend Scope

Date: 2026-03-01
Status: Accepted

## Context

Cloud cost and compliance minimization are key drivers.

## Decision

Backend limited to Auth verification, Entitlements service, and
Telemetry ingest. No scenario storage.

## Consequences

### Positive

-   Low cloud cost
-   Smaller attack surface
-   GDPR-friendly

### Negative

-   Requires careful entitlement caching design

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-008: Entitlements Offline Grace Model

Date: 2026-03-01
Status: Accepted

## Context

Subscriptions must work offline without constant backend calls.

## Decision

Cache entitlement set locally with 72-hour TTL grace. Refresh max once
per 24h when online.

## Consequences

### Positive

-   Predictable offline UX
-   Controlled API usage

### Negative

-   Short-term entitlement abuse window possible

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-009: Web Hosting Model (AWS)

Date: 2026-03-01
Status: Accepted

## Context

Need cheap, scalable hosting.

## Decision

Host SPA on S3 + CloudFront. API via API Gateway + Lambda in EU region.

## Consequences

### Positive

-   Low cost
-   High availability
-   Simple deployment

### Negative

-   Requires correct SPA routing config

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-010: Payments Strategy (Global-Ready)

Date: 2026-03-01
Status: Accepted

## Context

Need minimal tax/legal complexity for global expansion.

## Decision

Mobile: native store billing. Web: Paddle as Merchant of Record.

## Consequences

### Positive

-   VAT/sales tax handled externally
-   Easier global expansion

### Negative

-   Dependency on third-party provider

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-011: Infrastructure as Code

Date: 2026-03-01
Status: Accepted

## Context

Need reproducible infrastructure and team scalability.

## Decision

Use Terraform for AWS infrastructure.

## Consequences

### Positive

-   Industry standard
-   Clear environment separation

### Negative

-   Requires Terraform expertise and discipline

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-012: State Management Strategy

Date: 2026-03-01
Status: Accepted

## Context

Need predictable UI state without heavy frameworks.

## Decision

Use React hooks + Zustand for lightweight global state.

## Consequences

### Positive

-   Simple and scalable
-   Avoids Redux-level complexity

### Negative

-   Requires conventions to prevent state sprawl

### Operational Impact

Minimal operational complexity increase beyond defined stack.

### Security / Compliance Impact

Aligned with GDPR-first baseline and EU hosting constraints.

### Alternatives Considered

Discussed during architecture phase and intentionally rejected in favor
of chosen solution.

# ADR-013: Web i18n and Routing Canonical Model

Date: 2026-03-04
Status: Accepted

## Context

Web runtime has delivered i18n across supported languages (`en,de,fr,es,pl,it,ru`) with a mixed routing model:
- language-aware internal app routes
- stable legacy public routes for share/embed compatibility

Earlier ADRs were written before this rollout and may describe historical web assumptions.

## Decision

Adopt and document the canonical web routing/i18n model as:

1. i18n is UI-only in `apps/web` (`i18next` + browser language detector).
2. Internal app routes are language-aware (`/:lang/...`).
3. Legacy public routes remain unprefixed for compatibility:
	- share: `/s/:token`
	- embeds: `/embed/profit`, `/embed/breakeven`, `/embed/cashflow`
4. Language can be resolved from current i18n state and `lang` query where applicable (not path-segmented embed routes).
5. Domain and backend boundaries remain unchanged:
	- no localization logic in `packages/domain-core`
	- no monetary scenario values in telemetry/auth/entitlements/billing endpoints

This ADR supersedes prior implied web routing assumptions where they conflict with the above model.

## Consequences

### Positive

- Preserves backward compatibility for existing public links and embeds
- Keeps language-aware UX for internal app navigation
- Reduces implementation ambiguity for future features and docs updates

### Negative

- Mixed route strategy increases routing edge-case handling
- Requires continued discipline to keep docs and runtime in sync

### Operational Impact

Low operational impact; primarily documentation and implementation-guidance alignment.

### Security / Compliance Impact

No security posture degradation; privacy constraints and telemetry restrictions remain unchanged.

### Alternatives Considered

- Full migration to path-segmented language for all routes (including `/embed/:lang/...`) was deferred to avoid breaking existing public integrations.
