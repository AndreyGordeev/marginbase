# MarginBase --- Remaining Implementation Tasks for Copilot

This document defines the remaining work required before the first
production launch of MarginBase.

CRITICAL RULES: 1. Financial values must never leave the client device.
2. Domain formulas must exist only in packages/domain-core. 3. UI must
never implement calculations. 4. Telemetry must never contain financial
data. 5. Backend must remain thin infrastructure only.

------------------------------------------------------------------------

## Remaining Work Overview

### 1. Stripe Subscription System

Status: IMPLEMENTED (2026-03-04)

Implement Stripe checkout, webhook handling, and entitlements
synchronization.

Endpoints: POST /billing/create-checkout-session POST /billing/webhook
POST /billing/portal-session

Webhook events: checkout.session.completed invoice.paid
invoice.payment_failed customer.subscription.updated
customer.subscription.deleted

------------------------------------------------------------------------

### 2. First Run Activation

Status: IMPLEMENTED (2026-03-04)

Flow: Open App → Demo Scenarios → Explore Calculators → Optional Login

Requirements: - no forced login - local scenario storage - demo
templates

------------------------------------------------------------------------

### 3. Upgrade UX

Trigger upgrade when: - locked calculator opened - export attempted -
limits exceeded

Flow: Upgrade → Stripe Checkout → Return → Entitlements Refresh

------------------------------------------------------------------------

### 4. Telemetry Consent

Status: IMPLEMENTED (2026-03-04)

States: enabled disabled not_decided

Default: disabled

Allowed events: app_started calculator_opened export_triggered
upgrade_clicked checkout_started checkout_completed

Forbidden: revenue costs margins financial inputs

------------------------------------------------------------------------

### 5. Local Report Export

Formats: PDF XLSX

Generated locally only.

Libraries: pdf-lib exceljs

------------------------------------------------------------------------

### 6. Shareable Scenario Links

Flow: scenario → sanitize → encrypt → upload snapshot → expiring link

Backend stores encrypted blob only.

Route: /share/:token

------------------------------------------------------------------------

### 7. Embeddable Calculators

Routes: /embed/profit /embed/breakeven /embed/cashflow

Requirements: - stateless - responsive - no login

Example:
`<iframe src="https://marginbase.com/embed/profit">`{=html}`</iframe>`{=html}

------------------------------------------------------------------------

### 8. End‑to‑End Tests

Add Playwright tests:

-   open app
-   run calculator
-   upgrade flow
-   export report
-   share scenario

CI must enforce passing tests and build success.

------------------------------------------------------------------------

### 9. Production Readiness

Verify before launch: - Stripe production keys - webhook verification -
legal pages deployed - telemetry consent implemented - CI pipeline
stable - error tracking enabled
