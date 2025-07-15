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
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVolumeUp,
  FaVolumeMute,
  FaCog,
  FaPlay,
  FaStop,
  FaRedo,
} from "react-icons/fa";

const JanusDeviceTest = forwardRef(({ user, onTestEnd }, ref) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState("");
  const [janusConnected, setJanusConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  // Device lists
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);

  // Selected devices
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");

  // Audio level monitoring
  const [audioLevel, setAudioLevel] = useState(0);
  const [bitrate, setBitrate] = useState(0);

  // Check if we're in demo mode (Render deployment)
  const IS_DEMO_MODE =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("onrender.com") ||
      window.location.hostname.includes("render.com")) &&
    !(process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true");

  // Janus-specific refs
  const janusRef = useRef(null);
  const pluginHandleRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const bitrateTimerRef = useRef(null);
  const audioLevelTimerRef = useRef(null);

  // Janus configuration
  const JANUS_URL = process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
  const JANUS_HTTP_URL =
    process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

  // EchoTest plugin name
  const ECHOTEST_PLUGIN = "janus.plugin.echotest";

  // Demo devices for demo mode
  const demoVideoDevices = useMemo(
    () => [
      { deviceId: "default", label: "Default Camera" },
      { deviceId: "demo1", label: "Demo Camera 1 (HD)" },
      { deviceId: "demo2", label: "Demo Camera 2 (4K)" },
    ],
    []
  );

  const demoAudioInputDevices = useMemo(
    () => [
      { deviceId: "default", label: "Default Microphone" },
      { deviceId: "demo1", label: "Demo Microphone 1" },
      { deviceId: "demo2", label: "Demo Headset Mic" },
    ],
    []
  );

  const demoAudioOutputDevices = useMemo(
    () => [
      { deviceId: "default", label: "Default Speakers" },
      { deviceId: "demo1", label: "Demo Speakers 1" },
      { deviceId: "demo2", label: "Demo Headphones" },
    ],
    []
  );

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    startTest: (deviceConfig) => {
      console.log(
        "JanusDeviceTest: startTest called with config:",
        deviceConfig
      );
      startTest(deviceConfig);
    },
    stopTest: () => {
      console.log("JanusDeviceTest: stopTest called");
      stopTest();
    },
    refreshDevices: () => {
      console.log("JanusDeviceTest: refreshDevices called");
      enumerateDevices();
    },
    getTestStatus: () => {
      return {
        isTesting: IS_DEMO_MODE ? true : isTesting,
        testStatus,
        janusConnected: IS_DEMO_MODE ? true : janusConnected,
        videoDevices: IS_DEMO_MODE ? demoVideoDevices : videoDevices,
        audioInputDevices: IS_DEMO_MODE
          ? demoAudioInputDevices
          : audioInputDevices,
        audioOutputDevices: IS_DEMO_MODE
          ? demoAudioOutputDevices
          : audioOutputDevices,
        selectedDevices: {
          video: selectedVideoDevice,
          audioInput: selectedAudioInput,
          audioOutput: selectedAudioOutput,
        },
        audioLevel,
        bitrate,
      };
    },
  }));

  const enumerateDevices = useCallback(async () => {
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoDevs = devices.filter(
        (device) => device.kind === "videoinput"
      );
      const audioInputDevs = devices.filter(
        (device) => device.kind === "audioinput"
      );
      const audioOutputDevs = devices.filter(
        (device) => device.kind === "audiooutput"
      );

      setVideoDevices(videoDevs);
      setAudioInputDevices(audioInputDevs);
      setAudioOutputDevices(audioOutputDevs);

      // Set default selections
      if (videoDevs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoDevs[0].deviceId);
      }
      if (audioInputDevs.length > 0 && !selectedAudioInput) {
        setSelectedAudioInput(audioInputDevs[0].deviceId);
      }
      if (audioOutputDevs.length > 0 && !selectedAudioOutput) {
        setSelectedAudioOutput(audioOutputDevs[0].deviceId);
      }

      console.log("JanusDeviceTest: Devices enumerated:", {
        video: videoDevs.length,
        audioInput: audioInputDevs.length,
        audioOutput: audioOutputDevs.length,
      });
    } catch (error) {
      console.error("JanusDeviceTest: Failed to enumerate devices:", error);
      setConnectionError("Failed to access devices. Please grant permissions.");
    }
  }, [
    setVideoDevices,
    setAudioInputDevices,
    setAudioOutputDevices,
    setSelectedVideoDevice,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    setConnectionError,
    selectedVideoDevice,
    selectedAudioInput,
    selectedAudioOutput,
  ]);

  const connectToJanus = useCallback(() => {
    if (janusRef.current) {
      console.log("JanusDeviceTest: Already connected to Janus");
      return;
    }

    janusRef.current = new window.Janus({
      server: JANUS_URL,
      success: () => {
        console.log("JanusDeviceTest: Connected to Janus");
        setJanusConnected(true);
        setTestStatus("Connected to Janus server");
        attachEchoTestPlugin();
      },
      error: (error) => {
        console.error("JanusDeviceTest: Failed to connect to Janus:", error);
        setConnectionError("Failed to connect to Janus server");
        setJanusConnected(false);
      },
      destroyed: () => {
        console.log("JanusDeviceTest: Janus connection destroyed");
        setJanusConnected(false);
      },
    });
  }, [
    setJanusConnected,
    setTestStatus,
    setConnectionError,
    attachEchoTestPlugin,
    JANUS_URL,
  ]);

  const attachEchoTestPlugin = useCallback(() => {
    janusRef.current.attach({
      plugin: ECHOTEST_PLUGIN,
      success: (pluginHandle) => {
        console.log("JanusDeviceTest: EchoTest plugin attached");
        pluginHandleRef.current = pluginHandle;
        setTestStatus("Ready for device testing");
      },
      error: (error) => {
        console.error("JanusDeviceTest: Failed to attach plugin:", error);
        setConnectionError("Failed to attach to echotest plugin");
      },
      onmessage: handlePluginMessage,
      onlocalstream: (stream) => {
        console.log("JanusDeviceTest: Local stream received", stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setTestStatus("Testing...");
        setupAudioLevelMonitoring(stream);
        startBitrateTimer();
      },
      onremotestream: (stream) => {
        console.log("JanusDeviceTest: Remote stream received", stream);
        // For echotest, we just care about local stream, remote is echo
      },
      oncleanup: () => {
        console.log("JanusDeviceTest: Plugin handle cleaned up");
        // Additional cleanup for plugin handle
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }
        stopAudioLevelTimer();
        stopBitrateTimer();
        cleanupAudioMonitoring();
        setIsTesting(false);
        setTestStatus("Test ended");
      },
    });
  }, [
    handlePluginMessage,
    setupAudioLevelMonitoring,
    startBitrateTimer,
    stopAudioLevelTimer,
    stopBitrateTimer,
    cleanupAudioMonitoring,
    setTestStatus,
    setIsTesting,
    setConnectionError,
  ]);

  const startTest = useCallback(
    (deviceConfig = {}) => {
      if (IS_DEMO_MODE) {
        console.log("JanusDeviceTest: Starting demo test");
        setIsTesting(true);
        setTestStatus("Demo device test active");
        startBitrateTimer();
        startAudioLevelTimer();
        return;
      }

      if (!pluginHandleRef.current) {
        console.error("JanusDeviceTest: Plugin not attached");
        return;
      }

      setTestStatus("Starting device test...");

      // Build media constraints
      const constraints = {
        video: videoEnabled
          ? {
              deviceId: selectedVideoDevice
                ? { exact: selectedVideoDevice }
                : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
        audio: audioEnabled
          ? {
              deviceId: selectedAudioInput
                ? { exact: selectedAudioInput }
                : undefined,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      };

      console.log("JanusDeviceTest: Using constraints:", constraints);

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          console.log("JanusDeviceTest: Got user media");
          localStreamRef.current = stream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.volume = isMuted ? 0 : volume;
          }

          setupAudioLevelMonitoring(stream);

          // Create offer for echo test
          pluginHandleRef.current.createOffer({
            media: {
              audioSend: audioEnabled,
              videoSend: videoEnabled,
              audioRecv: audioEnabled,
              videoRecv: videoEnabled,
            },
            success: (jsep) => {
              const echoRequest = {
                audio: audioEnabled,
                video: videoEnabled,
                bitrate: 128000,
              };

              pluginHandleRef.current.send({
                message: echoRequest,
                jsep: jsep,
                success: (result) => {
                  console.log("JanusDeviceTest: Echo test started:", result);
                  setIsTesting(true);
                  setTestStatus("Device test active - Echo enabled");
                  startBitrateTimer();
                },
                error: (error) => {
                  console.error(
                    "JanusDeviceTest: Failed to start test:",
                    error
                  );
                  setTestStatus("Failed to start device test");
                },
              });
            },
            error: (error) => {
              console.error("JanusDeviceTest: Failed to create offer:", error);
              setTestStatus("Failed to create offer");
            },
          });
        })
        .catch((error) => {
          console.error("JanusDeviceTest: Failed to get user media:", error);
          setTestStatus("Failed to access selected devices");
          setConnectionError(
            "Failed to access camera/microphone with selected devices"
          );
        });
    },
    [
      IS_DEMO_MODE,
      setIsTesting,
      setTestStatus,
      setConnectionError,
      videoEnabled,
      audioEnabled,
      selectedVideoDevice,
      selectedAudioInput,
      volume,
      isMuted,
      pluginHandleRef,
      setupAudioLevelMonitoring,
      startBitrateTimer,
      startAudioLevelTimer, // Added missing dependency
    ]
  );

  const stopTest = useCallback(() => {
    console.log("JanusDeviceTest: Stopping test");

    stopBitrateTimer();
    stopAudioLevelTimer();
    cleanupAudioMonitoring();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (!IS_DEMO_MODE && pluginHandleRef.current) {
      pluginHandleRef.current.hangup();
    }

    setIsTesting(false);
    setTestStatus("Device test stopped");
    setBitrate(0);
    setAudioLevel(0);

    if (onTestEnd) {
      onTestEnd();
    }
  }, [
    stopBitrateTimer,
    stopAudioLevelTimer,
    cleanupAudioMonitoring,
    setIsTesting,
    setTestStatus,
    setBitrate,
    setAudioLevel,
    onTestEnd,
  ]);

  const setupAudioLevelMonitoring = useCallback(
    (stream) => {
      if (IS_DEMO_MODE) {
        console.log(
          "JanusDeviceTest: Demo mode - skipping audio monitoring setup."
        );
        return;
      }
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      startAudioLevelTimer();
    },
    [IS_DEMO_MODE, startAudioLevelTimer]
  );

  const startAudioLevelTimer = useCallback(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current);
    }
    if (IS_DEMO_MODE) {
      console.log("JanusDeviceTest: Demo mode - simulating audio level.");
      audioLevelTimerRef.current = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 100)); // Simulate audio level
      }, 200);
    } else if (analyserRef.current && audioContextRef.current) {
      const analyser = analyserRef.current;
      const audioContext = audioContextRef.current;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioLevelTimerRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.floor(average)));
      }, 100);
    }
  }, [IS_DEMO_MODE]);

  const stopAudioLevelTimer = useCallback(() => {
    if (audioLevelTimerRef.current) {
      clearInterval(audioLevelTimerRef.current);
      audioLevelTimerRef.current = null;
    }
  }, []);

  const cleanupAudioMonitoring = useCallback(() => {
    stopAudioLevelTimer();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, [stopAudioLevelTimer, setAudioLevel]);

  const startBitrateTimer = useCallback(() => {
    if (bitrateTimerRef.current) {
      clearInterval(bitrateTimerRef.current);
    }
    if (IS_DEMO_MODE) {
      console.log("JanusDeviceTest: Demo mode - simulating bitrate.");
      bitrateTimerRef.current = setInterval(() => {
        setBitrate(Math.floor(Math.random() * 1000) + 100); // Simulate bitrate
      }, 1000);
    } else if (pluginHandleRef.current) {
      bitrateTimerRef.current = setInterval(() => {
        pluginHandleRef.current.getSendStats({
          success: (json) => {
            const bitrateValue = json.bitrate_sent;
            if (bitrateValue) {
              setBitrate(parseInt(bitrateValue.split(" ")[0]));
            } else {
              setBitrate(0);
            }
          },
        });
      }, 1000);
    }
  }, [IS_DEMO_MODE]);

  const stopBitrateTimer = useCallback(() => {
    if (bitrateTimerRef.current) {
      clearInterval(bitrateTimerRef.current);
      bitrateTimerRef.current = null;
    }
  }, []);

  const handlePluginMessage = useCallback((msg, jsep) => {
    console.log("JanusDeviceTest: Plugin message received", msg);
    // Handle plugin messages (e.g., ICE candidates, media offers/answers)
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoEnabled((prev) => !prev);
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => !prev);
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (localVideoRef.current) {
      localVideoRef.current.volume = newVolume;
    }
    if (localStreamRef.current) {
      // This might not directly control stream volume but can affect playback
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    if (localVideoRef.current) {
      localVideoRef.current.muted = !isMuted; // Toggle actual audio element mute
    }
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled; // Toggle stream track enable
      });
    }
  }, [isMuted]);

  const changeAudioOutput = useCallback(async (deviceId) => {
    if (typeof localVideoRef.current.setSinkId === "function") {
      try {
        await localVideoRef.current.setSinkId(deviceId);
        setSelectedAudioOutput(deviceId);
        console.log(`Audio output changed to ${deviceId}`);
      } catch (error) {
        console.error("Error setting audio output device:", error);
      }
    } else {
      console.warn("setSinkId not supported on this browser.");
    }
  }, []);

  const cleanup = useCallback(() => {
    console.log("JanusDeviceTest: Performing cleanup");
    if (pluginHandleRef.current) {
      pluginHandleRef.current.hangup();
      pluginHandleRef.current.detach();
      pluginHandleRef.current = null;
    }
    if (janusRef.current) {
      janusRef.current.destroy();
      janusRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    stopAudioLevelTimer();
    stopBitrateTimer();
    cleanupAudioMonitoring();
    setIsTesting(false);
    setJanusConnected(false);
    setTestStatus("");
    setConnectionError(null);
  }, [
    stopAudioLevelTimer,
    stopBitrateTimer,
    cleanupAudioMonitoring,
    setIsTesting,
    setJanusConnected,
    setTestStatus,
    setConnectionError,
  ]);

  // Initialize Janus connection and enumerate devices
  useEffect(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusDeviceTest: Running in demo mode");
      setJanusConnected(true);
      setTestStatus("Demo mode - Device testing simulated");
      setVideoDevices(demoVideoDevices);
      setAudioInputDevices(demoAudioInputDevices);
      setAudioOutputDevices(demoAudioOutputDevices);
      setSelectedVideoDevice("default");
      setSelectedAudioInput("default");
      setSelectedAudioOutput("default");
      return;
    }

    enumerateDevices();

    const initializeJanus = () => {
      if (typeof window !== "undefined" && window.Janus) {
        console.log("JanusDeviceTest: Initializing Janus...");

        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log("JanusDeviceTest: Janus initialized");
            connectToJanus();
          },
        });
      } else {
        console.log("JanusDeviceTest: Janus library not loaded");
        setTimeout(initializeJanus, 1000);
      }
    };

    initializeJanus();

    return () => {
      cleanup();
    };
  }, [
    IS_DEMO_MODE,
    enumerateDevices,
    connectToJanus,
    cleanup,
    setJanusConnected,
    setTestStatus,
    setVideoDevices,
    setAudioInputDevices,
    setAudioOutputDevices,
    setSelectedVideoDevice,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    demoVideoDevices,
    demoAudioInputDevices,
    demoAudioOutputDevices,
  ]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-800 text-white p-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <FaCog />
          <span>Device Testing</span>
        </h3>
        <p className="text-sm text-gray-300">
          Test and configure your audio/video devices
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Device Selection */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">
              Device Selection
            </h4>

            {/* Video Device */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Camera
              </label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => setSelectedVideoDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isTesting}
              >
                {videoDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Input Device */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Microphone
              </label>
              <select
                value={selectedAudioInput}
                onChange={(e) => setSelectedAudioInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isTesting}
              >
                {audioInputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label ||
                      `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Output Device */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speakers
              </label>
              <select
                value={selectedAudioOutput}
                onChange={(e) => changeAudioOutput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {audioOutputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Device Controls */}
            <div className="flex space-x-4">
              <button
                onClick={enumerateDevices}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                disabled={isTesting}
              >
                <FaRedo />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Video Preview and Controls */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">
              Preview & Test
            </h4>

            {/* Video Preview */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-cover"
              />
              {!videoEnabled && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                  <FaVideoSlash className="w-12 h-12 text-gray-400" />
                </div>
              )}
              {!isTesting && (
                <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
                  <div className="text-center text-white">
                    <FaPlay className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Start test to preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Level Indicator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Level
              </label>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(audioLevel, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded bg-gray-200 hover:bg-gray-300"
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
                className="flex-1"
                disabled={isMuted}
              />
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  videoEnabled
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
              </button>

              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  audioEnabled
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>

              {isTesting && (
                <div className="text-sm text-gray-600">
                  Bitrate: {bitrate} kbps
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              {!isTesting ? (
                <button
                  onClick={() => startTest()}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                  disabled={
                    (!IS_DEMO_MODE && !janusConnected) ||
                    (!videoEnabled && !audioEnabled)
                  }
                >
                  <FaPlay />
                  <span>Start Test</span>
                </button>
              ) : (
                <button
                  onClick={stopTest}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <FaStop />
                  <span>Stop Test</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {connectionError && (
          <div className="text-red-500 text-sm text-center mt-4">
            {connectionError}
          </div>
        )}

        <div className="text-sm text-gray-600 text-center mt-4">
          {testStatus}
        </div>
      </div>

      {IS_DEMO_MODE && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded text-sm font-semibold">
          DEMO MODE
        </div>
      )}
    </div>
  );
});

JanusDeviceTest.displayName = "JanusDeviceTest";

export default JanusDeviceTest;
