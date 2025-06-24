// Comprehensive Audio Debugging Script for WebRTC Issues
// Run this in your browser console during an audio call

console.log("🔊 WebRTC Audio Debug Script");
console.log("============================");

// Global variables to track audio state
window.audioDebug = {
  audioContext: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  audioElement: null,
  issues: [],
};

// Test 1: Check browser audio support
function testBrowserAudioSupport() {
  console.log("\n🔍 Test 1: Browser Audio Support");

  const issues = [];

  // Check WebRTC support
  if (!window.RTCPeerConnection) {
    issues.push("❌ RTCPeerConnection not supported");
  } else {
    console.log("✅ RTCPeerConnection supported");
  }

  // Check getUserMedia support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    issues.push("❌ getUserMedia not supported");
  } else {
    console.log("✅ getUserMedia supported");
  }

  // Check AudioContext support
  if (!window.AudioContext && !window.webkitAudioContext) {
    issues.push("❌ AudioContext not supported");
  } else {
    console.log("✅ AudioContext supported");
  }

  window.audioDebug.issues.push(...issues);
  return issues.length === 0;
}

// Test 2: Check audio permissions
async function testAudioPermissions() {
  console.log("\n🎤 Test 2: Audio Permissions");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("✅ Microphone permission granted");
    console.log("📊 Audio tracks:", stream.getAudioTracks().length);

    stream.getAudioTracks().forEach((track, index) => {
      console.log(`  Track ${index}:`, {
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      });
    });

    window.audioDebug.localStream = stream;
    return true;
  } catch (error) {
    console.error("❌ Microphone permission denied:", error);
    window.audioDebug.issues.push(`Microphone permission: ${error.message}`);
    return false;
  }
}

// Test 3: Check AudioContext state
function testAudioContext() {
  console.log("\n🎵 Test 3: AudioContext State");

  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    console.log("✅ AudioContext created");
    console.log("📊 AudioContext state:", audioContext.state);

    if (audioContext.state === "suspended") {
      console.log(
        "⚠️ AudioContext is suspended - this will prevent audio playback"
      );
      window.audioDebug.issues.push("AudioContext suspended");
    }

    window.audioDebug.audioContext = audioContext;
    return audioContext.state === "running";
  } catch (error) {
    console.error("❌ AudioContext creation failed:", error);
    window.audioDebug.issues.push(`AudioContext: ${error.message}`);
    return false;
  }
}

// Test 4: Find and test audio element
function testAudioElement() {
  console.log("\n🔊 Test 4: Audio Element");

  const audioElement = document.querySelector("audio");
  if (!audioElement) {
    console.error("❌ No audio element found");
    window.audioDebug.issues.push("No audio element found");
    return false;
  }

  console.log("✅ Audio element found");
  console.log("📊 Audio element properties:", {
    srcObject: !!audioElement.srcObject,
    volume: audioElement.volume,
    muted: audioElement.muted,
    paused: audioElement.paused,
    readyState: audioElement.readyState,
    currentTime: audioElement.currentTime,
    duration: audioElement.duration,
  });

  window.audioDebug.audioElement = audioElement;
  return true;
}

// Test 5: Test audio playback
async function testAudioPlayback() {
  console.log("\n▶️ Test 5: Audio Playback");

  const audioElement = window.audioDebug.audioElement;
  if (!audioElement) {
    console.error("❌ No audio element available");
    return false;
  }

  try {
    // Create a test audio context and oscillator
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);

    console.log("✅ Test audio generated (you should hear a beep)");
    return true;
  } catch (error) {
    console.error("❌ Audio playback test failed:", error);
    window.audioDebug.issues.push(`Audio playback: ${error.message}`);
    return false;
  }
}

// Test 6: Check WebRTC connection state
function checkWebRTCState() {
  console.log("\n🌐 Test 6: WebRTC Connection State");

  // Try to find peer connection in global scope
  const peerConnections = [];

  // Look for peer connections in various places
  if (window.peerConnectionRef && window.peerConnectionRef.current) {
    peerConnections.push(window.peerConnectionRef.current);
  }

  // Check if there are any RTCPeerConnection instances
  const allObjects = Object.values(window);
  allObjects.forEach((obj) => {
    if (obj && typeof obj === "object" && obj.connectionState !== undefined) {
      peerConnections.push(obj);
    }
  });

  if (peerConnections.length === 0) {
    console.log("⚠️ No active WebRTC connections found");
    return false;
  }

  peerConnections.forEach((pc, index) => {
    console.log(`📊 Peer Connection ${index + 1}:`);
    console.log("  Connection State:", pc.connectionState);
    console.log("  ICE Connection State:", pc.iceConnectionState);
    console.log("  ICE Gathering State:", pc.iceGatheringState);
    console.log("  Signaling State:", pc.signalingState);

    if (pc.connectionState !== "connected") {
      window.audioDebug.issues.push(
        `WebRTC connection state: ${pc.connectionState}`
      );
    }

    if (pc.iceConnectionState !== "connected") {
      window.audioDebug.issues.push(
        `ICE connection state: ${pc.iceConnectionState}`
      );
    }
  });

  return peerConnections.some((pc) => pc.connectionState === "connected");
}

