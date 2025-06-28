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
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaExpand,
  FaCompress,
  FaCog,
  FaUser,
} from "react-icons/fa";

const JanusVideoCallP2P = forwardRef(({ user, onCallEnd }, ref) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [janusConnected, setJanusConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [targetUser, setTargetUser] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);

  // Check if we're in demo mode (Render deployment)
  const IS_DEMO_MODE =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("onrender.com") ||
      window.location.hostname.includes("render.com"));

  // Janus-specific refs
  const janusRef = useRef(null);
  const pluginHandleRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Janus configuration
  const JANUS_URL = process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
  const JANUS_HTTP_URL =
    process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

  // VideoCall plugin name
  const VIDEOCALL_PLUGIN = "janus.plugin.videocall";

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    startCall: (username) => {
      console.log("JanusVideoCallP2P: startCall called for:", username);
      startCall(username);
    },
    endCall: () => {
      console.log("JanusVideoCallP2P: endCall called");
      endCall();
    },
    answerCall: () => {
      console.log("JanusVideoCallP2P: answerCall called");
      answerCall();
    },
    declineCall: () => {
      console.log("JanusVideoCallP2P: declineCall called");
      declineCall();
    },
    getCallStatus: () => {
      return {
        isInCall: IS_DEMO_MODE ? true : isInCall,
        callStatus,
        janusConnected: IS_DEMO_MODE ? true : janusConnected,
        targetUser,
      };
    },
  }));

  // Initialize Janus connection
  useEffect(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusVideoCallP2P: Running in demo mode");
      setJanusConnected(true);
      setCallStatus("Demo mode - Video calling simulated");
      return;
    }

    const initializeJanus = () => {
      if (typeof window !== "undefined" && window.Janus) {
        console.log("JanusVideoCallP2P: Initializing Janus...");

        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log("JanusVideoCallP2P: Janus initialized");
            connectToJanus();
          },
        });
      } else {
        console.log("JanusVideoCallP2P: Janus library not loaded");
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
      console.log("JanusVideoCallP2P: Already connected to Janus");
      return;
    }

    janusRef.current = new window.Janus({
      server: JANUS_URL,
      success: () => {
        console.log("JanusVideoCallP2P: Connected to Janus");
        setJanusConnected(true);
        setCallStatus("Connected to Janus server");
        attachVideoCallPlugin();
      },
      error: (error) => {
        console.error("JanusVideoCallP2P: Failed to connect to Janus:", error);
        setConnectionError("Failed to connect to Janus server");
        setJanusConnected(false);
      },
      destroyed: () => {
        console.log("JanusVideoCallP2P: Janus connection destroyed");
        setJanusConnected(false);
      },
    });
  };

  const attachVideoCallPlugin = () => {
    janusRef.current.attach({
      plugin: VIDEOCALL_PLUGIN,
      success: (pluginHandle) => {
        console.log("JanusVideoCallP2P: VideoCall plugin attached");
        pluginHandleRef.current = pluginHandle;
        registerUser();
      },
      error: (error) => {
        console.error("JanusVideoCallP2P: Failed to attach plugin:", error);
        setConnectionError("Failed to attach to videocall plugin");
      },
      onmessage: handlePluginMessage,
      onlocalstream: (stream) => {
        console.log("JanusVideoCallP2P: Local stream received");
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      },
      onremotestream: (stream) => {
        console.log("JanusVideoCallP2P: Remote stream received");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      oncleanup: () => {
        console.log("JanusVideoCallP2P: Plugin cleanup");
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      },
    });
  };

  const registerUser = () => {
    if (!pluginHandleRef.current) return;

    const registerRequest = {
      request: "register",
      username: user?.name || "anonymous",
    };

    pluginHandleRef.current.send({
      message: registerRequest,
      success: (result) => {
        console.log("JanusVideoCallP2P: User registered:", result);
        setCallStatus("Ready for calls");
      },
      error: (error) => {
        console.error("JanusVideoCallP2P: Failed to register:", error);
        setConnectionError("Failed to register user");
      },
    });
  };

  const startCall = (username) => {
    if (IS_DEMO_MODE) {
      console.log("JanusVideoCallP2P: Starting demo call to:", username);
      setTargetUser(username);
      setIsInCall(true);
      setCallStatus(`Demo call with ${username}`);
      return;
    }

    if (!pluginHandleRef.current) {
      console.error("JanusVideoCallP2P: Plugin not attached");
      return;
    }

    setTargetUser(username);
    setCallStatus("Starting call...");

    // Start local media capture
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create offer
        pluginHandleRef.current.createOffer({
          media: { audioSend: true, videoSend: true },
          success: (jsep) => {
            const callRequest = {
              request: "call",
              username: username,
            };

            pluginHandleRef.current.send({
              message: callRequest,
              jsep: jsep,
              success: (result) => {
                console.log("JanusVideoCallP2P: Call initiated:", result);
                setCallStatus(`Calling ${username}...`);
              },
              error: (error) => {
                console.error(
                  "JanusVideoCallP2P: Failed to initiate call:",
                  error
                );
                setCallStatus("Failed to start call");
              },
            });
          },
          error: (error) => {
            console.error("JanusVideoCallP2P: Failed to create offer:", error);
            setCallStatus("Failed to create offer");
          },
        });
      })
      .catch((error) => {
        console.error("JanusVideoCallP2P: Failed to get user media:", error);
        setCallStatus("Failed to access camera/microphone");
      });
  };

  const answerCall = () => {
    if (IS_DEMO_MODE) {
      console.log("JanusVideoCallP2P: Answering demo call");
      setIsInCall(true);
      setIsIncoming(false);
      setCallStatus(`Demo call with ${incomingCall?.caller}`);
      return;
    }

    if (!pluginHandleRef.current || !incomingCall) return;

    // Start local media capture
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create answer
        pluginHandleRef.current.createAnswer({
          jsep: incomingCall.jsep,
          media: { audioSend: true, videoSend: true },
          success: (jsep) => {
            const acceptRequest = {
              request: "accept",
            };

            pluginHandleRef.current.send({
              message: acceptRequest,
              jsep: jsep,
              success: (result) => {
                console.log("JanusVideoCallP2P: Call accepted:", result);
                setIsInCall(true);
                setIsIncoming(false);
                setCallStatus(`In call with ${incomingCall.caller}`);
              },
              error: (error) => {
                console.error(
                  "JanusVideoCallP2P: Failed to accept call:",
                  error
                );
                setCallStatus("Failed to accept call");
              },
            });
          },
          error: (error) => {
            console.error("JanusVideoCallP2P: Failed to create answer:", error);
            setCallStatus("Failed to create answer");
          },
        });
      })
      .catch((error) => {
        console.error("JanusVideoCallP2P: Failed to get user media:", error);
        setCallStatus("Failed to access camera/microphone");
      });
  };

  const declineCall = () => {
    if (IS_DEMO_MODE) {
      console.log("JanusVideoCallP2P: Declining demo call");
      setIsIncoming(false);
      setIncomingCall(null);
      setCallStatus("Call declined");
      return;
    }

    if (!pluginHandleRef.current) return;

    const declineRequest = {
      request: "decline",
    };

    pluginHandleRef.current.send({
      message: declineRequest,
      success: (result) => {
        console.log("JanusVideoCallP2P: Call declined:", result);
        setIsIncoming(false);
        setIncomingCall(null);
        setCallStatus("Call declined");
      },
      error: (error) => {
        console.error("JanusVideoCallP2P: Failed to decline call:", error);
      },
    });
  };

  const endCall = () => {
    console.log("JanusVideoCallP2P: Ending call");

    if (!IS_DEMO_MODE && pluginHandleRef.current) {
      const hangupRequest = { request: "hangup" };
      pluginHandleRef.current.send({
        message: hangupRequest,
        success: (result) => {
          console.log("JanusVideoCallP2P: Call ended:", result);
        },
        error: (error) => {
          console.error("JanusVideoCallP2P: Failed to end call:", error);
        },
      });
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Reset state
    setIsInCall(false);
    setIsIncoming(false);
    setIncomingCall(null);
    setTargetUser("");
    setCallStatus("Call ended");

    if (onCallEnd) {
      onCallEnd();
    }
  };

  const handlePluginMessage = (msg, jsep) => {
    console.log("JanusVideoCallP2P: Plugin message:", msg);

    const result = msg.result;
    if (result) {
      if (result.event === "registered") {
        setCallStatus("Registered and ready");
      } else if (result.event === "calling") {
        setCallStatus("Calling...");
      } else if (result.event === "incomingcall") {
        console.log("JanusVideoCallP2P: Incoming call from:", result.username);
        setIsIncoming(true);
        setIncomingCall({
          caller: result.username,
          jsep: jsep,
        });
        setCallStatus(`Incoming call from ${result.username}`);
      } else if (result.event === "accepted") {
        console.log("JanusVideoCallP2P: Call accepted");
        setIsInCall(true);
        setCallStatus("Call connected");

        if (jsep) {
          pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
        }
      } else if (result.event === "hangup") {
        console.log("JanusVideoCallP2P: Call ended by remote");
        endCall();
      }
    }

    if (jsep) {
      console.log("JanusVideoCallP2P: Handling remote JSEP:", jsep);
      if (jsep.type === "answer") {
        pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
      }
    }
  };

  const toggleVideo = () => {
    setLocalVideoEnabled(!localVideoEnabled);
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !localVideoEnabled;
      }
    }
  };

  const toggleAudio = () => {
    setLocalAudioEnabled(!localAudioEnabled);
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !localAudioEnabled;
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (janusRef.current) {
      janusRef.current.destroy();
      janusRef.current = null;
    }
  };

  // Incoming call UI
  if (isIncoming && !isInCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
              <FaUser className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Incoming Call</h3>
            <p className="text-gray-600 mb-6">
              {incomingCall?.caller} is calling you
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={answerCall}
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full transition-colors"
              >
                <FaPhone className="w-6 h-6" />
              </button>
              <button
                onClick={declineCall}
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors"
              >
                <FaPhoneSlash className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Call setup UI
  if (!isInCall) {
    return (
      <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Video Call
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Make peer-to-peer video calls
          </p>
        </div>

        <div className="w-full max-w-sm">
          <input
            type="text"
            placeholder="Enter username to call"
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => startCall(targetUser)}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          disabled={!targetUser || (!IS_DEMO_MODE && !janusConnected)}
        >
          <FaPhone />
          <span>Start Call</span>
        </button>

        {connectionError && (
          <div className="text-red-500 text-sm text-center mt-2">
            {connectionError}
          </div>
        )}

        <div className="text-sm text-gray-600 text-center">{callStatus}</div>
      </div>
    );
  }

  // Active call UI
  return (
    <div
      className={`video-call-container ${
        isFullscreen ? "fixed inset-0 z-50 bg-black" : "relative"
      }`}
    >
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold">
            {targetUser || "Video Call"}
          </div>
          <div className="text-sm text-gray-300">{callStatus}</div>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2 hover:bg-gray-700 rounded"
        >
          {isFullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>

      {/* Video Area */}
      <div className="relative bg-gray-900 min-h-96 flex">
        {/* Remote Video */}
        <div className="flex-1 relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <FaUser className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Waiting for remote video...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!localVideoEnabled && (
            <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
              <FaVideoSlash className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            localAudioEnabled
              ? "bg-gray-600 hover:bg-gray-700 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {localAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            localVideoEnabled
              ? "bg-gray-600 hover:bg-gray-700 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {localVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
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
});

JanusVideoCallP2P.displayName = "JanusVideoCallP2P";

export default JanusVideoCallP2P;
