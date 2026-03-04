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

variable "stripe_secret_key" {
  type = string
}

variable "stripe_webhook_secret" {
  type = string
}

variable "stripe_mode" {
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

variable "tags" {
  type = map(string)
}