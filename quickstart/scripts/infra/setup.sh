#!/bin/bash

# Exit on error
set -e

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/infra"
LOG_FILE="$LOG_DIR/infra_setup_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Check if yq is installed
if ! command -v yq >/dev/null 2>&1; then
    log_message "INFO" "Installing yq..."
    brew install yq
fi

# Load configuration using yq
CONFIG_DIR="$PROJECT_ROOT/config"
CONFIG_FILE="$CONFIG_DIR/infra.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    log_message "ERROR" "Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Check infrastructure provider (structure-only mode safe)
if yq -e '.infrastructure.provider' "$CONFIG_FILE" >/dev/null 2>&1; then
    INFRA_PROVIDER=$(yq -r '.infrastructure.provider' "$CONFIG_FILE")
    if [ "$INFRA_PROVIDER" = "none" ]; then
        log_message "INFO" "Infrastructure provider is set to 'none', skipping Terraform initialization"
        echo -e "${GREEN}Infrastructure setup completed successfully!${NC}"
        log_message "INFO" "Infrastructure setup completed successfully"
        echo -e "${YELLOW}Next steps:${NC}"
        echo "1. Review the created infrastructure configurations in $PROJECT_ROOT/infrastructure"
        echo "2. Configure your cloud provider credentials when ready"
        echo "3. Review and customize monitoring configurations"
        exit 0
    fi
