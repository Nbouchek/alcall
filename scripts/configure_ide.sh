#!/usr/bin/env bash

# Source the logging utility
source "$(dirname "$0")/logging_utils.sh"

# configure_ide.sh - Installs and configures Cursor IDE with required extensions and settings
# Usage: ./configure_ide.sh

set -e

# Required extensions
CURSOR_EXTENSIONS=(
    "ms-kubernetes-tools.vscode-kubernetes-tools"
    "golang.go"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
    "ms-python.python"
    "ms-python.vscode-pylance"
    "ms-python.debugpy"
    "eamodio.gitlens"
    "github.copilot"
    "github.copilot-chat"
    "ms-azuretools.vscode-docker"
    "rust-lang.rust-analyzer"
)

# IDE settings
IDE_SETTINGS='{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave.source.fixAll": true,
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "python.formatting.provider": "black",
    "editor.rulers": [88, 100],
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "[python]": {
        "editor.defaultFormatter": "ms-python.python",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.organizeImports": true
        }
    },
    "[javascript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode"
    }
}'

# Utility functions
command_exists() { command -v "$1" >/dev/null 2>&1; }

# Install and configure extensions
install_extensions() {
    log_info "Installing required extensions..."
    for extension in "${CURSOR_EXTENSIONS[@]}"; do
        log_info "Installing $extension..."
        cursor extensions install "$extension" || log_warning "Failed to install $extension (might already be installed)"
    done

    # Give extensions time to install
    log_info "Waiting for extensions to complete installation..."
    sleep 5
}

# Configure IDE settings
configure_settings() {
    local settings_dir="$HOME/Library/Application Support/Cursor/User"
    local settings_file="$settings_dir/settings.json"

    # Install jq if needed
    if ! command_exists jq; then
        log_info "Installing jq..."
        brew install jq || { log_error "Failed to install jq"; return 1; }
    fi

    # Create settings directory and file
    mkdir -p "$settings_dir"
    if [ -f "$settings_file" ]; then
        # Merge with existing settings
        jq -s '.[0] * .[1]' "$settings_file" <(echo "$IDE_SETTINGS") > "${settings_file}.tmp" &&
        mv "${settings_file}.tmp" "$settings_file"
    else
        echo "$IDE_SETTINGS" > "$settings_file"
    fi
}

# Verify installation and configuration
verify_setup() {
    local failed_checks=0
    local settings_file="$HOME/Library/Application Support/Cursor/User/settings.json"

    # Verify Cursor installation
    if ! command_exists cursor; then
        log_error "Cursor not found in PATH"
        ((failed_checks++))
    fi

    # Verify settings
    if [ -f "$settings_file" ]; then
        if ! jq -e '."editor.formatOnSave" == true and ."editor.codeActionsOnSave".source.fixAll == true and ."python.linting.enabled" == true' "$settings_file" > /dev/null; then
            log_error "Settings not properly configured"
            ((failed_checks++))
        else
            log_success "Settings verified successfully"
        fi
    else
        log_error "Settings file not found"
        ((failed_checks++))
    fi

    # Verify Python environment
    if ! python3 -c "import sys" >/dev/null 2>&1; then
        log_error "Python environment not properly configured"
        ((failed_checks++))
    else
        log_success "Python environment verified"
    fi

    # Verify Git
    if ! command_exists git; then
        log_error "Git not found in PATH"
        ((failed_checks++))
    else
        log_success "Git verified"
    fi

    # Verify extensions by checking their installation directories
    local extensions_dir="$HOME/.cursor/extensions"
    if [ -d "$extensions_dir" ]; then
        local missing_extensions=()
        for ext in "${CURSOR_EXTENSIONS[@]}"; do
            if ! find "$extensions_dir" -maxdepth 1 -type d -name "*${ext}*" | grep -q .; then
                missing_extensions+=("$ext")
            fi
        done

        if [ ${#missing_extensions[@]} -gt 0 ]; then
            log_warning "Some extensions may not be fully installed:"
            for ext in "${missing_extensions[@]}"; do
                log_warning "  - $ext"
            done
            ((failed_checks++))
        else
            log_success "Extensions installation verified"
        fi
    else
        log_error "Extensions directory not found"
        ((failed_checks++))
    fi

    # Return status
    if [ $failed_checks -eq 0 ]; then
        log_success "All verifications passed"
        return 0
    else
        log_warning "Verification completed with $failed_checks failed checks"
        return 1
    fi
}

# Main
main() {
    log_info "Starting IDE configuration..."

    install_extensions
    configure_settings
    verify_setup

    log_summary "IDE configuration" "Completed"
}

main "$@"
