# Render Provider

The Render provider is used to interact with https://render.com

Use the navigation to the left to read about the available resources.

## Supported Service Types

* Web Service
* Private Service
* Static Site

## Render API Documentation

Here is a link to the official Render API documentation: https://api-docs.render.com/reference/introduction

## Example Usage

Do not keep your authentication password in HCL for production environments, use Terraform environment variables.

```terraform
provider "render" {
  apiKey = "your-api-key"
  email  = "your-render-email"
}

resource "render_service" "nextjs" {
  name   = "nextjs"
  repo   = "https://github.com/render-examples/nextjs-hello-world"
  type   = "web_service"
  branch = "master"

  web_service_details = {
    env    = "node"
    region = "frankfurt"
    plan   = "starter"
    native = {
      build_command = "yarn; yarn build"
      start_command = "yarn start"
    }
  }
}

resource "render_service" "mongodb" {
  name = "mongodb"
  repo = "https://github.com/render-examples/mongodb"
  type = "private_service"

  private_service_details = {
    env = "docker"

    disk = {
      name       = "db"
      mount_path = "/data/db"
      size_gb    = 10
    }
  }
}

resource "render_service" "svelte" {
  name = "mongodb"
  repo = "https://github.com/render-examples/svelte"
  type = "static_site"

  static_site_details = {
    build_command = "npm install && npm run build"
    publish_path  = "public"
  }
}
```
