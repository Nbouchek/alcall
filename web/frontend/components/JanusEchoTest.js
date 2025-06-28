import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FaPlay,
  FaStop,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaCog,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa";

const JanusEchoTest = forwardRef(({ user, onTestEnd }, ref) => {
  const [isActive, setIsActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [testStatus, setTestStatus] = useState("");
  const [janusConnected, setJanusConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [bitrate, setBitrate] = useState(0);
  const [volume, setVolume] = useState(0.5);

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
  const bitrateTimerRef = useRef(null);

  // Janus configuration
  const JANUS_URL = process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
  const JANUS_HTTP_URL =
    process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

  // EchoTest plugin name
  const ECHOTEST_PLUGIN = "janus.plugin.echotest";

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    startTest: () => {
      console.log("JanusEchoTest: startTest called");
      startEchoTest();
    },
    stopTest: () => {
      console.log("JanusEchoTest: stopTest called");
      stopEchoTest();
    },
    getTestStatus: () => {
      return {
        isActive: IS_DEMO_MODE ? true : isActive,
        isVideoEnabled,
        isAudioEnabled,
        testStatus,
        janusConnected: IS_DEMO_MODE ? true : janusConnected,
        bitrate,
      };
    },
    toggleVideo: () => {
      toggleVideo();
    },
    toggleAudio: () => {
      toggleAudio();
    },
  }));

  // Initialize Janus connection
  useEffect(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusEchoTest: Running in demo mode");
      setJanusConnected(true);
      setTestStatus("Demo mode - Echo test simulated");
      return;
    }

    const initializeJanus = () => {
      if (typeof window !== "undefined" && window.Janus) {
        console.log("JanusEchoTest: Initializing Janus...");

        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log("JanusEchoTest: Janus initialized");
            connectToJanus();
          },
        });
      } else {
        console.log("JanusEchoTest: Janus library not loaded");
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
      console.log("JanusEchoTest: Already connected to Janus");
      return;
    }

    janusRef.current = new window.Janus({
      server: JANUS_URL,
      success: () => {
        console.log("JanusEchoTest: Connected to Janus");
        setJanusConnected(true);
        setTestStatus("Connected to Janus server");
      },
      error: (error) => {
        console.error("JanusEchoTest: Failed to connect to Janus:", error);
        setConnectionError("Failed to connect to Janus server");
        setJanusConnected(false);
      },
      destroyed: () => {
        console.log("JanusEchoTest: Janus connection destroyed");
        setJanusConnected(false);
      },
    });
  };

  const startEchoTest = async () => {
    if (IS_DEMO_MODE) {
      console.log("JanusEchoTest: Starting demo echo test");
      setIsActive(true);
      setTestStatus("Demo echo test active");
      startBitrateTimer();
      return;
    }

    if (!janusRef.current) {
      console.error("JanusEchoTest: Janus not connected");
      return;
    }

    try {
      setTestStatus("Starting echo test...");

      // Get user media
      const stream = await getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Attach to EchoTest plugin
      await attachEchoTestPlugin(stream);

      setIsActive(true);
      setTestStatus("Echo test active");
      startBitrateTimer();
    } catch (error) {
      console.error("JanusEchoTest: Failed to start echo test:", error);
      setTestStatus("Failed to start echo test");
      setConnectionError(error.message);
    }
  };

  const attachEchoTestPlugin = (stream) => {
    return new Promise((resolve, reject) => {
      janusRef.current.attach({
        plugin: ECHOTEST_PLUGIN,
        success: (pluginHandle) => {
          console.log("JanusEchoTest: EchoTest plugin attached");
          pluginHandleRef.current = pluginHandle;

          // Create offer
          pluginHandle.createOffer({
            media: {
              audioRecv: isAudioEnabled,
              videoRecv: isVideoEnabled,
              audioSend: isAudioEnabled,
              videoSend: isVideoEnabled,
            },
            stream: stream,
            success: (jsep) => {
              console.log("JanusEchoTest: Offer created");

              const body = {
                audio: isAudioEnabled,
                video: isVideoEnabled,
              };

              pluginHandle.send({
                message: body,
                jsep: jsep,
                success: (result) => {
                  console.log("JanusEchoTest: EchoTest started:", result);
                  resolve();
                },
                error: (error) => {
                  console.error(
                    "JanusEchoTest: Failed to start EchoTest:",
                    error
                  );
                  reject(error);
                },
              });
            },
            error: (error) => {
              console.error("JanusEchoTest: Failed to create offer:", error);
              reject(error);
            },
          });
        },
        error: (error) => {
          console.error("JanusEchoTest: Failed to attach plugin:", error);
          reject(error);
        },
        onmessage: handlePluginMessage,
        onlocalstream: (stream) => {
          console.log("JanusEchoTest: Local stream received");
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        },
        onremotestream: (stream) => {
          console.log("JanusEchoTest: Remote stream received (echo)");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.volume = volume;
          }
        },
      });
    });
  };

  const handlePluginMessage = (msg, jsep) => {
    console.log("JanusEchoTest: Plugin message:", msg);

    if (jsep) {
      console.log("JanusEchoTest: Handling remote JSEP:", jsep);
      pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
    }

    const result = msg.result;
    if (result && result.status) {
      setTestStatus(`Echo test: ${result.status}`);
    }
  };

  const stopEchoTest = async () => {
    console.log("JanusEchoTest: Stopping echo test");

    stopBitrateTimer();

    if (!IS_DEMO_MODE) {
      // Clean up local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Detach plugin
      if (pluginHandleRef.current) {
        pluginHandleRef.current.detach();
        pluginHandleRef.current = null;
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }

    // Reset state
    setIsActive(false);
    setTestStatus("Echo test stopped");
    setBitrate(0);

    if (onTestEnd) {
      onTestEnd();
    }
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

      // Update plugin configuration
      if (pluginHandleRef.current && isActive) {
        const body = {
          video: !isVideoEnabled,
        };
        pluginHandleRef.current.send({ message: body });
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

      // Update plugin configuration
      if (pluginHandleRef.current && isActive) {
        const body = {
          audio: !isAudioEnabled,
        };
        pluginHandleRef.current.send({ message: body });
      }
    }
  };

  const startBitrateTimer = () => {
    if (IS_DEMO_MODE) {
      // Simulate bitrate in demo mode
      bitrateTimerRef.current = setInterval(() => {
        setBitrate(Math.floor(Math.random() * 1000) + 500);
      }, 1000);
      return;
    }

    bitrateTimerRef.current = setInterval(() => {
      if (pluginHandleRef.current) {
        pluginHandleRef.current.getBitrate((bitrate) => {
          setBitrate(bitrate);
        });
      }
    }, 1000);
  };

  const stopBitrateTimer = () => {
    if (bitrateTimerRef.current) {
      clearInterval(bitrateTimerRef.current);
      bitrateTimerRef.current = null;
    }
  };

  const cleanup = () => {
    if (janusRef.current) {
      janusRef.current.destroy();
      janusRef.current = null;
    }
    stopBitrateTimer();
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = newVolume;
    }
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Audio/Video Test
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Test your camera and microphone with echo functionality
          </p>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isVideoEnabled}
              onChange={(e) => setIsVideoEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Video</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isAudioEnabled}
              onChange={(e) => setIsAudioEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Audio</span>
          </label>
        </div>

        <button
          onClick={startEchoTest}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          disabled={!IS_DEMO_MODE && !janusConnected}
        >
          <FaPlay />
          <span>Start Echo Test</span>
        </button>

        {connectionError && (
          <div className="text-red-500 text-sm text-center mt-2">
            {connectionError}
          </div>
        )}

        <div className="text-sm text-gray-600 text-center">{testStatus}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold">Echo Test</div>
          <div className="text-sm text-gray-300">Bitrate: {bitrate} kbps</div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <FaVolumeUp className="text-sm" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Video Area */}
      <div className="p-4 bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              Local {!isVideoEnabled && "(Video Off)"}
            </div>
          </div>

          {/* Remote Video (Echo) */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              Echo {!isAudioEnabled && "(Audio Off)"}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
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
          onClick={stopEchoTest}
          className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          <FaStop />
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

JanusEchoTest.displayName = "JanusEchoTest";

export default JanusEchoTest;
