// Comprehensive Audio Debug Script - Volume and Connection Issues
// Run this in your browser console to diagnose audio issues

console.log("🔍 Starting comprehensive audio debug...");

// 1. Check AudioCall component state
console.log("\n📞 AudioCall Component State:");
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;
  console.log("AudioCall ref available:", !!audioCall);

  // Get current status
  const status = audioCall.getAudioStatus();
  console.log("Current audio status:", status);

  // Check if startCall method exists
  if (typeof audioCall.startCall === "function") {
    console.log("✅ startCall method available");
  } else {
    console.log("❌ startCall method NOT available");
  }

  // Check volume
  const currentVolume = audioCall.getVolume();
  console.log("Current volume:", currentVolume);

  // Force set audio connected
  console.log("🔧 Attempting to force set audioConnected to true...");
  audioCall.setAudioConnected(true);

  // Check volume and set to maximum
  console.log("🔧 Setting volume to maximum...");
  audioCall.setVolume(1.0);

  // Check status again
  const newStatus = audioCall.getAudioStatus();
  console.log("Updated audio status:", newStatus);
} else {
  console.log("❌ AudioCall ref not available");
}

// 2. Check for audio elements
console.log("\n🎵 Audio Elements:");
const audioElements = document.querySelectorAll("audio");
console.log("Number of audio elements:", audioElements.length);
audioElements.forEach((audio, index) => {
  console.log(`Audio ${index + 1}:`, {
    src: audio.src,
    srcObject: audio.srcObject,
    autoplay: audio.autoplay,
    muted: audio.muted,
    volume: audio.volume,
    readyState: audio.readyState,
    paused: audio.paused,
    currentTime: audio.currentTime,
    duration: audio.duration,
  });

  // Try to set volume to maximum
  if (audio.volume !== 1.0) {
    console.log(`🔧 Setting audio ${index + 1} volume to maximum`);
    audio.volume = 1.0;
  }

  // Try to play if paused
  if (audio.paused && audio.srcObject) {
    console.log(`🔧 Attempting to play audio ${index + 1}`);
    audio
      .play()
      .then(() => {
        console.log(`✅ Audio ${index + 1} started playing`);
      })
      .catch((err) => {
        console.error(`❌ Failed to play audio ${index + 1}:`, err);
      });
  }
});

// 3. Check WebRTC support
console.log("\n🌐 WebRTC Support:");
console.log("getUserMedia:", !!navigator.mediaDevices?.getUserMedia);
console.log("RTCPeerConnection:", !!window.RTCPeerConnection);
console.log("WebSocket:", !!window.WebSocket);

// 4. Check microphone permissions
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

// 5. Test microphone access
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
    });
} else {
  console.log("❌ getUserMedia not supported");
}

// 6. Check browser audio context
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

// 7. Check current page URL and environment
console.log("\n🌍 Environment Info:");
console.log("Current URL:", window.location.href);
console.log("User Agent:", navigator.userAgent);
console.log("Is HTTPS:", window.location.protocol === "https:");

// 8. Manual audio test
console.log("\n🧪 Manual Audio Test:");
if (audioElements.length > 0) {
  const testAudio = audioElements[0];
  console.log("Testing first audio element...");

  // Create a test tone
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume

  oscillator.start();
  setTimeout(() => {
    oscillator.stop();
    audioContext.close();
    console.log(
      "✅ Test tone played - if you heard it, audio output is working"
    );
  }, 1000);
} else {
  console.log("❌ No audio elements found for testing");
}

console.log("\n🔍 Debug complete! Check the logs above for issues.");
console.log("💡 If audioConnected is still false, try:");
console.log("1. window.audioCallRef.current.setAudioConnected(true)");
console.log("2. window.audioCallRef.current.setVolume(1.0)");
console.log("3. Check if any audio elements have srcObject set");
