variable "project" {
  type        = string
  default     = "virtual-consultant"
  description = "Project tag"
}

variable "name_prefix" {
  type        = string
  default     = "vc"
  description = "Short prefix for naming"
}

variable "env" {
  type        = string
  description = "Environment label (qa, prod, etc.)"
}

# Core identifiers
variable "service_name" {
  type        = string
  description = "Logical service name (e.g., api or worker)"
}

variable "cluster_arn" {
  type        = string
  description = "ECS cluster ARN"
}

# Networking
variable "vpc_id" {
  type        = string
  description = "VPC where the service runs"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnets for awsvpc (private for internal services)"
}

# Security group
variable "additional_security_group_ids" {
  type        = list(string)
  default     = []
  description = "Optional extra SGs to attach to the service ENIs"
}

# Task roles
variable "execution_role_arn" {
  type        = string
  description = "ECS task execution role ARN"
}

variable "task_role_arn" {
  type        = string
  description = "ECS task role ARN"
}

variable "execution_role_name" {
  type        = string
  description = "Name of the ECS task execution role"
}

# Container settings
variable "container_image" {
  type        = string
  description = "Image URI (can be repo:tag or repo@digest)"
}

variable "container_port" {
  type        = number
  default     = 8080
}

variable "cpu" {
  type        = number
  default     = 512
}

variable "memory" {
  type        = number
  default     = 1024
}

# Service
variable "desired_count" {
  type        = number
  default     = 1
}

variable "enable_execute_command" {
  type        = bool
  default     = true
}

variable "health_check_grace_period_seconds" {
  type        = number
  default     = 60
}

# ALB attachment (optional)
variable "target_group_arn" {
  type        = string
  default     = ""
  description = "If set, attach this service to the target group"
}

# Logging
variable "log_group_name" {
  type        = string
  description = "CloudWatch Logs group name"
}

variable "aws_region" {
  type        = string
  description = "Region string for logging"
}

# Env & secrets
variable "environment" {
  type        = map(string)
  default     = {}
  description = "Plain env vars"
}

# Map of env var name -> { arn = <secret arn> } OR { name = <sm name> }
# Example:
# secrets = {
#   "DB_PASSWORD" = { arn = "arn:aws:secretsmanager:..." }
# }
variable "secrets" {
  type = map(object({
    arn = string
    key = optional(string)
  }))
  default = {}
  description = "Map of env var names to secret ARNs, with an optional key for JSON secrets."
}

# Extra tags
variable "extra_tags" {
  type        = map(string)
  default     = {}
}

# Allow the task role to read specific secrets/params
variable "allow_read_secret_arns" {
  type        = list(string)
  default     = []
  description = "SecretsManager ARNs the task may read"
}

variable "allow_read_ssm_params" {
  type        = list(string)
  default     = []
  description = "SSM parameter names the task may read"
}

# Loki via FireLens (optional)
variable "enable_loki" {
  type    = bool
  default = false
}

variable "loki_labels" {
  type        = map(string)
  default     = {}
  description = "Extra Loki labels (key=value)"
}

variable "task_role_name" {
  type        = string
  description = "Name of the task role used for IAM policy attachments"
}