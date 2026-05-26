resource "aws_security_group" "alb" {
  count       = var.create_alb ? 1 : 0
  name        = "${local.name}-alb-sg"
  description = "Permite HTTP publico al ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP desde Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Todo el trafico saliente"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-alb-sg"
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name}-ecs-sg"
  description = "Tasks ECS"
  vpc_id      = aws_vpc.main.id

  # Con ALB: solo trafico del ALB.
  # Sin ALB: HTTP abierto a Internet (es el endpoint de la API).
  dynamic "ingress" {
    for_each = var.create_alb ? [1] : []
    content {
      description     = "App port desde el ALB"
      from_port       = 8080
      to_port         = 8080
      protocol        = "tcp"
      security_groups = [aws_security_group.alb[0].id]
    }
  }

  dynamic "ingress" {
    for_each = var.create_alb ? [] : [1]
    content {
      description = "App port publico (sin ALB)"
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    description = "Salida a Internet (pulls de imagen, S3, Secrets, RDS, etc.)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-ecs-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "RDS: solo aceptan trafico de las tasks ECS"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres desde ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-rds-sg"
  }
}
