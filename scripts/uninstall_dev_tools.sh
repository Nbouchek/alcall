#!/usr/bin/env bash

# uninstall_dev_tools.sh
# This script safely uninstalls development tools installed by install_dev_tools.sh
# Usage: ./uninstall_dev_tools.sh [--dry-run] [--select] [tool1 tool2 ...]

# Enable error handling and logging
set -E
set -o pipefail

# Source the logging utility
source "$(dirname "$0")/logging_utils.sh"
setup_logging

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to show help
show_help() {
    echo -e "\n${BLUE}Usage:${NC}"
    echo "  ./uninstall_dev_tools.sh [options] [tool1 tool2 ...]"
    echo -e "\n${BLUE}Options:${NC}"
    echo "  --dry-run     Show what would be uninstalled without actually uninstalling"
    echo "  --select      Show interactive menu to select tools to uninstall"
    echo "  --help        Show this help message"
    echo -e "\n${BLUE}Examples:${NC}"
    echo "  ./uninstall_dev_tools.sh                    # Uninstall all tools"
    echo "  ./uninstall_dev_tools.sh --dry-run         # Show what would be uninstalled"
    echo "  ./uninstall_dev_tools.sh --select          # Show interactive selection menu"
    echo "  ./uninstall_dev_tools.sh docker node       # Uninstall specific tools"
    echo -e "\n${BLUE}Selection Menu:${NC}"
    echo "  - Enter the number of a tool to select/deselect it"
    echo "  - Enter 'a' to select all tools"
    echo "  - Enter 'd' when finished selecting"
    echo "  - Enter 'h' to show this help message"
    echo "  - Press Ctrl+C to cancel"
}

# Track uninstallation status
declare -A UNINSTALL_STATUS
declare -a FAILED_UNINSTALLS=()
declare -a SKIPPED_UNINSTALLS=()
declare -a SUCCESSFUL_UNINSTALLS=()

# Parse command line arguments
DRY_RUN=false
SELECTIVE=false
TOOLS_TO_UNINSTALL=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --select)
            SELECTIVE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            TOOLS_TO_UNINSTALL+=("$1")
            shift
            ;;
    esac
done

# List of all tools that can be uninstalled
ALL_TOOLS=(
    "docker"
    "node"
    "go"
    "rust"
    "python3"
    "kubectl"
    "helm"
    "terraform"
    "istioctl"
    "kind"
    "k9s"
    "argocd"
    "conda"
    "cursor"
)

# Function to check if a tool is installed
is_tool_installed() {
    local tool=$1
    case $tool in
        docker)
            if [[ "$(uname -s)" == "Darwin" ]]; then
                [ -d "/Applications/Docker.app" ] || brew list --cask docker &>/dev/null
            else
                command -v docker &>/dev/null
            fi
            ;;
        node)
            command -v node &>/dev/null
            ;;
        go)
            command -v go &>/dev/null
            ;;
        rust)
            command -v rustc &>/dev/null
            ;;
        python3)
            command -v python3 &>/dev/null
            ;;
        kubectl)
            command -v kubectl &>/dev/null
            ;;
        helm)
            command -v helm &>/dev/null
            ;;
        terraform)
            command -v terraform &>/dev/null
            ;;
        istioctl)
            command -v istioctl &>/dev/null
            ;;
        kind)
            command -v kind &>/dev/null
            ;;
        k9s)
            command -v k9s &>/dev/null
            ;;
        argocd)
            command -v argocd &>/dev/null
            ;;
        conda)
            command -v conda &>/dev/null || [ -d "$HOME/miniconda3" ]
            ;;
        cursor)
            [ -d "/Applications/Cursor.app" ]
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to get tool version
get_tool_version() {
    local tool=$1
    case $tool in
        docker)
            docker --version 2>/dev/null | cut -d ' ' -f3 | cut -d ',' -f1 || echo "unknown"
            ;;
        node)
            node --version 2>/dev/null | cut -d 'v' -f2 || echo "unknown"
            ;;
        go)
            go version 2>/dev/null | cut -d ' ' -f3 | cut -d 'o' -f2 || echo "unknown"
            ;;
        rust)
            rustc --version 2>/dev/null | cut -d ' ' -f2 || echo "unknown"
            ;;
        python3)
            python3 --version 2>/dev/null | cut -d ' ' -f2 || echo "unknown"
            ;;
        kubectl)
            kubectl version --client --output=json 2>/dev/null | jq -r '.clientVersion.gitVersion' | cut -d 'v' -f2 || echo "unknown"
            ;;
        helm)
            helm version --short 2>/dev/null | cut -d '+' -f1 | cut -d 'v' -f2 || echo "unknown"
            ;;
        cursor)
            if [ -d "$HOME/Library/Application Support/Cursor" ]; then
                echo "installed"
            else
                echo "unknown"
            fi
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Function to clean up Cursor extensions
cleanup_cursor_extensions() {
    local cursor_dir="$HOME/Library/Application Support/Cursor"
    if [ -d "$cursor_dir" ]; then
        log_info "Cleaning up Cursor extensions..."
        if [ -d "$cursor_dir/extensions" ]; then
            rm -rf "$cursor_dir/extensions" || {
                log_error "Failed to remove Cursor extensions"
                return 1
            }
        fi
        if [ -d "$cursor_dir/User" ]; then
            rm -rf "$cursor_dir/User" || {
                log_error "Failed to remove Cursor user data"
                return 1
            }
        fi
    fi
}

