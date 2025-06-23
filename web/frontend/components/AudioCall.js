import { useState, useEffect, useRef } from "react";

const AudioCall = ({ user, selectedReceiver, onCallEnd }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const wsRef = useRef(null);
  const audioRef = useRef(null);

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
        stopRingtone();
        await establishWebRTCConnection(message.call_id);
        break;
      case "call_rejected":
        setCallStatus("rejected");
        setIsRinging(false);
        stopRingtone();
        break;
      case "call_ended":
        setCallStatus("ended");
        setIsInCall(false);
        stopRingtone();
        cleanupCall();
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
        setCallStatus("connected");
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
      setCallStatus("ended");
      cleanupCall();
    } catch (error) {
      console.error("Failed to end call:", error);
    }
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
    // Simple ringtone using Web Audio API
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Repeat ringtone
    const ringInterval = setInterval(() => {
      if (!isRinging) {
        clearInterval(ringInterval);
        return;
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }, 1000);
  };

  const stopRingtone = () => {
    // Ringtone will stop automatically when isRinging becomes false
  };

  if (!user) return null;

  return (
    <div className="audio-call-container">
      {/* Incoming Call Modal */}
      {isRinging && incomingCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Incoming Call</h3>
            <p className="text-gray-600 mb-6">
              {incomingCall.caller_id === user.id
                ? "Unknown"
                : `Call from User ${incomingCall.caller_id}`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => answerCall(true)}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
              >
                Answer
              </button>
              <button
                onClick={() => answerCall(false)}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex gap-2 mb-4">
        {!isInCall && !isRinging && (
          <button
            onClick={startCall}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
          >
            📞 Call
          </button>
        )}

        {isInCall && (
          <button
            onClick={endCall}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            📞 End Call
          </button>
        )}
      </div>

      {/* Call Status */}
      {callStatus && (
        <div
          className={`text-sm p-2 rounded mb-4 ${
            callStatus === "connected"
              ? "bg-green-100 text-green-800"
              : callStatus === "ringing"
              ? "bg-yellow-100 text-yellow-800"
              : callStatus === "ended"
              ? "bg-gray-100 text-gray-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          Call Status: {callStatus}
        </div>
      )}

      {/* Audio Element for Remote Stream */}
      <audio ref={audioRef} autoPlay muted={false} />
    </div>
  );
};

export default AudioCall;
