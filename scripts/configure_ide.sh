#!/usr/bin/env bash

# Source the logging utility
source "$(dirname "$0")/logging_utils.sh"

# configure_ide.sh
# This script installs required Cursor IDE extensions and configures recommended IDE settings.
# Extensions: ms-kubernetes-tools.vscode-kubernetes-tools, golang.go, dbaeumer.vscode-eslint, esbenp.prettier-vscode
# Usage: ./configure_ide.sh

set -e

# List of required Cursor extensions
CURSOR_EXTENSIONS=(
    "ms-kubernetes-tools.vscode-kubernetes-tools"
    "golang.go"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
)

# Function to install Cursor extensions
install_cursor_extensions() {
    for extension in "${CURSOR_EXTENSIONS[@]}"; do
        if cursor extensions | grep -q "$extension"; then
            log_info "$extension already installed"
        else
            log_info "Installing $extension..."
            cursor extensions install "$extension"
        fi
    done
}

# Function to configure IDE settings
configure_ide_settings() {
    local settings_dir="$HOME/Library/Application Support/Cursor/User"
    local settings_file="$settings_dir/settings.json"
    local temp_file=$(mktemp)

    # Create settings directory if it doesn't exist
    mkdir -p "$settings_dir"

    # Read existing settings if file exists
    if [ -f "$settings_file" ]; then
        cat "$settings_file" > "$temp_file"
    else
        echo "{}" > "$temp_file"
    fi

    # Update settings using jq
    if ! command -v jq &> /dev/null; then
        log_info "Installing jq for JSON processing..."
        brew install jq
    fi

    # Update settings while preserving existing ones
    jq '. + {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave.source.fixAll": true
    }' "$temp_file" > "$settings_file"

    rm "$temp_file"
    log_info "IDE settings configured successfully"
}

# Verify settings were applied
verify_settings() {
    local settings_file="$HOME/Library/Application Support/Cursor/User/settings.json"
    if [ -f "$settings_file" ]; then
        if jq -e '.editor.formatOnSave == true and .editor.codeActionsOnSave.source.fixAll == true' "$settings_file" > /dev/null; then
            log_info "✓ Settings verified successfully"
        else
            log_warn "Settings may not have been applied correctly. Please check manually."
        fi
    else
        log_warn "Settings file not found. Please check manually."
    fi
}

# Main
log_info "Starting IDE configuration..."
install_cursor_extensions
configure_ide_settings
verify_settings

log_summary "IDE configuration" "Completed successfully"
echo "IDE configuration complete." 