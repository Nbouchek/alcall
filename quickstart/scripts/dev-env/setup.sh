#!/bin/bash

# Exit on error
set -e

# Check if yq is installed
if ! command -v yq >/dev/null 2>&1; then
    echo "Installing yq..."
    brew install yq
fi

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load configuration using yq
CONFIG_DIR="$SCRIPT_DIR/../../config"
CONFIG_FILE="$CONFIG_DIR/dev-env.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check version
check_version() {
    local cmd=$1
    local min_version=$(yq ".tools.$cmd.version" "$CONFIG_FILE" | tr -d '"')
    local version

    if ! command_exists "$cmd"; then
        echo -e "${RED}Error: $cmd is not installed${NC}"
        return 1
    fi

    # Robust version extraction for go
    if [ "$cmd" = "go" ]; then
        version=$(go version 2>&1 | grep -oE 'go[0-9]+\.[0-9]+\.[0-9]+' | head -1 | sed 's/^go//')
    else
        version=$($cmd --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
    fi

    if [ -z "$version" ]; then
        echo -e "${RED}Error: Could not determine $cmd version${NC}"
        return 1
    fi

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

# Setup logging
LOG_DIR="$PROJECT_ROOT/logs/dev-env"
LOG_FILE="$LOG_DIR/dev_env_setup_$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$LOG_DIR"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log "INFO" "Starting development environment setup"
log "INFO" "Log file: $LOG_FILE"

# Check and install prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Homebrew
if ! command_exists brew; then
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Get list of required tools from config
REQUIRED_TOOLS_LIST=$(yq '.tools | keys | join(" ")' "$CONFIG_FILE")

# Check and install required tools
for tool in $REQUIRED_TOOLS_LIST; do
    if ! check_version "$tool" "$(yq ".tools.$tool.version" "$CONFIG_FILE" | tr -d '"')"; then
        install_tool "$tool"
    fi
done

# Setup development environment
echo -e "${YELLOW}Setting up development environment...${NC}"

# Create development directories from config
BASE_PATH=$(yq '.directories.base_path' "$CONFIG_FILE" | tr -d '"')
eval BASE_PATH="$BASE_PATH"  # Expand ~ to home directory

# Create base directory
mkdir -p "$BASE_PATH"

# Create service directories
for service in $(yq '.directories.services[].path' "$CONFIG_FILE" | tr -d '"'); do
    mkdir -p "$BASE_PATH/$service"
done

# Create other directories
for dir in web mobile desktop infrastructure documentation; do
    path=$(yq ".directories.$dir.path" "$CONFIG_FILE" | tr -d '"')
    mkdir -p "$BASE_PATH/$path"
done

# Only create allowed directories
ALLOWED_DIRS=(
  ".github/workflows"
  "services/auth-service"
  "services/message-service"
  "services/realtime-service"
  "services/user-service"
  "services/payment-service"
  "services/ai-service"
  "services/gateway-service"
  "web/frontend"
  "mobile/flutter"
  "desktop/tauri"
  "infrastructure/terraform"
  "infrastructure/kubernetes"
  "infrastructure/monitoring"
  "docs/api"
  "docs/architecture"
  "docs/development"
)
for dir in "${ALLOWED_DIRS[@]}"; do
  mkdir -p "$PROJECT_ROOT/$dir"
  log "INFO" "Created directory: $dir"
done

# Setup IDE settings
echo -e "${YELLOW}Setting up IDE settings...${NC}"
SETTINGS_PATH=$(yq '.ide.cursor.settings_path' "$CONFIG_FILE" | tr -d '"')
eval SETTINGS_PATH="$SETTINGS_PATH"  # Expand ~ to home directory
mkdir -p "$(dirname "$SETTINGS_PATH")"

# Generate settings.json from config
yq -o=json '.ide.cursor.settings' "$CONFIG_FILE" > "$SETTINGS_PATH"

# Install required VS Code extensions
echo -e "${YELLOW}Installing required extensions...${NC}"
for ext in $(yq '.ide.cursor.extensions[].id' "$CONFIG_FILE" | tr -d '"'); do
    code --install-extension "$ext" --force
done

# Setup git hooks
echo -e "${YELLOW}Setting up git hooks...${NC}"
HOOK_PATH=$(yq '.git_hooks.pre_commit.path' "$CONFIG_FILE" | tr -d '"')
mkdir -p "$(dirname "$HOOK_PATH")"

# Generate pre-commit hook from config
cat > "$HOOK_PATH" << EOF
#!/bin/bash

$(for cmd in $(yq '.git_hooks.pre_commit.commands[].command' "$CONFIG_FILE" | tr -d '"'); do
    echo "$cmd"
done)
EOF

chmod +x "$HOOK_PATH"

# Setup development SSL certificates
echo -e "${YELLOW}Setting up development SSL certificates...${NC}"
CA_PATH=$(yq '.ssl.ca.path' "$CONFIG_FILE" | tr -d '"')
CERT_PATH=$(yq '.ssl.certs.path' "$CONFIG_FILE" | tr -d '"')
eval CA_PATH="$CA_PATH"  # Expand ~ to home directory
eval CERT_PATH="$CERT_PATH"  # Expand ~ to home directory

mkdir -p "$CA_PATH" "$CERT_PATH"

# Generate CA
openssl genrsa -out "$CA_PATH/$(yq '.ssl.ca.key' "$CONFIG_FILE" | tr -d '"')" 2048
openssl req -new -x509 -days $(yq '.ssl.certs.validity_days' "$CONFIG_FILE") \
    -key "$CA_PATH/$(yq '.ssl.ca.key' "$CONFIG_FILE" | tr -d '"')" \
    -out "$CA_PATH/$(yq '.ssl.ca.cert' "$CONFIG_FILE" | tr -d '"')" \
    -subj "/C=US/ST=State/L=City/O=UnifiedChat/CN=UnifiedChat CA"

# Generate development certificates
for domain in $(yq '.ssl.certs.domains[]' "$CONFIG_FILE" | tr -d '"'); do
    openssl req -x509 -nodes -days $(yq '.ssl.certs.validity_days' "$CONFIG_FILE") -newkey rsa:2048 \
        -keyout "$CERT_PATH/$domain.key" \
        -out "$CERT_PATH/$domain.crt" \
        -subj "/C=US/ST=State/L=City/O=UnifiedChat/CN=$domain"
done

# Trust the CA certificate
if sudo -n true 2>/dev/null; then
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CA_PATH/$(yq '.ssl.ca.cert' "$CONFIG_FILE" | tr -d '"')"
else
    echo -e "${YELLOW}Warning: Passwordless sudo is not available. Please run the following command manually to trust the CA certificate:${NC}"
    echo "sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CA_PATH/$(yq '.ssl.ca.cert' "$CONFIG_FILE" | tr -d '"')"
fi

# Miniconda/Conda Python environment setup
CONDA_DIR="$HOME/miniconda3"
CONDA_ENV_NAME="alcall"
PYTHON_VERSION=$(yq '.tools.python3.version' "$CONFIG_FILE" | tr -d '"')

# Install Miniconda if not present
if [ ! -d "$CONDA_DIR" ]; then
    echo -e "${YELLOW}Installing Miniconda...${NC}"
    curl -fsSL https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh -o /tmp/miniconda.sh
    bash /tmp/miniconda.sh -b -p "$CONDA_DIR"
    rm /tmp/miniconda.sh
    export PATH="$CONDA_DIR/bin:$PATH"
else
    export PATH="$CONDA_DIR/bin:$PATH"
fi

# Initialize conda for bash
source "$CONDA_DIR/etc/profile.d/conda.sh"
conda config --set always_yes yes --set changeps1 no

# Create or update the conda environment
if conda info --envs | grep -q "^$CONDA_ENV_NAME "; then
    echo -e "${YELLOW}Updating existing conda environment: $CONDA_ENV_NAME${NC}"
    conda install -n "$CONDA_ENV_NAME" python="$PYTHON_VERSION" -y
else
    echo -e "${YELLOW}Creating conda environment: $CONDA_ENV_NAME with Python $PYTHON_VERSION${NC}"
    conda create -n "$CONDA_ENV_NAME" python="$PYTHON_VERSION" -y
fi

# Activate the conda environment for the rest of the script
conda activate "$CONDA_ENV_NAME"

# Install Python development tools
echo -e "${YELLOW}Installing Python development tools...${NC}"
pip install --upgrade pip
pip install black pylint pytest pytest-cov mypy

echo -e "${GREEN}Development environment setup completed successfully!${NC}"
log "INFO" "Development environment setup completed successfully!"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review and customize settings in $SETTINGS_PATH"
echo "2. Configure git hooks in $HOOK_PATH"
echo "3. Verify SSL certificates in $CERT_PATH"
echo "4. Check CA certificate in $CA_PATH"
echo "5. Run 'make install-deps' to install additional dependencies"
echo "6. Copy .env.example to .env and configure your environment variables"
echo "7. Run 'make dev-up' to start development services"
