## Architecture Drivers (v1)
Date: 2026-02-28  |  Scope: Web + iOS + Android  |  EU-first, Global-ready

## 1. Business Drivers
- B1 — EU-first launch with global expansion readiness.
- B2 — Low operational cloud cost (thin backend, client-side calculations).
- B3 — Subscription-based monetization (trial, per-module, bundle).
- B4 — Product simplicity (lightweight financial toolkit, not ERP/accounting system).

## 2. Technical Drivers
- T1 — Offline-first architecture (core logic fully client-side).
- T2 — Cross-platform consistency (shared calculation logic & scenario schema).
- T3 — Data integrity and safe local persistence (no scenario loss).
- T4 — Secure-by-default design (OAuth, secure token storage, encrypted mobile storage).
- T5 — Minimal telemetry with privacy-first principles.

## 3. Dominant Quality Attribute Drivers
- Q1 — Availability (Offline capability mandatory).
- Q2 — Modifiability (new calculators must be pluggable with minimal refactor).
- Q3 — Cost-aware scalability (support growth without backend cost explosion).
- Q4 — Security & Compliance (GDPR baseline, minimal PII).
- Q5 — Performance (fast cold start, instant calculation feedback).

## 4. Architectural Impact Summary
- Calculation engine must be pure, shared, and testable across platforms.
- Backend limited to authentication, entitlement validation, and minimal telemetry.
- Local-first storage required on all platforms.
- Entitlement caching strategy required for offline grace period.
- EU-based hosting required for compliance baseline.
-
