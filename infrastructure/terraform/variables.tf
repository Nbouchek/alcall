variable "github_repo_url" {
  description = "The URL of the GitHub repository for your services."
  type        = string
  default     = "https://github.com/nacer/alcall.git"
}

variable "render_default_plan" {
  description = "The default Render plan for web services."
  type        = string
  default     = "starter"
}

variable "render_frankfurt_region" {
  description = "The Render region for services deployed in Frankfurt."
  type        = string
  default     = "frankfurt"
}

variable "render_oregon_region" {
  description = "The Render region for services deployed in Oregon (e.g., frontend)."
  type        = string
  default     = "oregon"
}

variable "db_url" {
  description = "The full PostgreSQL database connection URL."
  type        = string
  default     = "postgresql://unifiedchat:UbVLKeEU9M2yyxyrzqwwRr3TTktui37ZK@dpg-d1p7tlmr433s73d3oje0-a/ucalldb"
}

variable "db_host" {
  description = "The PostgreSQL database host."
  type        = string
  default     = "dpg-d1p7tlmr433s73d3oje0-a"
}

variable "db_port" {
  description = "The PostgreSQL database port."
  type        = string
  default     = "5432"
}

variable "db_user" {
  description = "The PostgreSQL database user."
  type        = string
  default     = "unifiedchat"
}

variable "db_password" {
  description = "The PostgreSQL database password."
  type        = string
  default     = "UbVLKeEU9M2yyxyrzqwwRr3TTktui37ZK"
}

variable "db_name" {
  description = "The PostgreSQL database name."
  type        = string
  default     = "ucalldb"
}

variable "auth_service_jwt_secret" {
  description = "The JWT secret for the authentication service."
  type        = string
  default     = "your-secret-key" # IMPORTANT: Change this to a strong, random secret in production!
}

variable "janus_log_level" {
  description = "The log level for the Janus service."
  type        = string
  default     = "4"
}

variable "janus_log_timestamps" {
  description = "Whether to enable timestamps in Janus service logs."
  type        = string
  default     = "true"
}

variable "janus_http_port" {
  description = "The HTTP port for the Janus service."
  type        = string
  default     = "8088"
}

variable "web_frontend_port" {
  description = "The port for the web frontend service."
  type        = string
  default     = "3000"
}

variable "web_frontend_force_normal_mode" {
  description = "Whether to force normal mode for the web frontend."
  type        = string
  default     = "true"
}

variable "render_owner_email" {
  description = "The email associated with your Render.com account, used to identify the owner."
  type        = string
  default     = "nbouchek@gmail.com"
}
