data "archive_file" "auth_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda_stubs/auth.js"
  output_path = "${path.module}/lambda_stubs/dist/auth.zip"
}

data "archive_file" "entitlements_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda_stubs/entitlements.js"
  output_path = "${path.module}/lambda_stubs/dist/entitlements.zip"
}

data "archive_file" "telemetry_lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda_stubs/telemetry.js"
  output_path = "${path.module}/lambda_stubs/dist/telemetry.zip"
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
      "${aws_cloudwatch_log_group.telemetry.arn}:*"
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
      ENVIRONMENT = var.environment
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

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-${var.environment}-http-api"
  protocol_type = "HTTP"
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