import { useRef, useEffect, useState, useCallback } from "react";

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY_MS = 1000;

export const useWebSocket = () => {
  const ws = useRef(null);
  const onMessageCallback = useRef(null); // Callback to handle messages in consuming component
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const initializeWebSocket = useCallback(
    (socketUrl) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log("WebSocket already open. Skipping new connection attempt.");
        return;
      }

      if (ws.current) {
        console.log("Closing existing WebSocket before re-initializing.");
        ws.current.close(1000, "Re-initializing"); // Close with a normal code
      }

      console.log(`Attempting WebSocket connection to: ${socketUrl}`);
      const newWs = new WebSocket(socketUrl);
      ws.current = newWs;

      newWs.onopen = () => {
        console.log("WebSocket connected successfully");
        setReconnectAttempts(0); // Reset attempts on successful connection
      };

      newWs.onmessage = (event) => {
        if (onMessageCallback.current) {
          onMessageCallback.current(event.data);
        }
      };

      newWs.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay =
            RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts);
          console.log(
            `Attempting to reconnect WebSocket in ${
              delay / 1000
            } seconds... (Attempt ${
              reconnectAttempts + 1
            }/${MAX_RECONNECT_ATTEMPTS})`
          );
          setReconnectAttempts((prev) => prev + 1);
          setTimeout(() => initializeWebSocket(socketUrl), delay);
        } else {
          console.log(
            "Max WebSocket reconnect attempts reached or normal closure. Not reconnecting automatically."
          );
        }
      };

      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    },
    [reconnectAttempts]
  );

  const closeWebSocket = useCallback(() => {
    if (ws.current) {
      ws.current.close(1000, "Client initiated close");
      ws.current = null;
      setReconnectAttempts(0);
      console.log("WebSocket connection closed by client.");
    }
  }, []);

  const sendWebSocketMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open. Cannot send message:", message);
    }
  }, []);

  // Effect to clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return {
    initializeWebSocket,
    closeWebSocket,
    sendWebSocketMessage,
    setOnMessage: (callback) => (onMessageCallback.current = callback),
  };
};
