import { useState, useEffect, useRef } from "react";

const AudioCall = ({ user, selectedReceiver, onCallEnd, getUserName }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

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

  useEffect(() => {
    if (user) {
      connectWebSocket();
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

  const connectWebSocket = () => {
    const ws = new WebSocket(
      `${AUDIO_SERVICE_URL.replace("https", "wss")}/ws/${user.id}`
    );

    ws.onopen = () => {
      console.log("WebSocket connected for audio calls");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;
  };

  const handleWebSocketMessage = async (message) => {
    switch (message.type) {
      case "incoming_call":
        setIncomingCall(message.data);
        setIsRinging(true);
        playRingtone();
        break;
      case "call_answered":
        setCallStatus("connected");
        setIsRinging(false);
        setIsCallActive(true);
        stopRingtone();
        startCallTimer();
        await establishWebRTCConnection(message.call_id);
        break;
      case "call_rejected":
        setCallStatus("rejected");
        setIsRinging(false);
        stopRingtone();
        setTimeout(() => setCallStatus(""), 3000);
        break;
      case "call_ended":
        setCallStatus("ended");
        setIsInCall(false);
        setIsCallActive(false);
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
    try {
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

      const data = await response.json();
      if (response.ok) {
        setCallStatus("ringing");
        setIsInCall(true);
        await establishWebRTCConnection(data.call_id);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  const answerCall = async (answer) => {
    if (!incomingCall) return;

    try {
      await fetch(`${AUDIO_SERVICE_URL}/call/answer`, {
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

      if (answer) {
        setIsInCall(true);
        setIsCallActive(true);
        setCallStatus("connected");
        startCallTimer();
        await establishWebRTCConnection(incomingCall.id);
      }

      setIncomingCall(null);
      setIsRinging(false);
      stopRingtone();
    } catch (error) {
      console.error("Failed to answer call:", error);
    }
  };

  const endCall = async () => {
    if (!isInCall) return;

    try {
      await fetch(`${AUDIO_SERVICE_URL}/call/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          call_id: "current_call_id", // You'll need to track this
          user_id: user.id,
        }),
      });

      setIsInCall(false);
      setIsCallActive(false);
      setCallStatus("ended");
      stopCallTimer();
      cleanupCall();
    } catch (error) {
      console.error("Failed to end call:", error);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
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

      peerConnectionRef.current = peerConnection;

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      wsRef.current?.send(
        JSON.stringify({
          type: "offer",
          call_id: callId,
          user_id: user.id,
          data: offer,
        })
      );
    } catch (error) {
      console.error("Failed to establish WebRTC connection:", error);
    }
  };

  const handleOffer = async (offer) => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peerConnection.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
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
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);

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
      {/* Incoming Call Modal */}
      {isRinging && incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Incoming Call</h3>
              <p className="text-gray-600 mb-6">
                {getUserName
                  ? getUserName(incomingCall.caller_id)
                  : `User ${incomingCall.caller_id}`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => answerCall(true)}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Answer
                </button>
                <button
                  onClick={() => answerCall(false)}
                  className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Call Bar (Slack-style, bottom) */}
      {isCallActive && (
        <div className="fixed left-1/2 bottom-6 transform -translate-x-1/2 bg-white shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 border border-gray-200 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-gray-800">
              Huddle with{" "}
              {getUserName
                ? getUserName(selectedReceiver)
                : `User ${selectedReceiver}`}
            </span>
            <span className="text-sm text-gray-500">
              {formatDuration(callDuration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-full transition border ${
                isMuted
                  ? "bg-red-100 border-red-300 text-red-600"
                  : "bg-gray-100 border-gray-300 text-gray-700"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={endCall}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition shadow-lg"
              title="End Huddle"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Call Button (hidden, for triggers) */}
      {!isInCall && !isRinging && (
        <button title="Start audio call" onClick={startCall} className="hidden">
          Call
        </button>
      )}

      {/* Call Status Notifications */}
      {callStatus && !isCallActive && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
            callStatus === "connected"
              ? "bg-green-500 text-white"
              : callStatus === "ringing"
              ? "bg-yellow-500 text-white"
              : callStatus === "ended"
              ? "bg-gray-500 text-white"
              : callStatus === "rejected"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">
              {callStatus === "connected"
                ? "Call connected"
                : callStatus === "ringing"
                ? "Calling..."
                : callStatus === "ended"
                ? "Call ended"
                : callStatus === "rejected"
                ? "Call rejected"
                : "Call status: " + callStatus}
            </span>
          </div>
        </div>
      )}

      {/* Audio Element for Remote Stream */}
      <audio ref={audioRef} autoPlay muted={false} />
    </div>
  );
};

export default AudioCall;
