# Primer push de la imagen Docker al ECR creado por Terraform. Despues de
# esto, el workflow de GitHub Actions toma el control y reemplaza la imagen
# en cada push a main.
# Uso: pwsh infra/scripts/bootstrap-image.ps1

param(
  [string]$TfDir = "$PSScriptRoot/../terraform",
  [string]$Tag = "bootstrap"
)

$ErrorActionPreference = "Stop"

Push-Location $TfDir
try {
  $region  = terraform output -raw aws_region
  $repoUrl = terraform output -raw ecr_repository_url
}
finally {
  Pop-Location
}

$account = aws sts get-caller-identity --query Account --output text

Write-Host "==> Login a ECR ($region)..."
aws ecr get-login-password --region $region |
  docker login --username AWS --password-stdin "$account.dkr.ecr.$region.amazonaws.com"

$backendDir = Resolve-Path "$PSScriptRoot/../../backend"
Write-Host "==> Build $repoUrl`:$Tag desde $backendDir ..."
docker build -t "$repoUrl`:$Tag" $backendDir

Write-Host "==> Push..."
docker push "$repoUrl`:$Tag"

Write-Host "==> Listo. Ahora corre scripts/start.ps1 para levantar el servicio."
