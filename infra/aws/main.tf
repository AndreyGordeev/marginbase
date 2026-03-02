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
  log_retention_days      = var.lambda_log_retention_days
  entitlements_table_name = module.data.entitlements_table_name
  entitlements_table_arn  = module.data.entitlements_table_arn
  telemetry_bucket_name   = module.data.telemetry_bucket_name
  telemetry_bucket_arn    = module.data.telemetry_bucket_arn
  tags                    = local.common_tags
}