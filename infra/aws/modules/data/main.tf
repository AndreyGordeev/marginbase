data "aws_caller_identity" "current" {}

resource "aws_dynamodb_table" "entitlements" {
  name         = "${var.project_name}-${var.environment}-entitlements"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = var.tags
}

resource "aws_s3_bucket" "telemetry" {
  bucket = "${var.project_name}-${var.environment}-${data.aws_caller_identity.current.account_id}-telemetry-raw"
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "telemetry" {
  bucket = aws_s3_bucket.telemetry.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "telemetry" {
  bucket = aws_s3_bucket.telemetry.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "telemetry" {
  bucket = aws_s3_bucket.telemetry.id

  rule {
    id     = "telemetry-expiration"
    status = "Enabled"

    filter {}

    expiration {
      days = var.telemetry_retention_days
    }
  }
}