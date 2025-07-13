// If this file does not exist, create it in web/frontend/utils/
// and then update your _app.js or relevant component to use these functions.

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10; // Max attempts before giving up or requiring manual refresh
const RECONNECT_BASE_DELAY_MS = 1000; // 1 second

export const initializeWebSocket = (userId, username, onMessage) => {
  // Prevent multiple active WebSocket connections
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    console.log(
      "WebSocket already open or connecting. Skipping new connection attempt."
    );
    return;
  }

  // Use the environment variable value as the complete WebSocket URL
  const baseWsUrl = process.env.NEXT_PUBLIC_REALTIME_API_URL;
  const socketUrl = `${baseWsUrl}?user_id=${userId}&username=${username}`;

  console.log(`Attempting WebSocket connection to: ${socketUrl}`);
  try {
    socket = new WebSocket(socketUrl);
  } catch (error) {
    console.error("WebSocket initialization error:", error);
    return;
  }

  socket.onopen = () => {
    console.log("WebSocket connected!");
    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
  };

  socket.onmessage = (event) => {
    // console.log("WebSocket message received:", event.data); // Uncomment for verbose message logging
    if (onMessage) {
      onMessage(event.data);
    }
  };

  socket.onclose = (event) => {
    console.log("WebSocket disconnected:", event.code, event.reason);
    // Do not attempt to reconnect on normal closure (code 1000) or if max attempts reached
    if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts);
      console.log(
        `Attempting to reconnect WebSocket in ${
          delay / 1000
        } seconds... (Attempt ${
          reconnectAttempts + 1
        }/${MAX_RECONNECT_ATTEMPTS})`
      );
      reconnectAttempts++;
      setTimeout(() => initializeWebSocket(userId, username, onMessage), delay);
    } else {
      console.log(
        "Max WebSocket reconnect attempts reached or normal closure. Not reconnecting automatically."
      );
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
};

// Function to close the WebSocket connection explicitly
export const closeWebSocket = () => {
  if (socket) {
    // Use a code for normal closure to prevent automatic reconnect
    socket.close(1000, "Client initiated close");
    socket = null;
    reconnectAttempts = 0; // Reset attempts for future connections
    console.log("WebSocket connection closed by client.");
  }
};

// Function to send messages via WebSocket
export const sendWebSocketMessage = (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.warn("WebSocket not open. Cannot send message:", message);
  }
};
