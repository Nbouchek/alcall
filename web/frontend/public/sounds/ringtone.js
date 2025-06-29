// Simple ringtone generator
// This creates a simple beep sound that can be used as a ringtone

function generateRingtone() {
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const sampleRate = 44100;
    const duration = 0.5; // 500ms
    const frequency = 800; // 800Hz beep

    // Create audio buffer
    const buffer = audioContext.createBuffer(
      1,
      sampleRate * duration,
      sampleRate
    );
    const channelData = buffer.getChannelData(0);

    // Generate sine wave
    for (let i = 0; i < sampleRate * duration; i++) {
      channelData[i] =
        Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3;
    }

    // Convert to WAV format
    const wavBuffer = audioBufferToWav(buffer);
    const blob = new Blob([wavBuffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    console.log("Ringtone generated:", url);
    return url;
  } catch (error) {
    console.error("Failed to generate ringtone:", error);
    return null;
  }
}

// Convert AudioBuffer to WAV format
function audioBufferToWav(buffer) {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * numberOfChannels * 2, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(
        -1,
        Math.min(1, buffer.getChannelData(channel)[i])
      );
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return arrayBuffer;
}

// Export for use in other files
if (typeof module !== "undefined" && module.exports) {
  module.exports = { generateRingtone };
} else if (typeof window !== "undefined") {
  window.generateRingtone = generateRingtone;
}
