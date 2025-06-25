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
} from "react-icons/fa";

const JanusAudioCall = forwardRef(
  ({ user, selectedReceiver, onCallEnd, getUserName }, ref) => {
    const [isInCall, setIsInCall] = useState(false);
    const [isRinging, setIsRinging] = useState(false);
    const [callStatus, setCallStatus] = useState("");
    const [incomingCall, setIncomingCall] = useState(null);
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
          audioConnected,
          isInCall,
          isCallActive,
          callStatus,
          currentCallId,
          janusConnected,
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
    }));

    // Initialize Janus connection
    useEffect(() => {
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

      // Check immediately
      if (!checkJanusLoaded()) {
        // If not loaded, check periodically for up to 10 seconds
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds with 500ms intervals

        const interval = setInterval(() => {
          attempts++;
          if (checkJanusLoaded() || attempts >= maxAttempts) {
            clearInterval(interval);
            if (attempts >= maxAttempts && !checkJanusLoaded()) {
              console.error("Janus library failed to load after 10 seconds");
              setConnectionError(
                "Janus library failed to load. Please refresh the page."
              );
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

    const initializeJanus = () => {
      console.log("JanusAudioCall: Initializing Janus...");

      // Check if Janus is available
      if (typeof Janus === "undefined") {
        setConnectionError(
          "Janus library not loaded. Please include janus.js in your HTML."
        );
        return;
      }

      try {
        janusRef.current = new Janus({
          server: JANUS_URL,
          success: () => {
            console.log("JanusAudioCall: Janus connected successfully");
            setJanusConnected(true);
            setConnectionError(null);
            attachAudioBridgePlugin();
          },
          error: (error) => {
            console.error("JanusAudioCall: Janus connection failed:", error);
            setConnectionError(`Janus connection failed: ${error}`);
            setJanusConnected(false);
          },
          destroyed: () => {
            console.log("JanusAudioCall: Janus connection destroyed");
            setJanusConnected(false);
            setConnectionError("Janus connection lost");
          },
        });
      } catch (error) {
        console.error(
          "JanusAudioCall: Failed to create Janus instance:",
          error
        );
        setConnectionError(`Failed to create Janus instance: ${error.message}`);
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
          setRoomId(result.room);
          setCallStatus("Connected");
          setIsCallActive(true);
          setAudioConnected(true);
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
        pluginHandleRef.current.handleRemoteJsep({ jsep });
      }
    };

    const handleRemoteTrack = (track, mid, on) => {
      console.log("JanusAudioCall: Remote track:", track, mid, on);

      if (on && track.kind === "audio") {
        // Create audio element for remote audio
        if (!audioRef.current) {
          const audio = document.createElement("audio");
          audio.autoplay = true;
          audio.controls = false;
          audio.style.display = "none";
          document.body.appendChild(audio);
          audioRef.current = audio;
        }

        audioRef.current.srcObject = new MediaStream([track]);
        setAudioConnected(true);
      }
    };

    const startCall = async () => {
      if (!pluginHandleRef.current) {
        console.error("JanusAudioCall: Plugin not attached");
        return;
      }

      try {
        console.log("JanusAudioCall: Starting call...");
        setCallStatus("Connecting...");
        setIsInCall(true);
        setIsRinging(true);

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        localStreamRef.current = stream;

        // Create room or join existing room
        const roomName = `room_${user.username}_${selectedReceiver}`;
        const roomId = generateRoomId(roomName);

        console.log("JanusAudioCall: Joining room:", roomId);

        pluginHandleRef.current.send({
          message: {
            request: "join",
            room: roomId,
            ptype: "publisher",
            display: user.username,
          },
        });

        // Add local stream
        pluginHandleRef.current.send({
          message: { request: "configure" },
          jsep: {
            type: "offer",
            sdp: await createOffer(stream),
          },
        });
      } catch (error) {
        console.error("JanusAudioCall: Failed to start call:", error);
        setConnectionError(`Failed to start call: ${error.message}`);
        cleanupCall();
      }
    };

    const createOffer = async (stream) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      return offer.sdp;
    };

    const generateRoomId = (roomName) => {
      // Simple hash function to generate consistent room ID
      let hash = 0;
      for (let i = 0; i < roomName.length; i++) {
        const char = roomName.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString();
    };

    const endCall = async () => {
      console.log("JanusAudioCall: Ending call...");

      if (pluginHandleRef.current && roomId) {
        pluginHandleRef.current.send({
          message: {
            request: "leave",
          },
        });
      }

      cleanupCall();

      if (onCallEnd) {
        onCallEnd();
      }
    };

    const toggleMute = () => {
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

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.srcObject = null;
        audioRef.current.remove();
        audioRef.current = null;
      }

      stopCallTimer();
      stopRingtone();
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
      stopRingtone();
      ringtoneIntervalRef.current = setInterval(() => {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(
          600,
          audioContext.currentTime + 0.1
        );

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.2
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }, 2000);
    };

    const stopRingtone = () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };

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

    if (!janusLoaded) {
      return (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <b>Janus library not loaded. Please include janus.js in your HTML.</b>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          {/* Connection Status */}
          {connectionError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
              <FaExclamationTriangle className="mr-2" />
              <span className="text-sm">{connectionError}</span>
            </div>
          )}

          {/* Janus Connection Status */}
          <div className="mb-4 p-2 bg-gray-100 rounded flex items-center justify-between">
            <span className="text-sm font-medium">Janus Status:</span>
            <span
              className={`text-sm ${
                janusConnected ? "text-green-600" : "text-red-600"
              }`}
            >
              {janusConnected ? "Connected" : "Disconnected"}
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
