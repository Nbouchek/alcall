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
    // For MVP: Return hardcoded auth responses instead of 501
    if c.Request.Method == "POST" && c.FullPath() == "/api/v1/auth/login" {
        // Parse login request
        var loginReq map[string]string
        if err := c.ShouldBindJSON(&loginReq); err != nil {
            c.JSON(400, gin.H{"error": "Invalid request"})
            return
        }

        username := loginReq["username"]
        password := loginReq["password"]

        // Simple hardcoded authentication
        var userID int
        switch username {
        case "admin":
            userID = 1
        case "Nacer":
            userID = 2
        case "Linda":
            userID = 4
        case "Hana":
            userID = 5
        case "Adam":
            userID = 6
        case "Ahmed":
            userID = 7
        case "Hamid":
            userID = 8
        case "Mueen":
            userID = 9
        default:
            c.JSON(401, gin.H{"error": "Invalid credentials"})
            return
        }

        // For MVP: Accept any password
        if password == "" {
            c.JSON(400, gin.H{"error": "Password required"})
            return
        }

        // Return successful login response
        c.JSON(200, gin.H{
            "user": map[string]interface{}{
                "id":       userID,
                "username": username,
            },
            "token": "mock-jwt-token-for-mvp",
        })
        return
    }

    // Other auth endpoints still return 501
    c.JSON(501, gin.H{"error": "Not implemented in MVP stub"})
}

func proxyToUserService(c *gin.Context) {
    // For MVP: Return hardcoded users instead of 501
    if c.Request.Method == "GET" && c.Param("id") == "" {
        // GET /api/v1/users - return list of users
        users := []map[string]interface{}{
            {"id": 1, "username": "admin"},
            {"id": 2, "username": "Nacer"},
            {"id": 4, "username": "Linda"},
            {"id": 5, "username": "Hana"},
            {"id": 6, "username": "Adam"},
            {"id": 7, "username": "Ahmed"},
            {"id": 8, "username": "Hamid"},
            {"id": 9, "username": "Mueen"},
        }
        c.JSON(200, users)
        return
    }

    // Other user service endpoints still return 501
    c.JSON(501, gin.H{"error": "Not implemented in MVP stub"})
}

func proxyToMessageService(c *gin.Context) {
    // For MVP: Return basic message responses instead of 501
    if c.Request.Method == "GET" {
        // GET /api/v1/messages/:user_id - return empty message list
        c.JSON(200, []map[string]interface{}{})
        return
    }

    if c.Request.Method == "POST" {
        // POST /api/v1/messages - accept message and return success
        var messageReq map[string]interface{}
        if err := c.ShouldBindJSON(&messageReq); err != nil {
            c.JSON(400, gin.H{"error": "Invalid request"})
            return
        }

        // Return success response
        c.JSON(200, gin.H{
            "id": 1,
            "message": "Message sent successfully (MVP stub)",
        })
        return
    }

    // Other message endpoints still return 501
    c.JSON(501, gin.H{"error": "Not implemented in MVP stub"})
}
