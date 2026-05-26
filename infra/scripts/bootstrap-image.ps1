# Primer push de la imagen Docker al ECR creado por Terraform. Despues de
# esto, el workflow de GitHub Actions toma el control y reemplaza la imagen
# en cada push a main.
# Uso: .\infra\scripts\bootstrap-image.ps1   (desde el root del proyecto)
#      o ..\scripts\bootstrap-image.ps1      (desde infra/terraform/)

param(
  [string]$TfDir = "$PSScriptRoot/../terraform",
  [string]$Tag = "bootstrap"
)

$ErrorActionPreference = "Stop"

function Invoke-Step($name, [scriptblock]$block) {
  Write-Host "==> $name..." -ForegroundColor Cyan
  & $block
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo en '$name' (exit $LASTEXITCODE). Aborto."
  }
}

# Sanity check: docker corriendo
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop no esta corriendo. Iniciatelo y volve a intentar."
}

Push-Location $TfDir
try {
  $region  = terraform output -raw aws_region
  $repoUrl = terraform output -raw ecr_repository_url
}
finally {
  Pop-Location
}

$account = (aws sts get-caller-identity --query Account --output text).Trim()
$registry = "$account.dkr.ecr.$region.amazonaws.com"
$backendDir = Resolve-Path "$PSScriptRoot/../../backend"

Invoke-Step "Login a ECR ($region)" {
  # En Windows PowerShell 5.1, el pipe a --password-stdin agrega un \r que
  # ECR rechaza con 400. Pasamos el password como argumento directo (genera
  # un warning de seguridad de docker pero funciona).
  $ecrPassword = (aws ecr get-login-password --region $region).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($ecrPassword)) {
    Write-Host "No se pudo obtener el password de ECR." -ForegroundColor Red
    return
  }
  docker login --username AWS --password $ecrPassword $registry
}

Invoke-Step "Build ${repoUrl}:${Tag} desde $backendDir" {
  docker build -t "${repoUrl}:${Tag}" $backendDir
}

Invoke-Step "Push ${repoUrl}:${Tag}" {
  docker push "${repoUrl}:${Tag}"
}

Write-Host ""
Write-Host "==> Listo. Ahora corre infra/scripts/start.ps1 para levantar el servicio." -ForegroundColor Green
