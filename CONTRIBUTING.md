# Contributing to Unified-Chat

Thank you for your interest in contributing to the Unified-Chat project! We welcome contributions from the community to help improve and grow this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Code Style](#code-style)
- [Pull Requests](#pull-requests)
- [Reporting Issues](#reporting-issues)
- [Contact](#contact)

## Code of Conduct

Please be respectful and considerate in all interactions. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

## Project Structure

All contributions must respect the folder and file structure defined in [IMPLEMENTATION.md](./IMPLEMENTATION.md). Do **not** create or modify directories outside the allowed structure. If you are unsure, please ask before submitting changes.

## How to Contribute

1. **Fork the repository** and create your branch from `develop`.
2. **Follow the project structure** as defined in [IMPLEMENTATION.md](./IMPLEMENTATION.md).
3. **Write clear, maintainable code** and include tests where appropriate.
4. **Run the integration and teardown scripts** to verify your changes:
   ```bash
   bash quickstart/scripts/test/integration.sh
   bash quickstart/scripts/test/teardown_integration.sh --force
   ```
5. **Commit your changes** with clear, descriptive messages.
6. **Open a pull request** against the `develop` branch and fill out the PR template.

## Code Style

- Use consistent formatting and follow language-specific best practices.
- Run linters and formatters before submitting code (e.g., `npm run lint`, `black`, `pylint`, etc.).
- Write descriptive commit messages.

## Pull Requests

- Ensure your PR is focused and addresses a single concern.
- Reference related issues in your PR description.
- Add tests for new features or bug fixes.
- Ensure all CI checks pass before requesting review.

## Reporting Issues

- Search for existing issues before opening a new one.
- Provide a clear, descriptive title and detailed information.
- Include steps to reproduce, expected behavior, and relevant logs or screenshots.

## Contact

For questions or support, open an issue or contact the maintainers via GitHub Discussions.

Thank you for helping make Unified-Chat better!
