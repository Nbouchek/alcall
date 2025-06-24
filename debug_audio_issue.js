// Comprehensive Audio Debug Script - No Audio Issue
// Run this in your browser console to diagnose why no audio is heard

console.log("🔍 Starting comprehensive audio debug - No Audio Issue...");

// 1. Check AudioCall component state
console.log("\n📞 AudioCall Component State:");
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;
  console.log("AudioCall ref available:", !!audioCall);

  // Get current status
  const status = audioCall.getAudioStatus();
  console.log("Current audio status:", status);

  // Debug audio setup
  const audioSetup = audioCall.debugAudioSetup();
  console.log("Audio setup debug:", audioSetup);

  // Check volume
  const currentVolume = audioCall.getVolume();
  console.log("Current volume:", currentVolume);
} else {
  console.log("❌ AudioCall ref not available");
}

// 2. Check for audio elements and their properties
console.log("\n🎵 Audio Elements Analysis:");
const audioElements = document.querySelectorAll("audio");
console.log("Number of audio elements:", audioElements.length);

if (audioElements.length === 0) {
  console.log("❌ No audio elements found! This is the problem.");
} else {
  audioElements.forEach((audio, index) => {
    console.log(`\nAudio ${index + 1} Analysis:`);
    console.log("src:", audio.src);
    console.log("srcObject:", audio.srcObject);
    console.log("autoplay:", audio.autoplay);
    console.log("muted:", audio.muted);
    console.log("volume:", audio.volume);
    console.log("readyState:", audio.readyState);
    console.log("paused:", audio.paused);
    console.log("currentTime:", audio.currentTime);
    console.log("duration:", audio.duration);
    console.log("networkState:", audio.networkState);
    console.log("error:", audio.error);

    // Check if srcObject has tracks
    if (audio.srcObject) {
      const stream = audio.srcObject;
      console.log("Stream tracks:", stream.getTracks().length);
      stream.getTracks().forEach((track, i) => {
        console.log(`Track ${i}:`, {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });
    } else {
      console.log("❌ No srcObject - this is why no audio!");
    }

    // Try to force play
    if (audio.srcObject && audio.paused) {
      console.log("🔧 Attempting to force play audio...");
      audio
        .play()
        .then(() => {
          console.log("✅ Audio started playing");
        })
        .catch((err) => {
          console.error("❌ Failed to play audio:", err);
        });
    }
  });
}

// 3. Test browser audio output
console.log("\n🔊 Browser Audio Output Test:");
try {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log("✅ Audio context created");
  console.log("Audio context state:", audioContext.state);

  if (audioContext.state === "suspended") {
    console.log("⚠️ Audio context is suspended - user interaction required");
    console.log("💡 Try clicking anywhere on the page to resume audio context");
  }

  // Create a test tone
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Medium volume

  console.log("🔧 Playing test tone...");
  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audioContext.close();
    console.log("✅ Test tone completed - did you hear it?");
  }, 2000);
} catch (error) {
  console.error("❌ Audio context test failed:", error);
}

// 4. Check WebRTC peer connections
console.log("\n🔗 WebRTC Connection Analysis:");
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;

  // Access private refs through the component
  const peerConnection = audioCall.peerConnectionRef?.current;
  const localStream = audioCall.localStreamRef?.current;
  const remoteStream = audioCall.remoteStreamRef?.current;

  console.log("Peer connection exists:", !!peerConnection);
  console.log("Local stream exists:", !!localStream);
  console.log("Remote stream exists:", !!remoteStream);

  if (peerConnection) {
    console.log("Peer connection state:", peerConnection.connectionState);
    console.log("ICE connection state:", peerConnection.iceConnectionState);
    console.log("Signaling state:", peerConnection.signalingState);

    // Check transceivers
    const transceivers = peerConnection.getTransceivers();
    console.log("Transceivers:", transceivers.length);
    transceivers.forEach((transceiver, i) => {
      console.log(`Transceiver ${i}:`, {
        mid: transceiver.mid,
        direction: transceiver.direction,
        currentDirection: transceiver.currentDirection,
        sender: !!transceiver.sender,
        receiver: !!transceiver.receiver,
      });
    });
  }

  if (localStream) {
    console.log("Local stream tracks:", localStream.getTracks().length);
    localStream.getTracks().forEach((track, i) => {
      console.log(`Local track ${i}:`, {
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      });
    });
  }

  if (remoteStream) {
    console.log("Remote stream tracks:", remoteStream.getTracks().length);
    remoteStream.getTracks().forEach((track, i) => {
      console.log(`Remote track ${i}:`, {
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      });
    });
  }
}

// 5. Manual audio element test
console.log("\n🧪 Manual Audio Element Test:");
if (audioElements.length > 0) {
  const testAudio = audioElements[0];

  // Create a test audio element
  const testElement = document.createElement("audio");
  testElement.volume = 1.0;
  testElement.autoplay = true;

  // Create a test stream
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      console.log("✅ Got test stream, tracks:", stream.getTracks().length);
      testElement.srcObject = stream;

      testElement.onloadedmetadata = () => {
        console.log("✅ Test audio metadata loaded");
        testElement
          .play()
          .then(() => {
            console.log("✅ Test audio playing - you should hear yourself");
          })
          .catch((err) => {
            console.error("❌ Test audio play failed:", err);
          });
      };

      // Clean up after 5 seconds
      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(testElement);
        console.log("🧹 Test audio cleaned up");
      }, 5000);
    })
    .catch((err) => {
      console.error("❌ Failed to get test stream:", err);
    });

  document.body.appendChild(testElement);
} else {
  console.log("❌ No audio elements to test with");
}

// 6. Check for common issues
console.log("\n🔍 Common Issues Check:");
console.log("Browser:", navigator.userAgent);
console.log("Is HTTPS:", window.location.protocol === "https:");
console.log("Page focused:", document.hasFocus());
console.log(
  "Audio context state:",
  new (window.AudioContext || window.webkitAudioContext)().state
);

// Check if any audio is muted by system
navigator.permissions.query({ name: "microphone" }).then((result) => {
  console.log("Microphone permission:", result.state);
});

console.log("\n🔍 Debug complete! Check the logs above for issues.");
console.log("💡 Common solutions:");
console.log("1. Check if audio elements have srcObject set");
console.log("2. Check if remote stream has audio tracks");
console.log("3. Check if audio context is suspended");
console.log("4. Check if browser/system audio is muted");
console.log("5. Try clicking on the page to resume audio context");
