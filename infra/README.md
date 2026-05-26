# Infra — QueueLess en AWS ECS Fargate (modo low-cost)

Despliegue del backend de QueueLess en **ECS Fargate Spot** detrás de un
**RDS PostgreSQL** + **S3** + **Secrets Manager** + **CloudWatch Logs**. La
infraestructura está definida con **Terraform**, y los redeploys de la
aplicación van por **GitHub Actions con OIDC** (sin claves de larga vida).

> Proyecto **académico**. Sin pagos reales (`PAGO_GATEWAY=mock` en la task
> definition). El diseño prioriza costo cercano a $0 sobre alta disponibilidad.

## Resumen de optimizaciones de costo

| Decisión | Ahorro vs. setup "típico" |
|---|---|
| **Sin NAT Gateway** — ECS en subnets públicas con IP pública, SG cerrado | ~$33/mes |
| **Fargate Spot** en lugar de Fargate normal | −70% del compute |
| **Task 256 CPU / 1024 MB** (mínimo viable Spring Boot) | −50% vs. 512/1024 |
| **`desired_count = 0` por default** — el servicio arranca apagado | Solo pagás Fargate cuando corrés `start.ps1` |
| **ALB opcional** (`create_alb = false`) — la app se expone con IP pública del task | ~$16/mes |
| **RDS `db.t4g.micro` + 20 GB gp3** — entra en free tier 12 meses | ~$13/mes durante el primer año |
| **RDS `backup_retention = 0`** + sin Performance Insights ni Enhanced Monitoring | Solo el storage |
| **CloudWatch Logs 3 días de retención** | Mínimo razonable |
| Scripts `start.ps1` / `stop.ps1` para encender/apagar bajo demanda | Cuenta apagada ~= $0 |

### Costo esperado (us-east-1)

| Escenario | Costo aproximado |
|---|---|
| **Todo apagado** (RDS stopped, ECS desired_count=0) | < $1/mes (solo storage de S3, RDS GP3 y ECR) |
| **Encendido 4 hrs/semana** (~16 hrs/mes), sin ALB | ~$1/mes |
| **Encendido 24/7**, sin ALB, RDS free tier | ~$3/mes |
| **Encendido 24/7**, con ALB, RDS free tier | ~$19/mes |
| **Después del año 1** (sin free tier), 24/7 sin ALB | ~$16/mes |

> RDS detenida cuesta el storage (~$2/mes por 20 GB gp3 fuera de free tier).
> Free tier cubre 750 hrs/mes de db.t4g.micro y 20 GB de storage durante el
> primer año en cuentas nuevas.
>
> **Importante:** AWS reinicia automáticamente cualquier RDS que esté
> detenida más de 7 días seguidos. Para apagado prolongado, `terraform
> destroy` y rebuild cuando lo necesites.

## Arquitectura

```
                    Internet
                       │
                       │ (HTTP :80 si ALB / :8080 si no)
                       ▼
       ┌─────────────────────────────────┐
       │  ALB (opcional, default OFF)    │
       └────────────┬────────────────────┘
                    │
                    ▼   port 8080
        ┌───────────────────────────┐
        │  ECS Service (Fargate     │   subnets PUBLICAS
        │   Spot, awsvpc, public IP)│   SG: solo ALB SG o
        │   1× task Spring Boot     │       :8080 publico
        └─────┬──────────────┬──────┘
              │              │
              │ :5432        │ HTTPS (S3/Secrets/ECR via IGW)
              ▼              ▼
          ┌────────┐    ┌────────────┐
          │  RDS   │    │ S3 bucket  │
          │ priv.  │    │ + Secrets  │
          └────────┘    └────────────┘
```

Sin NAT Gateway, sin subnets privadas. La seguridad la dan los Security
Groups y `publicly_accessible = false` en RDS.

## Prerequisitos

- Cuenta AWS (idealmente nueva, para aprovechar free tier).
- AWS CLI v2 (`aws configure` con credenciales de admin).
- Terraform >= 1.6.
- Docker (para el primer push de imagen).
- PowerShell 7+ para los scripts (`pwsh`). Si usás bash, los comandos son
  equivalentes 1:1 con `aws` CLI.

## Bootstrap paso a paso

### 1. Configurar variables

```powershell
cd infra/terraform
Copy-Item terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars   # ajustar github_repo y, si querés, create_alb
```

### 2. `terraform apply`

```powershell
terraform init
terraform plan
terraform apply
```

Tarda ~7 min (RDS es lo que más demora). Outputs relevantes:

```
ecr_repository_url      = 1234567890.dkr.ecr.us-east-1.amazonaws.com/queueless-backend
ecs_cluster_name        = queueless-prod-cluster
ecs_service_name        = queueless-prod-backend
ecs_task_family         = queueless-prod-backend
rds_identifier          = queueless-prod-db
s3_bucket               = queueless-prod-storage-abcd1234
github_actions_role_arn = arn:aws:iam::1234567890:role/queueless-prod-gha-deploy
endpoint_hint           = Sin ALB: corre 'pwsh infra/scripts/get-public-ip.ps1'...
```

