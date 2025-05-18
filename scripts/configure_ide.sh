#!/usr/bin/env bash

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
            echo "✓ $extension already installed"
        else
            echo "Installing $extension..."
            cursor extensions install "$extension"
        fi
    done
}

# Print instructions for configuring IDE settings (IDE configuration only)
configure_ide_settings() {
    echo ""
    echo "To enable recommended settings, add the following to your settings.json in Cursor:"
    echo '  "editor.formatOnSave": true,'
    echo '  "editor.codeActionsOnSave.source.fixAll": true'
    echo ""
    echo "You can open settings.json from Cursor: Preferences > Settings > Open Settings (JSON)"
}

# Main (IDE configuration only)
install_cursor_extensions
configure_ide_settings

echo "IDE configuration complete." 