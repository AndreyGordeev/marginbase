output "entitlements_table_name" {
  value = aws_dynamodb_table.entitlements.name
}

output "entitlements_table_arn" {
  value = aws_dynamodb_table.entitlements.arn
}

output "telemetry_bucket_name" {
  value = aws_s3_bucket.telemetry.bucket
}

output "telemetry_bucket_arn" {
  value = aws_s3_bucket.telemetry.arn
}