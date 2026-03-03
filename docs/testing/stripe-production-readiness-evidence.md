# Stripe Production Readiness Evidence Template

**Effective Date:** 2026-03-03

Use this template to capture objective evidence for Stripe go-live approval.

---

## 1. Release Metadata

- Release version / tag:
- Environment (`test` / `live`):
- Target go-live date and time (UTC):
- Prepared by:
- Reviewed by:
- Final approver:

---

## 2. Environment & Configuration Evidence

- `stripe_mode` value verified (`live` required for production):
- `stripe_secret_key` configured in secrets manager / deployment variables:
- `stripe_webhook_secret` configured and rotated policy verified:
- API routes present:
  - `POST /billing/checkout/session`
  - `POST /billing/webhook/stripe`
- Webhook endpoint configured in Stripe Dashboard:
- Subscribed Stripe events confirmed:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Evidence links / screenshots:
- 

---

## 3. Functional Verification Matrix

| Scenario | Expected Outcome | Result (Pass/Fail) | Evidence |
|---|---|---|---|
| Trial activation | Entitlements enabled for selected plan |  |  |
| Trial conversion / renewal | Status becomes `active` and access persists |  |  |
| Payment failure | Status becomes `past_due`; access follows policy |  |  |
| Subscription cancellation | Status `canceled`; paid entitlements revoked |  |  |
| Webhook idempotency | Duplicate event is no-op |  |  |
| Entitlements refresh on return from Stripe | UI gate reflects latest status |  |  |

---

## 4. Failure Simulation Evidence

| Failure Case | Simulation Method | Result (Pass/Fail) | Evidence |
|---|---|---|---|
| Webhook retry / duplicate delivery | Replay same event ID |  |  |
| Backend downtime window | Delay processing then replay events |  |  |
| Expired trial without successful payment | Simulated Stripe events/time advance |  |  |
| Revoked subscription / dispute impact | Deletion/dispute event simulation |  |  |

---

## 5. Security & Compliance Verification

- No secrets or full webhook payloads in logs:
- No scenario financial values stored in backend:
- Legal disclosures match runtime UI copy:
- Terms / Privacy / Cancellation / Refund policies updated and published:
- Data-processing and Stripe processor statements verified:

Evidence links:
- 

---

## 6. Automated Validation Results

Run outputs to attach:
- `corepack pnpm --filter @marginbase/infra-aws test`
- `corepack pnpm --filter @marginbase/web test`

Latest run summary:
- Infra tests:
- Web tests:
- Additional checks:

---

## 7. Risk Review and Rollback Readiness

- Known open risks:
- Mitigations in place:
- Rollback owner:
- Rollback procedure reference:
- Estimated rollback time:
- Communication channel for incident response:

---

## 8. Go/No-Go Decision

Decision: `GO` / `NO-GO`

Decision rationale:
-

Sign-off:
- Product owner:
- Engineering lead:
- Compliance/legal reviewer:
- Date/time:
