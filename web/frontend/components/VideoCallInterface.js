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
    const lastBytesSent = useRef(0);
    const lastTimestamp = useRef(0);

    // Callbacks
    const cleanup = useCallback(() => {
      console.log("VideoCallInterface: Running cleanup...");

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
        qualityCheckIntervalRef.current = null;
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      remoteStreamsRef.current.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      setRemoteStreams(new Map());
      remoteStreamsRef.current.clear();

      if (janusRef.current) {
        janusRef.current.destroy();
        janusRef.current = null;
      }

      setIsInCall(false);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsScreenSharing(false);
      setCallDuration(0);
      setParticipants([]);
      setConnectionQuality("good");
      setNetworkStats({
        bitrate: 0,
        packetLoss: 0,
        latency: 0,
      });
      setJanusConnected(false);
      setConnectionError(null);
      setCurrentRoomId(null);
      setIsPublishing(false);
      setSubscriptions(new Map());
      setShowControls(true);
      setVolume(1.0);
      setIsMuted(false);
      setCallStatus("Call ended");

      onCallEnd?.();
    }, [localStream, onCallEnd]);

    const getUserMedia = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        return stream;
      } catch (error) {
        console.error("Error accessing media devices:", error);
        throw new Error(
          "Permission denied or no media devices available: " + error.message
        );
      }
    }, []);

    const connectToJanus = useCallback(() => {
      console.log("VideoCallInterface: Connecting to Janus...");
      janusRef.current = new window.Janus({
        server: JANUS_URL,
        iceServers: [], // Consider adding STUN/TURN servers
        success: () => {
          console.log("VideoCallInterface: Connected to Janus");
          setJanusConnected(true);
        },
        error: (error) => {
          console.error("VideoCallInterface: Janus connection error:", error);
          setConnectionError("Janus connection failed");
          onError?.("Video call connection error");
          cleanup();
        },
        destroyed: () => {
          console.log("VideoCallInterface: Janus connection destroyed");
          setJanusConnected(false);
          cleanup();
        },
      });
    }, [JANUS_URL, onError, cleanup]);

    const initializeJanus = useCallback(() => {
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
    }, [connectToJanus, onError]);

    const handlePublisherMessage = useCallback(
      (msg, jsep) => {
        console.log("VideoCallInterface: Publisher message received:", msg);

        const event = msg["videoroom"];
        if (event) {
          if (event === "joined") {
            const myid = msg["id"];
            const mypvtid = msg["private_id"];
            console.log(
              `Successfully joined room ${msg.room} with ID ${myid} (private ${mypvtid})`
            );
            setCallStatus("Connected");

            if (msg["publishers"]) {
              const newParticipants = msg["publishers"].map((publisher) => ({
                id: publisher.id,
                display: publisher.display,
                talking: publisher.talking,
              }));
              setParticipants((prev) => {
                const updated = new Set([
                  ...prev,
                  ...newParticipants.map((p) => JSON.stringify(p)),
                ]);
                return Array.from(updated).map((p) => JSON.parse(p));
              });

              // Subscribe to existing publishers
              msg["publishers"].forEach((publisher) => {
                console.log(
                  "VideoCallInterface: Subscribing to existing publisher",
                  publisher
                );
                createSubscriber(publisher.id, publisher.private_id);
              });
            }
          } else if (event === "event") {
            // Publisher event, e.g., participant list update, bitrate change, etc.
            if (msg["publishers"]) {
              const newParticipants = msg["publishers"].map((publisher) => ({
                id: publisher.id,
                display: publisher.display,
                talking: publisher.talking,
              }));
              setParticipants((prev) => {
                const updated = new Set([
                  ...prev,
                  ...newParticipants.map((p) => JSON.stringify(p)),
                ]);
                return Array.from(updated).map((p) => JSON.parse(p));
              });

              msg["publishers"].forEach((publisher) => {
                console.log(
                  "VideoCallInterface: New publisher in room",
                  publisher
                );
                createSubscriber(publisher.id, publisher.private_id);
              });
            } else if (msg["leaving"]) {
              // A participant left
              const leavingId = msg["leaving"];
              console.log("VideoCallInterface: Participant left", leavingId);
              setParticipants((prev) => prev.filter((p) => p.id !== leavingId));
              // Also clean up subscriber handle
              if (subscribersRef.current.has(leavingId)) {
                subscribersRef.current.get(leavingId).hangup();
                subscribersRef.current.delete(leavingId);
                setRemoteStreams((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(leavingId);
                  return newMap;
                });
              }
            } else if (msg["unpublished"]) {
              // A participant stopped publishing
              const unpublishedId = msg["unpublished"];
              console.log(
                "VideoCallInterface: Participant unpublished",
                unpublishedId
              );
              setParticipants((prev) =>
                prev.filter((p) => p.id !== unpublishedId)
              );
              if (subscribersRef.current.has(unpublishedId)) {
                subscribersRef.current.get(unpublishedId).hangup();
                subscribersRef.current.delete(unpublishedId);
                setRemoteStreams((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(unpublishedId);
                  return newMap;
                });
              }
            } else if (msg["error"]) {
              console.error(
                "VideoCallInterface: VideoRoom plugin error:",
                msg["error"]
              );
              setConnectionError(msg["error"]);
              onError?.(msg["error"]);
              cleanup();
            }
          }
        }

        if (jsep) {
          console.log("VideoCallInterface: Handling JSEP (publisher)", jsep);
          publisherRef.current.handleRemoteJsep(jsep);
        }
      },
      [onError, cleanup, createSubscriber]
    );

    const attachVideoRoomPlugin = useCallback(() => {
      if (!janusRef.current) {
        console.error(
          "VideoCallInterface: Janus not initialized, cannot attach plugin"
        );
        return;
      }
      console.log("VideoCallInterface: Attaching VideoRoom plugin...");

      janusRef.current.attach({
        plugin: VIDEOROOM_PLUGIN,
        opaqueId: "videoroom-" + window.Janus.randomString(12),
        success: (pluginHandle) => {
          console.log(
            "VideoCallInterface: VideoRoom plugin attached",
            pluginHandle
          );
          publisherRef.current = pluginHandle;
          setIsPublishing(true);
        },
        error: (error) => {
          console.error(
            "VideoCallInterface: Error attaching VideoRoom plugin:",
            error
          );
          setConnectionError("Failed to attach video plugin");
          onError?.("Video plugin error");
          cleanup();
        },
        consentDialog: (on) => {
          console.log("VideoCallInterface: Consent dialog", on);
          // Implement UI for consent if needed
        },
        iceState: (state) => {
          console.log("VideoCallInterface: ICE state changed: " + state);
        },
        mediaState: (medium, on) => {
          console.log(
            "VideoCallInterface: Media state changed - " + medium + " " + on
          );
        },
        webrtcState: (on) => {
          console.log(
            "VideoCallInterface: WebRTC peer connection state changed: " + on
          );
        },
        slowLink: (uplink, lost, mid) => {
          console.log(
            "VideoCallInterface: Janus reports slow link uplink " +
              uplink +
              " lost " +
              lost +
              " mid " +
              mid
          );
          setConnectionQuality("poor");
        },
        onmessage: (msg, jsep) => {
          handlePublisherMessage(msg, jsep);
        },
        onlocalstream: (stream) => {
          console.log("VideoCallInterface: Local stream received", stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play();
          }
        },
        onremotestream: (stream) => {
          // This is for publisher's own remote stream (e.g., echo test). Handled by subscribers.
          console.log(
            "VideoCallInterface: Publisher got remote stream (should not happen)",
            stream
          );
        },
        oncleanup: () => {
          console.log("VideoCallInterface: Publisher plugin cleaned up");
          setIsPublishing(false);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
        },
      });
    }, [janusRef, onError, cleanup, handlePublisherMessage]);

    const handleSubscriberMessage = useCallback(
      (id, msg, jsep) => {
        console.log(
          `VideoCallInterface: Subscriber message for ${id} received:`,
          msg
        );

        const event = msg["videoroom"];
        if (event) {
          if (event === "attached") {
            // Subscriber attached successfully
            console.log("Subscriber attached to room");
          } else if (event === "event") {
            // Participant list, bitrate change, etc.
            if (msg["started"]) {
              // Subscriber has started receiving media
              console.log(`Subscriber for ${id} has started receiving media`);
            }
          } else if (msg["error"]) {
            console.error(
              `VideoCallInterface: Subscriber plugin error for ${id}:`,
              msg["error"]
            );
            onError?.(msg["error"]);
          }
        }

        if (jsep) {
          console.log(
            `VideoCallInterface: Handling JSEP (subscriber ${id})`,
            jsep
          );
          const subscriberHandle = subscribersRef.current.get(id);
          if (subscriberHandle) {
            subscriberHandle.createAnswer({
              jsep: jsep,
              media: { audioSend: false, videoSend: false }, // We're only receiving
              success: (jsepAnswer) => {
                console.log(
                  `VideoCallInterface: Got subscriber answer for ${id}!`,
                  jsepAnswer
                );
                const body = { request: "start" };
                subscriberHandle.send({ message: body, jsep: jsepAnswer });
              },
              error: (error) => {
                console.error(
                  `VideoCallInterface: WebRTC media error (subscriber ${id}):`,
                  error
                );
                onError?.("Media error: " + error.message);
              },
            });
          }
        }
      },
      [onError]
    );

    const createSubscriber = useCallback(
      (id, privateId) => {
        if (!janusRef.current) {
          console.error("Janus not initialized, cannot create subscriber");
          return;
        }

        let subscriberHandle = null;

        janusRef.current.attach({
          plugin: VIDEOROOM_PLUGIN,
          opaqueId: "videoroom-" + window.Janus.randomString(12),
          success: (pluginHandle) => {
            subscriberHandle = pluginHandle;
            subscribersRef.current.set(id, pluginHandle);
            console.log(
              `VideoCallInterface: Attached subscriber plugin for ${id}`,
              pluginHandle
            );

            const subscribeBody = {
              request: "join",
              room: parseInt(currentRoomId),
              ptype: "subscriber",
              feed: id,
              private_id: privateId,
            };
            subscriberHandle.send({ message: subscribeBody });
          },
          error: (error) => {
            console.error(
              `VideoCallInterface: Error attaching subscriber plugin for ${id}:`,
              error
            );
            onError?.(`Failed to subscribe to participant ${id}`);
          },
          onmessage: (msg, jsep) => {
            handleSubscriberMessage(id, msg, jsep);
          },
          onremotestream: (stream) => {
            console.log(
              `VideoCallInterface: Remote stream received for ${id}`,
              stream
            );
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              newMap.set(id, stream);
              return newMap;
            });
            remoteStreamsRef.current.set(id, stream);

            if (remoteVideoRefs.current.has(id)) {
              remoteVideoRefs.current.get(id).srcObject = stream;
            }
          },
          oncleanup: () => {
            console.log(
              `VideoCallInterface: Subscriber plugin for ${id} cleaned up`
            );
            subscribersRef.current.delete(id);
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            remoteStreamsRef.current.delete(id);
          },
        });
      },
      [janusRef, currentRoomId, onError, handleSubscriberMessage]
    );

    const joinRoom = useCallback(
      async (roomIdToJoin, streamToPublish) => {
        if (!janusRef.current) {
          console.error(
            "VideoCallInterface: Janus not initialized, cannot join room"
          );
          return;
        }
        if (!publisherRef.current) {
          console.error(
            "VideoCallInterface: Publisher plugin not attached, cannot join room"
          );
          // Try attaching again if it somehow got detached or failed
          attachVideoRoomPlugin();
          // Return to prevent further errors, hopefully, the next call will succeed
          return;
        }

        console.log("VideoCallInterface: Joining room: ", roomIdToJoin);
        setCurrentRoomId(roomIdToJoin);

        const joinAndPublish = () => {
          const body = {
            request: "join",
            room: parseInt(roomIdToJoin),
            ptype: "publisher",
            display: user?.username || "Guest",
          };

          const doPublish = () => {
            publisherRef.current.createOffer({
              media: {
                video: true,
                audioSend: true,
                videoSend: true,
                replaceVideo: false, // This is key for screensharing later
                replaceAudio: false,
              },
              simulcast: false,
              success: (jsep) => {
                console.log("VideoCallInterface: Got publisher SDP!", jsep);
                publisherRef.current.send({ message: body, jsep: jsep });
              },
              error: (error) => {
                console.error(
                  "VideoCallInterface: WebRTC media error (publisher):",
                  error
                );
                onError?.("Media error: " + error.message);
                cleanup();
              },
            });
          };

          // This needs to be done AFTER the join request, otherwise the server will complain
          if (streamToPublish) {
            console.log(
              "VideoCallInterface: Attaching local stream to publisher",
              streamToPublish
            );
            publisherRef.current.createOffer({
              media: {
                stream: streamToPublish,
                // video: true, // This is implicit with stream
                // audioSend: true, // This is implicit with stream
              },
              simulcast: false,
              success: (jsep) => {
                console.log("VideoCallInterface: Got publisher SDP!", jsep);
                publisherRef.current.send({ message: body, jsep: jsep });
              },
              error: (error) => {
                console.error(
                  "VideoCallInterface: WebRTC media error (publisher stream):",
                  error
                );
                onError?.("Media error: " + error.message);
                cleanup();
              },
            });
          } else {
            doPublish();
          }
        };

        // Create room if it doesn't exist, then join
        const createRoom = () => {
          const createBody = {
            request: "create",
            room: parseInt(roomIdToJoin),
            permanent: false,
            is_private: false,
            description: `Video Room ${roomIdToJoin}`,
            audiocodec: "opus",
            videocodec: "vp8",
            publishers: 10, // Max number of publishers
            bitrate: 128000, // 128 kbps
            fir_freq: 10, // Force Intra Request every 10 seconds
            // Optional: configure other settings like P-time, VP9, H264, etc.
          };
          publisherRef.current.send({
            message: createBody,
            success: (response) => {
              console.log(
                "VideoCallInterface: Room creation response",
                response
              );
              if (response["videoroom"] === "created" || response["exists"]) {
                console.log(
                  "VideoCallInterface: Room exists or created, joining..."
                );
                joinAndPublish();
              } else {
                console.error(
                  "VideoCallInterface: Failed to create room:",
                  response
                );
                setConnectionError("Failed to create video room");
                onError?.("Failed to create video room");
                cleanup();
              }
            },
            error: (error) => {
              console.error("VideoCallInterface: Error creating room:", error);
              setConnectionError("Failed to create video room");
              onError?.("Failed to create video room");
              cleanup();
            },
          });
        };

        // Check if room exists first
        const existsBody = {
          request: "exists",
          room: parseInt(roomIdToJoin),
        };
        publisherRef.current.send({
          message: existsBody,
          success: (response) => {
            console.log(
              "VideoCallInterface: Room exists check response",
              response
            );
            if (response["videoroom"] === "success" && response["exists"]) {
              console.log(
                "VideoCallInterface: Room already exists, joining..."
              );
              joinAndPublish();
            } else if (
              response["videoroom"] === "success" &&
              !response["exists"]
            ) {
              console.log(
                "VideoCallInterface: Room does not exist, creating..."
              );
              createRoom();
            } else {
              console.error(
                "VideoCallInterface: Error checking room existence:",
                response
              );
              setConnectionError("Failed to check room existence");
              onError?.("Failed to check video room existence");
              cleanup();
            }
          },
          error: (error) => {
            console.error(
              "VideoCallInterface: Error checking room existence:",
              error
            );
            setConnectionError("Failed to check room existence");
            onError?.("Failed to check video room existence");
            cleanup();
          },
        });
      },
      [
        user,
        onError,
        cleanup,
        attachVideoRoomPlugin,
        // localStream, // Removed this as it causes issues when stream is updated
        // publisherRef, // publisherRef.current is stable
      ]
    );

    const leaveRoom = useCallback(() => {
      if (!publisherRef.current) {
        console.log("No publisher to leave room");
        return;
      }
      const body = { request: "leave" };
      publisherRef.current.send({ message: body });
      publisherRef.current.hangup();
      cleanup();
    }, [cleanup]);

    const endCall = useCallback(() => {
      console.log("VideoCallInterface: Ending call via endCall()");
      leaveRoom();
      onCallEnd?.();
    }, [leaveRoom, onCallEnd]);

    const startCallTimer = useCallback(() => {
      setCallDuration(0);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }, []);

    const toggleVideo = useCallback(() => {
      if (publisherRef.current) {
        const newVideoState = !isVideoEnabled;
        publisherRef.current.send({
          message: { request: "configure", video: newVideoState },
        });
        setIsVideoEnabled(newVideoState);
        if (localStream) {
          localStream.getVideoTracks().forEach((track) => {
            track.enabled = newVideoState;
          });
        }
      }
    }, [isVideoEnabled, localStream]);

    const toggleAudio = useCallback(() => {
      if (publisherRef.current) {
        const newAudioState = !isAudioEnabled;
        publisherRef.current.send({
          message: { request: "configure", audio: newAudioState },
        });
        setIsAudioEnabled(newAudioState);
        if (localStream) {
          localStream.getAudioTracks().forEach((track) => {
            track.enabled = newAudioState;
          });
        }
      }
    }, [isAudioEnabled, localStream]);

    const startQualityMonitoring = useCallback(() => {
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }

      qualityCheckIntervalRef.current = setInterval(() => {
        if (publisherRef.current && publisherRef.current.getStats) {
          publisherRef.current.getStats((stats) => {
            let bitrate = 0;
            let packetLoss = 0;
            let latency = 0;

            stats.forEach((report) => {
              if (report.type === "outbound-rtp") {
                if (report.bytesSent && report.timestamp) {
                  // Simple bitrate calculation (bytes per second)
                  if (lastBytesSent.current && lastTimestamp.current) {
                    const timeDiff =
                      (report.timestamp - lastTimestamp.current) / 1000; // seconds
                    const bytesDiff = report.bytesSent - lastBytesSent.current;
                    bitrate = (bytesDiff * 8) / timeDiff / 1000; // kbps
                  }
                  lastBytesSent.current = report.bytesSent;
                  lastTimestamp.current = report.timestamp;
                }

                if (report.packetsSent && report.packetsLost) {
                  packetLoss = (report.packetsLost / report.packetsSent) * 100;
                }
                if (report.roundTripTime) {
                  latency = report.roundTripTime * 1000; // milliseconds
                }
              }
            });

            setNetworkStats({
              bitrate: parseFloat(bitrate.toFixed(2)),
              packetLoss: parseFloat(packetLoss.toFixed(2)),
              latency: parseFloat(latency.toFixed(2)),
            });

            // Simple quality assessment
            if (packetLoss > 5 || latency > 200 || bitrate < 50) {
              setConnectionQuality("poor");
            } else if (packetLoss > 1 || latency > 100 || bitrate < 100) {
              setConnectionQuality("average");
            } else {
              setConnectionQuality("good");
            }
          });
        }
      }, 3000);
    }, []);

    const toggleFullscreen = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
          console.error(
            `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
          );
        });
      } else {
        document.exitFullscreen();
      }
    }, []);

    const toggleControls = useCallback(() => {
      setShowControls((prev) => !prev);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (!showControls) {
        // If controls are becoming visible, hide them after a delay
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 5000);
      }
    }, [showControls]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleMouseMove = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }, []);

    const handleVolumeChange = useCallback(
      (event) => {
        const newVolume = parseFloat(event.target.value);
        setVolume(newVolume);
        // Apply volume to all remote streams
        remoteStreams.forEach((stream, id) => {
          if (remoteVideoRefs.current.has(id)) {
            remoteVideoRefs.current.get(id).volume = newVolume;
          }
        });
      },
      [remoteStreams]
    );

    const toggleMuteAll = useCallback(() => {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      remoteStreams.forEach((stream, id) => {
        if (remoteVideoRefs.current.has(id)) {
          remoteVideoRefs.current.get(id).muted = newMutedState;
        }
      });
    }, [isMuted, remoteStreams]);

    const toggleScreenShare = useCallback(async () => {
      if (IS_DEMO_MODE) {
        console.log(
          "VideoCallInterface: Screen sharing not available in demo mode"
        );
        return;
      }

      if (!publisherRef.current) {
        onError?.("Publisher not ready for screen sharing");
        return;
      }

      if (isScreenSharing) {
        // Stop screen sharing
        console.log("VideoCallInterface: Stopping screen share");
        setIsScreenSharing(false);
        // Re-publish original camera stream
        if (localStream) {
          publisherRef.current.createOffer({
            media: { replaceVideo: true, stream: localStream },
            success: (jsep) => {
              publisherRef.current.send({
                message: { request: "configure", video: true },
                jsep: jsep,
              });
              console.log("VideoCallInterface: Switched back to camera stream");
            },
            error: (error) => {
              console.error(
                "VideoCallInterface: Error switching back to camera:",
                error
              );
              onError?.("Failed to switch back to camera");
            },
          });
        }
      } else {
        // Start screen sharing
        console.log("VideoCallInterface: Starting screen share");
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false, // You might want to include audio from screen
          });

          // Replace current video track with screen share track
          publisherRef.current.createOffer({
            media: { replaceVideo: true, stream: screenStream },
            success: (jsep) => {
              publisherRef.current.send({
                message: { request: "configure", video: true },
                jsep: jsep,
              });
              setLocalStream(screenStream); // Update localStream to screenStream
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = screenStream;
              }
              setIsScreenSharing(true);
              // Listen for screen share end event
              screenStream.getVideoTracks()[0].onended = () => {
                console.log("VideoCallInterface: Screen share ended by user");
                toggleScreenShare(); // Automatically stop screen sharing
              };
            },
            error: (error) => {
              console.error(
                "VideoCallInterface: Error replacing video with screen share:",
                error
              );
              onError?.("Failed to share screen: " + error.message);
              screenStream.getTracks().forEach((track) => track.stop());
            },
          });
        } catch (error) {
          console.error(
            "VideoCallInterface: Error getting display media:",
            error
          );
          onError?.("Failed to get screen share: " + error.message);
        }
      }
    }, [IS_DEMO_MODE, isScreenSharing, publisherRef, localStream, onError]);

    const startRecording = useCallback(() => {
      console.log("VideoCallInterface: Start Recording (placeholder)");
      // Implement recording logic here
    }, []);

    const stopRecording = useCallback(() => {
      console.log("VideoCallInterface: Stop Recording (placeholder)");
      // Implement recording stopping logic here
    }, []);

    const sendChatMessage = useCallback((message) => {
      console.log("VideoCallInterface: Send Chat Message (placeholder)");
      // Implement chat message sending logic here
    }, []);

    const kickParticipant = useCallback((participantId) => {
      console.log(
        `VideoCallInterface: Kick Participant ${participantId} (placeholder)`
      );
      // Implement participant kicking logic here
    }, []);

    const listParticipants = useCallback(() => {
      if (!publisherRef.current) {
        console.log("No publisher to list participants");
        return;
      }
      const body = { request: "listparticipants", room: currentRoomId };
      publisherRef.current.send({
        message: body,
        success: (response) => {
          console.log(
            "VideoCallInterface: List participants response",
            response
          );
          if (response && response.participants) {
            setParticipants(response.participants);
          }
        },
        error: (error) => {
          console.error(
            "VideoCallInterface: Error listing participants:",
            error
          );
        },
      });
    }, [publisherRef, currentRoomId]);

    const formatDuration = useCallback((seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }, []);

    const getQualityIndicator = useCallback(() => {
      switch (connectionQuality) {
        case "good":
          return "🟢 Good";
        case "average":
          return "🟠 Average";
        case "poor":
          return "🔴 Poor";
        default:
          return "⚪ Unknown";
      }
    }, [connectionQuality]);

    const startVideoCallInternal = useCallback(async () => {
      console.log("VideoCallInterface: startVideoCallInternal() executed");

      if (IS_DEMO_MODE) {
        console.log("VideoCallInterface: Simulating video call in demo mode");
        setIsInCall(true);
        setCallStatus("Demo video call active");
        startCallTimer();
        return;
      }

      if (isInCall) {
        console.log("Already in a call, ignoring startVideoCall");
        return;
      }

      if (!selectedReceiver || !selectedReceiver.userId) {
        onError?.("Please select a user to call.");
        return;
      }

      try {
        setCallStatus("Requesting media...");
        const stream = await getUserMedia();
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setCallStatus("Initializing call...");
        const newRoomId = Math.floor(Math.random() * 10000000000).toString();
        setCurrentRoomId(newRoomId);

        sendCallNotification({
          recipientId: selectedReceiver.userId,
          callerId: user.userId,
          callType: "video",
          roomId: newRoomId,
          sdpOffer: null, // SDP offer will be exchanged via Janus
        });

        await joinRoom(newRoomId, stream);

        setIsInCall(true);
        setCallStatus("Video call ringing...");
        startCallTimer();
        startQualityMonitoring();
      } catch (error) {
        console.error("VideoCallInterface: Error starting video call:", error);
        setCallStatus("Failed to start video call");
        setConnectionError(error.message);
        onError?.("Failed to start video call: " + error.message);
        cleanup();
      }
    }, [
      IS_DEMO_MODE,
      isInCall,
      selectedReceiver,
      user,
      sendCallNotification,
      onError,
      getUserMedia,
      joinRoom,
      startCallTimer,
      startQualityMonitoring,
      cleanup,
    ]);

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
        startVideoCallInternal();
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

      initializeJanus();

      return () => {
        cleanup();
      };
    }, [
      IS_DEMO_MODE,
      cleanup,
      initializeJanus,
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
    useEffect(() => {
      if (isInCall) {
        document.addEventListener("mousemove", handleMouseMove);
        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          clearTimeout(controlsTimeoutRef.current);
        };
      }
    }, [isInCall, handleMouseMove]);

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
