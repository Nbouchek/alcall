package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
	EnableCompression: true,
}

type Client struct {
	ID       string
	UserID   string
	Username string
	Conn     *websocket.Conn
	Send     chan []byte
}

type Message struct {
	Type         string      `json:"type"`
	FromUserID   interface{} `json:"from_user_id,omitempty"`
	FromUsername string      `json:"from_username,omitempty"`
	ToUserID     interface{} `json:"to_user_id,omitempty"`
	RoomID       interface{} `json:"room_id,omitempty"`
	CallID       string      `json:"call_id,omitempty"`
	Content      string      `json:"content,omitempty"`
	Timestamp    int64       `json:"timestamp,omitempty"`
	OnlineUsers  []string    `json:"online_users,omitempty"`
	Call         *CallPayload `json:"call,omitempty"`
	ID           string      `json:"id,omitempty"`           // Corresponds to the database ID of the message
	LocalID      string      `json:"local_id,omitempty"`     // Corresponds to the optimistic UI ID
	Status       string      `json:"status,omitempty"`
}

type CallPayload struct {
	ToUserID       interface{} `json:"to_user_id"`
	FromUserID     interface{} `json:"from_user_id"`
	CallerUsername string      `json:"caller_username"`
	RoomID         string      `json:"room_id"`
	CallType       string      `json:"call_type"`
}

type Notification struct {
	Type      string `json:"type"`
	FromUserID string `json:"from_user_id"`
	ToUserID   string `json:"to_user_id"`
	Content   string `json:"content"`
	Timestamp int64  `json:"timestamp"`
	MessageID string `json:"id"` // Match the field from message-service
	LocalID   string `json:"local_id,omitempty"`
}

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	mu                 sync.RWMutex
	clients            map[string]*Client
	usernameToClientID map[string]string
	userIDToClientID   map[string]string
}

var hub = &Hub{
	clients:            make(map[string]*Client),
	usernameToClientID: make(map[string]string),
	userIDToClientID:   make(map[string]string),
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	log.Printf("Registering new client for user %s (userID: %s)", client.Username, client.UserID)

	// If a client for this UserID already exists, clean up the old one completely.
	if existingClientID, exists := h.userIDToClientID[client.UserID]; exists {
		if existingClient, ok := h.clients[existingClientID]; ok {
			log.Printf("Found stale connection for user %s. Cleaning up client %s.", client.UserID, existingClientID)
			delete(h.clients, existingClientID)
			if existingClient.Username != "" {
				delete(h.usernameToClientID, existingClient.Username)
			}
			close(existingClient.Send)
			existingClient.Conn.Close()
		}
	}

	// Register the new client.
	h.clients[client.ID] = client
	if client.Username != "" {
		h.usernameToClientID[client.Username] = client.ID
	}
	h.userIDToClientID[client.UserID] = client.ID
	log.Printf("Successfully registered client %s for user %s", client.ID, client.Username)

	// Broadcast presence update under the same lock.
	h.broadcastPresenceUpdate()
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Only unregister if this is the currently active client for the user.
	if currentClientID, exists := h.userIDToClientID[client.UserID]; exists && currentClientID == client.ID {
		log.Printf("Unregistering client %s for user %s", client.ID, client.Username)
		if client.Username != "" {
			delete(h.usernameToClientID, client.Username)
		}
		delete(h.userIDToClientID, client.UserID)
		delete(h.clients, client.ID)
		close(client.Send)

		// Broadcast that the user has gone offline.
		h.broadcastPresenceUpdate()
	} else {
		log.Printf("Ignoring unregister for stale client %s (user: %s)", client.ID, client.Username)
		// Just clean up the client map entry if it still exists for some reason
		if _, ok := h.clients[client.ID]; ok {
			delete(h.clients, client.ID)
			close(client.Send)
		}
	}
}

