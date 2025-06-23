package main

import (
    "log"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/gin-contrib/cors"
)

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type RegisterRequest struct {
    Username string `json:"username"`
    Email    string `json:"email"`
    Password string `json:"password"`
}

type Claims struct {
    UserID   uint   `json:"user_id"`
    Username string `json:"username"`
    jwt.RegisteredClaims
}

// Hardcoded users for MVP testing
var users = map[string]map[string]interface{}{
    "admin": {
        "id":       1,
        "password": "password123",
        "email":    "admin@example.com",
    },
    "user2": {
        "id":       2,
        "password": "password123",
        "email":    "user2@example.com",
    },
    "user3": {
        "id":       3,
        "password": "password123",
        "email":    "user3@example.com",
    },
}

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

    r.POST("/login", login)
    r.POST("/register", register)
    r.GET("/verify", verifyToken)

    log.Println("Auth service starting on port 8082")
    port := os.Getenv("PORT"); if port == "" { port = "8082" }; r.Run(":" + port)
}

func login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // Check if user exists and password matches
    if userData, exists := users[req.Username]; exists {
        if userData["password"] == req.Password {
            // Generate JWT token
            token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
                UserID:   uint(userData["id"].(int)),
                Username: req.Username,
                RegisteredClaims: jwt.RegisteredClaims{
                    ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
                    IssuedAt:  jwt.NewNumericDate(time.Now()),
                },
            })

            tokenString, err := token.SignedString([]byte("your-secret-key"))
            if err != nil {
                c.JSON(500, gin.H{"error": "Failed to generate token"})
                return
            }

            c.JSON(200, gin.H{"token": tokenString, "user": gin.H{"id": userData["id"], "username": req.Username}})
            return
        }
    }

    c.JSON(401, gin.H{"error": "Invalid credentials"})
}

func register(c *gin.Context) {
    var req RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // For MVP, just return success
    // In production, call user service to create user
    c.JSON(201, gin.H{"message": "User registered successfully", "user": gin.H{"username": req.Username, "email": req.Email}})
}

func verifyToken(c *gin.Context) {
    tokenString := c.GetHeader("Authorization")
    if tokenString == "" {
        c.JSON(401, gin.H{"error": "No token provided"})
        return
    }

    // Remove "Bearer " prefix
    if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
        tokenString = tokenString[7:]
    }

    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return []byte("your-secret-key"), nil
    })

    if err != nil || !token.Valid {
        c.JSON(401, gin.H{"error": "Invalid token"})
        return
    }

    if claims, ok := token.Claims.(*Claims); ok {
        c.JSON(200, gin.H{"valid": true, "user_id": claims.UserID, "username": claims.Username})
    } else {
        c.JSON(401, gin.H{"error": "Invalid token claims"})
    }
}
