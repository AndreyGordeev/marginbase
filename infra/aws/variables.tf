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

variable "api_cors_allowed_origins" {
  type        = list(string)
  description = "Allowed origins for API CORS responses. Use explicit origins, not wildcard, in production."
  default     = ["http://localhost:5173"]

  validation {
    condition = length(var.api_cors_allowed_origins) > 0
    error_message = "api_cors_allowed_origins must include at least one origin."
  }

  validation {
    condition = var.environment != "prod" || alltrue([
      for origin in var.api_cors_allowed_origins : origin != "*"
    ])
    error_message = "In prod, api_cors_allowed_origins must not contain '*'."
  }

  validation {
    condition = var.environment != "prod" || alltrue([
      for origin in var.api_cors_allowed_origins : startswith(origin, "https://")
    ])
    error_message = "In prod, api_cors_allowed_origins entries must start with 'https://'."
  }
}

variable "share_create_rate_limit" {
  type        = number
  description = "Steady-state requests/sec limit for POST /share/create route."
  default     = 5

  validation {
    condition     = var.share_create_rate_limit >= 1 && var.share_create_rate_limit <= 100
    error_message = "share_create_rate_limit must be between 1 and 100 requests/sec."
  }

  validation {
    condition     = var.environment != "prod" || var.share_create_rate_limit >= 3
    error_message = "In prod, share_create_rate_limit must be at least 3 requests/sec."
  }
}

variable "share_create_burst_limit" {
  type        = number
  description = "Burst limit for POST /share/create route."
  default     = 10

  validation {
    condition     = var.share_create_burst_limit >= 1 && var.share_create_burst_limit <= 500
    error_message = "share_create_burst_limit must be between 1 and 500."
  }

  validation {
    condition     = var.share_create_burst_limit >= var.share_create_rate_limit
    error_message = "share_create_burst_limit must be greater than or equal to share_create_rate_limit."
  }

  validation {
    condition     = var.share_create_burst_limit <= (var.share_create_rate_limit * 5)
    error_message = "share_create_burst_limit must be less than or equal to 5x share_create_rate_limit."
  }

  validation {
    condition     = var.environment != "prod" || var.share_create_burst_limit >= 6
    error_message = "In prod, share_create_burst_limit must be at least 6."
  }
}