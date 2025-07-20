package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alcall/services/message-service/src/handlers"
)

func TestMessageService(t *testing.T) {
	// Test sending a message
	t.Run("Send Message", func(t *testing.T) {
		msg := handlers.Message{
			ID:      "test-msg-1",
			From:    "user1",
			To:      "user2",
			Content: "Hello, World!",
		}

		jsonData, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("Failed to marshal message: %v", err)
		}

		req := httptest.NewRequest("POST", "/messages/send", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handlers.SendMessageHandler(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
		}

		var response handlers.Message
		if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if response.Status != "sent" {
			t.Errorf("Expected status 'sent', got '%s'", response.Status)
		}
	})

	// Test getting messages for a user
	t.Run("Get Messages", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/messages/get?user_id=user1", nil)
		w := httptest.NewRecorder()

		handlers.GetMessagesHandler(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
		}

		var messages []handlers.Message
		if err := json.NewDecoder(w.Body).Decode(&messages); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		// Verify the previously sent message is in the list
		found := false
		for _, msg := range messages {
			if msg.ID == "test-msg-1" {
				found = true
				if msg.From != "user1" || msg.To != "user2" {
					t.Errorf("Message details don't match: got %+v", msg)
				}
			}
		}

		if !found {
			t.Error("Sent message not found in get messages response")
		}
	})

	// Test updating message status
	t.Run("Update Message Status", func(t *testing.T) {
		update := struct {
			MessageID string `json:"message_id"`
			Status    string `json:"status"`
		}{
			MessageID: "test-msg-1",
			Status:    "delivered",
		}

		jsonData, err := json.Marshal(update)
		if err != nil {
			t.Fatalf("Failed to marshal status update: %v", err)
		}

		req := httptest.NewRequest("PUT", "/messages/status", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handlers.UpdateMessageStatusHandler(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
		}

		// Verify the status was updated
		req = httptest.NewRequest("GET", "/messages/get?user_id=user1", nil)
		w = httptest.NewRecorder()

		handlers.GetMessagesHandler(w, req)

		var messages []handlers.Message
		if err := json.NewDecoder(w.Body).Decode(&messages); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		for _, msg := range messages {
			if msg.ID == "test-msg-1" {
				if msg.Status != "delivered" {
					t.Errorf("Expected status 'delivered', got '%s'", msg.Status)
				}
			}
		}
	})

	// Test realtime notification
	t.Run("Realtime Notification", func(t *testing.T) {
		// Create a test server to mock the realtime service
		realtimeServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/notify" {
				t.Errorf("Expected path /notify, got %s", r.URL.Path)
			}

			var notification struct {
				Type    string          `json:"type"`
				Message handlers.Message `json:"message"`
			}

			if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
				t.Fatalf("Failed to decode notification: %v", err)
			}

			if notification.Type != "new_message" {
				t.Errorf("Expected type 'new_message', got '%s'", notification.Type)
			}

			w.WriteHeader(http.StatusOK)
		}))
		defer realtimeServer.Close()

		// Send a new message
		msg := handlers.Message{
			ID:      "test-msg-2",
			From:    "user1",
			To:      "user2",
			Content: "Test notification",
		}

		jsonData, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("Failed to marshal message: %v", err)
		}

		req := httptest.NewRequest("POST", "/messages/send", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handlers.SendMessageHandler(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
		}
	})
}