// broadcastPresenceUpdate sends a presence update to all clients.
// It MUST be called with the Hub's mutex already locked.
func (h *Hub) broadcastPresenceUpdate() {
	onlineUsers := make([]string, 0, len(h.usernameToClientID))
	for username := range h.usernameToClientID {
		onlineUsers = append(onlineUsers, username)
	}
	log.Printf("Broadcasting presence. Online users: %v", onlineUsers)

	update := Message{
		Type:        "presence_update",
		OnlineUsers: onlineUsers,
		Timestamp:   time.Now().Unix(),
	}

	updateBytes, err := json.Marshal(update)
	if err != nil {
		log.Printf("Error marshaling presence update: %v", err)
		return
	}

	for _, c := range h.clients {
		select {
		case c.Send <- updateBytes:
		default:
			// Don't block. If the channel is full, the client will be cleaned up eventually.
		}
	}
}

func (h *Hub) sendToUser(targetUserID string, message []byte) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	log.Printf("Attempting to send message to user ID: %s (type: %T)", targetUserID, targetUserID)
	log.Printf("Current userIDToClientID map: %+v", h.userIDToClientID)

	if clientID, exists := h.userIDToClientID[targetUserID]; exists {
		if client, ok := h.clients[clientID]; ok {
			select {
			case client.Send <- message:
				log.Printf("Successfully sent message to user ID: %s", targetUserID)
				return true
			default:
				log.Printf("Failed to send message - client channel full for user ID: %s", targetUserID)
			}
		}
	}

	log.Printf("Failed to send message - no client found for user ID: %s", targetUserID)
	return false
}

func handleWebSocket(c *gin.Context) {
	userID := c.Query("user_id")
	username := c.Query("username")
	if userID == "" || username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and username are required query parameters"})
		log.Printf("WebSocket connection attempt with missing userID or username. UserID: %s, Username: %s", userID, username)
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Error upgrading WebSocket connection for user %s (ID: %s): %v", username, userID, err)
		return
	}

	client := &Client{
		ID:       generateID(),
		UserID:   userID,
		Username: username,
		Conn:     conn,
		Send:     make(chan []byte, 256),
	}

	hub.registerClient(client)
	log.Printf("WebSocket client %s connected. UserID: %s, Username: %s", client.ID, client.UserID, client.Username)

	go client.writePump()
	go client.readPump()
}

func handleNotification(c *gin.Context) {
	var notification Notification
	if err := c.ShouldBindJSON(&notification); err != nil {
		log.Printf("[ERROR] Invalid notification format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification format"})
		return
	}

	log.Printf("[INFO] Received notification: %+v", notification)

	switch notification.Type {
	case "new_message":
		// This message is from the message-service, intended for broadcast
		msg := Message{
			Type:         "new_message",
			FromUserID:   notification.FromUserID, // Use the correct field
			FromUsername: getUsernameFromID(notification.FromUserID),
			ToUserID:     notification.ToUserID, // Use the correct field
			Content:      notification.Content,
			Timestamp:    notification.Timestamp,
			ID:           notification.MessageID,
			LocalID:      notification.LocalID,
		}
		messageBytes, err := json.Marshal(msg)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal new_message: %v", err)
			return
		}
		// Send to recipient
		hub.sendToUser(notification.ToUserID, messageBytes)
		// Also send back to sender for UI sync
		hub.sendToUser(notification.FromUserID, messageBytes)
	default:
		log.Printf("[WARNING] Unknown notification type: %s", notification.Type)
	}

	c.JSON(http.StatusOK, gin.H{"status": "notification processed"})
}

func getUsernameFromID(userID string) string {
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	if clientID, ok := hub.userIDToClientID[userID]; ok {
		if client, ok := hub.clients[clientID]; ok {
			return client.Username
		}
	}
	return "" // or a default/error value
}

func getOnlineUsers(c *gin.Context) {
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	onlineUsers := make([]string, 0, len(hub.usernameToClientID))
	for username := range hub.usernameToClientID {
		onlineUsers = append(onlineUsers, username)
	}

	c.JSON(http.StatusOK, gin.H{"online_users": onlineUsers})
}

