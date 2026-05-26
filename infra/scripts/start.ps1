# Enciende la demo: arranca RDS (si estaba stopped) y escala ECS a 1.
# Uso: pwsh infra/scripts/start.ps1
#
# Lee los nombres de recursos desde los outputs de Terraform, asi que
# correlo desde infra/terraform/ o pasale -TfDir.

param(
  [string]$TfDir = "$PSScriptRoot/../terraform",
  [int]$DesiredCount = 1
)

$ErrorActionPreference = "Stop"

Push-Location $TfDir
try {
  $region   = terraform output -raw aws_region
  $cluster  = terraform output -raw ecs_cluster_name
  $service  = terraform output -raw ecs_service_name
  $dbId     = terraform output -raw rds_identifier
}
finally {
  Pop-Location
}

Write-Host "==> Estado actual de RDS '$dbId'..."
$dbStatus = aws rds describe-db-instances `
  --db-instance-identifier $dbId `
  --region $region `
  --query "DBInstances[0].DBInstanceStatus" `
  --output text

if ($dbStatus -eq "stopped") {
  Write-Host "==> RDS detenida. Iniciando (tarda ~3 min)..."
  aws rds start-db-instance --db-instance-identifier $dbId --region $region | Out-Null
  aws rds wait db-instance-available --db-instance-identifier $dbId --region $region
  Write-Host "==> RDS lista."
} else {
  Write-Host "==> RDS ya esta en estado '$dbStatus', no se inicia."
}

Write-Host "==> Escalando ECS service '$service' a $DesiredCount task(s)..."
aws ecs update-service `
  --cluster $cluster `
  --service $service `
  --desired-count $DesiredCount `
  --region $region | Out-Null

Write-Host "==> Esperando estabilidad del servicio..."
aws ecs wait services-stable `
  --cluster $cluster `
  --services $service `
  --region $region

Write-Host "==> Listo. Servicio arriba."
& "$PSScriptRoot/get-public-ip.ps1" -TfDir $TfDir
