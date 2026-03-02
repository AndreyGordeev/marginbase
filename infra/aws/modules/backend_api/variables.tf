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

variable "telemetry_bucket_name" {
  type = string
}

variable "telemetry_bucket_arn" {
  type = string
}

variable "google_client_ids" {
  type = string
}

variable "tags" {
  type = map(string)
}