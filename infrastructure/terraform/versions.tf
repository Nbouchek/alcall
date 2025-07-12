terraform {
  required_providers {
    render = {
      version = "1.1.1" # Use the latest stable version
      source  = "jackall3n/render"
    }
  }
}

provider "render" {
  # api_key = var.render_api_key
  email = var.render_owner_email
}
