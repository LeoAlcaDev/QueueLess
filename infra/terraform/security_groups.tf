resource "aws_security_group" "alb" {
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
    description = "Todo el trafico saliente (forward al target group)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name}-alb-sg"
  }
}

# Tasks ECS: SOLO aceptan trafico del SG del ALB.
# No tienen IP publica (viven en subnets privadas), salen a Internet via NAT GW.
resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name}-ecs-sg"
  description = "Tasks ECS: solo aceptan trafico del ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port desde el ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Salida a Internet via NAT (pulls de imagen ECR, Secrets, S3, etc.)"
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