func (c *Client) readPump() {
	defer func() {
		hub.unregisterClient(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error for client %s (user: %s): %v", c.ID, c.Username, err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Error unmarshaling message from client %s (user: %s): %v", c.ID, c.Username, err)
			continue
		}

		// Set sender information
		msg.FromUserID = c.UserID
		msg.FromUsername = c.Username
		msg.Timestamp = time.Now().Unix()

		// Handle different message types
		switch msg.Type {
		case "call_request", "call_accept", "call_reject", "call_end":
			// Handle call-related messages
			if msg.ToUserID != nil {
				targetUserIDStr := fmt.Sprintf("%v", msg.ToUserID)
				messageBytes, _ = json.Marshal(msg)
				hub.sendToUser(targetUserIDStr, messageBytes)
			}
		case "private_message":
			log.Printf("Received private_message, passing to handler.")
			handlePrivateMessage(c, msg, messageBytes)
		case "call_initiate":
			log.Printf("Received call_initiate, passing to handler.")
			handleCallInitiate(c, msg, messageBytes)
		case "call_accepted":
			log.Printf("Received call_accepted, passing to handler.")
			handleRelayMessage(c, msg, messageBytes)
		case "call_rejected":
			log.Printf("Received call_rejected, passing to handler.")
			handleRelayMessage(c, msg, messageBytes)
		case "call_ended":
			log.Printf("Received call_ended, passing to handler.")
			handleRelayMessage(c, msg, messageBytes)
		case "video_call_initiate":
			log.Printf("Received video_call_initiate, passing to handler.")
			handleCallInitiate(c, msg, messageBytes)
		case "video_call_accepted":
			log.Printf("Received video_call_accepted, passing to handler.")
			handleRelayMessage(c, msg, messageBytes)
		case "video_call_rejected":
			log.Printf("Received video_call_rejected, passing to handler.")
			handleRelayMessage(c, msg, messageBytes)
		case "video_call_ended":
			log.Printf("Received video_call_ended, passing to handler.")
			handleRelayMessage(c, msg, messageBytes)
		case "presence_request":
			hub.mu.Lock()
			hub.broadcastPresenceUpdate()
			hub.mu.Unlock()
		case "presence_heartbeat":
			// Send acknowledgment back to the client
			ack := Message{
				Type:      "presence_heartbeat_ack",
				Timestamp: time.Now().Unix(),
			}
			ackBytes, _ := json.Marshal(ack)
			select {
			case c.Send <- ackBytes:
				log.Printf("Sent heartbeat ack to client %s", c.ID)
			default:
				log.Printf("Failed to send heartbeat ack to client %s", c.ID)
			}
		default:
			log.Printf("Unknown message type: %s from client %s (user: %s)", msg.Type, c.ID, c.Username)
		}
	}
}

func handleCallInitiate(c *Client, msg Message, messageBytes []byte) {
	if msg.Call == nil || msg.Call.ToUserID == nil {
		log.Printf("ERROR: Invalid call_initiate message from user %s. Missing 'to_user_id'. Payload: %s", c.Username, string(messageBytes))
		return
	}

	targetUserID := fmt.Sprintf("%v", msg.Call.ToUserID)
	log.Printf("Relaying call_initiate from %s to user ID: %s", c.Username, targetUserID)
	if !hub.sendToUser(targetUserID, messageBytes) {
		log.Printf("Failed to relay call_initiate to user ID %s: User not found or channel blocked.", targetUserID)
	}
}

