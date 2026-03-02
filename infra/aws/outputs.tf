output "web_bucket_name" {
  value       = module.web_hosting.web_bucket_name
  description = "S3 bucket for static web assets."
}

output "cloudfront_domain_name" {
  value       = module.web_hosting.cloudfront_domain_name
  description = "CloudFront domain for SPA delivery."
}

output "http_api_url" {
  value       = module.backend_api.http_api_url
  description = "HTTP API base URL."
}

output "entitlements_table_name" {
  value       = module.data.entitlements_table_name
  description = "DynamoDB table used for entitlement records."
}

output "telemetry_bucket_name" {
  value       = module.data.telemetry_bucket_name
  description = "S3 bucket used for raw telemetry batches."
}