package messaging

import (
	"testing"
	"time"
)

func TestMessageValidation(t *testing.T) {
	tests := []struct {
		name    string
		message *Message
		want    bool
	}{
		{
			name: "valid message",
			message: &Message{
				ID:          "123",
				Content:     "Hello, World!",
				SenderID:    "user1",
				RecipientID: "user2",
				Timestamp:   time.Now(),
			},
			want: true,
		},
		{
			name: "invalid message - empty content",
			message: &Message{
				ID:          "124",
				Content:     "",
				SenderID:    "user1",
				RecipientID: "user2",
				Timestamp:   time.Now(),
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.message.IsValid(); got != tt.want {
				t.Errorf("Message.IsValid() = %v, want %v", got, tt.want)
			}
		})
	}
}
