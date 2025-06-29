import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Script from "next/script";
import axios from "axios";
import UserPopover from "../components/UserPopover";
import JanusAudioCall from "../components/JanusAudioCall";
import JanusVideoCall from "../components/JanusVideoCall";
import {
  FaPhone,
  FaPaperPlane,
  FaUser,
  FaSignOutAlt,
  FaRocket,
  FaStar,
  FaBell,
  FaMicrophone,
  FaBars,
  FaTimes,
  FaSearch,
  FaUsers,
  FaVideo,
  FaCog,
} from "react-icons/fa";

const AUTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  "https://unifiedchat-auth-service.onrender.com";
const MESSAGE_API_BASE_URL =
  process.env.NEXT_PUBLIC_MESSAGE_API_URL ||
  "https://unifiedchat-message-service.onrender.com";
const REALTIME_API_BASE_URL =
  process.env.NEXT_PUBLIC_REALTIME_API_URL || "http://localhost:8084";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// IS_RENDER_DEPLOYMENT is now handled as state to avoid hydration issues

// Force normal mode for now - backend services are working
const FORCE_NORMAL_MODE =
  process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true" || false;

// Debug: Log the detection will happen in useEffect after component mounts

export default function Home() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [audioServiceStatus, setAudioServiceStatus] = useState("checking");
  const [isClient, setIsClient] = useState(false);
  const [isRenderDeployment, setIsRenderDeployment] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState(new Set()); // Track actually connected users
  const [showAudioCallModal, setShowAudioCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [incomingCallRingtone, setIncomingCallRingtone] = useState(null);
  const [incomingCallRingtoneInterval, setIncomingCallRingtoneInterval] =
    useState(null);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const chatEndRef = useRef(null);
  const [popoverUser, setPopoverUser] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const audioCallRef = useRef(null);
  const videoCallRef = useRef(null);
  const wsRef = useRef(null);

  // Debug: Component mount
  useEffect(() => {
    console.log("Component mounted");
    console.log("Initial loginForm state:", loginForm);
    console.log("Initial isLoggedIn state:", isLoggedIn);

    // Set client state
    setIsClient(true);

    // Ensure messages is always an array
    if (!messages || !Array.isArray(messages)) {
      setMessages([]);
    }

    // Check if we're on Render deployment
    const hostname = window.location.hostname;
    const isRender =
      hostname.includes("onrender.com") || hostname.includes("render.com");
    setIsRenderDeployment(isRender);
    console.log("Hostname:", hostname);
    console.log("Is Render deployment:", isRender);
    console.log("FORCE_NORMAL_MODE:", FORCE_NORMAL_MODE);
    console.log("Will use normal mode:", FORCE_NORMAL_MODE || !isRender);
    console.log("API URLs:", {
      AUTH_API_BASE_URL,
      MESSAGE_API_BASE_URL,
      REALTIME_API_BASE_URL,
    });

    // Check for existing login state
    const token = localStorage.getItem("token");
    if (token) {
      console.log("Found existing token, attempting to restore login state");
      // For now, just set a basic user state
      // In a real app, you'd verify the token with the backend
      setUser({ id: 10, username: "Nacer" }); // Default user
      setIsLoggedIn(true);
    }
  }, []);

  // Debug: Monitor AudioCall ref
  useEffect(() => {
    console.log(
      "AudioCall ref status:",
      audioCallRef.current ? "Available" : "Not available"
    );
  }, [audioCallRef.current]);

  // Check Janus service availability
  useEffect(() => {
    const checkJanusService = async () => {
      // Skip Janus checks in demo mode
      if (isRenderDeployment && !FORCE_NORMAL_MODE) {
        console.log("Demo mode: Skipping Janus service check");
        setAudioServiceStatus("available"); // Assume available in demo
        return;
      }

      try {
        const janusUrl =
          process.env.NEXT_PUBLIC_JANUS_HTTP_URL ||
          "https://unifiedchat-janus-service.onrender.com";
        console.log("Checking Janus service at:", janusUrl);
        const response = await fetch(`${janusUrl}/janus/info`);
        console.log("Janus response status:", response.status);
        if (response.ok) {
          console.log("Janus service available - setting status to available");
          setAudioServiceStatus("available");
        } else {
          console.log("Janus service unavailable - bad response");
          setAudioServiceStatus("unavailable");
        }
      } catch (error) {
        console.log("Janus service not available - error:", error);
        setAudioServiceStatus("unavailable");
      }
    };

    if (isLoggedIn) {
      checkJanusService();
      // Check every 30 seconds only if not in demo mode
      if (!isRenderDeployment || FORCE_NORMAL_MODE) {
        const interval = setInterval(checkJanusService, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [isLoggedIn, isRenderDeployment]);

  // Function to fetch users from backend
  const fetchUsers = async () => {
    // Use backend in normal mode
    if (FORCE_NORMAL_MODE || !isRenderDeployment) {
      setLoadingUsers(true);
      try {
        const response = await axios.get(`${AUTH_API_BASE_URL}/users`);
        if (response.data && Array.isArray(response.data)) {
          setUsers(response.data);
          console.log("Fetched users from backend:", response.data);
        } else {
          console.error("Invalid users response:", response.data);
          // Fallback to hardcoded users if backend doesn't work
          setUsers([
            { id: 1, username: "admin" },
            { id: 2, username: "user2" },
            { id: 3, username: "user3" },
            { id: 4, username: "Linda" },
            { id: 5, username: "Hana" },
            { id: 6, username: "Adam" },
            { id: 7, username: "Ahmed" },
            { id: 8, username: "Hamid" },
            { id: 9, username: "Mueen" },
            { id: 10, username: "Nacer" },
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        if (error.response && error.response.status === 404) {
          console.log("Users endpoint not available yet, using fallback");
        }
        // Fallback to hardcoded users if backend doesn't work
        setUsers([
          { id: 1, username: "admin" },
          { id: 2, username: "user2" },
          { id: 3, username: "user3" },
          { id: 4, username: "Linda" },
          { id: 5, username: "Hana" },
          { id: 6, username: "Adam" },
          { id: 7, username: "Ahmed" },
          { id: 8, username: "Hamid" },
          { id: 9, username: "Mueen" },
          { id: 10, username: "Nacer" },
        ]);
      } finally {
        setLoadingUsers(false);
      }
      return;
    }

    // Skip backend call in demo mode and set users immediately
    if (isRenderDeployment) {
      console.log("Demo mode: Using hardcoded users (fast path)");
      setUsers([
        { id: 1, username: "admin" },
        { id: 2, username: "user2" },
        { id: 3, username: "user3" },
        { id: 4, username: "Linda" },
        { id: 5, username: "Hana" },
        { id: 6, username: "Adam" },
        { id: 7, username: "Ahmed" },
        { id: 8, username: "Hamid" },
        { id: 9, username: "Mueen" },
        { id: 10, username: "Nacer" },
      ]);
      return;
    }
  };

  // Function to set a sensible default receiver when user logs in
  const setDefaultReceiver = (loggedInUser) => {
    // Find the first user that's not the logged-in user
    const availableUsers = users.filter((u) => u.id !== loggedInUser.id);
    if (availableUsers.length > 0) {
      setSelectedReceiver(availableUsers[0].id);
    }
  };

  // Fetch users when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchUsers();
      // Refresh users list more frequently in normal mode
      const interval = setInterval(
        fetchUsers,
        FORCE_NORMAL_MODE ? 30000 : isRenderDeployment ? 60000 : 30000
      );
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, isRenderDeployment]);

  // Debug: Log user info when users change
  useEffect(() => {
    if (users.length > 0) {
      console.log("Users loaded:", users);
      debugUserInfo();
    }
  }, [users]);

  const login = async (e) => {
    try {
      e.preventDefault();
      console.log("Login button clicked", loginForm);
      console.log("DEMO_MODE:", DEMO_MODE);
      console.log("IS_RENDER_DEPLOYMENT:", isRenderDeployment);
      console.log("FORCE_NORMAL_MODE:", FORCE_NORMAL_MODE);
      console.log("AUTH_API_BASE_URL:", AUTH_API_BASE_URL);
      console.log(
        "Current hostname:",
        typeof window !== "undefined" ? window.location.hostname : "SSR"
      );

      // Validate input
      if (!loginForm.username || !loginForm.password) {
        console.log("Login validation failed - missing credentials");
        alert("Please enter both username and password");
        return;
      }

      // Demo mode for explicit testing only
      if (DEMO_MODE) {
        console.log("Demo mode: Simulating login for demo/testing");
        const demoUser = {
          id: loginForm.username === "admin" ? 1 : 10,
          username: loginForm.username,
        };
        console.log("Setting demo user:", demoUser);
        setUser(demoUser);
        setIsLoggedIn(true);
        // Set demo users
        setUsers([
          { id: 1, username: "admin" },
          { id: 10, username: "Nacer" },
          { id: 2, username: "user2" },
          { id: 3, username: "user3" },
        ]);
        setDefaultReceiver(demoUser);
        console.log("Demo login completed");
        return;
      }

      // Use normal backend mode (not demo mode)
      if (FORCE_NORMAL_MODE || !isRenderDeployment) {
        console.log("Using normal backend mode for login");

        try {
          const loginUrl = `${AUTH_API_BASE_URL}/login`;
          console.log("Sending login request to:", loginUrl);
          console.log("Login request body:", loginForm);
          const response = await axios.post(loginUrl, loginForm);
          console.log("Login response:", response);
          if (response.data && response.data.token && response.data.user) {
            localStorage.setItem("token", response.data.token);
            setUser(response.data.user);
            setIsLoggedIn(true);
            // Fetch users first, then set default receiver
            await fetchUsers();
            setDefaultReceiver(response.data.user);
            console.log("Normal login completed successfully");
          } else {
            console.error(
              "Login failed: Invalid response from server.",
              response
            );
            alert("Login failed: Invalid response from server.");
          }
        } catch (error) {
          console.error("Login error:", error);
          let msg = "Login failed: ";
          if (
            error.response &&
            error.response.data &&
            error.response.data.error
          ) {
            msg += error.response.data.error;
            console.error("Backend error response:", error.response.data);
          } else if (error.message) {
            msg += error.message;
          } else {
            msg += "Unknown error.";
          }
          alert(msg);
        }
        return;
      }

      // Fallback to demo mode only if backend fails and we're on Render
      console.log("Render deployment detected, using demo mode for login");
      const demoUser = {
        id: loginForm.username === "admin" ? 1 : 10,
        username: loginForm.username,
      };
      console.log("Setting demo user:", demoUser);
      setUser(demoUser);
      setIsLoggedIn(true);
      // Set demo users
      setUsers([
        { id: 1, username: "admin" },
        { id: 4, username: "Linda" },
        { id: 5, username: "Hana" },
        { id: 6, username: "Adam" },
        { id: 7, username: "Ahmed" },
        { id: 8, username: "Hamid" },
        { id: 9, username: "Mueen" },
        { id: 10, username: "Nacer" },
      ]);
      setDefaultReceiver(demoUser);
      console.log("Demo login completed for Render deployment");
    } catch (error) {
      console.error("Unexpected error in login function:", error);
      alert("An unexpected error occurred during login. Please try again.");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Demo mode for Render deployment
    if (isRenderDeployment) {
      const demoMessage = {
        id: Date.now(),
        sender_id: user.id,
        receiver_id: selectedReceiver,
        content: newMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, demoMessage]);
      setNewMessage("");
      scrollToBottom();
      return;
    }

    try {
      const response = await axios.post(`${MESSAGE_API_BASE_URL}/messages`, {
        sender_id: user.id,
        receiver_id: selectedReceiver,
        content: newMessage,
      });

      setMessages((prev) => [...prev, response.data]);
      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      alert(
        "Failed to send message: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const loadMessages = async () => {
    // Skip loading messages in demo mode
    if (isRenderDeployment) {
      // Ensure messages is initialized as empty array in demo mode
      if (!messages || !Array.isArray(messages)) {
        setMessages([]);
      }
      return;
    }

    try {
      const response = await axios.get(
        `${MESSAGE_API_BASE_URL}/messages/${user.id}`
      );
      // Ensure response.data is an array
      setMessages(Array.isArray(response.data) ? response.data : []);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to load messages:", error);
      // Set empty array on error to prevent null reference
      setMessages([]);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user, selectedReceiver, isRenderDeployment]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserName = (userId) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? foundUser.username : `User ${userId}`;
  };

  const isOwnMessage = (message) => {
    return message.sender_id === user?.id;
  };

  // Helper function to check if a user is actually online
  const isUserOnline = (username) => {
    // First check the connected users set (most accurate)
    if (connectedUsers.size > 0) {
      return connectedUsers.has(username);
    }
    // Fallback to online users array
    return onlineUsers.includes(username);
  };

  // Handlers for call end events
  const handleAudioCallEnd = () => {
    console.log("Audio call ended, closing modal");
    setShowAudioCallModal(false);
    setIncomingCall(null); // Clear any incoming call state

    // Last resort: directly remove any audio call modals from the DOM
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const audioCallModals = document.querySelectorAll(
          ".fixed.inset-0.bg-black.bg-opacity-50"
        );
        if (audioCallModals.length > 0) {
          console.log(
            "Forcibly removing audio call modals:",
            audioCallModals.length
          );
          audioCallModals.forEach((modal) => {
            modal.parentNode.removeChild(modal);
          });
        }
      }, 200);
    }
  };

  const handleVideoCallEnd = () => {
    console.log("Video call ended, closing modal");
    setShowVideoCallModal(false);
    setIncomingCall(null); // Clear any incoming call state
  };

  // Debug function to log user information
  const debugUserInfo = () => {
    console.log("=== USER DEBUG INFO ===");
    console.log("Current User:", user);
    console.log("Selected Receiver:", selectedReceiver);
    console.log("Online Users:", onlineUsers);
    console.log("Connected Users:", Array.from(connectedUsers));
    console.log(
      "WebSocket State:",
      wsRef.current ? wsRef.current.readyState : "no ref"
    );
  };

  // Incoming call ringtone functions
  const playIncomingCallRingtone = () => {
    stopIncomingCallRingtone();

    let ringCount = 0;
    const interval = setInterval(() => {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create two oscillators for a richer sound
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect oscillators to gain node
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set different frequencies for alternating tones (like a real phone)
      const isEvenRing = ringCount % 2 === 0;
      oscillator1.frequency.setValueAtTime(
        isEvenRing ? 480 : 620,
        audioContext.currentTime
      );
      oscillator2.frequency.setValueAtTime(
        isEvenRing ? 620 : 480,
        audioContext.currentTime
      );

      // Set oscillator types for better sound
      oscillator1.type = "sine";
      oscillator2.type = "sine";

      // Create a nice envelope for the ringtone
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      // Start and stop the oscillators
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 0.8);
      oscillator2.stop(now + 0.8);

      ringCount++;
    }, 1000); // Ring every second

    setIncomingCallRingtoneInterval(interval);
  };

  const stopIncomingCallRingtone = () => {
    if (incomingCallRingtoneInterval) {
      clearInterval(incomingCallRingtoneInterval);
      setIncomingCallRingtoneInterval(null);
    }
  };

  // Don't render chat interface if no receiver is selected
  const shouldShowChat = isLoggedIn && selectedReceiver !== null;

  // Debug: Log the conditions
  useEffect(() => {
    console.log("Debug conditions:", {
      isLoggedIn,
      selectedReceiver,
      shouldShowChat,
      user,
      audioServiceStatus,
    });
  }, [isLoggedIn, selectedReceiver, shouldShowChat, user, audioServiceStatus]);

  // Connect to unifiedchat-realtime-service WebSocket and send username
  useEffect(() => {
    if (isLoggedIn && user?.username) {
      // Skip WebSocket only in demo mode when not forcing normal mode
      if (isRenderDeployment && !FORCE_NORMAL_MODE) {
        console.log("Demo mode: Skipping WebSocket connection");
        return;
      }

      console.log("=== WEBSOCKET CONNECTION ATTEMPT ===");
      console.log("User:", user);
      console.log("isRenderDeployment:", isRenderDeployment);
      console.log("FORCE_NORMAL_MODE:", FORCE_NORMAL_MODE);
      console.log("REALTIME_API_BASE_URL:", REALTIME_API_BASE_URL);

      // Close any previous connection
      if (wsRef.current) {
        console.log("Closing previous WebSocket connection");
        wsRef.current.close();
      }

      const wsUrl = REALTIME_API_BASE_URL.replace(/^http/, "ws") + "/ws";
      console.log("Attempting WebSocket connection to:", wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(
          "WebSocket connected successfully for user:",
          user.username
        );
        const registerMessage = {
          type: "register",
          user_id: user.id,
          username: user.username,
        };
        console.log("Sending registration message:", registerMessage);
        ws.send(JSON.stringify(registerMessage));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(
            "WebSocket message received for user",
            user.username + ":",
            data
          );

          if (data.type === "presence_update") {
            console.log(
              "Received real-time presence update for user",
              user.username + ":",
              data.online_users
            );
            // Update both online users and connected users
            setOnlineUsers(data.online_users || []);
            setConnectedUsers(new Set(data.online_users || []));
          } else if (data.type === "incoming_call") {
            console.log("Incoming call for user", user.username + ":", data);
            // Ensure consistent ID types for comparison
            const currentUserId = Number(user.id);
            const toUserId = Number(data.to_user_id);
            const fromUserId = Number(data.from_user_id);

            console.log("Incoming call ID comparison:", {
              currentUserId,
              toUserId,
              fromUserId,
              isForCurrentUser: toUserId === currentUserId,
              isFromCurrentUser: fromUserId === currentUserId,
            });

            // Check if this call is for the current user and not from themselves
            if (toUserId === currentUserId && fromUserId !== currentUserId) {
              console.log("Processing incoming call for user:", user.username);
              setIncomingCall(data);
              // Start playing ringtone for incoming call
              playIncomingCallRingtone();
            } else {
              console.log(
                "Ignoring own call notification for user:",
                user.username
              );
            }
          } else if (data.type === "call_accepted") {
            console.log("Call accepted for user", user.username + ":", data);
            // Caller starts the actual call
            if (audioCallRef.current) {
              audioCallRef.current.startActualCall(data.room_id);
            }
          } else if (data.type === "call_declined") {
            console.log("Call declined for user", user.username + ":", data);
            console.log("AudioCall ref available:", !!audioCallRef.current);
            // Caller should close their call modal
            if (audioCallRef.current) {
              console.log("Force closing audio call modal");
              audioCallRef.current.forceClose();
            } else {
              console.error("AudioCall ref not available for call decline");
            }
            // Also call the handler to ensure modal closes
            handleAudioCallEnd();
          }
        } catch (error) {
          console.log(
            "WebSocket message (not JSON) for user",
            user.username + ":",
            event.data
          );
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed for user:", user.username);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error for user", user.username + ":", err);
        console.log(
          "WebSocket connection failed for user",
          user.username + ", will rely on polling fallback"
        );
      };

      return () => {
        console.log(
          "Cleaning up WebSocket connection for user:",
          user.username
        );
        ws.close();
      };
    }
  }, [isLoggedIn, user?.username, isRenderDeployment]);

  // Check for localStorage call notifications (fallback mechanism)
  useEffect(() => {
    if (isLoggedIn && user) {
      const checkLocalStorageNotifications = () => {
        try {
          const storedNotification = localStorage.getItem("call_notification");
          if (storedNotification) {
            const notification = JSON.parse(storedNotification);
            console.log("Found localStorage call notification:", notification);

            // Ensure consistent ID types for comparison
            const currentUserId = Number(user.id);
            const toUserId = Number(notification.to_user_id);
            const fromUserId = Number(notification.from_user_id);

            console.log("LocalStorage ID comparison:", {
              currentUserId,
              toUserId,
              fromUserId,
              isForCurrentUser: toUserId === currentUserId,
              isFromCurrentUser: fromUserId === currentUserId,
            });

            // Check if this notification is for the current user
            if (toUserId === currentUserId && fromUserId !== currentUserId) {
              console.log(
                "Processing localStorage call notification for user:",
                user.username
              );
              setIncomingCall(notification);
              // Clear the notification after processing
              localStorage.removeItem("call_notification");
            }
          }
        } catch (error) {
          console.error("Error processing localStorage notification:", error);
        }
      };

      // Check immediately
      checkLocalStorageNotifications();

      // Set up interval to check for notifications
      const interval = setInterval(checkLocalStorageNotifications, 1000);

      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user]);

  // Poll /online-users endpoint every 30 seconds as fallback
  useEffect(() => {
    let interval;
    const fetchOnlineUsers = async () => {
      try {
        // Skip backend call only in demo mode when not forcing normal mode
        if (isRenderDeployment && !FORCE_NORMAL_MODE) {
          console.log("Demo mode: Using demo online users");
          // In demo mode, only show the current user as online
          const demoOnlineUsers = [user?.username].filter(Boolean);
          setOnlineUsers(demoOnlineUsers);
          return;
        }

        // Try to fetch from backend
        const response = await axios.get(
          `${REALTIME_API_BASE_URL}/online-users`
        );
        const backendOnlineUsers = response.data.online_users || [];
        console.log("Backend online users:", backendOnlineUsers);
        setOnlineUsers(backendOnlineUsers);
        setConnectedUsers(new Set(backendOnlineUsers));
      } catch (error) {
        console.error("Failed to fetch online users:", error);
        // Fallback: only show the current user as online when backend is not available
        console.log(
          "Backend not available, showing only current user as online"
        );
        const currentUserOnly = [user?.username].filter(Boolean);
        setOnlineUsers(currentUserOnly);
        setConnectedUsers(new Set(currentUserOnly));
      }
    };
    if (isLoggedIn) {
      // Initial fetch
      fetchOnlineUsers();
      // Fallback polling every 30 seconds in case WebSocket fails
      interval = setInterval(fetchOnlineUsers, 30000);
    }
    return () => interval && clearInterval(interval);
  }, [isLoggedIn, isRenderDeployment, user?.username]);

  const sendCallNotification = (receiverId, roomId) => {
    if (!user) {
      console.error("Cannot send notification, user not logged in");
      return;
    }

    // Ensure consistent ID types (convert to numbers)
    const fromUserId = Number(user.id);
    const toUserId = Number(receiverId);

    // Debug: Log user information before sending notification
    console.log("=== SENDING CALL NOTIFICATION ===");
    debugUserInfo();
    console.log("Receiver ID:", receiverId, "Type:", typeof receiverId);
    console.log(
      "Receiver user:",
      users.find((u) => u.id === receiverId)
    );
    console.log("From User ID:", fromUserId, "Type:", typeof fromUserId);
    console.log("To User ID:", toUserId, "Type:", typeof toUserId);

    const callData = {
      type: "incoming_call",
      from_user_id: fromUserId,
      from_username: user.username,
      to_user_id: toUserId,
      room_id: roomId,
      timestamp: Date.now(),
    };

    console.log("Attempting to send call notification:", {
      from: user.username,
      to: receiverId,
      roomId: roomId,
      wsState: wsRef.current ? wsRef.current.readyState : "no ref",
      wsOpen: wsRef.current && wsRef.current.readyState === WebSocket.OPEN,
    });

    // Use WebSocket to send notification
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Sending call notification via WebSocket:", callData);
      wsRef.current.send(JSON.stringify(callData));
    } else {
      // Fallback to localStorage for same-browser testing
      console.warn("WebSocket not available, using localStorage fallback");
      console.log("Storing call notification in localStorage:", callData);
      localStorage.setItem("call_notification", JSON.stringify(callData));
    }
  };

  // Clean up ringtone when incoming call changes
  useEffect(() => {
    if (!incomingCall) {
      stopIncomingCallRingtone();
    }
  }, [incomingCall]);

  // Clean up ringtone on component unmount
  useEffect(() => {
    return () => {
      stopIncomingCallRingtone();
    };
  }, []);

  // Prevent hydration issues by only rendering after client-side initialization
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex flex-col">
      <Head>
        <title>UnifiedChat MVP</title>
        <meta name="description" content="UnifiedChat MVP" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Load WebRTC adapter and Janus library */}
      <Script
        src="/adapter.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("WebRTC adapter loaded locally");
          window.adapterLoaded = true;
        }}
        onError={() => {
          console.error("Failed to load local adapter.js");
          // Still mark as loaded to try Janus anyway
          window.adapterLoaded = true;
        }}
      />
      <Script
        src="/janus.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("Janus library loaded");
          window.janusLoaded = true;
        }}
        onError={() => {
          console.error("Failed to load Janus library");
        }}
      />

      {/* Demo Mode Banner */}
      {isRenderDeployment && !FORCE_NORMAL_MODE && (
        <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-semibold">
          🚀 DEMO MODE: Audio calling testing on Render.com - Login with any
          username/password
        </div>
      )}

      {/* Debug Info - Only show in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-800 text-green-400 px-4 py-2 text-xs font-mono">
          <div>Online Users: {JSON.stringify(onlineUsers)}</div>
          <div>
            Connected Users: {JSON.stringify(Array.from(connectedUsers))}
          </div>
          <div>Current User: {user?.username}</div>
          <div>
            WebSocket State:{" "}
            {wsRef.current ? wsRef.current.readyState : "no ref"}
          </div>
        </div>
      )}

      <main className="flex flex-1 h-screen max-h-screen overflow-hidden">
        {/* Mobile Sidebar Overlay - Only show when logged in */}
        {isLoggedIn && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Enhanced Mobile-First Sidebar - Only show when logged in */}
        {isLoggedIn && (
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-white to-gray-50 border-r shadow-2xl transform transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <FaRocket className="text-yellow-300 animate-bounce" />
                  UnifiedChat
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="sm:hidden text-white hover:text-yellow-300 transition-colors"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-blue-100 mt-1 flex items-center gap-1">
                <FaStar
                  className="text-yellow-300 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
                Slack-style MVP
              </p>
            </div>

            {/* User Info Section */}
            <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <FaUser className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {user?.username}
                  </div>
                  <div className="text-xs text-gray-500">Online</div>
                </div>
                <button
                  onClick={() => {
                    // Send logout message to WebSocket server
                    if (
                      wsRef.current &&
                      wsRef.current.readyState === WebSocket.OPEN
                    ) {
                      const logoutMessage = {
                        type: "logout",
                        user_id: user.id,
                        username: user.username,
                      };
                      wsRef.current.send(JSON.stringify(logoutMessage));
                    }

                    // Close WebSocket connection
                    if (wsRef.current) {
                      wsRef.current.close();
                      wsRef.current = null;
                    }

                    // Clear all state
                    localStorage.removeItem("token");
                    setIsLoggedIn(false);
                    setUser(null);
                    setMessages([]);
                    setSelectedReceiver(null);
                    setOnlineUsers([]);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <FaUsers className="text-blue-500" />
                  Direct Messages
                  {loadingUsers && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </h3>
                {loadingUsers ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500">Loading users...</p>
                  </div>
                ) : (
                  users
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <div key={u.id} className="mb-2">
                        {/* Main clickable area for user selection */}
                        <div
                          onClick={() => {
                            setSelectedReceiver(u.id);
                            setSidebarOpen(false); // Close sidebar on mobile
                          }}
                          className={`group w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${
                            selectedReceiver === u.id
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg"
                              : "hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 text-gray-700 border border-transparent hover:border-blue-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    selectedReceiver === u.id
                                      ? "bg-white/20"
                                      : "bg-gradient-to-br from-gray-200 to-gray-300"
                                  }`}
                                >
                                  <FaUser
                                    className={`w-5 h-5 ${
                                      selectedReceiver === u.id
                                        ? "text-white"
                                        : "text-gray-600"
                                    }`}
                                  />
                                </div>
                                <div
                                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                    isUserOnline(u.username)
                                      ? "bg-green-400 animate-pulse"
                                      : "bg-gray-400"
                                  }`}
                                ></div>
                              </div>
                              <div className="text-left">
                                <div className="font-medium">@{u.username}</div>
                                <div
                                  className={`text-xs ${
                                    isUserOnline(u.username)
                                      ? selectedReceiver === u.id
                                        ? "text-white/80"
                                        : "text-gray-500"
                                      : "text-gray-400 italic"
                                  }`}
                                >
                                  {isUserOnline(u.username)
                                    ? "Available for chat"
                                    : "Offline"}
                                </div>
                              </div>
                            </div>
                            {/* Call button, which is a valid nested element */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent the parent div's onClick
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setPopoverUser(u);
                                  setPopoverAnchor(rect);
                                }}
                                className={`p-2 rounded-lg transition-all duration-300 ${
                                  selectedReceiver === u.id
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                <FaPhone className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Enhanced Main Chat Area */}
        <section className="flex-1 flex flex-col h-full max-h-screen bg-white shadow-2xl rounded-lg overflow-hidden relative">
          {/* Enhanced Header with Mobile Menu - Only show menu button when logged in */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {isLoggedIn && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="sm:hidden text-white hover:text-yellow-300 transition-colors"
                >
                  <FaBars className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                {isLoggedIn && (
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <FaUser className="w-4 h-4 text-white" />
                  </div>
                )}
                <div>
                  <span className="text-lg font-bold text-white">
                    {isLoggedIn && selectedReceiver
                      ? getUserName(selectedReceiver)
                      : "UnifiedChat MVP"}
                  </span>
                  {isLoggedIn && selectedReceiver && (
                    <div className="text-xs text-blue-100">Direct Message</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Call Buttons - Only show when logged in and receiver selected */}
              {shouldShowChat && (
                <div className="flex items-center gap-2">
                  {/* Audio Call Button */}
                  <button
                    onClick={() => {
                      console.log("Audio call button clicked");
                      console.log("Audio service status:", audioServiceStatus);
                      console.log("AudioCall ref:", audioCallRef.current);
                      console.log("User:", user);
                      console.log("Selected receiver:", selectedReceiver);

                      if (audioServiceStatus === "available") {
                        // Use the ref to call startCall directly
                        if (audioCallRef.current) {
                          console.log("Calling startCall via ref");
                          audioCallRef.current.startCall();
                        } else {
                          console.error("AudioCall ref not available");
                          console.log("AudioCall ref details:", {
                            ref: audioCallRef,
                            current: audioCallRef.current,
                            shouldShowChat,
                          });
                          alert(
                            "Audio call feature is loading... Please wait a moment and try again."
                          );
                        }
                      } else {
                        alert(
                          "Audio service is not available. Please check if the audio service is deployed."
                        );
                      }
                    }}
                    className={`group relative px-3 py-2 sm:px-4 sm:py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 flex items-center gap-2 font-bold shadow-lg ${
                      audioServiceStatus === "available"
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white"
                        : "bg-gradient-to-r from-gray-400 to-gray-500 text-gray-600 cursor-not-allowed"
                    }`}
                    title={
                      audioServiceStatus === "available"
                        ? "Start audio call"
                        : "Audio service unavailable"
                    }
                    disabled={audioServiceStatus !== "available"}
                  >
                    {/* Glowing effect */}
                    {audioServiceStatus === "available" && (
                      <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    )}
                    <FaPhone className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 animate-pulse group-hover:animate-bounce" />
                    <span className="relative z-10 hidden sm:inline">
                      {audioServiceStatus === "checking" ? "..." : "Audio"}
                    </span>
                  </button>

                  {/* Video Call Button */}
                  <button
                    onClick={() => {
                      console.log("Video call button clicked");
                      console.log("Audio service status:", audioServiceStatus);
                      console.log("VideoCall ref:", videoCallRef.current);
                      console.log("User:", user);
                      console.log("Selected receiver:", selectedReceiver);

                      if (audioServiceStatus === "available") {
                        // Use the ref to call startVideoCall directly
                        if (videoCallRef.current) {
                          console.log("Calling startVideoCall via ref");
                          videoCallRef.current.startVideoCall();
                        } else {
                          console.error("VideoCall ref not available");
                          console.log("VideoCall ref details:", {
                            ref: videoCallRef,
                            current: videoCallRef.current,
                            shouldShowChat,
                          });
                          alert(
                            "Video call feature is loading... Please wait a moment and try again."
                          );
                        }
                      } else {
                        alert(
                          "Video service is not available. Please check if the video service is deployed."
                        );
                      }
                    }}
                    className={`group relative px-3 py-2 sm:px-4 sm:py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 flex items-center gap-2 font-bold shadow-lg ${
                      audioServiceStatus === "available"
                        ? "bg-gradient-to-r from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 text-white"
                        : "bg-gradient-to-r from-gray-400 to-gray-500 text-gray-600 cursor-not-allowed"
                    }`}
                    title={
                      audioServiceStatus === "available"
                        ? "Start video call"
                        : "Video service unavailable"
                    }
                    disabled={audioServiceStatus !== "available"}
                  >
                    {/* Glowing effect */}
                    {audioServiceStatus === "available" && (
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    )}
                    <FaVideo className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 animate-pulse group-hover:animate-bounce" />
                    <span className="relative z-10 hidden sm:inline">
                      {audioServiceStatus === "checking" ? "..." : "Video"}
                    </span>
                  </button>

                  {/* All Features Button */}
                  <button
                    onClick={() => {
                      console.log(
                        "All Features button clicked - opening test page"
                      );
                      window.open("/test-calls", "_blank");
                    }}
                    className="group relative px-3 py-2 sm:px-4 sm:py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 flex items-center gap-2 font-bold shadow-lg bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white"
                    title="Open comprehensive feature testing suite"
                  >
                    {/* Glowing effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <FaCog className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 animate-pulse group-hover:animate-spin" />
                    <span className="relative z-10 hidden sm:inline">
                      Features
                    </span>
                  </button>
                </div>
              )}

              {/* Call Components */}
              {isLoggedIn && isClient && (
                <>
                  <JanusAudioCall
                    ref={audioCallRef}
                    user={user}
                    selectedReceiver={selectedReceiver}
                    onCallEnd={handleAudioCallEnd}
                    getUserName={getUserName}
                    sendCallNotification={sendCallNotification}
                  />
                  <JanusVideoCall
                    ref={videoCallRef}
                    user={user}
                    selectedReceiver={selectedReceiver}
                    onCallEnd={handleVideoCallEnd}
                    getUserName={getUserName}
                    sendCallNotification={sendCallNotification}
                  />
                </>
              )}
            </div>
          </header>

          {/* Enhanced Login Form */}
          {!isLoggedIn && (
            <div className="flex flex-1 items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log("Form onSubmit triggered");
                  console.log("Event:", e);
                  console.log("LoginForm state:", loginForm);

                  // Validate form before proceeding
                  if (!loginForm.username || !loginForm.password) {
                    console.log(
                      "Form validation failed - missing username or password"
                    );
                    alert("Please enter both username and password");
                    return;
                  }

                  try {
                    login(e);
                  } catch (error) {
                    console.error("Error in form submission:", error);
                    alert("An error occurred during login. Please try again.");
                  }
                }}
                className="relative w-full max-w-md bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-8 space-y-6 border-0"
              >
                {/* Glowing ring effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25"></div>

                <div className="relative text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                    <FaRocket className="text-blue-500 animate-bounce" />
                    Welcome Back!
                  </h2>
                  <p className="text-gray-600">Sign in to start chatting</p>
                </div>

                <div className="relative space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={loginForm.username}
                      onChange={(e) => {
                        console.log("Username input changed:", e.target.value);
                        setLoginForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }));
                      }}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(e) => {
                        console.log("Password input changed:", e.target.value);
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }));
                      }}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="group relative w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-xl font-bold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                >
                  {/* Glowing effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <FaUser className="w-4 h-4 animate-pulse group-hover:animate-bounce" />
                    Sign In
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* Enhanced Chat Area - Only show when logged in and receiver selected */}
          {shouldShowChat && (
            <div className="flex-1 flex flex-col h-full max-h-full">
              <div
                className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-blue-50 via-white to-purple-50"
                style={{ minHeight: 0 }}
              >
                {!messages || messages.length === 0 ? (
                  <div className="text-center mt-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <FaRocket className="w-8 h-8 text-white animate-bounce" />
                    </div>
                    <p className="text-gray-500 text-lg font-semibold">
                      No messages yet. Start a conversation! 🚀
                    </p>
                  </div>
                ) : (
                  (messages || []).map((msg, index) => (
                    <div
                      key={index}
                      className={`flex mb-4 ${
                        isOwnMessage(msg) ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md p-4 rounded-2xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                          isOwnMessage(msg)
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-none"
                            : "bg-gradient-to-r from-gray-100 to-white text-gray-800 rounded-bl-none border border-gray-200"
                        }`}
                      >
                        <div className="text-xs opacity-80 mb-2 flex items-center gap-2">
                          <span className="font-bold">
                            {getUserName(msg.sender_id)}
                          </span>
                          <span className="">
                            {formatTime(msg.timestamp || msg.created_at)}
                          </span>
                        </div>
                        <div className="break-words whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Enhanced Message Input Bar */}
              <div className="w-full bg-gradient-to-r from-white to-gray-50 border-t p-4 flex items-center gap-3 sticky bottom-0 shadow-lg">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                />

                {/* Enhanced Send Button */}
                <button
                  onClick={sendMessage}
                  className="group relative bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-xl font-bold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  {/* Glowing effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <FaPaperPlane className="w-4 h-4 relative z-10 animate-pulse group-hover:animate-bounce" />
                  <span className="relative z-10 hidden sm:inline">Send</span>
                </button>

                {/* Enhanced Quick Call Button */}
                <button
                  onClick={() => {
                    if (audioCallRef.current) {
                      console.log("Quick call: Calling startCall via ref");
                      audioCallRef.current.startCall();
                    } else {
                      console.error(
                        "AudioCall ref not available for quick call"
                      );
                      alert(
                        "Audio call feature is loading... Please wait a moment and try again."
                      );
                    }
                  }}
                  className="group relative bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white p-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg"
                  title="Quick call"
                >
                  {/* Glowing effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <FaPhone className="w-4 h-4 relative z-10 animate-pulse group-hover:animate-bounce" />
                </button>
              </div>
            </div>
          )}

          {/* Show message when logged in but no receiver selected */}
          {isLoggedIn && !selectedReceiver && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <FaUsers className="w-8 h-8 text-white animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Select a User
                </h3>
                <p className="text-gray-600">
                  Choose someone from the sidebar to start chatting
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Render the popover */}
      {popoverUser && popoverAnchor && (
        <UserPopover
          user={popoverUser}
          anchorRect={popoverAnchor}
          onClose={() => setPopoverUser(null)}
          onCall={() => {
            setSelectedReceiver(popoverUser.id);
            setPopoverUser(null);
            setTimeout(() => {
              if (audioCallRef.current) {
                console.log("Popover call: Calling startCall via ref");
                audioCallRef.current.startCall();
              } else {
                console.error("AudioCall ref not available for popover call");
                alert(
                  "Audio call feature is loading... Please wait a moment and try again."
                );
              }
            }, 100);
          }}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-center mb-4">
              Incoming Call
            </h3>
            <p className="text-center mb-6">
              <span className="font-bold">{incomingCall.from_username}</span> is
              calling...
            </p>
            <div className="flex justify-around">
              <button
                onClick={() => {
                  // Stop the ringtone
                  stopIncomingCallRingtone();

                  if (
                    wsRef.current &&
                    wsRef.current.readyState === WebSocket.OPEN
                  ) {
                    const acceptanceMessage = {
                      type: "call_accepted",
                      from_user_id: user.id,
                      from_username: user.username,
                      to_user_id: incomingCall.from_user_id,
                      room_id: incomingCall.room_id,
                    };
                    wsRef.current.send(JSON.stringify(acceptanceMessage));
                  }
                  // Receiver joins the room
                  if (audioCallRef.current) {
                    audioCallRef.current.joinRoom(incomingCall.room_id);
                  }
                  setIncomingCall(null);
                }}
                className="bg-green-500 text-white px-6 py-2 rounded-lg"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  // Stop the ringtone
                  stopIncomingCallRingtone();

                  // Send call declined message to caller
                  if (
                    wsRef.current &&
                    wsRef.current.readyState === WebSocket.OPEN
                  ) {
                    const declineMessage = {
                      type: "call_declined",
                      from_user_id: user.id,
                      from_username: user.username,
                      to_user_id: incomingCall.from_user_id,
                      room_id: incomingCall.room_id,
                    };
                    wsRef.current.send(JSON.stringify(declineMessage));
                  }
                  setIncomingCall(null);
                }}
                className="bg-red-500 text-white px-6 py-2 rounded-lg"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
