// Audio Connection Test Script
// Run this in browser console during a call to debug audio issues

console.log("🔊 Audio Connection Test Starting...");

// Test 1: Check if we're in a call
console.log("Test 1: Checking call status...");
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
    networkState: audio.networkState,
    currentTime: audio.currentTime,
    duration: audio.duration,
  });
});

// Test 2: Check for WebRTC logs
console.log("Test 2: Looking for WebRTC connection logs...");
console.log("Look for these messages in the console:");
console.log("✅ AudioCall: Remote stream received");
console.log("✅ AudioCall: Audio element srcObject set successfully");
console.log("✅ AudioCall: Audio metadata loaded, attempting to play");
console.log("✅ AudioCall: Audio playback started successfully");

// Test 3: Manual audio test
console.log("Test 3: Manual audio test...");
if (audioElements.length > 0) {
  const audio = audioElements[0];
  if (audio.srcObject) {
    console.log("✅ Audio has srcObject, attempting to play...");
    audio
      .play()
      .then(() => {
        console.log("✅ Manual audio playback successful");
      })
      .catch((err) => {
        console.error("❌ Manual audio playback failed:", err);
      });
  } else {
    console.log("❌ Audio element has no srcObject");
  }
} else {
  console.log("❌ No audio elements found");
}

// Test 4: Check browser audio context
console.log("Test 4: Checking browser audio context...");
if (window.AudioContext || window.webkitAudioContext) {
  console.log("✅ AudioContext is supported");
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    console.log("✅ AudioContext created successfully");
    console.log("AudioContext state:", audioContext.state);
  } catch (err) {
    console.error("❌ Failed to create AudioContext:", err);
  }
} else {
  console.error("❌ AudioContext not supported");
}

// Test 5: Check for audio connection status
console.log("Test 5: Checking for audio connection status...");
const callBar = document.querySelector(".audio-call-container");
if (callBar) {
  console.log("✅ Call bar found");
  const audioStatus =
    callBar.textContent.includes("Audio Connected") ||
    callBar.textContent.includes("Connecting Audio");
  console.log("Audio status indicator found:", audioStatus);
} else {
  console.log("❌ Call bar not found");
}

console.log("🔍 Audio connection test complete!");
console.log(
  "💡 If you see 'Audio Connected' in the call bar, audio should be working"
);
console.log(
  "💡 If you see 'Connecting Audio...', there might be a connection issue"
);
