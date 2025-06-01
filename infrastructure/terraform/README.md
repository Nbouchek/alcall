# Terraform AWS EKS Infrastructure

## Overview

This directory contains Terraform modules and configuration for provisioning AWS EKS clusters for staging and production environments.

## Prerequisites

- AWS account and credentials
- Terraform >= 1.5.7

## Usage

1. Initialize Terraform:
   ```bash
   terraform init
   ```
2. Review and customize variables in `variables.tf` and `environments/`.
3. Plan and apply:
   ```bash
   terraform plan
   terraform apply
   ```

## Structure

- `main.tf`: Core EKS and networking resources
- `variables.tf`: Input variables
- `environments/`: Per-environment configs (staging, prod)

## Next Steps

- After cluster creation, use the provided kubeconfig to deploy services, Istio, monitoring, and logging as in local setup.
