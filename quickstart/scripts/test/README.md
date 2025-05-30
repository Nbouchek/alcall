# Test Scripts for Unified-Chat

This directory contains test automation scripts for the unified-chat project. These scripts are designed to help you set up, verify, and clean up the project structure according to the standards defined in `IMPLEMENTATION.md`.

## Scripts

### integration.sh

- **Purpose:**
  - Sets up the entire unified-chat directory structure in structure-only mode.
  - Creates minimal config files (`config/infra.yaml`, `config/repo.yaml`) if they do not exist.
  - Runs all setup scripts for repo, dev environment, infrastructure, and CI/CD.
  - Ensures no extra or forbidden directories are created.
  - Preserves protected files and directories (e.g., `.cursor/`, `.cursor/rules/alcall.mdc`).
- **Usage:**
  ```bash
  bash integration.sh
  ```

### teardown_integration.sh

- **Purpose:**
  - Cleans up all generated files and directories created by the integration script.
  - Preserves protected files and directories (e.g., `.cursor/`, `.cursor/rules/alcall.mdc`, `logs/`, `config/`).
  - Removes all files inside `config/` but keeps the directory itself.
- **Usage:**
  ```bash
  bash teardown_integration.sh --force
  ```

## Notes

- These scripts are intended for development and CI environments to ensure the workspace always matches the required structure.
- Do **not** modify or delete protected files and directories.
- For more details, see the main [IMPLEMENTATION.md](../../../IMPLEMENTATION.md).
