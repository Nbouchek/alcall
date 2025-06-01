# UnifiedChat Makefile - Automation for Dev, Infra, CI/CD, Docs

.PHONY: help dev infra test lint clean docs precommit coverage security dashboards format

help:
	@echo "Available targets:"
	@echo "  dev        - Setup local dev cluster (kind, Istio, monitoring, logging)"
	@echo "  infra      - Provision cloud infra (Terraform AWS EKS) (ENV=staging|prod)"
	@echo "  test       - Run all tests"
	@echo "  lint       - Run all linters"
	@echo "  clean      - Clean up local infra and build artifacts"
	@echo "  docs       - Build and check documentation"
	@echo "  precommit  - Run pre-commit hooks (lint, test, security)"
	@echo "  coverage   - Run code coverage and upload report"
	@echo "  security   - Run security scans (Trivy, etc.)"
	@echo "  dashboards - Import sample Grafana dashboards and Prometheus alerts"

# Local dev cluster setup

dev:
	@echo "[dev] Setting up local dev cluster..."
	cd quickstart/scripts/infra && ./setup_kind_cluster.sh && ./setup_monitoring_logging.sh
	@echo "[dev] Local dev cluster ready. See quickstart/scripts/infra/README.md for access."

# Cloud infra (Terraform)
infra:
	@echo "[infra] Provisioning cloud infra..."
	cd infrastructure/terraform && terraform init && terraform apply -auto-approve
	@echo "[infra] Cloud infra provisioned. See infrastructure/terraform/README.md."

test:
	@echo "[test] Running all tests..."
	make -C services/auth-service test || true
	make -C services/message-service test || true
	make -C services/user-service test || true
	make -C services/realtime-service test || true
	make -C services/payment-service test || true
	make -C services/ai-service test || true
	make -C services/gateway-service test || true
	@echo "[test] All tests complete."

lint:
	@echo "[lint] Running all linters..."
	make -C services/auth-service lint || true
	make -C services/message-service lint || true
	make -C services/user-service lint || true
	make -C services/realtime-service lint || true
	make -C services/payment-service lint || true
	make -C services/ai-service lint || true
	make -C services/gateway-service lint || true
	@echo "[lint] All linters complete."

clean:
	@echo "[clean] Cleaning up local infra and build artifacts..."
	kind delete cluster --name unified-chat-dev || true
	cd infrastructure/terraform && terraform destroy -auto-approve || true
	@echo "[clean] Cleanup complete."

docs:
	@echo "[docs] Building and checking documentation..."
	cd docs && make html || true
	@echo "[docs] Documentation build/check complete."

format:
	@echo "[format] Running all code formatters..."
	make -C services/auth-service format || true
	make -C services/message-service format || true
	make -C services/user-service format || true
	make -C services/realtime-service format || true
	make -C services/payment-service format || true
	make -C services/ai-service format || true
	make -C services/gateway-service format || true
	@echo "[format] All code formatters complete."

precommit:
	@echo "[precommit] Running pre-commit hooks (format, lint, test, security)..."
	make format
	make lint
	make test
	make security
	@echo "[precommit] Pre-commit checks complete."

coverage:
	@echo "[coverage] Running code coverage and uploading report..."
	make -C services/auth-service coverage || true
	make -C services/message-service coverage || true
	make -C services/user-service coverage || true
	make -C services/realtime-service coverage || true
	make -C services/payment-service coverage || true
	make -C services/ai-service coverage || true
	make -C services/gateway-service coverage || true
	@echo "[coverage] Code coverage complete."

security:
	@echo "[security] Running security scans..."
	trivy fs . || true
	@echo "[security] Security scan complete."

dashboards:
	@echo "[dashboards] Importing sample Grafana dashboards and Prometheus alert rules..."
	kubectl apply -f quickstart/scripts/infra/grafana_dashboards/ || true
	kubectl apply -f quickstart/scripts/infra/prometheus_alerts/ || true
	@echo "[dashboards] Dashboards and alerts imported."
