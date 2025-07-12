variable "render_api_key" {
  description = "API key for Render.com"
  type        = string
  sensitive   = true
}

variable "render_owner_id" {
  description = "Owner ID for Render.com"
  type        = string
}

variable "postgres_db_name" {
  description = "Name for the PostgreSQL database"
  type        = string
  default     = "alcalldb"
}

variable "postgres_db_user" {
  description = "Username for the PostgreSQL database"
  type        = string
  default     = "alcalluser"
}
