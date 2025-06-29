package main

import (
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    r := gin.Default()

    // CORS configuration - Allow external access
    config := cors.DefaultConfig()
    config.AllowAllOrigins = true  // Allow all origins for external testing
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
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
    }

    r.Run(":8080")
}

func proxyToAuthService(c *gin.Context) {
    // Proxy request to auth service
    c.JSON(501, gin.H{"error": "Not implemented in MVP stub"})
}

func proxyToUserService(c *gin.Context) {
    // Proxy request to user service
    c.JSON(501, gin.H{"error": "Not implemented in MVP stub"})
}

func proxyToMessageService(c *gin.Context) {
    // Proxy request to message service
    c.JSON(501, gin.H{"error": "Not implemented in MVP stub"})
}
