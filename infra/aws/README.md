# MarginBase AWS Dev Infrastructure (Step 10)

This folder contains Terraform modules to provision the Step 10 dev environment in AWS EU regions.

## Provisioned resources

- Web hosting: private S3 bucket + CloudFront (HTTPS redirect + SPA fallback to `/index.html`)
- API layer: HTTP API Gateway with routes:
  - `POST /auth/verify`
  - `GET /entitlements`
   - `POST /billing/verify`
   - `POST /billing/checkout/session`
   - `POST /billing/webhook/stripe`
  - `POST /telemetry/batch`
- Compute: 4 Lambda stubs (`auth`, `entitlements`, `billing`, `telemetry`)
- Data: DynamoDB entitlements table + S3 telemetry raw bucket with lifecycle retention
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
- Stripe integration uses Terraform variables `stripe_secret_key`, `stripe_webhook_secret`, and `stripe_mode`.
- Stripe test-mode E2E checklist is documented in `docs/testing/stripe-test-mode-e2e.md`.
- Production sign-off evidence template is documented in `docs/testing/stripe-production-readiness-evidence.md`.
- Telemetry payload persistence is designed for time-partitioned object keys in application layer.
- Scenario financial values are not stored in AWS resources.