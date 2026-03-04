# MarginBase AWS Dev Infrastructure (Step 10)

This folder contains Terraform modules to provision the Step 10 dev environment in AWS EU regions.

## Provisioned resources

- Web hosting: private S3 bucket + CloudFront (HTTPS redirect + SPA fallback to `/index.html`)
- API layer: HTTP API Gateway with routes:
  - `POST /auth/verify`
  - `GET /entitlements`
   - `POST /share/create`
   - `GET /share/list`
   - `GET /share/{token}`
   - `DELETE /share/{token}`
   - `POST /billing/verify`
   - `POST /billing/checkout/session`
   - `POST /billing/checkout-session` (alias)
   - `POST /billing/portal-session`
   - `POST /billing/webhook/stripe`
  - `POST /telemetry/batch`
- Compute: Lambda stubs (`auth`, `entitlements`, `billing`, `telemetry`, `account-delete`, `share-create`, `share-get`, `share-delete`, `share-list`)
- Data: DynamoDB entitlements table + DynamoDB share snapshots table (TTL on `expiresAt`, owner listing GSI `ownerUserIdHash-createdAt-index`) + S3 telemetry raw bucket with lifecycle retention
- Observability: CloudWatch log groups with configurable retention

## Region policy

`aws_region` is validated to EU-only (`eu-*`) in `variables.tf`.

## Deploy (dev)

1. Copy variable template:

   - `cp terraform.tfvars.example terraform.tfvars`

2. Initialize:

   - `terraform init`

3. Validate + plan:

   - `terraform validate`
   - `terraform plan -out dev.tfplan`

4. Configure Stripe for this environment:

   - set `stripe_secret_key`, `stripe_webhook_secret`, `stripe_mode` in `terraform.tfvars`
   - set `stripe_price_profit`, `stripe_price_breakeven`, `stripe_price_cashflow`, `stripe_price_bundle`
   - set `stripe_checkout_success_url`, `stripe_checkout_cancel_url`, `stripe_portal_return_url`
   - add Stripe webhook endpoint `${api_base_url}/billing/webhook/stripe`
   - subscribe webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

5. Apply:

   - `terraform apply dev.tfplan`

6. Retrieve outputs:

   - `terraform output`

## Destroy

- `terraform destroy`

## Notes

- Lambda handlers are deployment stubs under `modules/backend_api/lambda_stubs`.
- API CORS allowlist is configured via `api_cors_allowed_origins` (use explicit domains in production).
- In `environment=prod`, CORS validation enforces non-empty `api_cors_allowed_origins`, forbids `*`, and requires `https://` origins.
- `POST /share/create` has dedicated throttling via `share_create_rate_limit` and `share_create_burst_limit`.
- `POST /share/create` also enforces per-owner daily active link cap via `share_max_active_links_per_day`.
- Stripe webhook failures emit `billing_webhook_failure` log markers and are tracked by a dedicated CloudWatch metric filter + alarm (`billing-webhook-failures`).
- Throttling validation enforces `share_create_rate_limit` in `1..100`, `share_create_burst_limit` in `1..500`, and `burst >= rate`.
- Throttling validation also enforces `share_create_burst_limit <= 5 * share_create_rate_limit`.
- In `environment=prod`, throttling validation also enforces `share_create_rate_limit >= 3` and `share_create_burst_limit >= 6`.
- Stripe integration uses Terraform variables `stripe_secret_key`, `stripe_webhook_secret`, `stripe_mode`, Stripe plan price IDs, and checkout/portal return URLs.
- Stripe test-mode E2E checklist is documented in `docs/testing/stripe-test-mode-e2e.md`.
- Production sign-off evidence template is documented in `docs/testing/stripe-production-readiness-evidence.md`.
- Telemetry payload persistence is designed for time-partitioned object keys in application layer.
- Scenario financial values are not stored in AWS resources.