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
    UserID   interface{}
    Conn     *websocket.Conn
    Send     chan []byte
}

type Message struct {
    Type         string      `json:"type"`
    Username     string      `json:"username,omitempty"`
    UserID       interface{} `json:"user_id,omitempty"`
    FromUserID   interface{} `json:"from_user_id,omitempty"`
    FromUsername string      `json:"from_username,omitempty"`
    ToUserID     interface{} `json:"to_user_id,omitempty"`
    RoomID       interface{} `json:"room_id,omitempty"`
    CallID       string      `json:"call_id,omitempty"`
    Timestamp    int64       `json:"timestamp,omitempty"`
    OnlineUsers  []string    `json:"online_users,omitempty"`
}

var clients = make(map[string]*Client)
var usernameToClientID = make(map[string]string)
var userIDToClientID = make(map[interface{}]string)

// Broadcast presence update to all connected clients
func broadcastPresenceUpdate() {
    onlineUsers := []string{}
    for username := range usernameToClientID {
        onlineUsers = append(onlineUsers, username)
    }

    update := Message{
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
            removeClient(client)
        }
    }
}

// Send message to specific user
func sendToUser(targetUserID interface{}, targetUsername string, message []byte) bool {
    log.Printf("Attempting to send message to user: ID=%v, Username=%s", targetUserID, targetUsername)

    // Try to find client by user ID first
    if clientID, exists := userIDToClientID[targetUserID]; exists {
        if client, exists := clients[clientID]; exists {
            log.Printf("Found client by user ID: %v", targetUserID)
            select {
            case client.Send <- message:
                log.Printf("Message sent successfully to user ID: %v", targetUserID)
                return true
            default:
                log.Printf("Client channel full for user ID: %v", targetUserID)
                removeClient(client)
            }
        }
    }

    // Fallback: try to find client by username
    if clientID, exists := usernameToClientID[targetUsername]; exists {
        if client, exists := clients[clientID]; exists {
            log.Printf("Found client by username: %s", targetUsername)
            select {
            case client.Send <- message:
                log.Printf("Message sent successfully to username: %s", targetUsername)
                return true
            default:
                log.Printf("Client channel full for username: %s", targetUsername)
                removeClient(client)
            }
        }
    }

    log.Printf("No client found for user ID: %v, username: %s", targetUserID, targetUsername)
    return false
}

// Remove client from all maps
func removeClient(client *Client) {
    delete(clients, client.ID)
    if client.Username != "" {
        delete(usernameToClientID, client.Username)
    }
    if client.UserID != nil {
        delete(userIDToClientID, client.UserID)
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

    log.Println("New WebSocket connection established")

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
        removeClient(c)
        c.Conn.Close()
        // Broadcast presence update when user disconnects
        broadcastPresenceUpdate()
        log.Printf("Client %s disconnected", c.ID)
    }()

    for {
        _, messageBytes, err := c.Conn.ReadMessage()
        if err != nil {
            log.Printf("Error reading message from client %s: %v", c.ID, err)
            break
        }

        // Try to parse as JSON message
        var msg Message
        if err := json.Unmarshal(messageBytes, &msg); err != nil {
            // If not JSON, treat as plain text username (backward compatibility)
            username := string(messageBytes)
            log.Printf("Received plain text username: %s", username)
            c.Username = username
            usernameToClientID[username] = c.ID
            broadcastPresenceUpdate()
            continue
        }

        log.Printf("Received JSON message: %+v", msg)

        // Handle different message types
        switch msg.Type {
        case "register":
            log.Printf("Registering user: ID=%v, Username=%s", msg.UserID, msg.Username)
            c.Username = msg.Username
            c.UserID = msg.UserID
            usernameToClientID[msg.Username] = c.ID
            userIDToClientID[msg.UserID] = c.ID
            broadcastPresenceUpdate()

        case "incoming_call":
            log.Printf("Processing incoming call from %v (%s) to %v", msg.FromUserID, msg.FromUsername, msg.ToUserID)
            // Forward the call notification to the target user
            if sendToUser(msg.ToUserID, "", messageBytes) {
                log.Printf("Call notification forwarded successfully")
            } else {
                log.Printf("Failed to forward call notification - user not found")
            }

        case "call_accepted":
            log.Printf("Processing call acceptance from %v (%s) to %v", msg.FromUserID, msg.FromUsername, msg.ToUserID)
            // Forward the call acceptance to the original caller
            if sendToUser(msg.ToUserID, "", messageBytes) {
                log.Printf("Call acceptance forwarded successfully")
            } else {
                log.Printf("Failed to forward call acceptance - user not found")
            }

        case "call_ended":
            log.Printf("Processing call end from %v (%s) to %v", msg.FromUserID, msg.FromUsername, msg.ToUserID)
            // Forward the call end notification to the target user
            if sendToUser(msg.ToUserID, "", messageBytes) {
                log.Printf("Call end notification forwarded successfully")
            } else {
                log.Printf("Failed to forward call end notification - user not found")
            }

        default:
            log.Printf("Unknown message type: %s", msg.Type)
            // For unknown types, just echo back for now
            c.Send <- messageBytes
        }
    }
}

func (c *Client) writePump() {
    defer c.Conn.Close()
    for msg := range c.Send {
        if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
            log.Printf("Error writing message to client %s: %v", c.ID, err)
            break
        }
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
