output "web_bucket_name" {
  value = aws_s3_bucket.web_assets.bucket
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.web.domain_name
}