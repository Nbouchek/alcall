package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "sync"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
    "github.com/gorilla/websocket"
)

type CallRequest struct {
    CallerID   uint   `json:"caller_id"`
    ReceiverID uint   `json:"receiver_id"`
}

type CallResponse struct {
    CallID     string `json:"call_id"`
    CallerID   uint   `json:"caller_id"`
    ReceiverID uint   `json:"receiver_id"`
    Status     string `json:"status"`
}

type WebSocketMessage struct {
    Type      string      `json:"type"`
    CallID    string      `json:"call_id"`
    UserID    uint        `json:"user_id"`
    Data      interface{} `json:"data"`
}

type Call struct {
    ID         string `json:"id"`
    CallerID   uint   `json:"caller_id"`
    ReceiverID uint   `json:"receiver_id"`
    Status     string `json:"status"` // "ringing", "connected", "ended"
}

var (
    upgrader = websocket.Upgrader{
        CheckOrigin: func(r *http.Request) bool {
            return true // Allow all origins for MVP
        },
    }
    calls     = make(map[string]*Call)
    clients   = make(map[uint]*websocket.Conn)
    callsMux  sync.RWMutex
    clientsMux sync.RWMutex
)

func main() {
    r := gin.Default()

    // CORS configuration
    config := cors.DefaultConfig()
    config.AllowAllOrigins = true
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
    r.Use(cors.New(config))

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy"})
    })

    // Audio call endpoints
    r.POST("/call/start", startCall)
    r.POST("/call/answer", answerCall)
    r.POST("/call/end", endCall)
    r.GET("/call/status/:call_id", getCallStatus)
    r.GET("/ws/:user_id", handleWebSocket)

    log.Println("Audio service starting on port 8085")
    port := os.Getenv("PORT")
    if port == "" {
        port = "8085"
    }
    r.Run(":" + port)
}

func startCall(c *gin.Context) {
    var req CallRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    callID := generateCallID()
    call := &Call{
        ID:         callID,
        CallerID:   req.CallerID,
        ReceiverID: req.ReceiverID,
        Status:     "ringing",
    }

    callsMux.Lock()
    calls[callID] = call
    callsMux.Unlock()

    // Notify receiver via WebSocket
    notifyUser(req.ReceiverID, WebSocketMessage{
        Type:   "incoming_call",
        CallID: callID,
        UserID: req.CallerID,
        Data:   call,
    })

    c.JSON(200, CallResponse{
        CallID:     callID,
        CallerID:   req.CallerID,
        ReceiverID: req.ReceiverID,
        Status:     "ringing",
    })
}

func answerCall(c *gin.Context) {
    var req struct {
        CallID string `json:"call_id"`
        UserID uint   `json:"user_id"`
        Answer bool   `json:"answer"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    callsMux.Lock()
    call, exists := calls[req.CallID]
    if !exists {
        callsMux.Unlock()
        c.JSON(404, gin.H{"error": "Call not found"})
        return
    }

    if req.Answer {
        call.Status = "connected"
        // Notify caller that call was answered
        notifyUser(call.CallerID, WebSocketMessage{
            Type:   "call_answered",
            CallID: req.CallID,
            UserID: req.UserID,
            Data:   call,
        })
    } else {
        call.Status = "ended"
        // Notify caller that call was rejected
        notifyUser(call.CallerID, WebSocketMessage{
            Type:   "call_rejected",
            CallID: req.CallID,
            UserID: req.UserID,
            Data:   call,
        })
    }
    callsMux.Unlock()

    c.JSON(200, gin.H{"status": "success"})
}

func endCall(c *gin.Context) {
    var req struct {
        CallID string `json:"call_id"`
        UserID uint   `json:"user_id"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    callsMux.Lock()
    call, exists := calls[req.CallID]
    if exists {
        call.Status = "ended"
        // Notify other participant
        otherUserID := call.CallerID
        if req.UserID == call.CallerID {
            otherUserID = call.ReceiverID
        }
        notifyUser(otherUserID, WebSocketMessage{
            Type:   "call_ended",
            CallID: req.CallID,
            UserID: req.UserID,
            Data:   call,
        })
    }
    callsMux.Unlock()

    c.JSON(200, gin.H{"status": "success"})
}

func getCallStatus(c *gin.Context) {
    callID := c.Param("call_id")

    callsMux.RLock()
    call, exists := calls[callID]
    callsMux.RUnlock()

    if !exists {
        c.JSON(404, gin.H{"error": "Call not found"})
        return
    }

    c.JSON(200, call)
}

func handleWebSocket(c *gin.Context) {
    userID := c.Param("user_id")
    if userID == "" {
        c.JSON(400, gin.H{"error": "User ID required"})
        return
    }

    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }
    defer conn.Close()

    // Store client connection
    clientsMux.Lock()
    clients[parseUint(userID)] = conn
    clientsMux.Unlock()

    // Cleanup on disconnect
    defer func() {
        clientsMux.Lock()
        delete(clients, parseUint(userID))
        clientsMux.Unlock()
    }()

    // Handle incoming messages
    for {
        var msg WebSocketMessage
        err := conn.ReadJSON(&msg)
        if err != nil {
            log.Printf("WebSocket read error: %v", err)
            break
        }

        // Handle different message types
        switch msg.Type {
        case "ice_candidate":
            // Forward ICE candidate to other participant
            forwardToOtherParticipant(msg)
        case "offer":
            // Forward offer to other participant
            forwardToOtherParticipant(msg)
        case "answer":
            // Forward answer to other participant
            forwardToOtherParticipant(msg)
        }
    }
}

func notifyUser(userID uint, message WebSocketMessage) {
    clientsMux.RLock()
    conn, exists := clients[userID]
    clientsMux.RUnlock()

    if exists {
        err := conn.WriteJSON(message)
        if err != nil {
            log.Printf("Failed to send message to user %d: %v", userID, err)
        }
    }
}

func forwardToOtherParticipant(msg WebSocketMessage) {
    callsMux.RLock()
    call, exists := calls[msg.CallID]
    callsMux.RUnlock()

    if !exists {
        return
    }

    // Determine the other participant
    otherUserID := call.CallerID
    if msg.UserID == call.CallerID {
        otherUserID = call.ReceiverID
    }

    // Forward the message
    notifyUser(otherUserID, msg)
}

func generateCallID() string {
    // Simple call ID generation for MVP
    return "call_" + randomString(8)
}

func randomString(length int) string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    b := make([]byte, length)
    for i := range b {
        b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
    }
    return string(b)
}

func parseUint(s string) uint {
    var result uint
    fmt.Sscanf(s, "%d", &result)
    return result
}
