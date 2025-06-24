// Comprehensive Audio Call Diagnostic Script
// Run this in the browser console during a call to diagnose audio issues

console.log("🔍 Starting comprehensive audio call diagnostic...");

// Check if AudioCall component is available
const audioCallRef = window.audioCallRef;
if (!audioCallRef) {
  console.error(
    "❌ AudioCall ref not found. Make sure you're on the chat page and logged in."
  );
  return;
}

console.log("✅ AudioCall ref found:", audioCallRef);

// Check current call state
const currentState = audioCallRef.getCurrentState
  ? audioCallRef.getCurrentState()
  : "No getCurrentState method";
console.log("📊 Current call state:", currentState);

// Check if peer connection exists
const peerConnection = audioCallRef.peerConnectionRef?.current;
if (!peerConnection) {
  console.error("❌ No peer connection found. Call may not be active.");
  return;
}

console.log("✅ Peer connection found");

// Check WebRTC connection states
console.log("🔗 WebRTC Connection States:");
console.log("  - Connection State:", peerConnection.connectionState);
console.log("  - ICE Connection State:", peerConnection.iceConnectionState);
console.log("  - ICE Gathering State:", peerConnection.iceGatheringState);
console.log("  - Signaling State:", peerConnection.signalingState);

// Check if remote description is set
console.log(
  "📝 Remote Description:",
  peerConnection.remoteDescription ? "Set" : "Not set"
);
console.log(
  "📝 Local Description:",
  peerConnection.localDescription ? "Set" : "Not set"
);

// Check pending ICE candidates
if (peerConnection.pendingIceCandidates) {
  console.log(
    "⏳ Pending ICE candidates:",
    peerConnection.pendingIceCandidates.length
  );
} else {
  console.log("✅ No pending ICE candidates");
}

// Check audio elements
const audioElements = document.querySelectorAll("audio");
console.log("🎵 Audio elements found:", audioElements.length);

audioElements.forEach((audio, index) => {
  console.log(`🎵 Audio element ${index + 1}:`);
  console.log(`  - srcObject:`, audio.srcObject ? "Set" : "Not set");
  console.log(`  - currentSrc:`, audio.currentSrc);
  console.log(`  - volume:`, audio.volume);
  console.log(`  - muted:`, audio.muted);
  console.log(`  - paused:`, audio.paused);
  console.log(`  - readyState:`, audio.readyState);
  console.log(`  - networkState:`, audio.networkState);
  console.log(`  - duration:`, audio.duration);
  console.log(`  - currentTime:`, audio.currentTime);

  if (audio.srcObject) {
    const tracks = audio.srcObject.getTracks();
    console.log(`  - Tracks:`, tracks.length);
    tracks.forEach((track, trackIndex) => {
      console.log(`    Track ${trackIndex + 1}:`, {
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        id: track.id,
      });
    });
  }
});

// Check WebRTC transceivers
const transceivers = peerConnection.getTransceivers();
console.log("🔄 Transceivers:", transceivers.length);

transceivers.forEach((transceiver, index) => {
  console.log(`🔄 Transceiver ${index + 1}:`);
  console.log(`  - mid:`, transceiver.mid);
  console.log(`  - direction:`, transceiver.direction);
  console.log(`  - currentDirection:`, transceiver.currentDirection);
  console.log(`  - stopped:`, transceiver.stopped);

  if (transceiver.receiver && transceiver.receiver.track) {
    const track = transceiver.receiver.track;
    console.log(`  - Receiver track:`, {
      kind: track.kind,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      id: track.id,
    });
  }

  if (transceiver.sender && transceiver.sender.track) {
    const track = transceiver.sender.track;
    console.log(`  - Sender track:`, {
      kind: track.kind,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      id: track.id,
    });
  }
});

// Check for any error logs in the console
console.log("🔍 Checking for recent error logs...");
console.log(
  "💡 Look for any 'Failed to handle ICE candidate' or WebRTC errors above"
);

// Test audio context
try {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log("🎵 Audio Context State:", audioContext.state);

  if (audioContext.state === "suspended") {
    console.log(
      "⚠️ Audio context is suspended. This may prevent audio playback."
    );
    console.log("💡 Try clicking on the page to resume audio context.");
  }
} catch (error) {
  console.error("❌ Failed to create audio context:", error);
}

// Check browser audio permissions
navigator.permissions.query({ name: "microphone" }).then((result) => {
  console.log("🎤 Microphone permission state:", result.state);
});

// Check if we're in a secure context (required for WebRTC)
console.log("🔒 Secure context:", window.isSecureContext);

// Check for any network issues
console.log("🌐 Network connectivity check:");
if (navigator.onLine) {
  console.log("✅ Browser reports online");
} else {
  console.log("❌ Browser reports offline");
}

// Check WebSocket connection to audio service
console.log("🔌 Checking WebSocket connection...");
const wsUrl = "wss://unifiedchat-audio-service.onrender.com/ws";
console.log("WebSocket URL:", wsUrl);

// Try to create a test WebSocket connection
try {
  const testWs = new WebSocket(wsUrl);

  testWs.onopen = () => {
    console.log("✅ WebSocket connection to audio service successful");
    testWs.close();
  };

  testWs.onerror = (error) => {
    console.error("❌ WebSocket connection to audio service failed:", error);
  };

  testWs.onclose = () => {
    console.log("🔌 Test WebSocket connection closed");
  };

  // Timeout after 5 seconds
  setTimeout(() => {
    if (testWs.readyState === WebSocket.CONNECTING) {
      console.log("⏰ WebSocket connection timeout");
      testWs.close();
    }
  }, 5000);
} catch (error) {
  console.error("❌ Failed to create WebSocket connection:", error);
}

console.log("🔍 Diagnostic complete!");
console.log("💡 If audio is still not working, check the following:");
console.log("  1. ICE connection state should be 'connected'");
console.log("  2. Audio elements should have srcObject set");
console.log("  3. Audio tracks should be enabled and not muted");
console.log("  4. No WebRTC errors in console");
console.log("  5. Audio context should be 'running'");
console.log("  6. Microphone permission should be 'granted'");
