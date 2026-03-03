variable "project_name" {
  type        = string
  description = "Logical project name used in resource naming."
  default     = "marginbase"
}

variable "environment" {
  type        = string
  description = "Deployment environment name."
  default     = "dev"
}

variable "aws_region" {
  type        = string
  description = "AWS region for all infrastructure. Must be EU region."
  default     = "eu-central-1"

  validation {
    condition     = startswith(var.aws_region, "eu-")
    error_message = "aws_region must be an EU region (eu-*)."
  }
}

variable "lambda_log_retention_days" {
  type        = number
  description = "CloudWatch log retention for Lambda logs."
  default     = 14
}

variable "telemetry_retention_days" {
  type        = number
  description = "Raw telemetry S3 lifecycle retention days."
  default     = 30
}

variable "google_client_ids" {
  type        = string
  description = "Comma-separated allowed Google OAuth client IDs for /auth/verify."
  default     = ""
}

variable "stripe_secret_key" {
  type        = string
  description = "Stripe secret key used by billing handlers."
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  type        = string
  description = "Stripe webhook signing secret for /billing/webhook/stripe verification."
  default     = ""
  sensitive   = true
}

variable "stripe_mode" {
  type        = string
  description = "Stripe environment mode: test or live."
  default     = "test"

  validation {
    condition     = contains(["test", "live"], var.stripe_mode)
    error_message = "stripe_mode must be either 'test' or 'live'."
  }
}