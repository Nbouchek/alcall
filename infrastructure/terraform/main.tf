terraform {
  required_providers {
    render = {
      source = "render-oss/render"
      version = "~> 0.1"
    }
  }
}

provider "render" {
  owner_id = "tea-d1cp1pvfte5s738s1a30" # Replace with your actual Render Owner ID or use RENDER_OWNER_ID environment variable
  api_key = "rnd_f8L8BOjDLTWSZeHYeqNBO58vPKNM" # Replace with your actual Render API Key or use RENDER_API_KEY environment variable
}

resource "render_web_service" "auth_service" {
  name = "alcall-auth-service"
  plan = "starter"
  region = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy = true
      branch = "repo-setup-fixes"
      docker_context = "services/auth-service"
      docker_file_path = "services/auth-service/Dockerfile"
      repo_url = "https://github.com/Nbouchek/alcall"
    }
  }

  env_vars = {
    "DATABASE_URL" = {
      value = "postgresql://unifiedchat:UbVLKeEU9M2yxyyrzqqwwRr3TTktui37ZK@dpg-d1p7t1mr433s73d3oje0-a/ucalldb"
    }
  }

  health_check_path = "/health"
  num_instances = 1
}

resource "render_web_service" "gateway_service" {
  name = "alcall-gateway-service"
  plan = "starter"
  region = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy = true
      branch = "repo-setup-fixes"
      docker_context = "services/gateway-service"
      docker_file_path = "services/gateway-service/Dockerfile"
      repo_url = "https://github.com/Nbouchek/alcall"
    }
  }

  health_check_path = "/health"
  num_instances = 1
}

resource "render_web_service" "janus_service" {
  name = "alcall-janus-service"
  plan = "starter"
  region = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy = true
      branch = "repo-setup-fixes"
      docker_context = "services/janus-service"
      docker_file_path = "services/janus-service/Dockerfile"
      repo_url = "https://github.com/Nbouchek/alcall"
    }
  }

  health_check_path = "/health"
  num_instances = 1
}

resource "render_web_service" "message_service" {
  name = "alcall-message-service"
  plan = "starter"
  region = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy = true
      branch = "repo-setup-fixes"
      docker_context = "services/message-service"
      docker_file_path = "services/message-service/Dockerfile"
      repo_url = "https://github.com/Nbouchek/alcall"
    }
  }

  env_vars = {
    "DATABASE_URL" = {
      value = "postgresql://unifiedchat:UbVLKeEU9M2yxyyrzqqwwRr3TTktui37ZK@dpg-d1p7t1mr433s73d3oje0-a/ucalldb"
    }
  }

  health_check_path = "/health"
  num_instances = 1
}

resource "render_web_service" "realtime_service" {
  name = "alcall-realtime-service"
  plan = "starter"
  region = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy = true
      branch = "repo-setup-fixes"
      docker_context = "services/realtime-service"
      docker_file_path = "services/realtime-service/Dockerfile"
      repo_url = "https://github.com/Nbouchek/alcall"
    }
  }

  env_vars = {
    "DATABASE_URL" = {
      value = "postgresql://unifiedchat:UbVLKeEU9M2yxyyrzqqwwRr3TTktui37ZK@dpg-d1p7t1mr433s73d3oje0-a/ucalldb"
    }
  }

  health_check_path = "/health"
  num_instances = 1
}

resource "render_web_service" "user_service" {
  name = "alcall-user-service"
  plan = "starter"
  region = "frankfurt"

  runtime_source = {
    docker = {
      auto_deploy = true
      branch = "repo-setup-fixes"
      docker_context = "services/user-service"
      docker_file_path = "services/user-service/Dockerfile"
      repo_url = "https://github.com/Nbouchek/alcall"
    }
  }

  env_vars = {
    "DATABASE_URL" = {
      value = "postgresql://unifiedchat:UbVLKeEU9M2yxyyrzqqwwRr3TTktui37ZK@dpg-d1p7t1mr433s73d3oje0-a/ucalldb"
    }
  }

  health_check_path = "/health"
  num_instances = 1
}

resource "render_web_service" "frontend_service" {
  name = "alcall-frontend-service"
  plan = "starter"
  region = "oregon"
  start_command = "next start"

  runtime_source = {
    native_runtime = {
      auto_deploy = true
      branch = "repo-setup-fixes"
      build_command = "npm install && npm run build"
      repo_url = "https://github.com/Nbouchek/alcall"
      runtime = "node"
      root_directory = "web/frontend"
    }
  }

  env_vars = {
    "PORT" = {
      value = "3000"
    },
    "NEXT_PUBLIC_AUTH_API_URL" = {
      value = "https://unifiedchat-auth-service.onrender.com/api/v1"
    },
    "NEXT_PUBLIC_MESSAGE_API_URL" = {
      value = "https://unifiedchat-message-service.onrender.com"
    },
    "NEXT_PUBLIC_REALTIME_API_URL" = {
      value = "https://unifiedchat-realtime-service.onrender.com"
    },
    "NEXT_PUBLIC_JANUS_URL" = {
      value = "wss://unifiedchat-janus-service.onrender.com/janus"
    },
    "NEXT_PUBLIC_JANUS_HTTP_URL" = {
      value = "https://unifiedchat-janus-service.onrender.com"
    },
    "NEXT_PUBLIC_FORCE_NORMAL_MODE" = {
      value = "true"
    }
  }

  health_check_path = "/"
  num_instances = 1
}
