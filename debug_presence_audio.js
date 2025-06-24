// Debug script for presence and audio functionality
// Run this in your browser console to test the services

console.log("🔍 UnifiedChat Debug Script");
console.log("========================");

// Test realtime service
async function testRealtimeService() {
  console.log("\n📡 Testing Realtime Service...");

  try {
    const healthResponse = await fetch(
      "https://realtime-service-onfn.onrender.com/health"
    );
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData);

    const onlineResponse = await fetch(
      "https://realtime-service-onfn.onrender.com/online-users"
    );
    const onlineData = await onlineResponse.json();
    console.log("✅ Online users:", onlineData);

    return true;
  } catch (error) {
    console.error("❌ Realtime service error:", error);
    return false;
  }
}

// Test audio service
async function testAudioService() {
  console.log("\n🎵 Testing Audio Service...");

  try {
    const response = await fetch(
      "https://unifiedchat-audio-service.onrender.com/health"
    );
    const data = await response.json();
    console.log("✅ Audio service health:", data);
    return true;
  } catch (error) {
    console.error("❌ Audio service error:", error);
    return false;
  }
}

// Test WebSocket connection
function testWebSocket(username = "testuser") {
  console.log("\n🔌 Testing WebSocket Connection...");

  const wsUrl = "wss://realtime-service-onfn.onrender.com/ws";
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("✅ WebSocket connected, sending username:", username);
    ws.send(username);
  };

  ws.onmessage = (event) => {
    console.log("📨 WebSocket message received:", event.data);
  };

  ws.onclose = () => {
    console.log("🔌 WebSocket closed");
  };

  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
  };

  // Close after 5 seconds
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }, 5000);
}

// Test audio context and permissions
async function testAudioContext() {
  console.log("\n🎤 Testing Audio Context...");

  try {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("✅ Microphone permission granted");

    // Test audio context
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    console.log("✅ Audio context created, state:", audioContext.state);

    if (audioContext.state === "suspended") {
      await audioContext.resume();
      console.log("✅ Audio context resumed");
    }

    // Clean up
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error("❌ Audio context error:", error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting all tests...\n");

  const realtimeOk = await testRealtimeService();
  const audioOk = await testAudioService();
  const audioContextOk = await testAudioContext();

  console.log("\n📊 Test Results:");
  console.log("================");
  console.log("Realtime Service:", realtimeOk ? "✅ OK" : "❌ FAILED");
  console.log("Audio Service:", audioOk ? "✅ OK" : "❌ FAILED");
  console.log("Audio Context:", audioContextOk ? "✅ OK" : "❌ FAILED");

  if (realtimeOk) {
    console.log("\n🔌 Testing WebSocket connection...");
    testWebSocket("debuguser");
  }

  console.log("\n💡 Next Steps:");
  console.log("1. If all services are OK, try logging in to the app");
  console.log("2. Check browser console for WebSocket connection messages");
  console.log("3. Try making an audio call between two users");
  console.log("4. If audio doesn't work, check browser permissions");
}

// Export functions for manual testing
window.debugUnifiedChat = {
  testRealtimeService,
  testAudioService,
  testWebSocket,
  testAudioContext,
  runAllTests,
};

// Auto-run tests
runAllTests();
