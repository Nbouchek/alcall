package main

import (
    "encoding/json"
    "log"
	"math/rand"
    "net/http"
    "os"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
    },
}

// Client represents a connected user.
type Client struct {
    ID       string
    Username string
	UserID   interface{}
    Conn     *websocket.Conn
    Send     chan []byte
}

// Message represents messages sent over WebSocket.
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
	// Chat message fields
	ID         interface{} `json:"id,omitempty"`
	SenderID   interface{} `json:"sender_id,omitempty"`
	ReceiverID interface{} `json:"receiver_id,omitempty"`
	Content    string      `json:"content,omitempty"`
}

// Hub manages clients and broadcasts messages.
type Hub struct {
	clients            map[string]*Client
	usernameToClientID map[string]string
	userIDToClientID   map[interface{}]string
	mu                 sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		clients:            make(map[string]*Client),
		usernameToClientID: make(map[string]string),
		userIDToClientID:   make(map[interface{}]string),
	}
}

var hub = newHub()

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client.ID] = client
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client.ID]; ok {
		delete(h.clients, client.ID)
		if client.Username != "" {
			delete(h.usernameToClientID, client.Username)
		}
		if client.UserID != nil {
			delete(h.userIDToClientID, client.UserID)
		}
		close(client.Send)
		log.Printf("Unregistered client: %s, Username: %s", client.ID, client.Username)
	}
}

func (h *Hub) broadcastPresenceUpdate() {
	h.mu.RLock()
	defer h.mu.RUnlock()

	onlineUsers := make([]string, 0, len(h.usernameToClientID))
	for username := range h.usernameToClientID {
        onlineUsers = append(onlineUsers, username)
    }

	update := Message{
		Type:        "presence_update",
        OnlineUsers: onlineUsers,
    }

    updateBytes, err := json.Marshal(update)
    if err != nil {
        log.Println("Error marshaling presence update:", err)
        return
    }

	log.Printf("Broadcasting presence update to %d clients. Users: %v", len(h.clients), onlineUsers)

	for clientID, client := range h.clients {
        select {
        case client.Send <- updateBytes:
        default:
			log.Printf("Client channel full or closed for %s. Removing client.", clientID)
			// Remove client if channel is closed
			delete(h.clients, clientID)
			if client.Username != "" {
				delete(h.usernameToClientID, client.Username)
			}
			if client.UserID != nil {
				delete(h.userIDToClientID, client.UserID)
			}
		}
	}
}

func (h *Hub) sendToUser(targetUserID interface{}, message []byte) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	log.Printf("Attempting to send message to user ID: %v (type: %T)", targetUserID, targetUserID)

	if clientID, exists := h.userIDToClientID[targetUserID]; exists {
		if client, ok := h.clients[clientID]; ok {
			log.Printf("Found client by user ID: %v", targetUserID)
			select {
			case client.Send <- message:
				log.Printf("Message sent successfully to user ID: %v", targetUserID)
				return true
			default:
				log.Printf("Client channel full or closed for user ID: %v. Cleaning up.", targetUserID)
				// Clean up closed client
				delete(h.clients, clientID)
				delete(h.userIDToClientID, targetUserID)
				if client.Username != "" {
					delete(h.usernameToClientID, client.Username)
				}
			}
		}
	}

	// Try with different type conversions
	switch v := targetUserID.(type) {
	case float64:
		// Try with int conversion
		if clientID, exists := h.userIDToClientID[int(v)]; exists {
			if client, ok := h.clients[clientID]; ok {
				log.Printf("Found client by converted user ID: %v -> %v", targetUserID, int(v))
				select {
				case client.Send <- message:
					log.Printf("Message sent successfully to converted user ID: %v", int(v))
					return true
				default:
					log.Printf("Client channel full or closed for converted user ID: %v. Cleaning up.", int(v))
					// Clean up closed client
					delete(h.clients, clientID)
					delete(h.userIDToClientID, int(v))
					if client.Username != "" {
						delete(h.usernameToClientID, client.Username)
					}
				}
			}
		}
	case int:
		// Try with float64 conversion
		if clientID, exists := h.userIDToClientID[float64(v)]; exists {
			if client, ok := h.clients[clientID]; ok {
				log.Printf("Found client by converted user ID: %v -> %v", targetUserID, float64(v))
				select {
				case client.Send <- message:
					log.Printf("Message sent successfully to converted user ID: %v", float64(v))
					return true
				default:
					log.Printf("Client channel full or closed for converted user ID: %v. Cleaning up.", float64(v))
					// Clean up closed client
					delete(h.clients, clientID)
					delete(h.userIDToClientID, float64(v))
					if client.Username != "" {
						delete(h.usernameToClientID, client.Username)
					}
            }
        }
    }
	}

	log.Printf("No client found for user ID: %v (tried type conversions)", targetUserID)
	log.Printf("Available user IDs: %v", h.userIDToClientID)
	return false
}

