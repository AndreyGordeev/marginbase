# AWS Lambda Migration Guide — From Stubs to Real Backend-Server

## Overview

This guide documents the migration of AWS Lambda handlers from stub implementations to the real `@marginbase/backend-server` package.

## Current State

- Location: `infra/aws/modules/backend_api/lambda_handlers/`
- Previous approach: Stub implementations in `lambda_stubs/` and partially real implementations in `lambda_handlers/`
- New approach: Lambda handlers delegate to real backend-server code with fallback to existing logic

## Files Created/Modified

### New Adapter Layer
- `express-adapter.js` — Converts Lambda HTTP API v2 events to Express request/response format

### Updated Handlers
- `auth.js` — Updated to delegate to real AuthService, with fallback to stub
- `billing-wrapper.js` — New comprehensive billing handler that delegates to real handlers
- `billing-new.js` — Alternative unified billing handler
- `auth-new.js` — Alternative auth handler
- `entitlements-new.js` — Alternative entitlements handler

### Build Script
- `../scripts/build-lambda-handlers.cjs` — Compiles backend-server and prepares Lambda environment

## Deployment Options

### Option 1: Using Lambda Layers (Recommended for Production)

1. **Compile backend-server:**
   ```bash
   corepack pnpm --filter @marginbase/backend-server build
   ```

2. **Create Lambda Layer package:**
   ```bash
   cd packages/backend-server/dist
   mkdir -p nodejs/node_modules/@marginbase/backend-server
   cp -r . nodejs/node_modules/@marginbase/backend-server
   zip -r backend-server-layer.zip nodejs
   ```

3. **Upload as Lambda Layer:**
   ```bash
   aws lambda publish-layer-version \
     --layer-name marginbase-backend-server \
     --zip-file fileb://backend-server-layer.zip \
     --compatible-runtimes nodejs20.x
   ```

4. **Attach to Lambda functions in Terraform:**
   ```hcl
   resource "aws_lambda_function" "auth" {
     # ... existing config ...
     layers = [aws_lambda_layer_version.backend_server.arn]
   }
   ```

### Option 2: Bundling with Lambda Code

1. **Run build script before Terraform apply:**
   ```bash
   node infra/aws/scripts/build-lambda-handlers.cjs
   ```

2. **Include node_modules in Lambda zip via Terraform:**
   ```hcl
   data "archive_file" "billing_lambda" {
     type        = "zip"
     source_dir  = "${path.module}/lambda_handlers"
     output_path = "${path.module}/dist/billing.zip"
   }
   ```

   The archive will include:
   - `lambda_handlers/*.js` (handler code)
   - `lambda_handlers/node_modules/` (dependencies)

### Option 3: Container-Based Lambda (Advanced)

Deploy as Docker image with backend-server pre-installed:

```dockerfile
FROM public.ecr.aws/lambda/nodejs:20

COPY infra/aws/modules/backend_api/lambda_handlers/ ${LAMBDA_TASK_ROOT}/
COPY packages/backend-server/dist/ ${LAMBDA_TASK_ROOT}/node_modules/@marginbase/backend-server/

CMD ["auth.handler"]
```

## Terraform Configuration Updates

### Required: Include Lambda dependency on backend-server

Add to `main.tf`:

```hcl
# Ensure backend-server is compiled before Lambda archiving
resource "null_resource" "build_backend_server" {
  provisioner "local-exec" {
    command = "node ${path.module}/../../scripts/build-lambda-handlers.cjs"
  }
  triggers = {
    backend_server_hash = filemd5("${path.module}/../../packages/backend-server/src/index.ts")
  }
}

# Add dependency to auth Lambda
resource "aws_lambda_function" "auth" {
  depends_on = [null_resource.build_backend_server]
  # ... rest of config ...
}

# Add dependency to billing Lambda
resource "aws_lambda_function" "billing" {
  depends_on = [null_resource.build_backend_server]
  # ... rest of config ...
}
```

### Environment Variables (Updated)

Ensure these are set for real backend behavior:

```hcl
environment {
  variables = {
    # Development/Production marker
    ENVIRONMENT                 = var.environment

    # Google OAuth
    GOOGLE_CLIENT_IDS           = var.google_client_ids
    GOOGLE_TOKENINFO_URL        = "https://oauth2.googleapis.com/tokeninfo"

    # Stripe (optional for dev mode)
    STRIPE_SECRET_KEY           = var.stripe_secret_key  # If not set, uses DevBillingProvider
    STRIPE_WEBHOOK_SECRET       = var.stripe_webhook_secret
    STRIPE_PRICE_PROFIT         = var.stripe_price_profit
    STRIPE_PRICE_BREAKEVEN      = var.stripe_price_breakeven
    STRIPE_PRICE_CASHFLOW       = var.stripe_price_cashflow
    STRIPE_PRICE_BUNDLE         = var.stripe_price_bundle

    # Stripe URLs
    STRIPE_CHECKOUT_SUCCESS_URL = var.stripe_checkout_success_url
    STRIPE_CHECKOUT_CANCEL_URL  = var.stripe_checkout_cancel_url
    STRIPE_PORTAL_RETURN_URL    = var.stripe_portal_return_url

    # Data persistence
    ENTITLEMENTS_TABLE_NAME     = var.entitlements_table_name
  }
}
```

## Handler Signatures

All handlers follow this pattern:

