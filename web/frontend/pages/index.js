import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Script from "next/script";
import axios from "axios";
import AudioCallHandler from "../components/AudioCallHandler";
import VideoCallInterface from "../components/VideoCallInterface";
import OnlineUsersList from "../components/OnlineUsersList";
import ChatInterface from "../components/ChatInterface";
import Sidebar from "../components/Sidebar";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  FaPhone,
  FaPhoneSlash,
  FaPaperPlane,
  FaUser,
  FaSignOutAlt,
  FaRocket,
  FaStar,
  FaBell,
  FaMicrophone,
  FaMicrophoneSlash,
  FaBars,
  FaTimes,
  FaSearch,
  FaVideo,
  FaCog,
  FaArrowLeft,
} from "react-icons/fa";

// --- Configuration (will be populated at runtime) ---
let AUTH_API_BASE_URL;
let MESSAGE_API_BASE_URL;
let WEBSOCKET_URL;
let JANUS_HTTP_URL;
let JANUS_URL;
let REALTIME_HTTP_API_URL;
let USER_API_BASE_URL;

export default function Home() {
  console.log(
    "🔥 FRONTEND CACHE BUSTER v2.4.0 - DIRECT HANGUP CLEANUP FIX LOADED 🔥"
  );

  // --- State ---
  const [envVars, setEnvVars] = useState(null); // New state to hold runtime env vars
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allUsers, setAllUsers] = useState([]); // All registered users
  const [onlineUserIds, setOnlineUserIds] = useState(new Set()); // Just IDs of online users
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedUser, setHighlightedUser] = useState(null);
  const [activeCallRecipient, setActiveCallRecipient] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState("idle"); // "idle" | "calling" | "ringing" | "active"
  const [callRoomId, setCallRoomId] = useState(null);
  const [userMap, setUserMap] = useState(new Map());
  const audioContextRef = useRef(null);
  // Add state for call notifications
  const [callNotification, setCallNotification] = useState(null);
  const [janusInitialized, setJanusInitialized] = useState(false);
  const [callEndedModal, setCallEndedModal] = useState(null);

  // Add this line to fix ReferenceError
  const [incomingCallDetails, setIncomingCallDetails] = useState(null);

  // Video call state
  const [videoCallState, setVideoCallState] = useState("idle"); // "idle" | "calling" | "ringing" | "active"
  const [activeVideoCallRecipient, setActiveVideoCallRecipient] =
    useState(null);
  const [incomingVideoCall, setIncomingVideoCall] = useState(null);
  const [videoCallRoomId, setVideoCallRoomId] = useState(null);
  const [callType, setCallType] = useState("audio"); // "audio" | "video"

  // Add state for audio call controls
  const [audioCallMuted, setAudioCallMuted] = useState(false);
  const [audioCallVolume, setAudioCallVolume] = useState(1.0);
  const [audioCallStatus, setAudioCallStatus] = useState("Connecting...");
  const [forceHideModal, setForceHideModal] = useState(false);

  // Import and use centralized WebSocket functions
  const {
    initializeWebSocket,
    closeWebSocket,
    sendWebSocketMessage,
    setOnMessage,
  } = useWebSocket();

  // New function to handle audio call ending from AudioCallHandler
  const handleAudioCallEnd = () => {
    // Prevent infinite loops - if already idle, don't process again
    if (callState === "idle") {
      console.log(
        "🔥 INDEX - handleAudioCallEnd called but already idle, skipping"
      );
      return;
    }

    // Prevent multiple concurrent calls
    if (isEndingCallRef.current) {
      console.log(
        "🔥 INDEX - handleAudioCallEnd already in progress, skipping"
      );
      return;
    }

    isEndingCallRef.current = true;

    console.log("🔥 INDEX - IMMEDIATE AGGRESSIVE CLEANUP STARTING");
    console.log("🔥 INDEX - Current state before cleanup:", {
      callState,
      activeCallRecipient: activeCallRecipient?.username,
      callRoomId,
      incomingCall: incomingCall?.caller_username,
    });

    // IMMEDIATE AND SYNCHRONOUS MICROPHONE CLEANUP
    console.log("🔥 INDEX - SYNCHRONOUS MICROPHONE CLEANUP");

    // 1. IMMEDIATE AudioCallHandler cleanup FIRST (most critical)
    if (audioCallRef.current) {
      console.log("🔥 INDEX - IMMEDIATE AudioCallHandler cleanup");
      try {
        if (audioCallRef.current.forceCleanup) {
          audioCallRef.current.forceCleanup();
        }
        if (audioCallRef.current.hangup) {
          audioCallRef.current.hangup();
        }
      } catch (error) {
        console.error("🔥 INDEX - AudioCallHandler cleanup error:", error);
      }
    }

    // 2. IMMEDIATE global stream cleanup
    console.log("🔥 INDEX - IMMEDIATE global stream cleanup");

    // Stop window.localAudioStream immediately
    if (window.localAudioStream) {
      console.log("🔥 INDEX - Stopping window.localAudioStream");
      try {
        window.localAudioStream.getTracks().forEach((track) => {
          console.log("🔥 INDEX - Stopping track:", track.kind, track.label);
          track.stop();
        });
        window.localAudioStream = null;
        console.log("🔥 INDEX - window.localAudioStream nullified");
      } catch (error) {
        console.error("🔥 INDEX - Error stopping main stream:", error);
      }
    }

    // Stop window.currentCallStream immediately
    if (window.currentCallStream) {
      console.log("🔥 INDEX - Stopping window.currentCallStream");
      try {
        window.currentCallStream.getTracks().forEach((track) => {
          console.log(
            "🔥 INDEX - Stopping call stream track:",
            track.kind,
            track.label
          );
          track.stop();
        });
        window.currentCallStream = null;
        console.log("🔥 INDEX - window.currentCallStream nullified");
      } catch (error) {
        console.error("🔥 INDEX - Error stopping call stream:", error);
      }
    }

    // 3. IMMEDIATE audio elements cleanup
    console.log("🔥 INDEX - IMMEDIATE audio elements cleanup");
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio, index) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        if (audio.srcObject) {
          const stream = audio.srcObject;
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((track) => {
              console.log(
                `🔥 INDEX - Stopping track from audio element ${index}:`,
                track.kind,
                track.label
              );
              track.stop();
            });
          }
          audio.srcObject = null;
        }
        audio.src = "";

        // Remove temporary elements immediately
        if (
          audio.id &&
          (audio.id.includes("temp-") ||
            audio.id.includes("dedicated-") ||
            audio.id.includes("emergency-"))
        ) {
          audio.remove();
          console.log(`🔥 INDEX - Removed temporary element: ${audio.id}`);
        }
      } catch (error) {
        console.error(
          `🔥 INDEX - Error cleaning audio element ${index}:`,
          error
        );
      }
    });

    // 4. IMMEDIATE audio context cleanup
    if (window.audioContext) {
      console.log("🔥 INDEX - IMMEDIATE audio context cleanup");
      try {
        if (window.audioContext.state === "running") {
          window.audioContext.suspend();
          console.log("🔥 INDEX - Audio context suspended");
        }
      } catch (error) {
        console.error("🔥 INDEX - Audio context error:", error);
      }
    }

    // 5. IMMEDIATE state reset
    console.log("🔥 INDEX - IMMEDIATE state reset");
    setCallState("idle");
    setIncomingCall(null);
    setActiveCallRecipient(null);
    setCallRoomId(null);
    setForceHideModal(true);

    // Clear ringtone timeout
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    // Nullify Janus objects globally
    if (window.janusGlobal) {
      console.log("🔥 INDEX - Destroying janusGlobal");
      try {
        window.janusGlobal.destroy();
      } catch (error) {
        console.error("🔥 INDEX - Error destroying janusGlobal:", error);
      }
      window.janusGlobal = null;
    }
    if (window.echotestPlugin) {
      console.log("🔥 INDEX - Detaching echotestPlugin");
      try {
        window.echotestPlugin.detach();
      } catch (error) {
        console.error("🔥 INDEX - Error detaching echotestPlugin:", error);
      }
      window.echotestPlugin = null;
    }

    // Ensure Janus and WebRTC resources are fully released
    // Any other global cleanup actions
    isEndingCallRef.current = false;
    console.log("🔥 INDEX - IMMEDIATE AGGRESSIVE CLEANUP ENDED");
  };

  const isEndingCallRef = useRef(false); // To prevent multiple simultaneous cleanups

  // Refs for AudioCallHandler
  const audioCallRef = useRef(null);
  const ringtoneTimeoutRef = useRef(null);

  const initializeJanus = () => {
    // Implementation of Janus initialization
  };

  const showCallNotification = (type, message, duration = 3000) => {
    setCallNotification({ type, message });
    setTimeout(() => setCallNotification(null), duration);
  };

  const showCallEndedModal = (type, title, message, duration = 4000) => {
    setCallEndedModal({ type, title, message });
    setTimeout(() => setCallEndedModal(null), duration);
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      // Store the stream globally if needed, or pass it to Janus
      window.localAudioStream = stream;
      console.log("Microphone access granted.", stream);

      // Stop tracks immediately after obtaining permission if you don't need them active constantly
      // stream.getTracks().forEach(track => track.stop());

      return true;
    } catch (error) {
      console.error("Microphone access denied:", error);
      showCallNotification(
        "error",
        "Microphone access denied. Please enable it in your browser settings."
      );
      return false;
    }
  };

  const initAudioContext = () => {
    if (typeof window !== "undefined" && !window.audioContext) {
      window.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      console.log("AudioContext initialized.");
    }
  };

  const playIncomingCallRingtone = () => {
    if (window.playRingtone) {
      window.playRingtone();
    }
  };

  const stopIncomingCallRingtone = () => {
    if (window.stopRingtone) {
      window.stopRingtone();
      console.log("Stopping incoming call ringtone.");
    }
  };

  const playRingbackTone = () => {
    if (window.playRingback) {
      window.playRingback();
    }
  };

  const stopRingbackTone = () => {
    if (window.stopRingback) {
      window.stopRingback();
      console.log("Stopping ringback tone.");
    }
  };

  const initiateCall = async (recipient) => {
    if (!user) {
      showCallNotification("error", "Please log in to initiate a call.");
      return;
    }
    if (callState !== "idle") {
      showCallNotification("error", "Already in a call or call pending.");
      return;
    }
    if (!(await requestMicrophonePermission())) {
      return;
    }

    const newRoomId = Math.random().toString(36).substring(2, 15);
    setCallRoomId(newRoomId);
    setActiveCallRecipient(recipient);
    setCallType("audio");
    setCallState("calling"); // Set state to calling

    const callPayload = {
      to_user_id: recipient.id,
      from_user_id: user.id,
      caller_username: user.username,
      room_id: newRoomId,
      call_type: "audio",
    };

    // Send call initiate message via WebSocket
    sendWebSocketMessage({
      type: "call_initiate",
      call: callPayload,
    });

    playRingbackTone();
    showCallNotification("info", `Calling ${recipient.username}...`);

    // Set a timeout for the call to be unanswered
    ringtoneTimeoutRef.current = setTimeout(() => {
      if (callState === "calling") {
        console.log("Call unanswered, ending call...");
        handleHangUp(); // End the call locally
        showCallNotification(
          "warning",
          `${recipient.username} did not answer.`
        );
      }
    }, 30000); // 30 seconds timeout
  };

  const handleAcceptCall = async () => {
    if (!incomingCallDetails) return;

    if (!(await requestMicrophonePermission())) {
      return;
    }

    setCallState("active");
    stopIncomingCallRingtone();

    // Update the recipient to the caller
    const callerUser = allUsers.find(
      (u) => u.username === incomingCallDetails.caller_username
    );
    if (callerUser) {
      setActiveCallRecipient(callerUser);
    } else {
      // Fallback if user not found in allUsers (should not happen if presence is working)
      setActiveCallRecipient({
        id: incomingCallDetails.from_user_id,
        username: incomingCallDetails.caller_username,
      });
    }
    setCallRoomId(incomingCallDetails.room_id);
    setCallType(incomingCallDetails.call_type);
    setIncomingCall(null); // Clear incoming call state
    setIncomingCallDetails(null);

    // Send acceptance message via WebSocket
    sendWebSocketMessage({
      type: "call_accepted",
      call: {
        to_user_id: incomingCallDetails.from_user_id,
        from_user_id: user.id,
        room_id: incomingCallDetails.room_id,
        call_type: incomingCallDetails.call_type,
      },
    });

    showCallNotification("success", "Call accepted!");
  };

  const handleRejectCall = () => {
    if (!incomingCallDetails) return;

    stopIncomingCallRingtone();
    setCallState("idle");
    setIncomingCall(null);
    setIncomingCallDetails(null);
    setActiveCallRecipient(null);
    setCallRoomId(null);

    // Send rejection message via WebSocket
    sendWebSocketMessage({
      type: "call_rejected",
      call: {
        to_user_id: incomingCallDetails.from_user_id,
        from_user_id: user.id,
        room_id: incomingCallDetails.room_id,
        call_type: incomingCallDetails.call_type,
      },
    });

    showCallNotification("info", "Call rejected.");
  };

  const handleHangUp = () => {
    if (callState === "idle") {
      console.log("handleHangUp called but callState is already idle.");
      return;
    }

    console.log("Attempting to hang up call.");
    stopIncomingCallRingtone();
    stopRingbackTone();

    // Inform the other party via WebSocket if there's an active recipient
    if (activeCallRecipient && user) {
      console.log("Sending call_ended message via WebSocket.");
      sendWebSocketMessage({
        type: "call_ended",
        call: {
          to_user_id: activeCallRecipient.id,
          from_user_id: user.id,
          room_id: callRoomId,
          call_type: callType,
        },
      });
    }

    endCall(); // Perform local cleanup and state reset
    showCallNotification("info", "Call ended.");
  };

  // Unified function to end call and reset states
  const endCall = () => {
    handleAudioCallEnd(); // Trigger the aggressive cleanup for audio calls
    handleVideoCallEnd(); // Trigger the aggressive cleanup for video calls

    setCallState("idle");
    setIncomingCall(null);
    setActiveCallRecipient(null);
    setCallRoomId(null);
    setForceHideModal(true); // Force modal hide after ending call
    setIncomingCallDetails(null);

    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }
  };

  const initiateVideoCall = async (recipient) => {
    if (!user) {
      showCallNotification("error", "Please log in to initiate a video call.");
      return;
    }
    if (callState !== "idle") {
      showCallNotification("error", "Already in a call or call pending.");
      return;
    }
    if (!(await requestMicrophonePermission())) {
      return;
    }

    const newRoomId = Math.random().toString(36).substring(2, 15);
    setVideoCallRoomId(newRoomId);
    setActiveVideoCallRecipient(recipient);
    setCallType("video");
    setVideoCallState("calling"); // Set state to calling

    const callPayload = {
      to_user_id: recipient.id,
      from_user_id: user.id,
      caller_username: user.username,
      room_id: newRoomId,
      call_type: "video",
    };

    // Send video call initiate message via WebSocket
    sendWebSocketMessage({
      type: "video_call_initiate",
      call: callPayload,
    });

    playRingbackTone();
    showCallNotification("info", `Video Calling ${recipient.username}...`);

    // Set a timeout for the call to be unanswered
    ringtoneTimeoutRef.current = setTimeout(() => {
      if (videoCallState === "calling") {
        console.log("Video call unanswered, ending call...");
        handleVideoCallEnd(); // End the call locally
        showCallNotification(
          "warning",
          `${recipient.username} did not answer video call.`
        );
      }
    }, 30000); // 30 seconds timeout
  };

  const handleAcceptVideoCall = async () => {
    if (!incomingVideoCall) return;

    if (!(await requestMicrophonePermission())) {
      return;
    }

    setVideoCallState("active");
    stopIncomingCallRingtone();

    // Update the recipient to the caller
    const callerUser = allUsers.find(
      (u) => u.username === incomingVideoCall.caller_username
    );
    if (callerUser) {
      setActiveVideoCallRecipient(callerUser);
    } else {
      // Fallback if user not found in allUsers (should not happen if presence is working)
      setActiveVideoCallRecipient({
        id: incomingVideoCall.from_user_id,
        username: incomingVideoCall.caller_username,
      });
    }
    setVideoCallRoomId(incomingVideoCall.room_id);
    setCallType(incomingVideoCall.call_type);
    setIncomingVideoCall(null); // Clear incoming call state

    // Send acceptance message via WebSocket
    sendWebSocketMessage({
      type: "video_call_accepted",
      call: {
        to_user_id: incomingVideoCall.from_user_id,
        from_user_id: user.id,
        room_id: incomingVideoCall.room_id,
        call_type: incomingVideoCall.call_type,
      },
    });

    showCallNotification("success", "Video call accepted!");
  };

  const handleRejectVideoCall = () => {
    if (!incomingVideoCall) return;

    stopIncomingCallRingtone();
    setVideoCallState("idle");
    setIncomingVideoCall(null);
    setActiveVideoCallRecipient(null);
    setVideoCallRoomId(null);

    // Send rejection message via WebSocket
    sendWebSocketMessage({
      type: "video_call_rejected",
      call: {
        to_user_id: incomingVideoCall.from_user_id,
        from_user_id: user.id,
        room_id: incomingVideoCall.room_id,
        call_type: incomingVideoCall.call_type,
      },
    });

    showCallNotification("info", "Video call rejected.");
  };

  const handleVideoCallEnd = () => {
    if (videoCallState === "idle") {
      console.log(
        "handleVideoCallEnd called but videoCallState is already idle."
      );
      return;
    }

    console.log("Attempting to hang up video call.");
    stopIncomingCallRingtone();
    stopRingbackTone();

    // Inform the other party via WebSocket if there's an active recipient
    if (activeVideoCallRecipient && user) {
      console.log("Sending video_call_ended message via WebSocket.");
      sendWebSocketMessage({
        type: "video_call_ended",
        call: {
          to_user_id: activeVideoCallRecipient.id,
          from_user_id: user.id,
          room_id: videoCallRoomId,
          call_type: callType,
        },
      });
    }

    setVideoCallState("idle");
    setIncomingVideoCall(null);
    setActiveVideoCallRecipient(null);
    setVideoCallRoomId(null);
    setForceHideModal(true);
    showCallNotification("info", "Video call ended.");
  };

  const handleLoginOrRegister = async (e, endpoint) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${AUTH_API_BASE_URL}${endpoint}`,
        loginForm
      );
      const { token, user: userData } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setIsLoggedIn(true);
      showCallNotification("success", "Logged in successfully!");
    } catch (error) {
      console.error("Authentication error:", error.response?.data || error);
      showCallNotification("error", "Authentication failed.");
    }
  };

  const handleLogout = () => {
    // Close WebSocket connection first
    closeWebSocket();

    // Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Reset all state
    setUser(null);
    setIsLoggedIn(false);
    setMessages([]);
    setOnlineUserIds(new Set());
    setAllUsers([]);
    setSelectedRecipient(null);
    setLoginForm({ username: "", password: "" });

    // Force page reload to ensure clean state
    window.location.reload();

    showCallNotification("info", "Logged out successfully!");
  };

  const fetchAllUsers = async (userApiUrl) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(userApiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Filter out the current user from the allUsers list
      const usersWithoutSelf = response.data.filter((u) => u.id !== user.id);
      setAllUsers(usersWithoutSelf);

      // Initialize isOnline status for all users
      setAllUsers((prevUsers) =>
        prevUsers.map((u) => ({
          ...u,
          isOnline: onlineUserIds.has(u.id),
        }))
      );

      // Populate userMap for quick lookups
      const newUserMap = new Map();
      usersWithoutSelf.forEach((u) => newUserMap.set(u.id, u));
      setUserMap(newUserMap);
    } catch (error) {
      console.error("Error fetching all users:", error);
      showCallNotification("error", "Failed to load users.");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipient) return;

    const messagePayload = {
      to_user_id: selectedRecipient.id,
      content: newMessage.trim(),
      timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      type: "private_message",
      local_id: `temp-${Date.now()}`, // Temporary ID for optimistic UI update
    };

    // Optimistically add message to UI
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: messagePayload.local_id,
        from_user_id: user.id,
        from_username: user.username,
        to_user_id: selectedRecipient.id,
        content: messagePayload.content,
        timestamp: messagePayload.timestamp,
        type: messagePayload.type,
        status: "sending", // Indicate it's being sent
      },
    ]);
    setNewMessage("");

    // Send via WebSocket
    sendWebSocketMessage(messagePayload);

    // The WebSocket event will handle updating the message status to 'sent'
  };

  const selectChatUser = async (userToSelect) => {
    setSelectedRecipient(userToSelect);
    setSearchQuery(""); // Clear search when a user is selected
    setSearchResults([]);
    setSidebarOpen(false);
    // Fetch messages for the selected recipient
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${MESSAGE_API_BASE_URL}/between/${user.id}/${userToSelect.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessages(response.data); // Replace current messages with fetched ones
      console.log("Fetched messages:", response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
      showCallNotification("error", "Failed to load messages.");
      setMessages([]); // Clear messages on error
    }
  };

  const handleSearch = (term) => {
    setSearchQuery(term);
    if (term.length > 0) {
      const filteredUsers = allUsers.filter((u) =>
        u.username.toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filteredUsers);
    } else {
      setSearchResults([]);
    }
  };

  const isUserOnline = (username) =>
    onlineUserIds.has(allUsers.find((u) => u.username === username).id);

  // Fetch environment variables at runtime from public/env.json
  useEffect(() => {
    async function fetchEnvVars() {
      try {
        const response = await axios.get("/env.json");
        const fetchedEnvVars = response.data;
        setEnvVars(fetchedEnvVars);
        AUTH_API_BASE_URL = fetchedEnvVars.NEXT_PUBLIC_AUTH_API_URL;
        MESSAGE_API_BASE_URL = fetchedEnvVars.NEXT_PUBLIC_MESSAGE_API_URL;
        WEBSOCKET_URL = fetchedEnvVars.NEXT_PUBLIC_REALTIME_API_URL;
        JANUS_HTTP_URL = fetchedEnvVars.NEXT_PUBLIC_JANUS_HTTP_URL;
        JANUS_URL = fetchedEnvVars.NEXT_PUBLIC_JANUS_URL;
        REALTIME_HTTP_API_URL = fetchedEnvVars.NEXT_PUBLIC_REALTIME_API_URL;
        USER_API_BASE_URL = fetchedEnvVars.NEXT_PUBLIC_AUTH_API_URL; // Assuming auth service also handles user data
        console.log("🔥 DEBUG - Fetched Environment variables at runtime:", {
          NEXT_PUBLIC_AUTH_API_URL: AUTH_API_BASE_URL,
          NEXT_PUBLIC_MESSAGE_API_URL: MESSAGE_API_BASE_URL,
          NEXT_PUBLIC_REALTIME_API_URL: WEBSOCKET_URL,
          NEXT_PUBLIC_JANUS_HTTP_URL: JANUS_HTTP_URL,
          NEXT_PUBLIC_JANUS_URL: JANUS_URL,
          NODE_ENV: process.env.NODE_ENV,
        });

        // Check for existing session and initialize WebSocket after env vars are loaded
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoggedIn(true);
          // Initialize WebSocket here after user and envVars are set
          initializeWebSocket(
            `${fetchedEnvVars.NEXT_PUBLIC_REALTIME_API_URL}/ws?user_id=${parsedUser.id}&username=${parsedUser.username}`,
            parsedUser.id,
            parsedUser.username
          );
        }
      } catch (error) {
        console.error("Error fetching environment variables:", error);
      }
    }

    fetchEnvVars();
  }, []);

  // WebSocket message handling logic
  const handleWebSocketMessage = useCallback(
    (data) => {
      const message = JSON.parse(data);
      console.log("WebSocket message received:", message);

      if (message.type === "presence_update") {
        console.log("FULL PRESENCE UPDATE:", JSON.stringify(message, null, 2));
        console.log("Current user ID:", user?.id);

        // Convert usernames to user objects
        const onlineUsers = message.online_users.map((username) => {
          const userObj = allUsers.find((u) => u.username === username);
          return userObj || { username, id: username }; // Fallback if user not found
        });

        const newOnlineIds = new Set(onlineUsers.map((u) => u.id));
        setOnlineUserIds(newOnlineIds);

        // Update online status in allUsers
        setAllUsers((prevUsers) =>
          prevUsers.map((u) => ({
            ...u,
            isOnline: newOnlineIds.has(u.id),
          }))
        );
      } else if (message.type === "new_message") {
        // This is a new message, either sent by the current user from another device
        // or an incoming message from another user. It also serves as the server's confirmation
        // of an optimistically sent message.
        setMessages((prevMessages) => {
          const existingMessageIndex = prevMessages.findIndex(
            (m) => m.id === message.message.local_id
          );

          if (existingMessageIndex > -1) {
            // If an optimistically sent message exists, update it with the server's ID and status
            const updatedMessages = [...prevMessages];
            updatedMessages[existingMessageIndex] = {
              ...updatedMessages[existingMessageIndex],
              id: message.message.id,
              status: message.message.status || "sent", // Use status from server or default to 'sent'
            };
            console.log(
              "Updated optimistic message:",
              updatedMessages[existingMessageIndex]
            );
            return updatedMessages;
          } else {
            // Otherwise, it's a new incoming message or from another device of the sender
            console.log("Adding new incoming message:", message.message);
            return [...prevMessages, message.message];
          }
        });

        // If the message is for the currently selected chat and the tab is visible,
        // send a read receipt.
        if (
          message.message.from_user_id === selectedRecipient?.id &&
          document.visibilityState === "visible"
        ) {
          // Delay marking as read to allow message to render
          setTimeout(() => {
            sendWebSocketMessage({
              type: "message_read",
              id: message.message.id, // Use the actual message ID from the server
              local_id: message.message.local_id, // Pass local_id for potential debugging
              from_user_id: user.id, // The current user is the reader
              to_user_id: message.message.from_user_id, // The sender of the original message
            });
            console.log("Sent message_read for message:", message.message.id);
          }, 500);
        }
      } else if (message.type === "message_status_update") {
        console.log("Received message_status_update:", message);
        setMessages((prev) =>
          prev.map((m) =>
            // Match by actual ID first, then by local_id if actual ID isn't set yet (for 'sending' state)
            m.id === message.id ||
            (m.status === "sending" && m.id === message.local_id)
              ? { ...m, status: message.status } // Update status
              : m
          )
        );
      } else if (message.type === "call_event") {
        handleCallEvent(message.payload);
      }
    },
    [allUsers, user, selectedRecipient, sendWebSocketMessage]
  );

  // Set the onMessage callback for the WebSocket hook
  useEffect(() => {
    // onMessage is not needed if we are managing WebSocket directly
  }, []);

  // Top-level useEffect to fetch all users when envVars and user are ready
  useEffect(() => {
    if (isLoggedIn && user && envVars?.NEXT_PUBLIC_AUTH_API_URL) {
      fetchAllUsers(`${envVars.NEXT_PUBLIC_AUTH_API_URL}/users`);
    }
  }, [isLoggedIn, user, envVars]);

  useEffect(() => {
    console.log("CURRENT ONLINE USERS STATE:", onlineUserIds);
  }, [onlineUserIds]);

  useEffect(() => {
    console.log("Current allUsers state:", allUsers);
    console.log("Current onlineUserIds:", Array.from(onlineUserIds));
  }, [allUsers, onlineUserIds]);

  useEffect(() => {
    // Only run this effect if `user` is defined (i.e., user is logged in)
    if (user && callState !== "idle") {
      // Logic for handling call state changes
      if (callState === "in-call") {
        showCallNotification(
          "success",
          `Call with ${activeCallRecipient?.username} in progress.`
        );
      }
    }
  }, [callState, activeCallRecipient, showCallNotification, user]);

  useEffect(() => {
    if (user && isLoggedIn && WEBSOCKET_URL) {
      initializeWebSocket(user.id, user.username, handleWebSocketMessage);
    }
    // Clean up WebSocket on component unmount or user logout
    return () => {
      closeWebSocket(); // Call the imported closeWebSocket function
    };
  }, [user, isLoggedIn, WEBSOCKET_URL, handleWebSocketMessage]);

  // --- UI Components ---
  const styles = {
    onlineUsersContainer: {
      position: "fixed",
      right: "20px",
      top: "20px",
      background: "white",
      padding: "15px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      zIndex: 100,
    },
    onlineStatus: {
      color: "green",
      fontWeight: "bold",
    },
  };

  const renderAuth = () => {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
          <div className="text-center">
            <FaRocket className="mx-auto h-12 w-auto text-indigo-500" />
            <h2 className="mt-6 text-3xl font-extrabold">Welcome to Alcall</h2>
            <p className="mt-2 text-sm text-gray-400">
              Sign in to your account
            </p>
          </div>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleLoginOrRegister(e, "/auth/login");
            }}
          >
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign in
              </button>
            </div>
          </form>
          <div className="text-center">
            <p className="text-sm text-gray-400">
              Don't have an account?
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleLoginOrRegister(e, "/auth/register");
                }}
                className="font-medium text-indigo-400 hover:text-indigo-300 ml-1"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const MessageBubble = ({ msg, isSender, isFirstInGroup }) => {
    const formatTimestamp = (timestamp) => {
      const date = new Date(timestamp * 1000);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const bubbleClass = isSender
      ? "bg-blue-500 text-white rounded-br-none ml-auto"
      : "bg-gray-700 text-white rounded-bl-none mr-auto";
    const marginClass = isFirstInGroup ? "mt-4" : "mt-1";

    // Determine avatar display and message grouping
    const showAvatar = !isSender && isFirstInGroup;
    const senderAvatarClass = isSender ? "order-2 ml-2" : "order-1 mr-2";

    return (
      <div
        className={`flex items-end ${isSender ? "justify-end" : "justify-start"}
         ${marginClass}`}
      >
        {/* Avatar for receiver's messages */}
        {showAvatar && (
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white uppercase ${senderAvatarClass}`}
          >
            {msg.from_username ? msg.from_username.charAt(0) : "?"}
          </div>
        )}

        <div
          className={`max-w-xs lg:max-w-md xl:max-w-lg p-3 rounded-lg shadow-md relative ${bubbleClass}`}
        >
          {!isSender && (
            <div className="font-bold text-sm mb-1">
              {msg.from_username || "Unknown"}
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          <div className="text-xs mt-1 opacity-75 text-right">
            {formatTimestamp(msg.timestamp)}
            {isSender && msg.status && (
              <span
                className={`ml-2 text-xs ${
                  msg.status === "sending"
                    ? "text-gray-300"
                    : msg.status === "delivered"
                    ? "text-green-400"
                    : msg.status === "read"
                    ? "text-green-500"
                    : "text-white"
                }`}
              >
                {msg.status === "sending"
                  ? "⏳ Sending"
                  : msg.status === "delivered"
                  ? "✓ Delivered"
                  : msg.status === "read"
                  ? "✓✓ Read"
                  : ""}
              </span>
            )}
          </div>
        </div>

        {/* Spacer for sender's messages to align with receiver's avatar */}
        {isSender && <div className="w-8 h-8 flex-shrink-0"></div>}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (searchQuery.length === 0) return null;
    if (searchResults.length === 0) {
      return <div className="p-4 text-gray-400">No users found.</div>;
    }
    return (
      <div className="mt-2 bg-gray-700 rounded-md shadow-lg">
        {searchResults.map((result) => (
          <div
            key={result.id}
            className="flex items-center p-3 hover:bg-gray-600 cursor-pointer"
            onClick={() => selectChatUser(result)}
          >
            <FaUser className="text-gray-400 mr-3" />
            <span className="text-white">{result.username}</span>
            {onlineUserIds.has(result.id) && (
              <span className="ml-auto text-green-400 text-xs">Online</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return isLoggedIn ? (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <Head>
        <title>UnifiedChat</title>
      </Head>

      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleSearch={handleSearch}
        searchQuery={searchQuery}
        renderSearchResults={renderSearchResults}
        isLoggedIn={isLoggedIn}
        user={user}
        selectedRecipient={selectedRecipient}
        allUsers={allUsers}
        isUserOnline={isUserOnline}
        selectChatUser={selectChatUser}
        handleLogout={handleLogout}
        showCallNotification={showCallNotification}
        initiateCall={initiateCall}
        initiateVideoCall={initiateVideoCall}
      />

      {/* Main Chat Area */}
      <ChatInterface
        selectedRecipient={selectedRecipient}
        messages={messages}
        user={user}
        MessageBubble={MessageBubble}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        handleHangUp={handleHangUp}
        isLoggedIn={isLoggedIn}
        callState={callState}
        incomingCall={incomingCall}
        handleAcceptCall={handleAcceptCall}
        handleRejectCall={handleRejectCall}
        handleCallEvent={handleCallEvent}
        callNotification={callNotification}
        janusInitialized={janusInitialized}
        setJanusInitialized={setJanusInitialized}
        initializeJanus={initializeJanus}
        callEndedModal={callEndedModal}
        forceHideModal={forceHideModal}
        setForceHideModal={setForceHideModal}
        videoCallState={videoCallState}
        incomingVideoCall={incomingVideoCall}
        handleAcceptVideoCall={handleAcceptVideoCall}
        handleRejectVideoCall={handleRejectVideoCall}
        handleVideoCallEnd={handleVideoCallEnd}
      />

      {/* Audio Call Handler - Hidden UI */}
      {user &&
        callRoomId &&
        (callState === "active" || callState === "calling") && (
          <AudioCallHandler
            janusUrl={JANUS_URL} // Use the global Janus URL
            janusHttpUrl={JANUS_HTTP_URL} // Use the global Janus HTTP URL
            currentUserId={user.id}
            currentUsername={user.username}
            activeRecipientId={activeCallRecipient?.id}
            callRoomId={callRoomId}
            onCallEnd={handleAudioCallEnd} // Pass the new handler
            janusInitialized={janusInitialized}
            setJanusInitialized={setJanusInitialized}
            callType={callType}
            audioCallMuted={audioCallMuted}
            audioCallVolume={audioCallVolume}
            setAudioCallStatus={setAudioCallStatus}
            audioCallStatus={audioCallStatus}
            sendWebSocketMessage={sendWebSocketMessage} // Pass sendWebSocketMessage
            showCallNotification={showCallNotification}
          />
        )}

      {/* Video Call Interface - Hidden UI */}
      {user &&
        videoCallRoomId &&
        (videoCallState === "active" || videoCallState === "calling") && (
          <VideoCallInterface
            janusUrl={JANUS_URL}
            janusHttpUrl={JANUS_HTTP_URL}
            currentUserId={user.id}
            currentUsername={user.username}
            activeRecipientId={activeVideoCallRecipient?.id}
            callRoomId={videoCallRoomId}
            onVideoCallEnd={handleVideoCallEnd} // Pass the new handler
            janusInitialized={janusInitialized}
            setJanusInitialized={setJanusInitialized}
            callType={callType}
            sendWebSocketMessage={sendWebSocketMessage} // Pass sendWebSocketMessage
            showCallNotification={showCallNotification}
          />
        )}
    </div>
  ) : (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      {!envVars ? <div>Loading configuration...</div> : renderAuth()}
    </div>
  );
}

// Helper function to handle call events (moved from within WebSocket.onmessage)
const handleCallEvent = (payload) => {
  // Implement your call event handling logic here
  console.log("Call Event Received:", payload);
  // This function would typically update call-related states (e.g., incomingCall, callState)
};
