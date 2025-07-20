# Step-by-Step MVP Implementation Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Run the Setup Script

```bash
# Make sure you're in the project root
cd /Users/nacer/Dev/github/alcall

# Run the automated setup
./scripts/mvp-setup.sh
```

This script will:

- ✅ Check prerequisites (Docker, Node.js, Go, Miniconda)
- ✅ Create project structure
- ✅ Set up databases (PostgreSQL + Redis)
- ✅ Create Docker configurations
- ✅ Generate all necessary files

### Step 2: Start the MVP

```bash
# Start all services
make dev-up

# Check status
make status
```

### Step 3: Access the Application

- 🌐 **Web Interface**: http://localhost:3000
- 🔌 **API Gateway**: http://localhost:8080
- 📊 **Service Status**: `make status`

---

## 📋 Manual Implementation Steps

If you prefer to implement manually or want to understand each step:

### Phase 1: Environment Setup (Day 1)

#### 1.1 Install Prerequisites

```bash
# Check what's already installed
which docker node go conda

# Install missing tools (macOS example)
# Docker Desktop: https://www.docker.com/products/docker-desktop/
# Node.js: brew install node
# Go: brew install go
# Miniconda: https://docs.conda.io/en/latest/miniconda.html
```

#### 1.2 Create Project Structure

```bash
# Create service directories
mkdir -p services/{user-service,auth-service,message-service,realtime-service,gateway-service}/src
mkdir -p web/frontend/{components,pages,styles,utils}
mkdir -p infrastructure/{docker,kubernetes}
```

#### 1.3 Setup Environment Variables

```bash
# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unifiedchat
DB_USER=unifiedchat
DB_PASSWORD=password123
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
EOF
```

### Phase 2: Database Setup (Day 1)

#### 2.1 Start PostgreSQL

```bash
docker run --name postgres-mvp \
  -e POSTGRES_DB=unifiedchat \
  -e POSTGRES_USER=unifiedchat \
  -e POSTGRES_PASSWORD=password123 \
  -p 5432:5432 \
  -d postgres:15
```

#### 2.2 Start Redis

```bash
docker run --name redis-mvp \
  -p 6379:6379 \
  -d redis:7-alpine
```

### Phase 3: Core Services (Days 2-3)

#### 3.1 User Service Implementation

**File: `services/user-service/src/main.go`**

```go
package main

import (
    "log"
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
    // Database connection
    dsn := "host=localhost user=unifiedchat password=password123 dbname=unifiedchat port=5432 sslmode=disable"
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
```

#### 3.2 Auth Service Implementation

**File: `services/auth-service/src/main.go`**

```go
package main

import (
    "log"
    "time"
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
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

func main() {
    r := gin.Default()

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })

    r.POST("/login", login)
    r.POST("/register", register)
    r.GET("/verify", verifyToken)

    log.Println("Auth service starting on port 8082")
    r.Run(":8082")
}

func login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // For MVP, use hardcoded user validation
    // In production, call user service
    if req.Username == "admin" && req.Password == "password123" {
        // Generate JWT token
        token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
            UserID:   1,
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

        c.JSON(200, gin.H{"token": tokenString, "user": gin.H{"id": 1, "username": req.Username}})
        return
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
```

### Phase 4: Frontend Implementation (Day 4)

#### 4.1 Create Next.js App

**File: `web/frontend/pages/index.js`**

```jsx
import { useState, useEffect } from "react";
import Head from "next/head";
import axios from "axios";

export default function Home() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const login = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:8082/login",
        loginForm
      );
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setIsLoggedIn(true);
    } catch (error) {
      alert("Login failed: " + error.response?.data?.error || error.message);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post("http://localhost:8083/messages", {
        sender_id: user.id,
        receiver_id: 1, // For MVP, hardcode receiver
        content: newMessage,
      });

      setMessages((prev) => [...prev, response.data]);
      setNewMessage("");
    } catch (error) {
      alert(
        "Failed to send message: " + error.response?.data?.error ||
          error.message
      );
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get("http://localhost:8083/messages/1");
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>UnifiedChat MVP</title>
        <meta name="description" content="UnifiedChat MVP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">UnifiedChat MVP</h1>

        {!isLoggedIn ? (
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Login</h2>
            <form onSubmit={login}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Login
              </button>
            </form>
            <p className="mt-4 text-sm text-gray-600">
              Use username: admin, password: password123
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Chat</h2>
              <p className="text-sm text-gray-600">
                Logged in as: {user?.username}
              </p>
            </div>

            <div className="h-96 overflow-y-auto p-4">
              {messages.map((msg, index) => (
                <div key={index} className="mb-2">
                  <span className="font-medium">User {msg.sender_id}:</span>
                  <span className="ml-2">{msg.content}</span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded-l"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

### Phase 5: Testing (Day 5)

#### 5.1 Test the MVP

```bash
# Start all services
make dev-up

# Check service status
make status

# View logs
make logs
```

#### 5.2 Manual Testing

1. **Open Browser**: http://localhost:3000
2. **Login**: Use username `admin`, password `password123`
3. **Send Messages**: Type messages and click Send
4. **Check API**: Test endpoints directly:

   ```bash
   # Test auth service
   curl -X POST http://localhost:8082/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"password123"}'

   # Test user service
   curl http://localhost:8081/users/1

   # Test message service
   curl http://localhost:8083/messages/1
   ```

### Phase 6: Deployment (Day 6)

#### 6.1 Production Docker Compose

```bash
# Build production images
docker-compose -f docker-compose.mvp.yml build

# Start production stack
docker-compose -f docker-compose.mvp.yml up -d

# Check logs
docker-compose -f docker-compose.mvp.yml logs -f
```

---

## 🎯 Success Criteria

Your MVP is working when:

- ✅ User can login with admin/password123
- ✅ User can send messages
- ✅ Messages appear in the chat interface
- ✅ All services are running and healthy
- ✅ No errors in browser console or service logs

## 🚀 Next Steps

After MVP is working:

1. **Add Real-time WebSocket**: Replace polling with WebSocket
2. **Improve UI**: Add better styling and UX
3. **Add User Registration**: Implement proper user creation
4. **Add Message Persistence**: Store messages in database
5. **Add Security**: Input validation, rate limiting
6. **Add Tests**: Unit and integration tests

## 🆘 Troubleshooting

### Common Issues

1. **Port Conflicts**

   ```bash
   # Check what's using the ports
   lsof -i :3000
   lsof -i :8080
   lsof -i :8081
   lsof -i :8082
   lsof -i :8083
   lsof -i :8084
   ```

2. **Database Connection Issues**

   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres

   # Check PostgreSQL logs
   docker logs postgres-mvp
   ```

3. **Service Health Issues**

   ```bash
   # Check service status
   make status

   # Check specific service logs
   docker-compose -f docker-compose.mvp.yml logs user-service
   ```

4. **Frontend Issues**

   ```bash
   # Check if frontend is building
   docker-compose -f docker-compose.mvp.yml logs frontend

   # Rebuild frontend
   docker-compose -f docker-compose.mvp.yml build frontend
   ```

### Reset Everything

```bash
# Stop and remove everything
make clean

# Start fresh
./scripts/mvp-setup.sh
make dev-up
```

---

## 📚 Additional Resources

- **Detailed Implementation**: See `MVP_IMPLEMENTATION.md`
- **Architecture**: See `README.md`
- **Project Structure**: See `IMPLEMENTATION.md`
- **Quick Start**: See `MVP_README.md`

This step-by-step guide will get you from zero to a working MVP in about a week!
