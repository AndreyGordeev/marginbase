# Stripe Test Mode E2E Checklist

**Effective Date:** 2026-03-03

This checklist defines test-mode validation for Stripe web subscriptions before production launch.

---

## 1. Scope

Covers web billing flow and entitlement synchronization for:
- `POST /billing/checkout/session`
- `POST /billing/webhook/stripe`
- `GET /entitlements`

Out of scope:
- Real card settlement in live mode
- App Store / Google Play purchase flows

---

## 2. Preconditions

- `stripe_mode` is set to `test`
- `stripe_secret_key` and `stripe_webhook_secret` are configured in the environment
- Webhook endpoint is configured as `${api_base_url}/billing/webhook/stripe`
- Required events are subscribed:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- User is authenticated and has a stable `userId`

---

## 3. Core E2E Scenarios

### 3.1 Trial Activation

1. Start checkout from web paywall (`planId`, `userId`, `email`).
2. Complete Stripe Checkout in test mode.
3. Verify webhook `checkout.session.completed` is received.
4. Verify `GET /entitlements` returns:
   - `status: trialing` or `active` (depending on Stripe setup)
   - `source: stripe`
   - Correct module entitlements for selected plan

Expected result: user gains paid-module access according to plan.

### 3.2 Trial-to-Paid / Renewal

1. Trigger renewal event in Stripe test mode (`invoice.paid` or `customer.subscription.updated`).
2. Verify lifecycle transition in backend.
3. Verify `GET /entitlements` reflects current period and active access.

Expected result: subscription remains usable with `status: active`.

### 3.3 Payment Failure

1. Trigger `invoice.payment_failed` in Stripe test mode.
2. Verify webhook accepted and entitlement record updated.
3. Verify `GET /entitlements` reflects `status: past_due`.
4. Verify gate behavior aligns with product policy (paid access restricted as configured).

Expected result: no silent entitlement escalation; status and UI are consistent.

### 3.4 Cancellation and Revocation

1. Trigger `customer.subscription.deleted`.
2. Verify lifecycle status becomes `canceled`.
3. Verify entitlements are revoked to baseline.

Expected result: paid-module access is revoked after cancellation.

### 3.5 Webhook Idempotency

1. Replay the exact same webhook event ID.
2. Verify backend returns idempotent no-op response.
3. Verify entitlement state does not change on duplicate delivery.

Expected result: duplicate events are safe and side-effect free.

---

## 4. Failure Simulation

### 4.1 Webhook Retry Delivery

- Simulate delayed or repeated Stripe retries.
- Verify only first event processing mutates state.

### 4.2 Backend Downtime Window

- Temporarily disable billing endpoint processing.
- Restore endpoint and replay webhook events.
- Verify final entitlement state converges to latest lifecycle event.

### 4.3 Expired Trial

- Simulate end of trial period without successful renewal.
- Verify lifecycle transitions to `past_due` or `canceled` according to policy.

### 4.4 Revoked Subscription

- Simulate provider-side cancellation/dispute resolution.
- Verify paid entitlements are removed.

---

## 5. Observability Checks

- CloudWatch logs include request outcome and event IDs only.
- No secrets, tokens, full receipt payloads, or full card data in logs.
- Event processing failures produce actionable error metadata.

---

## 6. Production Readiness Gate

Mark ready only if all are true:
- Checkout session creation works from web UI
- Webhook signature verification works in test mode
- Idempotency is verified with duplicate event replay
- Lifecycle transitions (`trialing`, `active`, `past_due`, `canceled`) are validated
- Entitlement revocation on cancellation is confirmed
- Legal disclosures and policy links match runtime UI copy
- No prohibited sensitive logging observed

---

## 7. Evidence to Attach

- Stripe event replay logs / screenshots
- API responses for key transitions
- Test run output (`infra-aws` + `web`)
- Final sign-off checklist with date and owner
