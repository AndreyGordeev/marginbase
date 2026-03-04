terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "data" {
  source = "./modules/data"

  project_name             = var.project_name
  environment              = var.environment
  telemetry_retention_days = var.telemetry_retention_days
  tags                     = local.common_tags
}

module "web_hosting" {
  source = "./modules/web_hosting"

  project_name = var.project_name
  environment  = var.environment
  tags         = local.common_tags
}

module "backend_api" {
  source = "./modules/backend_api"

  project_name            = var.project_name
  environment             = var.environment
  aws_region              = var.aws_region
  log_retention_days      = var.lambda_log_retention_days
  entitlements_table_name = module.data.entitlements_table_name
  entitlements_table_arn  = module.data.entitlements_table_arn
  share_snapshots_table_name = module.data.share_snapshots_table_name
  share_snapshots_table_arn  = module.data.share_snapshots_table_arn
  telemetry_bucket_name   = module.data.telemetry_bucket_name
  telemetry_bucket_arn    = module.data.telemetry_bucket_arn
  google_client_ids       = var.google_client_ids
  stripe_secret_key       = var.stripe_secret_key
  stripe_webhook_secret   = var.stripe_webhook_secret
  stripe_mode             = var.stripe_mode
  api_cors_allowed_origins = var.api_cors_allowed_origins
  share_create_rate_limit  = var.share_create_rate_limit
  share_create_burst_limit = var.share_create_burst_limit
  tags                    = local.common_tags
}