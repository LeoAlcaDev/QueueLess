output "alb_dns_name" {
  description = "Hostname publico del ALB (null si create_alb = false)"
  value       = var.create_alb ? aws_lb.main[0].dns_name : null
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
  description = "Family de la task definition"
  value       = aws_ecs_task_definition.backend.family
}

output "rds_endpoint" {
  description = "Endpoint privado de RDS"
  value       = aws_db_instance.main.address
}

output "rds_identifier" {
  description = "ID de RDS (para aws rds stop-db-instance / start-db-instance)"
  value       = aws_db_instance.main.identifier
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

output "endpoint_hint" {
  description = "Como acceder a la API segun el modo de ingress"
  value = var.create_alb ? "http://${try(aws_lb.main[0].dns_name, "")}/" : (
    "Sin ALB: corre 'pwsh infra/scripts/get-public-ip.ps1' para obtener la IP publica actual del task."
  )
}
