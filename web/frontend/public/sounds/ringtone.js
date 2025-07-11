// Create a dual-tone ringtone with better mobile device support
const createRingtone = () => {
  // Create audio context with fallback
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();

  // Create gain node for volume control
  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  masterGain.gain.value = 0.3; // Set initial volume

  // Create oscillators for dual-tone
  const frequencies = [880, 1046.5]; // A5 and C6
  const oscillators = frequencies.map((freq) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    // Connect oscillator through its own gain node to master gain
    osc.connect(gain);
    gain.connect(masterGain);

    // Set initial gain to 0
    gain.gain.value = 0;

    return { oscillator: osc, gain: gain };
  });

  // Start oscillators
  oscillators.forEach(({ oscillator }) => oscillator.start());

  // Function to create envelope
  const createEnvelope = (gainNode, startTime) => {
    const attackTime = 0.1;
    const decayTime = 0.2;
    const sustainLevel = 0.3;
    const releaseTime = 0.2;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(1, startTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(
      sustainLevel,
      startTime + attackTime + decayTime
    );
  };

  // Function to play one ring cycle
  const playRingCycle = (time) => {
    oscillators.forEach(({ gain }) => {
      createEnvelope(gain, time);
      gain.gain.setValueAtTime(0, time + 0.8); // Reset after 0.8s
    });
  };

  // Create ring pattern
  const ringDuration = 1.0; // 1 second per ring
  const pauseDuration = 2.0; // 2 seconds between rings
  const totalDuration = ringDuration + pauseDuration;

  // Function to schedule rings
  const scheduleRings = () => {
    const now = audioContext.currentTime;
    playRingCycle(now);
    playRingCycle(now + totalDuration);
    playRingCycle(now + totalDuration * 2);
  };

  // Function to stop ringtone
  const stop = () => {
    oscillators.forEach(({ gain }) => {
      gain.gain.cancelScheduledValues(audioContext.currentTime);
      gain.gain.setValueAtTime(0, audioContext.currentTime);
    });
  };

  // Function to clean up
  const cleanup = () => {
    stop();
    oscillators.forEach(({ oscillator }) => oscillator.stop());
  };

  // Function to unlock audio on iOS
  const unlockAudio = () => {
    // Create and play a brief silent buffer
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);

    // Remove the touch/click event listener
    document.removeEventListener("touchstart", unlockAudio);
    document.removeEventListener("click", unlockAudio);
  };

  // Add unlock listeners for iOS
  document.addEventListener("touchstart", unlockAudio, false);
  document.addEventListener("click", unlockAudio, false);

  return {
    play: () => {
      // Resume audio context if suspended (for Chrome)
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      scheduleRings();
    },
    stop,
    cleanup,
    setVolume: (value) => {
      masterGain.gain.value = Math.max(0, Math.min(1, value));
    },
  };
};

// Create a proper ringback tone (intermittent beeps)
const createRingbackTone = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();

  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  masterGain.gain.value = 0.4;

  let oscillator = null;
  let isPlaying = false;
  let intervalId = null;

  const playBeep = () => {
    if (oscillator) {
      oscillator.stop();
    }

    oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 440; // A4 tone
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    // Create beep envelope
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.4);

    oscillator.start(now);
    oscillator.stop(now + 0.4);
  };

  return {
    play: () => {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      if (!isPlaying) {
        isPlaying = true;
        // Play first beep immediately
        playBeep();
        // Then play beeps every 1.5 seconds
        intervalId = setInterval(playBeep, 1500);
      }
    },
    stop: () => {
      isPlaying = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (oscillator) {
        try {
          oscillator.stop();
        } catch (e) {
          // Oscillator might already be stopped
        }
        oscillator = null;
      }
    },
    cleanup: () => {
      isPlaying = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (oscillator) {
        try {
          oscillator.stop();
        } catch (e) {
          // Oscillator might already be stopped
        }
        oscillator = null;
      }
      try {
        audioContext.close();
      } catch (e) {
        // Context might already be closed
      }
    },
  };
};

// Global ringtone instance
let currentRingtone = null;
let currentRingback = null;

// Expose functions to window object
window.playRingtone = () => {
  try {
    // Stop any existing ringtone
    if (currentRingtone) {
      currentRingtone.cleanup();
    }

    // Create and play new ringtone
    currentRingtone = createRingtone();
    currentRingtone.play();
    console.log("Ringtone started successfully");
  } catch (error) {
    console.error("Failed to play ringtone:", error);
  }
};

window.stopRingtone = () => {
  try {
    if (currentRingtone) {
      currentRingtone.stop();
      console.log("Ringtone stopped");
    }
  } catch (error) {
    console.error("Failed to stop ringtone:", error);
  }
};

window.playRingback = () => {
  try {
    if (currentRingback) {
      currentRingback.cleanup(); // Clean up previous ringback if any
    }
    currentRingback = createRingbackTone();
    currentRingback.play();
    console.log("Ringback tone started successfully");
  } catch (error) {
    console.error("Failed to play ringback tone:", error);
  }
};

window.stopRingback = () => {
  try {
    if (currentRingback) {
      currentRingback.stop();
      currentRingback = null;
      console.log("Ringback tone stopped");
    }
  } catch (error) {
    console.error("Failed to stop ringback tone:", error);
  }
};

window.cleanupRingtone = () => {
  try {
    if (currentRingtone) {
      currentRingtone.cleanup();
      currentRingtone = null;
      console.log("Ringtone cleaned up");
    }
  } catch (error) {
    console.error("Failed to cleanup ringtone:", error);
  }
};

console.log("Ringtone functions loaded and available on window object");
