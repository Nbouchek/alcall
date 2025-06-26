package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
    "github.com/gorilla/websocket"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // Allow all origins for MVP
    },
}

type Client struct {
    ID       string
    Username string
    Conn     *websocket.Conn
    Send     chan []byte
}

type PresenceUpdate struct {
    Type     string   `json:"type"`
    Username string   `json:"username,omitempty"`
    OnlineUsers []string `json:"online_users,omitempty"`
}

var clients = make(map[string]*Client)
var usernameToClientID = make(map[string]string)

// Broadcast presence update to all connected clients
func broadcastPresenceUpdate() {
    onlineUsers := []string{}
    for username := range usernameToClientID {
        onlineUsers = append(onlineUsers, username)
    }

    update := PresenceUpdate{
        Type: "presence_update",
        OnlineUsers: onlineUsers,
    }

    updateBytes, err := json.Marshal(update)
    if err != nil {
        log.Println("Error marshaling presence update:", err)
        return
    }

    for _, client := range clients {
        select {
        case client.Send <- updateBytes:
        default:
            // Channel is full, close connection
            close(client.Send)
            delete(clients, client.ID)
            if client.Username != "" {
                delete(usernameToClientID, client.Username)
            }
        }
    }
}

func main() {
    r := gin.Default()

    // CORS configuration - Allow external access
    config := cors.DefaultConfig()
    config.AllowAllOrigins = true  // Allow all origins for external testing
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
    r.Use(cors.New(config))

    // Root endpoint
    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "UnifiedChat Realtime Service is running."})
    })

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })

    // Online users endpoint
    r.GET("/online-users", func(c *gin.Context) {
        onlineUsers := []string{}
        for username := range usernameToClientID {
            onlineUsers = append(onlineUsers, username)
        }
        c.JSON(200, gin.H{"online_users": onlineUsers})
    })

    r.GET("/ws", handleWebSocket)

    // Use PORT environment variable for Render deployment
    port := os.Getenv("PORT")
    if port == "" {
        port = "8084" // Default fallback
    }

    log.Printf("Realtime service starting on port %s", port)
    r.Run(":" + port)
}

func handleWebSocket(c *gin.Context) {
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Println("WebSocket upgrade failed:", err)
        return
    }

    // Wait for the first message to be the username (as plain text)
    _, msg, err := conn.ReadMessage()
    if err != nil {
        log.Println("Failed to read username from client:", err)
        conn.Close()
        return
    }
    username := string(msg)
    log.Println("WebSocket client connected with username:", username)

    client := &Client{
        ID:       generateID(),
        Username: username,
        Conn:     conn,
        Send:     make(chan []byte, 256),
    }

    clients[client.ID] = client
    usernameToClientID[username] = client.ID

    // Broadcast presence update to all clients
    broadcastPresenceUpdate()

    go client.readPump()
    go client.writePump()
}

func (c *Client) readPump() {
    defer func() {
        delete(clients, c.ID)
        if c.Username != "" {
            delete(usernameToClientID, c.Username)
        }
        c.Conn.Close()

        // Broadcast presence update when user disconnects
        broadcastPresenceUpdate()
    }()

    for {
        _, message, err := c.Conn.ReadMessage()
        if err != nil {
            break
        }
        // For MVP, just echo back
        c.Send <- message
    }
}

func (c *Client) writePump() {
    for msg := range c.Send {
        c.Conn.WriteMessage(websocket.TextMessage, msg)
    }
}

func generateID() string {
    // For MVP, just use a random string
    return "client-" + RandString(8)
}

func RandString(n int) string {
    letters := []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    b := make([]rune, n)
    for i := range b {
        b[i] = letters[i%len(letters)]
    }
    return string(b)
}
