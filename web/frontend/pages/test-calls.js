import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import JanusVideoCall from "../components/JanusVideoCall";
import JanusEchoTest from "../components/JanusEchoTest";
import JanusStreaming from "../components/JanusStreaming";
import JanusVideoCallP2P from "../components/JanusVideoCallP2P";
import JanusTextRoom from "../components/JanusTextRoom";
import JanusScreenShare from "../components/JanusScreenShare";
import JanusDeviceTest from "../components/JanusDeviceTest";
import AudioCallHandler from "../components/AudioCallHandler";
import VideoCallInterface from "../components/VideoCallInterface";
import {
  FaPhone,
  FaVideo,
  FaPlay,
  FaArrowLeft,
  FaCog,
  FaUser,
  FaRocket,
  FaDesktop,
  FaComments,
  FaMicrophone,
  FaStream,
} from "react-icons/fa";

// Force normal mode for all Janus tests
const FORCE_NORMAL_MODE =
  process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true" || true;

export default function TestCalls() {
  const [activeTest, setActiveTest] = useState(null);
  const [user, setUser] = useState({ id: 1, username: "TestUser" });
  const [selectedReceiver, setSelectedReceiver] = useState({
    id: 2,
    username: "TestReceiver",
  });
  const [isRenderDeployment, setIsRenderDeployment] = useState(false);

  const audioCallRef = useRef(null);
  const videoCallRef = useRef(null);
  const videoCallInterfaceRef = useRef(null);
  const echoTestRef = useRef(null);
  const streamingRef = useRef(null);
  const videoCallP2PRef = useRef(null);
  const textRoomRef = useRef(null);
  const screenShareRef = useRef(null);
  const deviceTestRef = useRef(null);

  const tests = [
    {
      id: "audio",
      title: "Audio Call Test",
      description: "Test audio calling functionality using AudioBridge plugin",
      icon: <FaPhone className="w-8 h-8" />,
      color: "from-green-400 to-emerald-500",
      component: "audio",
    },
    {
      id: "video",
      title: "Video Call Test",
      description: "Test video calling functionality using VideoRoom plugin",
      icon: <FaVideo className="w-8 h-8" />,
      color: "from-blue-400 to-indigo-500",
      component: "video",
    },
    {
      id: "video-interface",
      title: "Modern Video Call",
      description:
        "Test modern unified video calling interface with advanced features",
      icon: <FaVideo className="w-8 h-8" />,
      color: "from-purple-400 to-violet-500",
      component: "video-interface",
    },
    {
      id: "echo",
      title: "Echo Test",
      description:
        "Test audio/video with echo functionality using EchoTest plugin",
      icon: <FaPlay className="w-8 h-8" />,
      color: "from-purple-400 to-pink-500",
      component: "echo",
    },
    {
      id: "streaming",
      title: "Media Streaming",
      description:
        "Test live and on-demand media streaming using Streaming plugin",
      icon: <FaStream className="w-8 h-8" />,
      color: "from-red-400 to-rose-500",
      component: "streaming",
    },
    {
      id: "videocall-p2p",
      title: "P2P Video Call",
      description: "Test peer-to-peer video calling using VideoCall plugin",
      icon: <FaPhone className="w-8 h-8" />,
      color: "from-cyan-400 to-teal-500",
      component: "videocall-p2p",
    },
    {
      id: "textroom",
      title: "Text Room",
      description: "Test text-only chat rooms using TextRoom plugin",
      icon: <FaComments className="w-8 h-8" />,
      color: "from-yellow-400 to-orange-500",
      component: "textroom",
    },
    {
      id: "screenshare",
      title: "Screen Sharing",
      description: "Test screen sharing functionality using VideoRoom plugin",
      icon: <FaDesktop className="w-8 h-8" />,
      color: "from-indigo-400 to-purple-500",
      component: "screenshare",
    },
    {
      id: "device-test",
      title: "Device Testing",
      description:
        "Test and configure audio/video devices using EchoTest plugin",
      icon: <FaMicrophone className="w-8 h-8" />,
      color: "from-gray-400 to-slate-500",
      component: "device-test",
    },
  ];

  const handleTestSelect = (testId) => {
    setActiveTest(testId);
  };

  const handleBackToTests = () => {
    setActiveTest(null);

    // Stop any active tests
    if (audioCallRef.current) {
      audioCallRef.current.endCall?.();
    }
    if (videoCallRef.current) {
      videoCallRef.current.endCall?.();
    }
    if (videoCallInterfaceRef.current) {
      videoCallInterfaceRef.current.endCall?.();
    }
    if (echoTestRef.current) {
      echoTestRef.current.stopTest?.();
    }
    if (streamingRef.current) {
      streamingRef.current.stopStreaming?.();
    }
    if (videoCallP2PRef.current) {
      videoCallP2PRef.current.endCall?.();
    }
    if (textRoomRef.current) {
      textRoomRef.current.leaveRoom?.();
    }
    if (screenShareRef.current) {
      screenShareRef.current.stopScreenShare?.();
      screenShareRef.current.stopViewing?.();
    }
    if (deviceTestRef.current) {
      deviceTestRef.current.stopTest?.();
    }
  };

  const renderTestComponent = () => {
    switch (activeTest) {
      case "audio":
        return (
          <div className="max-w-4xl mx-auto">
            <AudioCallHandler
              ref={audioCallRef}
              user={user}
              selectedReceiver={selectedReceiver}
              onCallEnd={handleBackToTests}
              getUserName={(id) => (id === 1 ? "TestUser" : "TestReceiver")}
            />
          </div>
        );
      case "video":
        return (
          <div className="max-w-6xl mx-auto">
            <JanusVideoCall
              ref={videoCallRef}
              user={user}
              selectedReceiver={selectedReceiver}
              onCallEnd={handleBackToTests}
              getUserName={(id) => (id === 1 ? "TestUser" : "TestReceiver")}
            />
          </div>
        );
      case "video-interface":
        return (
          <div className="max-w-6xl mx-auto">
            <VideoCallInterface
              ref={videoCallInterfaceRef}
              user={user}
              selectedReceiver={selectedReceiver}
              onCallEnd={handleBackToTests}
              sendCallNotification={(type, message) =>
                console.log(`Notification (${type}):`, message)
              }
              onError={(error) =>
                console.error("VideoCallInterface error:", error)
              }
              callState="calling"
              roomId="test_room_123"
              isIncoming={false}
            />
          </div>
        );
      case "echo":
        return (
          <div className="max-w-4xl mx-auto">
            <JanusEchoTest
              ref={echoTestRef}
              user={user}
              onTestEnd={handleBackToTests}
            />
          </div>
        );
      case "streaming":
        return (
          <div className="max-w-6xl mx-auto">
            <JanusStreaming
              ref={streamingRef}
              user={user}
              onStreamEnd={handleBackToTests}
            />
          </div>
        );
      case "videocall-p2p":
        return (
          <div className="max-w-6xl mx-auto">
            <JanusVideoCallP2P
              ref={videoCallP2PRef}
              user={user}
              onCallEnd={handleBackToTests}
            />
          </div>
        );
      case "textroom":
        return (
          <div className="max-w-4xl mx-auto">
            <JanusTextRoom
              ref={textRoomRef}
              user={user}
              onLeaveRoom={handleBackToTests}
            />
          </div>
        );
      case "screenshare":
        return (
          <div className="max-w-6xl mx-auto">
            <JanusScreenShare
              ref={screenShareRef}
              user={user}
              onShareEnd={handleBackToTests}
            />
          </div>
        );
      case "device-test":
        return (
          <div className="max-w-6xl mx-auto">
            <JanusDeviceTest
              ref={deviceTestRef}
              user={user}
              onTestEnd={handleBackToTests}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Check if we're on Render deployment
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isRender =
        hostname.includes("onrender.com") || hostname.includes("render.com");
      setIsRenderDeployment(isRender);
      console.log("TestCalls: Hostname:", hostname);
      console.log("TestCalls: Is Render deployment:", isRender);
      console.log("TestCalls: FORCE_NORMAL_MODE:", FORCE_NORMAL_MODE);
      console.log(
        "TestCalls: Will use normal mode:",
        FORCE_NORMAL_MODE || !isRender
      );
    }
  }, []);

  if (activeTest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <Head>
          <title>
            {tests.find((t) => t.id === activeTest)?.title} - UnifiedChat
          </title>
          <meta name="description" content="Test calling features" />
        </Head>

        {/* Header */}
        <header className="bg-black/50 backdrop-blur-sm p-4 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBackToTests}
              className="flex items-center space-x-2 text-white hover:text-yellow-300 transition-colors"
            >
              <FaArrowLeft />
              <span>Back to Tests</span>
            </button>

            <h1 className="text-xl font-bold">
              {tests.find((t) => t.id === activeTest)?.title}
            </h1>

            <div className="flex items-center space-x-2">
              <FaUser className="w-5 h-5" />
              <span>{user.username}</span>
            </div>
          </div>
        </header>

        {/* Test Component */}
        <main className="p-4">{renderTestComponent()}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <Head>
        <title>Call Tests - UnifiedChat</title>
        <meta
          name="description"
          content="Test audio and video calling features"
        />
        <script src="/janus.js" async></script>
      </Head>

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm p-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <FaRocket className="w-8 h-8 text-yellow-400 animate-bounce" />
            <h1 className="text-4xl font-bold text-white">
              UnifiedChat Call Tests
            </h1>
          </div>
          <p className="text-xl text-blue-100">
            Comprehensive testing suite for all Janus WebRTC Gateway features
            including calls, streaming, chat, and device management
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Test Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tests.map((test) => (
              <div
                key={test.id}
                className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => handleTestSelect(test.id)}
              >
                {/* Glowing border effect */}
                <div
                  className={`absolute -inset-1 bg-gradient-to-r ${test.color} rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300`}
                ></div>

                <div className="relative">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${test.color} rounded-xl flex items-center justify-center mb-4 mx-auto text-white`}
                  >
                    {test.icon}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 text-center">
                    {test.title}
                  </h3>

                  <p className="text-blue-100 text-center text-sm leading-relaxed">
                    {test.description}
                  </p>

                  <div className="mt-4 flex justify-center">
                    <button
                      className={`px-4 py-2 bg-gradient-to-r ${test.color} text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300`}
                    >
                      Start Test
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Information Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
              <FaCog className="mr-3 text-yellow-400" />
              About These Tests
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-blue-100">
              <div>
                <h3 className="font-semibold text-white mb-2">
                  Audio Call Test
                </h3>
                <p className="text-sm">
                  Tests the AudioBridge plugin for voice-only communication.
                  Perfect for testing audio quality and connectivity.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">
                  Video Call Test
                </h3>
                <p className="text-sm">
                  Tests the VideoRoom plugin for full video conferencing.
                  Supports multiple participants and screen sharing.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Echo Test</h3>
                <p className="text-sm">
                  Tests the EchoTest plugin for audio/video echo functionality.
                  Great for testing your microphone and camera setup.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">
                  Media Streaming
                </h3>
                <p className="text-sm">
                  Tests the Streaming plugin for live and on-demand media. Watch
                  streams with full media controls and bitrate monitoring.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">
                  P2P Video Call
                </h3>
                <p className="text-sm">
                  Tests the VideoCall plugin for peer-to-peer calling. Direct
                  video calls between two participants with full controls.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Text Room</h3>
                <p className="text-sm">
                  Tests the TextRoom plugin for text-only chat. Join chat rooms
                  using DataChannels for real-time messaging.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">
                  Screen Sharing
                </h3>
                <p className="text-sm">
                  Tests screen sharing using the VideoRoom plugin. Share your
                  screen or view others' screens in real-time.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">
                  Device Testing
                </h3>
                <p className="text-sm">
                  Tests and configures audio/video devices. Select specific
                  cameras, microphones, and speakers for optimal quality.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
              <p className="text-yellow-100 text-sm">
                <strong>Note:</strong> These tests require a working Janus
                WebRTC Gateway server with the following plugins enabled:
                VideoRoom, AudioBridge, EchoTest, Streaming, VideoCall, and
                TextRoom. Make sure the Janus service is running and accessible
                before starting any tests.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-sm p-6 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-blue-200">
            Powered by{" "}
            <a
              href="https://janus.conf.meetecho.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300 font-semibold"
            >
              Janus WebRTC Gateway
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
