variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "log_retention_days" {
  type = number
}

variable "entitlements_table_name" {
  type = string
}

variable "entitlements_table_arn" {
  type = string
}

variable "share_snapshots_table_name" {
  type = string
}

variable "share_snapshots_table_arn" {
  type = string
}

variable "telemetry_bucket_name" {
  type = string
}

variable "telemetry_bucket_arn" {
  type = string
}

variable "google_client_ids" {
  type = string
}

variable "google_tokeninfo_url" {
  type = string
}

variable "stripe_secret_key" {
  type = string
}

variable "stripe_webhook_secret" {
  type = string
}

variable "stripe_mode" {
  type = string
}

variable "stripe_price_profit" {
  type = string
}

variable "stripe_price_breakeven" {
  type = string
}

variable "stripe_price_cashflow" {
  type = string
}

variable "stripe_price_bundle" {
  type = string
}

variable "stripe_checkout_success_url" {
  type = string
}

variable "stripe_checkout_cancel_url" {
  type = string
}

variable "stripe_portal_return_url" {
  type = string
}

variable "api_cors_allowed_origins" {
  type = list(string)
}

variable "share_create_rate_limit" {
  type = number
}

variable "share_create_burst_limit" {
  type = number
}

variable "share_max_active_links_per_day" {
  type = number
}

variable "tags" {
  type = map(string)
}