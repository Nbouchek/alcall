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
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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

// Notification struct for incoming messages from other services (e.g., message-service).
type Notification struct {
	Type        string      `json:"type"`
	FromUserID  string      `json:"from_user_id"`
	ToUserID    string      `json:"to_user_id"`
	Content     string      `json:"content"`
	Timestamp   int64       `json:"timestamp"`
	MessageID   string      `json:"id"`        // Corresponds to the database ID of the message
	LocalID     string      `json:"local_id"`  // Corresponds to the optimistic UI ID
	Status      string      `json:"status"`    // For status updates (e.g., "delivered", "read")
	RoomID      string      `json:"room_id,omitempty"`
	CallID      string      `json:"call_id,omitempty"`
	Call        *CallPayload `json:"call,omitempty"`
	// Deprecated fields, kept for backward compatibility
	From        string `json:"from"` // DEPRECATED
	To          string `json:"to"`   // DEPRECATED
}

// Message struct for WebSocket communication
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
	Status       string      `json:"status,omitempty"`       // Status of the message (e.g., "sending", "sent", "delivered", "read")
}

// CallPayload defines the structure for call-related data.
type CallPayload struct {
	ToUserID       interface{} `json:"to_user_id"`
	FromUserID     interface{} `json:"from_user_id"`
	CallerUsername string      `json:"caller_username"`
	RoomID         string      `json:"room_id"`
	CallType       string      `json:"call_type"`
}

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	mu             sync.RWMutex
	clients        map[string]*Client
	userIDToClientID map[string]string
	usernameToClientID map[string]string
	onlineUsers    map[string]bool // Added for tracking online usernames
}

var hub *Hub // Global hub instance

// NewHub creates and returns a new Hub instance.
func NewHub() *Hub {
	return &Hub{
		clients:        make(map[string]*Client),
		userIDToClientID: make(map[string]string),
		usernameToClientID: make(map[string]string),
		onlineUsers:    make(map[string]bool), // Initialize the map
	}
}

// addOnlineUser adds a username to the set of online users.
func (h *Hub) addOnlineUser(username string) {
	h.onlineUsers[username] = true
}

// removeOnlineUser removes a username from the set of online users.
func (h *Hub) removeOnlineUser(username string) {
	delete(h.onlineUsers, username)
}

// getOnlineUserList returns a slice of currently online usernames.
func (h *Hub) getOnlineUserList() []string {
	users := make([]string, 0, len(h.onlineUsers))
	for username := range h.onlineUsers {
		users = append(users, username)
	}
	return users
}

// broadcastPresenceUpdate sends an updated list of online users to all connected clients.
func (h *Hub) broadcastPresenceUpdate() {
	onlineUsers := h.getOnlineUserList()
	message := Message{
		Type:        "presence_update",
		OnlineUsers: onlineUsers,
		Timestamp:   time.Now().Unix(),
	}
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("[ERROR] Failed to marshal presence update message: %v", err)
		return
	}

	for _, client := range h.clients {
		select {
		case client.Send <- messageBytes:
		default:
			close(client.Send)
			h.unregisterClient(client)
		}
	}
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

	// Broadcast presence update when a user connects
	hub.mu.Lock()
	hub.addOnlineUser(username)
	hub.mu.Unlock()
	hub.broadcastPresenceUpdate()

	go client.writePump()
	go client.readPump()
}

