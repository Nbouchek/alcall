// Comprehensive Audio Issue Debug Script
// Run this in browser console to identify the exact problem

console.log("🔍 COMPREHENSIVE AUDIO DEBUG STARTING...");

// Test 1: Check environment variables
console.log("Test 1: Environment Variables");
console.log(
  "NEXT_PUBLIC_AUDIO_API_URL:",
  process.env.NEXT_PUBLIC_AUDIO_API_URL
);
console.log("Expected URL: http://192.168.1.249:8085");

// Test 2: Check audio service health
console.log("Test 2: Audio Service Health");
const audioUrl =
  process.env.NEXT_PUBLIC_AUDIO_API_URL || "http://localhost:8085";
fetch(`${audioUrl}/health`)
  .then((response) => response.json())
  .then((data) => {
    console.log("✅ Audio service health:", data);
  })
  .catch((err) => {
    console.error("❌ Audio service health check failed:", err);
  });

// Test 3: Check WebSocket connection
console.log("Test 3: WebSocket Connection Test");
const wsUrl = `${audioUrl.replace("https", "wss").replace("http", "ws")}/ws/1`;
console.log("WebSocket URL:", wsUrl);

try {
  const testWs = new WebSocket(wsUrl);

  testWs.onopen = () => {
    console.log("✅ WebSocket connection successful");
    testWs.close();
  };

  testWs.onerror = (error) => {
    console.error("❌ WebSocket connection failed:", error);
  };

  testWs.onclose = () => {
    console.log("WebSocket test connection closed");
  };
} catch (error) {
  console.error("❌ Failed to create WebSocket:", error);
}

// Test 4: Check for AudioCall component
console.log("Test 4: AudioCall Component Check");
const audioCallContainer = document.querySelector(".audio-call-container");
if (audioCallContainer) {
  console.log("✅ AudioCall container found");
} else {
  console.log("❌ AudioCall container not found");
}

// Test 5: Check for audio elements
console.log("Test 5: Audio Elements Check");
const audioElements = document.querySelectorAll("audio");
console.log("Audio elements found:", audioElements.length);
audioElements.forEach((audio, index) => {
  console.log(`Audio ${index}:`, {
    src: audio.src,
    srcObject: audio.srcObject,
    autoplay: audio.autoplay,
    muted: audio.muted,
    paused: audio.paused,
    readyState: audio.readyState,
  });
});

// Test 6: Check for debug info
console.log("Test 6: Debug Info Check");
const debugInfo = document.querySelector('[class*="fixed top-4 left-4"]');
if (debugInfo) {
  console.log("✅ Debug info found:", debugInfo.textContent);
} else {
  console.log("❌ Debug info not found");
}

// Test 7: Check for call bar
console.log("Test 7: Call Bar Check");
const callBar = document.querySelector('[class*="fixed left-1/2 bottom-6"]');
if (callBar) {
  console.log("✅ Call bar found");
} else {
  console.log("❌ Call bar not found");
}

// Test 8: Check console logs for specific messages
console.log("Test 8: Looking for specific console messages...");
console.log("Look for these messages in the console:");
console.log("✅ AudioCall: Audio service health check: {status: 'healthy'}");
console.log(
  "✅ AudioCall: WebSocket connected successfully for user: [user_id]"
);
console.log("✅ AudioCall: WebSocket message received: [message]");
console.log(
  "✅ AudioCall: establishWebRTCConnection called with callId: [call_id]"
);
console.log("✅ AudioCall: getUserMedia successful, stream tracks: 1");
console.log("✅ AudioCall: Remote stream received, tracks: 1");
console.log("✅ AudioCall: Audio element srcObject set successfully");
console.log("✅ AudioCall: Audio playback started successfully");

// Test 9: Manual microphone test
console.log("Test 9: Manual Microphone Test");
navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    console.log("✅ Microphone access successful");
    console.log("Stream tracks:", stream.getTracks().length);

    // Create test audio element
    const testAudio = document.createElement("audio");
    testAudio.srcObject = stream;
    testAudio.autoplay = true;
    document.body.appendChild(testAudio);

    testAudio.onloadedmetadata = () => {
      console.log("✅ Test audio metadata loaded");
    };

    testAudio.onplay = () => {
      console.log("✅ Test audio playing");
    };

    testAudio.onerror = (e) => {
      console.error("❌ Test audio error:", e);
    };

    // Clean up after 3 seconds
    setTimeout(() => {
      stream.getTracks().forEach((track) => track.stop());
      document.body.removeChild(testAudio);
      console.log("🧹 Test audio cleaned up");
    }, 3000);
  })
  .catch((err) => {
    console.error("❌ Microphone access failed:", err.name, err.message);
  });

console.log("🔍 DEBUG COMPLETE!");
console.log(
  "💡 Check the logs above and look for the specific console messages"
);
console.log(
  "💡 If you see 'Audio playback started successfully', audio should work"
);
console.log("💡 If you see WebSocket errors, there's a connection issue");
