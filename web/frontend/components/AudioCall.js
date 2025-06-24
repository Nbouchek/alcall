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
    }));

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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
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
        {isCallActive && (
          <div className="fixed left-1/2 bottom-6 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 shadow-2xl rounded-full px-8 py-4 flex items-center gap-6 z-50 border-0 animate-fade-in backdrop-blur-sm">
            {/* Glowing ring effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-30 animate-pulse"></div>

            <div className="relative flex items-center gap-4">
              <div className="relative">
                <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                <div className="absolute -inset-1 bg-green-400 rounded-full opacity-30 animate-ping"></div>
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
        {callStatus && !isCallActive && (
          <div
            className={`fixed top-4 right-4 p-4 rounded-2xl shadow-2xl z-50 max-w-sm backdrop-blur-sm border-0 ${
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

        {/* Audio Element for Remote Stream */}
        <audio ref={audioRef} autoPlay muted={false} />
      </div>
    );
  }
);

export default AudioCall;
