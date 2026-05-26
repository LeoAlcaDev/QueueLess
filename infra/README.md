# Infra — QueueLess en AWS ECS Fargate

Despliegue del backend de QueueLess en AWS según la rúbrica del curso
CS2031: backend en **ECS Fargate**, base en **RDS PostgreSQL**, expuesto
por un **Application Load Balancer**, credenciales en **AWS Secrets
Manager** y imagen en **ECR**. Infraestructura definida con **Terraform**;
deploys automatizados por **GitHub Actions con OIDC**.

> Proyecto **académico**. `PAGO_GATEWAY=mock` forzado en la task definition.
> No se procesan pagos reales en ningún momento.

## Arquitectura

```
                     Internet
                        │
                        │  HTTP :80
                        ▼
              ┌──────────────────┐
              │       ALB        │   subnets PUBLICAS (2 AZ)
              └────────┬─────────┘   SG: 80 abierto al mundo
                       │ HTTP :8080
                       ▼
              ┌──────────────────┐
              │   ECS Service    │   subnets PRIVADAS
              │  Fargate Spot    │   SG: 8080 solo desde ALB SG
              │  Spring Boot     │   sin IP publica
              └─────┬────────┬───┘
                    │        │
              :5432 │        │ HTTPS (via NAT GW)
                    ▼        ▼
              ┌────────┐  ┌───────────────────┐
              │  RDS   │  │ ECR, S3, Secrets  │
              │ priv.  │  │     Manager       │
              └────────┘  └───────────────────┘
                          subnet PUBLICA: NAT GW
```

**Highlights de seguridad**:
- RDS en subnets privadas, sin ruta al IGW, `publicly_accessible = false`.
- Task de ECS sin IP pública; egress a Internet solo vía NAT GW.
- SG en cadena: ALB acepta solo del mundo en :80; ECS acepta solo del ALB; RDS acepta solo de ECS.
- Credenciales en Secrets Manager (`JWT_SECRET`, `DB_PASSWORD`), inyectadas en runtime — no aparecen en la task definition.
- Swagger deshabilitado en `prod` (`application-prod.yml`).

## Estructura

```
infra/
├── README.md                    (este archivo)
├── scripts/                     PowerShell utilitarios
│   ├── bootstrap-image.ps1      primer push de imagen a ECR
│   ├── start.ps1                arranca RDS + escala ECS a 1
│   ├── stop.ps1                 escala ECS a 0 + detiene RDS
│   └── get-public-ip.ps1        atajo a `terraform output api_base_url`
└── terraform/
    ├── versions.tf
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    ├── vpc.tf                   VPC, 2 publicas + 2 privadas, NAT GW
    ├── security_groups.tf       ALB <- ECS <- RDS
    ├── ecr.tf
    ├── rds.tf                   Postgres 16 en privadas
    ├── secrets.tf
    ├── s3.tf
    ├── alb.tf                   ALB en publicas + target group + listener :80
    ├── iam.tf                   task role + execution role
    ├── ecs.tf                   cluster + task def + service en privadas
    ├── cloudwatch.tf
    ├── github_oidc.tf
    └── terraform.tfvars.example
```

## Costos (us-east-1)

| Escenario | Costo aprox. |
|---|---|
| ALB + NAT GW siempre activos, RDS+ECS encendidos 24/7 | **~$80/mes** |
| ALB + NAT GW activos, ECS escalado a 0 y RDS stopped (entre demos) | **~$50/mes** |
| `terraform destroy` (todo borrado) | **~$0** |

Los dos cargos fijos pesados son **NAT Gateway (~$33/mes)** y **ALB (~$16/mes)**. Existen 24/7 mientras el stack esté creado, sin importar si ECS/RDS están apagados. Para evitar el costo entre demos: `terraform destroy` y rebuild cuando lo necesites (~7 min).

`db.t4g.micro` entra en free tier el primer año (750 hrs/mes + 20 GB gp3 gratis).

## Prerequisitos

- Cuenta AWS con MFA en root, free tier activo.
- AWS CLI v2 configurada (`aws configure`).
- Terraform >= 1.6.
- Docker Desktop (para el primer push de imagen).

## Bootstrap paso a paso

### 1. Configurar variables

```powershell
cd infra/terraform
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars   # ajustar github_repo
```

### 2. `terraform apply`

```powershell
terraform init
terraform plan
terraform apply
```

Tarda ~7 min (RDS es el más lento). Outputs relevantes:

```
alb_dns_name             = queueless-prod-alb-xxxx.us-east-1.elb.amazonaws.com
api_base_url             = http://queueless-prod-alb-xxxx.us-east-1.elb.amazonaws.com
ecr_repository_url       = 123456789012.dkr.ecr.us-east-1.amazonaws.com/queueless-backend
ecs_cluster_name         = queueless-prod-cluster
ecs_service_name         = queueless-prod-backend
github_actions_role_arn  = arn:aws:iam::123456789012:role/queueless-prod-gha-deploy
rds_identifier           = queueless-prod-db
s3_bucket                = queueless-prod-storage-abcd1234
```

