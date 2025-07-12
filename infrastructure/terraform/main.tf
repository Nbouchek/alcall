resource "render_service" "auth_service" {
  name               = "alcall-auth-service"
  repo               = var.github_repo_url
  type               = "web_service"
  auto_deploy        = true

  web_service_details = {
    plan               = var.render_default_plan
    region             = var.render_frankfurt_region
    docker_context     = "services/auth-service"
    docker_file_path   = "Dockerfile"
    health_check_path  = "/health"
    env                = "docker"

    env_vars = [
      {
        key   = "DATABASE_URL"
        value = var.db_url
      },
      {
        key = "AUTH_SERVICE_JWT_SECRET"
        value = var.auth_service_jwt_secret
      }
    ]
  }
}

resource "render_service" "user_service" {
  name               = "alcall-user-service"
  repo               = var.github_repo_url
  type               = "web_service"
  auto_deploy        = true

  web_service_details = {
    plan               = var.render_default_plan
    region             = var.render_frankfurt_region
    docker_context     = "services/user-service"
    docker_file_path   = "Dockerfile"
    health_check_path  = "/health"
    env                = "docker"

    env_vars = [
      {
        key   = "DATABASE_URL"
        value = var.db_url
      }
    ]
  }
}

resource "render_service" "message_service" {
  name               = "alcall-message-service"
  repo               = var.github_repo_url
  type               = "web_service"
  auto_deploy        = true

  web_service_details = {
    plan               = var.render_default_plan
    region             = var.render_frankfurt_region
    docker_context     = "services/message-service"
    docker_file_path   = "Dockerfile"
    health_check_path  = "/health"
    env                = "docker"

    env_vars = [
      {
        key   = "DB_HOST"
        value = var.db_host
      },
      {
        key   = "DB_PORT"
        value = var.db_port
      },
      {
        key   = "DB_USER"
        value = var.db_user
      },
      {
        key   = "DB_PASSWORD"
        value = var.db_password
      },
      {
        key   = "DB_NAME"
        value = var.db_name
      }
    ]
  }
}

resource "render_service" "realtime_service" {
  name               = "alcall-realtime-service"
  repo               = var.github_repo_url
  type               = "web_service"
  auto_deploy        = true

  web_service_details = {
    plan               = var.render_default_plan
    region             = var.render_frankfurt_region
    docker_context     = "services/realtime-service"
    docker_file_path   = "Dockerfile"
    health_check_path  = "/health"
    env                = "docker"
  }
}

resource "render_service" "janus_service" {
  name               = "alcall-janus-service"
  repo               = var.github_repo_url
  type               = "web_service"
  auto_deploy        = true

  web_service_details = {
    plan               = var.render_default_plan
    region             = var.render_frankfurt_region
    docker_context     = "services/janus-service"
    docker_file_path   = "Dockerfile"
    env                = "docker"

    env_vars = [
      {
        key   = "JANUS_LOG_LEVEL"
        value = var.janus_log_level
      },
      {
        key   = "JANUS_LOG_TIMESTAMPS"
        value = var.janus_log_timestamps
      },
      {
        key   = "JANUS_HTTP_PORT"
        value = var.janus_http_port
      },
      {
        key   = "PORT"
        value = var.janus_http_port # Using the same port for consistency
      }
    ]
  }
}

resource "render_service" "gateway_service" {
  name               = "alcall-gateway-service"
  repo               = var.github_repo_url
  type               = "web_service"
  auto_deploy        = true

  web_service_details = {
    plan               = var.render_default_plan
    region             = var.render_frankfurt_region
    docker_context     = "services/gateway-service"
    docker_file_path   = "Dockerfile"
    health_check_path  = "/health"
    env                = "docker"

    env_vars = [
      {
        key   = "GATEWAY_SERVICE_AUTH_SERVICE_URL"
        value = render_service.auth_service.web_service_details.url
      },
      {
        key   = "GATEWAY_SERVICE_USER_SERVICE_URL"
        value = render_service.user_service.web_service_details.url
      },
      {
        key   = "GATEWAY_SERVICE_MESSAGE_SERVICE_URL"
        value = render_service.message_service.web_service_details.url
      }
    ]
  }
}

resource "render_service" "ai_service" {
  name                          = "alcall-ai-service"
  repo                          = var.github_repo_url
  type                          = "web_service"
  auto_deploy                   = true

  web_service_details = {
    plan                       = var.render_default_plan
    region                     = var.render_frankfurt_region
    health_check_path = "/health"
    env = "go"
    native = {
      build_command = "go build -o main"
      start_command = "./main"
      runtime       = "go"
      root_directory = "services/ai-service"
    }
  }
}

resource "render_service" "payment_service" {
  name                          = "alcall-payment-service"
  repo                          = var.github_repo_url
  type                          = "web_service"
  auto_deploy                   = true

  web_service_details = {
    plan                       = var.render_default_plan
    region                     = var.render_frankfurt_region
    health_check_path = "/health"
    env = "go"
    native = {
      build_command = "go build -o main"
      start_command = "./main"
      runtime       = "go"
      root_directory = "services/payment-service"
    }
  }
}

resource "render_service" "web_frontend" {
  name               = "unifiedchat-frontend"
  repo               = var.github_repo_url
  type               = "web_service"
  auto_deploy        = true

  web_service_details = {
    plan               = var.render_default_plan
    region             = var.render_oregon_region
    health_check_path  = "/"
    start_command      = "next start"
    build_command      = "npm install && npm run build"
    env                = "node"

    native = {
      runtime       = "node"
      root_directory = "web/frontend"
    }

    env_vars = [
      {
        key   = "PORT"
        value = var.web_frontend_port
      },
      {
        key   = "NEXT_PUBLIC_AUTH_API_URL"
        value = "${render_service.auth_service.web_service_details.url}/api/v1"
      },
      {
        key   = "NEXT_PUBLIC_MESSAGE_API_URL"
        value = render_service.message_service.web_service_details.url
      },
      {
        key   = "NEXT_PUBLIC_REALTIME_API_URL"
        value = render_service.realtime_service.web_service_details.url
      },
      {
        key   = "NEXT_PUBLIC_JANUS_URL"
        value = "wss://${render_service.janus_service.name}.onrender.com/janus"
      },
      {
        key   = "NEXT_PUBLIC_JANUS_HTTP_URL"
        value = render_service.janus_service.web_service_details.url
      },
      {
        key   = "NEXT_PUBLIC_FORCE_NORMAL_MODE"
        value = var.web_frontend_force_normal_mode
      }
    ]
  }
}