// handleRelayMessage forwards a message to the specified 'to_user_id' without modification.
// It's used for simple peer-to-peer signaling like accepting, rejecting, or ending calls.
func handleRelayMessage(c *Client, msg Message, messageBytes []byte) {
	var targetUserID string

	if msg.ToUserID != nil {
		targetUserID = fmt.Sprintf("%v", msg.ToUserID)
	} else if msg.Call != nil && msg.Call.ToUserID != nil {
		// Fallback for messages that might have the ID nested in the 'call' payload
		targetUserID = fmt.Sprintf("%v", msg.Call.ToUserID)
	} else {
		log.Printf("ERROR: Cannot relay message of type '%s' from user %s. Missing 'to_user_id'. Payload: %s", msg.Type, c.Username, string(messageBytes))
		return
	}

	log.Printf("Relaying message type '%s' from %s to user ID: %s", msg.Type, c.Username, targetUserID)
	if !hub.sendToUser(targetUserID, messageBytes) {
		log.Printf("Failed to relay message type '%s' to user ID %s: User not found or channel blocked.", msg.Type, targetUserID)
	}
}

func handlePrivateMessage(c *Client, msg Message, messageBytes []byte) {
	log.Printf("Handling private message from %s to %v", msg.FromUserID, msg.ToUserID)

	// Validate required fields
	targetUserIDStr := fmt.Sprintf("%v", msg.ToUserID)
	if targetUserIDStr == "" {
		log.Printf("Error: ToUserID is empty")
		return
	}

	// Send to recipient
	delivered := hub.sendToUser(targetUserIDStr, messageBytes)
	log.Printf("Message delivery status: %v", delivered)

	// Store message in database
	go persistMessage(msg)

	// Send delivery confirmation to sender
	confirmation := Message{
		Type:      "message_status",
		Content:   "delivered",
		Timestamp: time.Now().Unix(),
		CallID:    msg.CallID, // Include CallID for call notifications
	}

	confirmationBytes, err := json.Marshal(confirmation)
	if err != nil {
		log.Printf("Error marshaling confirmation: %v", err)
		return
	}

	select {
	case c.Send <- confirmationBytes:
		log.Printf("Sent delivery confirmation to sender")
	default:
		log.Printf("Failed to send delivery confirmation")
	}
}

func persistMessage(msg Message) {
	// Prepare message data
	data := map[string]interface{}{
		"from_user_id": msg.FromUserID,
		"to_user_id":   msg.ToUserID,
		"content":      msg.Content,
		"timestamp":    msg.Timestamp,
		"type":         msg.Type,
	}

	// Convert to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshaling message data: %v", err)
		return
	}

	// Get message service URL from environment or use default
	messageServiceURL := os.Getenv("REALTIME_SERVICE_MESSAGE_SERVICE_URL")
	if messageServiceURL == "" {
		messageServiceURL = "http://unifiedchat-message-service:8083"
	}

	// Send to message service
	resp, err := http.Post(
		messageServiceURL+"/messages",
		"application/json",
		bytes.NewBuffer(jsonData),
	)

	if err != nil {
		log.Printf("Error persisting message: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Error response from message service: %d", resp.StatusCode)
		return
	}

	log.Printf("Message successfully persisted")
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.Conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Printf("Error writing message: %v", err)
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
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

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load("/app/.env"); err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	// Redirect log output to stderr to avoid interfering with stdout for WebSocket data
	log.SetOutput(os.Stderr)

	// Create a Gin router
	router := gin.Default()

	// Add CORS middleware with WebSocket support
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowCredentials = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{
		"Origin",
		"Content-Type",
		"Authorization",
		"Accept",
		"X-Requested-With",
		"Upgrade",
		"Connection",
		"Sec-WebSocket-Key",
		"Sec-WebSocket-Version",
		"Sec-WebSocket-Extensions",
		"Sec-WebSocket-Protocol",
	}
	config.ExposeHeaders = []string{
		"Content-Length",
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Headers",
		"Access-Control-Allow-Methods",
		"Access-Control-Allow-Credentials",
	}
	router.Use(cors.New(config))

	// Define routes
	router.GET("/ws", handleWebSocket)
	router.POST("/notify", handleNotification)
	router.GET("/health", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})
	router.GET("/online-users", getOnlineUsers)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084"
	}
	log.Printf("Realtime service listening on port %s...", port)
	router.Run(fmt.Sprintf(":%s", port))
}

func init() {
	rand.Seed(time.Now().UnixNano())
}

