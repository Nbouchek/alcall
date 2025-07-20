package main

import (
    "io"
    "log"
    "net/http"
    "os"
    "strings"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
)

var (
    authServiceURL    string
    userServiceURL    string
    messageServiceURL string
)

func getEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func main() {
    // Load environment variables from .env file
    if err := godotenv.Load("/app/.env"); err != nil {
        log.Printf("Error loading .env file: %v", err)
    }

    authServiceURL = getEnvOrDefault("GATEWAY_SERVICE_AUTH_SERVICE_URL", "http://unifiedchat-auth-service:8082")
    userServiceURL = getEnvOrDefault("GATEWAY_SERVICE_USER_SERVICE_URL", "http://unifiedchat-user-service:8081")
    messageServiceURL = getEnvOrDefault("GATEWAY_SERVICE_MESSAGE_SERVICE_URL", "http://unifiedchat-message-service:8083")

    r := gin.Default()

    // Standardized CORS configuration
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{"http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"}
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"}
    config.ExposeHeaders = []string{"Content-Length"}
    config.AllowCredentials = true
    r.Use(cors.New(config))

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })

    // API routes
    api := r.Group("/api/v1")
    {
        // Auth routes
        api.POST("/auth/login", proxyToAuthService)
        api.POST("/auth/register", proxyToAuthService)

        // User routes
        api.GET("/users", proxyToUserService)
        api.GET("/users/:id", proxyToUserService)
        api.PUT("/users/:id", proxyToUserService)

        // Message routes
        api.GET("/messages/:user_id", proxyToMessageService)
        api.POST("/messages", proxyToMessageService)
        // NEW: Secure route for fetching messages between specific users
        api.GET("/messages/between/:currentUserID/:selectedUserID", proxyToMessageService)
        api.PUT("/messages/:id/status", proxyToMessageService)
    }

    port := os.Getenv("GATEWAY_SERVICE_PORT")
    if port == "" {
        port = "8080"
    }
    r.Run(":" + port)
}

func proxyRequest(c *gin.Context, targetURL string, path string) {
    // Build the target URL
    url := targetURL + path

    // For debugging
    log.Printf("Proxying original request %s to %s%s", c.Request.URL.Path, targetURL, path)

    // Create the proxy request
    proxyReq, err := http.NewRequest(c.Request.Method, url, c.Request.Body)
    if err != nil {
        log.Printf("Error creating proxy request: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
        return
    }

    // Copy headers
    for header, values := range c.Request.Header {
        for _, value := range values {
            proxyReq.Header.Add(header, value)
        }
    }

    // Make the request
    client := &http.Client{}
    resp, err := client.Do(proxyReq)
    if err != nil {
        log.Printf("Error making proxy request to %s: %v", url, err)
        c.JSON(http.StatusBadGateway, gin.H{"error": "Service unavailable"})
        return
    }
    defer resp.Body.Close()

    // Read and copy response body
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        log.Printf("Error reading response body: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
        return
    }

    // Set response status and write body
    c.Status(resp.StatusCode)
    c.Writer.Write(body)
}

func proxyToAuthService(c *gin.Context) {
	// Auth service is the only one that expects the full path prefix
	proxyRequest(c, authServiceURL, c.Request.URL.Path)
}

func proxyToUserService(c *gin.Context) {
	// Strip the /api/v1 prefix, the user-service routes are at the root
	newPath := strings.TrimPrefix(c.Request.URL.Path, "/api/v1")
	proxyRequest(c, userServiceURL, newPath)
}

func proxyToMessageService(c *gin.Context) {
	// Strip the /api/v1 prefix, the message-service routes are at the root
	newPath := strings.TrimPrefix(c.Request.URL.Path, "/api/v1")
	proxyRequest(c, messageServiceURL, newPath)
}
