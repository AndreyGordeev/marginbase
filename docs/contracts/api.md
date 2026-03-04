# API Contracts (v1)

Purpose: define a stable backend contract for clients and serverless services.

## Endpoints
- `POST /auth/verify`
- `GET /entitlements`
- `POST /telemetry/batch`
- `POST /billing/checkout/session`
- `POST /billing/portal/session`
- `POST /billing/webhook/stripe`
- `POST /billing/verify`
- `POST /account/delete`
- `POST /share/create`
- `GET /share/:token`
- `DELETE /share/:token`
- `GET /share/list?userId=<ownerUserId>`

## Shared Rules
- JSON only
- Strict schema validation
- Never include monetary scenario values in telemetry/auth/entitlements/billing endpoints
- Explicit exception: sanitized share snapshots are allowed only on `/share/*` endpoints
- Errors must return stable codes

## Auth / Headers
- `Authorization: Bearer <idToken>` is required for authenticated endpoints (for example `GET /entitlements`, `DELETE /share/:token`).
- `POST /auth/verify` accepts the Google ID token in request payload (`googleIdToken`) and may also include bearer header.

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

## `POST /billing/portal/session`

Request:
```json
{
  "userId": "u_123",
  "returnUrl": "https://app.marginbase.com/settings"
}
```

Response:
```json
{
  "portalUrl": "https://billing.stripe.com/p/session/test_123"
}
```

## Share Snapshot Endpoints

### `POST /share/create`

Request:
```json
{
  "snapshot": {
    "schemaVersion": 1,
    "module": "profit",
    "inputData": {
      "scenarioName": "Q2 plan"
    },
    "currencyCode": "EUR"
  },
  "expiresInDays": 7,
  "ownerUserId": "u_123"
}
```

Response:
```json
{
  "token": "abc123",
  "expiresAt": "2026-03-11T00:00:00Z"
}
```

### `GET /share/:token`

Response:
```json
{
  "snapshot": {
    "schemaVersion": 1,
    "module": "profit",
    "inputData": {},
    "currencyCode": "EUR"
  }
}
```

### `DELETE /share/:token`

Response:
```json
{
  "revoked": true,
  "token": "abc123"
}
```

### `GET /share/list?userId=<ownerUserId>`

Response:
```json
{
  "items": [
    {
      "token": "abc123",
      "module": "profit",
      "createdAt": "2026-03-01T00:00:00Z",
      "expiresAt": "2026-03-11T00:00:00Z"
    }
  ]
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
