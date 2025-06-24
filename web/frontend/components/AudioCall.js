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
} from "react-icons/fa";

const AudioCall = forwardRef(
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

    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const wsRef = useRef(null);
    const audioRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const ringtoneIntervalRef = useRef(null);

    const AUDIO_SERVICE_URL =
      process.env.NEXT_PUBLIC_AUDIO_API_URL ||
      "https://unifiedchat-audio-service.onrender.com";

    // Expose startCall function to parent component
    useImperativeHandle(ref, () => ({
      startCall: () => {
        console.log("AudioCall: startCall called");
        startCall();
      },
      testAudio: () => {
        console.log("AudioCall: Testing audio playback...");
        if (audioRef.current) {
          console.log("AudioCall: Audio element found, attempting to play");
          audioRef.current
            .play()
            .then(() => {
              console.log("AudioCall: Test audio playback successful");
            })
            .catch((err) => {
              console.error("AudioCall: Test audio playback failed:", err);
            });
        } else {
          console.error("AudioCall: No audio element found for testing");
        }
      },
      setAudioConnected: (status) => {
        console.log("AudioCall: Manually setting audioConnected to:", status);
        setAudioConnected(status);
      },
      getAudioStatus: () => {
        console.log("AudioCall: Current audio status:", {
          audioConnected,
          isInCall,
          isCallActive,
          callStatus,
          currentCallId,
        });
        return {
          audioConnected,
          isInCall,
          isCallActive,
          callStatus,
          currentCallId,
        };
      },
    }));

    useEffect(() => {
      if (user) {
        // Test audio service health before connecting WebSocket
        console.log("AudioCall: Testing audio service health...");
        fetch(`${AUDIO_SERVICE_URL}/health`)
          .then((response) => response.json())
          .then((data) => {
            console.log("AudioCall: Audio service health check:", data);
            if (data.status === "healthy") {
              console.log(
                "AudioCall: Audio service is healthy, connecting WebSocket..."
              );
              connectWebSocket();
            } else {
              console.error("AudioCall: Audio service is not healthy:", data);
            }
          })
          .catch((error) => {
            console.error(
              "AudioCall: Failed to check audio service health:",
              error
            );
            console.log("AudioCall: Attempting WebSocket connection anyway...");
            connectWebSocket();
          });
      }
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
        if (ringtoneIntervalRef.current) {
          clearInterval(ringtoneIntervalRef.current);
        }
      };
    }, [user]);

    // Debug: Monitor AudioCall ref
    useEffect(() => {
      console.log("AudioCall ref status:", ref ? "Available" : "Not available");
    }, [ref]);

    // Debug: Monitor call states
    useEffect(() => {
      console.log("AudioCall: State changes:", {
        isInCall,
        isCallActive,
        isRinging,
        callStatus,
        audioConnected,
        currentCallId,
      });
    }, [
      isInCall,
      isCallActive,
      isRinging,
      callStatus,
      audioConnected,
      currentCallId,
    ]);

    // Auto-hide connected status notification
    useEffect(() => {
      if (callStatus === "connected") {
        const timer = setTimeout(() => {
          setCallStatus("");
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [callStatus]);

    const connectWebSocket = () => {
      console.log(
        "AudioCall: Attempting to connect WebSocket for user:",
        user.id
      );
      console.log("AudioCall: Audio service URL:", AUDIO_SERVICE_URL);

      const wsUrl = `${AUDIO_SERVICE_URL.replace("https", "wss")}/ws/${
        user.id
      }`;
      console.log("AudioCall: WebSocket URL:", wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(
          "AudioCall: WebSocket connected successfully for user:",
          user.id
        );
      };

      ws.onmessage = (event) => {
        console.log("AudioCall: WebSocket message received:", event.data);
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error("AudioCall: Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("AudioCall: WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("AudioCall: WebSocket closed:", event.code, event.reason);
      };

      wsRef.current = ws;
    };

    const handleWebSocketMessage = async (message) => {
      console.log("AudioCall: WebSocket message received:", message);

      switch (message.type) {
        case "incoming_call":
          setIncomingCall(message.data);
          setIsRinging(true);
          playRingtone();
          break;
        case "call_answered":
          console.log("AudioCall: Call answered - updating UI state");
          setCallStatus("connected");
          setIsRinging(false);
          setIsInCall(true); // Ensure caller sees they are in call
          setIsCallActive(true);
          setCurrentCallId(message.call_id); // Track the call ID
          stopRingtone();
          startCallTimer();
          await establishWebRTCConnection(message.call_id);
          break;
        case "call_rejected":
          console.log("AudioCall: Call rejected - updating UI state");
          setCallStatus("rejected");
          setIsRinging(false);
          setIsInCall(false); // Caller is no longer in call
          setIsCallActive(false);
          stopRingtone();
          setTimeout(() => setCallStatus(""), 3000);
          break;
        case "call_ended":
          console.log("AudioCall: Call ended - updating UI state");
          setCallStatus("ended");
          setIsInCall(false);
          setIsCallActive(false);
          setCurrentCallId(null); // Clear the call ID
          stopCallTimer();
          stopRingtone();
          cleanupCall();
          setTimeout(() => setCallStatus(""), 3000);
          break;
        case "offer":
          await handleOffer(message.data);
          break;
        case "answer":
          await handleAnswer(message.data);
          break;
        case "ice_candidate":
          await handleIceCandidate(message.data);
          break;
      }
    };

    const startCall = async () => {
      console.log("AudioCall: startCall function called");
      console.log("AudioCall: user =", user);
      console.log("AudioCall: selectedReceiver =", selectedReceiver);

      if (!user || !selectedReceiver) {
        console.error("AudioCall: Missing user or selectedReceiver");
        alert("Please select a user to call");
        return;
      }

      try {
        console.log("AudioCall: Making API call to start call");
        const response = await fetch(`${AUDIO_SERVICE_URL}/call/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caller_id: user.id,
            receiver_id: selectedReceiver,
          }),
        });

        console.log("AudioCall: API response status =", response.status);
        const data = await response.json();
        console.log("AudioCall: API response data =", data);

        if (response.ok) {
          console.log("AudioCall: Call started successfully");
          setCallStatus("ringing");
          setIsInCall(true);
          setCurrentCallId(data.call_id);

          // Set a timeout to ensure audio connection status is updated for caller
          setTimeout(() => {
            console.log(
              "AudioCall: Timeout fallback for caller - setting audioConnected to true"
            );
            setAudioConnected(true);
          }, 3000);

          await establishWebRTCConnection(data.call_id);
        } else {
          console.error("AudioCall: Failed to start call - API error");
          alert("Failed to start call: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        console.error(
          "AudioCall: Failed to start call - network error:",
          error
        );
        alert("Failed to start call: " + error.message);
      }
    };

    const answerCall = async (answer) => {
      if (!incomingCall) return;

      try {
        console.log("AudioCall: Answering call with answer =", answer);
        console.log("AudioCall: incomingCall =", incomingCall);

        const response = await fetch(`${AUDIO_SERVICE_URL}/call/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            call_id: incomingCall.id,
            user_id: user.id,
            answer: answer,
          }),
        });

        console.log("AudioCall: Answer response status =", response.status);
        const data = await response.json();
        console.log("AudioCall: Answer response data =", data);

        if (response.ok && answer) {
          console.log("AudioCall: Call answered successfully");
          setIsInCall(true);
          setIsCallActive(true);
          setCallStatus("connected");
          setCurrentCallId(incomingCall.id); // Track the call ID
          startCallTimer();

          // Force audio connection status update for respondent
          console.log(
            "AudioCall: Setting audioConnected to true for respondent"
          );
          setAudioConnected(true);

          // Set a timeout to ensure audio connection status is updated
          setTimeout(() => {
            console.log(
              "AudioCall: Timeout fallback - setting audioConnected to true"
            );
            setAudioConnected(true);
          }, 2000);

          await establishWebRTCConnection(incomingCall.id);
        } else if (!answer) {
          console.log("AudioCall: Call declined");
          setCallStatus("rejected");
          setTimeout(() => setCallStatus(""), 3000);
        }

        setIncomingCall(null);
        setIsRinging(false);
        stopRingtone();
      } catch (error) {
        console.error("AudioCall: Failed to answer call:", error);
        alert("Failed to answer call: " + error.message);
      }
    };

    const endCall = async () => {
      if (!isInCall || !currentCallId) {
        console.log("AudioCall: Cannot end call - not in call or no call ID");
        return;
      }

      try {
        console.log("AudioCall: Ending call with ID =", currentCallId);

        const response = await fetch(`${AUDIO_SERVICE_URL}/call/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            call_id: currentCallId,
            user_id: user.id,
          }),
        });

        console.log("AudioCall: End call response status =", response.status);
        const data = await response.json();
        console.log("AudioCall: End call response data =", data);

        if (response.ok) {
          console.log("AudioCall: Call ended successfully");
          setIsInCall(false);
          setIsCallActive(false);
          setCallStatus("ended");
          setCurrentCallId(null); // Clear the call ID
          stopCallTimer();
          cleanupCall();
          setTimeout(() => setCallStatus(""), 3000);
        } else {
          console.error("AudioCall: Failed to end call - API error");
          alert("Failed to end call: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        console.error("AudioCall: Failed to end call - network error:", error);
        alert("Failed to end call: " + error.message);
      }
    };

    const toggleMute = () => {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setIsMuted(!audioTrack.enabled);
        }
      }
    };

    const startCallTimer = () => {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    };

    const stopCallTimer = () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setCallDuration(0);
    };

    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const establishWebRTCConnection = async (callId) => {
      try {
        console.log(
          "AudioCall: establishWebRTCConnection called with callId:",
          callId
        );

        console.log("AudioCall: Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log(
          "AudioCall: getUserMedia successful, stream tracks:",
          stream.getTracks().length
        );

        localStreamRef.current = stream;

        console.log("AudioCall: Creating RTCPeerConnection...");
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        console.log("AudioCall: RTCPeerConnection created successfully");

        stream.getTracks().forEach((track) => {
          console.log(
            "AudioCall: Adding track to peer connection:",
            track.kind
          );
          peerConnection.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
          console.log(
            "AudioCall: Remote stream received, tracks:",
            event.streams[0].getTracks().length
          );
          remoteStreamRef.current = event.streams[0];
          if (audioRef.current) {
            console.log("AudioCall: Setting audio element srcObject");
            audioRef.current.srcObject = event.streams[0];
            console.log("AudioCall: Audio element srcObject set successfully");

            // Ensure audio plays
            audioRef.current.onloadedmetadata = () => {
              console.log(
                "AudioCall: Audio metadata loaded, attempting to play"
              );
              audioRef.current
                .play()
                .then(() => {
                  console.log("AudioCall: Audio playback started successfully");
                  setAudioConnected(true);
                })
                .catch((err) => {
                  console.error(
                    "AudioCall: Failed to start audio playback:",
                    err
                  );
                  setAudioConnected(false);
                  // Try again after user interaction
                  document.addEventListener(
                    "click",
                    () => {
                      audioRef.current
                        .play()
                        .then(() => {
                          setAudioConnected(true);
                        })
                        .catch((e) => {
                          console.error("AudioCall: Still failed to play:", e);
                          setAudioConnected(false);
                        });
                    },
                    { once: true }
                  );
                });
            };
          } else {
            console.error("AudioCall: Audio element not found!");
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("AudioCall: ICE candidate generated");
            wsRef.current?.send(
              JSON.stringify({
                type: "ice_candidate",
                call_id: callId,
                user_id: user.id,
                data: event.candidate,
              })
            );
          }
        };

        peerConnection.onconnectionstatechange = () => {
          console.log(
            "AudioCall: Connection state changed to:",
            peerConnection.connectionState
          );
          // Update audio connection status when connection is established
          if (peerConnection.connectionState === "connected") {
            console.log(
              "AudioCall: WebRTC connection established, setting audioConnected to true"
            );
            setAudioConnected(true);
          } else if (
            peerConnection.connectionState === "failed" ||
            peerConnection.connectionState === "disconnected"
          ) {
            console.log(
              "AudioCall: WebRTC connection failed/disconnected, setting audioConnected to false"
            );
            setAudioConnected(false);
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            "AudioCall: ICE connection state changed to:",
            peerConnection.iceConnectionState
          );
          // Update audio connection status when ICE connection is established
          if (peerConnection.iceConnectionState === "connected") {
            console.log(
              "AudioCall: ICE connection established, setting audioConnected to true"
            );
            setAudioConnected(true);
          } else if (
            peerConnection.iceConnectionState === "failed" ||
            peerConnection.iceConnectionState === "disconnected"
          ) {
            console.log(
              "AudioCall: ICE connection failed/disconnected, setting audioConnected to false"
            );
            setAudioConnected(false);
          }
        };

        peerConnectionRef.current = peerConnection;

        // Create and send offer
        console.log("AudioCall: Creating offer...");
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log("AudioCall: Offer created and set as local description");

        wsRef.current?.send(
          JSON.stringify({
            type: "offer",
            call_id: callId,
            user_id: user.id,
            data: offer,
          })
        );
        console.log("AudioCall: Offer sent via WebSocket");
      } catch (error) {
        console.error(
          "AudioCall: Failed to establish WebRTC connection:",
          error
        );
        alert("Failed to establish audio connection: " + error.message);
      }
    };

    const handleOffer = async (offer) => {
      try {
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerConnection.ontrack = (event) => {
          console.log(
            "AudioCall: Remote stream received in handleOffer, tracks:",
            event.streams[0].getTracks().length
          );
          remoteStreamRef.current = event.streams[0];
          if (audioRef.current) {
            console.log(
              "AudioCall: Setting audio element srcObject in handleOffer"
            );
            audioRef.current.srcObject = event.streams[0];

            // Ensure audio plays and update connection status
            audioRef.current.onloadedmetadata = () => {
              console.log(
                "AudioCall: Audio metadata loaded in handleOffer, attempting to play"
              );
              audioRef.current
                .play()
                .then(() => {
                  console.log(
                    "AudioCall: Audio playback started successfully in handleOffer"
                  );
                  setAudioConnected(true);
                })
                .catch((err) => {
                  console.error(
                    "AudioCall: Failed to start audio playback in handleOffer:",
                    err
                  );
                  setAudioConnected(false);
                  // Try again after user interaction
                  document.addEventListener(
                    "click",
                    () => {
                      audioRef.current
                        .play()
                        .then(() => {
                          console.log(
                            "AudioCall: Audio playback retry successful in handleOffer"
                          );
                          setAudioConnected(true);
                        })
                        .catch((e) => {
                          console.error(
                            "AudioCall: Still failed to play in handleOffer:",
                            e
                          );
                          setAudioConnected(false);
                        });
                    },
                    { once: true }
                  );
                });
            };
          } else {
            console.error("AudioCall: Audio element not found in handleOffer!");
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            wsRef.current?.send(
              JSON.stringify({
                type: "ice_candidate",
                call_id: incomingCall?.id,
                user_id: user.id,
                data: event.candidate,
              })
            );
          }
        };

        peerConnection.onconnectionstatechange = () => {
          console.log(
            "AudioCall: Connection state changed in handleOffer to:",
            peerConnection.connectionState
          );
          // Update audio connection status when connection is established
          if (peerConnection.connectionState === "connected") {
            console.log(
              "AudioCall: WebRTC connection established in handleOffer, setting audioConnected to true"
            );
            setAudioConnected(true);
          } else if (
            peerConnection.connectionState === "failed" ||
            peerConnection.connectionState === "disconnected"
          ) {
            console.log(
              "AudioCall: WebRTC connection failed/disconnected in handleOffer, setting audioConnected to false"
            );
            setAudioConnected(false);
          }
        };

        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            "AudioCall: ICE connection state changed in handleOffer to:",
            peerConnection.iceConnectionState
          );
          // Update audio connection status when ICE connection is established
          if (peerConnection.iceConnectionState === "connected") {
            console.log(
              "AudioCall: ICE connection established in handleOffer, setting audioConnected to true"
            );
            setAudioConnected(true);
          } else if (
            peerConnection.iceConnectionState === "failed" ||
            peerConnection.iceConnectionState === "disconnected"
          ) {
            console.log(
              "AudioCall: ICE connection failed/disconnected in handleOffer, setting audioConnected to false"
            );
            setAudioConnected(false);
          }
        };

        peerConnectionRef.current = peerConnection;

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        wsRef.current?.send(
          JSON.stringify({
            type: "answer",
            call_id: incomingCall?.id,
            user_id: user.id,
            data: answer,
          })
        );
      } catch (error) {
        console.error("Failed to handle offer:", error);
      }
    };

    const handleAnswer = async (answer) => {
      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error("Failed to handle answer:", error);
      }
    };

    const handleIceCandidate = async (candidate) => {
      try {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error("Failed to handle ICE candidate:", error);
      }
    };

    const cleanupCall = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
      setCurrentCallId(null); // Clear the call ID
      setAudioConnected(false); // Reset audio connection status
    };

    const playRingtone = () => {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      const playTone = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(
          600,
          audioContext.currentTime + 0.5
        );

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };

      playTone();
      ringtoneIntervalRef.current = setInterval(playTone, 1000);
    };

    const stopRingtone = () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };

    if (!user) return null;

    return (
      <div className="audio-call-container">
        {/* Enhanced Incoming Call Modal */}
        {isRinging && incomingCall && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border-0">
              {/* Glowing ring effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-30 animate-pulse"></div>

              <div className="relative text-center">
                {/* Animated phone icon */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                    <FaPhone className="w-10 h-10 text-white animate-bounce" />
                  </div>
                  {/* Glowing ring around phone */}
                  <div className="absolute -inset-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-30 animate-ping"></div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                  Incoming Huddle
                  <FaBell className="text-yellow-300 animate-bounce" />
                </h3>
                <p className="text-white/90 mb-6 text-lg">
                  {getUserName
                    ? getUserName(incomingCall.caller_id)
                    : `User ${incomingCall.caller_id}`}
                </p>

                {/* Fun status label */}
                <div className="mb-6">
                  <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold border border-white/30">
                    🎉 Ready to Connect!
                  </span>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => answerCall(true)}
                    className="group flex-1 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white py-4 px-6 rounded-2xl font-bold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                  >
                    {/* Glowing effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <FaPhone className="w-5 h-5 relative z-10 animate-pulse group-hover:animate-bounce" />
                    <span className="relative z-10">Answer</span>
                  </button>
                  <button
                    onClick={() => answerCall(false)}
                    className="group flex-1 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white py-4 px-6 rounded-2xl font-bold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                  >
                    {/* Glowing effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-400 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <FaPhoneSlash className="w-5 h-5 relative z-10 animate-pulse group-hover:animate-bounce" />
                    <span className="relative z-10">Decline</span>
                  </button>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4">
                <div className="w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Floating Call Bar */}
        {(isCallActive || (isInCall && currentCallId)) && (
          <div className="fixed left-1/2 bottom-6 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 shadow-2xl rounded-full px-8 py-4 flex items-center gap-6 z-50 border-0 animate-fade-in backdrop-blur-sm">
            {/* Glowing ring effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-30 animate-pulse"></div>

            <div className="relative flex items-center gap-4">
              <div className="relative">
                <div
                  className={`w-4 h-4 rounded-full animate-pulse ${
                    audioConnected ? "bg-green-400" : "bg-yellow-400"
                  }`}
                ></div>
                <div
                  className={`absolute -inset-1 rounded-full opacity-30 animate-ping ${
                    audioConnected ? "bg-green-400" : "bg-yellow-400"
                  }`}
                ></div>
              </div>
              <div className="text-white">
                <span className="font-bold text-lg">
                  Huddle with{" "}
                  {getUserName
                    ? getUserName(selectedReceiver)
                    : `User ${selectedReceiver}`}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/80 text-sm">
                    {formatDuration(callDuration)}
                  </span>
                  <FaStar
                    className="text-yellow-300 animate-spin text-xs"
                    style={{ animationDuration: "3s" }}
                  />
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      audioConnected ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  >
                    {audioConnected
                      ? "🔊 Audio Connected"
                      : "🔇 Connecting Audio..."}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative flex items-center gap-3">
              <button
                onClick={toggleMute}
                className={`group p-3 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 active:scale-95 shadow-lg ${
                  isMuted
                    ? "bg-gradient-to-r from-red-400 to-pink-500 text-white"
                    : "bg-white/20 backdrop-blur-sm text-white border border-white/30"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <FaMicrophoneSlash className="w-5 h-5 animate-pulse group-hover:animate-bounce" />
                ) : (
                  <FaMicrophone className="w-5 h-5 animate-pulse group-hover:animate-bounce" />
                )}
              </button>
              <button
                onClick={endCall}
                className="group bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white p-3 rounded-full transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-2xl active:scale-95 shadow-lg"
                title="End Huddle"
              >
                {/* Glowing effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-red-400 to-pink-500 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                <FaPhoneSlash className="w-5 h-5 relative z-10 animate-pulse group-hover:animate-bounce" />
              </button>
            </div>

            {/* Fun status indicator */}
            <div className="absolute -top-2 -right-2">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                🚀 Live
              </span>
            </div>
          </div>
        )}

        {/* Call Button (hidden, for triggers) */}
        {!isInCall && !isRinging && (
          <button
            title="Start audio call"
            onClick={startCall}
            className="hidden"
          >
            Call
          </button>
        )}

        {/* Enhanced Call Status Notifications */}
        {callStatus && (
          <div
            data-call-status={callStatus}
            className={`fixed top-4 right-4 p-4 rounded-2xl shadow-2xl z-50 max-w-sm backdrop-blur-sm border-0 transition-all duration-300 ${
              callStatus === "connected"
                ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
                : callStatus === "ringing"
                ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                : callStatus === "ended"
                ? "bg-gradient-to-r from-gray-400 to-gray-600 text-white"
                : callStatus === "rejected"
                ? "bg-gradient-to-r from-red-400 to-pink-500 text-white"
                : "bg-gradient-to-r from-blue-400 to-purple-500 text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <div className="absolute -inset-1 bg-white rounded-full opacity-30 animate-ping"></div>
              </div>
              <span className="font-bold">
                {callStatus === "connected"
                  ? "🎉 Huddle Connected!"
                  : callStatus === "ringing"
                  ? "📞 Calling..."
                  : callStatus === "ended"
                  ? "👋 Huddle Ended"
                  : callStatus === "rejected"
                  ? "❌ Huddle Rejected"
                  : "📱 " + callStatus}
              </span>
            </div>
          </div>
        )}

        {/* Debug Component - Remove in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="fixed top-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50">
            <div>Debug Info:</div>
            <div>isInCall: {isInCall.toString()}</div>
            <div>isCallActive: {isCallActive.toString()}</div>
            <div>isRinging: {isRinging.toString()}</div>
            <div>callStatus: {callStatus}</div>
            <div>audioConnected: {audioConnected.toString()}</div>
            <div>currentCallId: {currentCallId || "none"}</div>
          </div>
        )}

        {/* Audio Element for Remote Stream */}
        <audio
          ref={audioRef}
          autoPlay
          muted={false}
          controls={false}
          style={{ display: "none" }}
          onLoadedMetadata={() =>
            console.log("AudioCall: Audio metadata loaded")
          }
          onCanPlay={() => console.log("AudioCall: Audio can play")}
          onPlay={() => console.log("AudioCall: Audio started playing")}
          onPause={() => console.log("AudioCall: Audio paused")}
          onError={(e) => console.error("AudioCall: Audio error:", e)}
        />
      </div>
    );
  }
);

export default AudioCall;
