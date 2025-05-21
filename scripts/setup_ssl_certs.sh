#!/usr/bin/env bash

# Source the logging utility
source "$(dirname "$0")/logging_utils.sh"

# setup_ssl_certs.sh
# Configures development SSL certificates (self-signed) and sets up a local CA (using functions) for development use.
# Usage: ./scripts/setup_ssl_certs.sh

set -euo pipefail

# Create logs directory (if it does not exist) so that log messages are saved (appended) into a log file (for example, "./logs/setup_ssl_certs.log").
mkdir -p logs

# Logging functions (using tee -a) for modular logging (and tee (append) into a log file).
log_info() { echo "[INFO] $* | tee -a ./logs/setup_ssl_certs.log"; }
log_error() { echo "[ERROR] $* | tee -a ./logs/setup_ssl_certs.log >&2"; }

# Function to configure (generate) self-signed dev certificates, set up a local CA, and print trust store instructions.
setup_ssl_certs() {
  # Create directories (if they do not exist) for certs, CA, and trust.
  log_info "Creating directories (certs, ca, trust) if they do not exist ..."
  mkdir -p certs ca trust

  # Generate a CA key and self-signed CA certificate (valid for 365 days) in the "ca" directory.
  log_info "Generating local CA (key and self-signed certificate) in ./ca ..."
  openssl genrsa -out ca/ca.key 2048
  openssl req -x509 -new -nodes -key ca/ca.key -sha256 -days 365 -out ca/ca.crt -subj "/CN=UnifiedChat Dev CA"

  # Generate a (self-signed) dev certificate (and key) in "certs" (valid for 365 days).
  log_info "Generating self-signed dev certificate (and key) in ./certs ..."
  openssl genrsa -out certs/dev.key 2048
  openssl req -new -key certs/dev.key -out certs/dev.csr -subj "/CN=localhost"
  openssl x509 -req -in certs/dev.csr -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial -out certs/dev.crt -days 365 -sha256

  # (Optional) Sign the dev cert (using the CA) so that it is "trusted" (for development).
  # (In a production scenario, you'd use a real CA.)
  log_info "Signing dev certificate (certs/dev.crt) using the local CA (ca/ca.crt) ..."
  openssl x509 -req -in certs/dev.csr -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial -out certs/dev.crt -days 365 -sha256

  # Copy the CA cert (ca/ca.crt) into "trust" (so that it can be added to trust stores).
  log_info "Copying CA certificate (ca/ca.crt) into ./trust for trust store configuration ..."
  cp ca/ca.crt trust/

  # Print instructions (for macOS) to trust the CA (using "security add-trusted-cert").
  log_info "Instructions (macOS): To trust the local CA (for development), run (in a terminal):"
  log_info "  security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./trust/ca.crt"
  log_info " (Note: You may be prompted for your password.)"

  # (Optional) Print instructions (for Linux) to update trust stores (using "update-ca-certificates").
  log_info "Instructions (Linux): If you use update-ca-certificates, copy ./trust/ca.crt into /usr/local/share/ca-certificates (or equivalent) and then run:"
  log_info "  sudo update-ca-certificates"

  log_info "SSL certificate setup (for development) complete."
}

# Call the function (or log an error if it fails).
if ! setup_ssl_certs; then
  log_error "Failed to set up SSL certificates."
  exit 1
fi

# Function to verify that the generated self-signed certificates, local CA, and trust store (i.e. the CA cert in ./trust) exist.
verify_ssl_certs() {
  log_info "Verifying generated SSL certificates, local CA, and trust store (i.e. the CA cert in ./trust) ..."
  if [ -e ./certs/dev.crt ] && [ -e ./certs/dev.key ] && [ -e ./ca/ca.crt ] && [ -e ./ca/ca.key ] && [ -e ./ca/ca.srl ] && [ -e ./trust/ca.crt ]; then
    log_info "Verification passed: self-signed certificates, local CA, and trust store (./trust/ca.crt) exist."
  else
    log_error "Verification failed: one or more expected files (certs/dev.crt, certs/dev.key, ca/ca.crt, ca/ca.key, ca/ca.srl, trust/ca.crt) are missing."
    exit 1
  fi
}

# Call the verification function (or log an error if it fails).
if ! verify_ssl_certs; then
  log_error "Verification of SSL certificates failed."
  exit 1
fi

# Update the main function to use log_summary
main() {
    log_summary "SSL certificates setup" "Started"
    
    # ... existing setup steps ...
    
    if [ $? -eq 0 ]; then
        log_summary "SSL certificates setup" "Completed successfully"
    else
        log_summary "SSL certificates setup" "Failed"
    fi
}

# ... rest of the script ... 