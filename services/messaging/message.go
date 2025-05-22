package messaging

import (
	"time"

	"github.com/google/uuid"
)

// Message represents a chat message in the system
type Message struct {
	ID          string                 `json:"id"`
	Content     string                 `json:"content"`
	SenderID    string                 `json:"sender_id"`
	RecipientID string                 `json:"recipient_id"`
	Timestamp   time.Time              `json:"timestamp"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// NewMessage creates a new message with the given content and participants
func NewMessage(content, senderID, recipientID string) *Message {
	return &Message{
		ID:          uuid.New().String(),
		Content:     content,
		SenderID:    senderID,
		RecipientID: recipientID,
		Timestamp:   time.Now(),
		Metadata:    make(map[string]interface{}),
	}
}

// IsValid checks if the message is valid
func (m *Message) IsValid() bool {
	return m.Content != "" && m.SenderID != "" && m.RecipientID != ""
}
