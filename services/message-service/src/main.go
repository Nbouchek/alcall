package main

import (
    "fmt"
    "log"
    "os"
    "time"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
    "github.com/gin-contrib/cors"
)

type Message struct {
    ID         uint      `json:"id" gorm:"primaryKey"`
    SenderID   uint      `json:"sender_id" gorm:"not null"`
    ReceiverID uint      `json:"receiver_id" gorm:"not null"`
    Content    string    `json:"content" gorm:"not null"`
    CreatedAt  time.Time `json:"created_at"`
}

var db *gorm.DB

func main() {
    // Database connection - use environment variables for Render
    dbHost := os.Getenv("DB_HOST")
    if dbHost == "" {
        dbHost = "postgres" // fallback for local development
    }
    dbPort := os.Getenv("DB_PORT")
    if dbPort == "" {
        dbPort = "5432"
    }
    dbName := os.Getenv("DB_NAME")
    if dbName == "" {
        dbName = "unifiedchat"
    }
    dbUser := os.Getenv("DB_USER")
    if dbUser == "" {
        dbUser = "unifiedchat"
    }
    dbPassword := os.Getenv("DB_PASSWORD")
    if dbPassword == "" {
        dbPassword = "password123"
    }

    dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
        dbHost, dbUser, dbPassword, dbName, dbPort)

    var err error
    db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Auto migrate
    db.AutoMigrate(&Message{})

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

    r.POST("/messages", createMessage)
    r.GET("/messages/:user_id", getMessages)

    log.Println("Message service starting on port 8083")
    port := os.Getenv("PORT"); if port == "" { port = "8083" }; r.Run(":" + port)
}

func createMessage(c *gin.Context) {
    var message Message
    if err := c.ShouldBindJSON(&message); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    if err := db.Create(&message).Error; err != nil {
        c.JSON(500, gin.H{"error": "Failed to create message"})
        return
    }

    c.JSON(201, message)
}

func getMessages(c *gin.Context) {
    userID := c.Param("user_id")
    var messages []Message
    if err := db.Where("sender_id = ? OR receiver_id = ?", userID, userID).Find(&messages).Error; err != nil {
        c.JSON(500, gin.H{"error": "Failed to fetch messages"})
        return
    }
    c.JSON(200, messages)
}
