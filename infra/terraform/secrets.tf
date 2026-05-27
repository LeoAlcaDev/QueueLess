# JWT_SECRET autogenerado (32 bytes hex = 64 chars).
# El validador del backend exige >= 32 bytes; con 32 hex bytes alcanzamos sobrado.
resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${local.name}/jwt-secret"
  description             = "JWT signing secret para el backend de QueueLess"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# Password de la DB tambien va a Secrets Manager para que ECS la inyecte.
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${local.name}/db-password"
  description             = "Password del usuario maestro de RDS"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}

# App password de Gmail para SMTP. Terraform crea el secret con un placeholder
# y deja de gestionar el valor (ignore_changes). El valor real se setea fuera de
# git con:
#   aws secretsmanager put-secret-value \
#     --secret-id queueless-prod/mail-password \
#     --secret-string "<app-password-sin-espacios>"
resource "aws_secretsmanager_secret" "mail_password" {
  name                    = "${local.name}/mail-password"
  description             = "SMTP app password (gestionada fuera de Terraform tras el bootstrap)"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "mail_password" {
  secret_id     = aws_secretsmanager_secret.mail_password.id
  secret_string = "REPLACE_ME"

  lifecycle {
    ignore_changes = [secret_string]
  }
}
