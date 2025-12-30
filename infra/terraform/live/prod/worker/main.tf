# -------------------------
# Inputs
# -------------------------
variable "vpc_id" {
  type        = string
  default     = ""
  description = "Existing VPC ID (vpc-xxxx). If empty, resolve by Name tag."
}

variable "vpc_name" {
  type        = string
  default     = "vmod-terraform"
  description = "VPC Name tag used when vpc_id is empty."
}

variable "worker_image_tag" {
  type        = string
  default     = "latest"
  description = "ECR image tag for the worker"
}

variable "s3_bucket_name" {
  type        = string
  default     = "misc-webapp"
  description = "S3 bucket for the worker to access"
}

# -------------------------
# Resolve VPC and private subnets (Env=prod, Tier=private)
# -------------------------
locals {
  use_explicit_vpc = var.vpc_id != ""
}

data "aws_vpc" "by_id" {
  count = local.use_explicit_vpc ? 1 : 0
  id    = var.vpc_id
}

data "aws_vpc" "by_name" {
  count = local.use_explicit_vpc ? 0 : 1

  filter {
    name   = "tag:Name"
    values = [var.vpc_name]
  }
}

locals {
  resolved_vpc_id = local.use_explicit_vpc ? data.aws_vpc.by_id[0].id : data.aws_vpc.by_name[0].id
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [local.resolved_vpc_id]
  }
  tags = {
    Env  = "prod"
    Tier = "private"
  }
}

# -------------------------
# Cluster, roles, logs (must exist from prod/cluster and prod IAM)
# -------------------------
data "aws_ecs_cluster" "prod" {
  cluster_name = "vc-prod-cluster"
}

data "aws_iam_role" "exec" {
  name = "vc-prod-ecsTaskExecutionRole"
}

data "aws_iam_role" "task_worker" {
  name = "vc-prod-ecsTaskRole-worker"
}

data "aws_cloudwatch_log_group" "ecs" {
  name = "/ecs/virtual-consultant/prod"
}

data "aws_security_group" "rabbit" {
  name = "vc-prod-rabbit-sg"
}

# -------------------------
# Worker image (pin to digest)
# -------------------------
data "aws_ecr_repository" "worker" {
  name = "virtual-consultant/worker"
}

data "aws_ecr_image" "worker_image" {
  repository_name = data.aws_ecr_repository.worker.name
  image_tag       = var.worker_image_tag
}

locals {
  worker_image = "${data.aws_ecr_repository.worker.repository_url}@${data.aws_ecr_image.worker_image.image_digest}"
}

# -------------------------
# Secret Creation
# -------------------------
resource "aws_secretsmanager_secret" "reporting_password" {
  name = "/virtual-consultant/prod/worker/reporting-password"
}
resource "aws_secretsmanager_secret" "consultant_password" {
  name = "/virtual-consultant/prod/worker/consultant-password"
}

resource "aws_secretsmanager_secret_version" "reporting_password" {
  secret_id     = aws_secretsmanager_secret.reporting_password.id
  secret_string = "changedpassword"
}

resource "aws_secretsmanager_secret_version" "consultant_password" {
  secret_id     = aws_secretsmanager_secret.consultant_password.id
  secret_string = "changedpassword"
}

# Note: You will need to populate the values for these secrets in the AWS console
# or via the AWS CLI, as they are external to this infrastructure.

# -------------------------
# Data lookups for external secrets
# -------------------------
data "aws_secretsmanager_secret" "rabbit_user" {
  name = "/virtual-consultant/prod/rabbit/username"
}
data "aws_secretsmanager_secret" "rabbit_pass" {
  name = "/virtual-consultant/prod/rabbit/password"
}

# -------------------------
# Service (no ALB)
# -------------------------
locals {
  secrets_map = {
    REPORTING_PASSWORD  = { arn = aws_secretsmanager_secret.reporting_password.arn }
    CONSULTANT_PASSWORD = { arn = aws_secretsmanager_secret.consultant_password.arn }
    RabbitMq__UserName  = { arn = data.aws_secretsmanager_secret.rabbit_user.arn }
    RabbitMq__Password  = { arn = data.aws_secretsmanager_secret.rabbit_pass.arn }
  }
}

module "worker" {
  source = "../../../modules/ecs-service"

  project      = "virtual-consultant"
  name_prefix  = "vc"
  env          = "prod"
  service_name = "worker"

  cluster_arn = data.aws_ecs_cluster.prod.arn
  vpc_id      = local.resolved_vpc_id
  subnet_ids  = data.aws_subnets.private.ids

  execution_role_arn  = data.aws_iam_role.exec.arn
  execution_role_name = data.aws_iam_role.exec.name
  task_role_arn       = data.aws_iam_role.task_worker.arn
  task_role_name      = data.aws_iam_role.task_worker.name

  container_image = local.worker_image
  cpu             = 256
  memory          = 1024
  container_port  = 8080  # not exposed; harmless

  desired_count            = 1
  enable_execute_command   = true

  # Logging → CloudWatch for now (Loki can be enabled later)
  log_group_name = data.aws_cloudwatch_log_group.ecs.name
  aws_region     = "us-east-2"

  # Loki
  enable_loki   = true
  loki_labels   = { job = "vc-prod-worker" }

  # Environment
  environment = {
    AWS_REGION            = "us-east-2"
    AWS_S3_BUCKET         = "misc-webapp"
    AWS_FILE_PREFIX       = "virtual-consultant-two-dev"
    REPORTING_URL         = "https://reporting.victorymodeling.com/api/"
    REPORTING_USERNAME    = "nathaniel@victorymodeling.com"
    CONSULTANT_URL        = "https://api.virtualconsultant.victorymodeling.com/api"
    CONSULTANT_USERNAME   = "nathaniel@victorymodeling.com"
    RabbitMq__HostName    = "rabbit.vc-prod.internal"
    RabbitMq__Port        = "5672"
    RabbitMq__VirtualHost = "/"
  }

  secrets = local.secrets_map

  allow_read_secret_arns = [for s in local.secrets_map : s.arn]
}


output "worker_service_name" {
  value = module.worker.service_name
}

output "worker_service_arn" {
  value = module.worker.service_arn
}

output "worker_sg_id" {
  value = module.worker.security_group_id
}

# -------------------------
# Networking Rules
# -------------------------
resource "aws_security_group_rule" "worker_to_rabbit" {
  type                     = "ingress"
  description              = "Allow Worker to connect to RabbitMQ"
  from_port                = 5672
  to_port                  = 5672
  protocol                 = "tcp"
  security_group_id        = data.aws_security_group.rabbit.id
  source_security_group_id = module.worker.security_group_id
}

# -------------------------
# S3 IAM Policy
# -------------------------
data "aws_iam_policy_document" "s3_access" {
  statement {
    sid = "ListObjectsInBucket"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.s3_bucket_name}"]
  }
  statement {
    sid = "ManageObjectsInBucket"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = ["arn:aws:s3:::${var.s3_bucket_name}/*"]
  }
}

resource "aws_iam_policy" "s3_access" {
  name        = "vc-prod-worker-s3-access"
  description = "Allows the worker task to access its S3 bucket"
  policy      = data.aws_iam_policy_document.s3_access.json
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = data.aws_iam_role.task_worker.name
  policy_arn = aws_iam_policy.s3_access.arn
}
