import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaUsers,
  FaCog,
  FaExpand,
  FaCompress,
} from "react-icons/fa";

const JanusVideoCall = forwardRef(
  ({ user, selectedReceiver, onCallEnd, getUserName }, ref) => {
    const [isInCall, setIsInCall] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [callStatus, setCallStatus] = useState("");
    const [callDuration, setCallDuration] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [roomId, setRoomId] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [subscriptions, setSubscriptions] = useState(new Map());
    const [janusConnected, setJanusConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Check if we're in demo mode (Render deployment)
    const IS_DEMO_MODE =
      typeof window !== "undefined" &&
      (window.location.hostname.includes("onrender.com") ||
        window.location.hostname.includes("render.com"));

    // Janus-specific refs
    const janusRef = useRef(null);
    const publisherRef = useRef(null);
    const subscribersRef = useRef(new Map());
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const durationIntervalRef = useRef(null);

    // Janus configuration
    const JANUS_URL =
      process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
    const JANUS_HTTP_URL =
      process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

    // VideoRoom plugin name
    const VIDEOROOM_PLUGIN = "janus.plugin.videoroom";

    // Expose functions to parent component
    useImperativeHandle(ref, () => ({
      startVideoCall: () => {
        console.log("JanusVideoCall: startVideoCall called");
        startVideoCall();
      },
      getCallStatus: () => {
        return {
          isInCall: IS_DEMO_MODE ? true : isInCall,
          isVideoEnabled,
          isAudioEnabled,
          callStatus,
          participants: participants.length,
          roomId,
          janusConnected: IS_DEMO_MODE ? true : janusConnected,
        };
      },
      toggleVideo: () => {
        toggleVideo();
      },
      toggleAudio: () => {
        toggleAudio();
      },
      endCall: () => {
        endCall();
      },
    }));

    // Initialize Janus connection
    useEffect(() => {
      if (IS_DEMO_MODE) {
        console.log("JanusVideoCall: Running in demo mode");
        setJanusConnected(true);
        setCallStatus("Demo mode - Video calling simulated");
        return;
      }

      const initializeJanus = () => {
        if (
          typeof window !== "undefined" &&
          window.Janus &&
          window.adapterLoaded
        ) {
          console.log(
            "JanusVideoCall: Both adapter and Janus loaded, initializing..."
          );

          window.Janus.init({
            debug: "all",
            callback: () => {
              console.log("JanusVideoCall: Janus initialized");
              connectToJanus();
            },
            error: (error) => {
              console.error(
                "JanusVideoCall: Janus initialization failed:",
                error
              );
              setConnectionError("Failed to initialize Janus library");
            },
          });
        } else {
          console.log("JanusVideoCall: Waiting for libraries to load...", {
            janus: !!window.Janus,
            adapter: !!window.adapterLoaded,
          });
          setTimeout(initializeJanus, 1000);
        }
      };

      initializeJanus();

      return () => {
        cleanup();
      };
    }, []);

    const connectToJanus = () => {
      if (janusRef.current) {
        console.log("JanusVideoCall: Already connected to Janus");
        return;
      }

      janusRef.current = new window.Janus({
        server: JANUS_URL,
        success: () => {
          console.log("JanusVideoCall: Connected to Janus");
          setJanusConnected(true);
          setCallStatus("Connected to Janus server");
        },
        error: (error) => {
          console.error("JanusVideoCall: Failed to connect to Janus:", error);
          setConnectionError("Failed to connect to Janus server");
          setJanusConnected(false);
        },
        destroyed: () => {
          console.log("JanusVideoCall: Janus connection destroyed");
          setJanusConnected(false);
        },
      });
    };

    const startVideoCall = async () => {
      if (IS_DEMO_MODE) {
        console.log("JanusVideoCall: Starting demo video call");
        setIsInCall(true);
        setCallStatus("Demo video call active");
        startCallTimer();
        return;
      }

      if (!janusRef.current) {
        console.error("JanusVideoCall: Janus not connected");
        return;
      }

      try {
        setCallStatus("Starting video call...");

        // Generate or use existing room ID
        const targetRoomId = generateRoomId(
          selectedReceiver?.username || "default"
        );
        setRoomId(targetRoomId);

        // Get user media
        const stream = await getUserMedia({
          video: isVideoEnabled,
          audio: isAudioEnabled,
        });

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create publisher
        await createPublisher(targetRoomId, stream);

        setIsInCall(true);
        setIsPublishing(true);
        setCallStatus("Video call active");
        startCallTimer();
      } catch (error) {
        console.error("JanusVideoCall: Failed to start video call:", error);
        setCallStatus("Failed to start video call");
        setConnectionError(error.message);
      }
    };

    const createPublisher = (roomId, stream) => {
      return new Promise((resolve, reject) => {
        janusRef.current.attach({
          plugin: VIDEOROOM_PLUGIN,
          success: (pluginHandle) => {
            console.log("JanusVideoCall: Publisher attached");
            publisherRef.current = pluginHandle;

            // Join the room as publisher
            const joinRequest = {
              request: "join",
              room: roomId,
              ptype: "publisher",
              display: user?.username || "Anonymous",
            };

            pluginHandle.send({
              message: joinRequest,
              success: (result) => {
                console.log(
                  "JanusVideoCall: Joined room as publisher:",
                  result
                );

                // Configure publisher with media
                configurePublisher(stream)
                  .then(() => resolve())
                  .catch(reject);
              },
              error: (error) => {
                console.error("JanusVideoCall: Failed to join room:", error);
                reject(error);
              },
            });
          },
          error: (error) => {
            console.error("JanusVideoCall: Failed to attach publisher:", error);
            reject(error);
          },
          onmessage: handlePublisherMessage,
          onlocalstream: (stream) => {
            console.log("JanusVideoCall: Local stream received");
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          },
          onremotestream: () => {
            // Publishers don't receive remote streams
          },
        });
      });
    };

    const configurePublisher = (stream) => {
      return new Promise((resolve, reject) => {
        publisherRef.current.createOffer({
          media: {
            audioRecv: false,
            videoRecv: false,
            audioSend: isAudioEnabled,
            videoSend: isVideoEnabled,
          },
          stream: stream,
          success: (jsep) => {
            console.log("JanusVideoCall: Publisher offer created");

            const publishRequest = {
              request: "configure",
              audio: isAudioEnabled,
              video: isVideoEnabled,
            };

            publisherRef.current.send({
              message: publishRequest,
              jsep: jsep,
              success: (result) => {
                console.log("JanusVideoCall: Publisher configured:", result);
                resolve();
              },
              error: (error) => {
                console.error(
                  "JanusVideoCall: Failed to configure publisher:",
                  error
                );
                reject(error);
              },
            });
          },
          error: (error) => {
            console.error("JanusVideoCall: Failed to create offer:", error);
            reject(error);
          },
        });
      });
    };

    const handlePublisherMessage = (msg, jsep) => {
      console.log("JanusVideoCall: Publisher message:", msg);

      if (jsep) {
        publisherRef.current.handleRemoteJsep({ jsep: jsep });
      }

      const event = msg.videoroom;
      if (event === "joined") {
        // Handle publishers list
        if (msg.publishers) {
          msg.publishers.forEach((publisher) => {
            subscribeToPublisher(publisher);
          });
        }
      } else if (event === "event") {
        if (msg.publishers) {
          // New publishers joined
          msg.publishers.forEach((publisher) => {
            subscribeToPublisher(publisher);
          });
        }
        if (msg.leaving) {
          // Publisher left
          unsubscribeFromPublisher(msg.leaving);
        }
      }
    };

    const subscribeToPublisher = (publisher) => {
      console.log("JanusVideoCall: Subscribing to publisher:", publisher);

      janusRef.current.attach({
        plugin: VIDEOROOM_PLUGIN,
        success: (pluginHandle) => {
          console.log(
            "JanusVideoCall: Subscriber attached for:",
            publisher.display
          );

          subscribersRef.current.set(publisher.id, pluginHandle);

          const subscribeRequest = {
            request: "join",
            room: roomId,
            ptype: "subscriber",
            feed: publisher.id,
          };

          pluginHandle.send({
            message: subscribeRequest,
            success: (result) => {
              console.log("JanusVideoCall: Subscribed to publisher:", result);
            },
            error: (error) => {
              console.error("JanusVideoCall: Failed to subscribe:", error);
            },
          });
        },
        error: (error) => {
          console.error("JanusVideoCall: Failed to attach subscriber:", error);
        },
        onmessage: (msg, jsep) =>
          handleSubscriberMessage(msg, jsep, publisher.id),
        onremotestream: (stream) => {
          console.log(
            "JanusVideoCall: Remote stream received from:",
            publisher.display
          );
          handleRemoteStream(stream, publisher);
        },
      });
    };

    const handleSubscriberMessage = (msg, jsep, publisherId) => {
      console.log("JanusVideoCall: Subscriber message:", msg);

      if (jsep) {
        const subscriber = subscribersRef.current.get(publisherId);
        if (subscriber) {
          subscriber.createAnswer({
            jsep: jsep,
            media: { audioSend: false, videoSend: false },
            success: (jsep) => {
              const startRequest = { request: "start", room: roomId };
              subscriber.send({
                message: startRequest,
                jsep: jsep,
              });
            },
            error: (error) => {
              console.error("JanusVideoCall: Failed to create answer:", error);
            },
          });
        }
      }
    };

    const handleRemoteStream = (stream, publisher) => {
      setParticipants((prev) => {
        const existing = prev.find((p) => p.id === publisher.id);
        if (!existing) {
          return [
            ...prev,
            {
              id: publisher.id,
              display: publisher.display,
              stream: stream,
            },
          ];
        }
        return prev.map((p) =>
          p.id === publisher.id ? { ...p, stream: stream } : p
        );
      });
    };

    const unsubscribeFromPublisher = (publisherId) => {
      console.log("JanusVideoCall: Unsubscribing from publisher:", publisherId);

      const subscriber = subscribersRef.current.get(publisherId);
      if (subscriber) {
        subscriber.detach();
        subscribersRef.current.delete(publisherId);
      }

      setParticipants((prev) => prev.filter((p) => p.id !== publisherId));
    };

    const getUserMedia = (constraints) => {
      return navigator.mediaDevices.getUserMedia(constraints);
    };

    const toggleVideo = () => {
      if (IS_DEMO_MODE) {
        setIsVideoEnabled(!isVideoEnabled);
        return;
      }

      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.enabled = !isVideoEnabled;
        });
        setIsVideoEnabled(!isVideoEnabled);

        // Update publisher configuration
        if (publisherRef.current) {
          const configureRequest = {
            request: "configure",
            video: !isVideoEnabled,
          };
          publisherRef.current.send({ message: configureRequest });
        }
      }
    };

    const toggleAudio = () => {
      if (IS_DEMO_MODE) {
        setIsAudioEnabled(!isAudioEnabled);
        return;
      }

      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        audioTracks.forEach((track) => {
          track.enabled = !isAudioEnabled;
        });
        setIsAudioEnabled(!isAudioEnabled);

        // Update publisher configuration
        if (publisherRef.current) {
          const configureRequest = {
            request: "configure",
            audio: !isAudioEnabled,
          };
          publisherRef.current.send({ message: configureRequest });
        }
      }
    };

    const endCall = async () => {
      console.log("JanusVideoCall: Ending video call");

      stopCallTimer();

      if (!IS_DEMO_MODE) {
        // Clean up local stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }

        // Detach publisher
        if (publisherRef.current) {
          publisherRef.current.detach();
          publisherRef.current = null;
        }

        // Detach all subscribers
        subscribersRef.current.forEach((subscriber) => {
          subscriber.detach();
        });
        subscribersRef.current.clear();
      }

      // Reset state
      setIsInCall(false);
      setIsPublishing(false);
      setParticipants([]);
      setRoomId(null);
      setCallStatus("Call ended");
      setCallDuration(0);

      if (onCallEnd) {
        onCallEnd();
      }
    };

    const cleanup = () => {
      if (janusRef.current) {
        janusRef.current.destroy();
        janusRef.current = null;
      }
      stopCallTimer();
    };

    const generateRoomId = (roomName) => {
      return Math.floor(Math.random() * 1000000);
    };

    const startCallTimer = () => {
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

    const toggleFullscreen = () => {
      setIsFullscreen(!isFullscreen);
    };

    if (!isInCall) {
      return (
        <div className="flex flex-col items-center space-y-4 p-4">
          <button
            onClick={startVideoCall}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
            disabled={!IS_DEMO_MODE && !janusConnected}
          >
            <FaVideo />
            <span>Start Video Call</span>
          </button>

          {connectionError && (
            <div className="text-red-500 text-sm text-center">
              {connectionError}
            </div>
          )}

          <div className="text-sm text-gray-600 text-center">{callStatus}</div>
        </div>
      );
    }

    return (
      <div
        className={`video-call-container ${
          isFullscreen ? "fixed inset-0 z-50 bg-black" : "relative"
        }`}
      >
        {/* Call Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="text-lg font-semibold">
              Video Call - {selectedReceiver?.username || "Room"}
            </div>
            <div className="text-sm text-gray-300">
              {formatDuration(callDuration)}
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-300">
              <FaUsers />
              <span>{participants.length + 1}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded"
            >
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="video-grid p-4 bg-gray-900 min-h-96">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              You {!isVideoEnabled && "(Video Off)"}
            </div>
          </div>

          {/* Remote Videos */}
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="relative bg-gray-800 rounded-lg overflow-hidden"
            >
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (el && participant.stream) {
                    el.srcObject = participant.stream;
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {participant.display}
              </div>
            </div>
          ))}
        </div>

        {/* Call Controls */}
        <div className="bg-gray-800 p-4 flex justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled
                ? "bg-gray-600 hover:bg-gray-700"
                : "bg-red-500 hover:bg-red-600"
            } text-white transition-colors`}
          >
            {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled
                ? "bg-gray-600 hover:bg-gray-700"
                : "bg-red-500 hover:bg-red-600"
            } text-white transition-colors`}
          >
            {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
          </button>

          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <FaPhoneSlash />
          </button>
        </div>

        {IS_DEMO_MODE && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded text-sm font-semibold">
            DEMO MODE
          </div>
        )}
      </div>
    );
  }
);

JanusVideoCall.displayName = "JanusVideoCall";

export default JanusVideoCall;
