// main.tf

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

# NEW: look up the shared Loki secret by name
data "aws_secretsmanager_secret" "loki_basic_auth" {
  name = "loki-basic-auth"
}

locals {
  base_tags = {
    Project = var.project
    Env     = var.env
    Service = var.service_name
  }

  tags = merge(local.base_tags, var.extra_tags)

  name = "${var.name_prefix}-${var.env}-${var.service_name}"

  # Build environment/secrets lists for the app container
  env_list = [
    for k, v in var.environment : {
      name  = k
      value = v
    }
  ]

  secrets_list = [
    for k, v in var.secrets : {
      name      = k
      valueFrom = v.key != null ? "${v.arn}:${v.key}::" : v.arn
    }
  ]

  # -----------------------------
  # Loki via FireLens (optional)
  # -----------------------------
  # We now source Loki URL + basic auth from Secrets Manager JSON:
  #   { "loki_url": "https://loki.victorymodeling.com", "loki_user": "...", "loki_pass": "..." }
  #
  # Fluent Bit Loki output expects:
  #   host = base hostname or URL (no sub-path)
  #   uri  = path (default /loki/api/v1/push)
  #   tls/port consistent with your endpoint (https -> 443 + tls on)
  loki_port = "443"
  loki_tls  = "on"

  # Fluent Bit → Loki labels string
  loki_labels = join(",", concat(
    ["env=${var.env}", "service=${local.name}"],
    [for k, v in var.loki_labels : "${k}=${v}"]
  ))

  # Choose log driver/options for the app container
  app_log_driver = var.enable_loki ? "awsfirelens" : "awslogs"

  # IMPORTANT: this configuration uses the built-in Fluent Bit 'loki' output.
  # We do NOT include credentials or host in plaintext here; those come via secretOptions.
  app_log_options = var.enable_loki ? {
    Name            = "loki"

    # host comes from secretOptions (loki_url)
    port            = local.loki_port
    tls             = local.loki_tls

    labels          = local.loki_labels

    # Keep JSON, but drop everything except 'log' and emit it raw
    line_format     = "key_value"
    remove_keys     = "container_name,source,container_id,ecs_cluster,ecs_task_arn,ecs_task_definition"
    drop_single_key = "true"
  } : {
    awslogs-group         = var.log_group_name
    awslogs-region        = var.aws_region
    awslogs-stream-prefix = var.service_name
  }

  # NEW: pass loki_url / loki_user / loki_pass from Secrets Manager JSON via logConfiguration.secretOptions
  # Uses the :jsonKey:: selector syntax.
  loki_secret_options = var.enable_loki ? [
    {
      name      = "host"
      valueFrom = "${data.aws_secretsmanager_secret.loki_basic_auth.arn}:loki_url::"
    },
    {
      name      = "http_user"
      valueFrom = "${data.aws_secretsmanager_secret.loki_basic_auth.arn}:loki_user::"
    },
    {
      name      = "http_passwd"
      valueFrom = "${data.aws_secretsmanager_secret.loki_basic_auth.arn}:loki_pass::"
    }
  ] : []

  # FireLens sidecar definition (only when enabled)
  firelens_sidecar = var.enable_loki ? [
    {
      name      = "log-router"
      image     = "public.ecr.aws/aws-observability/aws-for-fluent-bit:stable"
      essential = true

      firelensConfiguration = {
        type    = "fluentbit"
        options = { "enable-ecs-log-metadata" = "true" }
      }

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = var.log_group_name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "firelens"
        }
      }
    }
  ] : []
}

# --------------------------------
# Security group for the service
# --------------------------------
resource "aws_security_group" "service" {
  name        = "${local.name}-sg"
  description = "ECS tasks for ${var.service_name}"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = "${local.name}-sg" })
}

# --------------------------------
# IAM: read Secrets Manager (optional + Loki secret when enabled)
# --------------------------------
data "aws_iam_policy_document" "read_secrets" {
  # CHANGED: create this policy doc if either:
  # - allow_read_secret_arns has entries, OR
  # - loki is enabled (so we must read loki-basic-auth)
  count = (length(var.allow_read_secret_arns) > 0 || var.enable_loki) ? 1 : 0

  statement {
    sid = "ReadSecrets"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = concat(
      var.allow_read_secret_arns,
      var.enable_loki ? [data.aws_secretsmanager_secret.loki_basic_auth.arn] : []
    )
  }
}

resource "aws_iam_policy" "read_secrets" {
  count  = (length(var.allow_read_secret_arns) > 0 || var.enable_loki) ? 1 : 0
  name   = "${local.name}-read-secrets"
  policy = data.aws_iam_policy_document.read_secrets[0].json
}

resource "aws_iam_role_policy_attachment" "attach_read_secrets" {
  count      = (length(var.allow_read_secret_arns) > 0 || var.enable_loki) ? 1 : 0
  role       = var.execution_role_name
  policy_arn = aws_iam_policy.read_secrets[0].arn
}

# --------------------------------
# IAM: read SSM Parameters (optional)
# --------------------------------
data "aws_iam_policy_document" "read_params" {
  count = length(var.allow_read_ssm_params) > 0 ? 1 : 0

  statement {
    sid = "ReadParams"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParameterHistory",
      "ssm:DescribeParameters"
    ]
    resources = [
      for p in var.allow_read_ssm_params :
      "arn:${data.aws_partition.current.partition}:ssm:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:parameter${p}"
    ]
  }
}

resource "aws_iam_policy" "read_params" {
  count  = length(var.allow_read_ssm_params) > 0 ? 1 : 0
  name   = "${local.name}-read-params"
  policy = data.aws_iam_policy_document.read_params[0].json
}

resource "aws_iam_role_policy_attachment" "attach_read_params" {
  count      = length(var.allow_read_ssm_params) > 0 ? 1 : 0
  role       = var.execution_role_name
  policy_arn = aws_iam_policy.read_params[0].arn
}

# --------------------------------
# Task definition (optionally with FireLens → Loki)
# --------------------------------
resource "aws_ecs_task_definition" "this" {
  family                   = local.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode(concat(
    [
      {
        name      = var.service_name
        image     = var.container_image
        essential = true

        portMappings = [{ containerPort = var.container_port, protocol = "tcp" }]

        environment = local.env_list
        secrets     = local.secrets_list

        logConfiguration = merge(
          {
            logDriver = local.app_log_driver
            options   = local.app_log_options
          },
          var.enable_loki ? { secretOptions = local.loki_secret_options } : {}
        )
      }
    ],
    local.firelens_sidecar
  ))

  tags = local.tags
}

# --------------------------------
# Service
# --------------------------------
resource "aws_ecs_service" "this" {
  name                              = local.name
  cluster                           = var.cluster_arn
  task_definition                   = aws_ecs_task_definition.this.arn
  desired_count                     = var.desired_count
  launch_type                       = "FARGATE"
  enable_execute_command            = var.enable_execute_command
  health_check_grace_period_seconds = var.health_check_grace_period_seconds

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = concat([aws_security_group.service.id], var.additional_security_group_ids)
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = var.target_group_arn == "" ? [] : [var.target_group_arn]
    content {
      target_group_arn = load_balancer.value
      container_name   = var.service_name
      container_port   = var.container_port
    }
  }

  deployment_controller { type = "ECS" }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = local.tags
}
