package main

import (
    "log"
    "os"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/gin-contrib/cors"
)

// Trigger redeploy: stateless, no database version - RESTART

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
    "Linda": {
        "id":       4,
        "password": "Linda",
        "email":    "linda@example.com",
    },
    "Hana": {
        "id":       5,
        "password": "Hana",
        "email":    "hana@example.com",
    },
    "Adam": {
        "id":       6,
        "password": "Adam",
        "email":    "adam@example.com",
    },
    "Ahmed": {
        "id":       7,
        "password": "Ahmed",
        "email":    "ahmed@example.com",
    },
    "Hamid": {
        "id":       8,
        "password": "Hamid",
        "email":    "hamid@example.com",
    },
    "Mueen": {
        "id":       9,
        "password": "Mueen",
        "email":    "mueen@example.com",
    },
    "Nacer": {
        "id":       10,
        "password": "Nacer",
        "email":    "nacer@example.com",
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
    r.GET("/users", getUsers)

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
            // Get JWT secret from environment variable
            jwtSecret := os.Getenv("JWT_SECRET")
            if jwtSecret == "" {
                jwtSecret = "your-secret-key" // fallback for development
            }

            // Generate JWT token
            token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
                UserID:   uint(userData["id"].(int)),
                Username: req.Username,
                RegisteredClaims: jwt.RegisteredClaims{
                    ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
                    IssuedAt:  jwt.NewNumericDate(time.Now()),
                },
            })

            tokenString, err := token.SignedString([]byte(jwtSecret))
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

    // Get JWT secret from environment variable
    jwtSecret := os.Getenv("JWT_SECRET")
    if jwtSecret == "" {
        jwtSecret = "your-secret-key" // fallback for development
    }

    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return []byte(jwtSecret), nil
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

// Add function to get all users
func getUsers(c *gin.Context) {
    var userList []gin.H
    for username, userData := range users {
        userList = append(userList, gin.H{
            "id":       userData["id"],
            "username": username,
            "email":    userData["email"],
        })
    }
    c.JSON(200, userList)
}
