package main

import (
    "log"
    "os"
    "strconv"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

// Trigger redeploy: stateless, no database version - RESTART

type User struct {
    ID        uint      `json:"id"`
    Username  string    `json:"username"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// Hardcoded users for MVP testing
var users = map[uint]User{
    1: {
        ID:        1,
        Username:  "admin",
        Email:     "admin@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    },
    4: {
        ID:        4,
        Username:  "Linda",
        Email:     "linda@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    },
    5: {
        ID:        5,
        Username:  "Hana",
        Email:     "hana@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    },
    6: {
        ID:        6,
        Username:  "Adam",
        Email:     "adam@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    },
    7: {
        ID:        7,
        Username:  "Ahmed",
        Email:     "ahmed@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    },
    8: {
        ID:        8,
        Username:  "Hamid",
        Email:     "hamid@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    },
    9: {
        ID:        9,
        Username:  "Mueen",
        Email:     "mueen@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    },
    10: {
        ID:        10,
        Username:  "Nacer",
        Email:     "nacer@example.com",
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
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

    // Routes
    r.POST("/users", createUser)
    r.GET("/users/:id", getUser)
    r.PUT("/users/:id", updateUser)
    r.GET("/users", getAllUsers)

    log.Println("User service starting on port 8081")
    port := os.Getenv("PORT"); if port == "" { port = "8081" }; r.Run(":" + port)
}

func createUser(c *gin.Context) {
    var user User
    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // For MVP, just return success
    // In production, this would save to database
    c.JSON(201, gin.H{"message": "User created successfully", "user": user})
}

func getUser(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        c.JSON(400, gin.H{"error": "Invalid user ID"})
        return
    }

    user, exists := users[uint(id)]
    if !exists {
        c.JSON(404, gin.H{"error": "User not found"})
        return
    }

    c.JSON(200, user)
}

func updateUser(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.ParseUint(idStr, 10, 32)
    if err != nil {
        c.JSON(400, gin.H{"error": "Invalid user ID"})
        return
    }

    user, exists := users[uint(id)]
    if !exists {
        c.JSON(404, gin.H{"error": "User not found"})
        return
    }

    var updateData User
    if err := c.ShouldBindJSON(&updateData); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // Update user data
    user.Username = updateData.Username
    user.Email = updateData.Email
    user.UpdatedAt = time.Now()
    users[uint(id)] = user

    c.JSON(200, user)
}

func getAllUsers(c *gin.Context) {
    var userList []User
    for _, user := range users {
        userList = append(userList, user)
    }
    c.JSON(200, userList)
}