### Before (Stub Only)
```javascript
// Just basic stub logic
const verifyToken = (token) => { /* stub */ };

exports.handler = async (event) => {
  const result = verifyToken(event);
  return response(200, result);
};
```

### After (Real Backend with Fallback)
```javascript
// Import real service if available
let AuthService;
try {
  AuthService = require('@marginbase/backend-server').AuthService;
} catch (error) {
  console.warn('Backend not available, using stub');
}

// Create adapter for Express format
const { createExpressRequest, createExpressResponse } = require('./express-adapter');

exports.handler = async (event) => {
  const service = AuthService ? new AuthService() : createStubService();
  const handler = requireAuthHandler ? handler(service) : createStubHandler(service);

  // Convert Lambda event to Express
  const req = createExpressRequest(event);
  const res = createExpressResponse();

  // Call real handler
  await handler(req, res);

  // Convert back to Lambda response
  return formatLambdaResponse(res);
};
```

## Routes Covered

✅ **Authentication**
- `POST /auth/verify` → Real AuthService

✅ **Billing**
- `POST /billing/checkout/session` → Real BillingService
- `POST /billing/checkout-session` (alias) → Real BillingService
- `POST /billing/portal-session` → Real BillingService
- `POST /billing/webhook/stripe` → Real BillingService (with idempotency)
- `POST /billing/verify` → Real BillingService
- `GET /billing/entitlements/:userId` → Real EntitlementService

✅ **Fallback Support**
- If real backend not available, handlers fall back to existing stub logic
- Ensures backward compatibility during deployment

## Stub Files (No Longer Used)

The following files in `infra/aws/modules/backend_api/lambda_stubs/` are now unused but preserved:
- `auth.js` → Replaced by real AuthService
- `billing.js` → Replaced by real BillingService
- `entitlements.js` → Replaced by real EntitlementService
- `account-delete.js` → Still uses backup logic
- `share-*.js` → Still use backup logic
- `telemetry.js` → Still uses backup logic

These can be archived but are kept as reference.

## Deployment Checklist

- [ ] Compile backend-server: `pnpm --filter @marginbase/backend-server build`
- [ ] Build Lambda handlers: `node infra/aws/scripts/build-lambda-handlers.cjs`
- [ ] Run Lambda tests locally: `npm test` in handler directory
- [ ] Update Terraform with backend-server dependency
- [ ] Configure Lambda Layer (Option 1) or bundle with code (Option 2)
- [ ] Deploy with Terraform: `terraform apply`
- [ ] Test endpoints: `/auth/verify`, `/billing/checkout/session`, etc.
- [ ] Verify CloudWatch logs show real backend being used
- [ ] Monitor error rates and latency

## Fallback Behavior

If deployment does not include the compiled backend-server:

1. Lambda handlers will log: `[STUB MODE] Backend-server not available`
2. All handlers fall back to existing stub implementations
3. Stripe operations will return mock responses (no real transactions)
4. App will be functional for testing but not production-ready

To force production mode:
1. Ensure `@marginbase/backend-server` is in Lambda's `node_modules`
2. Verify `STRIPE_SECRET_KEY` is set (or `DevBillingProvider` is active)
3. Check CloudWatch logs for `Backend-server loaded` message

## Troubleshooting

### "Backend-server not available" in logs

**Causes:**
- NodeModules not included in Lambda zip
- Path to backend-server incorrect
- Backend-server not compiled

**Solutions:**
1. Verify backend-server dist exists: `ls packages/backend-server/dist/index.js`
2. Rebuild: `pnpm --filter @marginbase/backend-server build`
3. Run build script again: `node infra/aws/scripts/build-lambda-handlers.cjs`
4. Check Lambda-layer configuration in Terraform

### Stripe operations not working

**Causes:**
- `STRIPE_SECRET_KEY` not configured
- `STRIPE_WEBHOOK_SECRET` missing
- Stripe environment mode wrong

**Solutions:**
1. Check environment variables are set in Terraform
2. Verify Stripe credentials are correct
3. If testing, use `DevBillingProvider` (no credentials needed)

### Lambda timeout

**Causes:**
- First invocation (cold start) is slow due to backend-server initialization
- Backend-server has large dependencies

**Solutions:**
1. Increase Lambda timeout to 30s minimum
2. Use Lambda provisioned concurrency to avoid cold starts
3. Use Lambda container image for better initialization control

## Monitoring

Enable CloudWatch logging to track backend usage:

```hcl
resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-auth"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "billing" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-billing"
  retention_in_days = var.log_retention_days
}
```

Check logs for:
- `✓ Using real AuthService` — Real backend is running
- `[STUB MODE] Backend-server not available` — Fallback active
- `Webhook idempotency check` — Webhook processing
- `Error` warnings — Implementation issues

## Future Work

1. **Lambda Layer management** — Create separate layer versioning
2. **Cold start optimization** — Consider ESM vs CommonJS
3. **Monitoring** — Add X-Ray tracing for backend calls
4. **Error handling** — Implement retry logic for Stripe failures
5. **Webhook persistence** — Store idempotency keys in DynamoDB

## References

- Backend-server: `packages/backend-server/`
- Current handlers: `infra/aws/modules/backend_api/lambda_handlers/`
- Terraform config: `infra/aws/modules/backend_api/main.tf`
- Express adapter: `infra/aws/modules/backend_api/lambda_handlers/express-adapter.js`
