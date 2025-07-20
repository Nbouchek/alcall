# Contributing Guide

Thank you for contributing to UnifiedChat! This guide explains how to use the automation, run tests, set up infrastructure, and follow best practices.

## Quick Start

- **Local Dev Cluster:**

  ```bash
  make dev
  ```

  Sets up a local Kubernetes cluster (kind), Istio, monitoring (Prometheus, Grafana), and logging (ELK).

- **Cloud Infra (AWS EKS):**

  ```bash
  make infra ENV=staging
  ```

  Provisions cloud infrastructure using Terraform. See `infrastructure/terraform/README.md` for details.

- **Run Tests:**

  ```bash
  make test
  ```

- **Run Linters:**

  ```bash
  make lint
  ```

- **Clean Up:**

  ```bash
  make clean
  ```

- **Build/Check Docs:**

  ```bash
  make docs
  ```

- **Pre-commit Checks:**

  ```bash
  make precommit
  ```

- **Code Coverage:**

  ```bash
  make coverage
  ```

- **Security Scan:**

  ```bash
  make security
  ```

- **Import Dashboards/Alerts:**
  ```bash
  make dashboards
  ```

## Best Practices

- Follow the project structure and coding standards in `README.md` and `IMPLEMENTATION.md`.
- All code must be tested (unit, integration, e2e, performance, security).
- All documentation must be up-to-date.
- Use the provided Makefile for all automation.
- Use pre-commit hooks before pushing code.
- Open issues and PRs using the provided templates.

## CI/CD

- All pushes and PRs are checked by GitHub Actions (see `.github/workflows/`).
- Main, PR, and release pipelines are automated.
- Code coverage and security scanning are enforced.

## Support

- For issues, open a GitHub issue using the appropriate template.
- For questions, see the main README or ask in the community channels.

---

See `README.md` and `IMPLEMENTATION.md` for full requirements and standards.
