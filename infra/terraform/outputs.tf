output "alb_dns_name" {
  description = "Hostname publico del ALB. Es la URL base de la API."
  value       = aws_lb.main.dns_name
}

output "api_base_url" {
  description = "URL base de la API (apunta al ALB)."
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "URL del repo ECR donde se pushean las imagenes del backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Nombre del servicio ECS"
  value       = aws_ecs_service.backend.name
}

output "ecs_task_family" {
  description = "Family de la task definition (informativo)"
  value       = aws_ecs_task_definition.backend.family
}

output "rds_endpoint" {
  description = "Endpoint privado de RDS (no enrutable desde Internet)"
  value       = aws_db_instance.main.address
}

output "rds_identifier" {
  description = "ID de RDS (para aws rds stop-db-instance / start-db-instance)"
  value       = aws_db_instance.main.identifier
}

# ARN COMPLETO (con sufijo aleatorio `-xxxxxx`) de los secrets. Se debe pasar
# este valor como GitHub Variable y referenciarlo desde la task definition,
# porque Secrets Manager rechaza el ARN sin sufijo en `valueFrom` con un
# AccessDenied/NotFound engañoso.
output "jwt_secret_arn" {
  description = "ARN completo del secret JWT (copiar a GitHub Variable JWT_SECRET_ARN)"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "db_password_arn" {
  description = "ARN completo del secret de DB password (copiar a GitHub Variable DB_PASSWORD_ARN)"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "s3_bucket" {
  description = "Nombre del bucket S3 de storage"
  value       = aws_s3_bucket.storage.bucket
}

output "github_actions_role_arn" {
  description = "ARN del rol que GitHub Actions asume via OIDC. Copialo al secret AWS_DEPLOY_ROLE_ARN."
  value       = var.github_repo == "" ? null : aws_iam_role.github_actions[0].arn
}

output "aws_region" {
  description = "Region AWS"
  value       = var.aws_region
}