### 3. Primer push de imagen a ECR

```powershell
.\infra\scripts\bootstrap-image.ps1
```

Login a ECR, `docker build`, `docker push :bootstrap`. Después de esto, el workflow de GitHub Actions reemplaza la imagen en cada push a `main`.

### 4. Encender el servicio

Por default, `terraform apply` deja `desired_count = 1`, así que el servicio ya está prendido. Verificá:

```powershell
.\infra\scripts\get-public-ip.ps1
# imprime la URL del ALB

curl http://<alb-dns>/actuator/health
# {"status":"UP"}
```

Si llegaste a apagar manualmente y querés re-prender:

```powershell
.\infra\scripts\start.ps1
```

### 5. (Opcional) Apagar el servicio entre demos

```powershell
.\infra\scripts\stop.ps1
```

Escala ECS a 0 y detiene RDS. ALB y NAT GW siguen costando $50/mes. Para cero costo: `terraform destroy` y rebuild cuando lo necesites.

## CI/CD: deploys automáticos en `main`

El workflow `.github/workflows/backend-deploy.yml` corre en cada push a `main` que toque `backend/**`. Configurá una vez en GitHub (**Settings → Secrets and variables → Actions**):

**Secret:**

| Nombre | Valor |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | output `github_actions_role_arn` |

**Variables:**

| Nombre | Valor |
|---|---|
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCOUNT_ID` | `aws sts get-caller-identity --query Account --output text` |
| `ECR_REPOSITORY` | `queueless-backend` |
| `ECS_CLUSTER` | output `ecs_cluster_name` |
| `ECS_SERVICE` | output `ecs_service_name` |
| `ECS_CONTAINER_NAME` | `backend` |
| `S3_BUCKET` | output `s3_bucket` |
| `RDS_ENDPOINT` | output `rds_endpoint` |
| `RDS_IDENTIFIER` | output `rds_identifier` (lo usa el workflow Power) |
| `ALB_DNS` | output `alb_dns_name` (lo usa el workflow Power) |

El workflow renderiza `.aws/task-definition.json` reemplazando los placeholders con estas variables antes de registrar la nueva task definition.

## Power workflow: start/stop desde GitHub

Workflow `.github/workflows/power.yml`, manual desde la pestaña **Actions**:

1. **Actions** → **Power (start/stop demo)** → **Run workflow**.
2. Dropdown:
   - `start` — arranca RDS si está stopped, escala ECS a 1, imprime URL en el summary.
   - `stop` — escala ECS a 0, detiene RDS.
   - `status` — solo muestra estado actual.

Es equivalente a los scripts `start.ps1`/`stop.ps1` pero sin abrir terminal local.

## Operación

### Tail de logs

```powershell
aws logs tail "/ecs/queueless-prod-backend" --follow
```

### Conectarse a RDS desde local (debug)

RDS está en privada con `publicly_accessible = false`. Para inspeccionarla puntualmente, lo más limpio es usar **ECS Exec** en una task corriendo:

```powershell
# Habilitar exec sobre el servicio (una vez)
aws ecs update-service --cluster queueless-prod-cluster --service queueless-prod-backend --enable-execute-command

# Forzar nuevo deploy para que la task arranque con exec habilitado
aws ecs update-service --cluster queueless-prod-cluster --service queueless-prod-backend --force-new-deployment

# Listar tasks
aws ecs list-tasks --cluster queueless-prod-cluster --service-name queueless-prod-backend

# Conectarse al container
aws ecs execute-command --cluster queueless-prod-cluster --task <task-id> --container backend --interactive --command "/bin/sh"
```

Adentro del container, `apk add postgresql-client` y `psql -h <rds-endpoint> -U queueless -d queueless`.

### Recuperar secretos

```powershell
aws secretsmanager get-secret-value --secret-id queueless-prod/jwt-secret --query SecretString --output text
aws secretsmanager get-secret-value --secret-id queueless-prod/db-password --query SecretString --output text
```

## Limpieza total

```powershell
terraform destroy
```

S3 con `force_destroy = true`, RDS con `skip_final_snapshot = true`. Todo se borra sin recursos huérfanos.

## Trade-offs aceptados

- **Fargate Spot puede interrumpirse**: ~2 min downtime cuando AWS recupera capacidad. Para prod real, usar mix Spot+OnDemand.
- **NAT GW single AZ**: si cae us-east-1a, ECS no puede salir a Internet. HA real serían 2 NAT GW.
- **RDS sin backups** (`backup_retention_period = 0`): si la base se corrompe, se pierden los datos.
- **HTTP en ALB, sin HTTPS**: el rúbrica no exige TLS. Para HTTPS necesitarías dominio propio + ACM.
