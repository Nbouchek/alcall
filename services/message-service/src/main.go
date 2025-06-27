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

type Message struct {
    ID         uint      `json:"id"`
    SenderID   uint      `json:"sender_id"`
    ReceiverID uint      `json:"receiver_id"`
    Content    string    `json:"content"`
    CreatedAt  time.Time `json:"created_at"`
}

// In-memory message storage for MVP
var messages []Message
var nextMessageID uint = 1

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

    // Set message ID and timestamp
    message.ID = nextMessageID
    message.CreatedAt = time.Now()
    nextMessageID++

    // Add to in-memory storage
    messages = append(messages, message)

    c.JSON(201, message)
}

func getMessages(c *gin.Context) {
    userIDStr := c.Param("user_id")
    userID, err := strconv.ParseUint(userIDStr, 10, 32)
    if err != nil {
        c.JSON(400, gin.H{"error": "Invalid user ID"})
        return
    }

    var userMessages []Message
    for _, msg := range messages {
        if msg.SenderID == uint(userID) || msg.ReceiverID == uint(userID) {
            userMessages = append(userMessages, msg)
        }
    }

    c.JSON(200, userMessages)
}
