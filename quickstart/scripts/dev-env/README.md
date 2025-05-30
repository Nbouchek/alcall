# Development Environment Scripts Documentation

This directory contains scripts for setting up and managing development environments.

## Available Scripts

### 1. `setup.sh`

**Purpose**: Sets up a complete development environment with all necessary tools and dependencies.

**Usage**:

```bash
./setup.sh [options]
```

**Options**:

- `-t, --type`: Environment type (minimal, standard, full)
- `-p, --python-version`: Python version to install
- `-d, --dev-tools`: Additional development tools to install
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Python environment setup
- Development tools installation
- IDE configuration
- Git configuration
- Dependency management
- Environment variable setup

**Example**:

```bash
./setup.sh -t standard -p 3.11 -d "docker,vscode"
```

### 2. `verify.sh`

**Purpose**: Validates the development environment setup and configuration.

**Usage**:

```bash
./verify.sh [options]
```

**Options**:

- `-c, --check`: Specific check to run (all, python, tools, config)
- `-t, --type`: Environment type to verify
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Python environment verification
- Tool installation checks
- Configuration validation
- Dependency verification
- System requirements check

**Example**:

```bash
./verify.sh -c all -t standard
```

### 3. `test.sh`

**Purpose**: Runs development environment tests and validations.

**Usage**:

```bash
./test.sh [options]
```

**Options**:

- `-s, --scope`: Test scope (all, python, tools, integration)
- `-p, --parallel`: Run tests in parallel
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Environment functionality tests
- Tool integration tests
- Performance tests
- Compatibility checks
- Test result reporting

**Example**:

```bash
./test.sh -s all -p
```

### 4. `teardown.sh`

**Purpose**: Cleans up the development environment and removes installed components.

**Usage**:

```bash
./teardown.sh [options]
```

**Options**:

- `-f, --force`: Force cleanup without confirmation
- `-k, --keep-config`: Keep configuration files
- `-c, --clean-cache`: Clean package caches
- `-v, --verbose`: Enable verbose output
- `-h, --help`: Display help message

**Features**:

- Environment cleanup
- Tool uninstallation
- Configuration removal
- Cache cleaning
- Log cleanup

**Example**:

```bash
./teardown.sh -f -c
```

## Environment Variables

The following environment variables can be used to configure the scripts:

- `DEV_ENV_TYPE`: Default environment type
- `PYTHON_VERSION`: Default Python version
- `DEV_TOOLS`: Default development tools
- `DEV_ENV_LOG_LEVEL`: Logging level (DEBUG, INFO, WARN, ERROR)
- `DEV_ENV_DRY_RUN`: Enable dry run mode

## Development Tools

The scripts support installation and configuration of various development tools:

1. **Version Control**

   - Git
   - Git LFS
   - Git Flow

2. **IDEs and Editors**

   - VS Code
   - PyCharm
   - Vim/Neovim

3. **Development Tools**

   - Docker
   - Docker Compose
   - Make
   - Curl
   - Wget

4. **Python Tools**
   - pip
   - virtualenv
   - poetry
   - pytest
   - black
   - flake8
   - mypy

## Best Practices

1. **Environment Management**

   - Use virtual environments
   - Version control configuration
   - Regular updates
   - Dependency pinning

2. **Security**

   - Regular security updates
   - Secure configuration
   - Access control
   - Credential management

3. **Performance**
   - Optimized tool configuration
   - Cache management
   - Resource monitoring
   - Regular cleanup

## Troubleshooting

If you encounter issues:

1. Check the development environment status
2. Review the logs in `logs/dev-env/`
3. Verify the configuration in `config/dev-env.yaml`

## Support

For issues or questions:

1. Check the script's help documentation
2. Review the logs in `logs/dev-env/`
3. Consult the main project documentation
4. Open an issue in the repository

## Related Documentation

- [Main Scripts Documentation](../README.md)
- [CICD Documentation](../cicd/README.md)
- [Infrastructure Documentation](../infra/README.md)
- [Repository Documentation](../repo/README.md)
