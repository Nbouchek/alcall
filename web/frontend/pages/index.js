import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Script from "next/script";
import axios from "axios";
import AudioCallHandler from "../components/AudioCallHandler";
import VideoCallInterface from "../components/VideoCallInterface";
import OnlineUsersList from "../components/OnlineUsersList";
import ChatInterface from "../components/ChatInterface";
import Sidebar from "../components/Sidebar";
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

    console.log("🔥 INDEX - Full cleanup complete.");
    isEndingCallRef.current = false;
  };

  const isEndingCallRef = useRef(false);
  const audioCallRef = useRef(null);
  const ringtoneTimeoutRef = useRef(null);

  const initializeJanus = () => {
    if (typeof window !== "undefined" && window.Janus) {
      console.log("🔥 JANUS - Initializing Janus library...");
      window.Janus.init({
        debug: "all",
        callback: () => {
          console.log("🔥 JANUS - Janus initialized successfully!");
          setJanusInitialized(true);
        },
      });
    } else {
      console.log("Janus library not loaded, retrying...");
      setTimeout(initializeJanus, 500); // Retry after 500ms
    }
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.localAudioStream = stream; // Store the stream globally if needed
      console.log("Microphone permission granted and stream obtained.");

      // Check microphone cleanup status
      window.testMicrophoneCleanup = () => {
        const tracks = window.localAudioStream
          ? window.localAudioStream.getTracks()
          : [];
        console.log("Microphone stream tracks:", tracks);
        if (tracks.length === 0) {
          console.log("✅ Microphone stream is clean.");
          return true;
        } else {
          console.log(
            "❌ Microphone stream is NOT clean. Tracks still active."
          );
          return false;
        }
      };

      // Force cleanup function
      window.forceMicrophoneCleanup = () => {
        if (window.localAudioStream) {
          console.log("Forcing microphone cleanup...");
          window.localAudioStream.getTracks().forEach((track) => track.stop());
          window.localAudioStream = null;
          console.log("Microphone cleanup forced.");
        } else {
          console.log("No active microphone stream to force cleanup.");
        }
      };

      console.log(
        "💡 TIP: Run 'testMicrophoneCleanup()' in console to check microphone cleanup status"
      );
      console.log(
        "💡 TIP: Run 'forceMicrophoneCleanup()' in console to force cleanup all audio resources"
      );

      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      showCallNotification(
        "error",
        "Microphone permission denied. Calls may not work.",
        5000
      );
      return false;
    }
  };

  const initAudioContext = () => {
    if (typeof window !== "undefined" && !window.audioContext) {
      window.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      console.log(
        "🔥 INDEX - AudioContext initialized:",
        window.audioContext.state
      );
    }
  };

  const playIncomingCallRingtone = () => {
    if (window.playRingtone) {
      window.playRingtone();
      console.log("Playing incoming call ringtone.");
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
      console.log("Playing ringback tone.");
    }
  };

  const stopRingbackTone = () => {
    if (window.stopRingback) {
      window.stopRingback();
      console.log("Stopping ringback tone.");
    }
  };

  const initiateCall = async (recipient) => {
    if (!recipient) {
      showCallNotification("error", "Please select a recipient to call.", 3000);
      return;
    }
    if (callState !== "idle") {
      showCallNotification("error", "Already in a call or call attempt.", 3000);
      return;
    }
    if (user.id === recipient.id) {
      showCallNotification("error", "Cannot call yourself.", 3000);
      return;
    }

    try {
      setCallState("calling"); // Initiating call
      setActiveCallRecipient(recipient);
      playRingbackTone();

      console.log(`Attempting to call ${recipient.username}...`);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/call/initiate`,
        {
          from_user_id: user.id,
          to_user_id: recipient.id,
          call_type: callType,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { room_id } = response.data;
      setCallRoomId(room_id);
      console.log(`Call initiated. Room ID: ${room_id}`);

      // Open AudioCallHandler or VideoCallInterface after initiation
      if (callType === "audio") {
        if (audioCallRef.current) {
          audioCallRef.current.startCall(
            room_id,
            user.id,
            envVars.NEXT_PUBLIC_JANUS_URL,
            envVars.NEXT_PUBLIC_JANUS_HTTP_URL
          );
        }
      } else if (callType === "video") {
        setActiveVideoCallRecipient(recipient);
        setVideoCallRoomId(room_id);
        setVideoCallState("calling");
      }
    } catch (error) {
      console.error("Failed to initiate call:", error);
      showCallNotification(
        "error",
        `Failed to initiate ${callType} call.`,
        4000
      );
      stopRingbackTone();
      setCallState("idle");
      setActiveCallRecipient(null);
      setCallRoomId(null);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      stopIncomingCallRingtone();
      setCallState("active");
      setActiveCallRecipient(incomingCall.caller_user);
      setCallRoomId(incomingCall.room_id);
      setIncomingCall(null);

      console.log(`Accepting call from ${incomingCall.caller_username}`);

      // Notify backend about accepted call
      const token = localStorage.getItem("token");
      await axios.post(
        `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/call/accept`,
        {
          call_id: incomingCall.call_id,
          room_id: incomingCall.room_id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Start the call in AudioCallHandler
      if (callType === "audio") {
        if (audioCallRef.current) {
          audioCallRef.current.startCall(
            incomingCall.room_id,
            user.id,
            envVars.NEXT_PUBLIC_JANUS_URL,
            envVars.NEXT_PUBLIC_JANUS_HTTP_URL
          );
        }
      } else if (callType === "video") {
        setActiveVideoCallRecipient(incomingCall.caller_user);
        setVideoCallRoomId(incomingCall.room_id);
        setVideoCallState("active");
      }
    } catch (error) {
      console.error("Failed to accept call:", error);
      showCallNotification("error", "Failed to accept call.", 4000);
      setCallState("idle");
      setIncomingCall(null);
      setActiveCallRecipient(null);
      setCallRoomId(null);
    }
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;

    console.log(`Rejecting call from ${incomingCall.caller_username}`);
    stopIncomingCallRingtone();

    // Notify backend about rejected call
    const token = localStorage.getItem("token");
    if (token && envVars.NEXT_PUBLIC_REALTIME_API_URL) {
      axios
        .post(
          `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/call/reject`,
          {
            call_id: incomingCall.call_id,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .catch((error) => console.error("Failed to notify backend:", error));
    }

    setCallState("idle");
    setIncomingCall(null);
    setActiveCallRecipient(null);
    setCallRoomId(null);
    showCallNotification("info", "Call rejected.", 3000);
  };

  const handleHangUp = () => {
    if (callState === "idle") {
      console.log("No active call to hang up.");
      return;
    }

    console.log("Attempting to hang up call...");
    stopRingbackTone();
    // Signal to AudioCallHandler to hang up
    if (audioCallRef.current) {
      audioCallRef.current.hangup();
    }
    // For video calls, handle hang up in VideoCallInterface
    if (callType === "video" && videoCallState !== "idle") {
      setVideoCallState("idle");
      setActiveVideoCallRecipient(null);
      setVideoCallRoomId(null);
    }
    // This will trigger handleAudioCallEnd or handleVideoCallEnd via WebSocket or AudioCallHandler callback
  };

  const endCall = () => {
    handleAudioCallEnd();
    showCallEndedModal("info", "Call Ended", "The call has ended.", 3000);
  };

  const initiateVideoCall = async (recipient) => {
    if (!recipient) {
      showCallNotification(
        "error",
        "Please select a recipient for video call."
      );
      return;
    }
    if (videoCallState !== "idle") {
      showCallNotification("error", "Already in a video call or call attempt.");
      return;
    }
    if (user.id === recipient.id) {
      showCallNotification("error", "Cannot video call yourself.", 3000);
      return;
    }

    try {
      setCallType("video");
      setVideoCallState("calling");
      setActiveVideoCallRecipient(recipient);
      console.log(`Attempting to video call ${recipient.username}...`);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/call/initiate`,
        {
          from_user_id: user.id,
          to_user_id: recipient.id,
          call_type: "video",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { room_id } = response.data;
      setVideoCallRoomId(room_id);
      console.log(`Video call initiated. Room ID: ${room_id}`);
      // VideoCallInterface will start the call once videoCallState is "calling"
    } catch (error) {
      console.error("Failed to initiate video call:", error);
      showCallNotification("error", "Failed to initiate video call.", 4000);
      setVideoCallState("idle");
      setActiveVideoCallRecipient(null);
      setVideoCallRoomId(null);
      setCallType("audio"); // Reset to default
    }
  };

  const handleAcceptVideoCall = async () => {
    if (!incomingVideoCall) return;

    try {
      setVideoCallState("active");
      setActiveVideoCallRecipient(incomingVideoCall.caller_user);
      setVideoCallRoomId(incomingVideoCall.room_id);
      setIncomingVideoCall(null);
      setCallType("video");

      console.log(
        `Accepting video call from ${incomingVideoCall.caller_username}`
      );

      const token = localStorage.getItem("token");
      await axios.post(
        `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/call/accept`,
        {
          call_id: incomingVideoCall.call_id,
          room_id: incomingVideoCall.room_id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (error) {
      console.error("Failed to accept video call:", error);
      showCallNotification("error", "Failed to accept video call.", 4000);
      setVideoCallState("idle");
      setIncomingVideoCall(null);
      setActiveVideoCallRecipient(null);
      setVideoCallRoomId(null);
      setCallType("audio");
    }
  };

  const handleRejectVideoCall = () => {
    if (!incomingVideoCall) return;

    console.log(
      `Rejecting video call from ${incomingVideoCall.caller_username}`
    );

    const token = localStorage.getItem("token");
    if (token && envVars.NEXT_PUBLIC_REALTIME_API_URL) {
      axios
        .post(
          `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/call/reject`,
          {
            call_id: incomingVideoCall.call_id,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .catch((error) => console.error("Failed to notify backend:", error));
    }

    setVideoCallState("idle");
    setIncomingVideoCall(null);
    setActiveVideoCallRecipient(null);
    setVideoCallRoomId(null);
    setCallType("audio");
    showCallNotification("info", "Video call rejected.", 3000);
  };

  const handleVideoCallEnd = () => {
    setVideoCallState("idle");
    setActiveVideoCallRecipient(null);
    setIncomingVideoCall(null);
    setVideoCallRoomId(null);
    setCallType("audio");
    showCallEndedModal("info", "Video Call Ended", "The video call has ended.");
  };

  const handleLoginOrRegister = async (e, endpoint) => {
    e.preventDefault();
    if (!envVars) {
      console.error("Environment variables not loaded yet.");
      showCallNotification(
        "error",
        "Configuration loading, please wait.",
        3000
      );
      return;
    }
    try {
      const response = await axios.post(
        `${envVars.NEXT_PUBLIC_AUTH_API_URL}${endpoint}`,
        loginForm
      );
      const { user: userData, token } = response.data;
      if (userData && token) {
        setUser(userData);
        setIsLoggedIn(true);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        // fetchAllUsers will now be called by the useEffect hook once envVars are set
      }
    } catch (error) {
      console.error(`${endpoint} failed`, error);
      showCallNotification(
        "error",
        `${endpoint.slice(1)} failed. Please check credentials or register.`,
        4000
      );
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    ws.current?.close();
  };

  const fetchAllUsers = async (userApiUrl) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(userApiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = response.data || [];

      // Initialize with isOnline status
      const usersWithStatus = usersData.map((user) => ({
        ...user,
        isOnline: onlineUserIds.has(user.id),
      }));

      setAllUsers(usersWithStatus);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipient || !envVars) return;
    const optimisticMessage = {
      id: `local_${Date.now()}`,
      from_user_id: user.id,
      to_user_id: selectedRecipient.id,
      content: newMessage,
      timestamp: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
    setNewMessage("");

    try {
      const response = await axios.post(MESSAGE_API_BASE_URL, {
        from: user.id,
        to: selectedRecipient.id,
        content: optimisticMessage.content,
        id: optimisticMessage.id, // Send local ID to backend
      });
      // The WebSocket event will handle updating the message status to 'sent'
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMessage.id ? { ...m, status: "failed" } : m
        )
      );
    }
  };

  const selectChatUser = async (userToSelect) => {
    if (userToSelect?.id === selectedRecipient?.id) return;
    setSelectedRecipient(userToSelect);
    setMessages([]); // Clear messages for new chat
    setHighlightedUser(null); // Clear highlight on selection
    if (!envVars) {
      console.error(
        "Environment variables not loaded yet for fetching messages."
      );
      return;
    }
    try {
      const token = localStorage.getItem("token");
      // PRIVACY FIX: Use secure endpoint that only returns messages between current user and selected user
      const response = await axios.get(
        `${MESSAGE_API_BASE_URL}/between/${user.id}/${userToSelect.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(response.data || []);
      console.log(
        `🔐 PRIVACY SECURE: Fetched ${
          response.data?.length || 0
        } messages between ${user.username} and ${userToSelect.username}`
      );
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const handleSearch = (term) => {
    setSearchQuery(term);
    if (!term) {
      setSearchResults([]);
      return;
    }
    const results = allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(term.toLowerCase()) &&
        u.id !== user.id
    );
    setSearchResults(results);
  };

  const isUserOnline = (username) =>
    onlineUserIds.has(allUsers.find((u) => u.username === username).id);

  // Compute allUsersWithStatus by adding an isOnline property to each user
  const allUsersWithStatus = allUsers.map((user) => ({
    ...user,
    isOnline: onlineUserIds.has(user.id),
  }));

  // Fetch env vars on component mount
  useEffect(() => {
    async function fetchEnvVars() {
      try {
        const response = await axios.get("/api/config");
        const fetchedEnvVars = response.data;
        setEnvVars(fetchedEnvVars);
        console.log(
          "🔥 DEBUG - Fetched Environment variables at runtime:",
          fetchedEnvVars
        );

        // Assign to global variables for use in other functions
        AUTH_API_BASE_URL = fetchedEnvVars.NEXT_PUBLIC_AUTH_API_URL;
        MESSAGE_API_BASE_URL = fetchedEnvVars.NEXT_PUBLIC_MESSAGE_API_URL;
        WEBSOCKET_URL = fetchedEnvVars.NEXT_PUBLIC_REALTIME_API_URL;
        JANUS_HTTP_URL = fetchedEnvVars.NEXT_PUBLIC_JANUS_HTTP_URL;
        JANUS_URL = fetchedEnvVars.NEXT_PUBLIC_JANUS_URL;
        REALTIME_HTTP_API_URL =
          fetchedEnvVars.NEXT_PUBLIC_REALTIME_HTTP_API_URL;
        USER_API_BASE_URL = fetchedEnvVars.NEXT_PUBLIC_USER_API_URL;

        // After fetching env vars, check for existing session
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
          setIsLoggedIn(true);
          // fetchAllUsers() relies on envVars, so call it here
          // Moved to a separate useEffect to ensure envVars are loaded first
          // if (fetchedEnvVars.NEXT_PUBLIC_USER_API_URL) {
          //   // Changed condition
          //   fetchAllUsers(fetchedEnvVars.NEXT_PUBLIC_USER_API_URL);
          // } else {
          //   console.error(
          //     "User API URL not available after fetching env vars."
          //   );
          // }
        }
      } catch (error) {
        console.error(
          "Failed to fetch environment variables at runtime:",
          error
        );
        showCallNotification(
          "error",
          "Failed to load configuration. Please refresh.",
          5000
        );
      }
    }
    fetchEnvVars();
  }, []); // Run once on mount

  // Auto-dismiss call ended modal when call state changes to idle
  useEffect(() => {
    if (callState === "idle" && callEndedModal) {
      console.log("🔥 AUTO-DISMISS - Call state is idle, dismissing modal");
      setTimeout(() => setCallEndedModal(null), 1000); // Give user 1 second to see the modal
    }
  }, [callState, callEndedModal]);

  // WebSocket connection effect
  useEffect(() => {
    if (isLoggedIn && user && envVars && envVars.NEXT_PUBLIC_REALTIME_API_URL) {
      console.log(
        "Attempting WebSocket connection to:",
        envVars.NEXT_PUBLIC_REALTIME_API_URL
      );
      if (ws.current) {
        ws.current.close(); // Close existing connection if any
      }

      const wsUrl = `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/ws?user_id=${user.id}&username=${user.username}`;
      console.log("Connecting to WebSocket:", wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("WebSocket connected successfully");
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        if (message.type === "presence_update") {
          console.log(
            "FULL PRESENCE UPDATE:",
            JSON.stringify(message, null, 2)
          );
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
            prevUsers.map((user) => ({
              ...user,
              isOnline: newOnlineIds.has(user.id),
            }))
          );
        } else if (message.type === "message") {
          // Correctly placed condition for new chat messages
          setMessages((prevMessages) => [...prevMessages, message.message]);
          // If the message is for the currently selected chat, mark it as read
          if (
            message.message.from_user_id === selectedRecipient?.id &&
            document.visibilityState === "visible"
          ) {
            // Delay marking as read to allow message to render
            setTimeout(() => {
              ws.current?.send(
                JSON.stringify({
                  type: "message_read",
                  message_id: message.message.id,
                  reader_id: user.id,
                })
              );
            }, 500);
          }
        } else if (message.type === "message_status_update") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.message_id ? { ...m, status: message.status } : m
            )
          );
        } else if (message.type === "call_event") {
          handleCallEvent(message.payload);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
        setOnlineUserIds(new Set());
        // Attempt to reconnect if previously connected
        if (isLoggedIn && user) {
          console.log("Attempting to reconnect WebSocket...");
          setTimeout(
            () =>
              (ws.current = new WebSocket(
                `${envVars.NEXT_PUBLIC_REALTIME_API_URL}/ws?user_id=${user.id}&username=${user.username}`
              )),
            3000
          ); // Reconnect after 3 seconds
        }
      };
    }
  }, [isLoggedIn, user, envVars, selectedRecipient]);

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
        console.log("Handling 'in-call' state change...");
        // Additional actions for 'in-call' state if needed
      } else if (callState === "ringing" && incomingCallDetails) {
        playIncomingCallRingtone();
      } else if (callState === "ringing" && !incomingCallDetails) {
        // This case indicates an outgoing call that is ringing
        playRingbackTone();
      }
    }
    // Cleanup function for when callState or incomingCallDetails change
    return () => {
      // This will run when the component unmounts or before the effect runs again
      if (callState === "idle") {
        stopIncomingCallRingtone();
        stopRingbackTone();
      }
    };
  }, [callState, incomingCallDetails, user]); // Added user to dependencies

  const ws = useRef(null);

  // Check for existing session on mount
  useEffect(() => {
    // This part now depends on envVars being loaded, so move logic into fetchEnvVars
  }, []);

  // Auto-dismiss call ended modal when call state changes to idle
  // Original effect is above, this one is redundant
  // useEffect(() => {
  //   if (callState === "idle" && callEndedModal) {
  //     console.log("🔥 AUTO-DISMISS - Call state is idle, dismissing modal");
  //     setTimeout(() => setCallEndedModal(null), 1000); // Give user 1 second to see the modal
  //   }
  // }, [callState, callEndedModal]);

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
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
            <div className="text-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleLoginOrRegister(e, "/auth/register");
                }}
                className="font-medium text-indigo-400 hover:text-indigo-300"
              >
                Don't have an account? Register
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const MessageBubble = ({ msg, isSender, isFirstInGroup }) => {
    return (
      <div
        className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}
      >
        {!isSender && (
          <div className="flex-shrink-0 mr-2">
            {isFirstInGroup && (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <FaUser className="text-white text-sm" />
              </div>
            )}
          </div>
        )}
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isSender
              ? "bg-indigo-600 text-white rounded-br-none"
              : "bg-gray-700 text-white rounded-bl-none"
          }`}
        >
          <div className="text-sm">{msg.content}</div>
          <div
            className={`text-xs mt-1 ${
              isSender ? "text-indigo-200" : "text-gray-400"
            }`}
          >
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {isSender && msg.status === "sending" && (
            <div className="text-xs text-indigo-300 text-right">Sending...</div>
          )}
          {isSender && msg.status === "failed" && (
            <div className="text-xs text-red-400 text-right">Failed</div>
          )}
        </div>
        {isSender && (
          <div className="flex-shrink-0 ml-2">
            <FaUser className="h-8 w-8 text-indigo-300 rounded-full bg-indigo-800 p-1" />
          </div>
        )}
      </div>
    );
  };

  // Render search results - consolidated implementation
  const renderSearchResults = () => {
    if (!searchQuery) return null;

    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">
          Search Results
        </h3>
        {filteredUsers.length > 0 ? (
          <ul className="space-y-2">
            {filteredUsers.map((user) => (
              <li
                key={user.id}
                className="p-2 hover:bg-gray-700 rounded-md cursor-pointer flex items-center"
                onClick={() => setSelectedRecipient(user)}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-2">
                  <FaUser className="text-sm text-white" />
                </div>
                <span>{user.username}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">No users found</p>
        )}
      </div>
    );
  };

  // Filter users based on search query
  const filteredUsers = searchQuery
    ? allUsers.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Single return statement for the component
  return isLoggedIn ? (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Alcall - Modern Chat</title>
        <meta
          name="description"
          content="Modern chat and calling application"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <OnlineUsersList users={allUsersWithStatus} />
      <div className="flex h-screen">
        <Sidebar
          handleLogout={handleLogout}
          handleSearch={handleSearch}
          renderSearchResults={renderSearchResults}
        />

        <ChatInterface
          selectedRecipient={selectedRecipient}
          isUserOnline={isUserOnline}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          user={user}
          initiateCall={initiateCall}
          initiateVideoCall={initiateVideoCall}
        />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      {!envVars ? <div>Loading configuration...</div> : renderAuth()}
    </div>
  );
}
