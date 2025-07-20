package handlers

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	ID        string    `json:"id" gorm:"primaryKey"`
	LocalID   string    `json:"local_id,omitempty" gorm:"-"`
	From      int       `json:"from"` // Changed to int to store user ID
	To        int       `json:"to"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Status    string    `json:"status"`
}

var DB *gorm.DB

func SendMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var msg Message
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if msg.ID == "" || msg.From == 0 || msg.To == 0 {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Set timestamp and initial status
	msg.Timestamp = time.Now()
	msg.Status = "sent"

	// Save message to database
	if result := DB.Create(&msg); result.Error != nil {
		log.Printf("Failed to save message to database: %v", result.Error)
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}

	// Send notification to realtime service
	notification := struct {
		Type    string  `json:"type"`
		Message Message `json:"message"`
	}{
		Type:    "new_message",
		Message: msg,
	}

	jsonData, err := json.Marshal(notification)
	if err != nil {
		log.Printf("Failed to marshal notification: %v", err)
		// Don't fail the request if notification fails
	} else {
		// Try to notify realtime service
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Post("http://unifiedchat-realtime-service:8084/notify", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Failed to send notification: %v", err)
		} else {
			resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				log.Printf("Realtime service returned non-OK status: %d", resp.StatusCode)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msg)
}

func GetMessagesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "Missing user_id parameter", http.StatusBadRequest)
		return
	}

	var messages []Message
	if result := DB.Where("\"to\" = ? OR \"from\" = ?", userID, userID).Find(&messages); result.Error != nil {
		log.Printf("Failed to retrieve messages from database: %v", result.Error)
		http.Error(w, "Failed to retrieve messages", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func UpdateMessageStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "PUT" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var update struct {
		MessageID string `json:"message_id"`
		Status    string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if update.MessageID == "" || update.Status == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	var msg Message
	if result := DB.Where("id = ?", update.MessageID).First(&msg); result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			http.Error(w, "Message not found", http.StatusNotFound)
		} else {
			log.Printf("Failed to retrieve message from database: %v", result.Error)
			http.Error(w, "Failed to retrieve message", http.StatusInternalServerError)
		}
		return
	}

	msg.Status = update.Status
	if result := DB.Save(&msg); result.Error != nil {
		log.Printf("Failed to update message status in database: %v", result.Error)
		http.Error(w, "Failed to update message status", http.StatusInternalServerError)
		return
	}

	// Send notification about status update
	notification := struct {
		Type    string  `json:"type"`
		Message Message `json:"message"`
	}{
		Type:    "message_status",
		Message: msg,
	}

	jsonData, err := json.Marshal(notification)
	if err != nil {
		log.Printf("Failed to marshal status notification: %v", err)
		// Don't fail the request if notification fails
	} else {
		// Try to notify realtime service
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Post("http://unifiedchat-realtime-service:8084/notify", "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("Failed to send status notification: %v", err)
		} else {
			resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				log.Printf("Realtime service returned non-OK status: %d", resp.StatusCode)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msg)
}

// Gin version of SendMessageHandler
func SendMessageGin(c *gin.Context) {
	var msg Message
	if err := c.ShouldBindJSON(&msg); err != nil {
		log.Printf("[ERROR] SendMessageGin - Invalid request body: %v", err)
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}
	log.Printf("[INFO] SendMessageGin - Received message: %+v", msg)
	if msg.From == 0 || msg.To == 0 {
		log.Printf("[ERROR] SendMessageGin - Missing required fields: From=%d, To=%d", msg.From, msg.To)
		c.JSON(400, gin.H{"error": "Missing required fields"})
		return
	}

	// Preserve the local ID from the request
	localID := msg.ID

	// Generate a new UUID for the message
	msg.ID = uuid.New().String()

	msg.Timestamp = time.Now()
	msg.Status = "sent"
	if result := DB.Create(&msg); result.Error != nil {
		c.JSON(500, gin.H{"error": "Failed to save message"})
		return
	}

	// Notify realtime service, passing the original localID
	go notifyRealtimeService(msg, "new_message", localID)

	c.JSON(200, msg)
}

// NEW SECURE VERSION: Get messages between two specific users only
func GetMessagesBetweenUsersGin(c *gin.Context) {
	currentUserID := c.Param("currentUserID")
	selectedUserID := c.Param("selectedUserID")

	if currentUserID == "" || selectedUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing currentUserID or selectedUserID parameter"})
		return
	}

	var messages []Message
	// Only return messages between these two specific users
	if result := DB.Where(
		"(\"from\" = ? AND \"to\" = ?) OR (\"from\" = ? AND \"to\" = ?)",
		currentUserID, selectedUserID, selectedUserID, currentUserID,
	).Order("timestamp ASC").Find(&messages); result.Error != nil {
		log.Printf("Failed to retrieve messages from database: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve messages"})
		return
	}

	log.Printf("Retrieved %d messages between users %s and %s", len(messages), currentUserID, selectedUserID)
	c.JSON(http.StatusOK, messages)
}

// DEPRECATED: Gin version of GetMessagesHandler - PRIVACY ISSUE!
func GetMessagesGin(c *gin.Context) {
	userID := c.Param("userID")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing userID parameter"})
		return
	}

	log.Printf("WARNING: Using deprecated GetMessagesGin endpoint - PRIVACY RISK! Returns ALL messages for user %s", userID)

	var messages []Message
	if result := DB.Where("\"to\" = ? OR \"from\" = ?", userID, userID).Find(&messages); result.Error != nil {
		log.Printf("Failed to retrieve messages from database: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve messages"})
		return
	}
	c.JSON(http.StatusOK, messages)
}

// Gin version of UpdateMessageStatusHandler
func UpdateMessageStatusGin(c *gin.Context) {
	id := c.Param("id")
	var update struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}
	if id == "" || update.Status == "" {
		c.JSON(400, gin.H{"error": "Missing required fields"})
		return
	}
	var msg Message
	if result := DB.Where("id = ?", id).First(&msg); result.Error != nil {
		c.JSON(404, gin.H{"error": "Message not found"})
		return
	}
	msg.Status = update.Status
	if result := DB.Save(&msg); result.Error != nil {
		c.JSON(500, gin.H{"error": "Failed to update message status"})
		return
	}
	notifyRealtimeService(msg, "message_status", "")
	c.JSON(200, msg)
}

// Helper to notify realtime service using env var
func notifyRealtimeService(msg Message, eventType string, localID string) {
	// The realtime service expects a flat structure
	notification := struct {
		Type        string `json:"type"`
		FromUserID  string `json:"from_user_id"`
		ToUserID    string `json:"to_user_id"`
		Content     string `json:"content"`
		Timestamp   int64  `json:"timestamp"`
		ID          string `json:"id"`
		LocalID     string `json:"local_id,omitempty"`
		Status      string `json:"status"`
		From        string `json:"from"` // DEPRECATED
		To          string `json:"to"`   // DEPRECATED
		MessageID   string `json:"message_id"` // DEPRECATED
	}{
		Type:       eventType,
		FromUserID: strconv.Itoa(msg.From),
		ToUserID:   strconv.Itoa(msg.To),
		Content:    msg.Content,
		Timestamp:  msg.Timestamp.Unix(),
		ID:         msg.ID,
		LocalID:    localID,
		Status:     msg.Status,

		// Keep deprecated fields for temporary backward compatibility
		From:      strconv.Itoa(msg.From),
		To:        strconv.Itoa(msg.To),
		MessageID: msg.ID,
	}

	jsonData, err := json.Marshal(notification)
	if err != nil {
		log.Printf("[ERROR] Failed to marshal notification: %v", err)
		return
	}

	realtimeServiceURL := os.Getenv("REALTIME_SERVICE_URL")
	if realtimeServiceURL == "" {
		realtimeServiceURL = "http://unifiedchat-realtime-service:8084"
	}

	log.Printf("[INFO] Sending notification to %s: %s", realtimeServiceURL+"/notify", string(jsonData))

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(realtimeServiceURL+"/notify", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("[ERROR] Failed to send notification to realtime service: %v", err)
	} else {
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			log.Printf("[WARNING] Realtime service returned non-OK status: %d", resp.StatusCode)
		} else {
			log.Printf("[INFO] Successfully sent notification to realtime service for message %s", msg.ID)
		}
	}
}
