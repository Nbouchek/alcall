package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("DATABASE_URL not found, falling back to individual environment variables.")
		// Use Render's environment variables if available, otherwise fall back to generic ones
		dbHost := os.Getenv("PGHOST")
		if dbHost == "" {
			dbHost = os.Getenv("DB_HOST")
		}
		dbPort := os.Getenv("PGPORT")
		if dbPort == "" {
			dbPort = os.Getenv("DB_PORT")
		}
		dbUser := os.Getenv("PGUSER")
		if dbUser == "" {
			dbUser = os.Getenv("DB_USER")
		}
		dbPassword := os.Getenv("PGPASSWORD")
		if dbPassword == "" {
			dbPassword = os.Getenv("DB_PASSWORD")
		}
		dbName := os.Getenv("PGDATABASE")
		if dbName == "" {
			dbName = os.Getenv("DB_NAME")
		}

		if dbHost != "" && dbPort != "" && dbUser != "" && dbName != "" {
			// For Render, it's good practice to require SSL
			dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require", dbHost, dbPort, dbUser, dbPassword, dbName)
		}
	}

	// Final fallback for local development if no DSN has been constructed
	if dsn == "" {
		dsn = "host=localhost user=user password=password dbname=chat_db port=5432 sslmode=disable"
		log.Printf("Warning: Could not construct DSN from environment variables. Using default local DSN.")
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

	r := gin.Default()

	// Standardized CORS configuration
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"https://unifiedchat-frontend.onrender.com"}
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
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", login)
			auth.POST("/register", register)
			auth.GET("/verify", verifyToken)
		}
	}

	port := os.Getenv("AUTH_SERVICE_PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("Auth service starting on port %s", port)
	r.Run(":" + port)
}

func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Error binding login request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}
	log.Printf("[DEBUG] Login Request Username: %s", req.Username)

	var user User
	// Try to find the user by username (case-insensitive)
	if result := DB.Where("lower(username) = lower(?) or lower(email) = lower(?)", req.Username, req.Username).First(&user); result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		log.Printf("Error finding user in database: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to authenticate"})
		return
	}

	// Check password
	log.Printf("[DEBUG] Found user: %s, stored password: %s, provided password: %s", user.Username, user.Password, req.Password)
	if user.Password != req.Password {
		log.Printf("[DEBUG] Password mismatch for user: %s", user.Username)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Get JWT secret from environment variable
	jwtSecret := os.Getenv("AUTH_SERVICE_JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // fallback for development
	}

	// Generate JWT token
	log.Printf("[DEBUG] Generating JWT for user ID: %d, Username: %s", user.ID, user.Username)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID:   user.ID,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		log.Printf("Error generating token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"created_at": user.CreatedAt,
			"updated_at": user.UpdatedAt,
		},
	})
}

func register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Check if username or email already exists
	var existingUser User
	if result := DB.Where("username = ?", req.Username).Or("email = ?", req.Email).First(&existingUser); result.Error == nil {
		c.JSON(409, gin.H{"error": "Username or email already exists"})
		return
	}

	// Create new user
	user := User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  req.Password, // In a real app, hash this password!
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if result := DB.Create(&user); result.Error != nil {
		log.Printf("Error creating user in database: %v", result.Error)
		c.JSON(500, gin.H{"error": "Failed to register user"})
		return
	}

	c.JSON(201, gin.H{"message": "User registered successfully", "user": user})
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
	jwtSecret := os.Getenv("AUTH_SERVICE_JWT_SECRET")
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
