#!/usr/bin/env bash

# Source the logging utility
source "$(dirname "$0")/logging_utils.sh"

# configure_ide.sh
# This script installs required Cursor IDE extensions and prints instructions for configuring recommended IDE settings.
# Extensions: ms-kubernetes-tools.vscode-kubernetes-tools, golang.go, dbaeumer.vscode-eslint, esbenp.prettier-vscode
# Usage: ./configure_ide.sh

set -e

# List of required Cursor extensions (IDE configuration only)
CURSOR_EXTENSIONS=(
    "ms-kubernetes-tools.vscode-kubernetes-tools"
    "golang.go"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
)

# Function to install Cursor extensions (IDE configuration only)
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

# Print instructions for configuring IDE settings (IDE configuration only)
configure_ide_settings() {
    log_info ""
    log_info "To enable recommended settings, add the following to your settings.json in Cursor:"
    log_info '  "editor.formatOnSave": true,'
    log_info '  "editor.codeActionsOnSave.source.fixAll": true'
    log_info ""
    log_info "You can open settings.json from Cursor: Preferences > Settings > Open Settings (JSON)"
}

# Main (IDE configuration only)
install_cursor_extensions
configure_ide_settings

log_summary "IDE configuration" "Completed successfully"

echo "IDE configuration complete." 