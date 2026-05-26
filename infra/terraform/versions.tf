terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Para un proyecto académico mantenemos el state local. Si lo querés
  # versionar en S3 + DynamoDB lock, descomenta el bloque "backend" y
  # corré `terraform init -migrate-state`.
  #
  # backend "s3" {
  #   bucket         = "queueless-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "queueless-tfstate-lock"
  #   encrypt        = true
  # }
}
