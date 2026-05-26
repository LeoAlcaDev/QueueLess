# Apaga la demo: escala ECS a 0 y detiene RDS.
# RDS puede estar detenida un maximo de 7 dias seguidos: pasado ese tiempo,
# AWS la vuelve a arrancar automaticamente. Para apagado prolongado, destruir.
# Uso: pwsh infra/scripts/stop.ps1

param(
  [string]$TfDir = "$PSScriptRoot/../terraform"
)

$ErrorActionPreference = "Stop"

Push-Location $TfDir
try {
  $region  = terraform output -raw aws_region
  $cluster = terraform output -raw ecs_cluster_name
  $service = terraform output -raw ecs_service_name
  $dbId    = terraform output -raw rds_identifier
}
finally {
  Pop-Location
}

Write-Host "==> Escalando ECS service '$service' a 0..."
aws ecs update-service `
  --cluster $cluster `
  --service $service `
  --desired-count 0 `
  --region $region | Out-Null

Write-Host "==> Esperando que las tasks finalicen..."
aws ecs wait services-stable `
  --cluster $cluster `
  --services $service `
  --region $region

Write-Host "==> Estado actual de RDS '$dbId'..."
$dbStatus = aws rds describe-db-instances `
  --db-instance-identifier $dbId `
  --region $region `
  --query "DBInstances[0].DBInstanceStatus" `
  --output text

if ($dbStatus -eq "available") {
  Write-Host "==> Deteniendo RDS (no se cobra computo mientras esta stopped; storage si)..."
  aws rds stop-db-instance --db-instance-identifier $dbId --region $region | Out-Null
  Write-Host "==> RDS stop solicitado. Llega a estado 'stopped' en ~2 min."
} else {
  Write-Host "==> RDS en estado '$dbStatus', no se detiene."
}

Write-Host "==> Listo. Demo apagada."
