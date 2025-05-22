#!/usr/bin/env bash

# Source the logging utility
source "$(dirname "$0")/logging_utils.sh"

set -euo pipefail

# Create logs directory
mkdir -p logs

log_info "Installing project dependencies..."

# Install Python dependencies
if command -v python3 >/dev/null 2>&1; then
    log_info "Installing Python dependencies..."
    python3 -m pip install --upgrade pip
    python3 -m pip install -e .
    python3 -m pip install black isort flake8 mypy pytest pytest-cov safety
fi

# Install Node.js dependencies
if command -v npm >/dev/null 2>&1; then
    log_info "Installing Node.js dependencies..."
    npm install
fi

# Install Go dependencies
if command -v go >/dev/null 2>&1; then
    log_info "Installing Go dependencies..."
    go mod download
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
    go install github.com/securego/gosec/v2/cmd/gosec@latest
fi

# Install Rust dependencies (if needed)
if command -v rustup >/dev/null 2>&1; then
    log_info "Installing Rust dependencies..."
    rustup update
    cargo install cargo-audit
fi

log_info "All dependencies installed successfully!"
