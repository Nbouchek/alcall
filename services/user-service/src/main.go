package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Trigger redeploy: stateless, no database version - RESTART

type User struct {
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Username  string    `json:"username" gorm:"unique;not null"`
	Email     string    `json:"email" gorm:"unique;not null"`
	Password  string    `json:"-" gorm:"not null"` // Store hashed password, not returned in JSON
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

var DB *gorm.DB // Global variable for the database connection

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load("/app/.env"); err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	// Database connection with retry logic
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", dbHost, dbPort, dbUser, dbPassword, dbName)

	if dbHost == "" || dbPort == "" || dbUser == "" || dbPassword == "" || dbName == "" {
		dsn = "host=localhost user=user password=password dbname=chat_db port=5432 sslmode=disable" // Fallback for development outside Docker
		log.Printf("Warning: One or more database environment variables are empty. Using default DSN: %s", dsn)
	}

	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		var err error
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			log.Println("Successfully connected to the database.")
			break
		}
		log.Printf("Failed to connect to database (attempt %d/%d): %v", i+1, maxRetries, err)
		time.Sleep(5 * time.Second) // Wait before retrying
	}

	if DB == nil {
		log.Fatalf("Failed to connect to database after %d retries.", maxRetries)
	}

	// Auto-migrate the schema with retry logic
	for i := 0; i < maxRetries; i++ {
		err := DB.AutoMigrate(&User{})
		if err == nil {
			log.Println("Successfully auto-migrated schema.")
			break
		}
		log.Printf("Failed to auto-migrate schema (attempt %d/%d): %v", i+1, maxRetries, err)
		time.Sleep(5 * time.Second) // Wait before retrying
	}

	// Seed initial users if none exist
	var userCount int64
	DB.Model(&User{}).Count(&userCount)
	if userCount == 0 {
		log.Println("No users found, seeding initial users...")
		initialUsers := []User{
			{Username: "nacer", Email: "nacer@example.com", Password: "password123"},
			{Username: "ahmed", Email: "ahmed@example.com", Password: "password123"},
			{Username: "hamid", Email: "hamid@example.com", Password: "password123"},
		}
		for _, user := range initialUsers {
			if result := DB.Create(&user); result.Error != nil {
				log.Printf("Error creating initial user %s: %v", user.Username, result.Error)
			} else {
				log.Printf("Created initial user: %s (ID: %d)", user.Username, user.ID)
			}
		}
	}

	r := gin.Default()

	// Standardized CORS configuration
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	r.Use(cors.New(config))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})
	r.HEAD("/health", func(c *gin.Context) {
		c.Status(200)
	})

	// API v1 routes
	api := r.Group("/api/v1")
	{
		api.POST("/users", createUser)
		api.GET("/users/:id", getUser)
		api.PUT("/users/:id", updateUser)
		api.GET("/users", getAllUsers)
	}

	port := os.Getenv("USER_SERVICE_PORT")
	if port == "" {
		port = "8081"
	}
	log.Printf("User service starting on port %s", port)
	r.Run(":" + port)
}

func createUser(c *gin.Context) {
	var user User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Save to database
	if result := DB.Create(&user); result.Error != nil {
		log.Printf("Error creating user in database: %v", result.Error)
		c.JSON(500, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(201, gin.H{"message": "User created successfully", "user": user})
}

func getUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	var user User
	if err := DB.First(&user, id).Error; err != nil {
		log.Printf("Error retrieving user from database: %v", err)
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

	var user User
	if err := DB.First(&user, id).Error; err != nil {
		log.Printf("Error finding user for update in database: %v", err)
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

	if result := DB.Save(&user); result.Error != nil {
		log.Printf("Error updating user in database: %v", result.Error)
		c.JSON(500, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(200, user)
}

func getAllUsers(c *gin.Context) {
	var userList []User
	if err := DB.Find(&userList).Error; err != nil {
		log.Printf("Error retrieving all users from database: %v", err)
		c.JSON(500, gin.H{"error": "Failed to retrieve users"})
		return
	}
	c.JSON(200, userList)
}
