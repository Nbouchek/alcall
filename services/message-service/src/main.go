package main

import (
	"fmt"
	"log"
	"os"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"github.com/alcall/services/message-service/src/handlers"
	"github.com/joho/godotenv"
)

var DB *gorm.DB

// Trigger redeploy: stateless, no database version - RESTART

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load("/app/.env"); err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	// Initialize database connection
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		dbHost, dbUser, dbPassword, dbName, dbPort)

	// Fallback for local development or if environment variables are not fully set
	if dbHost == "" || dbUser == "" || dbPassword == "" || dbName == "" || dbPort == "" {
		dsn = "host=localhost user=unifiedchat password=password123 dbname=unifiedchat port=5432 sslmode=disable"
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Assign the DB instance to the handlers package
	handlers.DB = DB

	// Auto migrate schema
	err = DB.AutoMigrate(&handlers.Message{})
	if err != nil {
		log.Fatalf("Failed to auto migrate database: %v", err)
	}
	log.Println("Database auto-migrated successfully")

	r := gin.Default()

	// Standardized CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"https://alcall-frontend.onrender.com", "http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	// API v1 routes
	api := r.Group("/api/v1")
	{
		// RESTful endpoints
		api.POST("/messages", handlers.SendMessageGin)
		api.GET("/messages/:userID", handlers.GetMessagesGin)
		// NEW SECURE ENDPOINT: Get messages between two specific users only
		api.GET("/messages/between/:currentUserID/:selectedUserID", handlers.GetMessagesBetweenUsersGin)
		api.PUT("/messages/:id/status", handlers.UpdateMessageStatusGin)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}
	log.Printf("Starting message service on :%s", port)
	r.Run(":" + port)
}
