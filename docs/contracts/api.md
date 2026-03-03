# API Contracts (v1)

Purpose: define a stable backend contract for clients and serverless services.

## Endpoints
- `POST /auth/verify`
- `GET /entitlements`
- `POST /telemetry/batch`
- `POST /billing/checkout/session`
- `POST /billing/webhook/stripe`
- `POST /billing/verify`
- `POST /account/delete`

## Shared Rules
- JSON only
- Strict schema validation
- Never include monetary scenario values
- Errors must return stable codes

## `EntitlementSet` (example)
```json
{
  "userId": "u_123",
  "lastVerifiedAt": "2026-03-01T10:00:00Z",
  "entitlements": {
    "bundle": true,
    "profit": true,
    "breakeven": false,
    "cashflow": true
  },
  "status": "trialing",
  "source": "stripe",
  "currentPeriodEnd": "2026-04-01T00:00:00Z",
  "trialEnd": "2026-03-31T00:00:00Z",
  "trial": {
    "active": true,
    "expiresAt": "2026-03-10T00:00:00Z"
  }
}
```

## `POST /billing/checkout/session`

Request:
```json
{
  "planId": "bundle",
  "userId": "u_123",
  "email": "owner@company.com"
}
```

Response:
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_123"
}
```

## `POST /billing/webhook/stripe`

Headers:
- `stripe-signature` (required)

Body:
- Raw Stripe event payload

Handled events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Requirements:
- Signature verification is mandatory.
- Processing must be idempotent.
- Entitlement updates must be source-of-truth writes.

Response:
```json
{
  "received": true,
  "processed": true,
  "eventId": "evt_123"
}
```
