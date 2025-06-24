// Audio Diagnostic Script
// Run this in browser console to test audio step by step

console.log("🔊 Audio Diagnostic Starting...");

// Test 1: Check if getUserMedia is available
console.log("Test 1: Checking getUserMedia support...");
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  console.log("✅ getUserMedia is supported");
} else {
  console.error("❌ getUserMedia is not supported");
}

// Test 2: Check WebRTC support
console.log("Test 2: Checking WebRTC support...");
if (window.RTCPeerConnection) {
  console.log("✅ RTCPeerConnection is supported");
} else {
  console.error("❌ RTCPeerConnection is not supported");
}

// Test 3: Test microphone access
console.log("Test 3: Testing microphone access...");
navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    console.log("✅ Microphone access granted");
    console.log("Stream tracks:", stream.getTracks().length);
    console.log(
      "Track types:",
      stream.getTracks().map((t) => t.kind)
    );

    // Test 4: Create audio element and play
    console.log("Test 4: Testing audio playback...");
    const audio = document.createElement("audio");
    audio.srcObject = stream;
    audio.autoplay = true;
    document.body.appendChild(audio);

    audio.onloadedmetadata = () => {
      console.log("✅ Audio metadata loaded");
    };

    audio.onplay = () => {
      console.log("✅ Audio started playing");
    };

    audio.onerror = (e) => {
      console.error("❌ Audio playback error:", e);
    };

    // Clean up after 5 seconds
    setTimeout(() => {
      stream.getTracks().forEach((track) => track.stop());
      document.body.removeChild(audio);
      console.log("🧹 Audio test cleaned up");
    }, 5000);
  })
  .catch((err) => {
    console.error("❌ Microphone access failed:", err.name, err.message);

    if (err.name === "NotAllowedError") {
      console.log("💡 Solution: Allow microphone access in browser settings");
    } else if (err.name === "NotFoundError") {
      console.log(
        "💡 Solution: Check if microphone is connected and not in use"
      );
    } else if (err.name === "NotReadableError") {
      console.log("💡 Solution: Microphone is in use by another application");
    }
  });

// Test 5: Check WebSocket connection
console.log("Test 5: Checking WebSocket support...");
if (window.WebSocket) {
  console.log("✅ WebSocket is supported");
} else {
  console.error("❌ WebSocket is not supported");
}

// Test 6: Check audio service
console.log("Test 6: Checking audio service...");
fetch("http://localhost:8085/health")
  .then((response) => response.json())
  .then((data) => {
    console.log("✅ Audio service is healthy:", data);
  })
  .catch((err) => {
    console.error("❌ Audio service check failed:", err);
  });

// Test 7: Check for existing audio elements
console.log("Test 7: Checking existing audio elements...");
const audioElements = document.querySelectorAll("audio");
console.log("Found audio elements:", audioElements.length);
audioElements.forEach((audio, index) => {
  console.log(`Audio ${index}:`, {
    src: audio.src,
    srcObject: audio.srcObject,
    autoplay: audio.autoplay,
    muted: audio.muted,
    paused: audio.paused,
  });
});

console.log("🔍 Diagnostic complete! Check the logs above for issues.");
