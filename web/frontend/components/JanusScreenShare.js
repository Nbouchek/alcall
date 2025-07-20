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
  FaDesktop,
  FaStop,
  FaExpand,
  FaCompress,
  FaUsers,
  FaEye,
  FaCog,
  FaShareAlt,
} from "react-icons/fa";

const JanusScreenShare = forwardRef(({ user, onShareEnd }, ref) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [janusConnected, setJanusConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [roomId, setRoomId] = useState("screenshare");
  const [participants, setParticipants] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [selectedPublisher, setSelectedPublisher] = useState(null);

  // Check if we're in demo mode (Render deployment)
  const IS_DEMO_MODE =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("onrender.com") ||
      window.location.hostname.includes("render.com")) &&
    !(process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true");

  // Janus-specific refs
  const janusRef = useRef(null);
  const publisherHandleRef = useRef(null);
  const subscriberHandleRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Janus configuration
  const JANUS_URL = process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
  const JANUS_HTTP_URL =
    process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

  // VideoRoom plugin name (used for screen sharing)
  const VIDEOROOM_PLUGIN = "janus.plugin.videoroom";

  // Demo data
  const demoPublishers = useMemo(
    () => [
      { id: 1, display: "Alice's Screen", video: true, audio: false },
      { id: 2, display: "Bob's Presentation", video: true, audio: true },
    ],
    []
  );

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    startScreenShare: () => {
      console.log("JanusScreenShare: startScreenShare called");
      startScreenShare();
    },
    stopScreenShare: () => {
      console.log("JanusScreenShare: stopScreenShare called");
      stopScreenShare();
    },
    viewScreen: (publisherId) => {
      console.log("JanusScreenShare: viewScreen called for:", publisherId);
      viewScreen(publisherId);
    },
    stopViewing: () => {
      console.log("JanusScreenShare: stopViewing called");
      stopViewing();
    },
    getShareStatus: () => {
      return {
        isSharing: IS_DEMO_MODE ? true : isSharing,
        isViewing: IS_DEMO_MODE ? true : isViewing,
        shareStatus,
        janusConnected: IS_DEMO_MODE ? true : janusConnected,
        roomId,
        publishers: IS_DEMO_MODE ? demoPublishers : publishers,
      };
    },
  }));

  const connectToJanus = useCallback(() => {
    if (janusRef.current) {
      console.log("JanusScreenShare: Already connected to Janus");
      return;
    }

    janusRef.current = new window.Janus({
      server: JANUS_URL,
      success: () => {
        console.log("JanusScreenShare: Connected to Janus");
        setJanusConnected(true);
        setShareStatus("Connected to Janus server");
        attachPublisherPlugin();
      },
      error: (error) => {
        console.error("JanusScreenShare: Failed to connect to Janus:", error);
        setConnectionError("Failed to connect to Janus server");
        setJanusConnected(false);
      },
      destroyed: () => {
        console.log("JanusScreenShare: Janus connection destroyed");
        setJanusConnected(false);
      },
    });
  }, [
    JANUS_URL,
    setJanusConnected,
    setShareStatus,
    setConnectionError,
    attachPublisherPlugin,
  ]);

  // Initialize Janus connection
  useEffect(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusScreenShare: Running in demo mode");
      setJanusConnected(true);
      setShareStatus("Demo mode - Screen sharing simulated");
      setPublishers(demoPublishers);
      return;
    }

    const initializeJanus = () => {
      if (typeof window !== "undefined" && window.Janus) {
        console.log("JanusScreenShare: Initializing Janus...");

        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log("JanusScreenShare: Janus initialized");
            connectToJanus();
          },
        });
      } else {
        console.log("JanusScreenShare: Janus library not loaded");
        setTimeout(initializeJanus, 1000);
      }
    };

    initializeJanus();

    return () => {
      cleanup();
    };
  }, [
    IS_DEMO_MODE,
    connectToJanus,
    cleanup,
    setJanusConnected,
    setShareStatus,
    setPublishers,
    demoPublishers,
  ]);

  const attachPublisherPlugin = useCallback(() => {
    janusRef.current.attach({
      plugin: VIDEOROOM_PLUGIN,
      success: (pluginHandle) => {
        console.log("JanusScreenShare: Publisher plugin attached");
        publisherHandleRef.current = pluginHandle;
        joinRoom();
      },
      error: (error) => {
        console.error(
          "JanusScreenShare: Failed to attach publisher plugin:",
          error
        );
        setConnectionError("Failed to connect to videoroom plugin");
      },
      onmessage: handlePublisherMessage,
      onlocalstream: (stream) => {
        console.log("JanusScreenShare: Local screen stream received");
        screenStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      },
      oncleanup: () => {
        console.log("JanusScreenShare: Publisher cleanup");
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      },
    });
  }, [
    janusRef,
    VIDEOROOM_PLUGIN,
    joinRoom,
    handlePublisherMessage,
    setConnectionError,
  ]);

  const attachSubscriberPlugin = useCallback(() => {
    janusRef.current.attach({
      plugin: VIDEOROOM_PLUGIN,
      success: (pluginHandle) => {
        console.log("JanusScreenShare: Subscriber plugin attached");
        subscriberHandleRef.current = pluginHandle;
      },
      error: (error) => {
        console.error(
          "JanusScreenShare: Failed to attach subscriber plugin:",
          error
        );
      },
      onmessage: handleSubscriberMessage,
      onremotestream: (stream) => {
        console.log("JanusScreenShare: Remote screen stream received");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      oncleanup: () => {
        console.log("JanusScreenShare: Subscriber cleanup");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      },
    });
  }, [janusRef, VIDEOROOM_PLUGIN, handleSubscriberMessage]);

  const joinRoom = useCallback(() => {
    if (!publisherHandleRef.current) return;

    const joinRequest = {
      request: "join",
      room: roomId,
      ptype: "publisher",
      display: user?.name || "Screen Sharer",
    };

    publisherHandleRef.current.send({
      message: joinRequest,
      success: (result) => {
        console.log("JanusScreenShare: Joined room:", result);
        setShareStatus("Joined screen sharing room");
      },
      error: (error) => {
        console.error("JanusScreenShare: Failed to join room:", error);
        setShareStatus("Failed to join room");
      },
    });
  }, [publisherHandleRef, roomId, user, setShareStatus]);

  const startScreenShare = useCallback(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusScreenShare: Starting demo screen share");
      setIsSharing(true);
      setShareStatus("Demo screen sharing active");
      return;
    }

    if (!publisherHandleRef.current) {
      console.error("JanusScreenShare: Publisher plugin not attached");
      return;
    }

    setShareStatus("Starting screen capture...");

    // Get screen share
    navigator.mediaDevices
      .getDisplayMedia({ video: true, audio: true }) // Request screen and audio
      .then((stream) => {
        screenStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Publish screen stream
        publisherHandleRef.current.createOffer({
          media: {
            video: "screen",
            audioSend: true,
            audioRecv: false,
            videoSend: true,
            videoRecv: false,
          },
          stream: stream,
          success: (jsep) => {
            const publish = { request: "configure", audio: true, video: true };
            publisherHandleRef.current.send({ message: publish, jsep: jsep });
            setIsSharing(true);
            setShareStatus("Screen sharing active");
          },
          error: (error) => {
            console.error(
              "JanusScreenShare: Failed to create offer for screen share:",
              error
            );
            setShareStatus("Failed to start screen share");
            setConnectionError("Failed to create screen share offer");
            stopScreenShare(); // Ensure cleanup on error
          },
        });
      })
      .catch((error) => {
        console.error("JanusScreenShare: Failed to get display media:", error);
        setShareStatus("Screen capture denied or failed");
        setConnectionError("Permission denied for screen capture");
      });
  }, [
    IS_DEMO_MODE,
    publisherHandleRef,
    stopScreenShare,
    setIsSharing,
    setShareStatus,
    setConnectionError,
  ]);

  const stopScreenShare = useCallback(() => {
    console.log("JanusScreenShare: Stopping screen share");

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (!IS_DEMO_MODE && publisherHandleRef.current) {
      const unpublishRequest = {
        request: "unpublish",
      };

      publisherHandleRef.current.send({
        message: unpublishRequest,
        success: (result) => {
          console.log("JanusScreenShare: Unpublish successful:", result);
        },
        error: (error) => {
          console.error("JanusScreenShare: Failed to unpublish:", error);
        },
      });
    }

    setIsSharing(false);
    setShareStatus("Screen sharing stopped");

    if (onShareEnd) {
      onShareEnd();
    }
  }, [
    IS_DEMO_MODE,
    publisherHandleRef,
    onShareEnd,
    setIsSharing,
    setShareStatus,
  ]);

  const viewScreen = useCallback(
    (publisherId) => {
      if (IS_DEMO_MODE) {
        console.log("JanusScreenShare: Viewing demo screen:", publisherId);
        const publisher = demoPublishers.find((p) => p.id === publisherId);
        setSelectedPublisher(publisher);
        setIsViewing(true);
        setShareStatus(`Viewing ${publisher?.display}`);
        return;
      }

      if (!subscriberHandleRef.current) {
        attachSubscriberPlugin();
        setTimeout(() => viewScreen(publisherId), 1000);
        return;
      }

      const publisher = publishers.find((p) => p.id === publisherId);
      if (!publisher) {
        console.error("JanusScreenShare: Publisher not found:", publisherId);
        return;
      }

      setSelectedPublisher(publisher);
      setShareStatus("Subscribing to screen...");

      const subscribeRequest = {
        request: "join",
        room: roomId,
        ptype: "subscriber",
        feed: publisherId,
      };

      subscriberHandleRef.current.send({
        message: subscribeRequest,
        success: (result) => {
          console.log("JanusScreenShare: Subscribe successful:", result);
          setIsViewing(true);
          setShareStatus(`Viewing ${publisher.display}`);
        },
        error: (error) => {
          console.error("JanusScreenShare: Failed to subscribe:", error);
          setShareStatus("Failed to view screen");
        },
      });
    },
    [
      IS_DEMO_MODE,
      publishers,
      roomId,
      subscriberHandleRef,
      attachSubscriberPlugin,
      setSelectedPublisher,
      setIsViewing,
      setShareStatus,
    ]
  );

  const stopViewing = useCallback(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusScreenShare: Stopping demo viewing");
      setIsViewing(false);
      setSelectedPublisher(null);
      return;
    }

    if (subscriberHandleRef.current) {
      subscriberHandleRef.current.hangup();
      subscriberHandleRef.current.detach();
      subscriberHandleRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsViewing(false);
    setSelectedPublisher(null);
    setShareStatus("Stopped viewing screen");
  }, [IS_DEMO_MODE, setIsViewing, setSelectedPublisher, setShareStatus]);

  const handlePublisherMessage = useCallback(
    (msg, jsep) => {
      console.log("JanusScreenShare: Publisher message received", msg);

      if (jsep) {
        console.log("JanusScreenShare: Handling publisher JSEP:", jsep);
        publisherHandleRef.current.handleRemoteJsep({ jsep: jsep });
      }

      const event = msg.videoroom;
      if (event) {
        if (event === "joined") {
          const newPublishers = msg.publishers || [];
          console.log("JanusScreenShare: Current publishers:", newPublishers);
          setPublishers(newPublishers);
        } else if (event === "event") {
          // Publisher list updated
          if (msg.publishers) {
            const newPublishers = msg.publishers || [];
            setPublishers((prev) => {
              const updated = [...prev];
              newPublishers.forEach((p) => {
                if (!updated.some((existing) => existing.id === p.id)) {
                  updated.push(p);
                }
              });
              return updated;
            });
          }
          // Leaving or unpublishing
          if (msg.leaving) {
            console.log("JanusScreenShare: Publisher leaving:", msg.leaving);
            setPublishers((prev) => prev.filter((p) => p.id !== msg.leaving));
            if (selectedPublisher?.id === msg.leaving) {
              stopViewing(); // Stop viewing if the publisher leaves
            }
          }
          if (msg.unpublished) {
            console.log(
              "JanusScreenShare: Publisher unpublished:",
              msg.unpublished
            );
            setPublishers((prev) =>
              prev.filter((p) => p.id !== msg.unpublished)
            );
            if (selectedPublisher?.id === msg.unpublished) {
              stopViewing(); // Stop viewing if the publisher unpublishes
            }
          }
        }
      }
    },
    [setPublishers, selectedPublisher, stopViewing, demoPublishers]
  );

  const handleSubscriberMessage = useCallback(
    (msg, jsep) => {
      console.log("JanusScreenShare: Subscriber message received", msg);

      if (jsep) {
        console.log("JanusScreenShare: Handling subscriber JSEP:", jsep);
        subscriberHandleRef.current.handleRemoteJsep({ jsep: jsep });

        const body = { request: "start" };
        subscriberHandleRef.current.send({ message: body });
      }

      const event = msg.videoroom;
      if (event) {
        if (event === "attached") {
          console.log("JanusScreenShare: Subscriber attached");
        } else if (event === "event") {
          // Handle subscriber events if needed
        }
      }
    },
    [subscriberHandleRef]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const cleanup = useCallback(() => {
    console.log("JanusScreenShare: Performing cleanup");
    if (publisherHandleRef.current) {
      publisherHandleRef.current.hangup();
      publisherHandleRef.current.detach();
      publisherHandleRef.current = null;
    }
    if (subscriberHandleRef.current) {
      subscriberHandleRef.current.hangup();
      subscriberHandleRef.current.detach();
      subscriberHandleRef.current = null;
    }
    if (janusRef.current) {
      janusRef.current.destroy();
      janusRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsSharing(false);
    setIsViewing(false);
    setJanusConnected(false);
    setShareStatus("");
    setConnectionError(null);
    setPublishers([]);
    setSelectedPublisher(null);
  }, [
    setIsSharing,
    setIsViewing,
    setJanusConnected,
    setShareStatus,
    setConnectionError,
    setPublishers,
    setSelectedPublisher,
  ]);

  // Screen sharing UI
  if (isSharing) {
    return (
      <div
        className={`screen-share-container ${
          isFullscreen ? "fixed inset-0 z-50 bg-black" : "relative"
        }`}
      >
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="text-lg font-semibold flex items-center space-x-2">
              <FaDesktop />
              <span>Screen Sharing</span>
            </div>
            <div className="text-sm text-gray-300">{shareStatus}</div>
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

        {/* Screen Preview */}
        <div className="relative bg-gray-900 flex items-center justify-center min-h-96">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />

          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm font-semibold">
            SHARING
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 flex justify-center">
          <button
            onClick={stopScreenShare}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaStop />
            <span>Stop Sharing</span>
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

  // Screen viewing UI
  if (isViewing) {
    return (
      <div
        className={`screen-view-container ${
          isFullscreen ? "fixed inset-0 z-50 bg-black" : "relative"
        }`}
      >
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="text-lg font-semibold flex items-center space-x-2">
              <FaEye />
              <span>{selectedPublisher?.display || "Screen View"}</span>
            </div>
            <div className="text-sm text-gray-300">{shareStatus}</div>
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

        {/* Screen View */}
        <div className="relative bg-gray-900 flex items-center justify-center min-h-96">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />

          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <FaDesktop className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Loading screen...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 flex justify-center">
          <button
            onClick={stopViewing}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaStop />
            <span>Stop Viewing</span>
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

  // Main screen sharing interface
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-800 text-white p-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <FaShareAlt />
          <span>Screen Sharing</span>
        </h3>
        <p className="text-sm text-gray-300">
          Share your screen or view others
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {/* Share Screen Section */}
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Share Your Screen
            </h4>
            <button
              onClick={startScreenShare}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg flex items-center space-x-3 mx-auto transition-colors"
              disabled={!IS_DEMO_MODE && !janusConnected}
            >
              <FaDesktop className="w-6 h-6" />
              <span>Start Screen Share</span>
            </button>
          </div>

          {/* Available Screens Section */}
          {publishers.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <FaUsers />
                <span>Available Screens</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publishers.map((publisher) => (
                  <div
                    key={publisher.id}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-800">
                        {publisher.display}
                      </h5>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        {publisher.video && <FaDesktop />}
                        {publisher.audio && <span>🔊</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => viewScreen(publisher.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded transition-colors flex items-center justify-center space-x-2"
                    >
                      <FaEye />
                      <span>View Screen</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {connectionError && (
          <div className="text-red-500 text-sm text-center mt-4">
            {connectionError}
          </div>
        )}

        <div className="text-sm text-gray-600 text-center mt-4">
          {shareStatus}
        </div>
      </div>
    </div>
  );
});

JanusScreenShare.displayName = "JanusScreenShare";

export default JanusScreenShare;
