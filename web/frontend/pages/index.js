import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Script from "next/script";
import axios from "axios";
import dynamic from "next/dynamic";
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

// Dynamic imports for all main components that use hooks or browser APIs
const Sidebar = dynamic(() => import("../components/Sidebar"), { ssr: false });
const ChatInterface = dynamic(() => import("../components/ChatInterface"), {
  ssr: false,
});
const AudioCallHandler = dynamic(
  () => import("../components/AudioCallHandler"),
  { ssr: false }
);
const VideoCallInterface = dynamic(
  () => import("../components/VideoCallInterface"),
  { ssr: false }
);
const OnlineUsersList = dynamic(() => import("../components/OnlineUsersList"), {
  ssr: false,
});
const AuthForm = dynamic(() => import("../components/AuthForm"), {
  ssr: false,
});

// --- Move styles to the top to avoid TDZ issues ---
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

// --- Configuration (will be populated at runtime) ---
// These variables are now accessed directly via process.env.NEXT_PUBLIC_VAR_NAME
// No need for global let declarations here

export default function Home() {
  console.log(
    "🔥 FRONTEND CACHE BUSTER v2.4.0 - DIRECT HANGUP CLEANUP FIX LOADED 🔥"
  );

  // --- State Declarations (All useState hooks here) ---
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allUsers, setAllUsers] = useState([]); // All registered users
  const [onlineUserIds, setOnlineUserIds] = useState(new Set()); // Just IDs of online users
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [authError, setAuthError] = useState(null); // New state for authentication errors
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedUser, setHighlightedUser] = useState(null);
  const [activeCallRecipient, setActiveCallRecipient] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callState, setCallState] = useState("idle"); // "idle" | "calling" | "ringing" | "active"
  const [callRoomId, setCallRoomId] = useState(null);
  const [userMap, setUserMap] = useState(new Map());
  const [callNotification, setCallNotification] = useState(null);
  const [janusInitialized, setJanusInitialized] = useState(false);
  const [callEndedModal, setCallEndedModal] = useState(null);
  const [incomingCallDetails, setIncomingCallDetails] = useState(null);
  const [videoCallState, setVideoCallState] = useState("idle"); // "idle" | "calling" | "ringing" | "active"
  const [activeVideoCallRecipient, setActiveVideoCallRecipient] =
    useState(null);
  const [incomingVideoCall, setIncomingVideoCall] = useState(null);
  const [videoCallRoomId, setVideoCallRoomId] = useState(null);
  const [callType, setCallType] = useState("audio"); // "audio" | "video"
  const [audioCallMuted, setAudioCallMuted] = useState(false);
  const [audioCallVolume, setAudioCallVolume] = useState(1.0);
  const [audioCallStatus, setAudioCallStatus] = useState("Connecting...");
  const [forceHideModal, setForceHideModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- Ref Declarations (All useRef hooks here) ---
  const audioContextRef = useRef(null);
  const isEndingCallRef = useRef(false); // To prevent multiple simultaneous cleanups
  const audioCallRef = useRef(null);
  const ringtoneTimeoutRef = useRef(null);

  // --- Custom Hook Calls (All custom hooks here) ---
  const {
    initializeWebSocket,
    closeWebSocket,
    sendWebSocketMessage,
    setOnMessage,
  } = useWebSocket();

  // --- Callback Functions (All useCallback functions here) ---
  const showCallNotification = useCallback(
    (type, message, duration = 3000) => {
      setCallNotification({ type, message });
      setTimeout(() => setCallNotification(null), duration);
    },
    [setCallNotification]
  );

  const showCallEndedModal = useCallback(
    (type, title, message, duration = 4000) => {
      setCallEndedModal({ type, title, message });
      setTimeout(() => setCallEndedModal(null), duration);
    },
    [setCallEndedModal]
  );

  const requestMicrophonePermission = useCallback(async () => {
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
  }, [showCallNotification]);

  const initAudioContext = useCallback(() => {
    if (typeof window !== "undefined" && !window.audioContext) {
      window.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      console.log("AudioContext initialized.");
    }
  }, []);

  const playIncomingCallRingtone = useCallback(() => {
    if (window.playRingtone) {
      window.playRingtone();
    }
  }, []);

  const stopIncomingCallRingtone = useCallback(() => {
    if (window.stopRingtone) {
      window.stopRingtone();
      console.log("Stopping incoming call ringtone.");
    }
  }, []);

  const playRingbackTone = useCallback(() => {
    if (window.playRingback) {
      window.playRingback();
    }
  }, []);

  const stopRingbackTone = useCallback(() => {
    if (window.stopRingback) {
      window.stopRingback();
      console.log("Stopping ringback tone.");
    }
  }, []);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCallDetails) return;

    stopIncomingCallRingtone();
    setCallState("active");
    setIncomingCall(null);
    setIncomingCallDetails(null);
    setActiveCallRecipient(null);
    setCallRoomId(null);

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
  }, [
    incomingCallDetails,
    requestMicrophonePermission,
    setCallState,
    stopIncomingCallRingtone,
    allUsers,
    user,
    setCallRoomId,
    setCallType,
    setIncomingCall,
    setIncomingCallDetails,
    sendWebSocketMessage,
    showCallNotification,
  ]);

  const handleRejectCall = useCallback(() => {
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
  }, [
    incomingCallDetails,
    stopIncomingCallRingtone,
    setCallState,
    setIncomingCall,
    setIncomingCallDetails,
    setActiveCallRecipient,
    setCallRoomId,
    sendWebSocketMessage,
    showCallNotification,
    user,
  ]);

  const handleAudioCallEnd = useCallback(() => {
    console.log("🔥 INDEX - handleAudioCallEnd called");
    setCallState("idle");
    setIncomingCall(null);
    setActiveCallRecipient(null);
    setCallRoomId(null);
    setForceHideModal(true);
    setIncomingCallDetails(null);

    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }
    // Additional cleanup (e.g., stopping streams) can be added here if needed
  }, [
    setCallState,
    setIncomingCall,
    setActiveCallRecipient,
    setCallRoomId,
    setForceHideModal,
    setIncomingCallDetails,
    ringtoneTimeoutRef,
  ]);

  const handleVideoCallEnd = useCallback(() => {
    console.log("🔥 INDEX - handleVideoCallEnd called");
    // Similar cleanup for video calls, if distinct from audio
    setVideoCallState("idle");
    setActiveVideoCallRecipient(null);
    setIncomingVideoCall(null);
    setVideoCallRoomId(null);
    // Additional video-specific cleanup
  }, [
    setVideoCallState,
    setActiveVideoCallRecipient,
    setIncomingVideoCall,
    setVideoCallRoomId,
  ]);

  const handleHangUp = useCallback(() => {
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

    handleAudioCallEnd(); // Perform local cleanup and state reset for audio calls
    // If current call is a video call, call handleVideoCallEnd()
    if (callType === "video") {
      handleVideoCallEnd();
    }
    showCallNotification("info", "Call ended.");
  }, [
    callState,
    stopIncomingCallRingtone,
    stopRingbackTone,
    activeCallRecipient,
    user,
    callRoomId,
    callType,
    sendWebSocketMessage,
    handleAudioCallEnd,
    handleVideoCallEnd,
    showCallNotification,
  ]);

  // Unified function to end call and reset states
  const endCall = useCallback(() => {
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
  }, [
    handleAudioCallEnd,
    handleVideoCallEnd,
    setCallState,
    setIncomingCall,
    setActiveCallRecipient,
    setCallRoomId,
    setForceHideModal,
    setIncomingCallDetails,
    ringtoneTimeoutRef,
  ]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedRecipient || !user) {
      console.warn(
        "Cannot send empty message or no recipient/sender selected."
      );
      return;
    }

    const messageToSend = {
      type: "message",
      content: newMessage,
      sender_id: user.id,
      sender: user.username, // Add sender username
      recipient_id: selectedRecipient.id,
      recipient: selectedRecipient.username, // Add recipient username
      timestamp: Date.now(),
      status: "sending", // Initial status
    };

    console.log("Sending message:", messageToSend);
    sendWebSocketMessage(messageToSend);

    // Optimistically add message to UI
    setMessages((prevMessages) => [...prevMessages, messageToSend]);
    setNewMessage(""); // Clear input field
  }, [
    newMessage,
    selectedRecipient,
    user,
    sendWebSocketMessage,
    setMessages,
    setNewMessage,
  ]);

  // --- Effect Hooks (All useEffect hooks here) ---
  useEffect(() => {
    setMounted(true);
  }, []); // Effect for mounting state

  useEffect(() => {
    if (user && isLoggedIn) {
      // Initialize WebSocket connection when user logs in
      const baseWsUrl = process.env.NEXT_PUBLIC_REALTIME_API_URL;
      const socketUrl = `${baseWsUrl}?user_id=${user.id}&username=${user.username}`;
      initializeWebSocket(socketUrl);

      // Set up message handler for incoming WebSocket messages
      setOnMessage((data) => {
        const message = JSON.parse(data);
        console.log("WebSocket message received in index.js:", message);

        switch (message.type) {
          case "message":
            setMessages((prevMessages) => {
              // Check for duplicates before adding
              if (!prevMessages.some((msg) => msg.id === message.id)) {
                return [...prevMessages, message];
              }
              return prevMessages;
            });
            break;
          case "user_online":
            setOnlineUserIds((prev) => new Set(prev).add(message.user_id));
            showCallNotification(
              "info",
              `${
                userMap.get(message.user_id)?.username || "A user"
              } came online.`
            );
            break;
          case "user_offline":
            setOnlineUserIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(message.user_id);
              return newSet;
            });
            showCallNotification(
              "warning",
              `${
                userMap.get(message.user_id)?.username || "A user"
              } went offline.`
            );
            break;
          case "call_initiated":
            // Handle incoming call notification
            setIncomingCallDetails(message.call);
            setIncomingCall({
              caller_username:
                userMap.get(message.call.from_user_id)?.username || "Unknown",
              call_type: message.call.call_type,
            });
            playIncomingCallRingtone();
            showCallNotification(
              "info",
              `Incoming ${message.call.call_type} call from ${
                userMap.get(message.call.from_user_id)?.username || "Unknown"
              }!`
            );
            break;
          case "call_accepted":
            // Stop ringback tone and update call state for the caller
            stopRingbackTone();
            setCallState("active");
            showCallNotification(
              "success",
              `${
                userMap.get(message.call.to_user_id)?.username ||
                "The recipient"
              } accepted your call.`
            );
            break;
          case "call_rejected":
            // Stop ringback tone and reset call state for the caller
            stopRingbackTone();
            setCallState("idle");
            showCallNotification(
              "error",
              `${
                userMap.get(message.call.to_user_id)?.username ||
                "The recipient"
              } rejected your call.`
            );
            setIncomingCall(null);
            setActiveCallRecipient(null);
            setCallRoomId(null);
            setIncomingCallDetails(null);
            break;
          case "call_ended":
            // Handle call ending by the other party
            showCallEndedModal(
              "info",
              "Call Ended",
              `${
                userMap.get(message.call.from_user_id)?.username ||
                "The other party"
              } has ended the call.`
            );
            // Trigger aggressive cleanup only if there was an active call
            if (callState !== "idle") {
              handleAudioCallEnd(); // This will reset all call-related states and cleanup
            }
            break;
          case "message_status_update":
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === message.message_id
                  ? { ...msg, status: message.status }
                  : msg
              )
            );
            break;
          case "user_info_update":
            // This case handles user profile updates, including username changes
            setAllUsers((prevUsers) =>
              prevUsers.map((u) =>
                u.id === message.user.id ? message.user : u
              )
            );
            setUserMap((prevMap) => {
              const newMap = new Map(prevMap);
              newMap.set(message.user.id, message.user);
              return newMap;
            });
            // If the current user's info is updated, update the user state
            if (user && user.id === message.user.id) {
              setUser(message.user);
              if (typeof window !== "undefined") {
                localStorage.setItem("user", JSON.stringify(message.user));
              }
            }
            break;
          default:
            console.warn("Unknown message type:", message.type, message);
        }
      });
    } else if (!isLoggedIn) {
      closeWebSocket();
    }
    return () => {
      // Cleanup WebSocket on component unmount or user logout
      closeWebSocket();
    };
  }, [
    user,
    isLoggedIn,
    initializeWebSocket,
    setOnMessage,
    setMessages,
    setOnlineUserIds,
    showCallNotification,
    userMap,
    setIncomingCallDetails,
    setIncomingCall,
    playIncomingCallRingtone,
    stopRingbackTone,
    setCallState,
    showCallEndedModal,
    handleAudioCallEnd,
    setActiveCallRecipient,
    setCallRoomId,
  ]);

  // --- Conditional Render (AFTER ALL HOOKS) ---
  if (!mounted) {
    return <div>Loading...</div>; // Return a simple loading state during SSR
  }

  // --- UI Components / Other Helper Functions (not hooks, can be defined after conditional return) ---
  const handleLoginOrRegister = async (e, endpoint, loginFormData) => {
    e.preventDefault();
    setAuthError(null); // Clear previous errors
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_AUTH_API_URL}${endpoint}`,
        loginFormData
      );
      const { token, user: userData } = response.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
      }
      setUser(userData);
      setIsLoggedIn(true);
      showCallNotification("success", "Logged in successfully!");
      fetchAllUsers("/api/users");
    } catch (error) {
      console.error("Authentication error:", error.response?.data || error);
      setAuthError(
        error.response?.data?.message ||
          "Authentication failed. Please try again."
      ); // Set authentication error
      showCallNotification("error", "Authentication failed.");
    }
  };

  const renderAuth = () => {
    return (
      <AuthForm
        onLoginOrRegister={handleLoginOrRegister}
        authError={authError}
      />
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
      : "bg-gray-200 text-gray-800 rounded-bl-none mr-auto";
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
          className={`max-w-xs lg:max_w-md xl:max-w-lg p-3 rounded-lg shadow-md relative ${bubbleClass}`}
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

  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}
