import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaExpand,
  FaCompress,
  FaDesktop,
  FaCog,
  FaUser,
  FaUsers,
  FaSignal,
  FaWifi,
  FaVolumeUp,
  FaVolumeMute,
  FaShareAlt,
  FaCamera,
  FaCircle,
  FaPlay,
} from "react-icons/fa";

const VideoCallInterface = forwardRef(
  (
    {
      user,
      selectedReceiver,
      onCallEnd,
      sendCallNotification,
      onError,
      callState,
      roomId,
      isIncoming = false,
      incomingCallData = null,
    },
    ref
  ) => {
    console.log("🔥 VideoCallInterface - Props received:", {
      user: user?.username,
      selectedReceiver: selectedReceiver?.username,
      callState,
      roomId,
      isIncoming,
      incomingCallData,
    });

    // State management
    const [isInCall, setIsInCall] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [callStatus, setCallStatus] = useState("Initializing...");
    const [callDuration, setCallDuration] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [connectionQuality, setConnectionQuality] = useState("good");
    const [networkStats, setNetworkStats] = useState({
      bitrate: 0,
      packetLoss: 0,
      latency: 0,
    });
    const [janusConnected, setJanusConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [subscriptions, setSubscriptions] = useState(new Map());
    const [showControls, setShowControls] = useState(true);
    const [volume, setVolume] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);

    // Refs
    const janusRef = useRef(null);
    const publisherRef = useRef(null);
    const subscribersRef = useRef(new Map());
    const localVideoRef = useRef(null);
    const remoteVideoRefs = useRef(new Map());
    const remoteStreamsRef = useRef(new Map());
    const durationIntervalRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const containerRef = useRef(null);
    const screenshareRef = useRef(null);
    const qualityCheckIntervalRef = useRef(null);

    // Configuration
    const IS_DEMO_MODE =
      typeof window !== "undefined" &&
      (window.location.hostname.includes("onrender.com") ||
        window.location.hostname.includes("render.com")) &&
      !(process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true");

    const JANUS_URL =
      process.env.NEXT_PUBLIC_JANUS_URL ||
      (typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "ws://localhost:8188"
        : "wss://unifiedchat-janus-service.onrender.com/janus");

    const JANUS_HTTP_URL =
      process.env.NEXT_PUBLIC_JANUS_HTTP_URL ||
      (typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:8088"
        : "https://unifiedchat-janus-service.onrender.com");

    const VIDEOROOM_PLUGIN = "janus.plugin.videoroom";

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      startVideoCall: () => {
        console.log(
          "🔥 VideoCallInterface: startVideoCall() called by parent - isInCall:",
          isInCall
        );
        startVideoCall();
      },
      endCall: () => {
        console.log("VideoCallInterface: Ending video call");
        endCall();
      },
      toggleVideo: () => {
        console.log("VideoCallInterface: Toggling video");
        toggleVideo();
      },
      toggleAudio: () => {
        console.log("VideoCallInterface: Toggling audio");
        toggleAudio();
      },
      getCallStatus: () => ({
        isInCall,
        isVideoEnabled,
        isAudioEnabled,
        callStatus,
        participants: participants.length,
        roomId: currentRoomId,
        janusConnected,
        connectionQuality,
        networkStats,
      }),
      acceptCall: async () => {
        if (IS_DEMO_MODE) {
          console.log("VideoCallInterface: Accepting demo call");
          setIsInCall(true);
          setCallStatus("Demo video call active");
          startCallTimer();
          return;
        }

        if (!roomId) {
          console.error(
            "VideoCallInterface: No room ID available for incoming call"
          );
          return;
        }

        try {
          console.log(
            "VideoCallInterface: Accepting call and joining room:",
            roomId
          );
          setCallStatus("Joining video call...");

          const stream = await getUserMedia();
          setLocalStream(stream);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          await joinRoom(roomId, stream);

          setIsInCall(true);
          setCallStatus("Video call active");
          startCallTimer();
          startQualityMonitoring();
        } catch (error) {
          console.error("VideoCallInterface: Failed to accept call:", error);
          setCallStatus("Failed to join video call");
          setConnectionError(error.message);
          onError?.(error.message);
        }
      },
      rejectCall: () => {
        console.log("VideoCallInterface: Rejecting call");
        setCallStatus("Call rejected");
        onCallEnd?.();
      },
    }));

    // Initialize Janus connection
    useEffect(() => {
      if (IS_DEMO_MODE) {
        console.log("VideoCallInterface: Running in demo mode");
        setJanusConnected(true);
        setCallStatus("Demo mode - Video calling simulated");
        return;
      }

      const initializeJanus = () => {
        if (typeof window !== "undefined" && window.Janus) {
          console.log("VideoCallInterface: Initializing Janus...");
          window.Janus.init({
            debug: "all",
            callback: () => {
              console.log("VideoCallInterface: Janus initialized");
              connectToJanus();
            },
            error: (error) => {
              console.error("VideoCallInterface: Janus init failed:", error);
              setConnectionError("Failed to initialize Janus");
              onError?.("Failed to initialize video calling");
            },
          });
        } else {
          console.log("VideoCallInterface: Waiting for Janus libraries...");
          setTimeout(initializeJanus, 1000);
        }
      };

      initializeJanus();

      return () => {
        cleanup();
      };
    }, [
      IS_DEMO_MODE,
      cleanup,
      connectToJanus,
      onError,
      setJanusConnected,
      setCallStatus,
    ]);

    // Monitor call state changes
    useEffect(() => {
      if (callState === "idle" && isInCall) {
        console.log("VideoCallInterface: Parent call state idle, ending call");
        endCall();
      }
    }, [callState, isInCall, endCall]);

    // Attach remote streams to video elements
    useEffect(() => {
      console.log(
        "🔥 VideoCallInterface: Updating video streams for participants:",
        participants.length
      );
      participants.forEach((participant) => {
        const videoElement = remoteVideoRefs.current.get(participant.id);
        const stream = remoteStreams.get(participant.id);

        console.log(
          "🔥 VideoCallInterface: Checking participant:",
          participant.username,
          "ID:",
          participant.id,
          {
            hasVideoElement: !!videoElement,
            hasStream: !!stream,
            streamId: stream?.id,
            streamActive: stream?.active,
            videoTracks: stream?.getVideoTracks?.()?.length || 0,
            audioTracks: stream?.getAudioTracks?.()?.length || 0,
          }
        );

        if (videoElement && stream) {
          console.log(
            "🔥 VideoCallInterface: Attaching stream to video element for:",
            participant.username,
            {
              streamId: stream.id,
              streamActive: stream.active,
              videoTracks: stream.getVideoTracks().length,
              audioTracks: stream.getAudioTracks().length,
              elementCurrentSrc: videoElement.srcObject?.id,
            }
          );

          // Set the stream
          videoElement.srcObject = stream;

          // Remove direct autoplay attempt, rely on user interaction or canplaythrough
          // videoElement.play().catch((error) => {
          //   console.error(
          //     "🔥 VideoCallInterface: Error playing video for:",
          //     participant.username,
          //     error
          //   );
          // });

          // Event listeners for debugging and controlled playback
          const handlePlayAttempt = () => {
            console.log(
              `🔥 VideoCallInterface: ATTEMPTING IMMEDIATE track attachment for: ${participant.username}`,
              {
                streamTracks: stream?.getTracks()?.length,
                streamActive: stream?.active,
                streamReadyState: stream?.readyState,
                videoElementReadyState: videoElement.readyState,
                videoElementNetworkState: videoElement.networkState,
              }
            );

            // Aggressive re-attachment and load attempt to ensure consistency
            if (videoElement.srcObject !== stream) {
              videoElement.srcObject = stream;
            }
            videoElement.load(); // Reload media element

            videoElement
              .play()
              .then(() => {
                console.log(
                  `🔥 VideoCallInterface: Video played successfully for: ${participant.username}`
                );
                // Mark video as playing, hide play button
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.id === participant.id ? { ...p, isVideoPaused: false } : p
                  )
                );
              })
              .catch((error) => {
                console.error(
                  `🔥 VideoCallInterface: Error playing video for: ${participant.username}`,
                  error
                );
                // Mark video as paused, show play button
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.id === participant.id ? { ...p, isVideoPaused: true } : p
                  )
                );
              });
          };

          const handleCanPlayThrough = () => {
            console.log(
              `🔥 Video hamid CAN PLAY THROUGH. Attempting playback.`,
              {
                videoElementPaused: videoElement.paused,
                videoElementEnded: videoElement.ended,
                videoElementAutoplay: videoElement.autoplay,
                streamActive: stream.active,
                streamVideoTracksEnabled: stream
                  .getVideoTracks()
                  .every((track) => track.enabled),
                streamAudioTracksEnabled: stream
                  .getAudioTracks()
                  .every((track) => track.enabled),
              }
            );
            // If not already playing, try to play when canplaythrough
            if (videoElement.paused) {
              handlePlayAttempt();
            }
          };

          const handlePlaying = () => {
            console.log(`🔥 Video ${participant.username} is PLAYING.`);
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === participant.id ? { ...p, isVideoPaused: false } : p
              )
            );
          };

          const handlePause = () => {
            console.log(`🔥 Video ${participant.username} is PAUSED.`);
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === participant.id ? { ...p, isVideoPaused: true } : p
              )
            );
          };

          const handleLoadedMetadata = () => {
            console.log(`🔥 Video ${participant.username} loaded metadata.`);
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === participant.id
                  ? { ...p, isVideoPaused: videoElement.paused }
                  : p
              )
            );
          };

          const handleLoadedData = () => {
            console.log(`🔥 Video ${participant.username} loaded data.`);
          };

          const handleCanPlay = () => {
            console.log(`🔥 Video ${participant.username} CAN PLAY.`);
          };

          videoElement.addEventListener("canplaythrough", handleCanPlayThrough);
          videoElement.addEventListener("playing", handlePlaying);
          videoElement.addEventListener("pause", handlePause);
          videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
          videoElement.addEventListener("loadeddata", handleLoadedData);
          videoElement.addEventListener("canplay", handleCanPlay);

          // Initial play attempt
          handlePlayAttempt();

          return () => {
            videoElement.removeEventListener(
              "canplaythrough",
              handleCanPlayThrough
            );
            videoElement.removeEventListener("playing", handlePlaying);
            videoElement.removeEventListener("pause", handlePause);
            videoElement.removeEventListener(
              "loadedmetadata",
              handleLoadedMetadata
            );
            videoElement.removeEventListener("loadeddata", handleLoadedData);
            videoElement.removeEventListener("canplay", handleCanPlay);
          };
        } else {
          console.log(
            "🔥 VideoCallInterface: Missing video element or stream for:",
            participant.username,
            {
              hasVideoElement: !!videoElement,
              hasStream: !!stream,
            }
          );
        }
      });
    }, [participants, remoteStreams]);

    // Handle mouse movement for auto-hide controls
    const handleMouseMove = useCallback(() => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isInCall && isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    }, [isInCall, isFullscreen]);

    // Handle auto-hide controls
    useEffect(() => {
      if (isInCall) {
        document.addEventListener("mousemove", handleMouseMove);
        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          clearTimeout(controlsTimeoutRef.current);
        };
      }
    }, [isInCall, isFullscreen, handleMouseMove]);

    // Connect to Janus server
    const connectToJanus = useCallback(() => {
      if (janusRef.current) {
        console.log("VideoCallInterface: Already connected to Janus");
        return;
      }

      janusRef.current = new window.Janus({
        server: JANUS_URL,
        success: () => {
          console.log("VideoCallInterface: Connected to Janus");
          setJanusConnected(true);
          setCallStatus("Connected to video server");
        },
        error: (error) => {
          console.error("VideoCallInterface: Failed to connect:", error);
          setConnectionError("Failed to connect to video server");
          setJanusConnected(false);
          onError?.("Failed to connect to video server");
        },
        destroyed: () => {
          console.log("VideoCallInterface: Janus connection destroyed");
          setJanusConnected(false);
          cleanup();
        },
      });
    }, [JANUS_URL, onError, cleanup]);

    // Start video call
    const startVideoCall = useCallback(async () => {
      console.log(
        "🔥 VideoCallInterface: startVideoCall() function called - isInCall:",
        isInCall,
        "janusConnected:",
        janusConnected
      );

      if (isInCall) {
        console.log("VideoCallInterface: Already in a call");
        return;
      }

      if (IS_DEMO_MODE) {
        console.log("VideoCallInterface: Starting demo video call");
        setIsInCall(true);
        setCallStatus("Demo video call active");
        startCallTimer();
        return;
      }

      try {
        setCallStatus("Starting video call...");

        // Get user media
        const stream = await getUserMedia();
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create or join room
        const room = roomId || (await generateRoomId());
        await createPublisher(stream);
        await joinRoom(room, stream);

        setIsInCall(true);
        setCallStatus("Video call active");
        startCallTimer();
        startQualityMonitoring();
      } catch (error) {
        console.error("VideoCallInterface: Failed to start video call:", error);
        setCallStatus("Failed to start video call");
        setConnectionError(error.message);
        onError?.(error.message);
        // Keep isInCall true so user can see the error and end the call
      }
    }, [
      IS_DEMO_MODE,
      roomId,
      onError,
      isInCall,
      janusConnected,
      getUserMedia,
      generateRoomId,
      createPublisher,
      joinRoom,
      startCallTimer,
      startQualityMonitoring,
    ]);

    // Get user media
    const getUserMedia = useCallback(async (constraints) => {
      const videoConstraints = constraints?.video
        ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          }
        : false;
      const audioConstraints = constraints?.audio
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          }
        : false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });
        console.log("VideoCallInterface: Got user media", stream);
        return stream;
      } catch (error) {
        console.error("VideoCallInterface: Failed to get user media:", error);
        throw new Error("Failed to access camera/microphone");
      }
    }, []);

    // Generate room ID
    const generateRoomId = useCallback(() => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      return `video_${user?.id || "anonymous"}_${timestamp}_${random}`;
    }, [user?.id]);

    // Start call timer
    const startCallTimer = useCallback(() => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(duration);
      }, 1000);
    }, []);

    // Start quality monitoring
    const startQualityMonitoring = useCallback(() => {
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }

      qualityCheckIntervalRef.current = setInterval(() => {
        // Simulate quality monitoring in demo mode
        if (IS_DEMO_MODE) {
          setNetworkStats({
            bitrate: Math.floor(Math.random() * 1000) + 500,
            packetLoss: Math.random() * 2,
            latency: Math.floor(Math.random() * 50) + 10,
          });

          const qualities = ["excellent", "good", "fair", "poor"];
          setConnectionQuality(
            qualities[Math.floor(Math.random() * qualities.length)]
          );
        } else {
          // Real quality monitoring would go here
          checkConnectionQuality();
        }
      }, 5000);
    }, [IS_DEMO_MODE, checkConnectionQuality]);

    // Check connection quality
    const checkConnectionQuality = useCallback(() => {
      if (!publisherRef.current) return;

      // This would implement real quality checking
      // For now, we'll use placeholder logic
      setConnectionQuality("good");
      setNetworkStats({
        bitrate: 750,
        packetLoss: 0.5,
        latency: 25,
      });
    }, []);

    // Toggle video
    const toggleVideo = useCallback(() => {
      if (!localStream) return;

      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
        console.log("VideoCallInterface: Video toggled:", !isVideoEnabled);
      }
    }, [localStream, isVideoEnabled]);

    // Toggle audio
    const toggleAudio = useCallback(() => {
      if (!localStream) return;

      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
        console.log("VideoCallInterface: Audio toggled:", !isAudioEnabled);
      }
    }, [localStream, isAudioEnabled]);

    // Toggle screen sharing
    const toggleScreenShare = useCallback(async () => {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenshareRef.current) {
          screenshareRef.current.getTracks().forEach((track) => track.stop());
          screenshareRef.current = null;
        }

        // Switch back to camera
        try {
          const stream = await getUserMedia();
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error(
            "VideoCallInterface: Failed to switch back to camera:",
            error
          );
        }

        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: true,
          });

          screenshareRef.current = screenStream;

          // Replace video track in local stream
          if (localStream) {
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = publisherRef.current?.pc
              ?.getSenders()
              ?.find((s) => s.track?.kind === "video");

            if (sender) {
              await sender.replaceTrack(videoTrack);
            }
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream;
          }

          setIsScreenSharing(true);

          // Handle screen share end
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            toggleScreenShare(); // Switch back to camera
          };
        } catch (error) {
          console.error(
            "VideoCallInterface: Failed to start screen sharing:",
            error
          );
          onError?.("Failed to start screen sharing");
        }
      }
    }, [isScreenSharing, localStream, getUserMedia, onError]);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
      if (!isFullscreen) {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if (containerRef.current?.webkitRequestFullscreen) {
          containerRef.current.webkitRequestFullscreen();
        } else if (containerRef.current?.msRequestFullscreen) {
          containerRef.current.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
    }, [isFullscreen]);

    // Handle fullscreen change
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.addEventListener("msfullscreenchange", handleFullscreenChange);

      return () => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "msfullscreenchange",
          handleFullscreenChange
        );
      };
    }, []);

    // End call
    const endCall = useCallback(() => {
      console.log("VideoCallInterface: Ending call");

      // Stop timers
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
        qualityCheckIntervalRef.current = null;
      }

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      // Stop screen share
      if (screenshareRef.current) {
        screenshareRef.current.getTracks().forEach((track) => track.stop());
        screenshareRef.current = null;
      }

      // Clean up video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      remoteVideoRefs.current.forEach((ref) => {
        if (ref.current) {
          ref.current.srcObject = null;
        }
      });

      // Reset state
      setIsInCall(false);
      setIsPublishing(false);
      setCallDuration(0);
      setParticipants([]);
      setRemoteStreams(new Map());
      setSubscriptions(new Map());
      setIsScreenSharing(false);
      setCallStatus("Call ended");

      // Exit fullscreen if active
      if (isFullscreen) {
        toggleFullscreen();
      }

      // Notify parent
      onCallEnd?.();
    }, [localStream, isFullscreen, toggleFullscreen, onCallEnd]);

    // Cleanup on unmount
    const cleanup = useCallback(() => {
      console.log("VideoCallInterface: Cleanup");

      // Clean up Janus connection
      if (publisherRef.current) {
        publisherRef.current.detach();
        publisherRef.current = null;
      }

      subscribersRef.current.forEach((subscriber) => {
        subscriber.detach();
      });
      subscribersRef.current.clear();

      if (janusRef.current) {
        janusRef.current.destroy();
        janusRef.current = null;
      }

      // Clean up streams and timers
      endCall();
    }, [endCall]);

    // Janus VideoRoom operations
    const createPublisher = useCallback(
      async (stream) => {
        console.log("VideoCallInterface: Creating publisher");

        if (IS_DEMO_MODE) {
          // Add demo participants for visual testing
          setParticipants([
            { id: "demo_1", username: "Demo User 1" },
            { id: "demo_2", username: "Demo User 2" },
          ]);
          return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
          if (!janusRef.current) {
            reject(new Error("Janus not connected"));
            return;
          }

          janusRef.current.attach({
            plugin: VIDEOROOM_PLUGIN,
            success: (pluginHandle) => {
              console.log("VideoCallInterface: Publisher plugin attached");
              publisherRef.current = pluginHandle;

              // Create room first
              const createRoomRequest = {
                request: "create",
                room:
                  parseInt(roomId.replace(/\D/g, ""), 10) ||
                  Math.floor(Math.random() * 1000000),
                permanent: false,
                description: `Video call room for ${user?.username}`,
                publishers: 10,
                bitrate: 512000,
                fir_freq: 10,
                videocodec: "vp8,h264",
                audiocodec: "opus",
                record: false,
                rec_dir: "",
              };

              pluginHandle.send({
                message: createRoomRequest,
                success: (result) => {
                  console.log(
                    "VideoCallInterface: Room created/exists:",
                    result
                  );
                  // Join as publisher
                  joinAsPublisher(pluginHandle, createRoomRequest.room, stream)
                    .then(resolve)
                    .catch(reject);
                },
                error: (error) => {
                  console.log(
                    "VideoCallInterface: Room creation failed, trying to join existing:",
                    error
                  );
                  // Room might already exist, try to join
                  joinAsPublisher(pluginHandle, createRoomRequest.room, stream)
                    .then(resolve)
                    .catch(reject);
                },
              });
            },
            error: (error) => {
              console.error(
                "VideoCallInterface: Failed to attach publisher plugin:",
                error
              );
              reject(error);
            },
            onmessage: handlePublisherMessage,
            onlocalstream: (stream) => {
              console.log("VideoCallInterface: Local stream received");
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
              }
            },
            onremotestream: () => {
              // Publishers don't receive remote streams
            },
            oncleanup: () => {
              console.log("VideoCallInterface: Publisher cleanup");
            },
          });
        });
      },
      [
        IS_DEMO_MODE,
        janusRef,
        VIDEOROOM_PLUGIN,
        roomId,
        user,
        joinAsPublisher,
        handlePublisherMessage,
        localVideoRef,
      ]
    );

    const joinAsPublisher = useCallback(
      async (pluginHandle, roomId, stream) => {
        return new Promise((resolve, reject) => {
          const register = {
            request: "join",
            room: roomId,
            ptype: "publisher",
            display: user?.username || "Anonymous",
          };

          pluginHandle.send({
            message: register,
            success: (result) => {
              console.log("VideoCallInterface: Joined as publisher:", result);

              // Configure media
              const publishConfig = {
                audioSend: true,
                videoSend: true,
                stream: stream,
              };

              pluginHandle.createOffer({
                media: publishConfig,
                success: (jsep) => {
                  console.log("VideoCallInterface: Created offer:", jsep);

                  const publish = {
                    request: "configure",
                    audio: true,
                    video: true,
                  };

                  pluginHandle.send({
                    message: publish,
                    jsep: jsep,
                    success: (result) => {
                      console.log(
                        "VideoCallInterface: Published successfully:",
                        result
                      );
                      setCurrentRoomId(roomId);
                      resolve(result);
                    },
                    error: (error) => {
                      console.error(
                        "VideoCallInterface: Failed to publish:",
                        error
                      );
                      reject(error);
                    },
                  });
                },
                error: (error) => {
                  console.error(
                    "VideoCallInterface: Failed to create offer:",
                    error
                  );
                  reject(error);
                },
              });
            },
            error: (error) => {
              console.error(
                "VideoCallInterface: Failed to join as publisher:",
                error
              );
              reject(error);
            },
          });
        });
      },
      [user, setCurrentRoomId]
    );

    const joinRoom = useCallback(
      async (roomId, stream) => {
        console.log("VideoCallInterface: Joining room:", roomId);

        if (IS_DEMO_MODE) {
          // Add demo participants for visual testing
          setParticipants([
            { id: "demo_1", username: "Demo User 1" },
            { id: "demo_2", username: "Demo User 2" },
          ]);
          return Promise.resolve();
        }

        // First create publisher, then subscribe to existing feeds
        await createPublisher(stream);

        // Note: Existing publishers should be found automatically in handlePublisherMessage
        // when the 'joined' event is received with msg.publishers array
        console.log(
          "🔥 VideoCallInterface: Joined room successfully, waiting for existing publishers in handlePublisherMessage"
        );

        return Promise.resolve();
      },
      [IS_DEMO_MODE, createPublisher, setParticipants]
    );

    const listParticipants = (roomId) => {
      if (!publisherRef.current) return;

      const listRequest = {
        request: "listparticipants",
        room: roomId,
      };

      publisherRef.current.send({
        message: listRequest,
        success: (result) => {
          console.log("VideoCallInterface: Participants list:", result);
          if (result.participants) {
            result.participants.forEach((participant) => {
              if (
                participant.publisher &&
                participant.id !== publisherRef.current.getId()
              ) {
                console.log(
                  "🔥 VideoCallInterface: Found participant to subscribe to:",
                  participant.display,
                  "ID:",
                  participant.id,
                  "Room:",
                  roomId
                );
                subscribeToFeed(participant.id, participant.display, roomId);
              }
            });
          }
        },
        error: (error) => {
          console.error(
            "VideoCallInterface: Failed to list participants:",
            error
          );
        },
      });
    };

    const subscribeToFeed = useCallback(
      (feedId, feedDisplay, roomId) => {
        console.log("🔥 VideoCallInterface: === SUBSCRIBING TO FEED ===", {
          feedId,
          feedDisplay,
          roomId,
          isIncoming,
          currentUser: user?.username,
          janusConnected: !!janusRef.current,
        });

        janusRef.current.attach({
          plugin: VIDEOROOM_PLUGIN,
          success: (pluginHandle) => {
            console.log(
              "VideoCallInterface: Subscriber plugin attached for:",
              feedDisplay
            );

            const subscribe = {
              request: "join",
              room: roomId,
              ptype: "subscriber",
              feed: feedId,
            };

            pluginHandle.send({
              message: subscribe,
              success: (result) => {
                console.log("VideoCallInterface: Subscribed to feed:", result);

                subscribersRef.current.set(feedId, pluginHandle);

                // Add to participants list
                setParticipants((prev) => {
                  const exists = prev.some((p) => p.id === feedId);
                  if (!exists) {
                    console.log(
                      "🔥 VideoCallInterface: Adding participant:",
                      feedDisplay,
                      "ID:",
                      feedId
                    );
                    return [...prev, { id: feedId, username: feedDisplay }];
                  }
                  console.log(
                    "🔥 VideoCallInterface: Participant already exists:",
                    feedDisplay
                  );
                  return prev;
                });
              },
              error: (error) => {
                console.error(
                  "VideoCallInterface: Failed to subscribe:",
                  error
                );
              },
            });
          },
          error: (error) => {
            console.error(
              "VideoCallInterface: Failed to attach subscriber:",
              error
            );
          },
          onmessage: (msg, jsep) => {
            handleSubscriberMessage(msg, jsep, feedId);
          },
          onremotetrack: (track, mid, on) => {
            console.log(
              "🔥 VideoCallInterface: Remote track received for:",
              feedDisplay,
              "Track kind:",
              track.kind,
              "Track ID:",
              track.id,
              "Mid:",
              mid,
              "On:",
              on
            );

            if (on) {
              // Track is being added
              console.log(
                "🔥 VideoCallInterface: Track being added:",
                track.kind,
                "for",
                feedDisplay
              );

              // Create or update MediaStream
              let stream = remoteStreamsRef.current.get(feedId);
              if (!stream) {
                stream = new MediaStream();
                console.log(
                  "🔥 VideoCallInterface: Created new MediaStream for:",
                  feedDisplay
                );
              }

              // Add track to stream
              stream.addTrack(track);

              // Update remote streams ref and state
              remoteStreamsRef.current.set(feedId, stream);
              setRemoteStreams((prev) => {
                const newMap = new Map(prev);
                newMap.set(feedId, stream);
                console.log(
                  "🔥 VideoCallInterface: Updated remote streams via onremotetrack, total:",
                  newMap.size,
                  "Feed ID:",
                  feedId
                );
                return newMap;
              });

              // Immediate video element attachment
              setTimeout(() => {
                const videoElement = remoteVideoRefs.current.get(feedId);
                if (videoElement && stream) {
                  console.log(
                    "🔥 VideoCallInterface: ATTEMPTING IMMEDIATE track attachment for:",
                    feedDisplay,
                    {
                      streamTracks: stream.getTracks().length,
                      streamActive: stream.active,
                      streamReadyState: stream.readyState,
                      videoElementReadyState: videoElement.readyState,
                      videoElementNetworkState: videoElement.networkState,
                    }
                  );

                  videoElement.srcObject = stream;
                  videoElement.load(); // Explicitly load the media

                  videoElement.onwaiting = () =>
                    console.log(`🔥 Video ${feedDisplay} is WAITING for data.`);
                  videoElement.onstalled = () =>
                    console.log(`🔥 Video ${feedDisplay} is STALLED.`);
                  videoElement.onloadedmetadata = () =>
                    console.log(`🔥 Video ${feedDisplay} loaded metadata.`);
                  videoElement.onloadeddata = () =>
                    console.log(`🔥 Video ${feedDisplay} loaded data.`);
                  videoElement.oncanplay = () =>
                    console.log(`🔥 Video ${feedDisplay} CAN PLAY.`);
                  videoElement.onplaying = () =>
                    console.log(`🔥 Video ${feedDisplay} is PLAYING.`);

                  // Use oncanplaythrough for more robust playback
                  videoElement.oncanplaythrough = function () {
                    // Detach and re-attach srcObject to ensure fresh state if needed
                    // This is an aggressive workaround for persistent aborts
                    if (videoElement.srcObject !== stream) {
                      videoElement.srcObject = null;
                      videoElement.srcObject = stream;
                      videoElement.load();
                    }

                    console.log(
                      `🔥 Video ${feedDisplay} CAN PLAY THROUGH. Attempting playback.`,
                      {
                        videoElementPaused: videoElement.paused,
                        videoElementEnded: videoElement.ended,
                        videoElementAutoplay: videoElement.autoplay, // New log
                        streamActive: stream.active,
                        streamVideoTracksEnabled: stream
                          .getVideoTracks()
                          .every((track) => track.enabled),
                        streamAudioTracksEnabled: stream
                          .getAudioTracks()
                          .every((track) => track.enabled),
                      }
                    );

                    // Add another micro-delay before attempting to play after canplaythrough
                    setTimeout(() => {
                      videoElement
                        .play()
                        .then(() => {
                          console.log(
                            "🔥 VideoCallInterface: Video played successfully for:",
                            feedDisplay
                          );
                        })
                        .catch((e) => {
                          console.error(
                            "🔥 VideoCallInterface: Video play failed for:",
                            feedDisplay,
                            "DOMException:",
                            e.name,
                            e.message,
                            e
                          );
                          // Provide a user prompt to unmute if necessary, as a last resort
                          if (
                            e.name === "NotAllowedError" ||
                            e.name === "AbortError"
                          ) {
                            console.warn(
                              "🔥 VideoCallInterface: Autoplay prevented. User interaction required to unmute."
                            );
                            // Here you might want to show a UI element like an "Unmute" button
                          }
                        });
                    }, 10); // Very short delay

                    this.oncanplaythrough = null; // Ensure it only runs once
                  };
                } else {
                  console.log(
                    "🔥 VideoCallInterface: Missing video element for track attachment:",
                    feedDisplay,
                    "Has element:",
                    !!videoElement,
                    "Has stream:",
                    !!stream
                  );
                }
              }, 100);
            } else {
              // Track is being removed
              console.log(
                "🔥 VideoCallInterface: Track being removed:",
                track.kind,
                "for",
                feedDisplay
              );
            }
          },
          oncleanup: () => {
            console.log(
              "VideoCallInterface: Subscriber cleanup for:",
              feedDisplay
            );
            subscribersRef.current.delete(feedId);
            remoteStreamsRef.current.delete(feedId);
            setParticipants((prev) => prev.filter((p) => p.id !== feedId));
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              newMap.delete(feedId);
              return newMap;
            });
          },
        });
      },
      [
        isIncoming,
        user,
        janusRef,
        VIDEOROOM_PLUGIN,
        handleSubscriberMessage,
        subscribersRef,
        setParticipants,
        remoteStreamsRef,
        setRemoteStreams,
        remoteVideoRefs,
      ]
    );

    const handlePublisherMessage = useCallback(
      (msg, jsep) => {
        console.log("🔥 VideoCallInterface: Publisher message received:", {
          event: msg.videoroom,
          room: msg.room,
          publishers: msg.publishers?.length || 0,
          publishersData: msg.publishers,
          isIncoming: isIncoming,
          currentUser: user?.username,
          selectedReceiver: selectedReceiver?.username,
        });

        const event = msg.videoroom;

        if (event === "joined") {
          console.log(
            "🔥 VideoCallInterface: Successfully joined as publisher"
          );
          setIsPublishing(true);

          // List existing participants
          if (msg.publishers && msg.publishers.length > 0) {
            console.log(
              "🔥 VideoCallInterface: Found existing publishers:",
              msg.publishers.length,
              "Publishers:",
              msg.publishers
            );
            msg.publishers.forEach((publisher) => {
              console.log(
                "🔥 VideoCallInterface: Subscribing to existing publisher:",
                publisher.display,
                "ID:",
                publisher.id,
                "Room:",
                msg.room
              );
              subscribeToFeed(publisher.id, publisher.display, msg.room);
            });
          } else {
            console.log(
              "🔥 VideoCallInterface: No existing publishers found - this might be the issue!",
              {
                publishersExists: !!msg.publishers,
                publishersLength: msg.publishers?.length,
                publishersData: msg.publishers,
                isIncoming: isIncoming,
              }
            );
          }
        } else if (event === "event") {
          if (msg.publishers) {
            // New publisher joined
            console.log(
              "🔥 VideoCallInterface: New publishers joined:",
              msg.publishers.length
            );
            msg.publishers.forEach((publisher) => {
              console.log(
                "🔥 VideoCallInterface: Subscribing to new publisher:",
                publisher.display,
                "ID:",
                publisher.id
              );
              subscribeToFeed(publisher.id, publisher.display, msg.room);
            });
          } else if (msg.leaving) {
            // Publisher left
            console.log("VideoCallInterface: Publisher left:", msg.leaving);
            const subscriber = subscribersRef.current.get(msg.leaving);
            if (subscriber) {
              subscriber.detach();
            }
          } else if (msg.unpublished) {
            // Publisher stopped publishing
            console.log(
              "VideoCallInterface: Publisher unpublished:",
              msg.unpublished
            );
            const subscriber = subscribersRef.current.get(msg.unpublished);
            if (subscriber) {
              subscriber.detach();
            }
          }
        }

        if (jsep) {
          console.log("VideoCallInterface: Handling remote JSEP:", jsep);
          publisherRef.current.handleRemoteJsep({ jsep: jsep });
        }
      },
      [
        isIncoming,
        user,
        selectedReceiver,
        setIsPublishing,
        subscribeToFeed,
        subscribersRef,
        publisherRef,
      ]
    );

    const handleSubscriberMessage = useCallback(
      (msg, jsep, feedId) => {
        console.log(
          "VideoCallInterface: Subscriber message for feed",
          feedId,
          ":",
          msg
        );

        const event = msg.videoroom;

        if (event === "attached") {
          console.log(
            "VideoCallInterface: Subscriber attached to feed:",
            feedId
          );
        }

        if (jsep) {
          console.log(
            "VideoCallInterface: Handling subscriber JSEP for feed",
            feedId
          );
          const subscriber = subscribersRef.current.get(feedId);
          if (subscriber) {
            subscriber.createAnswer({
              jsep: jsep,
              media: { audioSend: false, videoSend: false },
              success: (ourJsep) => {
                console.log(
                  "VideoCallInterface: Created answer for feed",
                  feedId
                );
                const body = { request: "start", room: currentRoomId };
                subscriber.send({ message: body, jsep: ourJsep });
              },
              error: (error) => {
                console.error(
                  "VideoCallInterface: Failed to create answer for feed",
                  feedId,
                  ":",
                  error
                );
              },
            });
          }
        }
      },
      [subscribersRef, currentRoomId]
    );

    // Format call duration
    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    };

    // Get connection quality indicator
    const getQualityIndicator = () => {
      switch (connectionQuality) {
        case "excellent":
          return { icon: FaSignal, color: "text-green-500", bars: 4 };
        case "good":
          return { icon: FaSignal, color: "text-green-400", bars: 3 };
        case "fair":
          return { icon: FaSignal, color: "text-yellow-500", bars: 2 };
        case "poor":
          return { icon: FaSignal, color: "text-red-500", bars: 1 };
        default:
          return { icon: FaWifi, color: "text-gray-500", bars: 0 };
      }
    };

    // If not in call, don't render anything
    if (!isInCall && !isIncoming) {
      console.log(
        "🔥 VideoCallInterface: NOT RENDERING - isInCall:",
        isInCall,
        "isIncoming:",
        isIncoming
      );
      return null;
    }

    console.log(
      "🔥 VideoCallInterface: RENDERING - isInCall:",
      isInCall,
      "isIncoming:",
      isIncoming,
      "callState:",
      callState
    );

    // Incoming call UI
    if (isIncoming && !isInCall) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-slideInUp">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-avatar-glow">
                <FaUser className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Incoming Video Call
              </h3>
              <p className="text-gray-600">
                {incomingCallData?.callerName ||
                  selectedReceiver?.username ||
                  "Unknown"}
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={rejectCall}
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors animate-button-press"
              >
                <FaPhoneSlash className="w-6 h-6" />
              </button>
              <button
                onClick={acceptCall}
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full transition-colors animate-button-press"
              >
                <FaVideo className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`video-call-container ${
          isFullscreen
            ? "fixed inset-0 z-50 bg-black"
            : "fixed inset-0 z-40 bg-gray-900"
        } flex flex-col overflow-hidden`}
        onMouseMove={handleMouseMove}
      >
        {/* Header Bar */}
        <div
          className={`bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 flex justify-between items-center transition-all duration-300 border-b border-gray-700 ${
            isFullscreen && !showControls
              ? "opacity-0 -translate-y-full"
              : "opacity-100 translate-y-0"
          } flex-shrink-0 backdrop-blur-sm`}
        >
          <div className="flex items-center space-x-4">
            {/* Call Status Indicator */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0 left-0 animate-ping"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  {formatDuration(callDuration)}
                </span>
                <span className="text-xs text-gray-300">Live</span>
              </div>
            </div>

            {/* Call Title */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <FaVideo className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-semibold">
                  {selectedReceiver?.username || user?.username || "Video Call"}
                </span>
                <span className="text-xs text-gray-300">
                  {participants.length + 1} participant
                  {participants.length !== 0 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Connection Quality */}
            <div className="hidden lg:flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full">
              {(() => {
                const quality = getQualityIndicator();
                return <quality.icon className={`w-4 h-4 ${quality.color}`} />;
              })()}
              <span className="text-sm text-gray-300 capitalize">
                {connectionQuality}
              </span>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
              title="Toggle fullscreen"
            >
              {isFullscreen ? (
                <FaCompress className="w-5 h-5 group-hover:scale-110 transition-transform" />
              ) : (
                <FaExpand className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>
        </div>

        {/* Main Video Area */}
        <div className="flex-1 relative bg-gray-900 overflow-hidden">
          {/* Speaker View Layout */}
          <div className="h-full flex">
            {/* Main Speaker Area */}
            <div className="flex-1 relative">
              {participants.length > 0 ? (
                /* Show the first participant as main speaker */
                <div className="w-full h-full relative bg-gray-900">
                  <video
                    ref={(el) => {
                      if (el && participants[0]) {
                        console.log(
                          "🔥 VideoCallInterface: Setting MAIN speaker video ref for:",
                          participants[0].username,
                          "ID:",
                          participants[0].id
                        );
                        remoteVideoRefs.current.set(participants[0].id, el);
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={true} // Temporarily mute to test autoplay policy
                    controls={false}
                    className="w-full h-full object-cover"
                    style={{
                      backgroundColor: "#1f2937",
                    }}
                    onLoadStart={() =>
                      console.log(
                        "🔥 MAIN Video loadstart for:",
                        participants[0]?.username
                      )
                    }
                    onLoadedMetadata={() =>
                      console.log(
                        "🔥 MAIN Video loadedmetadata for:",
                        participants[0]?.username
                      )
                    }
                    onCanPlay={() =>
                      console.log(
                        "🔥 MAIN Video canplay for:",
                        participants[0]?.username
                      )
                    }
                    onPlay={() =>
                      console.log(
                        "🔥 MAIN Video play for:",
                        participants[0]?.username
                      )
                    }
                    onError={(e) =>
                      console.error(
                        "🔥 MAIN Video error for:",
                        participants[0]?.username,
                        e
                      )
                    }
                  />
                  {participants[0]?.isVideoPaused && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <button
                        onClick={() => {
                          const videoElement = remoteVideoRefs.current.get(
                            participants[0].id
                          );
                          if (videoElement) {
                            videoElement
                              .play()
                              .catch((e) =>
                                console.error(
                                  "Error playing video manually:",
                                  e
                                )
                              );
                          }
                        }}
                        className="p-4 bg-blue-500 rounded-full text-white text-2xl hover:bg-blue-600 transition-colors"
                      >
                        <FaPlay />
                      </button>
                    </div>
                  )}

                  {/* Speaker Name Badge */}
                  <div className="absolute bottom-6 left-6 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">
                        {participants[0]?.username || "Speaker"}
                      </span>
                    </div>
                  </div>

                  {/* Video Controls Overlay */}
                  <div className="absolute top-4 right-4 flex space-x-2">
                    {!isVideoEnabled && (
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Camera Off
                      </div>
                    )}
                    {!isAudioEnabled && (
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Muted
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Waiting State */
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <FaUsers className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">
                      Waiting for others to join...
                    </h3>
                    <p className="text-gray-400 text-lg">
                      {isIncoming
                        ? "Connecting to the call..."
                        : "Share this call to invite participants"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar with Local Video and Additional Participants */}
            <div className="w-80 bg-gray-950 border-l border-gray-700 flex flex-col p-4 space-y-4">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video shadow-lg ring-2 ring-blue-500/30">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <div className="text-center text-white">
                      <FaVideoSlash className="w-8 h-8 mx-auto mb-2 opacity-75" />
                      <p className="text-sm opacity-75">Camera Off</p>
                    </div>
                  </div>
                )}
                {/* Local Video Badge */}
                <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>You {isScreenSharing && "(Screen)"}</span>
                  </div>
                </div>
                {/* Local Video Controls */}
                <div className="absolute top-2 right-2 flex space-x-1">
                  {!isAudioEnabled && (
                    <div className="bg-red-500 p-1 rounded">
                      <FaMicrophoneSlash className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Participants Grid */}
              {participants.length > 1 && (
                <div className="flex-1 space-y-3 overflow-y-auto">
                  <h4 className="text-white font-medium text-sm uppercase tracking-wider">
                    Other Participants ({participants.length - 1})
                  </h4>
                  <div className="space-y-3">
                    {participants.slice(1).map((participant, index) => (
                      <div
                        key={participant.id || index}
                        className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video shadow-md hover:ring-2 hover:ring-blue-500/50 transition-all cursor-pointer"
                      >
                        <video
                          ref={(el) => {
                            if (el) {
                              console.log(
                                "🔥 VideoCallInterface: Setting sidebar video ref for:",
                                participant.username,
                                "ID:",
                                participant.id
                              );
                              remoteVideoRefs.current.set(participant.id, el);
                            }
                          }}
                          autoPlay
                          playsInline
                          muted={true} // Temporarily mute to test autoplay policy
                          controls={false}
                          className="w-full h-full object-cover"
                          style={{ backgroundColor: "#374151" }}
                        />
                        {participant.isVideoPaused && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                            <button
                              onClick={() => {
                                const videoElement =
                                  remoteVideoRefs.current.get(participant.id);
                                if (videoElement) {
                                  videoElement
                                    .play()
                                    .catch((e) =>
                                      console.error(
                                        "Error playing sidebar video manually:",
                                        e
                                      )
                                    );
                                }
                              }}
                              className="p-3 bg-blue-500 rounded-full text-white text-lg hover:bg-blue-600 transition-colors"
                            >
                              <FaPlay />
                            </button>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                          {participant.username || `User ${index + 2}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar */}
        <div
          className={`bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700 p-6 transition-all duration-300 ${
            isFullscreen && !showControls
              ? "opacity-0 translate-y-full"
              : "opacity-100 translate-y-0"
          } flex-shrink-0 backdrop-blur-sm`}
        >
          <div className="flex justify-center items-center space-x-4">
            {/* Audio Control */}
            <button
              onClick={toggleAudio}
              className={`relative p-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                isAudioEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
                  : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/25 shadow-xl"
              }`}
              title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {isAudioEnabled ? (
                <FaMicrophone className="w-6 h-6" />
              ) : (
                <FaMicrophoneSlash className="w-6 h-6" />
              )}
              {!isAudioEnabled && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              )}
            </button>

            {/* Video Control */}
            <button
              onClick={toggleVideo}
              className={`relative p-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                isVideoEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
                  : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/25 shadow-xl"
              }`}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoEnabled ? (
                <FaVideo className="w-6 h-6" />
              ) : (
                <FaVideoSlash className="w-6 h-6" />
              )}
              {!isVideoEnabled && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
              )}
            </button>

            {/* Screen Share Control */}
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                isScreenSharing
                  ? "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/25 shadow-xl"
                  : "bg-gray-700 hover:bg-gray-600 text-white shadow-lg"
              }`}
              title={isScreenSharing ? "Stop screen sharing" : "Share screen"}
            >
              <FaDesktop className="w-6 h-6" />
            </button>

            {/* End Call */}
            <button
              onClick={endCall}
              className="p-4 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 transform hover:scale-105 shadow-red-500/25 shadow-xl"
              title="End call"
            >
              <FaPhoneSlash className="w-6 h-6" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
              title="Settings"
            >
              <FaCog className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Network Stats Overlay */}
        {networkStats.bitrate > 0 && (
          <div className="absolute top-20 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs space-y-1 backdrop-blur-sm">
            <div className="flex justify-between space-x-4">
              <span>Bitrate:</span>
              <span className="text-green-400">
                {networkStats.bitrate} kbps
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span>Loss:</span>
              <span
                className={
                  networkStats.packetLoss > 1
                    ? "text-red-400"
                    : "text-green-400"
                }
              >
                {networkStats.packetLoss.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between space-x-4">
              <span>Latency:</span>
              <span
                className={
                  networkStats.latency > 100
                    ? "text-yellow-400"
                    : "text-green-400"
                }
              >
                {networkStats.latency} ms
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

VideoCallInterface.defaultProps = {
  user: null, // Should be an object if available, otherwise null. Component should handle null check.
  selectedReceiver: null,
  callState: "idle",
  roomId: null,
  isIncoming: false,
  // Add other props here if they are passed to VideoCallInterface and might be undefined
  // For example:
  // janus: null,
  // remoteFeeds: [],
  // localStream: null,
  // onHangup: () => {},
  // onAccept: () => {},
  // onReject: () => {},
  // onCall: () => {},
};

VideoCallInterface.displayName = "VideoCallInterface";

export default VideoCallInterface;
