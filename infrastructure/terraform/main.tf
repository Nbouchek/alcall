resource "render_project" "alcall" {
  name = "alcall"
  environments = {
    "development" = {
      name             = "development"
      protected_status = "unprotected"
    }
    "production" = {
      name             = "production"
      protected_status = "unprotected"
    }
  }
}

resource "render_postgres" "alcall_db" {
  name    = "alcall-postgres-db"
  plan    = "free"
  region  = "frankfurt"
  version = "16"

  database_name = var.postgres_db_name
  database_user = var.postgres_db_user
}

resource "render_web_service" "auth_service" {
  name    = "alcall-auth-service"
  plan    = "starter"
  region  = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy      = true
      branch           = "repo-setup-fixes"
      repo_url         = "https://github.com/Nbouchek/alcall"
      root_directory   = "services/auth-service"
    }
  }

  env_vars = {
    "DATABASE_URL" = { value = render_postgres.alcall_db.connection_info.external_connection_string }
  }
}

resource "render_web_service" "janus_service" {
  name    = "alcall-janus-service"
  plan    = "starter"
  region  = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy      = true
      branch           = "repo-setup-fixes"
      repo_url         = "https://github.com/Nbouchek/alcall"
      root_directory   = "services/janus-service"
    }
  }
}
