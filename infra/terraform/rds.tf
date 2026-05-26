resource "random_password" "db" {
  length           = 24
  special          = true
  override_special = "!#$%*+-_=?"
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${local.name}-db-subnets"
  }
}

# RDS en subnets PRIVADAS (sin ruta al IGW), publicly_accessible = false.
# Solo accesible desde dentro de la VPC y solo por el SG de ECS.
resource "aws_db_instance" "main" {
  identifier             = "${local.name}-db"
  engine                 = "postgres"
  engine_version         = "16.4"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true
  db_name                = "queueless"
  username               = "queueless"
  password               = random_password.db.result
  port                   = 5432
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false
  skip_final_snapshot    = true
  deletion_protection    = false
  apply_immediately      = true

  # Backups deshabilitados para minimizar costo academico.
  backup_retention_period = 0

  # Performance Insights y enhanced monitoring desactivados.
  performance_insights_enabled = false
  monitoring_interval          = 0

  tags = {
    Name = "${local.name}-db"
  }
}
