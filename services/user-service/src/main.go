package main

import (
    "fmt"
    "log"
    "os"
    "time"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
    "golang.org/x/crypto/bcrypt"
)

type User struct {
    ID        uint      `json:"id" gorm:"primaryKey"`
    Username  string    `json:"username" gorm:"unique;not null"`
    Email     string    `json:"email" gorm:"unique;not null"`
    Password  string    `json:"-" gorm:"not null"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

var db *gorm.DB

func main() {
    dbHost := os.Getenv("DB_HOST")
    dbPort := os.Getenv("DB_PORT")
    dbUser := os.Getenv("DB_USER")
    dbPassword := os.Getenv("DB_PASSWORD")
    dbName := os.Getenv("DB_NAME")

    if dbHost == "" {
        dbHost = "localhost" // Default for local development
    }
    if dbPort == "" {
        dbPort = "5432"
    }
    if dbUser == "" {
        dbUser = "unifiedchat"
    }
    if dbPassword == "" {
        dbPassword = "password123"
    }
    if dbName == "" {
        dbName = "unifiedchat"
    }

    dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
        dbHost, dbUser, dbPassword, dbName, dbPort)
    var err error
    db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Auto migrate
    db.AutoMigrate(&User{})

    // Router setup
    r := gin.Default()

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })

    // Routes
    r.POST("/users", createUser)
    r.GET("/users/:id", getUser)
    r.PUT("/users/:id", updateUser)

    log.Println("User service starting on port 8081")
    r.Run(":8081")
}

func createUser(c *gin.Context) {
    var user User
    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(500, gin.H{"error": "Failed to hash password"})
        return
    }
    user.Password = string(hashedPassword)

    if err := db.Create(&user).Error; err != nil {
        c.JSON(500, gin.H{"error": "Failed to create user"})
        return
    }

    c.JSON(201, user)
}

func getUser(c *gin.Context) {
    id := c.Param("id")
    var user User

    if err := db.First(&user, id).Error; err != nil {
        c.JSON(404, gin.H{"error": "User not found"})
        return
    }

    c.JSON(200, user)
}

func updateUser(c *gin.Context) {
    id := c.Param("id")
    var user User

    if err := db.First(&user, id).Error; err != nil {
        c.JSON(404, gin.H{"error": "User not found"})
        return
    }

    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    if err := db.Save(&user).Error; err != nil {
        c.JSON(500, gin.H{"error": "Failed to update user"})
        return
    }

    c.JSON(200, user)
}
