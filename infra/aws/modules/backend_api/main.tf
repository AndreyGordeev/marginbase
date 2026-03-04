data "archive_file" "auth_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/auth.zip"
}

data "archive_file" "entitlements_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/entitlements.zip"
}

data "archive_file" "telemetry_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/telemetry.zip"
}

data "archive_file" "billing_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/billing.zip"
}

data "archive_file" "account_delete_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/account-delete.zip"
}

data "archive_file" "share_create_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/share-create.zip"
}

data "archive_file" "share_get_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/share-get.zip"
}

data "archive_file" "share_delete_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/share-delete.zip"
}

data "archive_file" "share_list_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_stubs"
  output_path = "${path.module}/dist/share-list.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "${var.project_name}-${var.environment}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = var.tags
}

resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-auth"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "entitlements" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-entitlements"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "telemetry" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-telemetry"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "billing" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-billing"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "account_delete" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-account-delete"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "share_create" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-share-create"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "share_get" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-share-get"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "share_delete" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-share-delete"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "share_list" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-share-list"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

data "aws_iam_policy_document" "lambda_access" {
  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.auth.arn}:*",
      "${aws_cloudwatch_log_group.entitlements.arn}:*",
      "${aws_cloudwatch_log_group.telemetry.arn}:*",
      "${aws_cloudwatch_log_group.billing.arn}:*",
      "${aws_cloudwatch_log_group.account_delete.arn}:*",
      "${aws_cloudwatch_log_group.share_create.arn}:*",
      "${aws_cloudwatch_log_group.share_get.arn}:*",
      "${aws_cloudwatch_log_group.share_delete.arn}:*",
      "${aws_cloudwatch_log_group.share_list.arn}:*"
    ]
  }

  statement {
    sid    = "AllowEntitlementsTable"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query"
    ]
    resources = [var.entitlements_table_arn]
  }

  statement {
    sid    = "AllowShareSnapshotsTable"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
    resources = [
      var.share_snapshots_table_arn,
      "${var.share_snapshots_table_arn}/index/*"
    ]
  }

  statement {
    sid    = "AllowTelemetryBucketWrite"
    effect = "Allow"
    actions = [
      "s3:PutObject"
    ]
    resources = ["${var.telemetry_bucket_arn}/*"]
  }
}

resource "aws_iam_role_policy" "lambda_access" {
  name   = "${var.project_name}-${var.environment}-lambda-access"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_access.json
}

resource "aws_lambda_function" "auth" {
  function_name    = "${var.project_name}-${var.environment}-auth"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "auth.handler"
  filename         = data.archive_file.auth_lambda.output_path
  source_code_hash = data.archive_file.auth_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT       = var.environment
      GOOGLE_CLIENT_IDS = var.google_client_ids
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "entitlements" {
  function_name    = "${var.project_name}-${var.environment}-entitlements"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "entitlements.handler"
  filename         = data.archive_file.entitlements_lambda.output_path
  source_code_hash = data.archive_file.entitlements_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT             = var.environment
      ENTITLEMENTS_TABLE_NAME = var.entitlements_table_name
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "telemetry" {
  function_name    = "${var.project_name}-${var.environment}-telemetry"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "telemetry.handler"
  filename         = data.archive_file.telemetry_lambda.output_path
  source_code_hash = data.archive_file.telemetry_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT           = var.environment
      TELEMETRY_BUCKET_NAME = var.telemetry_bucket_name
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "billing" {
  function_name    = "${var.project_name}-${var.environment}-billing"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "billing.handler"
  filename         = data.archive_file.billing_lambda.output_path
  source_code_hash = data.archive_file.billing_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT             = var.environment
      ENTITLEMENTS_TABLE_NAME = var.entitlements_table_name
      STRIPE_SECRET_KEY       = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET   = var.stripe_webhook_secret
      STRIPE_MODE             = var.stripe_mode
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "account_delete" {
  function_name    = "${var.project_name}-${var.environment}-account-delete"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "account-delete.handler"
  filename         = data.archive_file.account_delete_lambda.output_path
  source_code_hash = data.archive_file.account_delete_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT             = var.environment
      ENTITLEMENTS_TABLE_NAME = var.entitlements_table_name
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "share_create" {
  function_name    = "${var.project_name}-${var.environment}-share-create"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "share-create.handler"
  filename         = data.archive_file.share_create_lambda.output_path
  source_code_hash = data.archive_file.share_create_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT                = var.environment
      SHARE_SNAPSHOTS_TABLE_NAME = var.share_snapshots_table_name
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "share_get" {
  function_name    = "${var.project_name}-${var.environment}-share-get"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "share-get.handler"
  filename         = data.archive_file.share_get_lambda.output_path
  source_code_hash = data.archive_file.share_get_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT                = var.environment
      SHARE_SNAPSHOTS_TABLE_NAME = var.share_snapshots_table_name
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "share_delete" {
  function_name    = "${var.project_name}-${var.environment}-share-delete"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "share-delete.handler"
  filename         = data.archive_file.share_delete_lambda.output_path
  source_code_hash = data.archive_file.share_delete_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT                = var.environment
      SHARE_SNAPSHOTS_TABLE_NAME = var.share_snapshots_table_name
    }
  }

  tags = var.tags
}

resource "aws_lambda_function" "share_list" {
  function_name    = "${var.project_name}-${var.environment}-share-list"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  handler          = "share-list.handler"
  filename         = data.archive_file.share_list_lambda.output_path
  source_code_hash = data.archive_file.share_list_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT                = var.environment
      SHARE_SNAPSHOTS_TABLE_NAME = var.share_snapshots_table_name
      SHARE_OWNER_INDEX_NAME     = "ownerUserIdHash-createdAt-index"
    }
  }

  tags = var.tags
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-${var.environment}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.api_cors_allowed_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 3600
  }

  tags          = var.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
  tags        = var.tags

  default_route_settings {
    throttling_rate_limit  = 50
    throttling_burst_limit = 100
  }

  route_settings {
    route_key              = "POST /share/create"
    throttling_rate_limit  = var.share_create_rate_limit
    throttling_burst_limit = var.share_create_burst_limit
  }

  route_settings {
    route_key              = "GET /share/{token}"
    throttling_rate_limit  = 25
    throttling_burst_limit = 50
  }
}

resource "aws_apigatewayv2_integration" "auth" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "entitlements" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.entitlements.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "telemetry" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.telemetry.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "billing" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.billing.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "account_delete" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.account_delete.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "share_create" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.share_create.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "share_get" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.share_get.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "share_delete" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.share_delete.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "share_list" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.share_list.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "auth_verify" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /auth/verify"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "entitlements" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /entitlements"
  target    = "integrations/${aws_apigatewayv2_integration.entitlements.id}"
}

resource "aws_apigatewayv2_route" "telemetry_batch" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /telemetry/batch"
  target    = "integrations/${aws_apigatewayv2_integration.telemetry.id}"
}

