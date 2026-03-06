# @marginbase/backend-server

Backend API server for MarginBase with authentication, billing, and entitlements.

## Environment Configuration

### Authentication

- `GOOGLE_CLIENT_IDS` - Comma-separated list of allowed Google OAuth client IDs
- `GOOGLE_VERIFICATION_MODE` - `tokeninfo` (default, production) or `development`
- `GOOGLE_TOKENINFO_URL` - Google tokeninfo endpoint (defaults to production)

### Billing Provider Architecture

The server uses a **provider abstraction** for billing operations, allowing it to work without Stripe credentials in development/test environments.

#### Provider Selection (Automatic)

**Live Stripe Provider** (when `STRIPE_SECRET_KEY` is set):

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PROFIT=price_...
STRIPE_PRICE_BREAKEVEN=price_...
STRIPE_PRICE_CASHFLOW=price_...
STRIPE_PRICE_BUNDLE=price_...
STRIPE_CHECKOUT_SUCCESS_URL=https://app.marginbase.com/?checkout=success
STRIPE_CHECKOUT_CANCEL_URL=https://app.marginbase.com/?checkout=cancel
STRIPE_PORTAL_RETURN_URL=https://app.marginbase.com/#/settings
```

**Dev Provider** (when `STRIPE_SECRET_KEY` is NOT set):

- Returns mock checkout URLs (`https://checkout.stripe.dev?...`)
- Returns mock portal URLs (`https://billing.stripe.dev?...`)
- Accepts all webhook signatures (no verification)
- Suitable for local development and CI/CD without credentials

#### Billing Provider Interface

```typescript
interface BillingProvider {
  createCheckoutSession(params: {
    priceId: string;
    userId: string;
    email: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;

  createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    secret: string,
  ): boolean;
}
```

### Server Configuration

- `CORS_ALLOWED_ORIGINS` - Comma-separated allowed origins (defaults to localhost)
- `PORT` - Server port (optional, defaults to dynamic)

## API Endpoints

### Authentication

- `POST /auth/verify` - Verify Google ID token, create/update user session

### Entitlements

- `GET /entitlements` - Get user entitlements (requires Bearer token)

### Billing

- `POST /billing/checkout/session` - Create Stripe checkout session
- `POST /billing/portal-session` - Create Stripe billing portal session
- `POST /billing/webhook/stripe` - Stripe webhook handler (with signature verification)
- `POST /billing/webhook` - Alias for `/billing/webhook/stripe`
- `POST /billing/verify` - Verify mobile store purchases (iOS/Android)

### Account

- `POST /account/delete` - Delete user account and associated data

### Share

- `POST /share/create` - Create shareable scenario snapshot
- `GET /share/:token` - Retrieve shared scenario
- `GET /share` - List user's shared scenarios
- `DELETE /share/:token` - Delete shared scenario

### Telemetry

- `POST /telemetry/batch` - Submit batched telemetry events

### Health

- `GET /health` - Health check endpoint

## Development

### Without Stripe Credentials (Default)

```bash
corepack pnpm install
corepack pnpm --filter @marginbase/backend-server dev
```

Console output: `⚠️  Using DEV billing provider (Stripe credentials not configured)`

### With Stripe Credentials

```bash
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...
corepack pnpm --filter @marginbase/backend-server dev
```

Console output: `🔐 Using LIVE Stripe billing provider`

## Testing

Tests run with **DevBillingProvider** by default (no credentials required):

```bash
corepack pnpm --filter @marginbase/backend-server test
```

To test with live Stripe credentials:

```bash
STRIPE_SECRET_KEY=sk_test_... corepack pnpm --filter @marginbase/backend-server test
```

## Architecture Notes

- **In-memory storage** - Current implementation uses Map/Set for development. Production deployment requires DynamoDB/RDS integration.
- **Idempotent webhooks** - Webhook events are tracked to prevent duplicate processing.
- **Graceful degradation** - Missing Stripe credentials trigger dev provider, not errors.
- **Provider pattern** - Billing logic abstracted behind interface for testability and flexibility.

## Deployment

1. Configure all required environment variables in deployment environment
2. Ensure `STRIPE_SECRET_KEY` is set for production billing
3. Configure webhook endpoint in Stripe Dashboard → point to `POST /billing/webhook/stripe`
4. Verify webhook secret matches `STRIPE_WEBHOOK_SECRET` environment variable
5. Replace in-memory storage with persistent backend (DynamoDB recommended for AWS Lambda)

## Security

- **JWT verification** - Google ID tokens verified via tokeninfo endpoint or local decode in dev mode
- **Webhook signatures** - Stripe webhook signatures verified with HMAC-SHA256 and timing-safe comparison
- **CORS** - Configurable allowed origins
- **Bearer tokens** - All authenticated endpoints require Authorization header
- **Entitlement gating** - Backend enforces module access based on subscription status
