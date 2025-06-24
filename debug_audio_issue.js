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

// 4. Check WebSocket connection to deployed audio service
console.log("\n🔌 WebSocket Connection (Deployed Service):");
const deployedAudioUrl = "https://unifiedchat-audio-service.onrender.com";
const wsUrl = `${deployedAudioUrl.replace("https", "wss")}/ws/test`;
console.log("Attempting to connect to WebSocket:", wsUrl);

try {
  const testWs = new WebSocket(wsUrl);

  testWs.onopen = () => {
    console.log("✅ WebSocket connection successful to deployed service");
    testWs.close();
  };

  testWs.onerror = (error) => {
    console.log("❌ WebSocket connection failed to deployed service:", error);
  };

  testWs.onclose = (event) => {
    console.log(
      "WebSocket connection closed, code:",
      event.code,
      "reason:",
      event.reason
    );
  };

  // Timeout after 5 seconds
  setTimeout(() => {
    if (testWs.readyState === WebSocket.CONNECTING) {
      console.log("❌ WebSocket connection timeout to deployed service");
      testWs.close();
    }
  }, 5000);
} catch (error) {
  console.log("❌ WebSocket connection error:", error);
}

// 5. Check deployed audio service health
console.log("\n🏥 Deployed Audio Service Health Check:");
fetch(`${deployedAudioUrl}/health`)
  .then((response) => {
    if (response.ok) {
      console.log("✅ Deployed audio service is running");
      return response.text();
    } else {
      console.log("❌ Deployed audio service returned error:", response.status);
    }
  })
  .then((data) => {
    if (data) console.log("Deployed audio service response:", data);
  })
  .catch((error) => {
    console.log("❌ Deployed audio service not reachable:", error);
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

// 10. Check current page URL and environment
console.log("\n🌍 Environment Info:");
console.log("Current URL:", window.location.href);
console.log("User Agent:", navigator.userAgent);
console.log("Is HTTPS:", window.location.protocol === "https:");

// 11. Test local audio service (for comparison)
console.log("\n🏥 Local Audio Service Health Check (for comparison):");
fetch("http://localhost:8081/health")
  .then((response) => {
    if (response.ok) {
      console.log("✅ Local audio service is running");
      return response.text();
    } else {
      console.log("❌ Local audio service returned error:", response.status);
    }
  })
  .then((data) => {
    if (data) console.log("Local audio service response:", data);
  })
  .catch((error) => {
    console.log(
      "❌ Local audio service not reachable (expected from deployed frontend):",
      error
    );
  });

console.log("\n🔍 Debug complete! Check the logs above for issues.");
console.log("💡 Common solutions:");
console.log("1. Allow microphone access in browser settings");
console.log("2. Check if deployed audio service WebSocket is working");
console.log("3. Ensure WebSocket connection is working");
console.log("4. Try refreshing the page and allowing permissions");
