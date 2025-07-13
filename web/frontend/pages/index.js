import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Script from "next/script";
import axios from "axios";
import UserPopover from "../components/UserPopover";
import AudioCallHandler from "../components/AudioCallHandler";
import VideoCallInterface from "../components/VideoCallInterface";
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
} from "react-icons/fa";

// --- Configuration (will be populated at runtime) ---
let AUTH_API_BASE_URL;
let MESSAGE_API_BASE_URL;
let WEBSOCKET_URL;
let JANUS_HTTP_URL;
let JANUS_URL;
let REALTIME_HTTP_API_URL;
let USER_API_BASE_URL; // Add this line

export default function Home() {
  console.log(
    "🔥 FRONTEND CACHE BUSTER v2.4.0 - DIRECT HANGUP CLEANUP FIX LOADED 🔥"
  );
  // --- State ---
  const [envVars, setEnvVars] = useState(null); // New state to hold runtime env vars
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
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
    if (!userApiUrl) {
      console.error("User API URL not provided for fetching users.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${userApiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = response.data || [];
      setUsers(usersData);
      // Populate the userMap for easy username lookup
      const newMap = new Map();
      usersData.forEach((u) => newMap.set(u.id.toString(), u.username));
      setUserMap(newMap);
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
    if (!term) {
      setSearchResults([]);
      return;
    }
    const results = users.filter(
      (u) =>
        u.username.toLowerCase().includes(term.toLowerCase()) &&
        u.id !== user.id
    );
    setSearchResults(results);
  };

  const isUserOnline = (username) => onlineUsers.includes(username);

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
        USER_API_BASE_URL = fetchedEnvVars.NEXT_PUBLIC_USER_API_URL; // Add this line

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

      ws.current = new WebSocket(envVars.NEXT_PUBLIC_REALTIME_API_URL);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        ws.current.send(JSON.stringify({ type: "presence", user_id: user.id }));
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        if (message.type === "presence_update") {
          setOnlineUsers(message.online_users);
        } else if (message.type === "message") {
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

      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
        setOnlineUsers([]);
        // Attempt to reconnect if previously connected
        if (isLoggedIn && user) {
          console.log("Attempting to reconnect WebSocket...");
          setTimeout(
            () =>
              (ws.current = new WebSocket(
                envVars.NEXT_PUBLIC_REALTIME_API_URL
              )),
            3000
          ); // Reconnect after 3 seconds
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }
  }, [isLoggedIn, user, envVars, selectedRecipient]);

  // Top-level useEffect to fetch all users when envVars and user are ready
  useEffect(() => {
    if (isLoggedIn && user && envVars && envVars.NEXT_PUBLIC_USER_API_URL) {
      fetchAllUsers(envVars.NEXT_PUBLIC_USER_API_URL);
    }
  }, [isLoggedIn, user, envVars]);

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
  const renderAuth = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <FaRocket className="mx-auto h-12 w-auto text-indigo-500" />
          <h2 className="mt-6 text-3xl font-extrabold">Welcome to Alvis</h2>
          <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
        </div>
        <form
          className="space-y-6"
          onSubmit={(e) => handleLoginOrRegister(e, "/auth/login")}
        >
          <div className="rounded-md shadow-sm -space-y-px">
            <input
              type="text"
              placeholder="Username"
              className="w-full px-3 py-2 border border-gray-700 bg-gray-900 placeholder-gray-500 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm({ ...loginForm, username: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-3 py-2 border border-gray-700 bg-gray-900 placeholder-gray-500 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign In
            </button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={(e) => handleLoginOrRegister(e, "/auth/register")}
              className="font-medium text-indigo-400 hover:text-indigo-300"
            >
              Don't have an account? Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const MessageBubble = ({ msg, isSender, isFirstInGroup }) => {
    // Get sender's username from the map, fallback to an empty string
    const senderUsername = userMap.get(msg.from_user_id?.toString()) || "";

    return (
      <div
        className={`flex ${isSender ? "justify-end" : "justify-start"} mb-1.5 ${
          isFirstInGroup ? "mt-3" : ""
        }`}
      >
        {!isSender && (
          <div className="flex-shrink-0 mr-2">
            {/* User Avatar */}
            <FaUser className="h-8 w-8 text-gray-400 rounded-full bg-gray-700 p-1" />
          </div>
        )}
        <div
          className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
            isSender
              ? "bg-indigo-600 text-white rounded-br-none"
              : "bg-gray-700 text-gray-100 rounded-bl-none"
          }`}
        >
          {!isSender && (
            <div className="text-xs font-semibold mb-1 text-gray-300">
              {senderUsername}
            </div>
          )}
          <p className="text-sm">{msg.content}</p>
          <div
            className={`text-xs mt-1 ${
              isSender ? "text-indigo-200" : "text-gray-400"
            } text-right`}
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
            {/* User Avatar */}
            <FaUser className="h-8 w-8 text-indigo-300 rounded-full bg-indigo-800 p-1" />
          </div>
        )}
      </div>
    );
  };

  const renderChat = () => (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 p-4 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Alvis</h2>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <FaTimes size={20} />
          </button>
        </div>
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full px-3 py-2 pr-10 bg-gray-700 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <FaSearch className="absolute right-3 top-3 text-gray-400" />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center p-3 hover:bg-gray-600 cursor-pointer"
                  onClick={() => {
                    setSelectedRecipient(user);
                    setSearchResults([]); // Clear search results on selection
                  }}
                >
                  <FaUser className="h-8 w-8 text-gray-400 rounded-full bg-gray-600 p-1 mr-3" />
                  <div>
                    <div className="font-semibold text-white">
                      {user.username}
                    </div>
                    <div className="text-sm text-gray-400">
                      {isUserOnline(user.username) ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User List */}
        <nav>
          <ul>
            {users.map((u) => (
              <li
                key={u.id}
                onClick={() => selectChatUser(u)}
                className={`flex items-center p-3 mb-2 rounded-md cursor-pointer transition-colors duration-200 ${
                  selectedRecipient?.id === u.id
                    ? "bg-gray-700"
                    : "hover:bg-gray-700"
                }`}
              >
                <div className="relative">
                  <FaUser
                    className={`h-9 w-9 rounded-full p-1 mr-3 ${
                      selectedRecipient?.id === u.id
                        ? "text-indigo-400 bg-indigo-800"
                        : "text-gray-400 bg-gray-600"
                    }`}
                  />
                  {isUserOnline(u.username) && (
                    <span className="absolute bottom-0 right-2 block h-3 w-3 rounded-full ring-2 ring-gray-800 bg-green-400"></span>
                  )}
                </div>
                <span
                  className={`font-medium ${
                    selectedRecipient?.id === u.id
                      ? "text-white"
                      : "text-gray-300"
                  }`}
                >
                  {u.username}
                </span>
                {highlightedUser === u.id && (
                  <FaBell className="ml-auto text-yellow-400" />
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="absolute bottom-4 left-4">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-gray-900 lg:ml-64">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md">
          <div className="flex items-center">
            <button
              className="lg:hidden mr-4 text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars size={20} />
            </button>
            {selectedRecipient ? (
              <>
                <div className="relative">
                  <FaUser className="h-10 w-10 text-indigo-400 rounded-full bg-indigo-800 p-1 mr-3" />
                  {isUserOnline(selectedRecipient.username) && (
                    <span className="absolute bottom-0 right-2 block h-3.5 w-3.5 rounded-full ring-2 ring-gray-800 bg-green-400"></span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-white">
                  {selectedRecipient.username}
                </h1>
              </>
            ) : (
              <h1 className="text-xl font-bold text-gray-400">
                Select a chat to start messaging
              </h1>
            )}
          </div>
          {selectedRecipient && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (!audioCallRef.current) {
                    showCallNotification(
                      "error",
                      "Audio call handler not ready.",
                      3000
                    );
                    return;
                  }
                  if (!janusInitialized) {
                    showCallNotification(
                      "error",
                      "Janus not initialized. Please refresh.",
                      3000
                    );
                    return;
                  }
                  if (!activeCallRecipient) {
                    initiateCall(selectedRecipient);
                  } else {
                    handleHangUp();
                  }
                }}
                className={`p-2 rounded-full text-white transition-colors duration-200 ${
                  activeCallRecipient
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
                title={
                  activeCallRecipient ? "Hang Up Audio Call" : "Audio Call"
                }
                disabled={videoCallState !== "idle"} // Disable audio call if video call is active
              >
                {activeCallRecipient ? (
                  <FaPhoneSlash size={20} />
                ) : (
                  <FaPhone size={20} />
                )}
              </button>
              <button
                onClick={() => {
                  if (!janusInitialized) {
                    showCallNotification(
                      "error",
                      "Janus not initialized. Please refresh.",
                      3000
                    );
                    return;
                  }
                  if (!activeVideoCallRecipient) {
                    initiateVideoCall(selectedRecipient);
                  } else {
                    handleVideoCallEnd();
                  }
                }}
                className={`p-2 rounded-full text-white transition-colors duration-200 ${
                  activeVideoCallRecipient
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                title={
                  activeVideoCallRecipient ? "Hang Up Video Call" : "Video Call"
                }
                disabled={callState !== "idle"} // Disable video call if audio call is active
              >
                {activeVideoCallRecipient ? (
                  <FaPhoneSlash size={20} />
                ) : (
                  <FaVideo size={20} />
                )}
              </button>
            </div>
          )}
        </header>

        {/* Message List */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          {messages.map((msg, index) => {
            const isSender = msg.from_user_id === user.id;
            // Check if this is the first message in a new group (from a different sender than previous, or first message overall)
            const isFirstInGroup =
              index === 0 ||
              messages[index - 1].from_user_id !== msg.from_user_id;

            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isSender={isSender}
                isFirstInGroup={isFirstInGroup}
              />
            );
          })}
        </div>

        {/* Message Input */}
        {selectedRecipient && (
          <footer className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 rounded-l-md bg-gray-700 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FaPaperPlane />
              </button>
            </div>
          </footer>
        )}
      </main>

      {/* Incoming Call Notification */}
      {incomingCall && callState === "ringing" && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4">
              Incoming {incomingCall.call_type || "Audio"} Call
            </h2>
            <p className="text-gray-300 mb-6">
              from {incomingCall.caller_username}
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleAcceptCall}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full flex items-center"
              >
                <FaPhone className="mr-2" /> Accept
              </button>
              <button
                onClick={handleRejectCall}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full flex items-center"
              >
                <FaPhoneSlash className="mr-2" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Notification Display */}
      {callNotification && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg text-white z-50 ${
            callNotification.type === "error" ? "bg-red-600" : "bg-blue-600"
          }`}
        >
          {callNotification.message}
        </div>
      )}

      {/* Call Ended Modal */}
      {callEndedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
              {callEndedModal.title}
            </h2>
            <p className="text-gray-300 mb-6">{callEndedModal.message}</p>
            <button
              onClick={() => setCallEndedModal(null)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-full"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* AudioCallHandler Component */}
      <AudioCallHandler
        ref={audioCallRef}
        onCallEnd={endCall}
        callState={callState}
        setCallState={setCallState}
        activeCallRecipient={activeCallRecipient}
        callRoomId={callRoomId}
        audioCallMuted={audioCallMuted}
        setAudioCallMuted={setAudioCallMuted}
        audioCallVolume={audioCallVolume}
        setAudioCallVolume={setAudioCallVolume}
        audioCallStatus={audioCallStatus}
        setAudioCallStatus={setAudioCallStatus}
        janusInitialized={janusInitialized}
      />

      {/* VideoCallInterface Component */}
      <VideoCallInterface
        videoCallState={videoCallState}
        setVideoCallState={setVideoCallState}
        activeVideoCallRecipient={activeVideoCallRecipient}
        videoCallRoomId={videoCallRoomId}
        janusInitialized={janusInitialized}
        onVideoCallEnd={handleVideoCallEnd}
        janusUrl={envVars ? envVars.NEXT_PUBLIC_JANUS_URL : undefined}
        janusHttpUrl={envVars ? envVars.NEXT_PUBLIC_JANUS_HTTP_URL : undefined}
      />
    </div>
  );

  if (!envVars) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Loading configuration...
      </div>
    );
  }

  // Render main app or auth screen
  return isLoggedIn ? renderChat() : renderAuth();
}
