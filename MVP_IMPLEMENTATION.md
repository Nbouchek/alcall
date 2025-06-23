# UnifiedChat MVP Implementation Guide

## Overview

This guide provides a step-by-step approach to implementing the Minimum Viable Product (MVP) for the UnifiedChat platform. The MVP focuses on core messaging functionality with basic user authentication and real-time communication.

## MVP Scope

### Core Features (MVP)

- ✅ User registration and authentication
- ✅ Real-time messaging between users
- ✅ Basic user profile management
- ✅ Simple web interface
- ✅ Message persistence
- ✅ Basic security (JWT authentication)

### Out of Scope (Future Phases)

- ❌ Multi-platform integration (WhatsApp, Telegram, etc.)
- ❌ AI features
- ❌ Payment processing
- ❌ Advanced media handling
- ❌ Mobile/desktop apps
- ❌ Enterprise features

## Phase 1: Foundation Setup (Week 1)

### Step 1: Environment Setup

1. **Install Required Tools**

   ```bash
   # Install Node.js 22.x
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install Docker Desktop
   # Download from https://www.docker.com/products/docker-desktop/

   # Install Go 1.23.x
   wget https://go.dev/dl/go1.23.0.linux-amd64.tar.gz
   sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz
   export PATH=$PATH:/usr/local/go/bin

   # Install Python 3.12 with Miniconda
   wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
   bash Miniconda3-latest-Linux-x86_64.sh
   conda create -n alcall python=3.12
   conda activate alcall
   ```

2. **Clone and Setup Project**

   ```bash
   git clone https://github.com/unified-chat/unified-chat.git
   cd unified-chat

   # Create environment file
   cp .env.example .env
   ```

### Step 2: Core Services Architecture

The MVP will use a simplified microservices architecture:

```
MVP Architecture:
├── auth-service/     # User authentication (JWT)
├── message-service/  # Core messaging logic
├── user-service/     # User management
├── gateway-service/  # API Gateway
└── web-frontend/     # React/Next.js UI
```

### Step 3: Database Setup

1. **PostgreSQL Database**

   ```bash
   # Start PostgreSQL with Docker
   docker run --name postgres-mvp \
     -e POSTGRES_DB=unifiedchat \
     -e POSTGRES_USER=unifiedchat \
     -e POSTGRES_PASSWORD=password123 \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Redis for Caching**
   ```bash
   # Start Redis with Docker
   docker run --name redis-mvp \
     -p 6379:6379 \
     -d redis:7-alpine
   ```

## Phase 2: Core Services Implementation (Week 2)

### Step 1: User Service

**File: `services/user-service/src/main.go`**

```go
package main

import (
    "log"
    "net/http"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
)