// handleNotification handles incoming notifications from other services (e.g., message-service).
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
		if hub.sendToUser(notification.ToUserID, messageBytes) {
			log.Printf("[INFO] Successfully sent new_message to recipient %s", notification.ToUserID)
			// If delivered to recipient, send status update to sender
			statusUpdate := Message{
				Type:        "message_status_update",
				ID:          notification.MessageID,
				LocalID:     notification.LocalID,
				FromUserID:  notification.FromUserID,
				ToUserID:    notification.ToUserID,
				Status:      "delivered",
				Timestamp:   time.Now().Unix(),
			}
			statusUpdateBytes, err := json.Marshal(statusUpdate)
			if err != nil {
				log.Printf("[ERROR] Failed to marshal status_update: %v", err)
			} else {
				hub.sendToUser(notification.FromUserID, statusUpdateBytes)
				log.Printf("[INFO] Sent message_status_update to sender %s for message ID %s", notification.FromUserID, notification.MessageID)
			}
		} else {
			log.Printf("[WARNING] Failed to send new_message to recipient %s. User not online?", notification.ToUserID)
			// Optionally send a "not delivered" status back to sender
			statusUpdate := Message{
				Type:        "message_status_update",
				ID:          notification.MessageID,
				LocalID:     notification.LocalID,
				FromUserID:  notification.FromUserID,
				ToUserID:    notification.ToUserID,
				Status:      "not_delivered",
				Timestamp:   time.Now().Unix(),
			}
			statusUpdateBytes, err := json.Marshal(statusUpdate)
			if err != nil {
				log.Printf("[ERROR] Failed to marshal status_update for not_delivered: %v", err)
			} else {
				hub.sendToUser(notification.FromUserID, statusUpdateBytes)
				log.Printf("[INFO] Sent message_status_update 'not_delivered' to sender %s for message ID %s", notification.FromUserID, notification.MessageID)
			}
		}
		// Always send to sender for UI sync (even if recipient is offline)
		// This ensures the sender's UI updates with the message they just sent.
		// The status update above handles the *delivery* status.
		hub.sendToUser(notification.FromUserID, messageBytes)
		log.Printf("[INFO] Sent new_message to sender %s for UI sync", notification.FromUserID)

	case "call_request", "call_accept", "call_reject", "call_end", "call_initiate", "call_accepted", "call_rejected", "call_ended", "video_call_initiate", "video_call_accepted", "video_call_rejected", "video_call_ended":
		// Handle call-related messages by relaying them directly
		msg := Message{
			Type:         notification.Type,
			FromUserID:   notification.FromUserID,
			FromUsername: getUsernameFromID(notification.FromUserID),
			ToUserID:     notification.ToUserID,
			RoomID:       notification.RoomID,
			CallID:       notification.CallID,
			Content:      notification.Content,
			Timestamp:    notification.Timestamp,
			Call:         notification.Call,
			ID:           notification.MessageID,
			LocalID:      notification.LocalID,
			Status:       notification.Status,
		}
		messageBytes, err := json.Marshal(msg)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal call-related message: %v", err)
			return
		}
		if msg.ToUserID != nil {
			targetUserIDStr := fmt.Sprintf("%v", msg.ToUserID)
			if hub.sendToUser(targetUserIDStr, messageBytes) {
				log.Printf("[INFO] Successfully relayed %s to user %s", msg.Type, targetUserIDStr)
			} else {
				log.Printf("[WARNING] Failed to relay %s to user %s. User not online?", msg.Type, targetUserIDStr)
			}
		} else {
			log.Printf("[WARNING] Call-related message of type %s missing ToUserID. Not relaying.", msg.Type)
		}

	case "message_read":
		// Handle read receipt: update status for the sender
		statusUpdate := Message{
			Type:       "message_status_update",
			ID:         notification.MessageID,
			LocalID:    notification.LocalID,
			FromUserID: notification.FromUserID, // The reader is the recipient of the original message
			ToUserID:   notification.ToUserID,   // The original sender
			Status:     "read",
			Timestamp:  time.Now().Unix(),
		}
		statusUpdateBytes, err := json.Marshal(statusUpdate)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal read receipt status update: %v", err)
		} else {
			hub.sendToUser(notification.ToUserID, statusUpdateBytes) // Send to the original sender
			log.Printf("[INFO] Sent message_status_update 'read' to sender %s for message ID %s", notification.ToUserID, notification.MessageID)
		}

	case "presence_update":
		// This notification comes from auth-service/user-service via REST call, triggered by login/logout.
		// It broadcasts the online status of a user to all connected clients.
		onlineStatus := notification.Content // "online" or "offline"
		userID := notification.FromUserID
		username := getUsernameFromID(userID)
		log.Printf("[INFO] Received presence_update for user %s (%s): %s", username, userID, onlineStatus)

		// Update internal hub state
		hub.mu.Lock()
		if onlineStatus == "online" {
			// Find client by UserID and update its status
			if clientID, exists := hub.userIDToClientID[userID]; exists {
				if client, ok := hub.clients[clientID]; ok {
					client.Username = username // Ensure username is up-to-date
					client.UserID = userID
					log.Printf("[INFO] Updated client %s to online: UserID=%s, Username=%s", clientID, userID, username)
				}
			} else {
				log.Printf("[WARNING] No active client found for online user %s (%s). This might be a stale update or a new connection is expected.", username, userID)
			}
			hub.addOnlineUser(username)
		} else if onlineStatus == "offline" {
			hub.removeOnlineUser(username)
		}
		hub.mu.Unlock()

		// Broadcast presence update to all connected clients
		hub.broadcastPresenceUpdate()

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

	onlineUsers := hub.getOnlineUserList() // Use the helper method

	c.JSON(http.StatusOK, gin.H{"online_users": onlineUsers})
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a goroutine for each individual websocket connection.
// The application ensures that there is at most one reader on a connection by invoking
// ws.ReadMessage synchronously in this goroutine.
func (c *Client) readPump() {
	defer func() {
		hub.unregisterClient(c)
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error unmarshaling message from client %s: %v", c.ID, err)
			continue
		}

		// Set FromUserID and FromUsername based on the client sending the message
		msg.FromUserID = c.UserID
		msg.FromUsername = c.Username

		log.Printf("Received message from client %s (user: %s): %+v", c.ID, c.Username, msg)

		// Marshal the message once for relaying/broadcasting
		messageBytes, err := json.Marshal(msg)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal message for relay: %v", err)
			continue
		}

		// Handle different message types received from WebSocket clients
		switch msg.Type {
		case "call_request", "call_accept", "call_reject", "call_end":
			// Handle call-related messages
			if msg.ToUserID != nil {
				targetUserIDStr := fmt.Sprintf("%v", msg.ToUserID)
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
		case "message_read":
			// Send a notification to the message service to update the status
			go func(readMsg Message) {
				notificationPayload := map[string]interface{}{
					"type":       "message_read",
					"id":         readMsg.ID,
					"local_id":   readMsg.LocalID,
					"from_user_id": readMsg.FromUserID, // The reader
					"to_user_id":   readMsg.ToUserID,   // The sender of the original message
				}
				jsonData, err := json.Marshal(notificationPayload)
				if err != nil {
					log.Printf("[ERROR] Failed to marshal message_read notification: %v", err)
					return
				}

				messageServiceURL := os.Getenv("REALTIME_SERVICE_MESSAGE_SERVICE_URL")
				if messageServiceURL == "" {
					messageServiceURL = "http://alcall-message-service:8083"
				}

				resp, err := http.Post(messageServiceURL+"/notify-status", "application/json", bytes.NewBuffer(jsonData))
				if err != nil {
					log.Printf("[ERROR] Failed to send message_read notification to message service: %v", err)
				} else {
					defer resp.Body.Close()
					if resp.StatusCode != http.StatusOK {
						log.Printf("[WARNING] Message service returned non-OK status for message_read: %d", resp.StatusCode)
					} else {
						log.Printf("[INFO] Successfully sent message_read notification to message service for message ID %s", readMsg.ID)
					}
				}
			}(msg)

			// Also, immediately send a status update back to the sender via WebSocket
			statusUpdate := Message{
				Type:        "message_status_update",
				ID:          msg.ID,
				LocalID:     msg.LocalID,
				FromUserID:  msg.FromUserID,
				ToUserID:    msg.ToUserID,
				Status:      "read",
				Timestamp:   time.Now().Unix(),
			}
			statusUpdateBytes, err := json.Marshal(statusUpdate)
			if err != nil {
				log.Printf("[ERROR] Failed to marshal read receipt status update for WebSocket: %v", err)
			} else {
				hub.sendToUser(fmt.Sprintf("%v", msg.ToUserID), statusUpdateBytes) // Send to the original sender
				log.Printf("[INFO] Sent message_status_update 'read' to sender %v via WebSocket for message ID %s", msg.ToUserID, msg.ID)
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

	// Send delivery confirmation to sender (this will now be handled by handleNotification)
	// The frontend will optimistically show "sending" and then update based on the "message_status_update"
	// from the realtime service.
}

func persistMessage(msg Message) {
	// Prepare message data
	data := map[string]interface{}{
		"id":           msg.ID, // Pass the ID for consistent tracking
		"local_id":     msg.LocalID,
		"from_user_id": fmt.Sprintf("%v", msg.FromUserID),
		"to_user_id":   fmt.Sprintf("%v", msg.ToUserID),
		"content":      msg.Content,
		"timestamp":    msg.Timestamp,
		"type":         msg.Type,
		"status":       "sent", // Initial status when saving
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
		// Use the likely internal Render service name and port for message service
		messageServiceURL = "http://alcall-message-service:8083"
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

	log.Printf("Message successfully persisted to message service")
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

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

var DB *gorm.DB

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load("/app/.env"); err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	// Initialize the hub
	hub = NewHub()

	// Start hub goroutine
	// go hub.run() // Removed as hub.run is undefined

	router := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"https://alcall-frontend.onrender.com", "http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"}
	config.ExposeHeaders = []string{"Content-Length"}
	config.AllowCredentials = true
	router.Use(cors.New(config))

	// Set trusted proxies to allow Gin to correctly parse client IPs from reverse proxies
	// IMPORTANT: In production, configure this more securely based on your proxy setup.
	if err := router.SetTrustedProxies(nil); err != nil {
		log.Fatalf("Failed to set trusted proxies: %v", err)
	}

	// WebSocket endpoint
	router.GET("/ws", handleWebSocket)

	// Notification endpoint for internal service communication
	router.POST("/notify", handleNotification)

	// REST endpoint to get online users
	router.GET("/online-users", getOnlineUsers)

	// Health check endpoint
	router.GET("/health", healthCheck)

	// Get port from environment variable, default to 8084
	port := os.Getenv("PORT")
	if port == "" {
		port = "8084" // Default port if not set by environment
	}

	// Initialize GORM for PostgreSQL
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		dbHost, dbUser, dbPassword, dbName, dbPort)

	// Fallback for local development if environment variables are not fully set
	if dbHost == "" || dbUser == "" || dbPassword == "" || dbName == "" || dbPort == "" {
		dsn = "host=postgres user=unifiedchat password=password123 dbname=unifiedchat port=5432 sslmode=disable"
	}

	var errDB error
	DB, errDB = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if errDB != nil {
		log.Fatalf("Failed to connect to database: %v", errDB)
	}
	log.Println("Database connection established for Realtime Service")

	log.Printf("Realtime service starting on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// healthCheck responds to health check requests.
func healthCheck(c *gin.Context) {
	log.Println("Health check endpoint hit!")
	c.String(http.StatusOK, "OK")
}

