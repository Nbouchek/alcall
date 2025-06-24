// Quick Audio Diagnostic - No Audio Despite Connection
// Run this in your browser console during an active call

console.log("🔍 Quick Audio Diagnostic - No Audio Issue");

// 1. Check if we're in a call
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;
  const status = audioCall.getAudioStatus();
  console.log("Call Status:", status);

  if (!status.isInCall) {
    console.log("❌ Not in a call - start a call first");
    return;
  }

  console.log("✅ In a call - checking audio...");

  // 2. Check audio elements
  const audioElements = document.querySelectorAll("audio");
  console.log("Audio elements found:", audioElements.length);

  if (audioElements.length === 0) {
    console.log("❌ No audio elements found!");
    return;
  }

  audioElements.forEach((audio, i) => {
    console.log(`\nAudio ${i + 1}:`);
    console.log("- srcObject:", !!audio.srcObject);
    console.log("- volume:", audio.volume);
    console.log("- muted:", audio.muted);
    console.log("- paused:", audio.paused);
    console.log("- readyState:", audio.readyState);

    if (audio.srcObject) {
      const stream = audio.srcObject;
      console.log("- stream tracks:", stream.getTracks().length);
      stream.getTracks().forEach((track, j) => {
        console.log(`  Track ${j}:`, {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });
    } else {
      console.log("❌ No srcObject - this is the problem!");
    }
  });

  // 3. Try to fix common issues
  console.log("\n🔧 Attempting fixes...");

  // Resume audio context
  audioCall.resumeAudioContext().then((success) => {
    console.log("Audio context resume:", success ? "✅" : "❌");
  });

  // Force play audio
  audioCall.forcePlayAudio().then((success) => {
    console.log("Force play audio:", success ? "✅" : "❌");
  });

  // Set volume to maximum
  audioCall.setVolume(1.0);

  // Set audio connected
  audioCall.setAudioConnected(true);

  // 4. Manual audio test
  console.log("\n🧪 Manual audio test...");
  const testAudio = document.createElement("audio");
  testAudio.volume = 1.0;
  testAudio.autoplay = true;

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      testAudio.srcObject = stream;
      testAudio.onloadedmetadata = () => {
        testAudio
          .play()
          .then(() => {
            console.log("✅ Test audio playing - you should hear yourself");
          })
          .catch((err) => {
            console.error("❌ Test audio failed:", err);
          });
      };

      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
        if (document.body.contains(testAudio)) {
          document.body.removeChild(testAudio);
        }
      }, 3000);
    })
    .catch((err) => {
      console.error("❌ Test stream failed:", err);
    });

  document.body.appendChild(testAudio);
} else {
  console.log("❌ AudioCall ref not available");
}

console.log("\n💡 If you still can't hear:");
console.log("1. Check browser/system volume");
console.log("2. Try clicking on the page");
console.log("3. Check if audio context is suspended");
console.log("4. Try refreshing the page");

// Detailed Audio Stream Diagnostic
// Run this during an active call to check audio stream data

console.log("🔍 Detailed Audio Stream Diagnostic");

// 1. Check audio elements in detail
const audioElements = document.querySelectorAll("audio");
console.log("Audio elements found:", audioElements.length);

audioElements.forEach((audio, i) => {
  console.log(`\n=== Audio Element ${i + 1} ===`);
  console.log("srcObject:", !!audio.srcObject);
  console.log("volume:", audio.volume);
  console.log("muted:", audio.muted);
  console.log("paused:", audio.paused);
  console.log("readyState:", audio.readyState);
  console.log("currentTime:", audio.currentTime);
  console.log("duration:", audio.duration);
  console.log("error:", audio.error);

  if (audio.srcObject) {
    const stream = audio.srcObject;
    console.log("\n--- Stream Analysis ---");
    console.log("Stream ID:", stream.id);
    console.log("Stream active:", stream.active);
    console.log("Tracks count:", stream.getTracks().length);

    stream.getTracks().forEach((track, j) => {
      console.log(`\nTrack ${j}:`);
      console.log("- kind:", track.kind);
      console.log("- enabled:", track.enabled);
      console.log("- muted:", track.muted);
      console.log("- readyState:", track.readyState);
      console.log("- id:", track.id);
      console.log("- label:", track.label);

      if (track.kind === "audio") {
        const settings = track.getSettings();
        console.log("- settings:", settings);

        // Check if track is actually producing audio
        const constraints = track.getConstraints();
        console.log("- constraints:", constraints);
      }
    });
  }
});

