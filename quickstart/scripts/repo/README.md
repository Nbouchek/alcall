# Repository Scripts Documentation

This directory contains scripts for managing repository operations and maintenance.

## Available Scripts

### 1. `setup.sh`

**Purpose**: Initializes and configures the repository with necessary settings and hooks.

**Usage**:

```bash
./setup.sh [options]
```

**Options**:

- `-t, --type`: Repository type (standard, monorepo, library)
- `-b, --branch`: Default branch name
- `-h, --hooks`: Git hooks to install
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Git repository initialization
- Branch protection setup
- Git hooks installation
- CI/CD configuration
- Documentation setup
- License management
- Contributing guidelines

**Example**:

```bash
./setup.sh -t standard -b main -h "pre-commit,commit-msg"
```

### 2. `verify.sh`

**Purpose**: Validates repository configuration and health.

**Usage**:

```bash
./verify.sh [options]
```

**Options**:

- `-c, --check`: Specific check to run (all, hooks, config, security)
- `-b, --branch`: Branch to verify
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Repository structure validation
- Git hooks verification
- Configuration checks
- Security validation
- Branch protection verification
- Documentation checks

**Example**:

```bash
./verify.sh -c all -b main
```

### 3. `test.sh`

**Purpose**: Runs repository tests and validations.

**Usage**:

```bash
./test.sh [options]
```

**Options**:

- `-s, --scope`: Test scope (all, hooks, lint, security)
- `-b, --branch`: Branch to test
- `-p, --parallel`: Run tests in parallel
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Git hook testing
- Linting checks
- Security scanning
- Documentation testing
- Test result reporting
- Performance validation

**Example**:

```bash
./test.sh -s all -b main -p
```

### 4. `teardown.sh`

**Purpose**: Cleans up repository configuration and removes hooks.

**Usage**:

```bash
./teardown.sh [options]
```

**Options**:

- `-f, --force`: Force cleanup without confirmation
- `-k, --keep-config`: Keep configuration files
- `-b, --branch`: Branch to clean up
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Hook removal
- Configuration cleanup
- Branch protection removal
- CI/CD cleanup
- Log cleanup
- Cache cleaning

**Example**:

```bash
./teardown.sh -f -b main
```

## Environment Variables

The following environment variables can be used to configure the scripts:

- `REPO_TYPE`: Default repository type
- `REPO_BRANCH`: Default branch name
- `REPO_HOOKS`: Default Git hooks
- `REPO_LOG_LEVEL`: Logging level (DEBUG, INFO, WARN, ERROR)
- `REPO_DRY_RUN`: Enable dry run mode

## Repository Components

The scripts manage various repository components:

1. **Version Control**

   - Git configuration
   - Branch management
   - Tag management
   - Commit hooks

2. **Code Quality**

   - Linting configuration
   - Code formatting
   - Static analysis
   - Test frameworks

3. **Documentation**

   - README files
   - API documentation
   - Contributing guidelines
   - Changelog management

4. **Security**

   - Secret scanning
   - Dependency checking
   - Access control
   - Security policies

5. **CI/CD Integration**
   - Pipeline configuration
   - Build settings
   - Deployment rules
   - Environment management

## Git Hooks

The scripts support various Git hooks:

1. **Pre-commit Hooks**

   - Code formatting
   - Linting
   - Test running
   - Security checks

2. **Commit-msg Hooks**

   - Commit message validation
   - Issue reference checking
   - Sign-off verification

3. **Post-commit Hooks**

   - Documentation updates
   - Notification triggers
   - Build triggers

4. **Pre-push Hooks**
   - Test verification
   - Branch protection
   - Code review checks

## Best Practices

1. **Repository Structure**

   - Clear directory organization
   - Consistent naming conventions
   - Proper file permissions
   - Version control best practices

2. **Code Quality**

   - Code review process
   - Automated testing
   - Continuous integration
   - Code coverage tracking

3. **Documentation**

   - Up-to-date README
   - Clear API documentation
   - Contributing guidelines
   - Change documentation

4. **Security**
   - Regular security audits
   - Dependency updates
   - Access control
   - Secret management

## Troubleshooting

If you encounter issues:

1. Check the repository status
2. Review the logs in `logs/repo/`
3. Verify the configuration in `config/repo.yaml`

## Support

For issues or questions:

1. Check the script's help documentation
2. Review the logs in `logs/repo/`
3. Consult the main project documentation
4. Open an issue in the repository

## Related Documentation

- [Main Scripts Documentation](../README.md)
- [CICD Documentation](../cicd/README.md)
- [Development Environment Documentation](../dev-env/README.md)
- [Infrastructure Documentation](../infra/README.md)
