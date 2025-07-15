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
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
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
      window.playRingtone();
    }
  }, []);

  const stopRingbackTone = useCallback(() => {
    if (window.stopRingback) {
      window.stopRingtone();
      console.log("Stopping ringback tone.");
    }
  }, []);

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

  const handleAcceptCall = useCallback(async () => {
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
    // console.log("🔥 INDEX - SYNCHRONOUS MICROPHONE CLEANUP");

    // 1. IMMEDIATE AudioCallHandler cleanup FIRST (most critical)
    // if (audioCallRef.current) {
    //   console.log("🔥 INDEX - IMMEDIATE AudioCallHandler cleanup");
    //   try {
    //     if (audioCallRef.current.forceCleanup) {
    //       audioCallRef.current.forceCleanup();
    //     }
    //     if (audioCallRef.current.hangup) {
    //       audioCallRef.current.hangup();
    //     }
    //   } catch (error) {
    //     console.error("🔥 INDEX - AudioCallHandler cleanup error:", error);
    //   }
    // }

    // 2. IMMEDIATE global stream cleanup
    // console.log("🔥 INDEX - IMMEDIATE global stream cleanup");

    // Stop window.localAudioStream immediately
    // if (window.localAudioStream) {
    //   console.log("🔥 INDEX - Stopping window.localAudioStream");
    //   try {
    //     window.localAudioStream.getTracks().forEach((track) => {
    //       console.log("🔥 INDEX - Stopping track:", track.kind, track.label);
    //       track.stop();
    //     });
    //     window.localAudioStream = null;
    //     console.log("🔥 INDEX - window.localAudioStream nullified");
    //   } catch (error) {
    //     console.error("🔥 INDEX - Error stopping main stream:", error);
    //   }
    // }

    // Stop window.currentCallStream immediately
    // if (window.currentCallStream) {
    //   console.log("🔥 INDEX - Stopping window.currentCallStream");
    //   try {
    //     window.currentCallStream.getTracks().forEach((track) => {
    //       console.log(
    //         "🔥 INDEX - Stopping call stream track:",
    //         track.kind,
    //         track.label
    //       );
    //       track.stop();
    //     });
    //     window.currentCallStream = null;
    //     console.log("🔥 INDEX - window.currentCallStream nullified");
    //   } catch (error) {
    //     console.error("🔥 INDEX - Error stopping call stream:", error);
    //   }
    // }

    // 3. IMMEDIATE audio elements cleanup
    // console.log("🔥 INDEX - IMMEDIATE audio elements cleanup");
    // const audioElements = document.querySelectorAll("audio");
    // audioElements.forEach((audio, index) => {
    //   try {
    //     audio.pause();
    //     audio.currentTime = 0;
    //     if (audio.srcObject) {
    //       const stream = audio.srcObject;
    //       if (stream && stream.getTracks) {
    //         stream.getTracks().forEach((track) => {
    //           console.log(
    //             `🔥 INDEX - Stopping track from audio element ${index}:`,
    //             track.kind,
    //             track.label
    //           );
    //           track.stop();
    //         });
    //       }
    //       audio.srcObject = null;
    //     }
    //     audio.src = "";

    //     // Remove temporary elements immediately
    //     if (
    //       audio.id &&
    //       (audio.id.includes("temp-") ||
    //         audio.id.includes("dedicated-") ||
    //         audio.id.includes("emergency-"))
    //     ) {
    //       audio.remove();
    //       console.log(`🔥 INDEX - Removed temporary element: ${audio.id}`);
    //     }
    //   } catch (error) {
    //     console.error(
    //       `🔥 INDEX - Error cleaning audio element ${index}:`,
    //       error
    //     );
    //   }
    // });

    // 4. IMMEDIATE audio context cleanup
    // if (window.audioContext) {
    //   console.log("🔥 INDEX - IMMEDIATE audio context cleanup");
    //   try {
    //     if (window.audioContext.state === "running") {
    //       window.audioContext.suspend();
    //       console.log("🔥 INDEX - Audio context suspended");
    //     }
    //   } catch (error) {
    //     console.error("🔥 INDEX - Audio context error:", error);
    //   }
    // }

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
    // if (window.janusGlobal) {
    //   console.log("🔥 INDEX - Destroying janusGlobal");
    //   try {
    //     window.janusGlobal.destroy();
    //   } catch (error) {
    //     console.error("🔥 INDEX - Error destroying janusGlobal:", error);
    //   }
    //   window.janusGlobal = null;
    // }
    // if (window.echotestPlugin) {
    //   console.log("🔥 INDEX - Detaching echotestPlugin");
    //   try {
    //     window.echotestPlugin.detach();
    //   } catch (error) {
    //     console.error("🔥 INDEX - Error detaching echotestPlugin:", error);
    //   }
    //   window.echotestPlugin = null;
    // }

    // Ensure Janus and WebRTC resources are fully released
    // Any other global cleanup actions
    isEndingCallRef.current = false;
    console.log("🔥 INDEX - IMMEDIATE AGGRESSIVE CLEANUP ENDED");
  }, [
    callState,
    setCallState,
    setIncomingCall,
    setActiveCallRecipient,
    setCallRoomId,
    setForceHideModal,
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

    endCall(); // Perform local cleanup and state reset
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
    endCall,
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
  ]);

  // --- Effect Hooks (All useEffect hooks here) ---
  useEffect(() => {
    setMounted(true);
  }, []); // Effect for mounting state

  // --- Conditional Render (AFTER ALL HOOKS) ---
  if (!mounted) {
    return <div>Loading...</div>; // Return a simple loading state during SSR
  }

  // --- UI Components / Other Helper Functions (not hooks, can be defined after conditional return) ---
  const handleLoginOrRegister = async (e, endpoint) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_AUTH_API_URL}${endpoint}`,
        loginForm
      );
      const { token, user: userData } = response.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
      }
      setUser(userData);
      setIsLoggedIn(true);
      showCallNotification("success", "Logged in successfully!"); // Re-enable later
      fetchAllUsers("/api/users"); // Re-enable later
    } catch (error) {
      console.error("Authentication error:", error.response?.data || error);
      showCallNotification("error", "Authentication failed."); // Re-enable later
    }
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
