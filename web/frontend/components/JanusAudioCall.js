import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FaPhone,
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVolumeUp,
  FaVolumeMute,
  FaStar,
  FaRocket,
  FaBell,
  FaCog,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";

const JanusAudioCall = forwardRef(
  (
    {
      user,
      selectedReceiver,
      onCallEnd,
      getUserName,
      sendCallNotification,
      wsRef,
    },
    ref
  ) => {
    const [isInCall, setIsInCall] = useState(false);
    const [isRinging, setIsRinging] = useState(false);
    const [callStatus, setCallStatus] = useState("");
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);
    const [currentCallId, setCurrentCallId] = useState(null);
    const [audioConnected, setAudioConnected] = useState(false);
    const [janusConnected, setJanusConnected] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [connectionError, setConnectionError] = useState(null);
    const [janusLoaded, setJanusLoaded] = useState(false);
    const [otherPartyId, setOtherPartyId] = useState(null);

    // Check if we're in demo mode (Render deployment)
    const IS_DEMO_MODE =
      typeof window !== "undefined" &&
      (window.location.hostname.includes("onrender.com") ||
        window.location.hostname.includes("render.com")) &&
      !(process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true" || true);

    // Janus-specific refs
    const janusRef = useRef(null);
    const pluginHandleRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const audioRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const ringtoneIntervalRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Janus configuration
    const JANUS_URL =
      process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
    const JANUS_HTTP_URL =
      process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

    // Expose functions to parent component
    useImperativeHandle(ref, () => ({
      startCall: () => {
        console.log("JanusAudioCall: startCall called");
        startCall();
      },
      joinRoom: async (roomId) => {
        console.log("JanusAudioCall: joinRoom called with roomId:", roomId);
        try {
          // This is called when receiver accepts the call
          await startActualCall(roomId);
          console.log("JanusAudioCall: Successfully joined room:", roomId);
        } catch (error) {
          console.error("JanusAudioCall: Failed to join room:", error);
          setConnectionError("Failed to join call: " + error.message);
        }
      },
      testAudio: () => {
        console.log("JanusAudioCall: Testing audio playback...");
        if (audioRef.current) {
          audioRef.current
            .play()
            .then(() => {
              console.log("JanusAudioCall: Test audio playback successful");
            })
            .catch((err) => {
              console.error("JanusAudioCall: Test audio playback failed:", err);
            });
        }
      },
      setAudioConnected: (status) => {
        setAudioConnected(status);
      },
      getAudioStatus: () => {
        return {
          audioConnected: IS_DEMO_MODE ? true : audioConnected,
          isInCall,
          isCallActive,
          callStatus,
          currentCallId,
          janusConnected: IS_DEMO_MODE ? true : janusConnected,
          roomId,
        };
      },
      setVolume: (volume) => {
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, Math.min(1, volume));
        }
      },
      getVolume: () => {
        if (audioRef.current) {
          return audioRef.current.volume;
        }
        return 0;
      },
      debugJanusSetup: () => {
        console.log("JanusAudioCall: Debug Janus Setup");
        console.log("Janus instance:", janusRef.current);
        console.log("Plugin handle:", pluginHandleRef.current);
        console.log("Local stream:", localStreamRef.current);
        console.log("Audio element:", audioRef.current);
        console.log("Room ID:", roomId);
        console.log("Participants:", participants);
        return {
          janusConnected,
          pluginHandle: !!pluginHandleRef.current,
          localStream: !!localStreamRef.current,
          audioElement: !!audioRef.current,
          roomId,
          participants: participants.length,
        };
      },
      resumeAudioContext: async () => {
        try {
          const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
          if (audioContext.state === "suspended") {
            await audioContext.resume();
            return true;
          }
          return true;
        } catch (error) {
          console.error(
            "JanusAudioCall: Failed to resume audio context:",
            error
          );
          return false;
        }
      },
      // New function to start actual call after acceptance
      startActualCall: async (roomId) => {
        console.log("JanusAudioCall: Starting actual call for room:", roomId);
        await startActualCall(roomId);
      },
      endCall,
      forceClose: () => {
        console.log("JanusAudioCall: Force closing modal");
        setIsInCall(false);
        setIsRinging(false);
        setIsCallActive(false);
        cleanupCall();
        if (onCallEnd) {
          onCallEnd();
        }
      },
      setOtherPartyId: (partyId) => {
        console.log("JanusAudioCall: Setting other party ID:", partyId);
        setOtherPartyId(partyId);
      },
    }));

    // Initialize Janus connection
    useEffect(() => {
      const loadJanusLibrary = () => {
        if (typeof window !== "undefined" && !window.Janus) {
          console.log("JanusAudioCall: Loading Janus library...");

          const script = document.createElement("script");
          script.src = "/janus.js";
          script.async = false;
          script.onload = () => {
            console.log("JanusAudioCall: Janus library loaded successfully");
            setJanusLoaded(true);
            window.janusLoaded = true;
          };
          script.onerror = () => {
            console.error("JanusAudioCall: Failed to load Janus library");
            setJanusLoaded(false);
            window.janusLoadFailed = true;
          };
          document.head.appendChild(script);
        } else if (typeof window !== "undefined" && window.Janus) {
          console.log("JanusAudioCall: Janus library already available");
          setJanusLoaded(true);
          window.janusLoaded = true;
        }
      };

      const checkJanusLoaded = () => {
        if (
          typeof window !== "undefined" &&
          typeof window.Janus !== "undefined"
        ) {
          console.log("Janus library detected");
          setJanusLoaded(true);
          return true;
        } else {
          console.log("Janus library not yet loaded");
          setJanusLoaded(false);
          return false;
        }
      };

      // Check if Janus failed to load
      if (typeof window !== "undefined" && window.janusLoadFailed) {
        console.error("Janus library failed to load - using demo mode");
        setConnectionError(
          "Janus library unavailable. Audio calls will be simulated in demo mode."
        );
        setJanusLoaded(false);
        return;
      }

      // Try to load Janus if not already loaded
      if (!checkJanusLoaded()) {
        loadJanusLibrary();

        // If not loaded, check periodically for up to 15 seconds
        let attempts = 0;
        const maxAttempts = 30; // 15 seconds with 500ms intervals

        const interval = setInterval(() => {
          attempts++;
          if (checkJanusLoaded() || attempts >= maxAttempts) {
            clearInterval(interval);
            if (attempts >= maxAttempts && !checkJanusLoaded()) {
              console.error("Janus library failed to load after 15 seconds");
              setConnectionError(
                "Janus library failed to load. Audio calls will be simulated in demo mode."
              );
              if (typeof window !== "undefined") {
                window.janusLoadFailed = true;
              }
            }
          }
        }, 500);

        return () => clearInterval(interval);
      }
    }, []);

    useEffect(() => {
      if (user && !janusRef.current) {
        initializeJanus();
      }
      return () => {
        cleanupJanus();
      };
    }, [user]);

    // Auto-reconnect on connection loss
    useEffect(() => {
      if (!janusConnected && user && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("JanusAudioCall: Attempting to reconnect...");
          initializeJanus();
          reconnectTimeoutRef.current = null;
        }, 5000);
      }

      return () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
    }, [janusConnected, user]);

    // Add escape key handler to close modal
    useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          console.log("Escape pressed: Ending call and closing modal");
          endCall();
        }
      };

      if (isInCall || isRinging) {
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
      }
    }, [isInCall, isRinging]);

    const initializeJanus = () => {
      console.log("JanusAudioCall: Initializing Janus...");

      // Check if we're in demo mode or Janus failed to load
      if (
        IS_DEMO_MODE ||
        (typeof window !== "undefined" && window.janusLoadFailed)
      ) {
        console.log(
          "JanusAudioCall: Demo mode or Janus unavailable - using simulated calls"
        );
        setJanusConnected(true); // Pretend we're connected for demo
        setConnectionError(null);
        return;
      }

      // Check if Janus is available
      if (
        typeof window === "undefined" ||
        typeof window.Janus === "undefined"
      ) {
        console.error(
          "JanusAudioCall: Janus library not loaded, retrying in 1 second..."
        );

        // Retry after a short delay in case the library is still loading
        setTimeout(() => {
          if (
            typeof window !== "undefined" &&
            typeof window.Janus !== "undefined"
          ) {
            console.log("JanusAudioCall: Janus library loaded on retry");
            initializeJanus();
          } else {
            console.error(
              "JanusAudioCall: Janus library still not available after retry"
            );
            setConnectionError(
              "Janus library not loaded. Audio calls will be simulated in demo mode."
            );
            if (typeof window !== "undefined") {
              window.janusLoadFailed = true;
            }
            setJanusConnected(true); // Pretend we're connected for demo
          }
        }, 1000);
        return;
      }

      try {
        // Initialize Janus library first
        console.log("JanusAudioCall: Initializing Janus library...");
        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log(
              "JanusAudioCall: Janus library initialized successfully"
            );

            // Now create the Janus instance
            janusRef.current = new window.Janus({
              server: JANUS_URL,
              success: () => {
                console.log("JanusAudioCall: Janus connected successfully");
                setJanusConnected(true);
                setConnectionError(null);
                attachAudioBridgePlugin();
              },
              error: (error) => {
                console.error(
                  "JanusAudioCall: Janus connection failed:",
                  error
                );
                setConnectionError(
                  `Janus connection failed: ${error}. Audio calls will be simulated.`
                );
                setJanusConnected(false);
                // Fall back to demo mode
                if (typeof window !== "undefined") {
                  window.janusLoadFailed = true;
                }
              },
              destroyed: () => {
                console.log("JanusAudioCall: Janus connection destroyed");
                setJanusConnected(false);
                setConnectionError(
                  "Janus connection lost. Audio calls will be simulated."
                );
              },
            });
          },
        });
      } catch (error) {
        console.error(
          "JanusAudioCall: Failed to create Janus instance:",
          error
        );
        setConnectionError(
          `Failed to create Janus instance: ${error.message}. Audio calls will be simulated.`
        );
        if (typeof window !== "undefined") {
          window.janusLoadFailed = true;
        }
        setJanusConnected(true); // Pretend we're connected for demo
      }
    };

    const attachAudioBridgePlugin = () => {
      if (!janusRef.current) {
        console.error("JanusAudioCall: Janus not connected");
        return;
      }

      janusRef.current.attach({
        plugin: "janus.plugin.audiobridge",
        success: (pluginHandle) => {
          console.log("JanusAudioCall: AudioBridge plugin attached");
          pluginHandleRef.current = pluginHandle;

          // Set up event handlers
          pluginHandle.onmessage = (msg, jsep) => {
            handlePluginMessage(msg, jsep);
          };

          pluginHandle.onremotetrack = (track, mid, on) => {
            handleRemoteTrack(track, mid, on);
          };

          pluginHandle.ondataopen = () => {
            console.log("JanusAudioCall: Data channel opened");
          };

          pluginHandle.ondata = (data) => {
            console.log("JanusAudioCall: Data received:", data);
          };

          pluginHandle.oncleanup = () => {
            console.log("JanusAudioCall: Plugin cleanup");
            pluginHandleRef.current = null;
          };
        },
        error: (error) => {
          console.error(
            "JanusAudioCall: Failed to attach AudioBridge plugin:",
            error
          );
          setConnectionError(`Failed to attach AudioBridge plugin: ${error}`);
        },
        consentDialog: (on) => {
          console.log("JanusAudioCall: Consent dialog:", on);
        },
        webrtcState: (on) => {
          console.log("JanusAudioCall: WebRTC state:", on);
        },
        onmessage: (msg, jsep) => {
          handlePluginMessage(msg, jsep);
        },
        onremotetrack: (track, mid, on) => {
          handleRemoteTrack(track, mid, on);
        },
        oncleanup: () => {
          console.log("JanusAudioCall: Plugin cleanup");
          pluginHandleRef.current = null;
        },
      });
    };

    const handlePluginMessage = (msg, jsep) => {
      console.log("JanusAudioCall: Plugin message received:", msg);

      if (msg.error) {
        console.error("JanusAudioCall: Plugin error:", msg.error);
        setConnectionError(`Plugin error: ${msg.error.reason || msg.error}`);
        return;
      }

      if (msg.result) {
        const result = msg.result;

        if (result.event === "joined") {
          console.log("JanusAudioCall: Joined room:", result.room);
          console.log(
            "JanusAudioCall: Room participants:",
            result.room?.participants
          );
          console.log(
            "JanusAudioCall: Total participants:",
            result.room?.participants?.length || 0
          );
          setRoomId(result.room);
          setCallStatus("Connected");
          setIsCallActive(true);
          setAudioConnected(true);
          setParticipants(result.room.participants);
          startCallTimer();
        } else if (result.event === "room") {
          console.log("JanusAudioCall: Room info:", result);
          if (result.room && result.room.participants) {
            setParticipants(result.room.participants);
          }
        } else if (result.event === "participant_joined") {
          console.log("JanusAudioCall: Participant joined:", result);
          // Refresh participants list
          if (pluginHandleRef.current) {
            pluginHandleRef.current.send({
              message: { request: "listparticipants" },
            });
          }
        } else if (result.event === "participant_left") {
          console.log("JanusAudioCall: Participant left:", result);
          // Refresh participants list
          if (pluginHandleRef.current) {
            pluginHandleRef.current.send({
              message: { request: "listparticipants" },
            });
          }
        } else if (result.event === "talking") {
          console.log("JanusAudioCall: Talking event:", result);
        } else if (result.event === "stopped_talking") {
          console.log("JanusAudioCall: Stopped talking event:", result);
        }
      }

      // Handle JSEP (WebRTC offer/answer)
      if (jsep) {
        console.log("JanusAudioCall: Processing JSEP:", jsep.type);
        if (jsep.type === "answer") {
          pluginHandleRef.current.handleRemoteJsep({ jsep });
        } else if (jsep.type === "offer") {
          // Handle incoming offer by creating an answer
          pluginHandleRef.current.createAnswer({
            jsep: jsep,
            media: { audio: true, video: false },
            success: (answerJsep) => {
              console.log("JanusAudioCall: Created answer:", answerJsep);
              pluginHandleRef.current.send({
                message: { request: "configure" },
                jsep: answerJsep,
              });
            },
            error: (error) => {
              console.error("JanusAudioCall: Failed to create answer:", error);
              setConnectionError(`Failed to create answer: ${error}`);
            },
          });
        }
      }
    };

    const handleRemoteTrack = (track, mid, on) => {
      console.log(
        "JanusAudioCall: Remote track:",
        track,
        mid,
        on,
        "readyState:",
        track.readyState
      );

      if (on && track.kind === "audio") {
        console.log("JanusAudioCall: Setting up remote audio track");

        // Create audio element for remote audio
        if (!audioRef.current) {
          const audio = document.createElement("audio");
          audio.autoplay = true;
          audio.controls = false;
          audio.style.display = "none";
          audio.volume = 1.0; // Ensure volume is at maximum
          document.body.appendChild(audio);
          audioRef.current = audio;

          // Add event listeners for debugging
          audio.addEventListener("loadstart", () =>
            console.log("JanusAudioCall: Audio loadstart")
          );
          audio.addEventListener("canplay", () =>
            console.log("JanusAudioCall: Audio canplay")
          );
          audio.addEventListener("playing", () =>
            console.log("JanusAudioCall: Audio playing")
          );
          audio.addEventListener("error", (e) =>
            console.error("JanusAudioCall: Audio error:", e)
          );
        }

        const stream = new MediaStream([track]);
        console.log(
          "JanusAudioCall: Created MediaStream with track:",
          stream,
          "tracks:",
          stream.getTracks()
        );

        // Prevent multiple load requests by checking if already set
        if (audioRef.current.srcObject !== stream) {
          audioRef.current.srcObject = stream;
        }

        // Try to play explicitly (some browsers require this)
        // Add a small delay to prevent interruption by new load requests
        setTimeout(() => {
          if (audioRef.current && audioRef.current.srcObject) {
            audioRef.current
              .play()
              .then(() => {
                console.log("JanusAudioCall: Audio playing successfully");
                setAudioConnected(true);
              })
              .catch((error) => {
                if (error.name === "AbortError") {
                  console.log(
                    "JanusAudioCall: Audio play was interrupted, retrying..."
                  );
                  // Retry once after a longer delay
                  setTimeout(() => {
                    if (audioRef.current && audioRef.current.srcObject) {
                      audioRef.current.play().catch(() => {
                        console.log(
                          "JanusAudioCall: Audio retry failed, but track is connected"
                        );
                      });
                    }
                  }, 1000);
                } else {
                  console.error("JanusAudioCall: Failed to play audio:", error);
                }
                // Still set as connected since the track is there
                setAudioConnected(true);
              });
          }
        }, 100);
      } else if (!on && track.kind === "audio") {
        console.log("JanusAudioCall: Remote audio track ended");
        if (audioRef.current) {
          audioRef.current.srcObject = null;
        }
        setAudioConnected(false);
      }
    };

    const startCall = async () => {
      if (isInCall || isRinging) {
        // Prevent duplicate call modals
        return;
      }

      // Set the other party ID for call end notifications
      if (selectedReceiver) {
        setOtherPartyId(selectedReceiver);
      }

      // Demo mode - simulate call without Janus
      if (IS_DEMO_MODE) {
        console.log("JanusAudioCall: Demo mode - simulating call");

        // Send call notification in demo mode
        if (sendCallNotification && selectedReceiver) {
          console.log("JanusAudioCall: Sending call notification (demo mode)");
          sendCallNotification(selectedReceiver, 1234); // Use receiver's ID directly
        }

        // Set calling state (waiting for receiver to accept)
        setCallStatus("Calling...");
        setIsInCall(true);
        setIsRinging(true);

        // Don't start the actual call immediately - wait for receiver to accept
        console.log("JanusAudioCall: Waiting for receiver to accept call...");
        return;
      }

      if (!pluginHandleRef.current) {
        console.error("JanusAudioCall: Plugin not attached");
        return;
      }

      try {
        console.log("JanusAudioCall: Starting call...");

        // First, clean up any existing call
        await cleanupCall();

        setCallStatus("Calling...");
        setIsInCall(true);
        setIsRinging(true);

        // Send call notification to the receiver
        if (sendCallNotification && selectedReceiver) {
          const roomId = 1234; // Using a fixed room for simplicity
          console.log(
            "JanusAudioCall: Sending call notification to receiver:",
            selectedReceiver
          );
          sendCallNotification(selectedReceiver, roomId);

          // Don't proceed with the call immediately - wait for receiver to accept
          console.log("JanusAudioCall: Waiting for receiver to accept call...");
          return;
        } else {
          console.warn(
            "JanusAudioCall: sendCallNotification not available or no receiver selected"
          );
          // If we can't send notification, don't start the call
          setCallStatus("Failed to send notification");
          cleanupCall();
          return;
        }
      } catch (error) {
        console.error("JanusAudioCall: Failed to start call:", error);
        setConnectionError(`Failed to start call: ${error.message}`);
        cleanupCall();
      }
    };

    // Function to actually start the call after receiver accepts
    const startActualCall = async (roomId) => {
      console.log("JanusAudioCall: Starting actual call for room:", roomId);

      // Set the call state to show the modal for receiver
      setIsInCall(true);
      setCallStatus("Joining call...");

      if (IS_DEMO_MODE) {
        console.log("JanusAudioCall: Demo mode - simulating actual call start");
        setCallStatus("Connected");
        setIsCallActive(true);
        setIsRinging(false);
        setAudioConnected(true);
        setParticipants([
          { id: user.id, username: user.username, publisher: true },
          {
            id: selectedReceiver,
            username: getUserName(selectedReceiver),
            publisher: false,
          },
        ]);
        startCallTimer();
        return;
      }

      if (!pluginHandleRef.current) {
        console.error("JanusAudioCall: Plugin not attached for actual call");
        return;
      }

      try {
        setCallStatus("Connecting...");
        setIsRinging(false);

        // Get user media
        console.log("JanusAudioCall: Requesting user media for actual call...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        console.log("JanusAudioCall: Got user media stream:", stream);
        localStreamRef.current = stream;

        // Set the room ID
        setRoomId(roomId);
        setParticipants([]);

        // Try to join or create room
        attemptJoinOrCreate(roomId, stream);
      } catch (error) {
        console.error("JanusAudioCall: Failed to start actual call:", error);
        setConnectionError(`Failed to start call: ${error.message}`);
        cleanupCall();
      }
    };

    const proceedWithCall = async () => {
      try {
        // Get user media with better error handling
        console.log("JanusAudioCall: Requesting user media...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        console.log("JanusAudioCall: Got user media stream:", stream);
        localStreamRef.current = stream;

        // Use a simple, fixed room ID for testing
        const roomId = 1234;
        console.log("JanusAudioCall: Using room ID:", roomId);

        // Reset room state
        setRoomId(null);
        setParticipants([]);

        // Try to join or create room
        attemptJoinOrCreate(roomId, stream);
      } catch (error) {
        console.error("JanusAudioCall: Failed to get user media:", error);
        setConnectionError(`Failed to access microphone: ${error.message}`);
        cleanupCall();
      }
    };

    const attemptJoinOrCreate = (roomId, stream) => {
      console.log("JanusAudioCall: Attempting to join existing room first");

      // Set the room ID immediately
      setRoomId(roomId);

      pluginHandleRef.current.send({
        message: {
          request: "join",
          room: roomId,
          ptype: "publisher",
          display: user.username,
        },
        success: async (result) => {
          console.log(
            "JanusAudioCall: Successfully joined existing room:",
            result
          );
          setCallStatus("Connected to room");
          setIsCallActive(true);
          setIsRinging(false);

          // Create offer using Janus WebRTC handling with better error handling
          try {
            pluginHandleRef.current.createOffer({
              media: { audio: true, video: false },
              stream: stream,
              success: (jsep) => {
                console.log("JanusAudioCall: Created offer:", jsep);
                pluginHandleRef.current.send({
                  message: { request: "configure", audio: true, video: false },
                  jsep: jsep,
                });
              },
              error: (error) => {
                console.error("JanusAudioCall: Failed to create offer:", error);
                setConnectionError(`Failed to create offer: ${error}`);
                cleanupCall();
              },
            });
          } catch (error) {
            console.error("JanusAudioCall: Exception creating offer:", error);
            setConnectionError(`Exception creating offer: ${error.message}`);
            cleanupCall();
          }
        },
        error: (error) => {
          console.log(
            "JanusAudioCall: Failed to join room, trying to create:",
            error
          );

          // If join fails, try to create the room
          pluginHandleRef.current.send({
            message: {
              request: "create",
              room: roomId,
              description: `Audio call room ${roomId}`,
              is_private: false,
              allowed: [], // Remove restrictions
            },
            success: (result) => {
              console.log("JanusAudioCall: Room created successfully:", result);
              // Now join the newly created room
              joinRoom(roomId, stream);
            },
            error: (createError) => {
              console.error(
                "JanusAudioCall: Failed to create room:",
                createError
              );

              // If room creation fails, it might already exist, try joining again
              if (createError.toString().includes("already exists")) {
                console.log(
                  "JanusAudioCall: Room already exists, trying to join again"
                );
                joinRoom(roomId, stream);
              } else {
                setConnectionError(`Failed to create room: ${createError}`);
                cleanupCall();
              }
            },
          });
        },
      });
    };

    const joinRoom = async (roomId, stream) => {
      console.log("JanusAudioCall: Joining room:", roomId);

      pluginHandleRef.current.send({
        message: {
          request: "join",
          room: roomId,
          ptype: "publisher",
          display: user.username,
        },
        success: async (result) => {
          console.log("JanusAudioCall: Successfully joined room:", result);

          // Create offer using Janus WebRTC handling
          pluginHandleRef.current.createOffer({
            media: { audio: true, video: false },
            stream: stream,
            success: (jsep) => {
              console.log("JanusAudioCall: Created offer:", jsep);
              pluginHandleRef.current.send({
                message: { request: "configure" },
                jsep: jsep,
              });
            },
            error: (error) => {
              console.error("JanusAudioCall: Failed to create offer:", error);
              setConnectionError(`Failed to create offer: ${error}`);
              cleanupCall();
            },
          });
        },
        error: (error) => {
          console.error("JanusAudioCall: Failed to join room:", error);
          setConnectionError(`Failed to join room: ${error}`);
          cleanupCall();
        },
      });
    };

    const generateRoomId = (roomName) => {
      // Simple hash function to generate consistent room ID
      let hash = 0;
      for (let i = 0; i < roomName.length; i++) {
        const char = roomName.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      // Return a smaller positive integer for better compatibility
      const roomId = Math.abs(hash) % 999999; // Use smaller range (1-999999)
      return roomId === 0 ? 1234 : roomId; // Ensure it's never 0, use default 1234
    };

    const endCall = async () => {
      console.log("JanusAudioCall: Ending call...");

      // Send call end notification to the other party
      if (sendCallNotification && otherPartyId && roomId) {
        console.log(
          "JanusAudioCall: Sending call end notification to:",
          otherPartyId
        );
        try {
          // Create a custom call end notification
          const callEndMessage = {
            type: "call_ended",
            from_user_id: user.id,
            from_username: user.username,
            to_user_id: otherPartyId,
            room_id: roomId,
          };

          // Send via WebSocket if available
          if (wsRef?.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(callEndMessage));
            console.log(
              "JanusAudioCall: Call end notification sent via WebSocket"
            );
          }
        } catch (error) {
          console.error(
            "JanusAudioCall: Failed to send call end notification:",
            error
          );
        }
      }

      // Demo mode - just cleanup
      if (IS_DEMO_MODE) {
        console.log("JanusAudioCall: Demo mode - ending simulated call");
        cleanupCall();
        if (onCallEnd) {
          onCallEnd();
        }
        return;
      }

      if (pluginHandleRef.current && roomId) {
        pluginHandleRef.current.send({
          message: {
            request: "leave",
          },
        });
      }

      // Force state updates to be synchronous to ensure modal closes
      setIsInCall(false);
      setIsRinging(false);
      setIsCallActive(false);

      cleanupCall();

      if (onCallEnd) {
        onCallEnd();
      }

      // Force modal to close with a slight delay to ensure state updates have been processed
      setTimeout(() => {
        setIsInCall(false);
        setIsRinging(false);
      }, 100);
    };

    const toggleMute = () => {
      // Demo mode - just toggle mute state
      if (IS_DEMO_MODE) {
        console.log("JanusAudioCall: Demo mode - toggling mute");
        setIsMuted(!isMuted);
        return;
      }

      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setIsMuted(!audioTrack.enabled);

          if (pluginHandleRef.current) {
            pluginHandleRef.current.send({
              message: {
                request: "configure",
                muted: !audioTrack.enabled,
              },
            });
          }
        }
      }
    };

    const cleanupCall = () => {
      console.log("JanusAudioCall: Cleaning up call...");

      setIsInCall(false);
      setIsRinging(false);
      setIsCallActive(false);
      setCallStatus("");
      setCallDuration(0);
      setRoomId(null);
      setParticipants([]);
      setAudioConnected(false);
      setOtherPartyId(null);

      console.log("JanusAudioCall: State after cleanup:", {
        isInCall: false,
        isRinging: false,
      });

      // Clean up local stream
      if (localStreamRef.current) {
        console.log("JanusAudioCall: Stopping local stream tracks");
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log("JanusAudioCall: Stopped track:", track.kind);
        });
        localStreamRef.current = null;
      }

      // Clean up remote stream
      if (remoteStreamRef.current) {
        console.log("JanusAudioCall: Cleaning up remote stream");
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
      }

      // Clean up audio element
      if (audioRef.current) {
        console.log("JanusAudioCall: Cleaning up audio element");
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current.removeAttribute("src");
        audioRef.current.load();

        // Remove from DOM if it was added
        if (audioRef.current.parentNode) {
          audioRef.current.parentNode.removeChild(audioRef.current);
        }
        audioRef.current = null;
      }

      stopCallTimer();
      stopRingtone();

      // Clear any connection errors
      setConnectionError(null);
    };

    const cleanupJanus = () => {
      console.log("JanusAudioCall: Cleaning up Janus...");

      if (pluginHandleRef.current) {
        pluginHandleRef.current.detach();
        pluginHandleRef.current = null;
      }

      if (janusRef.current) {
        janusRef.current.destroy();
        janusRef.current = null;
      }

      setJanusConnected(false);
      setConnectionError(null);
    };

    const startCallTimer = () => {
      stopCallTimer();
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    const stopCallTimer = () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };

    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    };

    const playRingtone = () => {
      try {
        stopRingtone();

        // Mobile-friendly ringtone system
        const playRingtoneTone = () => {
          try {
            // Try Web Audio API first (better quality)
            if (window.AudioContext || window.webkitAudioContext) {
              const audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();

              // Resume audio context if suspended (required for mobile)
              if (audioContext.state === "suspended") {
                audioContext
                  .resume()
                  .then(() => {
                    console.log(
                      "JanusAudioCall: Audio context resumed successfully"
                    );
                  })
                  .catch((err) => {
                    console.error(
                      "JanusAudioCall: Failed to resume audio context:",
                      err
                    );
                    // Fallback to HTML5 audio
                    playFallbackRingtone();
                  });
                return;
              }

              // Create oscillators for alternating tones
              const oscillator1 = audioContext.createOscillator();
              const oscillator2 = audioContext.createOscillator();
              const gainNode = audioContext.createGain();

              oscillator1.connect(gainNode);
              oscillator2.connect(gainNode);
              gainNode.connect(audioContext.destination);

              // Alternating frequencies for realistic ringtone
              const isEvenRing = (Date.now() / 1000) % 2 === 0;
              oscillator1.frequency.setValueAtTime(
                isEvenRing ? 480 : 620,
                audioContext.currentTime
              );
              oscillator2.frequency.setValueAtTime(
                isEvenRing ? 620 : 480,
                audioContext.currentTime
              );

              oscillator1.type = "sine";
              oscillator2.type = "sine";

              // Mobile-friendly envelope (shorter, louder)
              const now = audioContext.currentTime;
              gainNode.gain.setValueAtTime(0, now);
              gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
              gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

              oscillator1.start(now);
              oscillator2.start(now);
              oscillator1.stop(now + 0.6);
              oscillator2.stop(now + 0.6);
            } else {
              // Fallback for older browsers
              playFallbackRingtone();
            }
          } catch (error) {
            console.error(
              "JanusAudioCall: Web Audio API failed, using fallback:",
              error
            );
            playFallbackRingtone();
          }
        };

        // HTML5 Audio fallback for mobile devices
        const playFallbackRingtone = () => {
          try {
            // Create a simple beep using HTML5 Audio
            const audio = new Audio();
            const sampleRate = 44100;
            const duration = 0.6;
            const frequency = 480;

            // Generate a simple sine wave
            const audioContext = new (window.AudioContext ||
              window.webkitAudioContext)();
            const buffer = audioContext.createBuffer(
              1,
              sampleRate * duration,
              sampleRate
            );
            const channelData = buffer.getChannelData(0);

            for (let i = 0; i < sampleRate * duration; i++) {
              channelData[i] =
                Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3;
            }

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start();
          } catch (error) {
            console.error("JanusAudioCall: Fallback ringtone failed:", error);
            // Last resort: try to play a silent audio to unlock audio
            try {
              const silentAudio = new Audio();
              silentAudio.src =
                "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWTQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT";
              silentAudio.play().catch(() => {});
            } catch (e) {
              console.error("JanusAudioCall: Silent audio unlock failed:", e);
            }
          }
        };

        // Start ringing with mobile-friendly interval
        let ringCount = 0;
        ringtoneIntervalRef.current = setInterval(() => {
          playRingtoneTone();
          ringCount++;

          // Stop after 30 seconds to prevent infinite ringing
          if (ringCount >= 30) {
            stopRingtone();
          }
        }, 1000);

        // Also try to unlock audio immediately on user interaction
        const unlockAudio = () => {
          try {
            if (window.AudioContext || window.webkitAudioContext) {
              const audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
              if (audioContext.state === "suspended") {
                audioContext.resume();
              }
            }
          } catch (error) {
            console.error("JanusAudioCall: Audio unlock failed:", error);
          }
        };

        // Add one-time click listener to unlock audio
        const unlockHandler = () => {
          unlockAudio();
          document.removeEventListener("click", unlockHandler);
          document.removeEventListener("touchstart", unlockHandler);
        };

        document.addEventListener("click", unlockHandler, { once: true });
        document.addEventListener("touchstart", unlockHandler, { once: true });
      } catch (error) {
        console.error("JanusAudioCall: Error setting up ringtone:", error);
      }
    };

    const stopRingtone = () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };

    if (
      !janusLoaded &&
      !(typeof window !== "undefined" && window.janusLoadFailed)
    ) {
      return (
        <div className="p-4 bg-blue-100 text-blue-700 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <span>Loading audio calling system...</span>
          </div>
        </div>
      );
    }

    // Only show modal when there's an active call or ringing
    if (!isInCall && !isRinging) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={(e) => {
          // Close modal if clicking outside the content
          if (e.target === e.currentTarget) {
            console.log("Clicked outside modal: Ending call");
            endCall();
          }
        }}
      >
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl relative">
          {/* Close Button */}
          <button
            onClick={endCall}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close (Esc)"
          >
            <FaTimes className="w-5 h-5" />
          </button>

          {/* Demo Mode Notice */}
          {(IS_DEMO_MODE ||
            (typeof window !== "undefined" && window.janusLoadFailed)) && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded flex items-center">
              <FaRocket className="mr-2" />
              <span className="text-sm">
                Demo Mode: Audio calls are simulated for testing purposes
              </span>
            </div>
          )}

          {/* Connection Status */}
          {connectionError &&
            !IS_DEMO_MODE &&
            !(typeof window !== "undefined" && window.janusLoadFailed) && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
                <FaExclamationTriangle className="mr-2" />
                <span className="text-sm">{connectionError}</span>
              </div>
            )}

          {/* Janus Connection Status */}
          <div className="mb-4 p-2 bg-gray-100 rounded flex items-center justify-between">
            <span className="text-sm font-medium">Audio System Status:</span>
            <span
              className={`text-sm ${
                janusConnected ? "text-green-600" : "text-red-600"
              }`}
            >
              {IS_DEMO_MODE ||
              (typeof window !== "undefined" && window.janusLoadFailed)
                ? "Demo Mode"
                : janusConnected
                ? "Connected"
                : "Disconnected"}
            </span>
          </div>

          {/* Call Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaPhone className="text-white text-2xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {isInCall ? "Audio Call" : "Initiating Call"}
            </h3>
            <p className="text-gray-600">
              {selectedReceiver
                ? `Calling ${getUserName(selectedReceiver)}`
                : "Connecting..."}
            </p>
          </div>

          {/* Call Status */}
          {isInCall && (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 mb-2">{callStatus}</p>
              {isCallActive && (
                <p className="text-lg font-mono text-blue-600">
                  {formatDuration(callDuration)}
                </p>
              )}
              {roomId && (
                <p className="text-xs text-gray-500">Room: {roomId}</p>
              )}
              {participants.length > 0 && (
                <p className="text-xs text-gray-500">
                  Participants: {participants.length}
                </p>
              )}
            </div>
          )}

          {/* Call Controls */}
          <div className="flex justify-center space-x-4 mb-6">
            {isCallActive ? (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full ${
                    isMuted
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  } hover:opacity-80 transition-opacity`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                </button>
                <button
                  onClick={endCall}
                  className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                  title="End Call"
                >
                  <FaPhoneSlash />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-sm text-gray-600">Connecting...</span>
              </div>
            )}
          </div>

          {/* Audio Status */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <FaVolumeUp
                className={`text-sm ${
                  audioConnected ? "text-green-500" : "text-gray-400"
                }`}
              />
              <span className="text-xs text-gray-600">
                {audioConnected ? "Audio Connected" : "Audio Connecting..."}
              </span>
            </div>
          </div>

          {/* Debug Info (Development) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>Janus: {janusConnected ? "✓" : "✗"}</p>
              <p>Plugin: {pluginHandleRef.current ? "✓" : "✗"}</p>
              <p>Local Stream: {localStreamRef.current ? "✓" : "✗"}</p>
              <p>Audio Element: {audioRef.current ? "✓" : "✗"}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

JanusAudioCall.displayName = "JanusAudioCall";

export default JanusAudioCall;
