variable "project" {
  description = "Prefijo para nombrar recursos. Aparece en tags, nombres de SG, etc."
  type        = string
  default     = "queueless"
}

variable "environment" {
  description = "Identificador del entorno (prod, staging, demo)."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "Region AWS donde se crean los recursos."
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR de la VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "azs" {
  description = "AZs a usar. Si se deja vacio, se toman las dos primeras de la region."
  type        = list(string)
  default     = []
}

variable "container_image_tag" {
  description = "Tag inicial de la imagen en ECR. El workflow de GitHub Actions reescribe este valor en cada deploy."
  type        = string
  default     = "bootstrap"
}

variable "container_cpu" {
  description = "vCPU para la task de ECS (1024 = 1 vCPU). Minimo Fargate: 256."
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "Memoria en MiB para la task de ECS. Con 256 CPU los valores validos son 512, 1024, 2048."
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Numero deseado de tasks. Default 1 (servicio prendido). Los scripts start/stop lo manipulan despues sin que Terraform haga drift."
  type        = number
  default     = 1
}

variable "db_instance_class" {
  description = "Instance class para RDS. db.t4g.micro entra en free tier 12 meses."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Almacenamiento en GB para RDS. Free tier cubre 20 GB."
  type        = number
  default     = 20
}

variable "github_repo" {
  description = "Repo GitHub (owner/repo) que puede asumir el rol OIDC de deploy. Vacio desactiva el rol."
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "Rama desde la que se permiten deploys via OIDC. Usar '*' para testear desde feature branches."
  type        = string
  default     = "main"
}

variable "log_retention_days" {
  description = "Retencion de logs en CloudWatch."
  type        = number
  default     = 7
}
