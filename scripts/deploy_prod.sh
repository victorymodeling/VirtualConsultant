#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Terraform stack roots for PROD
PROD_API_TF_DIR="$REPO_ROOT/infra/terraform/live/prod/api"
PROD_WORKER_TF_DIR="$REPO_ROOT/infra/terraform/live/prod/worker"
PROD_WEB_TF_DIR="$REPO_ROOT/infra/terraform/live/prod/web"

# Current commit short SHA (used as image tag)
SHA="$(git rev-parse --short HEAD)"

echo "==> ECR login"
"$REPO_ROOT/scripts/ecr_login.sh"

echo "==> Build + push API (:${SHA} and :latest)"
"$REPO_ROOT/scripts/api_build_push.sh"

echo "==> Build + push Worker (:${SHA} and :latest)"
"$REPO_ROOT/scripts/worker_build_push.sh"

# --- Apply PROD ECS stacks with SHA-pinned images ---
# api/main.tf uses data.aws_ecr_image(... image_tag = var.api_image_tag)
# worker/main.tf uses data.aws_ecr_image(... image_tag = var.worker_image_tag)
echo "==> Terraform apply: PROD API (image tag ${SHA})"
terraform -chdir="$PROD_API_TF_DIR" init -input=false
terraform -chdir="$PROD_API_TF_DIR" apply -auto-approve -input=false \
  -var "api_image_tag=${SHA}"

echo "==> Terraform apply: PROD Worker (image tag ${SHA})"
terraform -chdir="$PROD_WORKER_TF_DIR" init -input=false
terraform -chdir="$PROD_WORKER_TF_DIR" apply -auto-approve -input=false \
  -var "worker_image_tag=${SHA}"

# --- Frontend (build for production, upload to PROD bucket, invalidate CDN) ---
echo "==> Build + upload frontend to PROD + invalidate CloudFront"
"$REPO_ROOT/scripts/frontend_build_push_prod.sh"

echo "✅ PROD deploy complete (API+Worker rolled via Terraform; frontend updated)."
