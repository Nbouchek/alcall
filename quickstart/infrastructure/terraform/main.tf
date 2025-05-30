provider "aws" {
  region = var.region
}

module "vpc" {
  source = "./modules/vpc"

  vpc_cidr = var.vpc_cidr
  project  = var.project_name
  env      = var.environment
}

module "eks" {
  source = "./modules/eks"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = "1.24"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  project         = var.project_name
  env             = var.environment
}

module "rds" {
  source = "./modules/rds"

  identifier     = "${var.project_name}-${var.environment}"
  engine_version = "14"
  instance_class = "null"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids
  project        = var.project_name
  env            = var.environment
}

module "elasticache" {
  source = "./modules/elasticache"

  cluster_id     = "${var.project_name}-${var.environment}"
  engine_version = "7.0"
  node_type      = "null"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  project        = var.project_name
  env            = var.environment
}
