package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

type Notification struct {
	Type    string      `json:"type"`
	Message interface{} `json:"message"`
}

func TestRealtimeService(t *testing.T) {
	// Test WebSocket connection
	t.Run("WebSocket Connection", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			upgrader := websocket.Upgrader{
				CheckOrigin: func(r *http.Request) bool {
					return true
				},
			}
			conn, err := upgrader.Upgrade(w, r, nil)
			if err != nil {
				t.Fatalf("Failed to upgrade connection: %v", err)
			}
			defer conn.Close()

			// Send a test message
			notification := Notification{
				Type:    "test",
				Message: "Connected successfully",
			}
			if err := conn.WriteJSON(notification); err != nil {
				t.Fatalf("Failed to write message: %v", err)
			}
		}))
		defer server.Close()

		// Convert http:// to ws://
		url := "ws" + strings.TrimPrefix(server.URL, "http")
		conn, _, err := websocket.DefaultDialer.Dial(url, nil)
		if err != nil {
			t.Fatalf("Failed to connect: %v", err)
		}
		defer conn.Close()

		// Read the test message
		var notification Notification
		if err := conn.ReadJSON(&notification); err != nil {
			t.Fatalf("Failed to read message: %v", err)
		}

		if notification.Type != "test" {
			t.Errorf("Expected type 'test', got '%s'", notification.Type)
		}
	})

	// Test notification delivery
	t.Run("Notification Delivery", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != "POST" {
				t.Errorf("Expected POST request, got %s", r.Method)
			}

			if r.URL.Path != "/notify" {
				t.Errorf("Expected path /notify, got %s", r.URL.Path)
			}

			var notification Notification
			if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
				t.Fatalf("Failed to decode notification: %v", err)
			}

			if notification.Type == "" {
				t.Error("Notification type is empty")
			}

			w.WriteHeader(http.StatusOK)
		}))
		defer server.Close()

		// Send a test notification
		notification := Notification{
			Type:    "call_incoming",
			Message: map[string]string{"from": "user1", "to": "user2"},
		}

		jsonData, err := json.Marshal(notification)
		if err != nil {
			t.Fatalf("Failed to marshal notification: %v", err)
		}

		resp, err := http.Post(server.URL+"/notify", "application/json", strings.NewReader(string(jsonData)))
		if err != nil {
			t.Fatalf("Failed to send notification: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status code %d, got %d", http.StatusOK, resp.StatusCode)
		}
	})

	// Test client management
	t.Run("Client Management", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			upgrader := websocket.Upgrader{
				CheckOrigin: func(r *http.Request) bool {
					return true
				},
			}
			conn, err := upgrader.Upgrade(w, r, nil)
			if err != nil {
				t.Fatalf("Failed to upgrade connection: %v", err)
			}
			defer conn.Close()

			// Keep connection alive for a short time
			time.Sleep(100 * time.Millisecond)
		}))
		defer server.Close()

		// Connect multiple clients
		url := "ws" + strings.TrimPrefix(server.URL, "http")
		for i := 0; i < 3; i++ {
			conn, _, err := websocket.DefaultDialer.Dial(url, nil)
			if err != nil {
				t.Fatalf("Failed to connect client %d: %v", i, err)
			}
			defer conn.Close()
		}
	})

	// Test message broadcast
	t.Run("Message Broadcast", func(t *testing.T) {
		messageReceived := make(chan bool)
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			upgrader := websocket.Upgrader{
				CheckOrigin: func(r *http.Request) bool {
					return true
				},
			}
			conn, err := upgrader.Upgrade(w, r, nil)
			if err != nil {
				t.Fatalf("Failed to upgrade connection: %v", err)
			}
			defer conn.Close()

			// Read the broadcast message
			var notification Notification
			if err := conn.ReadJSON(&notification); err != nil {
				t.Fatalf("Failed to read message: %v", err)
			}

			if notification.Type != "broadcast_test" {
				t.Errorf("Expected type 'broadcast_test', got '%s'", notification.Type)
			}

			messageReceived <- true
		}))
		defer server.Close()

		// Connect a client
		url := "ws" + strings.TrimPrefix(server.URL, "http")
		conn, _, err := websocket.DefaultDialer.Dial(url, nil)
		if err != nil {
			t.Fatalf("Failed to connect: %v", err)
		}
		defer conn.Close()

		// Send broadcast message
		notification := Notification{
			Type:    "broadcast_test",
			Message: "Test broadcast message",
		}
		if err := conn.WriteJSON(notification); err != nil {
			t.Fatalf("Failed to send broadcast: %v", err)
		}

		// Wait for message to be received
		select {
		case <-messageReceived:
			// Message received successfully
		case <-time.After(time.Second):
			t.Error("Timeout waiting for broadcast message")
		}
	})
}
