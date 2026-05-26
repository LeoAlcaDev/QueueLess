# Muestra la URL publica actual del task de ECS (cuando create_alb = false).
# La IP cambia en cada redeploy o reinicio de task de Spot.
# Uso: pwsh infra/scripts/get-public-ip.ps1

param(
  [string]$TfDir = "$PSScriptRoot/../terraform"
)

$ErrorActionPreference = "Stop"

Push-Location $TfDir
try {
  $region    = terraform output -raw aws_region
  $cluster   = terraform output -raw ecs_cluster_name
  $service   = terraform output -raw ecs_service_name
  $albDns    = terraform output -raw alb_dns_name 2>$null
}
finally {
  Pop-Location
}

if ($albDns) {
  Write-Host "ALB activo. URL: http://$albDns/"
  return
}

Write-Host "==> Buscando tasks de '$service'..."
$tasksJson = aws ecs list-tasks `
  --cluster $cluster `
  --service-name $service `
  --desired-status RUNNING `
  --region $region `
  --output json

$taskArns = ($tasksJson | ConvertFrom-Json).taskArns
if (-not $taskArns -or $taskArns.Count -eq 0) {
  Write-Host "No hay tasks corriendo. Levantalo con scripts/start.ps1"
  return
}

$taskDetail = aws ecs describe-tasks `
  --cluster $cluster `
  --tasks $taskArns `
  --region $region `
  --output json | ConvertFrom-Json

foreach ($task in $taskDetail.tasks) {
  $eniId = ($task.attachments[0].details | Where-Object { $_.name -eq "networkInterfaceId" }).value
  if (-not $eniId) {
    Write-Host "Task $($task.taskArn): aun no tiene ENI."
    continue
  }
  $eni = aws ec2 describe-network-interfaces `
    --network-interface-ids $eniId `
    --region $region `
    --output json | ConvertFrom-Json
  $publicIp = $eni.NetworkInterfaces[0].Association.PublicIp
  if ($publicIp) {
    Write-Host "URL publica: http://${publicIp}:8080/"
    Write-Host "Healthcheck: http://${publicIp}:8080/actuator/health"
  } else {
    Write-Host "Task sin IP publica todavia (esperando...)"
  }
}
