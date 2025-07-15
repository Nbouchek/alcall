import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from "react";
import {
  FaPlay,
  FaStop,
  FaPause,
  FaForward,
  FaBackward,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaCog,
} from "react-icons/fa";

const JanusStreaming = forwardRef(({ user, onStreamEnd }, ref) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [janusConnected, setJanusConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [selectedStream, setSelectedStream] = useState(null);
  const [bitrate, setBitrate] = useState(0);

  // Check if we're in demo mode (Render deployment)
  const IS_DEMO_MODE =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("onrender.com") ||
      window.location.hostname.includes("render.com")) &&
    !(process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true" || true);

  // Janus-specific refs
  const janusRef = useRef(null);
  const pluginHandleRef = useRef(null);
  const videoRef = useRef(null);
  const bitrateTimerRef = useRef(null);

  // Janus configuration
  const JANUS_URL = process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
  const JANUS_HTTP_URL =
    process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

  // Streaming plugin name
  const STREAMING_PLUGIN = "janus.plugin.streaming";

  // Demo streams for demo mode
  const demoStreams = useMemo(
    () => [
      { id: 1, description: "Demo Live Stream", type: "live", enabled: true },
      { id: 2, description: "Demo Video Stream", type: "video", enabled: true },
      { id: 3, description: "Demo Audio Stream", type: "audio", enabled: true },
    ],
    []
  );

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    startStreaming: (streamId) => {
      console.log("JanusStreaming: startStreaming called with ID:", streamId);
      startStreaming(streamId);
    },
    stopStreaming: () => {
      console.log("JanusStreaming: stopStreaming called");
      stopStreaming();
    },
    getStreamStatus: () => {
      return {
        isStreaming: IS_DEMO_MODE ? true : isStreaming,
        streamStatus,
        janusConnected: IS_DEMO_MODE ? true : janusConnected,
        selectedStream,
        bitrate,
      };
    },
    listStreams: () => {
      listStreams();
    },
  }));

  const connectToJanus = useCallback(() => {
    if (janusRef.current) {
      console.log("JanusStreaming: Already connected to Janus");
      return;
    }

    janusRef.current = new window.Janus({
      server: JANUS_URL,
      success: () => {
        console.log("JanusStreaming: Connected to Janus");
        setJanusConnected(true);
        setStreamStatus("Connected to Janus server");
        attachStreamingPlugin();
      },
      error: (error) => {
        console.error("JanusStreaming: Failed to connect to Janus:", error);
        setConnectionError("Failed to connect to Janus server");
        setJanusConnected(false);
      },
      destroyed: () => {
        console.log("JanusStreaming: Janus connection destroyed");
        setJanusConnected(false);
      },
    });
  }, [
    JANUS_URL,
    setJanusConnected,
    setStreamStatus,
    setConnectionError,
    attachStreamingPlugin,
  ]);

  // Initialize Janus connection
  useEffect(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusStreaming: Running in demo mode");
      setJanusConnected(true);
      setStreamStatus("Demo mode - Streaming simulated");
      setAvailableStreams(demoStreams);
      return;
    }

    const initializeJanus = () => {
      if (typeof window !== "undefined" && window.Janus) {
        console.log("JanusStreaming: Initializing Janus...");

        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log("JanusStreaming: Janus initialized");
            connectToJanus();
          },
        });
      } else {
        console.log("JanusStreaming: Janus library not loaded");
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
    setJanusConnected,
    setStreamStatus,
    setAvailableStreams,
    demoStreams,
  ]);

  const attachStreamingPlugin = useCallback(() => {
    janusRef.current.attach({
      plugin: STREAMING_PLUGIN,
      success: (pluginHandle) => {
        console.log("JanusStreaming: Streaming plugin attached");
        pluginHandleRef.current = pluginHandle;
        listStreams();
      },
      error: (error) => {
        console.error("JanusStreaming: Failed to attach plugin:", error);
        setConnectionError("Failed to attach to streaming plugin");
      },
      onmessage: handlePluginMessage,
      onremotestream: (stream) => {
        console.log("JanusStreaming: Remote stream received");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.volume = isMuted ? 0 : volume;
        }
      },
      oncleanup: () => {
        console.log("JanusStreaming: Plugin cleanup");
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      },
    });
  }, [
    janusRef,
    STREAMING_PLUGIN,
    listStreams,
    handlePluginMessage,
    setConnectionError,
    isMuted,
    volume,
  ]);

  const listStreams = useCallback(() => {
    if (IS_DEMO_MODE) {
      setAvailableStreams(demoStreams);
      return;
    }

    if (!pluginHandleRef.current) {
      console.error("JanusStreaming: Plugin not attached");
      return;
    }

    const listRequest = { request: "list" };
    pluginHandleRef.current.send({
      message: listRequest,
      success: (result) => {
        console.log("JanusStreaming: Stream list received:", result);
        if (result && result.list) {
          setAvailableStreams(result.list);
        }
      },
      error: (error) => {
        console.error("JanusStreaming: Failed to list streams:", error);
      },
    });
  }, [IS_DEMO_MODE, demoStreams, setAvailableStreams]);

  const startStreaming = (streamId) => {
    if (IS_DEMO_MODE) {
      console.log("JanusStreaming: Starting demo streaming for ID:", streamId);
      const stream = demoStreams.find((s) => s.id === streamId);
      setSelectedStream(stream);
      setIsStreaming(true);
      setStreamStatus(`Demo streaming: ${stream?.description}`);
      startBitrateTimer();
      return;
    }

    if (!pluginHandleRef.current) {
      console.error("JanusStreaming: Plugin not attached");
      return;
    }

    const stream = availableStreams.find((s) => s.id === streamId);
    if (!stream) {
      console.error("JanusStreaming: Stream not found:", streamId);
      return;
    }

    setSelectedStream(stream);
    setStreamStatus("Starting stream...");

    const watchRequest = {
      request: "watch",
      id: streamId,
    };

    pluginHandleRef.current.send({
      message: watchRequest,
      success: (result) => {
        console.log("JanusStreaming: Watch request successful:", result);
        setStreamStatus(`Streaming: ${stream.description}`);
      },
      error: (error) => {
        console.error("JanusStreaming: Failed to start streaming:", error);
        setStreamStatus("Failed to start stream");
      },
    });
  };

  const stopStreaming = useCallback(() => {
    console.log("JanusStreaming: Stopping streaming");

    stopBitrateTimer();

    if (pluginHandleRef.current) {
      if (!IS_DEMO_MODE) {
        const stopRequest = { request: "stop" };
        pluginHandleRef.current.send({
          message: stopRequest,
          success: (result) => {
            console.log("JanusStreaming: Stop request successful:", result);
          },
          error: (error) => {
            console.error("JanusStreaming: Failed to stop stream:", error);
          },
        });
      }
      pluginHandleRef.current.hangup();
      pluginHandleRef.current.detach();
      pluginHandleRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setSelectedStream(null);
    setStreamStatus("Stream stopped");
    setBitrate(0);
    if (onStreamEnd) {
      onStreamEnd();
    }
  }, [
    IS_DEMO_MODE,
    stopBitrateTimer,
    setIsStreaming,
    setSelectedStream,
    setStreamStatus,
    setBitrate,
    onStreamEnd,
  ]);

  const handlePluginMessage = useCallback(
    (msg, jsep) => {
      console.log("JanusStreaming: Plugin message received", msg);

      if (jsep) {
        console.log("JanusStreaming: Handling JSEP:", jsep);
        pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
      }

      const event = msg.plugindata?.data?.streaming;
      if (event) {
        if (event === "list") {
          setAvailableStreams(msg.plugindata.data.list);
        } else if (event === "event") {
          // Handle other streaming events if needed
        }
      }
    },
    [setAvailableStreams]
  );

  const startBitrateTimer = useCallback(() => {
    if (bitrateTimerRef.current) {
      clearInterval(bitrateTimerRef.current);
    }
    if (IS_DEMO_MODE) {
      bitrateTimerRef.current = setInterval(() => {
        setBitrate(Math.floor(Math.random() * 1000) + 500);
      }, 1000);
      return;
    }
    bitrateTimerRef.current = setInterval(() => {
      if (pluginHandleRef.current) {
        pluginHandleRef.current.getBitrate({ success: setBitrate });
      }
    }, 1000);
  }, [setBitrate, IS_DEMO_MODE]);

  const stopBitrateTimer = useCallback(() => {
    if (bitrateTimerRef.current) {
      clearInterval(bitrateTimerRef.current);
      bitrateTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    console.log("JanusStreaming: Performing cleanup");
    if (pluginHandleRef.current) {
      pluginHandleRef.current.hangup();
      pluginHandleRef.current.detach();
      pluginHandleRef.current = null;
    }
    if (janusRef.current) {
      janusRef.current.destroy();
      janusRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopBitrateTimer();
    setIsStreaming(false);
    setJanusConnected(false);
    setStreamStatus("");
    setConnectionError(null);
    setSelectedStream(null);
  }, [
    stopBitrateTimer,
    setIsStreaming,
    setJanusConnected,
    setStreamStatus,
    setConnectionError,
    setSelectedStream,
  ]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current && !isMuted) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.volume = !isMuted ? 0 : volume;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isStreaming && availableStreams.length === 0) {
    return (
      <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Media Streaming
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Watch live and on-demand media streams
          </p>
        </div>

        <button
          onClick={listStreams}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          disabled={!IS_DEMO_MODE && !janusConnected}
        >
          <FaPlay />
          <span>Load Streams</span>
        </button>

        {connectionError && (
          <div className="text-red-500 text-sm text-center mt-2">
            {connectionError}
          </div>
        )}

        <div className="text-sm text-gray-600 text-center">{streamStatus}</div>
      </div>
    );
  }

  if (!isStreaming && availableStreams.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 text-white p-4">
          <h3 className="text-lg font-semibold">Available Streams</h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableStreams.map((stream) => (
              <div
                key={stream.id}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => startStreaming(stream.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">
                    Stream {stream.id}
                  </h4>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      stream.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {stream.enabled ? "Available" : "Offline"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {stream.description}
                </p>
                <button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors"
                  disabled={!stream.enabled}
                >
                  <FaPlay className="inline mr-2" />
                  Watch Stream
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`streaming-container ${
        isFullscreen ? "fixed inset-0 z-50 bg-black" : "relative"
      }`}
    >
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold">
            {selectedStream?.description || "Media Stream"}
          </div>
          <div className="text-sm text-gray-300">Bitrate: {bitrate} kbps</div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20"
            disabled={isMuted}
          />
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="relative bg-gray-900 flex items-center justify-center min-h-96">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

        {!videoRef.current?.srcObject && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <FaPlay className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Loading stream...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-4">
        <button
          onClick={stopStreaming}
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

JanusStreaming.displayName = "JanusStreaming";

export default JanusStreaming;
