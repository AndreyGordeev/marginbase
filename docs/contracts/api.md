# API Contracts (v1)

**Version:** 1.1 (Phase 4 OAuth + Billing)
**Last Updated:** 2026-03-05
**Status:** Production-Ready with Mock Server

Purpose: define a stable backend contract for clients and serverless services.

## Endpoints

- `POST /auth/verify`
- `GET /entitlements`
- `POST /telemetry/batch`
- `POST /billing/checkout/session`
- `POST /billing/checkout-session` (alias)
- `POST /billing/portal-session`
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
- Explicit exception: share flow on `/share/*` is allowed only as encrypted snapshot payload generated client-side from sanitized data
- Share snapshot plaintext must not be sent to backend; backend stores encrypted payload + expiry/owner metadata only
- Errors must return stable codes

## Auth / Headers (Phase 4: Google OAuth 2.0)

- `Authorization: Bearer <idToken>` is required for authenticated endpoints (for example `GET /entitlements`, `DELETE /share/:token`).
- `POST /auth/verify` accepts the Google ID token in request payload (`idToken`) and returns verified user profile.
- Google ID tokens obtained via `GoogleOAuthService` library loaded client-side.

## `POST /auth/verify` (NEW)

Verifies Google ID token and returns user profile for session creation.

Request:

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "nonce": "optional_csrf_nonce"
}
```

Response (200):

```json
{
  "userId": "user_google_oauth2_xyz",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://lh3.googleusercontent.com/...",
  "emailVerified": true,
  "aud": "app_client_id.apps.googleusercontent.com",
  "iss": "https://accounts.google.com"
}
```

Error (401):

```json
{
  "error": "invalid_token",
  "message": "Token verification failed: signature mismatch"
}
```

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

Compatibility alias: `POST /billing/checkout-session` maps to the same handler and request/response schema.

Request:

```json
{
  "planId": "bundle",
  "successUrl": "https://marginbase.app/?checkout=success",
  "cancelUrl": "https://marginbase.app/?checkout=canceled"
}
```

Response:

```json
{
  "sessionId": "cs_test_abc123",
  "url": "https://checkout.stripe.com/pay/cs_test_abc123",
  "clientSecret": "csi_test_xyz"
}
```

Client action: Redirect to `url` to complete Stripe checkout.

## `POST /billing/webhook/stripe` (NEW - Phase 4)

Webhook handler for Stripe events. Endpoint is **idempotent** — duplicate events with same `id` within 24h are ignored.

Request Headers:

```
Stripe-Signature: t=<timestamp>,v1=<hmac_signature>
```

Event Types Processed:

- `checkout.session.completed`: Purchase successful → activate subscription (`bundle`)
- `customer.subscription.updated`: Subscription changed → sync entitlements
- `customer.subscription.deleted`: Subscription canceled → mark as expired
- Other types: Acknowledged but not processed (no error)

Example Request (checkout.session.completed):

```json
{
  "id": "evt_1ABC123",
  "type": "checkout.session.completed",
  "created": 1646476496,
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "customer": "cus_test_xyz",
      "customer_email": "user@example.com",
      "metadata": {
        "userId": "user_google_oauth2_xyz",
        "planId": "bundle"
      },
      "payment_status": "paid",
      "subscription": "sub_abc123"
    }
  }
}
```

Response (200):

```json
{
  "received": true,
  "eventId": "evt_1ABC123",
  "status": "processed"
}
```

**Idempotency:** Same event ID processed only once within 24h. Duplicate webhook delivery returns 200 immediately.

## `POST /billing/portal-session`

Request:

```json
{
  "returnUrl": "https://marginbase.app/settings"
}
```

Headers:

```
Authorization: Bearer <google_id_token>
```

Response:

```json
{
  "url": "https://billing.stripe.com/session/examplekey"
}
```

Client action: Redirect to `url` for billing management (update payment method, cancel subscription, view invoices).

## Share Snapshot Endpoints

### `POST /share/create`

Request:

```json
{
  "encryptedSnapshot": {
    "schemaVersion": 1,
    "algorithm": "A256GCM",
    "ivBase64Url": "m2s6KQ4YkR2H9d8X",
    "ciphertextBase64Url": "n4L..."
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
  "encryptedSnapshot": {
    "schemaVersion": 1,
    "algorithm": "A256GCM",
    "ivBase64Url": "m2s6KQ4YkR2H9d8X",
    "ciphertextBase64Url": "n4L..."
  }
}
```

Client decryption key transport:

- The decryption key is carried in URL fragment only, for example `/s/<token>#k=<base64url-key>`.
- URL fragment is not sent to backend, so backend stores only encrypted blob + expiry metadata.

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