### 3. Primer push de imagen al ECR

```powershell
pwsh infra/scripts/bootstrap-image.ps1
```

(Hace login a ECR, `docker build`, `docker push :bootstrap`.)

### 4. Encender la demo

```powershell
pwsh infra/scripts/start.ps1
```

El script:
1. Verifica si RDS está `stopped` y la inicia (espera ~3 min).
2. Escala el service ECS a 1 task.
3. Espera estabilidad.
4. Imprime la URL pública del task (o del ALB, si lo creaste).

Pegá esa URL en el navegador o en `curl`:

```powershell
curl "http://<ip>:8080/actuator/health"
# {"status":"UP"}
```

### 5. Apagar cuando termines de probar

```powershell
pwsh infra/scripts/stop.ps1
```

Escala el service a 0 y detiene RDS. La cuenta queda en ~$0/mes.

## CI/CD: deploys automáticos

Una vez que `github_repo` está seteado, Terraform crea un rol IAM asumible
sólo por ese repo desde la rama `main`. Configurá en GitHub
(**Settings → Secrets and variables → Actions**):

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

El workflow renderiza `.aws/task-definition.json` reemplazando los
placeholders (`<ACCOUNT_ID>`, `<AWS_REGION>`, `<S3_BUCKET>`,
`<RDS_ENDPOINT>`) con estas variables antes de registrar la nueva task
definition. Si cambiás env vars, secrets o la imagen base, editás el JSON
y commiteás — no hace falta `terraform apply`.

Con `desired_count = 0`, el workflow registra la nueva task definition pero
no levanta tasks hasta que vos corrás `start.ps1` o el workflow Power (ver
abajo).

### Encender/apagar desde GitHub (sin abrir nada local)

Hay un segundo workflow, **Power (start/stop demo)**, que se dispara manualmente
desde la pestaña **Actions** del repo:

1. GitHub → tu repo → **Actions** → en el sidebar elegí **Power (start/stop demo)**.
2. Botón **Run workflow** (arriba a la derecha).
3. Dropdown **Que hacer**:
   - `start` — arranca RDS si está stopped, escala ECS a 1, imprime la URL pública en el job summary.
   - `stop` — escala ECS a 0, detiene RDS. Vuelve a costo ~$0.
   - `status` — solo muestra el estado actual de RDS y ECS, no toca nada.
4. Click **Run workflow**.
5. Click en el run que aparece en la lista → al final, en la sección **Summary**, vas a ver la URL del task (o el estado).

Es equivalente a los scripts `start.ps1` / `stop.ps1` pero sin abrir terminal.

## Cómo "prender" el ALB on-demand

Si para una demo querés un DNS estable (en vez de IP cambiante), editá
`terraform.tfvars`:

```hcl
create_alb = true
```

`terraform apply`. Tarda ~2 min. El output `alb_dns_name` te da el hostname
estable. Cuando termines, volvé a `create_alb = false` + apply para borrarlo.

## Operación

### Tail de logs

```powershell
aws logs tail "/ecs/queueless-prod-backend" --follow
```

### Cambiar tamaño del task

Editá `terraform.tfvars` (`container_cpu`, `container_memory`),
`terraform apply`, redeploy.

### Conectarse a RDS desde local

RDS está con `publicly_accessible = false`. Para inspecciones puntuales:
1. Temporalmente flipear `publicly_accessible = true` en `rds.tf`.
2. Abrir el SG de RDS a tu IP pública.
3. `apply`.
4. Conectarte con `psql -h <endpoint> -U queueless -d queueless`.
5. **Revertir todo** cuando termines.

(Para producción se usaría un bastion / SSM, pero para academico esto basta.)

### Recuperar secretos

```powershell
aws secretsmanager get-secret-value --secret-id queueless-prod/jwt-secret --query SecretString --output text
aws secretsmanager get-secret-value --secret-id queueless-prod/db-password --query SecretString --output text
```

## Limpieza total

```powershell
cd infra/terraform
terraform destroy
```

S3 tiene `force_destroy = true` y RDS `skip_final_snapshot = true`. Todo se
borra sin recursos huérfanos.

## Trade-offs aceptados por costo

- **Fargate Spot puede interrumpirse**: ECS levanta otro task, pero hay ~2 min
  de downtime. Para producción real usarías mix Spot+OnDemand.
- **IP pública del task cambia**: cada redeploy y cada interrupción de Spot
  cambia la IP. Para algo "siempre online" prendé el ALB.
- **Single AZ efectivo**: el service intenta colocar tasks en cualquiera de
  las 2 AZs, pero con `desired_count = 1` queda en una sola.
- **RDS sin backups**: si la base se corrompe se pierden los datos. Académico
  no necesita backups.
- **CloudWatch Logs solo 3 días**: para debug de issues viejas hay que mirar
  rápido.
- **Sin HTTPS**: ALB con HTTP solo (cuando está prendido). Para HTTPS
  necesitarías un dominio propio.
