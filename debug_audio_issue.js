// Comprehensive Audio Debug Script
// Run this in your browser console to diagnose audio issues

console.log("🔍 Starting comprehensive audio debug...");

// 1. Check AudioCall component state
console.log("\n📞 AudioCall Component State:");
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;
  console.log("AudioCall ref available:", !!audioCall);
  console.log("AudioCall state:", audioCall.state);
  console.log("AudioCall methods:", Object.getOwnPropertyNames(audioCall));

  // Check if startCall method exists
  if (typeof audioCall.startCall === "function") {
    console.log("✅ startCall method available");
  } else {
    console.log("❌ startCall method NOT available");
  }
} else {
  console.log("❌ AudioCall ref not available");
}

// 2. Check WebRTC support
console.log("\n🌐 WebRTC Support:");
console.log("getUserMedia:", !!navigator.mediaDevices?.getUserMedia);
console.log("RTCPeerConnection:", !!window.RTCPeerConnection);
console.log("WebSocket:", !!window.WebSocket);

// 3. Check microphone permissions
console.log("\n🎤 Microphone Permissions:");
navigator.permissions
  .query({ name: "microphone" })
  .then((result) => {
    console.log("Microphone permission state:", result.state);
    if (result.state === "denied") {
      console.log(
        "❌ Microphone access denied - this will prevent audio calls"
      );
    } else if (result.state === "granted") {
      console.log("✅ Microphone access granted");
    } else {
      console.log("⚠️ Microphone permission not determined");
    }
  })
  .catch((err) => {
    console.log("❌ Could not check microphone permissions:", err);
  });

// 4. Check WebSocket connection
console.log("\n🔌 WebSocket Connection:");
const wsUrl = "ws://localhost:8081";
console.log("Attempting to connect to WebSocket:", wsUrl);

try {
  const testWs = new WebSocket(wsUrl);

  testWs.onopen = () => {
    console.log("✅ WebSocket connection successful");
    testWs.close();
  };

  testWs.onerror = (error) => {
    console.log("❌ WebSocket connection failed:", error);
  };

  testWs.onclose = () => {
    console.log("WebSocket connection closed");
  };

  // Timeout after 5 seconds
  setTimeout(() => {
    if (testWs.readyState === WebSocket.CONNECTING) {
      console.log("❌ WebSocket connection timeout");
      testWs.close();
    }
  }, 5000);
} catch (error) {
  console.log("❌ WebSocket connection error:", error);
}

// 5. Check audio service health
console.log("\n🏥 Audio Service Health Check:");
fetch("http://localhost:8081/health")
  .then((response) => {
    if (response.ok) {
      console.log("✅ Audio service is running");
      return response.text();
    } else {
      console.log("❌ Audio service returned error:", response.status);
    }
  })
  .then((data) => {
    if (data) console.log("Audio service response:", data);
  })
  .catch((error) => {
    console.log("❌ Audio service not reachable:", error);
  });

// 6. Test microphone access
console.log("\n🎤 Testing Microphone Access:");
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      console.log("✅ Microphone access successful");
      console.log("Audio tracks:", stream.getAudioTracks().length);
      console.log("Track settings:", stream.getAudioTracks()[0]?.getSettings());

      // Stop the stream
      stream.getTracks().forEach((track) => track.stop());
    })
    .catch((error) => {
      console.log("❌ Microphone access failed:", error.name, error.message);
      if (error.name === "NotAllowedError") {
        console.log("💡 Solution: Allow microphone access in browser settings");
      } else if (error.name === "NotFoundError") {
        console.log(
          "💡 Solution: Check if microphone is connected and working"
        );
      }
    });
} else {
  console.log("❌ getUserMedia not supported");
}

// 7. Check browser audio context
console.log("\n🔊 Audio Context:");
try {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log("✅ Audio context created successfully");
  console.log("Sample rate:", audioContext.sampleRate);
  console.log("State:", audioContext.state);

  if (audioContext.state === "suspended") {
    console.log("⚠️ Audio context is suspended - user interaction required");
  }

  audioContext.close();
} catch (error) {
  console.log("❌ Audio context creation failed:", error);
}

// 8. Check for existing audio elements
console.log("\n🎵 Audio Elements:");
const audioElements = document.querySelectorAll("audio");
console.log("Number of audio elements:", audioElements.length);
audioElements.forEach((audio, index) => {
  console.log(`Audio ${index + 1}:`, {
    src: audio.src,
    autoplay: audio.autoplay,
    muted: audio.muted,
    volume: audio.volume,
    readyState: audio.readyState,
  });
});

// 9. Check for WebRTC peer connections
console.log("\n🔗 WebRTC Connections:");
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;
  if (audioCall.peerConnection) {
    console.log("✅ Peer connection exists");
    console.log("Connection state:", audioCall.peerConnection.connectionState);
    console.log(
      "ICE connection state:",
      audioCall.peerConnection.iceConnectionState
    );
    console.log("Signaling state:", audioCall.peerConnection.signalingState);
  } else {
    console.log("❌ No peer connection found");
  }
}

console.log("\n🔍 Debug complete! Check the logs above for issues.");
console.log("💡 Common solutions:");
console.log("1. Allow microphone access in browser settings");
console.log("2. Check if audio service is running on port 8081");
console.log("3. Ensure WebSocket connection is working");
console.log("4. Try refreshing the page and allowing permissions");