type User struct {
    ID       uint   `json:"id" gorm:"primaryKey"`
    Username string `json:"username" gorm:"unique;not null"`
    Email    string `json:"email" gorm:"unique;not null"`
    Password string `json:"-" gorm:"not null"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

func main() {
    // Database connection
    dsn := "host=localhost user=unifiedchat password=password123 dbname=unifiedchat port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Auto migrate
    db.AutoMigrate(&User{})

    // Router setup
    r := gin.Default()

    // Routes
    r.POST("/users", createUser)
    r.GET("/users/:id", getUser)
    r.PUT("/users/:id", updateUser)

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
```

### Step 2: Auth Service

**File: `services/auth-service/src/main.go`**

```go
package main

import (
    "log"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type Claims struct {
    UserID   uint   `json:"user_id"`
    Username string `json:"username"`
    jwt.RegisteredClaims
}

func main() {
    r := gin.Default()

    r.POST("/login", login)
    r.POST("/register", register)
    r.GET("/verify", verifyToken)

    r.Run(":8082")
}

func login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    // Verify credentials (call user service)
    // Generate JWT token
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
        UserID:   1, // Get from user service
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

    c.JSON(200, gin.H{"token": tokenString})
}
```

### Step 3: Message Service

**File: `services/message-service/src/main.go`**

```go
package main

import (
    "log"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
)

type Message struct {
    ID        uint      `json:"id" gorm:"primaryKey"`
    SenderID  uint      `json:"sender_id" gorm:"not null"`
    ReceiverID uint     `json:"receiver_id" gorm:"not null"`
    Content   string    `json:"content" gorm:"not null"`
    CreatedAt time.Time `json:"created_at"`
}

func main() {
    // Database connection
    dsn := "host=localhost user=unifiedchat password=password123 dbname=unifiedchat port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Auto migrate
    db.AutoMigrate(&Message{})

    r := gin.Default()

    r.POST("/messages", createMessage)
    r.GET("/messages/:user_id", getMessages)

    r.Run(":8083")
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
```

## Phase 3: Real-time Communication (Week 3)

### Step 1: WebSocket Service

**File: `services/realtime-service/src/main.go`**

```go
package main

import (
    "log"
    "net/http"
    "github.com/gorilla/websocket"
    "github.com/gin-gonic/gin"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // Allow all origins for MVP
    },
}

type Client struct {
    ID       string
    UserID   uint
    Conn     *websocket.Conn
    Send     chan []byte
}

type Message struct {
    Type      string `json:"type"`
    SenderID  uint   `json:"sender_id"`
    ReceiverID uint  `json:"receiver_id"`
    Content   string `json:"content"`
}

var clients = make(map[string]*Client)

func main() {
    r := gin.Default()

    r.GET("/ws", handleWebSocket)

    r.Run(":8084")
}

func handleWebSocket(c *gin.Context) {
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Println("WebSocket upgrade failed:", err)
        return
    }

    client := &Client{
        ID:   generateID(),
        Conn: conn,
        Send: make(chan []byte, 256),
    }

    clients[client.ID] = client

    go client.readPump()
    go client.writePump()
}

func (c *Client) readPump() {
    defer func() {
        delete(clients, c.ID)
        c.Conn.Close()
    }()

    for {
        _, message, err := c.Conn.ReadMessage()
        if err != nil {
            break
        }

        // Broadcast message to appropriate recipients
        broadcastMessage(message)
    }
}
```

## Phase 4: Web Frontend (Week 4)

### Step 1: React Frontend Setup

**File: `web/frontend/package.json`**

```json
{
  "name": "unifiedchat-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0"
  }
}
```

### Step 2: Main Chat Component

**File: `web/frontend/components/Chat.js`**

```jsx
import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io("ws://localhost:8084");
    setSocket(newSocket);

    newSocket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => newSocket.close();
  }, []);

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      const messageData = {
        type: "message",
        content: newMessage,
        sender_id: user?.id,
        receiver_id: 1, // For MVP, hardcode receiver
      };

      socket.emit("message", messageData);
      setNewMessage("");
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            <strong>{msg.sender_id}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
```

## Phase 5: API Gateway (Week 5)

### Step 1: Gateway Service

**File: `services/gateway-service/src/main.go`**

```go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

func main() {
    r := gin.Default()

    // CORS configuration
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{"http://localhost:3000"}
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
    r.Use(cors.New(config))

    // API routes
    api := r.Group("/api/v1")
    {
        // Auth routes
        api.POST("/auth/login", proxyToAuthService)
        api.POST("/auth/register", proxyToAuthService)

        // User routes
        api.GET("/users/:id", proxyToUserService)
        api.PUT("/users/:id", proxyToUserService)

        // Message routes
        api.GET("/messages", proxyToMessageService)
        api.POST("/messages", proxyToMessageService)
    }

    r.Run(":8080")
}

func proxyToAuthService(c *gin.Context) {
    // Proxy request to auth service
    // Implementation details...
}

func proxyToUserService(c *gin.Context) {
    // Proxy request to user service
    // Implementation details...
}

func proxyToMessageService(c *gin.Context) {
    // Proxy request to message service
    // Implementation details...
}
```

## Phase 6: Testing and Deployment (Week 6)

### Step 1: Basic Tests

**File: `services/user-service/src/main_test.go`**

```go
package main

import (
    "testing"
    "net/http"
    "net/http/httptest"
    "bytes"
    "encoding/json"
)

func TestCreateUser(t *testing.T) {
    // Test user creation
    userData := map[string]interface{}{
        "username": "testuser",
        "email":    "test@example.com",
        "password": "password123",
    }

    jsonData, _ := json.Marshal(userData)

    req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")

    w := httptest.NewRecorder()
    // Call handler...

    if w.Code != http.StatusCreated {
        t.Errorf("Expected status 201, got %d", w.Code)
    }
}
```

### Step 2: Docker Compose Setup

**File: `docker-compose.mvp.yml`**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: unifiedchat
      POSTGRES_USER: unifiedchat
      POSTGRES_PASSWORD: password123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  user-service:
    build: ./services/user-service
    ports:
      - "8081:8081"
    depends_on:
      - postgres
    environment:
      DB_HOST: postgres
      DB_PORT: 5432

  auth-service:
    build: ./services/auth-service
    ports:
      - "8082:8082"
    depends_on:
      - user-service

  message-service:
    build: ./services/message-service
    ports:
      - "8083:8083"
    depends_on:
      - postgres

  realtime-service:
    build: ./services/realtime-service
    ports:
      - "8084:8084"
    depends_on:
      - message-service

  gateway-service:
    build: ./services/gateway-service
    ports:
      - "8080:8080"
    depends_on:
      - auth-service
      - user-service
      - message-service

  frontend:
    build: ./web/frontend
    ports:
      - "3000:3000"
    depends_on:
      - gateway-service

volumes:
  postgres_data:
```

## Running the MVP

### Step 1: Start All Services

```bash
# Start the entire MVP stack
docker-compose -f docker-compose.mvp.yml up -d

# Check service status
docker-compose -f docker-compose.mvp.yml ps
```

### Step 2: Access the Application

```bash
# Open the web interface
open http://localhost:3000

# Test API endpoints
curl http://localhost:8080/api/v1/users
```

### Step 3: Verify Functionality

1. **User Registration**: Create a new user account
2. **User Login**: Authenticate and receive JWT token
3. **Send Message**: Send a message to another user
4. **Real-time Chat**: See messages appear in real-time
5. **Message History**: View previous messages

## Next Steps After MVP

Once the MVP is working, you can expand with:

1. **Enhanced Security**: Rate limiting, input validation, HTTPS
2. **User Interface**: Better UI/UX, responsive design
3. **Message Features**: File attachments, emoji support
4. **User Management**: User profiles, friend lists
5. **Notifications**: Push notifications, email alerts
6. **Mobile App**: React Native or Flutter app
7. **Advanced Features**: Group chats, voice messages

## Success Metrics

- ✅ Users can register and login
- ✅ Users can send and receive messages in real-time
- ✅ Messages are persisted in database
- ✅ Web interface is functional
- ✅ All services communicate properly
- ✅ Basic error handling works

This MVP provides a solid foundation for the UnifiedChat platform and can be extended with more advanced features in subsequent phases.
