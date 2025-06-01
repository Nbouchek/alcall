# UnifiedChat Platform Quickstart Guide

This guide provides a streamlined approach to setting up and running the UnifiedChat platform for development.

## Prerequisites

### System Requirements

- **CPU:** 4+ cores recommended (2 minimum)
- **RAM:** 16GB recommended (8GB minimum)
- **Storage:** 100GB SSD recommended (50GB minimum)
- **Network:** 100Mbps minimum
- **Display:** 1920x1080 minimum resolution

### Software Requirements

- **Operating System:**

  - macOS 12.0+
  - Ubuntu 20.04+ / Debian 11+
  - Windows 10/11 with WSL2

- **Required Tools:**
  - Docker Desktop 4.36.0 (Latest stable)
  - Node.js 22.x (LTS)
  - Go 1.23.x (Latest stable)
  - Rust 1.84.x (Latest stable)
  - Miniconda (Python 3.12)
  - kubectl 1.31.x (Latest stable)
  - Helm 3.16.x (Latest stable)

## Quick Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/unified-chat/unified-chat.git
   cd unified-chat
   ```

2. **Set Up Development Environment**

   ```bash
   # Run the development environment setup script
   ./quickstart/scripts/dev-env/setup.sh

   # Verify the setup
   ./quickstart/scripts/dev-env/verify.sh
   ```

3. **Configure Python Environment**

   ```bash
   # Create and activate the conda environment
   conda env create -f environment.yml
   conda activate alcall

   # Install additional dependencies
   make install-deps
   ```

4. **Set Up Environment Variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your configuration
   # Required variables:
   # - CORE_SERVICE_PORT=8080
   # - CORE_SERVICE_HOST=localhost
   # - DB_HOST=localhost
   # - DB_PORT=5432
   # - DB_NAME=unifiedchat
   # - REDIS_HOST=localhost
   # - REDIS_PORT=6379
   # - JWT_SECRET=your-secret-key
   ```

   **Note:** The integration script now automatically creates a `.env` file with best-practice placeholders if it does not exist. You should review and update the generated `.env` file with your actual secrets and configuration values.

5. **Start Development Services**

   ```bash
   # Start all development services
   make dev-up

   # Initialize the database
   make db-init

   # Start the development server
   make dev-server
   ```

6. **Access the Application**
   ```bash
   # Open in your default browser
   open http://localhost:3000
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
make test

# Run specific test suites
make test-unit
make test-integration
make test-e2e
```

### Database Management

```bash
# Create a new migration
make db-migration-create name=your_migration_name

# Run migrations
make db-migrate

# Create backup
make db-backup

# Restore from backup
make db-restore file=backup.sql
```

### Common Development Tasks

```bash
# Start development environment
make dev

# Stop development environment
make dev-down

# View logs
make logs

# Reset development environment
make dev-reset
```

## Python Environment Configuration

Python dependencies are managed in `quickstart/config/environment.yml`. To add or update Python packages, edit this file and re-run the verification script.

```bash
# Edit environment.yml to add dependencies
vi quickstart/config/environment.yml

# Re-create the environment if needed
conda env update -f quickstart/config/environment.yml --prune

# Verify all dependencies are installed
./quickstart/scripts/dev-env/verify.sh
```

## Enhanced Verification

The verification script now:

- Checks Docker Desktop is installed and running (not just the CLI)
- Verifies all Python packages listed in `quickstart/config/environment.yml` are installed in the 'alcall' conda environment

## Troubleshooting

### Common Issues

1. **Docker Issues**

   ```bash
   # Reset Docker state
   make docker-reset

   # Check Docker logs
   make docker-logs
   ```

2. **Database Issues**

   ```bash
   # Reset database
   make db-reset

   # Check database logs
   make db-logs
   ```

3. **Environment Issues**

   ```bash
   # Verify environment setup
   ./quickstart/scripts/dev-env/verify.sh

   # Run environment tests
   ./quickstart/scripts/dev-env/test.sh
   ```

### Getting Help

- Check the [README.md](../README.md) for detailed documentation
- Review the [Development Guidelines](../README.md#development-guidelines)
- Visit the [Troubleshooting](../README.md#troubleshooting) section
- Open an issue on GitHub for bugs or feature requests

## Next Steps

1. Review the [Architecture Overview](../README.md#architecture-overview)
2. Explore the [API Documentation](../README.md#api-documentation)
3. Check out the [Contributing Guidelines](../README.md#contributing)
4. Join the development community

## Security Notes

- Never commit sensitive information to the repository
- Keep your environment variables secure
- Regularly update dependencies
- Follow security best practices in the [Security Measures](../README.md#security-measures) section

## Support

For additional support:

- Open an issue on GitHub
- Join the community chat
- Check the documentation
- Contact the development team

### Troubleshooting

If you encounter issues with missing Python packages or Docker Desktop not running, use:

```bash
./quickstart/scripts/dev-env/verify.sh
```

This will check for all required tools, Docker Desktop status, and Python dependencies as defined in `environment.yml`.