func main() {
    r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "UnifiedChat Realtime Service is running."})
    })

    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })

    r.GET("/online-users", func(c *gin.Context) {
		hub.mu.RLock()
		defer hub.mu.RUnlock()
		onlineUsers := make([]string, 0, len(hub.usernameToClientID))
		for username := range hub.usernameToClientID {
            onlineUsers = append(onlineUsers, username)
        }
        c.JSON(200, gin.H{"online_users": onlineUsers})
    })

    r.GET("/ws", handleWebSocket)

    port := os.Getenv("PORT")
    if port == "" {
		port = "8084"
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

	hub.registerClient(client)

	go client.writePump()
    go client.readPump()
}

func (c *Client) readPump() {
    defer func() {
		hub.unregisterClient(c)
        c.Conn.Close()
		hub.broadcastPresenceUpdate()
    }()

    for {
		_, messageBytes, err := c.Conn.ReadMessage()
        if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Error reading message from client %s: %v", c.ID, err)
			}
            break
        }

		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Could not unmarshal JSON: %v", err)
			continue
		}

		log.Printf("Received message type: %s from user: %s", msg.Type, msg.Username)

		switch msg.Type {
		case "register":
			hub.mu.Lock()
			c.Username = msg.Username
			c.UserID = msg.UserID
			hub.usernameToClientID[msg.Username] = c.ID
			if msg.UserID != nil {
				hub.userIDToClientID[msg.UserID] = c.ID
			}
			log.Printf("Registered client: %s, User: %s, UserID: %v", c.ID, c.Username, c.UserID)
			hub.mu.Unlock()
			hub.broadcastPresenceUpdate()

		case "logout":
			hub.mu.Lock()
			if c.Username != "" {
				delete(hub.usernameToClientID, c.Username)
			}
			if c.UserID != nil {
				delete(hub.userIDToClientID, c.UserID)
			}
			log.Printf("User logged out: %s, UserID: %v", c.Username, c.UserID)
			hub.mu.Unlock()
			hub.broadcastPresenceUpdate()

		case "incoming_call", "call_accepted", "call_declined", "call_ended":
			log.Printf("Forwarding '%s' from %s to %v", msg.Type, msg.FromUsername, msg.ToUserID)
			if !hub.sendToUser(msg.ToUserID, messageBytes) {
				log.Printf("Failed to forward message type %s - user %v not found", msg.Type, msg.ToUserID)
			}

		case "chat_message":
			log.Printf("Forwarding chat message from %v to %v", msg.SenderID, msg.ReceiverID)
			if !hub.sendToUser(msg.ReceiverID, messageBytes) {
				log.Printf("Failed to forward chat message - user %v not found", msg.ReceiverID)
			}

		default:
			log.Printf("Unknown message type: %s", msg.Type)
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

// generateID creates a random string for client IDs.
func generateID() string {
	const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 16)
    for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
    }
    return string(b)
}

func init() {
	rand.Seed(time.Now().UnixNano())
}