else
    log_message "WARN" "No infrastructure.provider key found; running in structure-only mode."
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check version
check_version() {
    local cmd=$1
    local min_version=$(yq -r ".tools.$cmd.version" "$CONFIG_FILE")
    local version

    if ! command_exists "$cmd"; then
        echo -e "${RED}Error: $cmd is not installed${NC}"
        return 1
    fi

    # Robust version extraction for kubectl, helm, go
    if [ "$cmd" = "kubectl" ]; then
        # Handle both client-only and full version output
        version=$(kubectl version --client -o json 2>/dev/null | jq -r '.clientVersion.gitVersion' 2>/dev/null | sed 's/^v//') || \
        version=$(kubectl version --client 2>&1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | sed 's/^v//')
    elif [ "$cmd" = "helm" ]; then
        # Handle both v2 and v3 output formats
        version=$(helm version --template='{{.Version}}' 2>/dev/null | sed 's/^v//') || \
        version=$(helm version 2>&1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | sed 's/^v//')
    elif [ "$cmd" = "go" ]; then
        # Handle go version output with optional build info
        version=$(go version 2>&1 | grep -oE 'go[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1 | sed 's/^go//')
    else
        version=$($cmd --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
    fi

    # Additional validation for version format
    if ! [[ "$version" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
        echo -e "${RED}Error: Invalid version format for $cmd: $version${NC}"
        return 1
    fi

    if [ -z "$version" ]; then
        echo -e "${RED}Error: Could not determine $cmd version${NC}"
        return 1
    fi

    # Compare versions using sort -V for proper semantic version comparison
    if [ "$(printf '%s\n' "$min_version" "$version" | sort -V | head -n1)" != "$min_version" ]; then
        echo -e "${RED}Error: $cmd version $version is below minimum required version $min_version${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ $cmd version $version is compatible${NC}"
    return 0
}

# Function to install tool using configuration
install_tool() {
    local tool=$1
    local install_command=$(yq -r ".tools.$tool.install_command" "$CONFIG_FILE")

    if [ -z "$install_command" ]; then
        echo -e "${RED}Error: No install command found for $tool${NC}"
        return 1
    fi

    echo -e "${YELLOW}Installing $tool...${NC}"
    eval "$install_command" || {
        echo -e "${RED}Failed to install $tool${NC}"
        return 1
    }
    echo -e "${GREEN}✓ $tool installed successfully${NC}"
}

log_message "INFO" "Starting infrastructure setup"
log_message "INFO" "Log file: $LOG_FILE"

# Check and install prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Homebrew
if ! command_exists brew; then
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Get list of required tools from config (structure-only mode safe)
if yq -e '.tools' "$CONFIG_FILE" >/dev/null 2>&1 && [ "$(yq -r '.tools | type' "$CONFIG_FILE")" = "!!map" ]; then
    REQUIRED_TOOLS_LIST=$(yq -r '.tools | keys | join(" ")' "$CONFIG_FILE")
    # Check and install required tools
    for tool in $REQUIRED_TOOLS_LIST; do
        if ! check_version "$tool"; then
            install_tool "$tool"
        fi
    done
else
    log_message "WARN" "No tools map found in config; skipping tool checks (structure-only mode)."
fi

# Setup infrastructure
echo -e "${YELLOW}Setting up infrastructure...${NC}"

# Only create allowed directories (structure-only mode always runs)
ALLOWED_DIRS=(
  "infrastructure/terraform"
  "infrastructure/kubernetes"
  "infrastructure/monitoring"
)
for dir in "${ALLOWED_DIRS[@]}"; do
  mkdir -p "$PROJECT_ROOT/$dir"
  log_message "INFO" "Created directory: $dir"
done

# Skip all config-dependent steps if minimal config (structure-only mode)
if ! yq -e '.terraform.backend' "$CONFIG_FILE" >/dev/null 2>&1; then
    log_message "WARN" "No terraform.backend key found; skipping Terraform config generation."
    echo -e "${GREEN}Infrastructure structure created (structure-only mode).${NC}"
    log_message "INFO" "Infrastructure structure created (structure-only mode)"
    exit 0
fi

# Create Terraform configurations
echo -e "${YELLOW}Creating Terraform configurations...${NC}"

# Create backend configuration
BACKEND_FILE="$PROJECT_ROOT/infrastructure/terraform/backend.tf"
if [ ! -f "$BACKEND_FILE" ]; then
    log_message "INFO" "Creating backend configuration..."
    cat > "$BACKEND_FILE" << EOF
terraform {
  backend "s3" {
    bucket         = "$(yq -r '.terraform.backend.bucket' "$CONFIG_FILE")"
    key            = "$(yq -r '.terraform.backend.key' "$CONFIG_FILE")"
    region         = "$(yq -r '.terraform.backend.region' "$CONFIG_FILE")"
    dynamodb_table = "$(yq -r '.terraform.backend.dynamodb_table' "$CONFIG_FILE")"
    encrypt        = true
  }
}
EOF
else
    log_message "INFO" "Backend configuration already exists, skipping creation"
fi

# Create variables configuration
VARIABLES_FILE="$PROJECT_ROOT/infrastructure/terraform/variables.tf"
if [ ! -f "$VARIABLES_FILE" ]; then
    log_message "INFO" "Creating variables configuration..."
    cat > "$VARIABLES_FILE" << EOF
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "$(yq -r '.region' "$CONFIG_FILE")"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "$(yq -r '.project_name' "$CONFIG_FILE")"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "$(yq -r '.network.vpc.cidr' "$CONFIG_FILE")"
}
EOF
else
    log_message "INFO" "Variables configuration already exists, skipping creation"
fi

# Create main configuration
MAIN_FILE="$PROJECT_ROOT/infrastructure/terraform/main.tf"
if [ ! -f "$MAIN_FILE" ]; then
    log_message "INFO" "Creating main configuration..."
    cat > "$MAIN_FILE" << EOF
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

  cluster_name    = "\${var.project_name}-\${var.environment}"
  cluster_version = "$(yq -r '.kubernetes.cluster.version' "$CONFIG_FILE")"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  project         = var.project_name
  env             = var.environment
}

module "rds" {
  source = "./modules/rds"

  identifier     = "\${var.project_name}-\${var.environment}"
  engine_version = "$(yq -r '.database.version' "$CONFIG_FILE")"
  instance_class = "$(yq -r '.database.parameters.instance_class' "$CONFIG_FILE")"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids
  project        = var.project_name
  env            = var.environment
}

module "elasticache" {
  source = "./modules/elasticache"

  cluster_id     = "\${var.project_name}-\${var.environment}"
  engine_version = "$(yq -r '.redis.version' "$CONFIG_FILE")"
  node_type      = "$(yq -r '.redis.parameters.node_type' "$CONFIG_FILE")"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  project        = var.project_name
  env            = var.environment
}
EOF
else
    log_message "INFO" "Main configuration already exists, skipping creation"
fi

# Create outputs configuration
cat > "$PROJECT_ROOT/infrastructure/terraform/outputs.tf" << EOF
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "EKS cluster certificate authority data"
  value       = module.eks.cluster_certificate_authority_data
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache cluster endpoint"
  value       = module.elasticache.endpoint
}
EOF

# Create Kubernetes configurations
echo -e "${YELLOW}Creating Kubernetes configurations...${NC}"

# Create kustomization.yaml
KUSTOMIZATION_FILE="$PROJECT_ROOT/infrastructure/kubernetes/base/kustomization.yaml"
if [ ! -f "$KUSTOMIZATION_FILE" ]; then
    log_message "INFO" "Creating kustomization.yaml..."
    mkdir -p "$(dirname "$KUSTOMIZATION_FILE")"
    cat > "$KUSTOMIZATION_FILE" << EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - configmap.yaml
  - secret.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
EOF
else
    log_message "INFO" "kustomization.yaml already exists, skipping creation"
fi

# Create namespace configuration
cat > "$PROJECT_ROOT/infrastructure/kubernetes/base/namespace.yaml" << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: $(yq -r '.kubernetes.namespaces[0].name' "$CONFIG_FILE")
  labels:
    name: $(yq -r '.kubernetes.namespaces[0].labels.name' "$CONFIG_FILE")
    environment: $(yq -r '.kubernetes.namespaces[0].labels.environment' "$CONFIG_FILE")
EOF

# Create monitoring configurations
echo -e "${YELLOW}Creating monitoring configurations...${NC}"

# Create Prometheus configuration
PROMETHEUS_VALUES_FILE="$PROJECT_ROOT/infrastructure/monitoring/prometheus/values.yaml"
if [ ! -f "$PROMETHEUS_VALUES_FILE" ]; then
    log_message "INFO" "Creating Prometheus values.yaml..."
    mkdir -p "$PROJECT_ROOT/infrastructure/monitoring/prometheus"
    cat > "$PROMETHEUS_VALUES_FILE" << EOF
# (add your default values here)
EOF
else
    log_message "INFO" "Prometheus values.yaml already exists, skipping creation"
fi

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
cd "$PROJECT_ROOT/infrastructure/terraform"
terraform init

# Create environments
for env in $(yq -r '.environments | keys | join(" ")' "$CONFIG_FILE"); do
    echo -e "${YELLOW}Creating $env environment...${NC}"
    mkdir -p "$PROJECT_ROOT/infrastructure/terraform/environments/$env"

    # Create environment configuration
    cat > "$PROJECT_ROOT/infrastructure/terraform/environments/$env/main.tf" << EOF
module "infrastructure" {
  source = "../.."

  environment = "$env"
  region      = "$(yq -r '.region' "$CONFIG_FILE")"
  project_name = "$(yq -r '.project_name' "$CONFIG_FILE")"
}
EOF

    # Initialize environment
    cd "$PROJECT_ROOT/infrastructure/terraform/environments/$env"
    terraform init
done

echo -e "${GREEN}Infrastructure setup completed successfully!${NC}"
log_message "INFO" "Infrastructure setup completed successfully"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the created infrastructure configurations in $PROJECT_ROOT/infrastructure"
echo "2. Initialize Terraform in each environment directory"
echo "3. Configure your cloud provider credentials"
echo "4. Review and customize monitoring configurations"
echo "5. Apply infrastructure changes using Terraform"
echo "6. Verify Kubernetes cluster access"

# Patch kustomization.yaml path usage
KUSTOMIZATION_PATH="$(cd "$(dirname "$0")/../..$PROJECT_ROOT$PROJECT_ROOT$PROJECT_ROOT$PROJECT_ROOT$PROJECT_ROOT$PROJECT_ROOT$PROJECT_ROOT$PROJECT_ROOT$PROJECT_ROOTUsers/nacer/Dev/github/alcallUsers/nacer/Dev/github/alcallinfrastructure/kubernetes/base" && pwd)/kustomization.yaml"
if [ ! -f "$KUSTOMIZATION_PATH" ]; then
    echo "Error: kustomization.yaml not found at $KUSTOMIZATION_PATH"
    exit 1
fi
# Use $KUSTOMIZATION_PATH wherever kustomization.yaml is referenced