// 2. Test if we can hear our own microphone
console.log("\n🧪 Testing microphone feedback...");
const testAudio = document.createElement("audio");
testAudio.volume = 1.0;
testAudio.autoplay = true;

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    console.log("✅ Got microphone stream");
    testAudio.srcObject = stream;

    testAudio.onloadedmetadata = () => {
      console.log("✅ Test audio metadata loaded");
      testAudio
        .play()
        .then(() => {
          console.log(
            "✅ Test audio playing - you should hear yourself speaking"
          );
          console.log(
            "💡 If you can hear yourself, the issue is with the remote stream"
          );
          console.log(
            "💡 If you cannot hear yourself, it's a system audio issue"
          );
        })
        .catch((err) => {
          console.error("❌ Test audio play failed:", err);
        });
    };

    // Clean up after 5 seconds
    setTimeout(() => {
      stream.getTracks().forEach((track) => track.stop());
      if (document.body.contains(testAudio)) {
        document.body.removeChild(testAudio);
      }
      console.log("🧹 Test audio cleaned up");
    }, 5000);

    document.body.appendChild(testAudio);
  })
  .catch((err) => {
    console.error("❌ Failed to get microphone:", err);
  });

// 3. Check WebRTC connection details
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;
  console.log("\n🔗 WebRTC Connection Details:");

  // Try to access private refs
  const debugInfo = audioCall.debugAudioSetup();
  console.log("Debug info:", debugInfo);

  // Check if we can access peer connection
  if (audioCall.peerConnectionRef?.current) {
    const pc = audioCall.peerConnectionRef.current;
    console.log("Peer connection state:", pc.connectionState);
    console.log("ICE connection state:", pc.iceConnectionState);
    console.log("Signaling state:", pc.signalingState);

    // Check transceivers
    const transceivers = pc.getTransceivers();
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
}

// 4. System audio check
console.log("\n🔊 System Audio Check:");
console.log("User agent:", navigator.userAgent);
console.log(
  "Is mobile:",
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
);

// Check if page is focused
console.log("Page focused:", document.hasFocus());

// Check if we're in a secure context
console.log("Secure context:", window.isSecureContext);

// 5. Manual audio context test
console.log("\n🎵 Manual Audio Context Test:");
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
console.log("Audio context state:", audioContext.state);
console.log("Sample rate:", audioContext.sampleRate);

// Create a simple test tone
const oscillator = audioContext.createOscillator();
const gainNode = audioContext.createGain();

oscillator.connect(gainNode);
gainNode.connect(audioContext.destination);

oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

console.log("🔧 Playing test tone (800Hz)...");
oscillator.start();

setTimeout(() => {
  oscillator.stop();
  audioContext.close();
  console.log("✅ Test tone completed - did you hear a beep?");
}, 2000);

console.log("\n💡 Analysis:");
console.log("1. If you heard yourself speaking - remote stream issue");
console.log("2. If you heard the beep - remote stream issue");
console.log("3. If you heard nothing - system audio issue");
console.log("4. Check browser/system volume settings");

// Remote Stream Diagnostic - Check why remote audio isn't working
// Run this during an active call

console.log("🔍 Remote Stream Diagnostic");

// 1. Check the current audio element's remote stream
const remoteAudioElements = document.querySelectorAll("audio");
console.log("Audio elements found:", remoteAudioElements.length);

remoteAudioElements.forEach((audio, i) => {
  console.log(`\n=== Audio Element ${i + 1} ===`);

  if (audio.srcObject) {
    const stream = audio.srcObject;
    console.log("✅ Has remote stream");
    console.log("Stream ID:", stream.id);
    console.log("Stream active:", stream.active);
    console.log("Tracks count:", stream.getTracks().length);

    stream.getTracks().forEach((track, j) => {
      console.log(`\nTrack ${j}:`);
      console.log("- kind:", track.kind);
      console.log("- enabled:", track.enabled);
      console.log("- muted:", track.muted);
      console.log("- readyState:", track.readyState);
      console.log("- id:", track.id);
      console.log("- label:", track.label);

      if (track.kind === "audio") {
        console.log("- This is the remote audio track");
        console.log("- enabled:", track.enabled, "(should be true)");
        console.log("- muted:", track.muted, "(should be false)");
        console.log("- readyState:", track.readyState, "(should be live)");
      }
    });
  } else {
    console.log("❌ No remote stream - this is the problem!");
  }
});