resource "aws_apigatewayv2_route" "billing_verify" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /billing/verify"
  target    = "integrations/${aws_apigatewayv2_integration.billing.id}"
}

resource "aws_apigatewayv2_route" "billing_checkout_session" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /billing/checkout/session"
  target    = "integrations/${aws_apigatewayv2_integration.billing.id}"
}

resource "aws_apigatewayv2_route" "billing_webhook_stripe" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /billing/webhook/stripe"
  target    = "integrations/${aws_apigatewayv2_integration.billing.id}"
}

resource "aws_apigatewayv2_route" "account_delete" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /account/delete"
  target    = "integrations/${aws_apigatewayv2_integration.account_delete.id}"
}

resource "aws_apigatewayv2_route" "share_create" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /share/create"
  target    = "integrations/${aws_apigatewayv2_integration.share_create.id}"
}

resource "aws_apigatewayv2_route" "share_get" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /share/{token}"
  target    = "integrations/${aws_apigatewayv2_integration.share_get.id}"
}

resource "aws_apigatewayv2_route" "share_delete" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "DELETE /share/{token}"
  target    = "integrations/${aws_apigatewayv2_integration.share_delete.id}"
}

resource "aws_apigatewayv2_route" "share_list" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /share/list"
  target    = "integrations/${aws_apigatewayv2_integration.share_list.id}"
}

resource "aws_lambda_permission" "allow_apigw_auth" {
  statement_id  = "AllowInvokeFromHttpApiAuth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_entitlements" {
  statement_id  = "AllowInvokeFromHttpApiEntitlements"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.entitlements.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_telemetry" {
  statement_id  = "AllowInvokeFromHttpApiTelemetry"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.telemetry.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_billing" {
  statement_id  = "AllowInvokeFromHttpApiBilling"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.billing.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_account_delete" {
  statement_id  = "AllowInvokeFromHttpApiAccountDelete"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.account_delete.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_share_create" {
  statement_id  = "AllowInvokeFromHttpApiShareCreate"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.share_create.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_share_get" {
  statement_id  = "AllowInvokeFromHttpApiShareGet"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.share_get.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_share_delete" {
  statement_id  = "AllowInvokeFromHttpApiShareDelete"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.share_delete.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_apigw_share_list" {
  statement_id  = "AllowInvokeFromHttpApiShareList"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.share_list.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_cloudwatch_dashboard" "launch_readiness" {
  dashboard_name = "${var.project_name}-${var.environment}-launch-readiness"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Errors"
          region = var.aws_region
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.auth.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.entitlements.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.telemetry.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.billing.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.account_delete.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.share_create.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.share_get.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.share_delete.function_name],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.share_list.function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Duration p95"
          region = var.aws_region
          stat   = "p95"
          period = 300
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.auth.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.entitlements.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.telemetry.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.billing.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.account_delete.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.share_create.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.share_get.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.share_delete.function_name],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.share_list.function_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API 4xx/5xx"
          region = var.aws_region
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "4xx", "ApiId", aws_apigatewayv2_api.http.id],
            ["AWS/ApiGateway", "5xx", "ApiId", aws_apigatewayv2_api.http.id]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API Latency p95"
          region = var.aws_region
          stat   = "p95"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Latency", "ApiId", aws_apigatewayv2_api.http.id]
          ]
        }
      }
    ]
  })
}