# Function to clean up Git hooks
cleanup_git_hooks() {
    if [ -d ".git/hooks" ]; then
        log_info "Cleaning up Git hooks..."
        rm -f .git/hooks/pre-commit || true
    fi
}

# Function to clean up pipx packages
cleanup_pipx() {
    if command -v pipx &>/dev/null; then
        log_info "Cleaning up pipx packages..."
        pipx list --short | cut -d' ' -f1 | xargs -I{} pipx uninstall {} || true
        pipx uninstall pipx || true
    fi
}

# Function to clean up cargo packages
cleanup_cargo() {
    if command -v cargo &>/dev/null; then
        log_info "Cleaning up cargo packages..."
        cargo install --list | grep -v '^[a-z]' | cut -d' ' -f1 | xargs -I{} cargo uninstall {} || true
    fi
}

# Function to clean up npm packages
cleanup_npm() {
    if command -v npm &>/dev/null; then
        log_info "Cleaning up npm packages..."
        npm list -g --depth=0 | awk 'NR>1 {print $2}' | xargs -I{} npm uninstall -g {} || true
    fi
}

# Function to clean up Docker resources
cleanup_docker() {
    if command -v docker &>/dev/null; then
        log_info "Cleaning up Docker resources..."
        # Stop all containers
        docker stop $(docker ps -aq) 2>/dev/null || true
        # Remove all containers
        docker rm $(docker ps -aq) 2>/dev/null || true
        # Remove all images
        docker rmi $(docker images -q) 2>/dev/null || true
        # Remove all volumes
        docker volume rm $(docker volume ls -q) 2>/dev/null || true
        # Remove all networks
        docker network prune -f 2>/dev/null || true
        # Remove all build cache
        docker builder prune -f 2>/dev/null || true
    fi
}

# Function to clean up Helm repositories
cleanup_helm() {
    if command -v helm &>/dev/null; then
        log_info "Cleaning up Helm repositories..."
        helm repo list | awk 'NR>1 {print $1}' | xargs -I{} helm repo remove {} || true
    fi
}

# Function to clean up kubectl contexts
cleanup_kubectl() {
    if command -v kubectl &>/dev/null; then
        log_info "Cleaning up kubectl contexts..."
        kubectl config delete-context $(kubectl config get-contexts -o name) 2>/dev/null || true
        kubectl config delete-cluster $(kubectl config get-clusters | grep -v NAME) 2>/dev/null || true
        kubectl config delete-user $(kubectl config get-users | grep -v NAME) 2>/dev/null || true
    fi
}

# Function to clean up Python virtual environments
cleanup_python_envs() {
    if command -v conda &>/dev/null; then
        log_info "Cleaning up conda environments..."
        conda env list | grep -v '^#' | awk '{print $1}' | xargs -I{} conda env remove -n {} || true
    fi
    # Remove any remaining virtual environments in common locations
    find ~ -type d -name "venv" -o -name ".venv" -o -name "env" -o -name ".env" | xargs rm -rf 2>/dev/null || true
}

