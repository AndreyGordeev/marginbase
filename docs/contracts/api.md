# API Contracts (v1)

Purpose: define a stable backend contract for clients and serverless services.

## Endpoints
- `POST /auth/verify`
- `GET /entitlements`
- `POST /telemetry/batch`
- `POST /billing/verify`

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
  "trial": {
    "active": true,
    "expiresAt": "2026-03-10T00:00:00Z"
  }
}
```
