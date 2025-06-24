// Simple Audio Diagnostic - No Audio Issue
// Run this in the browser console during an active call

console.log("🔍 Simple Audio Diagnostic - No Audio Issue");

// 1. Check AudioCall ref
const audioCallRef = window.audioCallRef;
if (!audioCallRef) {
  console.error("❌ AudioCall ref not found");
} else {
  console.log("✅ AudioCall ref found:", audioCallRef);
}

// 2. Check if we're in a call
let isInCall = false;
if (audioCallRef && audioCallRef.current && audioCallRef.current.state) {
  isInCall = audioCallRef.current.state.isInCall;
}
console.log("📞 In call:", isInCall);

// 3. Check peer connection
const peerConnection =
  audioCallRef && audioCallRef.peerConnectionRef
    ? audioCallRef.peerConnectionRef.current
    : null;
if (!peerConnection) {
  console.error("❌ No peer connection found");
} else {
  console.log("✅ Peer connection found");

  // 4. Check WebRTC states
  console.log("🔗 WebRTC States:");
  console.log("  Connection State:", peerConnection.connectionState);
  console.log("  ICE Connection State:", peerConnection.iceConnectionState);
  console.log("  Signaling State:", peerConnection.signalingState);

  // 5. Check if connection is established
  if (
    peerConnection.connectionState === "connected" &&
    peerConnection.iceConnectionState === "connected"
  ) {
    console.log("✅ WebRTC connection established");
  } else {
    console.error("❌ WebRTC connection not established!");
    console.log(
      "   Connection should be 'connected', ICE should be 'connected'"
    );
  }
}

// 6. Check audio elements
const audioElements = document.querySelectorAll("audio");
console.log("🎵 Audio elements found:", audioElements.length);

audioElements.forEach((audio, index) => {
  console.log(`\n🎵 Audio Element ${index + 1}:`);
  console.log("  srcObject:", !!audio.srcObject);
  console.log("  volume:", audio.volume);
  console.log("  muted:", audio.muted);
  console.log("  paused:", audio.paused);
  console.log("  readyState:", audio.readyState);

  if (audio.srcObject) {
    const stream = audio.srcObject;
    console.log("  Stream active:", stream.active);
    console.log("  Stream tracks:", stream.getTracks().length);

    stream.getTracks().forEach((track, trackIndex) => {
      console.log(`    Track ${trackIndex}:`, {
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      });
    });
  } else {
    console.error("  ❌ No srcObject - this is the problem!");
  }
});

// 7. Test audio context
try {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log("\n🎵 Audio Context State:", audioContext.state);

  if (audioContext.state === "suspended") {
    console.log("⚠️ Audio context suspended - try clicking on the page");
  }
} catch (error) {
  console.error("❌ Audio context error:", error);
}

// 8. Check microphone permission
navigator.permissions.query({ name: "microphone" }).then((result) => {
  console.log("🎤 Microphone permission:", result.state);
});

// 9. Manual audio test
console.log("\n🧪 Manual Audio Test:");
const testAudio = document.createElement("audio");
testAudio.volume = 1.0;
testAudio.autoplay = true;

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    console.log("✅ Got test microphone stream");
    testAudio.srcObject = stream;

    testAudio.onloadedmetadata = () => {
      testAudio
        .play()
        .then(() => {
          console.log("✅ Test audio playing - you should hear yourself");
          console.log(
            "💡 If you hear yourself, the issue is with remote audio"
          );
          console.log(
            "💡 If you don't hear yourself, it's a system audio issue"
          );

          // Clean up after 3 seconds
          setTimeout(() => {
            stream.getTracks().forEach((track) => track.stop());
            if (document.body.contains(testAudio)) {
              document.body.removeChild(testAudio);
            }
            console.log("🧹 Test audio cleaned up");
          }, 3000);
        })
        .catch((err) => {
          console.error("❌ Test audio play failed:", err);
        });
    };

    document.body.appendChild(testAudio);
  })
  .catch((err) => {
    console.error("❌ Test microphone failed:", err);
  });

// 10. Check for common issues
console.log("\n🔍 Common Issues Check:");
console.log("1. Browser/system volume:", "Check your system volume");
console.log(
  "2. Audio output device:",
  "Check if correct speakers/headphones selected"
);
console.log("3. Browser audio settings:", "Check browser audio permissions");
console.log(
  "4. Network connectivity:",
  navigator.onLine ? "✅ Online" : "❌ Offline"
);
console.log(
  "5. Secure context:",
  window.isSecureContext ? "✅ Secure" : "❌ Not secure"
);

console.log("\n💡 Next Steps:");
console.log(
  "- If you hear yourself in the test, the issue is with remote audio stream"
);
console.log("- If you don't hear yourself, check system audio settings");
console.log("- Check if both users see 'Audio Connected' status");
console.log("- Try refreshing the page and starting a new call");
