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

// --- Configuration ---
const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL_NEW;
const MESSAGE_API_BASE_URL = process.env.NEXT_PUBLIC_MESSAGE_API_URL;
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_REALTIME_API_URL;

export default function Home() {
  console.log(
    "🔥 FRONTEND CACHE BUSTER v2.4.0 - DIRECT HANGUP CLEANUP FIX LOADED 🔥"
  );
  // --- State ---
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

    // Stop all sounds
    stopIncomingCallRingtone();
    stopRingbackTone();

    // 6. IMMEDIATE microphone availability verification
    console.log("🔥 INDEX - IMMEDIATE microphone verification");

    // Test microphone availability immediately
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((testStream) => {
          console.log(
            "🔥 INDEX - SUCCESS: Microphone is available for new calls"
          );
          // Stop the test stream immediately
          testStream.getTracks().forEach((track) => {
            track.stop();
          });
          console.log("🔥 INDEX - Test stream stopped");
        })
        .catch((error) => {
          console.log(
            "🔥 INDEX - WARNING: Microphone may not be available:",
            error.name,
            error.message
          );
        });
    }

    // 7. Force garbage collection if available
    try {
      if (window.gc) {
        window.gc();
        console.log("🔥 INDEX - Forced garbage collection");
      }
    } catch (error) {
      console.log("🔥 INDEX - GC not available");
    }

    // Reset the ending flag immediately
    isEndingCallRef.current = false;
    console.log("🔥 INDEX - IMMEDIATE CLEANUP COMPLETED - MICROPHONE RELEASED");
  };

  // Initialize Janus when window loads
  useEffect(() => {
    const initializeJanus = () => {
      if (typeof window !== "undefined" && window.Janus && !janusInitialized) {
        console.log("🔥 JANUS - Initializing Janus library...");
        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log("🔥 JANUS - Janus initialized successfully!");
            setJanusInitialized(true);
          },
          error: (error) => {
            console.error("🔥 JANUS - Failed to initialize:", error);
            showCallNotification(
              "error",
              "Call service initialization failed",
              5000
            );
          },
        });
      } else if (!window.Janus) {
        console.log("🔥 JANUS - Waiting for Janus library to load...");
        setTimeout(initializeJanus, 500);
      }
    };

    initializeJanus();

    // Add global test function for microphone cleanup verification
    if (typeof window !== "undefined") {
      window.testMicrophoneCleanup = () => {
        console.log("🎤 MICROPHONE CLEANUP TEST");
        console.log("=========================");

        let issues = 0;

        // Check global audio streams
        if (window.localAudioStream) {
          console.log("❌ window.localAudioStream still exists!");
          window.localAudioStream.getTracks().forEach((track) => {
            console.log(
              `  - Track: ${track.kind} (${track.label}) - State: ${track.readyState}`
            );
            if (track.readyState === "live") {
              issues++;
              console.log("    ⚠️  This track is still LIVE!");
            }
          });
        } else {
          console.log("✅ window.localAudioStream properly cleaned up");
        }

        if (window.currentCallStream) {
          console.log("❌ window.currentCallStream still exists!");
          window.currentCallStream.getTracks().forEach((track) => {
            console.log(
              `  - Track: ${track.kind} (${track.label}) - State: ${track.readyState}`
            );
            if (track.readyState === "live") {
              issues++;
              console.log("    ⚠️  This track is still LIVE!");
            }
          });
        } else {
          console.log("✅ window.currentCallStream properly cleaned up");
        }

        // Check all audio elements
        const audioElements = document.querySelectorAll("audio");
        console.log(`\n🔍 Checking ${audioElements.length} audio elements...`);

        audioElements.forEach((audio, index) => {
          console.log(`  Audio Element ${index}:`);
          console.log(`    - ID: ${audio.id || "no-id"}`);
          console.log(`    - SrcObject: ${audio.srcObject ? "YES" : "NO"}`);
          console.log(`    - Paused: ${audio.paused}`);
          console.log(`    - CurrentTime: ${audio.currentTime}`);

          if (audio.srcObject && audio.srcObject.getTracks) {
            audio.srcObject.getTracks().forEach((track) => {
              console.log(
                `      - Track: ${track.kind} (${track.label}) - State: ${track.readyState}`
              );
              if (track.readyState === "live") {
                issues++;
                console.log("        ⚠️  This track is still LIVE!");
              }
            });
          }
        });

        // Check Web Audio API context
        if (window.audioContext) {
          console.log(`\n🔍 Audio Context State: ${window.audioContext.state}`);
          if (window.audioContext.state === "running") {
            console.log(
              "    ⚠️  Audio context is still running (may be normal)"
            );
          } else {
            console.log("    ✅ Audio context is properly suspended/closed");
          }
        } else {
          console.log("\n✅ No audio context found");
        }

        // Test microphone availability
        console.log("\n🔍 Testing microphone availability...");
        navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then((testStream) => {
            console.log("✅ Microphone is available for new calls");
            // Immediately stop the test stream
            testStream.getTracks().forEach((track) => {
              track.stop();
            });
            console.log("   Test stream stopped successfully");
          })
          .catch((error) => {
            issues++;
            console.log(
              "❌ Microphone is NOT available:",
              error.name,
              error.message
            );
          });

        console.log("\n📊 CLEANUP TEST RESULTS");
        console.log("========================");
        console.log(`Total Issues Found: ${issues}`);

        if (issues === 0) {
          console.log("\n🎉 SUCCESS: All audio resources properly cleaned up!");
          console.log("   The microphone should be available for new calls.");
        } else {
          console.log(
            "\n❌ ISSUES FOUND: Some audio resources are still active!"
          );
          console.log(
            "   The microphone may still be in use, preventing new calls."
          );
          console.log("   Try refreshing the page to fully release resources.");
        }

        return issues === 0;
      };

      // Add function to force cleanup everything
      window.forceMicrophoneCleanup = () => {
        console.log("🔧 FORCE MICROPHONE CLEANUP");
        console.log("===========================");

        // Stop all possible streams
        if (window.localAudioStream) {
          window.localAudioStream.getTracks().forEach((track) => {
            console.log(
              "🔧 Force stopping localAudioStream track:",
              track.kind,
              track.label
            );
            track.stop();
          });
          window.localAudioStream = null;
        }

        if (window.currentCallStream) {
          window.currentCallStream.getTracks().forEach((track) => {
            console.log(
              "🔧 Force stopping currentCallStream track:",
              track.kind,
              track.label
            );
            track.stop();
          });
          window.currentCallStream = null;
        }

        // Clean all audio elements
        const audioElements = document.querySelectorAll("audio");
        audioElements.forEach((audio, index) => {
          audio.pause();
          audio.currentTime = 0;
          if (audio.srcObject) {
            const stream = audio.srcObject;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach((track) => {
                console.log(
                  `🔧 Force stopping track from audio element ${index}:`,
                  track.kind,
                  track.label
                );
                track.stop();
              });
            }
            audio.srcObject = null;
          }
          audio.src = "";
        });

        console.log("🔧 Force cleanup completed");
      };

      console.log(
        "💡 TIP: Run 'testMicrophoneCleanup()' in console to check microphone cleanup status"
      );
      console.log(
        "💡 TIP: Run 'forceMicrophoneCleanup()' in console to force cleanup all audio resources"
      );
    }
  }, [janusInitialized]);

  // Monitor audio call status from AudioCallHandler
  useEffect(() => {
    if (callState === "active") {
      const interval = setInterval(() => {
        const audioStatusElement = document.getElementById("audio-call-status");
        if (audioStatusElement) {
          const status = audioStatusElement.getAttribute("data-call-status");
          const muted =
            audioStatusElement.getAttribute("data-is-muted") === "true";
          const volume =
            parseFloat(audioStatusElement.getAttribute("data-volume")) || 1.0;

          if (status) setAudioCallStatus(status);
          setAudioCallMuted(muted);
          setAudioCallVolume(volume);
        }

        // Also try to get status from the audio call ref
        if (audioCallRef.current) {
          try {
            const callStatus = audioCallRef.current.getCallStatus();
            if (callStatus) {
              if (callStatus.callStatus)
                setAudioCallStatus(callStatus.callStatus);
              if (typeof callStatus.isMuted === "boolean")
                setAudioCallMuted(callStatus.isMuted);
              if (typeof callStatus.volume === "number")
                setAudioCallVolume(callStatus.volume);
            }
          } catch (error) {
            console.log("Could not get call status:", error);
          }
        }
      }, 500); // Check every 500ms

      return () => clearInterval(interval);
    }
  }, [callState]);

  // Show notification helper
  const showCallNotification = (type, message, duration = 3000) => {
    console.log(
      "🔥 NOTIFICATION - Calling showCallNotification with type:",
      type,
      "message:",
      message
    );
    setCallNotification({ type, message });
    setTimeout(() => setCallNotification(null), duration);
  };

  // Show call ended modal
  const showCallEndedModal = (type, title, message, duration = 4000) => {
    console.log("🔥 CALL ENDED MODAL - Showing:", { type, title, message });
    setCallEndedModal({ type, title, message });
    setTimeout(() => setCallEndedModal(null), duration);
  };

  // Request microphone permissions upfront
  const requestMicrophonePermission = async () => {
    console.log("🔥 MIC PERMISSION - Requesting microphone access...");

    try {
      // First check if permission is already granted
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({
          name: "microphone",
        });
        console.log(
          "🔥 MIC PERMISSION - Current permission state:",
          permission.state
        );

        if (permission.state === "granted") {
          console.log("🔥 MIC PERMISSION - Already granted!");
          return true;
        }
      }

      // Clean up any existing stream first
      if (window.localAudioStream) {
        console.log("🔥 MIC PERMISSION - Cleaning up existing stream first");
        window.localAudioStream.getTracks().forEach((track) => {
          track.stop();
        });
        window.localAudioStream = null;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
        video: false,
      });

      console.log("🔥 MIC PERMISSION - GRANTED! Stream:", stream);
      console.log(
        "🔥 MIC PERMISSION - Stream tracks:",
        stream.getTracks().map((t) => ({
          kind: t.kind,
          label: t.label,
          state: t.readyState,
        }))
      );

      // Store the stream globally for later use AND track it
      window.localAudioStream = stream;
      window.currentCallStream = stream; // Additional tracking

      // Show success notification
      showCallNotification("success", "Microphone access granted", 2000);

      return true;
    } catch (error) {
      console.error("🔥 MIC PERMISSION - DENIED:", error);

      let errorMessage =
        "Microphone access denied. Please allow microphone access in your browser settings.";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Microphone permission denied. Please click 'Allow' when prompted, or enable microphone access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No microphone found. Please connect a microphone and try again.";
      } else if (error.name === "NotReadableError") {
        errorMessage =
          "Microphone is being used by another application. Please close other applications using the microphone.";
      } else {
        errorMessage = `Microphone access failed: ${error.message}`;
      }

      showCallNotification("error", errorMessage, 5000);
      return false;
    }
  };

  // --- Refs ---
  const ws = useRef(null);
  const audioCallRef = useRef(null);
  const videoCallRef = useRef(null);
  const chatEndRef = useRef(null);
  const isEndingCallRef = useRef(false); // New ref to prevent recursive endCall
  const ringtoneTimeoutRef = useRef(null); // New ref for ringtone timeout

  // --- Effects ---

  // Main WebSocket connection management
  useEffect(() => {
    if (!user?.id) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    if (!ws.current) {
      const wsUrl = `${WEBSOCKET_URL}?user_id=${user.id}&username=${user.username}`;
      console.log(`Connecting WebSocket to ${wsUrl}`);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => console.log("WebSocket connected.");
      ws.current.onclose = () => {
        console.log("WebSocket disconnected.");
        ws.current = null;
      };
      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.current = null;
      };
    }

    // Enhanced WebSocket message handling
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("[WEBSOCKET] Received:", msg);

      switch (msg.type) {
        case "presence_update":
          setOnlineUsers(msg.online_users || []);
          break;
        case "new_message":
          // Check if this message has a local_id and is from the current user (echo from server).
          if (
            msg.local_id &&
            msg.from_user_id?.toString() === user?.id.toString()
          ) {
            // Replace the optimistic message with the one from the server.
            setMessages((prevMessages) =>
              prevMessages.map((m) => (m.id === msg.local_id ? msg : m))
            );
          } else if (
            msg.from_user_id?.toString() ===
              selectedRecipient?.id?.toString() &&
            msg.to_user_id?.toString() === user?.id.toString()
          ) {
            // If the message is from the selected recipient to the current user, add it to the chat.
            setMessages((prevMessages) => [...prevMessages, msg]);
          } else if (msg.to_user_id?.toString() === user?.id.toString()) {
            // If the message is for the current user but not from the selected recipient, highlight the sender.
            setHighlightedUser(msg.from_user_id);
          }
          break;
        case "call_initiate":
          console.log("🔥 WEBSOCKET - Received call_initiate:", msg);
          if (
            msg.call &&
            msg.call.to_user_id?.toString() === user.id.toString()
          ) {
            console.log("🔥 WEBSOCKET - Incoming call for current user.");
            setIncomingCall(msg.call);
            setCallState("ringing");
            playIncomingCallRingtone();

            // Clear any existing timeout
            if (ringtoneTimeoutRef.current) {
              clearTimeout(ringtoneTimeoutRef.current);
            }

            // Backup mechanism: Stop ringtone after 30 seconds if no action taken
            ringtoneTimeoutRef.current = setTimeout(() => {
              console.log(
                "🔥 BACKUP - Auto-stopping ringtone after 30s timeout"
              );
              stopIncomingCallRingtone();
              showCallEndedModal("ended", "Call Missed", "Call timed out");
              handleAudioCallEnd();
            }, 30000);

            showCallNotification(
              "info",
              `Incoming call from ${msg.call.caller_username}`,
              5000
            ); // Show notification for incoming call
          } else {
            console.log(
              "🔥 WEBSOCKET - Incoming call not for current user or missing call data.",
              msg
            );
          }
          break;
        case "call_accepted":
          stopRingbackTone(); // Stop ringback for the caller
          setCallState("active");
          setCallRoomId(msg.room_id);
          showCallNotification(
            "success",
            `${activeCallRecipient?.username || "User"} accepted your call!`,
            2000
          );

          // Start the AudioCallHandler for the caller when call is accepted
          setTimeout(() => {
            if (audioCallRef.current && audioCallRef.current.startCall) {
              console.log(
                "🔥 CALL ACCEPTED - Starting AudioCallHandler for caller with room:",
                msg.room_id
              );
              audioCallRef.current.startCall(msg.room_id);
            }
          }, 100);
          break;
        case "call_rejected":
          const rejecterName = activeCallRecipient?.username || "User";
          showCallEndedModal(
            "declined",
            "Call Declined",
            `${rejecterName} declined your call`
          );
          handleAudioCallEnd(); // Reset local state when call is rejected
          break;
        case "call_ended":
          console.log(
            "🔥 WEBSOCKET - Received call_ended, current state:",
            callState,
            "incomingCall:",
            incomingCall
          );

          // IMMEDIATE MICROPHONE CLEANUP for all call_ended scenarios
          console.log("🔥 WEBSOCKET - IMMEDIATE MICROPHONE CLEANUP");

          // Stop all microphone streams immediately
          if (window.localAudioStream) {
            console.log("🔥 WEBSOCKET - Stopping window.localAudioStream");
            window.localAudioStream.getTracks().forEach((track) => {
              console.log(
                "🔥 WEBSOCKET - Stopping track:",
                track.kind,
                track.label
              );
              track.stop();
            });
            window.localAudioStream = null;
          }

          if (window.currentCallStream) {
            console.log("🔥 WEBSOCKET - Stopping window.currentCallStream");
            window.currentCallStream.getTracks().forEach((track) => {
              console.log(
                "🔥 WEBSOCKET - Stopping call stream track:",
                track.kind,
                track.label
              );
              track.stop();
            });
            window.currentCallStream = null;
          }

          // Force cleanup AudioCallHandler immediately
          if (audioCallRef.current) {
            console.log("🔥 WEBSOCKET - Forcing AudioCallHandler cleanup");
            try {
              if (audioCallRef.current.forceCleanup) {
                audioCallRef.current.forceCleanup();
              }
              if (audioCallRef.current.hangup) {
                audioCallRef.current.hangup();
              }
            } catch (error) {
              console.log(
                "🔥 WEBSOCKET - AudioCallHandler cleanup error:",
                error
              );
            }
          }

          // Clean up all audio elements
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
                      `🔥 WEBSOCKET - Stopping track from audio element ${index}:`,
                      track.kind,
                      track.label
                    );
                    track.stop();
                  });
                }
                audio.srcObject = null;
              }
              audio.src = "";
            } catch (error) {
              console.error(
                `🔥 WEBSOCKET - Error cleaning audio element ${index}:`,
                error
              );
            }
          });

          // Handle call ended for receiver who is still ringing
          if (callState === "ringing") {
            console.log(
              "🔥 WEBSOCKET - Call ended while ringing, stopping ringtone"
            );
            stopIncomingCallRingtone();
            showCallEndedModal(
              "ended",
              "Call Ended",
              "The caller ended the call"
            );
            handleAudioCallEnd();
          }
          // Handle call ended for active calls
          else if (callState === "active") {
            console.log("🔥 WEBSOCKET - Active call ended remotely");
            const callerName = activeCallRecipient?.username || "User";

            showCallEndedModal(
              "ended",
              "Call Ended",
              `Call with ${callerName} has ended`
            );
            handleAudioCallEnd(); // Reset local state when call ends remotely
          }
          // Handle call ended for calling state (caller cancels)
          else if (callState === "calling") {
            console.log(
              "🔥 WEBSOCKET - Call cancelled by caller during calling state"
            );
            stopRingbackTone();
            showCallEndedModal(
              "ended",
              "Call Cancelled",
              "The call was cancelled"
            );
            handleAudioCallEnd();
          }
          // Handle any other non-idle states
          else if (callState !== "idle") {
            console.log("🔥 WEBSOCKET - Call ended in state:", callState);
            const callerName = activeCallRecipient?.username || "User";

            showCallEndedModal(
              "ended",
              "Call Ended",
              `Call with ${callerName} has ended`
            );
            handleAudioCallEnd(); // Reset local state when call ends remotely
          }

          // Verify microphone is available after cleanup
          setTimeout(() => {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              navigator.mediaDevices
                .enumerateDevices()
                .then((devices) => {
                  const audioInputs = devices.filter(
                    (device) => device.kind === "audioinput"
                  );
                  console.log(
                    `🔥 WEBSOCKET VERIFICATION - ${audioInputs.length} audio input devices available for new calls`
                  );
                })
                .catch((error) => {
                  console.error(
                    "🔥 WEBSOCKET VERIFICATION - Error checking devices:",
                    error
                  );
                });
            }
          }, 200);
          break;
        case "video_call_initiate":
          console.log("🔥 WEBSOCKET - Received video_call_initiate:", msg);
          if (
            msg.call &&
            msg.call.to_user_id?.toString() === user.id.toString()
          ) {
            console.log("🔥 WEBSOCKET - Incoming video call for current user.");
            setIncomingVideoCall(msg.call);
            setVideoCallState("ringing");
            setCallType("video");
            playIncomingCallRingtone();

            // Clear any existing timeout
            if (ringtoneTimeoutRef.current) {
              clearTimeout(ringtoneTimeoutRef.current);
            }

            // Backup mechanism: Stop ringtone after 30 seconds if no action taken
            ringtoneTimeoutRef.current = setTimeout(() => {
              console.log(
                "🔥 BACKUP - Auto-stopping video call ringtone after 30s timeout"
              );
              stopIncomingCallRingtone();
              showCallEndedModal(
                "ended",
                "Video Call Missed",
                "Video call timed out"
              );
              handleVideoCallEnd();
            }, 30000);

            showCallNotification(
              "info",
              `Incoming video call from ${msg.call.caller_username}`,
              5000
            );
          } else {
            console.log(
              "🔥 WEBSOCKET - Incoming video call not for current user or missing call data.",
              msg
            );
          }
          break;

        case "video_call_accepted":
          console.log("🔥 WEBSOCKET - Video call accepted");
          setVideoCallState("active");
          setVideoCallRoomId(msg.room_id);
          setCallType("video");
          showCallNotification(
            "success",
            `${
              activeVideoCallRecipient?.username || "User"
            } accepted your video call!`,
            2000
          );

          // Start the video call interface for the caller when call is accepted
          if (videoCallRef.current) {
            videoCallRef.current.startVideoCall();
          }
          break;

        case "video_call_rejected":
          console.log("🔥 WEBSOCKET - Video call rejected");
          const videoRejecterName =
            activeVideoCallRecipient?.username || "User";
          showCallEndedModal(
            "declined",
            "Video Call Declined",
            `${videoRejecterName} declined your video call`
          );
          handleVideoCallEnd();
          break;

        case "video_call_ended":
          console.log("🔥 WEBSOCKET - Video call ended");

          // Handle video call ended for receiver who is still ringing
          if (videoCallState === "ringing") {
            console.log("🔥 WEBSOCKET - Video call ended while ringing");
            stopIncomingCallRingtone();
            showCallEndedModal(
              "ended",
              "Video Call Ended",
              "The caller ended the video call"
            );
            handleVideoCallEnd();
          }
          // Handle video call ended for active video calls
          else if (videoCallState === "active") {
            console.log("🔥 WEBSOCKET - Active video call ended remotely");
            const videoCallerName =
              activeVideoCallRecipient?.username || "User";
            showCallEndedModal(
              "ended",
              "Video Call Ended",
              `Video call with ${videoCallerName} has ended`
            );
            handleVideoCallEnd();
          }
          // Handle video call ended for calling state (caller cancels)
          else if (videoCallState === "calling") {
            console.log("🔥 WEBSOCKET - Video call cancelled by caller");
            showCallEndedModal(
              "ended",
              "Video Call Cancelled",
              "The video call was cancelled"
            );
            handleVideoCallEnd();
          }
          break;

        default:
          console.warn("Unhandled WebSocket message type:", msg.type);
      }
    };

    // The dependency array ensures this effect re-runs if `user` or `selectedRecipient` changes,
    // which re-assigns the `onmessage` handler with the latest state in its closure.
  }, [user, selectedRecipient, activeCallRecipient, callState, incomingCall]);

  // Scroll to bottom of messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Prime the AudioContext on component mount to bypass autoplay restrictions
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        try {
          const context = new (window.AudioContext ||
            window.webkitAudioContext)();
          audioContextRef.current = context;
          // Resume the context if it's in a suspended state (common in modern browsers)
          if (context.state === "suspended") {
            context.resume();
          }
        } catch (e) {
          console.error("Failed to initialize AudioContext:", e);
        }
      }
    };

    // Add a user interaction listener to initialize the AudioContext
    document.addEventListener("click", initAudioContext, { once: true });
    document.addEventListener("keydown", initAudioContext, { once: true });

    return () => {
      document.removeEventListener("click", initAudioContext);
      document.removeEventListener("keydown", initAudioContext);
    };
  }, []);

  // Debug logging for video call button state
  useEffect(() => {
    const isDisabled =
      videoCallState === "calling" ||
      videoCallState === "ringing" ||
      callState !== "idle";
    console.log("🔥 VIDEO CALL BUTTON STATE:", {
      videoCallState,
      callState,
      selectedRecipient: selectedRecipient?.username,
      disabled: isDisabled,
      disabledReason:
        videoCallState === "calling"
          ? "videoCallState is calling"
          : videoCallState === "ringing"
          ? "videoCallState is ringing"
          : callState !== "idle"
          ? `callState is ${callState} (not idle)`
          : "not disabled",
    });
  }, [videoCallState, callState, selectedRecipient?.username]);

  // --- Sound ---
  const playIncomingCallRingtone = () => {
    console.log("🔥 SOUND - Attempting to play incoming call ringtone.");
    if (window.playRingtone) {
      window.playRingtone();
    } else {
      console.error("Ringtone function not available.");
    }
  };

  const stopIncomingCallRingtone = () => {
    console.log("🔥 SOUND - Attempting to stop incoming call ringtone.");
    if (window.stopRingtone) {
      window.stopRingtone();
    }
  };

  // Ringback Tone Functions
  const playRingbackTone = () => {
    console.log("🔥 SOUND - Attempting to play ringback tone.");
    if (window.playRingback) {
      window.playRingback();
    } else {
      console.error("Ringback function not available.");
    }
  };

  const stopRingbackTone = () => {
    console.log("🔥 SOUND - Attempting to stop ringback tone.");
    if (window.stopRingback) {
      window.stopRingback();
    }
  };

  // --- Call Lifecycle ---
  const initiateCall = async (recipient) => {
    console.log("🔥 INITIATE CALL - Starting call to:", recipient.username);
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log("🔥 INITIATE CALL - WebSocket not connected");
      showCallNotification(
        "error",
        "WebSocket is not connected. Please wait.",
        3000
      );
      return;
    }
    if (callState !== "idle") {
      console.log(
        "🔥 INITIATE CALL - Call already in progress, current state:",
        callState
      );
      showCallNotification(
        "error",
        "Cannot start a new call while another is in progress.",
        3000
      );
      return;
    }

    const roomId = `call_${user.id}_${recipient.id}_${Date.now()}`;
    console.log("🔥 INITIATE CALL - Setting call state to 'calling'");

    // Set state to show the "calling" UI for the initiator
    setActiveCallRecipient(recipient);
    setCallRoomId(roomId);
    setCallState("calling");
    setForceHideModal(false); // Reset modal hiding flag for new call
    console.log(
      "🔥 INITIATE CALL - State set, activeCallRecipient:",
      recipient.username
    );
    playRingbackTone();

    const callPayload = {
      type: "call_initiate",
      call: {
        to_user_id: recipient.id,
        from_user_id: user.id,
        caller_username: user.username,
        room_id: roomId,
        call_type: "audio",
      },
    };

    console.log("🔥 WEBSOCKET - Sending call_initiate payload:", callPayload);
    ws.current.send(JSON.stringify(callPayload));
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    // Request microphone permission first
    const micGranted = await requestMicrophonePermission();
    if (!micGranted) {
      console.log(
        "🔥 ACCEPT CALL - Microphone permission denied, rejecting call"
      );
      handleRejectCall();
      return;
    }

    // Initialize audio context immediately after microphone permission
    console.log(
      "🔥 ACCEPT CALL - Initializing audio context for immediate playback"
    );
    try {
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
      }
      if (window.audioContext.state === "suspended") {
        await window.audioContext.resume();
        console.log("🔥 ACCEPT CALL - Audio context resumed successfully");
      }
    } catch (audioError) {
      console.error(
        "🔥 ACCEPT CALL - Audio context initialization failed:",
        audioError
      );
    }

    // Clear ringtone timeout
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    stopIncomingCallRingtone();

    // Show immediate feedback
    showCallNotification("success", "Connecting to call...", 2000);

    const callPayload = {
      type: "call_accepted",
      to_user_id: incomingCall.from_user_id,
      room_id: incomingCall.room_id,
    };
    ws.current?.send(JSON.stringify(callPayload));
    setCallState("active");
    setCallRoomId(incomingCall.room_id);
    // Find the user object for the caller
    const caller = users.find((u) => u.id === incomingCall.from_user_id);
    setActiveCallRecipient(caller);
    setIncomingCall(null);
    setForceHideModal(false); // Reset modal hiding flag for accepted call

    // Start the AudioCallHandler for the receiver
    setTimeout(() => {
      if (audioCallRef.current && audioCallRef.current.startCall) {
        console.log(
          "🔥 ACCEPT CALL - Starting AudioCallHandler for receiver with room:",
          incomingCall.room_id
        );
        audioCallRef.current.startCall(incomingCall.room_id);
      }
    }, 100);
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;

    // Clear ringtone timeout
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    stopIncomingCallRingtone();
    const callPayload = {
      type: "call_rejected",
      to_user_id: incomingCall.from_user_id,
      room_id: incomingCall.room_id,
    };
    ws.current?.send(JSON.stringify(callPayload));
    showCallNotification("info", "Call rejected", 2000);
    handleAudioCallEnd(); // Reset local state when call is rejected
  };

  const handleHangUp = () => {
    console.log("🔥 HANG UP - Current state:", callState);
    console.log(
      "🔥 HANG UP - ActiveCallRecipient:",
      activeCallRecipient?.username
    );

    // Allow hang up from any state - force cleanup if needed
    if (callState === "idle") {
      console.log("🔥 HANG UP - Already idle, nothing to do");
      return;
    }

    console.log("🔥 HANG UP - IMMEDIATE AGGRESSIVE CLEANUP STARTING");
    isEndingCallRef.current = false; // RESET flag to ensure cleanup can proceed

    // Determine who to notify about the hangup
    const targetUserId =
      callState === "active"
        ? activeCallRecipient?.id // If call is active, notify the other party
        : callState === "ringing"
        ? incomingCall?.from_user_id // If we are being called, notify the caller
        : callState === "calling"
        ? activeCallRecipient?.id // If we are calling, notify the person we are calling
        : null;

    // Show feedback based on call state
    if (callState === "calling") {
      showCallNotification("info", "Call cancelled", 2000);
    } else if (callState === "active") {
      showCallNotification("info", "Call ended", 2000);
    }

    // IMMEDIATE MICROPHONE CLEANUP - Do this BEFORE sending WebSocket message
    console.log("🔥 HANG UP - IMMEDIATE SYNCHRONOUS MICROPHONE CLEANUP");

    // 1. IMMEDIATE AudioCallHandler cleanup FIRST (most critical)
    if (audioCallRef.current) {
      console.log("🔥 HANG UP - IMMEDIATE AudioCallHandler cleanup");
      try {
        if (audioCallRef.current.forceCleanup) {
          audioCallRef.current.forceCleanup();
        }
        if (audioCallRef.current.hangup) {
          audioCallRef.current.hangup();
        }
      } catch (error) {
        console.log("🔥 HANG UP - AudioCallHandler cleanup failed:", error);
      }
    }

    // 2. IMMEDIATE global stream cleanup
    console.log("🔥 HANG UP - IMMEDIATE global stream cleanup");

    if (window.localAudioStream) {
      console.log("🔥 HANG UP - Stopping window.localAudioStream");
      window.localAudioStream.getTracks().forEach((track) => {
        console.log("🔥 HANG UP - Stopping track:", track.kind, track.label);
        track.stop();
      });
      window.localAudioStream = null;
    }

    if (window.currentCallStream) {
      console.log("🔥 HANG UP - Stopping window.currentCallStream");
      window.currentCallStream.getTracks().forEach((track) => {
        console.log(
          "🔥 HANG UP - Stopping call stream track:",
          track.kind,
          track.label
        );
        track.stop();
      });
      window.currentCallStream = null;
    }

    // 3. IMMEDIATE audio elements cleanup
    console.log("🔥 HANG UP - IMMEDIATE audio elements cleanup");
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
                `🔥 HANG UP - Stopping track from audio element ${index}:`,
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
          console.log(`🔥 HANG UP - Removed temporary element: ${audio.id}`);
        }
      } catch (error) {
        console.error(
          `🔥 HANG UP - Error cleaning audio element ${index}:`,
          error
        );
      }
    });

    // 4. IMMEDIATE state reset
    console.log("🔥 HANG UP - IMMEDIATE STATE RESET");
    setCallState("idle");
    setActiveCallRecipient(null);
    setIncomingCall(null);
    setCallRoomId(null);
    setForceHideModal(true);

    // Stop all sounds
    stopIncomingCallRingtone();
    stopRingbackTone();

    // 5. Send hangup notification AFTER cleanup to avoid race conditions
    if (targetUserId && ws.current?.readyState === WebSocket.OPEN) {
      console.log("🔥 HANG UP - Sending call_ended to user:", targetUserId);
      const callPayload = { type: "call_ended", to_user_id: targetUserId };
      ws.current.send(JSON.stringify(callPayload));
    }

    // 6. IMMEDIATE microphone availability verification
    console.log("🔥 HANG UP - IMMEDIATE microphone verification");

    // Test microphone availability immediately
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((testStream) => {
          console.log(
            "🔥 HANG UP - SUCCESS: Microphone is available for new calls"
          );
          // Stop the test stream immediately
          testStream.getTracks().forEach((track) => {
            track.stop();
          });
          console.log("🔥 HANG UP - Test stream stopped");
        })
        .catch((error) => {
          console.log(
            "🔥 HANG UP - WARNING: Microphone may not be available:",
            error.name,
            error.message
          );
        });
    }

    console.log(
      "🔥 HANG UP - IMMEDIATE CLEANUP COMPLETED - MICROPHONE RELEASED"
    );
  };

  const endCall = () => {
    console.log("🔥 END CALL - Current state:", callState);

    if (isEndingCallRef.current) {
      console.log("🔥 END CALL - Already in progress, skipping.");
      return;
    }
    isEndingCallRef.current = true; // Set flag to true

    // Prevent multiple executions (old guard, now augmented by isEndingCallRef)
    if (callState === "idle") {
      console.log("🔥 END CALL - Already idle, skipping");
      isEndingCallRef.current = false; // Reset flag even if idle
      return;
    }

    // Stop any sounds that might be playing
    stopIncomingCallRingtone();
    stopRingbackTone();

    // Force cleanup the AudioCallHandler if it exists
    if (audioCallRef.current) {
      console.log("🔥 END CALL - Forcing AudioCallHandler cleanup");
      audioCallRef.current.forceCleanup();
    }

    // Reset all call-related state directly - do NOT call AudioCallHandler.hangup()
    // to avoid infinite recursion. The AudioCallHandler will clean itself up.
    console.log("🔥 END CALL - Resetting state to idle");
    setCallState("idle");
    setIncomingCall(null);
    setActiveCallRecipient(null);
    setCallRoomId(null);

    isEndingCallRef.current = false; // Reset flag after cleanup
  };

  // --- Video Call Functions ---
  const initiateVideoCall = async (recipient) => {
    console.log(
      "🔥 INITIATE VIDEO CALL - Starting video call to:",
      recipient.username
    );

    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log("🔥 INITIATE VIDEO CALL - WebSocket not connected");
      showCallNotification(
        "error",
        "WebSocket is not connected. Please wait.",
        3000
      );
      return;
    }

    if (videoCallState !== "idle" || callState !== "idle") {
      console.log("🔥 INITIATE VIDEO CALL - Call already in progress");
      showCallNotification(
        "error",
        "Cannot start a video call while another is in progress.",
        3000
      );
      return;
    }

    const roomId = `video_call_${user.id}_${recipient.id}_${Date.now()}`;
    console.log(
      "🔥 INITIATE VIDEO CALL - Setting video call state to 'calling'"
    );

    // Set state to show the "calling" UI for the initiator
    setActiveVideoCallRecipient(recipient);
    setVideoCallRoomId(roomId);
    setVideoCallState("calling");
    setCallType("video");

    const callPayload = {
      type: "video_call_initiate",
      call: {
        to_user_id: recipient.id,
        from_user_id: user.id,
        caller_username: user.username,
        room_id: roomId,
        call_type: "video",
      },
    };

    console.log(
      "🔥 WEBSOCKET - Sending video_call_initiate payload:",
      callPayload
    );
    ws.current.send(JSON.stringify(callPayload));

    // Start video call interface
    console.log(
      "🔥 INITIATE VIDEO CALL - Checking videoCallRef.current:",
      videoCallRef.current
    );
    if (videoCallRef.current) {
      console.log("🔥 INITIATE VIDEO CALL - Calling startVideoCall() on ref");
      videoCallRef.current.startVideoCall();
    } else {
      console.log(
        "🔥 INITIATE VIDEO CALL - videoCallRef.current is null, scheduling retry..."
      );
      // VideoCallInterface not mounted yet, retry after render
      setTimeout(() => {
        console.log(
          "🔥 INITIATE VIDEO CALL - Retry: videoCallRef.current:",
          videoCallRef.current
        );
        if (videoCallRef.current) {
          console.log(
            "🔥 INITIATE VIDEO CALL - Retry: Calling startVideoCall() on ref"
          );
          videoCallRef.current.startVideoCall();
        } else {
          console.error(
            "🔥 INITIATE VIDEO CALL - Retry failed: videoCallRef.current still null"
          );
        }
      }, 100);
    }
  };

  const handleAcceptVideoCall = async () => {
    if (!incomingVideoCall) return;

    console.log("🔥 ACCEPT VIDEO CALL - Accepting incoming video call");

    // Stop any ringtones
    stopIncomingCallRingtone();

    // Clear ringtone timeout
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    // Show immediate feedback
    showCallNotification("success", "Connecting to video call...", 2000);

    const callPayload = {
      type: "video_call_accepted",
      to_user_id: incomingVideoCall.from_user_id,
      room_id: incomingVideoCall.room_id,
    };

    ws.current?.send(JSON.stringify(callPayload));
    setVideoCallState("active");
    setVideoCallRoomId(incomingVideoCall.room_id);
    setCallType("video");

    // Find the user object for the caller
    const caller = users.find((u) => u.id === incomingVideoCall.from_user_id);
    setActiveVideoCallRecipient(caller);
    setIncomingVideoCall(null);

    // Accept the call in the video call interface
    if (videoCallRef.current) {
      videoCallRef.current.acceptCall();
    }
  };

  const handleRejectVideoCall = () => {
    if (!incomingVideoCall) return;

    console.log("🔥 REJECT VIDEO CALL - Rejecting incoming video call");

    // Clear ringtone timeout
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }

    stopIncomingCallRingtone();

    const callPayload = {
      type: "video_call_rejected",
      to_user_id: incomingVideoCall.from_user_id,
      room_id: incomingVideoCall.room_id,
    };

    ws.current?.send(JSON.stringify(callPayload));
    showCallNotification("info", "Video call rejected", 2000);

    // Reset video call state
    setVideoCallState("idle");
    setIncomingVideoCall(null);
    setActiveVideoCallRecipient(null);
    setVideoCallRoomId(null);
  };

  const handleVideoCallEnd = () => {
    console.log("🔥 VIDEO CALL END - Ending video call");

    if (videoCallState === "idle") {
      console.log("🔥 VIDEO CALL END - Already idle, skipping");
      return;
    }

    // Determine who to notify about the hangup
    const targetUserId =
      activeVideoCallRecipient?.id || incomingVideoCall?.from_user_id;

    // Send hangup notification
    if (targetUserId && ws.current?.readyState === WebSocket.OPEN) {
      console.log(
        "🔥 VIDEO CALL END - Sending video_call_ended to user:",
        targetUserId
      );
      const callPayload = {
        type: "video_call_ended",
        to_user_id: targetUserId,
      };
      ws.current.send(JSON.stringify(callPayload));
    }

    // Reset video call state
    setVideoCallState("idle");
    setIncomingVideoCall(null);
    setActiveVideoCallRecipient(null);
    setVideoCallRoomId(null);
    setCallType("audio");

    // Show feedback
    showCallNotification("info", "Video call ended", 2000);
  };

  // --- Auth & Data Fetching ---
  const handleLoginOrRegister = async (e, endpoint) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${AUTH_API_BASE_URL}${endpoint}`,
        loginForm
      );
      const { user: userData, token } = response.data;
      if (userData && token) {
        setUser(userData);
        setIsLoggedIn(true);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
        await fetchAllUsers(); // This will now also populate the userMap
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

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${AUTH_API_BASE_URL}/users`, {
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
    if (!newMessage.trim() || !selectedRecipient) return;
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

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
      fetchAllUsers();
    }
  }, []);

  // Auto-dismiss call ended modal when call state changes to idle
  useEffect(() => {
    if (callState === "idle" && callEndedModal) {
      console.log("🔥 AUTO-DISMISS - Call state is idle, dismissing modal");
      setTimeout(() => setCallEndedModal(null), 1000); // Give user 1 second to see the modal
    }
  }, [callState, callEndedModal]);

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
        className={`flex items-start mt-4 ${
          isSender ? "justify-end" : "justify-start"
        }`}
      >
        {!isSender && isFirstInGroup && (
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
            {senderUsername?.charAt(0).toUpperCase()}
          </div>
        )}
        {isSender && (
          <div
            className={`px-4 py-2 rounded-lg max-w-xs lg:max-w-md bg-indigo-600`}
          >
            <p>{msg.content}</p>
            <span className="text-xs text-gray-400 mt-1 block text-right">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {msg.status === "sending" && " ..."}
              {msg.status === "failed" && " !"}
            </span>
          </div>
        )}
        {!isSender && (
          <div
            className={`px-4 py-2 rounded-lg max-w-xs lg:max-w-md bg-gray-700`}
          >
            <p className="font-bold">{isFirstInGroup && senderUsername}</p>
            <p>{msg.content}</p>
            <span className="text-xs text-gray-400 mt-1 block text-right">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderChat = () => (
    <div className="flex h-screen bg-gray-800 text-white antialiased">
      <Head>
        <title>Alvis Chat</title>
      </Head>
      <Script
        src="https://webrtc.github.io/adapter/adapter-latest.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("🔥 ADAPTER - Setting adapterLoaded flag");
          window.adapterLoaded = true;
        }}
      />
      <Script src="/janus.js" strategy="beforeInteractive" />
      <Script src="/sounds/ringtone.js" strategy="lazyOnload" />

      {/* Column 1: Workspace/Server List */}
      <div className="bg-gray-900 w-20 flex-shrink-0 flex flex-col items-center py-4 space-y-4">
        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-2xl">
          <FaRocket />
        </div>
        {/* Add more server icons here */}
      </div>

      {/* Column 2: User/Channel List */}
      <div className="bg-gray-800 w-64 flex-shrink-0 flex flex-col border-r border-gray-700">
        <div className="h-16 flex-shrink-0 px-4 flex items-center justify-between border-b border-gray-700">
          <h2 className="text-xl font-bold">Direct Messages</h2>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white"
          >
            <FaSignOutAlt />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="p-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => handleSearch(e.target.value)}
              />
              <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <ul>
            {(searchResults.length > 0
              ? searchResults
              : users.filter((u) => u.id !== user.id)
            ).map((u) => (
              <li
                key={u.id}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer rounded-md hover:bg-gray-700 ${
                  selectedRecipient?.id === u.id ? "bg-indigo-900" : ""
                }`}
                onClick={() => selectChatUser(u)}
              >
                <div className="flex items-center">
                  <div className="relative mr-3">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gray-600 flex items-center justify-center font-bold">
                      {u.username?.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ${
                        isUserOnline(u.username)
                          ? "bg-green-500"
                          : "bg-gray-500"
                      } ring-2 ring-gray-800`}
                    ></span>
                  </div>
                  <span>{u.username}</span>
                </div>
                {highlightedUser === u.id && (
                  <FaBell className="text-yellow-400 animate-pulse" />
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="h-20 flex-shrink-0 px-4 flex items-center justify-between border-t border-gray-700">
          <div className="flex items-center">
            <div className="relative mr-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center font-bold text-lg">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-gray-800"></span>
            </div>
            <span className="font-semibold">{user?.username}</span>
          </div>
          <button className="text-gray-400 hover:text-white">
            <FaCog />
          </button>
        </div>
      </div>

      {/* Column 3: Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRecipient ? (
          <>
            {/* Header */}
            <header className="flex items-center justify-between h-16 px-4 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center">
                <div className="relative mr-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center font-bold">
                    {selectedRecipient.username?.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${
                      isUserOnline(selectedRecipient.username)
                        ? "bg-green-500"
                        : "bg-gray-500"
                    } ring-2 ring-gray-800`}
                  ></span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedRecipient.username}
                  </h2>
                  {callState === "active" &&
                    activeCallRecipient?.id === selectedRecipient.id && (
                      <p className="text-green-400 text-sm flex items-center">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                        On call
                      </p>
                    )}
                  {callState === "calling" &&
                    activeCallRecipient?.id === selectedRecipient.id && (
                      <p className="text-blue-400 text-sm flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                        Calling...
                      </p>
                    )}
                  {videoCallState === "active" &&
                    activeVideoCallRecipient?.id === selectedRecipient.id && (
                      <p className="text-purple-400 text-sm flex items-center">
                        <span className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></span>
                        On video call
                      </p>
                    )}
                  {videoCallState === "calling" &&
                    activeVideoCallRecipient?.id === selectedRecipient.id && (
                      <p className="text-blue-400 text-sm flex items-center">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                        Video calling...
                      </p>
                    )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  className={`p-2 rounded-full transition-all duration-200 ${
                    callState === "idle"
                      ? "text-gray-400 hover:text-white hover:bg-gray-700"
                      : callState === "calling" &&
                        activeCallRecipient?.id === selectedRecipient.id
                      ? "text-blue-400 bg-blue-900/20"
                      : callState === "active" &&
                        activeCallRecipient?.id === selectedRecipient.id
                      ? "text-green-400 bg-green-900/20"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  onClick={async () => {
                    try {
                      if (callState === "idle") {
                        // Request microphone permission directly from user interaction
                        const micGranted = await requestMicrophonePermission();
                        if (micGranted) {
                          // Initialize audio context immediately after microphone permission
                          console.log(
                            "🔥 CALL BUTTON - Initializing audio context for immediate playback"
                          );
                          try {
                            if (!window.audioContext) {
                              window.audioContext = new (window.AudioContext ||
                                window.webkitAudioContext)();
                            }
                            if (window.audioContext.state === "suspended") {
                              await window.audioContext.resume();
                              console.log(
                                "🔥 CALL BUTTON - Audio context resumed successfully"
                              );
                            }
                          } catch (audioError) {
                            console.error(
                              "🔥 CALL BUTTON - Audio context initialization failed:",
                              audioError
                            );
                          }

                          await initiateCall(selectedRecipient);
                        }
                      } else if (
                        callState === "active" &&
                        activeCallRecipient?.id === selectedRecipient.id
                      ) {
                        handleHangUp();
                      }
                    } catch (error) {
                      console.error("Failed to handle call action:", error);
                      showCallNotification(
                        "error",
                        "Failed to process call action",
                        3000
                      );
                    }
                  }}
                  disabled={callState === "calling" || callState === "ringing"}
                >
                  <FaPhone className="w-4 h-4" />
                </button>
                <button
                  className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                  onClick={() => {
                    console.log("🔥 TEST BUTTON CLICKED!");
                    alert("TEST BUTTON WORKS!");
                  }}
                  title="Test button"
                >
                  TEST
                </button>
                <button
                  className={`p-2 rounded-full transition-all duration-200 ${
                    videoCallState === "calling" ||
                    videoCallState === "ringing" ||
                    callState !== "idle"
                      ? "text-gray-600 cursor-not-allowed bg-gray-800"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  onClick={async () => {
                    console.log("🔥 VIDEO CALL BUTTON - CLICK DETECTED!");
                    alert(
                      "Video call button clicked! Check console for details."
                    );
                    console.log("🔥 VIDEO CALL BUTTON - Current states:", {
                      videoCallState,
                      callState,
                      selectedRecipient: selectedRecipient?.username,
                      wsConnected: ws.current?.readyState === WebSocket.OPEN,
                    });
                    try {
                      await initiateVideoCall(selectedRecipient);
                    } catch (error) {
                      console.error("Failed to start video call:", error);
                      showCallNotification(
                        "error",
                        "Failed to start video call",
                        3000
                      );
                    }
                  }}
                  disabled={
                    videoCallState === "calling" ||
                    videoCallState === "ringing" ||
                    callState !== "idle"
                  }
                  title={
                    videoCallState === "calling" || videoCallState === "ringing"
                      ? "Video call in progress"
                      : callState !== "idle"
                      ? `Cannot start video call - audio call state: ${callState}`
                      : "Start video call"
                  }
                >
                  <FaVideo className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Messages */}
            <main className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-1">
                {messages.map((msg, index) => {
                  const isSender =
                    msg.from_user_id?.toString() === user.id.toString();
                  const prevMsg = messages[index - 1];
                  const isFirstInGroup =
                    !prevMsg || prevMsg.from_user_id !== msg.from_user_id;
                  return (
                    <MessageBubble
                      key={msg.id || index}
                      msg={msg}
                      isSender={isSender}
                      isFirstInGroup={isFirstInGroup}
                    />
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </main>

            {/* Message Input */}
            <footer className="p-4 bg-gray-800">
              <div className="flex items-center bg-gray-700 rounded-lg">
                <input
                  type="text"
                  placeholder={`Message @${selectedRecipient.username}`}
                  className="w-full bg-transparent p-4 focus:outline-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  className="p-4 text-gray-400 hover:text-white disabled:text-gray-600"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <FaPaperPlane />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FaRocket className="mx-auto h-24 w-24 text-gray-600" />
              <h3 className="mt-2 text-lg font-medium text-gray-400">
                Select a user to start chatting
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* Call UI */}
      {callState === "active" && activeCallRecipient && (
        <AudioCallHandler
          ref={audioCallRef}
          user={user}
          selectedReceiver={activeCallRecipient}
          roomId={callRoomId}
          callState={callState} // Pass callState so component can monitor changes
          onCallEnd={handleAudioCallEnd} // Use the new handler here
          sendCallNotification={showCallNotification}
          onError={(error) => showCallNotification("error", error, 4000)}
          janusInitialized={janusInitialized}
        />
      )}

      {/* Video Call UI */}
      {(() => {
        const shouldShowVideoCall =
          (videoCallState === "active" || videoCallState === "calling") &&
          !!activeVideoCallRecipient; // Convert to boolean!
        console.log(
          "🔥 VIDEO CALL UI RENDER - Should show:",
          shouldShowVideoCall,
          {
            videoCallState,
            activeVideoCallRecipient: activeVideoCallRecipient?.username,
            conditions: {
              isActive: videoCallState === "active",
              isCalling: videoCallState === "calling",
              hasRecipient: !!activeVideoCallRecipient,
            },
          }
        );
        return shouldShowVideoCall;
      })() && (
        <div>
          {/* DEBUG: Bright red banner to confirm video call UI is rendering */}
          <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-center py-4 text-2xl font-bold">
            🔥 VIDEO CALL UI CONTAINER IS RENDERING! 🔥
          </div>
          <VideoCallInterface
            ref={videoCallRef}
            user={user}
            selectedReceiver={activeVideoCallRecipient}
            onCallEnd={handleVideoCallEnd}
            sendCallNotification={showCallNotification}
            onError={(error) => showCallNotification("error", error, 4000)}
            callState={videoCallState}
            roomId={videoCallRoomId}
            isIncoming={false}
          />
        </div>
      )}

      {/* Incoming Video Call */}
      {incomingVideoCall &&
        videoCallState === "ringing" &&
        (() => {
          console.log(
            "🔥 RENDER INCOMING VIDEO CALL - incomingVideoCall:",
            incomingVideoCall
          );
          console.log(
            "🔥 RENDER INCOMING VIDEO CALL - roomId:",
            incomingVideoCall.room_id
          );
          return true;
        })() && (
          <VideoCallInterface
            ref={videoCallRef}
            user={user}
            selectedReceiver={{ username: incomingVideoCall.caller_username }}
            onCallEnd={handleVideoCallEnd}
            sendCallNotification={showCallNotification}
            onError={(error) => showCallNotification("error", error, 4000)}
            callState={videoCallState}
            roomId={incomingVideoCall.room_id}
            isIncoming={true}
            incomingCallData={incomingVideoCall}
          />
        )}

      {/* Active Call Modal */}
      {(() => {
        const shouldShow =
          callState === "active" && activeCallRecipient && !forceHideModal;
        console.log(
          "🔥 ACTIVE CALL MODAL - Should show:",
          shouldShow,
          "callState:",
          callState,
          "activeCallRecipient:",
          activeCallRecipient?.username,
          "forceHideModal:",
          forceHideModal
        );
        return shouldShow;
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="mb-6">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                  {activeCallRecipient.username?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-60 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-30 animate-ping animation-delay-1000"></div>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Active Call
              </h3>
              <p className="text-xl text-gray-300 mb-1">
                {activeCallRecipient.username}
              </p>
              <div className="flex items-center justify-center mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2"></div>
                <p className="text-sm text-green-400">Secure audio call</p>
              </div>
              <div
                id="call-status-display"
                className="text-xs text-gray-400 mb-4"
              >
                {audioCallStatus}
              </div>
            </div>

            {/* Call Controls */}
            <div className="flex justify-center space-x-8 mb-6">
              <button
                onClick={() => {
                  if (audioCallRef.current) {
                    try {
                      audioCallRef.current.toggleMute();
                    } catch (error) {
                      console.error("Failed to toggle mute:", error);
                    }
                  }
                }}
                className={`${
                  audioCallMuted
                    ? "bg-red-500 hover:bg-red-600 focus:ring-red-500"
                    : "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
                } text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2`}
                aria-label={
                  audioCallMuted ? "Unmute microphone" : "Mute microphone"
                }
                title={audioCallMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {audioCallMuted ? (
                  <FaMicrophoneSlash className="w-6 h-6" />
                ) : (
                  <FaMicrophone className="w-6 h-6" />
                )}
              </button>
              <button
                onClick={handleHangUp}
                className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="End call"
                title="End call"
              >
                <FaPhoneSlash className="w-7 h-7" />
              </button>
            </div>

            {/* Volume Control */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">
                Volume Control
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (audioCallRef.current) {
                      try {
                        audioCallRef.current.adjustVolume(-0.1);
                      } catch (error) {
                        console.error("Failed to decrease volume:", error);
                      }
                    }
                  }}
                  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-1"
                  aria-label="Decrease volume"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={audioCallVolume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    const delta = newVolume - audioCallVolume;
                    if (audioCallRef.current) {
                      try {
                        audioCallRef.current.adjustVolume(delta);
                      } catch (error) {
                        console.error("Failed to adjust volume:", error);
                      }
                    }
                  }}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Volume control"
                />
                <button
                  onClick={() => {
                    if (audioCallRef.current) {
                      try {
                        audioCallRef.current.adjustVolume(0.1);
                      } catch (error) {
                        console.error("Failed to increase volume:", error);
                      }
                    }
                  }}
                  className="text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-1"
                  aria-label="Increase volume"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                </button>
                <span className="text-xs text-gray-400 min-w-[3rem]">
                  {Math.round(audioCallVolume * 100)}%
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <div>Encrypted end-to-end audio call</div>
              <div className="text-gray-600">Press Escape to end call</div>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Call UI */}
      {(() => {
        console.log(
          "🔥 UI RENDER - callState:",
          callState,
          "activeCallRecipient:",
          activeCallRecipient?.username
        );
        return callState === "calling" && activeCallRecipient;
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="mb-6">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                  {activeCallRecipient.username?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-white opacity-30 animate-ping"></div>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Calling...
              </h3>
              <p className="text-xl text-gray-300 mb-1">
                {activeCallRecipient.username}
              </p>
              <div className="flex items-center justify-center mb-2">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isUserOnline(activeCallRecipient.username)
                      ? "bg-green-400 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
                <p
                  className={`text-sm ${
                    isUserOnline(activeCallRecipient.username)
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  {isUserOnline(activeCallRecipient.username)
                    ? "Online"
                    : "Offline"}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Waiting for {activeCallRecipient.username} to answer...
              </p>
            </div>

            <div className="flex justify-center space-x-6">
              <button
                onClick={handleHangUp}
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="Cancel call"
                title="Cancel call"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call UI */}
      {(() => {
        const shouldShow = callState === "ringing" && incomingCall;
        console.log(
          "🔥 INCOMING MODAL - Should show:",
          shouldShow,
          "callState:",
          callState,
          "incomingCall:",
          incomingCall
        );
        return shouldShow;
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl text-center shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="mb-8">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                  {incomingCall.caller_username?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-60 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-30 animate-ping animation-delay-1000"></div>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Incoming Call
              </h3>
              <p className="text-xl text-gray-300 mb-1">
                {incomingCall.caller_username}
              </p>
              <div className="flex items-center justify-center mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2"></div>
                <p className="text-sm text-green-400">Secure audio call</p>
              </div>
              <p className="text-xs text-gray-500">Tap to answer or decline</p>
            </div>

            <div className="flex justify-center space-x-8">
              <button
                onClick={handleRejectCall}
                className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="Reject call"
                title="Reject call"
              >
                <svg
                  className="w-7 h-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>
              <button
                onClick={handleAcceptCall}
                className="bg-green-500 hover:bg-green-600 text-white p-5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                aria-label="Accept call"
                title="Accept call"
              >
                <svg
                  className="w-7 h-7"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Notification Toast */}
      {callNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg border-l-4 max-w-md ${
              callNotification.type === "success"
                ? "bg-green-800 border-green-500 text-green-100"
                : callNotification.type === "error"
                ? "bg-red-800 border-red-500 text-red-100"
                : "bg-blue-800 border-blue-500 text-blue-100"
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {callNotification.type === "success" && (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                )}
                {callNotification.type === "error" && (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                )}
                {callNotification.type === "info" && (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {callNotification.message}
                </p>
              </div>
              <button
                onClick={() => setCallNotification(null)}
                className="ml-4 flex-shrink-0 text-current hover:text-white transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Ended Modal */}
      {callEndedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div
                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  callEndedModal.type === "declined"
                    ? "bg-red-100"
                    : "bg-gray-100"
                }`}
              >
                {callEndedModal.type === "declined" ? (
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {callEndedModal.title}
              </h3>
              <p className="text-gray-600">{callEndedModal.message}</p>
            </div>
            <button
              onClick={() => setCallEndedModal(null)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                callEndedModal.type === "declined"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-600 hover:bg-gray-700 text-white"
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Hidden audio element for remote streams */}
      <audio
        ref={(el) => {
          if (el && window) {
            window.remoteAudioElement = el;
          }
        }}
        autoPlay
        playsInline
        controls={false}
        style={{ display: "none" }}
      />
    </div>
  );

  return isLoggedIn ? renderChat() : renderAuth();
}
