# Imprime la URL publica del backend. Con la arquitectura compliant la URL
# es estable (ALB DNS), asi que este script ahora es solo un atajo a
# `terraform output api_base_url`.
# Uso: .\infra\scripts\get-public-ip.ps1

param(
  [string]$TfDir = "$PSScriptRoot/../terraform"
)

$ErrorActionPreference = "Stop"

Push-Location $TfDir
try {
  $apiUrl = terraform output -raw api_base_url
}
finally {
  Pop-Location
}

Write-Host "API base:   $apiUrl"
Write-Host "Health:     $apiUrl/actuator/health"