# Function to clean up Rust toolchains
cleanup_rust_toolchains() {
    if command -v rustup &>/dev/null; then
        log_info "Cleaning up Rust toolchains..."
        rustup toolchain list | grep -v default | cut -d' ' -f1 | xargs -I{} rustup toolchain uninstall {} || true
    fi
}

# Function to uninstall a tool
uninstall_tool() {
    local tool=$1
    local version
    
    if ! is_tool_installed "$tool"; then
        log_info "Tool $tool is not installed, skipping..."
        SKIPPED_UNINSTALLS+=("$tool")
        return 0
    fi
    
    version=$(get_tool_version "$tool")
    log_info "Uninstalling $tool (version: $version)..."
    
    if $DRY_RUN; then
        log_info "[DRY RUN] Would uninstall $tool"
        return 0
    fi
    
    case $tool in
        docker)
            # Clean up Docker resources first
            cleanup_docker
            
            if [[ "$(uname -s)" == "Darwin" ]]; then
                # Stop Docker Desktop
                log_info "Stopping Docker Desktop..."
                osascript -e 'quit app "Docker"' 2>/dev/null || true
                
                # Wait for Docker to stop
                local attempts=0
                while pgrep -x "Docker" &>/dev/null && [ $attempts -lt 30 ]; do
                    sleep 1
                    ((attempts++))
                done
                
                # Remove Docker Desktop
                log_info "Removing Docker Desktop..."
                if brew list --cask docker &>/dev/null; then
                    brew uninstall --cask docker --force || {
                        log_error "Failed to uninstall Docker Desktop via Homebrew"
                        return 1
                    }
                fi
                
                # Remove Docker.app
                if [ -d "/Applications/Docker.app" ]; then
                    rm -rf "/Applications/Docker.app" || {
                        log_error "Failed to remove Docker.app"
                        return 1
                    }
                fi
                
                # Remove Docker binaries
                for binary in docker docker-compose docker-credential-desktop docker-credential-ecr-login docker-credential-osxkeychain; do
                    if [ -f "/usr/local/bin/$binary" ]; then
                        sudo rm -f "/usr/local/bin/$binary" || {
                            log_error "Failed to remove $binary"
                            return 1
                        }
                    fi
                done
                
                # Remove Docker data
                log_info "Removing Docker data..."
                rm -rf ~/.docker || true
            else
                brew uninstall docker docker-compose || {
                    log_error "Failed to uninstall Docker"
                    return 1
                }
            fi
            ;;
            
        node)
            # Clean up npm packages first
            cleanup_npm
            
            # Remove Node.js and npm
            brew uninstall node || {
                log_error "Failed to uninstall Node.js"
                return 1
            }
            
            # Remove npm cache and config
            rm -rf ~/.npm ~/.npmrc || true
            ;;
            
        go)
            # Remove Go
            brew uninstall go || {
                log_error "Failed to uninstall Go"
                return 1
            }
            
            # Remove Go workspace and packages
            rm -rf ~/go || true
            ;;
            
        rust)
            # Clean up Rust toolchains first
            cleanup_rust_toolchains
            
            # Clean up cargo packages
            cleanup_cargo
            
            # Remove Rust using rustup
            if command -v rustup &>/dev/null; then
                rustup self uninstall -y || {
                    log_error "Failed to uninstall Rust"
                    return 1
                }
            fi
            
            # Remove Cargo
            rm -rf ~/.cargo || true
            ;;
            
        python3)
            # Clean up Python environments first
            cleanup_python_envs
            
            # Clean up pipx packages
            cleanup_pipx
            
            # Remove Python
            brew uninstall python@3.11 || {
                log_error "Failed to uninstall Python"
                return 1
            }
            
            # Remove pip packages
            if command -v pip3 &>/dev/null; then
                log_info "Removing pip packages..."
                pip3 freeze | xargs -I{} pip3 uninstall -y {} || true
            fi
            
            # Remove pip cache and config
            rm -rf ~/.cache/pip ~/.pip || true
            ;;
            
        kubectl)
            # Clean up kubectl contexts first
            cleanup_kubectl
            
            brew uninstall kubectl || {
                log_error "Failed to uninstall kubectl"
                return 1
            }
            
            # Remove kubectl config
            rm -rf ~/.kube || true
            ;;
            
        helm)
            # Clean up Helm repositories first
            cleanup_helm
            
            brew uninstall helm || {
                log_error "Failed to uninstall Helm"
                return 1
            }
            
            # Remove Helm data
            rm -rf ~/.helm || true
            ;;
            
        terraform)
            brew uninstall terraform || {
                log_error "Failed to uninstall Terraform"
                return 1
            }
            
            # Remove Terraform data
            rm -rf ~/.terraform.d || true
            ;;
            
        istioctl)
            brew uninstall istioctl || {
                log_error "Failed to uninstall Istio"
                return 1
            }
            ;;
            
        kind)
            brew uninstall kind || {
                log_error "Failed to uninstall Kind"
                return 1
            }
            ;;
            
        k9s)
            brew uninstall k9s || {
                log_error "Failed to uninstall K9s"
                return 1
            }
            
            # Remove K9s config
            rm -rf ~/.k9s || true
            ;;
            
        argocd)
            brew uninstall argocd || {
                log_error "Failed to uninstall ArgoCD"
                return 1
            }
            ;;
            
        conda)
            # Clean up conda environments first
            cleanup_python_envs
            
            # Uninstall Miniconda/Conda
            if [ -d "$HOME/miniconda3" ]; then
                log_info "Removing Miniconda installation..."
                rm -rf "$HOME/miniconda3" || {
                    log_error "Failed to remove Miniconda directory"
                    return 1
                }
            fi
            # Remove conda config and environments
            rm -rf ~/.condarc ~/.conda ~/.continuum || true
            # Remove conda from shell config files
            for shellrc in ~/.bashrc ~/.zshrc ~/.bash_profile ~/.profile; do
                if [ -f "$shellrc" ]; then
                    sed -i.bak '/conda initialize/,+10d' "$shellrc" || true
                    sed -i.bak '/miniconda3/d' "$shellrc" || true
                fi
            done
            # Remove conda from PATH for current session
            export PATH=$(echo "$PATH" | tr ':' '\n' | grep -v "$HOME/miniconda3" | paste -sd ':' -)
            ;;
            
        cursor)
            # Clean up Cursor extensions and data only
            cleanup_cursor_extensions
            
            # Remove Cursor cache
            rm -rf "$HOME/Library/Caches/Cursor" || true
            rm -rf "$HOME/Library/Logs/Cursor" || true
            
            # Note: We're not removing the Cursor app itself
            log_info "Cursor IDE application was preserved. Only extensions and data were removed."
            # Consider it successful since we only want to clean extensions
            SUCCESSFUL_UNINSTALLS+=("$tool")
            return 0
            ;;
            
        *)
            log_error "Unknown tool: $tool"
            return 1
            ;;
    esac
    
    # Verify uninstallation (skip for cursor since we want to keep it installed)
    if [ "$tool" != "cursor" ] && is_tool_installed "$tool"; then
        log_error "Failed to uninstall $tool completely"
        FAILED_UNINSTALLS+=("$tool")
        return 1
    elif [ "$tool" != "cursor" ]; then
        log_info "Successfully uninstalled $tool"
        SUCCESSFUL_UNINSTALLS+=("$tool")
        return 0
    fi
}

