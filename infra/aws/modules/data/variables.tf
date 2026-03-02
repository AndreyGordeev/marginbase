variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "telemetry_retention_days" {
  type = number
}

variable "tags" {
  type = map(string)
}