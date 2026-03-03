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

4. Apply:

   - `terraform apply dev.tfplan`

5. Retrieve outputs:

   - `terraform output`

## Destroy

- `terraform destroy`

## Notes

- Lambda handlers are deployment stubs under `modules/backend_api/lambda_stubs`.
- Stripe integration uses Terraform variables `stripe_secret_key`, `stripe_webhook_secret`, and `stripe_mode`.
- Telemetry payload persistence is designed for time-partitioned object keys in application layer.
- Scenario financial values are not stored in AWS resources.