// 2. Check WebRTC connection state
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;
  console.log("\n🔗 WebRTC Connection State:");

  // Try to access peer connection through the component
  const debugInfo = audioCall.debugAudioSetup();
  console.log("Audio setup debug:", debugInfo);

  // Check if we can access the peer connection directly
  if (audioCall.peerConnectionRef?.current) {
    const pc = audioCall.peerConnectionRef.current;
    console.log("\nPeer Connection Details:");
    console.log("- connectionState:", pc.connectionState);
    console.log("- iceConnectionState:", pc.iceConnectionState);
    console.log("- signalingState:", pc.signalingState);

    // Check transceivers
    const transceivers = pc.getTransceivers();
    console.log("- transceivers count:", transceivers.length);

    transceivers.forEach((transceiver, i) => {
      console.log(`\nTransceiver ${i}:`);
      console.log("  - mid:", transceiver.mid);
      console.log("  - direction:", transceiver.direction);
      console.log("  - currentDirection:", transceiver.currentDirection);
      console.log("  - has sender:", !!transceiver.sender);
      console.log("  - has receiver:", !!transceiver.receiver);

      if (transceiver.receiver && transceiver.receiver.track) {
        console.log(
          "  - receiver track kind:",
          transceiver.receiver.track.kind
        );
        console.log(
          "  - receiver track enabled:",
          transceiver.receiver.track.enabled
        );
        console.log(
          "  - receiver track readyState:",
          transceiver.receiver.track.readyState
        );
      }
    });

    // Check if connection is properly established
    if (
      pc.connectionState === "connected" &&
      pc.iceConnectionState === "connected"
    ) {
      console.log("✅ WebRTC connection is properly established");
    } else {
      console.log("❌ WebRTC connection not fully established");
      console.log('  - connectionState should be "connected"');
      console.log('  - iceConnectionState should be "connected"');
    }
  } else {
    console.log("❌ No peer connection found");
  }
}

// 3. Check if the other person is actually sending audio
console.log("\n🎤 Remote Audio Check:");
console.log("The issue is likely one of these:");
console.log("1. Other person is not speaking");
console.log("2. Other person's microphone is muted");
console.log("3. Other person's audio track is not being sent");
console.log("4. WebRTC connection is not fully established");

// 4. Try to force the audio to play
console.log("\n🔧 Attempting to force audio playback...");
if (remoteAudioElements.length > 0) {
  const audio = remoteAudioElements[0];
  if (audio.srcObject) {
    console.log("Trying to force play remote audio...");
    audio
      .play()
      .then(() => {
        console.log("✅ Remote audio force play successful");
      })
      .catch((err) => {
        console.error("❌ Remote audio force play failed:", err);
      });
  }
}

// 5. Check if we can access the remote stream from the component
if (window.audioCallRef && window.audioCallRef.current) {
  const audioCall = window.audioCallRef.current;

  // Try to access the remote stream ref
  if (audioCall.remoteStreamRef?.current) {
    const remoteStream = audioCall.remoteStreamRef.current;
    console.log("\nRemote Stream from Component:");
    console.log("- exists:", !!remoteStream);
    console.log("- active:", remoteStream.active);
    console.log("- tracks:", remoteStream.getTracks().length);

    remoteStream.getTracks().forEach((track, i) => {
      console.log(`Track ${i}:`, {
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      });
    });
  } else {
    console.log("\n❌ No remote stream ref found in component");
  }
}

console.log("\n💡 Next Steps:");
console.log("1. Ask the other person to speak loudly");
console.log("2. Check if the other person can hear you");
console.log("3. Try muting/unmuting on both sides");
console.log('4. Check if both users see "Audio Connected" status');