# Function to show uninstall summary
show_summary() {
    echo -e "\n${BLUE}=== Uninstallation Summary ===${NC}"
    
    if [ ${#SUCCESSFUL_UNINSTALLS[@]} -gt 0 ]; then
        echo -e "\n${GREEN}Successfully uninstalled:${NC}"
        printf '  - %s\n' "${SUCCESSFUL_UNINSTALLS[@]}"
    fi
    
    if [ ${#SKIPPED_UNINSTALLS[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}Skipped (not installed):${NC}"
        printf '  - %s\n' "${SKIPPED_UNINSTALLS[@]}"
    fi
    
    if [ ${#FAILED_UNINSTALLS[@]} -gt 0 ]; then
        echo -e "\n${RED}Failed to uninstall:${NC}"
        printf '  - %s\n' "${FAILED_UNINSTALLS[@]}"
    fi
    
    if $DRY_RUN; then
        echo -e "\n${YELLOW}This was a dry run. No tools were actually uninstalled.${NC}"
    fi
}

# Main function
main() {
    log_info "Starting development tools uninstallation..."
    
    # Show help if requested
    if [[ " $* " =~ " --help " ]]; then
        show_help
        exit 0
    fi
    
    # Determine which tools to uninstall
    local tools_to_uninstall=()
    if $SELECTIVE; then
        if [ ${#TOOLS_TO_UNINSTALL[@]} -eq 0 ]; then
            echo -e "\n${BLUE}Select tools to uninstall (enter number to toggle, 'all' for all, 'done' when finished):${NC}"
            local selected=()
            while true; do
                echo -e "\n${YELLOW}Currently selected:${NC} ${selected[*]:-none}"
                echo -e "\n${BLUE}Available tools:${NC}"
                for i in "${!ALL_TOOLS[@]}"; do
                    local tool="${ALL_TOOLS[$i]}"
                    local status=" "
                    [[ " ${selected[@]} " =~ " $tool " ]] && status="*"
                    printf "%2d) [%s] %s\n" $((i+1)) "$status" "$tool"
                done
                echo " a) Select all"
                echo " d) Done"
                echo " h) Help"
                
                read -p "Enter your choice: " choice
                case $choice in
                    [0-9]*)
                        if [ "$choice" -ge 1 ] && [ "$choice" -le ${#ALL_TOOLS[@]} ]; then
                            local tool="${ALL_TOOLS[$((choice-1))]}"
                            if [[ " ${selected[@]} " =~ " $tool " ]]; then
                                selected=("${selected[@]/$tool}")
                            else
                                selected+=("$tool")
                            fi
                        else
                            echo -e "${RED}Invalid selection. Please enter a number between 1 and ${#ALL_TOOLS[@]}.${NC}"
                        fi
                        ;;
                    a|A)
                        selected=("${ALL_TOOLS[@]}")
                        ;;
                    d|D)
                        if [ ${#selected[@]} -eq 0 ]; then
                            echo -e "${YELLOW}No tools selected. Please select at least one tool or press Ctrl+C to cancel.${NC}"
                            continue
                        fi
                        break
                        ;;
                    h|H)
                        show_help
                        ;;
                    *)
                        echo -e "${RED}Invalid choice. Please enter a number, 'a' for all, 'd' for done, or 'h' for help.${NC}"
                        ;;
                esac
            done
            tools_to_uninstall=("${selected[@]}")
        else
            tools_to_uninstall=("${TOOLS_TO_UNINSTALL[@]}")
        fi
    elif [ ${#TOOLS_TO_UNINSTALL[@]} -gt 0 ]; then
        # If specific tools are provided without --select, only uninstall those
        tools_to_uninstall=("${TOOLS_TO_UNINSTALL[@]}")
    else
        # If no tools specified and not in selective mode, uninstall all
        tools_to_uninstall=("${ALL_TOOLS[@]}")
    fi
    
    # Confirm uninstallation
    if ! $DRY_RUN; then
        echo -e "\n${YELLOW}The following tools will be uninstalled:${NC}"
        printf '  - %s\n' "${tools_to_uninstall[@]}"
        echo -e "\n${RED}Warning: This will remove all selected tools and their configurations.${NC}"
        read -p "Are you sure you want to continue? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Uninstallation cancelled by user"
            exit 0
        fi
    fi
    
    # Clean up Git hooks if they exist
    cleanup_git_hooks
    
    # Uninstall each tool
    for tool in "${tools_to_uninstall[@]}"; do
        uninstall_tool "$tool"
    done
    
    # Show summary
    show_summary
    
    # Exit with appropriate status
    if [ ${#FAILED_UNINSTALLS[@]} -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Cleanup function
cleanup() {
    local exit_code=$?
    
    # Show summary on exit
    show_summary
    
    # Log cleanup
    log_info "Cleanup completed with exit code: $exit_code"
    
    exit $exit_code
}

# Set up cleanup trap
trap cleanup EXIT

# Run main function
main "$@" 