// Test 7: Check for common audio issues
function checkCommonIssues() {
  console.log("\n🚨 Test 7: Common Audio Issues");

  const issues = [];

  // Check if audio is muted by browser
  if (window.audioDebug.audioElement && window.audioDebug.audioElement.muted) {
    issues.push("Audio element is muted");
  }

  // Check if volume is 0
  if (
    window.audioDebug.audioElement &&
    window.audioDebug.audioElement.volume === 0
  ) {
    issues.push("Audio volume is 0");
  }

  // Check if audio context is suspended
  if (
    window.audioDebug.audioContext &&
    window.audioDebug.audioContext.state === "suspended"
  ) {
    issues.push("AudioContext is suspended");
  }

  // Check for autoplay policy issues
  if (window.audioDebug.audioElement && window.audioDebug.audioElement.paused) {
    issues.push("Audio element is paused (autoplay policy)");
  }

  window.audioDebug.issues.push(...issues);

  if (issues.length > 0) {
    console.log("❌ Found issues:", issues);
  } else {
    console.log("✅ No common issues detected");
  }

  return issues.length === 0;
}

// Fix common audio issues
async function fixAudioIssues() {
  console.log("\n🔧 Fixing Common Audio Issues");

  const fixes = [];

  // Fix 1: Resume audio context
  if (
    window.audioDebug.audioContext &&
    window.audioDebug.audioContext.state === "suspended"
  ) {
    try {
      await window.audioDebug.audioContext.resume();
      console.log("✅ AudioContext resumed");
      fixes.push("AudioContext resumed");
    } catch (error) {
      console.error("❌ Failed to resume AudioContext:", error);
    }
  }

  // Fix 2: Unmute audio element
  if (window.audioDebug.audioElement && window.audioDebug.audioElement.muted) {
    window.audioDebug.audioElement.muted = false;
    console.log("✅ Audio element unmuted");
    fixes.push("Audio element unmuted");
  }

  // Fix 3: Set volume to maximum
  if (window.audioDebug.audioElement) {
    window.audioDebug.audioElement.volume = 1.0;
    console.log("✅ Audio volume set to maximum");
    fixes.push("Audio volume set to maximum");
  }

  // Fix 4: Try to play audio
  if (window.audioDebug.audioElement && window.audioDebug.audioElement.paused) {
    try {
      await window.audioDebug.audioElement.play();
      console.log("✅ Audio playback started");
      fixes.push("Audio playback started");
    } catch (error) {
      console.error("❌ Failed to start audio playback:", error);
      console.log("💡 Try clicking on the page to enable audio");
    }
  }

  return fixes;
}

// Main diagnostic function
async function runAudioDiagnostics() {
  console.log("🚀 Starting Audio Diagnostics...\n");

  const results = {
    browserSupport: testBrowserAudioSupport(),
    permissions: await testAudioPermissions(),
    audioContext: testAudioContext(),
    audioElement: testAudioElement(),
    playback: await testAudioPlayback(),
    webrtc: checkWebRTCState(),
    commonIssues: checkCommonIssues(),
  };

  console.log("\n📊 Diagnostic Results:");
  console.log("=====================");
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${test}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  });

  console.log("\n🚨 Issues Found:");
  console.log("================");
  if (window.audioDebug.issues.length === 0) {
    console.log("✅ No issues detected");
  } else {
    window.audioDebug.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  // Try to fix issues
  if (window.audioDebug.issues.length > 0) {
    console.log("\n🔧 Attempting to fix issues...");
    const fixes = await fixAudioIssues();

    if (fixes.length > 0) {
      console.log("\n✅ Fixes applied:", fixes);
    }
  }

  console.log("\n💡 Next Steps:");
  console.log("1. If audio still doesn't work, try refreshing the page");
  console.log("2. Check browser permissions for microphone access");
  console.log("3. Try in incognito mode to rule out browser cache issues");
  console.log("4. Check if your microphone is working in other applications");
  console.log("5. Try using headphones to rule out speaker issues");

  return results;
}

// Export functions for manual testing
window.audioDebugger = {
  testBrowserAudioSupport,
  testAudioPermissions,
  testAudioContext,
  testAudioElement,
  testAudioPlayback,
  checkWebRTCState,
  checkCommonIssues,
  fixAudioIssues,
  runAudioDiagnostics,
};

// Auto-run diagnostics
runAudioDiagnostics();
