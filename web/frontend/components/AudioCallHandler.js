import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaPhone,
} from "react-icons/fa";

const AudioCallHandler = forwardRef(
  (
    {
      user,
      selectedReceiver,
      roomId,
      onCallEnd,
      sendCallNotification,
      onError,
      janusInitialized,
      callState, // Add callState prop to monitor parent state
    },
    ref
  ) => {
    console.log("<<<<<< AUDIO HANDLER v1.1.1 - CACHE BUSTER LOADED >>>>>>");

    const [isInCall, setIsInCall] = useState(false);
    const [callStatus, setCallStatus] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1.0); // Add volume control
    const janusRef = useRef(null);
    const pluginHandleRef = useRef(null);
    const audioRef = useRef(null);
    const callStateRef = useRef("idle");
    const numericRoomIdRef = useRef(null);
    const isCleaningUpRef = useRef(false);

    const JANUS_URL =
      process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";

    // Monitor parent call state and force cleanup if it becomes idle
    useEffect(() => {
      console.log("🔥 AUDIO - Parent callState changed to:", callState);
      if (callState === "idle" && isInCall) {
        console.log(
          "🔥 AUDIO - Parent state is idle but component still in call, forcing cleanup"
        );
        setIsInCall(false);
        cleanupCall();
      }
    }, [callState, isInCall]);

    // Keyboard navigation support
    useEffect(() => {
      if (!isInCall) return;

      const handleKeyPress = (event) => {
        // Prevent default behavior for accessibility shortcuts
        if (event.ctrlKey || event.metaKey) {
          switch (event.key.toLowerCase()) {
            case "m":
              event.preventDefault();
              toggleMute();
              break;
            case "h":
            case "e":
              event.preventDefault();
              endCall();
              break;
            case "arrowup":
              event.preventDefault();
              adjustVolume(0.1);
              break;
            case "arrowdown":
              event.preventDefault();
              adjustVolume(-0.1);
              break;
          }
        }

        // ESC key to end call
        if (event.key === "Escape") {
          event.preventDefault();
          endCall();
        }
      };

      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }, [isInCall]);

    // Volume control function
    const adjustVolume = useCallback((delta) => {
      const newVolume = Math.max(0, Math.min(1, volume + delta));
      setVolume(newVolume);
      console.log(`🔥 AUDIO - Volume adjusted to: ${newVolume}`);

      // Use the getAllAudioElements function if available, otherwise fallback to manual list
      let audioElements;
      if (
        window.getAllAudioElements &&
        typeof window.getAllAudioElements === "function"
      ) {
        console.log(
          `🔥 AUDIO - Using getAllAudioElements function for volume control`
        );
        audioElements = window.getAllAudioElements();
      } else {
        console.log(
          `🔥 AUDIO - Using fallback audio element list for volume control`
        );
        audioElements = [
          window.remoteAudioElement,
          audioRef.current,
          document.getElementById("remote-audio"),
          document.getElementById("call-audio-element"),
          document.getElementById("emergency-remote-audio"),
          document.getElementById("emergency-remote-audio-0"),
          document.getElementById("emergency-remote-audio-1"),
          document.getElementById("emergency-remote-audio-2"),
          document.getElementById("dedicated-remote-audio"), // Our new dedicated element
          document.querySelector("audio[autoplay]"),
          ...document.querySelectorAll("audio"), // Get ALL audio elements
        ].filter(Boolean);
      }

      console.log(
        `🔥 AUDIO - Updating volume on ${audioElements.length} audio elements`
      );

      let updatedCount = 0;
      audioElements.forEach((audioElement, index) => {
        if (audioElement && typeof audioElement.volume !== "undefined") {
          const oldVolume = audioElement.volume;
          audioElement.volume = newVolume;
          audioElement.muted = newVolume === 0; // Mute if volume is 0
          console.log(
            `🔥 AUDIO - Element ${index}: ${oldVolume} → ${newVolume} (muted: ${audioElement.muted})`
          );
          updatedCount++;

          // Force play if paused
          if (audioElement.paused && audioElement.srcObject) {
            audioElement.play().catch((e) => {
              console.log(`🔥 AUDIO - Failed to resume element ${index}:`, e);
            });
          }
        }
      });

      console.log(
        `🔥 AUDIO - Successfully updated volume on ${updatedCount} elements`
      );
      setCallStatus(`🔊 Volume: ${Math.round(newVolume * 100)}%`);
    }, [volume]);

    // Failsafe: Check every 2 seconds if the call should still be active
    useEffect(() => {
      if (!isInCall) return;

      const failsafeInterval = setInterval(() => {
        if (callState === "idle" && isInCall) {
          console.log(
            "🔥 AUDIO - FAILSAFE: Detected stale call state, forcing cleanup"
          );
          setIsInCall(false);
          cleanupCall();
        }
      }, 2000);

      return () => clearInterval(failsafeInterval);
    }, [isInCall, callState]);

    // Expose functions to parent component
    useImperativeHandle(ref, () => ({
      startCall: (roomId) => {
        console.log(
          "🔥 AUDIO - useImperativeHandle startCall called with roomId:",
          roomId
        );
        console.log("🔥 AUDIO - Component state:", {
          isInCall,
          callStateRef: callStateRef.current,
        });
        startCall(roomId);
      },
      hangup: () => {
        console.log("🔥 AUDIO - useImperativeHandle hangup called");
        console.log("AudioCallHandler: hangup ref called");
        endCall();
      },
      forceCleanup: () => {
        console.log("🔥 AUDIO - useImperativeHandle forceCleanup called");
        cleanupCall();
      },
      toggleMute: () => {
        console.log("🔥 AUDIO - useImperativeHandle toggleMute called");
        toggleMute();
        return isMuted;
      },
      adjustVolume: (delta) => {
        console.log(
          "🔥 AUDIO - useImperativeHandle adjustVolume called with delta:",
          delta
        );
        adjustVolume(delta);
        return volume;
      },
      getCallStatus: () => {
        const status = {
          isInCall,
          callStatus,
          callState: callStateRef.current,
          isMuted,
          volume,
        };
        console.log("🔥 AUDIO - getCallStatus called, returning:", status);
        return status;
      },
    }));

    useEffect(() => {
      // This is a dummy useEffect to show the component has mounted.
      // The main logic is now triggered by startCall.
      console.log("AudioCallHandler mounted. Waiting for startCall...");
      return () => {
        console.log("AudioCallHandler unmounted, cleaning up...");
        cleanupCall();
      };
    }, []);

    const stringToPositiveIntegerHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
      }
      // Return a non-zero positive integer
      return Math.abs(hash) + 1;
    };

    const startCall = async (roomId) => {
      console.log("🔥 AUDIO - startCall executed with roomId:", roomId);
      console.log("🔥 AUDIO - Current state:", {
        janusInitialized,
        user: user?.username,
        selectedReceiver: selectedReceiver?.username,
        roomId,
        isInCall,
      });

      // Check if microphone stream is already available from parent
      let microphoneStream = window.localAudioStream;

      if (!microphoneStream) {
        // IMMEDIATE MICROPHONE ACCESS REQUEST - Don't wait for Janus
        console.log(
          "🔥 AUDIO - No existing stream, requesting microphone access..."
        );
        try {
          microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 48000,
            },
            video: false,
          });
          console.log(
            "🔥 AUDIO - MICROPHONE ACCESS GRANTED!",
            microphoneStream
          );
          setCallStatus("🎤 Microphone access granted - connecting...");

          // Store the stream for later use
          window.localAudioStream = microphoneStream;
        } catch (micError) {
          console.error("🔥 AUDIO - MICROPHONE ACCESS DENIED:", micError);
          setCallStatus("❌ Microphone access denied");
          if (onError) {
            if (micError.name === "NotAllowedError") {
              onError(
                "Microphone permission denied. Please allow microphone access and try again."
              );
            } else if (micError.name === "NotFoundError") {
              onError(
                "No microphone found. Please connect a microphone and try again."
              );
            } else {
              onError("Failed to access microphone: " + micError.message);
            }
          }
          return;
        }
      } else {
        console.log(
          "🔥 AUDIO - Using existing microphone stream from parent permission request"
        );
        setCallStatus("🎤 Using existing microphone access - connecting...");
      }

      // Log audio track details
      console.log(
        "🔥 AUDIO - Audio tracks:",
        microphoneStream.getAudioTracks()
      );
      const audioTracks = microphoneStream.getAudioTracks();
      audioTracks.forEach((track, index) => {
        console.log(`🔥 AUDIO - Track ${index}:`, {
          id: track.id,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings ? track.getSettings() : "N/A",
        });
      });

      // Show the stream is working by creating a temporary audio element
      const tempAudio = document.createElement("audio");
      tempAudio.srcObject = microphoneStream;
      tempAudio.muted = true; // Muted to avoid feedback
      tempAudio.id = "temp-local-audio";
      document.body.appendChild(tempAudio);
      console.log("🔥 AUDIO - Local audio stream attached to temp element");

      if (!janusInitialized) {
        console.error("🔥 AUDIO - Janus not initialized. Cannot start call.");
        if (onError) onError("Call service is not ready. Please try again.");
        return;
      }

      if (!user || !selectedReceiver || !roomId) {
        console.error(
          "🔥 AUDIO - Cannot start call, missing user, receiver or roomId"
        );
        if (onError)
          onError("Cannot start call, missing user, receiver or roomId");
        return;
      }

      setIsInCall(true);
      setCallStatus("Connecting to call server...");

      if (sendCallNotification) {
        console.log(
          "🔥 AUDIO - Sending call notification to:",
          selectedReceiver.username
        );
        sendCallNotification(selectedReceiver.id, roomId);
      }

      const janus = new window.Janus({
        server: JANUS_URL,
        success: () => {
          console.log("🔥 AUDIO - Janus session created successfully");
          janusRef.current = janus;
          attachAudioBridgePlugin(janus, roomId);
        },
        error: (error) => {
          const errorMsg = `Janus session creation failed: ${error}`;
          console.error("🔥 AUDIO - " + errorMsg);
          if (onError) onError(errorMsg);
          cleanupCall();
        },
        destroyed: () => {
          console.log(
            "🔥 AUDIO - Janus session destroyed by startCall's instance."
          );
          cleanupCall();
        },
      });
    };

    const attachAudioBridgePlugin = (janus, roomId) => {
      numericRoomIdRef.current = stringToPositiveIntegerHash(roomId);
      console.log(
        `🔥 AUDIO - Hashed room '${roomId}' to numeric ID: ${numericRoomIdRef.current}`
      );

      janus.attach({
        plugin: "janus.plugin.audiobridge",
        success: (pluginHandle) => {
          pluginHandleRef.current = pluginHandle;
          console.log(
            "🔥 AUDIO - AudioBridge plugin attached. Creating room..."
          );
          callStateRef.current = "creating";
          setCallStatus("Setting up secure connection...");

          const createMsg = {
            request: "create",
            room: numericRoomIdRef.current,
            permanent: false,
            description: `Call: ${roomId}`,
          };
          pluginHandle.send({
            message: createMsg,
            success: (data) => {
              if (!data) {
                console.error(
                  "🔥 AUDIO - Invalid response from Janus (empty)",
                  data
                );
                if (onError) onError("Connection failed - please try again");
                cleanupCall();
                return;
              }

              const roomCreated = data.audiobridge === "created";
              const roomAlreadyExists = data.error_code === 486;

              if (roomCreated || roomAlreadyExists) {
                if (roomAlreadyExists) {
                  console.log("🔥 AUDIO - Room already existed, joining...");
                } else {
                  console.log(
                    "🔥 AUDIO - Room created successfully, joining..."
                  );
                  setCallStatus("Connecting to call...");
                }
                callStateRef.current = "joining";
                const joinMsg = {
                  request: "join",
                  room: numericRoomIdRef.current,
                  display: user?.username || "Anonymous",
                  muted: false,
                  quality: 10, // Highest quality
                };
                console.log("🔥 AUDIO - Joining room with config:", joinMsg);
                pluginHandle.send({ message: joinMsg });
              } else {
                console.error("🔥 AUDIO - Failed to create/access room:", data);
                setCallStatus("Connection failed - please try again");
                if (onError) onError("Failed to setup call room");
                cleanupCall();
              }
            },
            error: (error) => {
              console.error("🔥 AUDIO - Error creating room:", error);
              setCallStatus("Connection error - check your internet");
              if (onError) onError("Failed to setup call room");
              cleanupCall();
            },
          });
        },
        onmessage: (msg, jsep) => {
          console.log("🔥 AUDIO - AudioBridge message:", msg);
          const event = msg.audiobridge;

          if (event === "joined") {
            console.log("🔥 AUDIO - Successfully joined room!");
            console.log("🔥 AUDIO - Room info:", msg);

            setCallStatus("Connected to call - setting up audio...");

            // Handle existing participants
            if (msg.participants) {
              console.log(
                "🔥 AUDIO - Found existing participants:",
                msg.participants
              );
              handleParticipants(msg.participants);
            }

            // Now publish our own microphone feed
            publishOwnFeed(true);
          } else if (event === "roomchanged") {
            // Shouldn't happen in our case, but log it
            console.log("🔥 AUDIO - Room changed:", msg);
            setCallStatus("Call room changed - reconnecting...");
          } else if (event === "destroyed") {
            console.log("🔥 AUDIO - Room destroyed");
            setCallStatus("Call ended - room closed");
            if (onError) onError("Call room was destroyed");
            cleanupCall();
          } else if (event === "event") {
            if (msg.participants) {
              console.log("🔥 AUDIO - Participants update:", msg.participants);
              handleParticipants(msg.participants);
            }
            if (msg.error) {
              console.error("🔥 AUDIO - Event error:", msg.error);
              setCallStatus(`Call error: ${msg.error}`);
              if (onError) onError(`Call error: ${msg.error}`);
              cleanupCall();
            }
          } else if (event === "participants") {
            // An event listing participants in the room
            console.log("🔥 AUDIO - Participants list:", msg.participants);
            handleParticipants(msg.participants);
          } else if (event === "event" && msg.error) {
            console.error("🔥 AUDIO - AudioBridge event error:", msg.error);
            setCallStatus(`Error: ${msg.error}`);
            if (onError) onError(`Call error: ${msg.error}`);
            cleanupCall();
          }

          if (jsep) {
            console.log("🔥 AUDIO - Handling remote JSEP:", jsep);
            pluginHandleRef.current.handleRemoteJsep({ jsep: jsep });
          }
        },
        onremotestream: (stream) => {
          console.log("🔥 AUDIO - REMOTE STREAM RECEIVED:", stream);
          console.log("🔥 AUDIO - Stream tracks:", stream.getTracks());
          console.log("🔥 AUDIO - Stream active:", stream.active);

          // IMMEDIATE AUDIO SETUP - Create dedicated remote audio element
          const createDedicatedAudioElement = () => {
            // Remove any existing dedicated audio element
            const existingAudio = document.getElementById(
              "dedicated-remote-audio"
            );
            if (existingAudio) {
              existingAudio.remove();
              console.log(
                "🔥 AUDIO - Removed existing dedicated audio element"
              );
            }

            // Create new dedicated audio element
            const dedicatedAudio = document.createElement("audio");
            dedicatedAudio.id = "dedicated-remote-audio";
            dedicatedAudio.autoplay = true;
            dedicatedAudio.volume = 1.0;
            dedicatedAudio.muted = false;
            dedicatedAudio.playsInline = true;
            dedicatedAudio.controls = true; // SHOW CONTROLS for debugging
            dedicatedAudio.style.position = "fixed";
            dedicatedAudio.style.bottom = "10px";
            dedicatedAudio.style.right = "10px";
            dedicatedAudio.style.zIndex = "9999";
            dedicatedAudio.style.backgroundColor = "red";
            dedicatedAudio.style.border = "2px solid yellow";

            // Set the stream IMMEDIATELY
            dedicatedAudio.srcObject = stream;

            // Add comprehensive event listeners
            dedicatedAudio.onloadstart = () =>
              console.log("🔥 AUDIO - DEDICATED: Load started");
            dedicatedAudio.onloadeddata = () =>
              console.log("🔥 AUDIO - DEDICATED: Data loaded");
            dedicatedAudio.oncanplay = () => {
              console.log("🔥 AUDIO - DEDICATED: Can play - FORCING PLAY");
              dedicatedAudio
                .play()
                .then(() => {
                  console.log("🔥 AUDIO - DEDICATED: PLAYING SUCCESSFULLY!");
                  setCallStatus("🔊 REMOTE AUDIO PLAYING! 🔊");
                })
                .catch((e) => {
                  console.error("🔥 AUDIO - DEDICATED: Play failed:", e);
                  setCallStatus("Click the red audio player to enable sound");
                });
            };
            dedicatedAudio.onplaying = () => {
              console.log("🔥 AUDIO - DEDICATED: IS PLAYING!");
              setCallStatus("🎵 Remote audio active 🎵");
            };
            dedicatedAudio.onpause = () =>
              console.log("🔥 AUDIO - DEDICATED: PAUSED");
            dedicatedAudio.onerror = (e) =>
              console.error("🔥 AUDIO - DEDICATED: ERROR:", e);
            dedicatedAudio.onvolumechange = () =>
              console.log(
                "🔥 AUDIO - DEDICATED: Volume:",
                dedicatedAudio.volume
              );

            // Append to body so it's visible
            document.body.appendChild(dedicatedAudio);
            console.log(
              "🔥 AUDIO - DEDICATED: Created visible audio element with controls"
            );

            return dedicatedAudio;
          };

          // Create the dedicated audio element immediately
          const dedicatedAudio = createDedicatedAudioElement();

          // CRITICAL: Also attach stream to main audio ref for parent component
          if (audioRef.current) {
            console.log("🔥 AUDIO - Attaching stream to main audio ref");
            audioRef.current.srcObject = stream;
            audioRef.current.volume = volume;
            audioRef.current.muted = false;
            audioRef.current.autoplay = true;
            audioRef.current.playsInline = true;

            // Try to play immediately
            audioRef.current
              .play()
              .then(() => {
                console.log("🔥 AUDIO - Main audio ref playing successfully!");
              })
              .catch((e) => {
                console.error("🔥 AUDIO - Main audio ref play failed:", e);
              });
          }

          // Also set global reference for other components
          window.remoteAudioElement = dedicatedAudio;

          // Define all possible audio elements that should be playing (for scope access)
          const getAllAudioElements = () =>
            [
              window.remoteAudioElement,
              audioRef.current,
              document.getElementById("remote-audio"),
              document.getElementById("call-audio-element"),
              document.getElementById("emergency-remote-audio"),
              document.getElementById("emergency-remote-audio-0"),
              document.getElementById("emergency-remote-audio-1"),
              document.getElementById("emergency-remote-audio-2"),
              document.getElementById("dedicated-remote-audio"),
              dedicatedAudio,
              document.querySelector("audio[autoplay]"),
              ...document.querySelectorAll("audio"),
            ].filter(Boolean);

          // Store the function globally so other methods can access it
          window.getAllAudioElements = getAllAudioElements;

          // AUDIO LEVEL MONITORING - Add Web Audio API monitoring
          const setupAudioLevelMonitoring = () => {
            try {
              if (!window.audioContext) {
                window.audioContext = new (window.AudioContext ||
                  window.webkitAudioContext)();
              }

              // Create audio nodes for monitoring
              const source =
                window.audioContext.createMediaStreamSource(stream);
              const analyser = window.audioContext.createAnalyser();
              analyser.fftSize = 256;

              source.connect(analyser);

              const bufferLength = analyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);

              let lastAudioLevel = 0;
              let silenceCount = 0;
              let audioDetectedCount = 0;

              const monitorAudio = () => {
                analyser.getByteFrequencyData(dataArray);

                // Calculate average volume level
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                  sum += dataArray[i];
                }
                const averageLevel = sum / bufferLength;

                // Check if audio level changed significantly
                if (Math.abs(averageLevel - lastAudioLevel) > 5) {
                  console.log(
                    `🔥 AUDIO - Level detected: ${Math.round(averageLevel)}/255`
                  );
                  lastAudioLevel = averageLevel;
                }

                if (averageLevel > 10) {
                  // Audio detected
                  audioDetectedCount++;
                  silenceCount = 0;
                  if (audioDetectedCount === 1) {
                    console.log(
                      "🔥 AUDIO - REMOTE AUDIO ACTIVITY DETECTED! 🎵"
                    );
                    setCallStatus("🎵 Remote audio active 🎵");
                  }
                } else {
                  // Silence
                  silenceCount++;
                  audioDetectedCount = 0;
                  if (silenceCount === 60) {
                    // 1 second of silence (60 frames at ~60fps)
                    console.log("🔥 AUDIO - Remote audio silent");
                    setCallStatus("🔇 Remote audio silent");
                  }
                }

                // Continue monitoring if still in call
                if (isInCall) {
                  requestAnimationFrame(monitorAudio);
                }
              };

              // Start monitoring
              monitorAudio();
              console.log("🔥 AUDIO - Audio level monitoring started");
            } catch (error) {
              console.error(
                "🔥 AUDIO - Failed to setup audio monitoring:",
                error
              );
            }
          };

          // Start audio monitoring
          setupAudioLevelMonitoring();

          // CRITICAL: Initialize and resume audio context for better compatibility
          const initAudioContext = async () => {
            try {
              if (!window.audioContext) {
                window.audioContext = new (window.AudioContext ||
                  window.webkitAudioContext)();
                console.log("🔥 AUDIO - Created new AudioContext");
              }

              if (window.audioContext.state === "suspended") {
                await window.audioContext.resume();
                console.log("🔥 AUDIO - Resumed AudioContext");
              }

              console.log(
                "🔥 AUDIO - AudioContext state:",
                window.audioContext.state
              );
            } catch (error) {
              console.error(
                "🔥 AUDIO - AudioContext initialization failed:",
                error
              );
            }
          };

          initAudioContext();

          // PLAY dedicated audio immediately - autoplay has been unlocked by call button
          console.log(
            "🔥 AUDIO - PLAYING dedicated audio immediately (autoplay unlocked by call button)"
          );
          dedicatedAudio
            .play()
            .then(() => {
              console.log("🔥 AUDIO - DEDICATED: Immediate play SUCCESS!");
              setCallStatus(
                "🔊 Audio connected - you can now hear the other party!"
              );
            })
            .catch((e) => {
              console.error("🔥 AUDIO - DEDICATED: Immediate play FAILED:", e);

              // Try again after a short delay
              setTimeout(() => {
                console.log(
                  "🔥 AUDIO - RETRY: Playing dedicated audio after delay"
                );
                dedicatedAudio
                  .play()
                  .then(() => {
                    console.log("🔥 AUDIO - DEDICATED: Delayed play SUCCESS!");
                    setCallStatus(
                      "🔊 Audio connected - you can now hear the other party!"
                    );
                  })
                  .catch((e) => {
                    console.error(
                      "🔥 AUDIO - DEDICATED: Delayed play FAILED:",
                      e
                    );
                    setCallStatus(
                      "🔴 Click the red audio player to hear remote audio 🔴"
                    );
                  });
              }, 500);
            });

          // BACKUP METHOD: Use Web Audio API for direct stream processing
          const setupWebAudioAPI = async () => {
            try {
              if (window.audioContext && stream.getAudioTracks().length > 0) {
                console.log("🔥 AUDIO - Setting up Web Audio API backup");

                const source =
                  window.audioContext.createMediaStreamSource(stream);
                const gainNode = window.audioContext.createGain();
                gainNode.gain.value = volume || 1.0;

                source.connect(gainNode);
                gainNode.connect(window.audioContext.destination);

                console.log("🔥 AUDIO - Web Audio API connected successfully");
                setCallStatus("Audio connected via Web Audio API");
              }
            } catch (error) {
              console.error("🔥 AUDIO - Web Audio API setup failed:", error);
            }
          };

          // Set up Web Audio API as backup
          setupWebAudioAPI();

          // PLAY ALL audio elements immediately - autoplay has been unlocked
          const forcePlayAllAudio = async () => {
            console.log(
              "🔥 AUDIO - PLAYING all audio elements immediately (autoplay unlocked)..."
            );

            // Get all audio elements
            const audioElements = getAllAudioElements();
            console.log(
              `🔥 AUDIO - Found ${audioElements.length} audio elements to manage`
            );

            // Status message reflects that autoplay is now available
            setCallStatus("🎵 Activating audio playback...");

            let playingElements = 0;

            for (
              let elementIndex = 0;
              elementIndex < audioElements.length;
              elementIndex++
            ) {
              const audioElement = audioElements[elementIndex];
              if (!audioElement) continue;

              console.log(
                `🔥 AUDIO - Attempting to play element ${elementIndex}`
              );

              // Immediate play attempt since autoplay is unlocked
              try {
                await audioElement.play();
                console.log(
                  `🔥 AUDIO - SUCCESS: Element ${elementIndex} playing immediately`
                );
                playingElements++;
              } catch (playError) {
                console.error(
                  `🔥 AUDIO - Element ${elementIndex} immediate play failed:`,
                  playError
                );

                // Single retry after short delay
                try {
                  await new Promise((resolve) => setTimeout(resolve, 100));
                  await audioElement.play();
                  console.log(
                    `🔥 AUDIO - SUCCESS: Element ${elementIndex} playing on retry`
                  );
                  playingElements++;
                } catch (retryError) {
                  console.error(
                    `🔥 AUDIO - Element ${elementIndex} retry failed:`,
                    retryError
                  );
                }
              }
            }

            if (playingElements > 0) {
              setCallStatus(`🔊 Audio active on ${playingElements} elements!`);
            } else {
              setCallStatus(
                "🔴 Audio activation failed - try adjusting volume"
              );
            }

            // Verify audio is actually playing after 2 seconds (longer check)
            setTimeout(() => {
              console.log("🔥 AUDIO - Final audio status check:");
              let playingCount = 0;
              audioElements.forEach((audioElement, index) => {
                if (audioElement) {
                  const isPlaying =
                    !audioElement.paused && audioElement.currentTime > 0;
                  console.log(`🔥 AUDIO - Element ${index} status:`, {
                    paused: audioElement.paused,
                    currentTime: audioElement.currentTime,
                    duration: audioElement.duration,
                    volume: audioElement.volume,
                    muted: audioElement.muted,
                    networkState: audioElement.networkState,
                    readyState: audioElement.readyState,
                    isPlaying: isPlaying,
                  });

                  if (isPlaying) {
                    playingCount++;
                  } else if (audioElement.paused) {
                    console.error(
                      `🔥 AUDIO - WARNING: Element ${index} is still paused!`
                    );
                    audioElement
                      .play()
                      .catch((e) =>
                        console.error(
                          `🔥 AUDIO - Element ${index} final play attempt failed:`,
                          e
                        )
                      );
                  }
                }
              });

              if (playingCount > 0) {
                setCallStatus(`Audio active - ${playingCount} streams playing`);
                console.log(
                  `🔥 AUDIO - SUCCESS: ${playingCount} audio elements playing`
                );
              } else {
                setCallStatus("Audio setup - click to enable sound");
                console.error("🔥 AUDIO - WARNING: No audio elements playing!");
              }
            }, 2000);
          };

          // Start playing immediately
          forcePlayAllAudio().catch((error) => {
            console.error(
              "🔥 AUDIO - CRITICAL: Failed to play remote audio:",
              error
            );

            // Show prominent user interaction prompt
            setCallStatus("🔊 CLICK ANYWHERE TO ENABLE AUDIO 🔊");

            // Last resort: try to play on any user interaction
            const playOnInteraction = async (event) => {
              console.log(
                "🔥 AUDIO - Attempting play on user interaction:",
                event.type
              );

              setCallStatus("Enabling audio...");
              let successCount = 0;

              // Get fresh list of audio elements
              const audioElements = getAllAudioElements();
              console.log(
                `🔥 AUDIO - Interaction: Found ${audioElements.length} audio elements`
              );

              for (const audioElement of audioElements) {
                if (audioElement) {
                  try {
                    await audioElement.play();
                    successCount++;
                    console.log(
                      "🔥 AUDIO - SUCCESS: Audio playing after user interaction"
                    );
                  } catch (e) {
                    console.error(
                      "🔥 AUDIO - Still failed after user interaction:",
                      e
                    );
                  }
                }
              }

              if (successCount > 0) {
                setCallStatus(`Audio enabled - ${successCount} streams active`);
                console.log(
                  `🔥 AUDIO - SUCCESS: ${successCount} audio elements now playing`
                );
              } else {
                setCallStatus("Audio setup failed - check browser settings");
                console.error(
                  "🔥 AUDIO - CRITICAL: All audio elements still failed after interaction"
                );
              }

              // Remove event listeners after first successful interaction
              document.removeEventListener("click", playOnInteraction);
              document.removeEventListener("touchstart", playOnInteraction);
              document.removeEventListener("keydown", playOnInteraction);
            };

            // Add event listeners immediately
            document.addEventListener("click", playOnInteraction, {
              once: false,
            });
            document.addEventListener("touchstart", playOnInteraction, {
              once: false,
            });
            document.addEventListener("keydown", playOnInteraction, {
              once: false,
            });

            // Also try to trigger on any button clicks within the modal
            setTimeout(() => {
              const modal = document.querySelector('[role="dialog"]');
              if (modal) {
                modal.addEventListener("click", playOnInteraction, {
                  once: false,
                });
                console.log("🔥 AUDIO - Added click listener to modal");
              }
            }, 100);
          });
        },
      });
    };

    const publishOwnFeed = (useAudio) => {
      // Publish our stream
      console.log(
        "🔥 AUDIO - Publishing local audio feed. useAudio:",
        useAudio
      );
      console.log(
        "🔥 AUDIO - Available local stream:",
        window.localAudioStream
      );
      setCallStatus("Setting up microphone for call...");

      // Check if we have a pre-captured stream
      if (window.localAudioStream && useAudio) {
        console.log("🔥 AUDIO - Using pre-captured local audio stream");
        setCallStatus("Using existing microphone access...");
      } else if (useAudio) {
        console.log(
          "🔥 AUDIO - No pre-captured stream, will request new access"
        );
        setCallStatus("Requesting microphone access...");
      }

      pluginHandleRef.current.createOffer({
        tracks: [
          {
            type: "audio",
            capture: useAudio
              ? {
                  autoGainControl: true,
                  echoCancellation: true,
                  noiseSuppression: true,
                  sampleRate: 48000, // High quality audio
                  channelCount: 2, // Stereo if available
                }
              : false,
            recv: true, // CRITICAL: Enable receiving remote audio
            add: useAudio,
          },
        ],
        // Use pre-captured stream if available
        stream: window.localAudioStream || null,
        success: function (jsep) {
          console.log("🔥 AUDIO - Got SDP for local feed!", jsep);
          console.log("🔥 AUDIO - SDP Details:", {
            type: jsep.type,
            sdp: jsep.sdp.substring(0, 200) + "...", // Log first 200 chars
          });
          setCallStatus("Microphone connected, establishing secure link...");
          let publish = {
            request: "configure",
            audio: true,
            bitrate: 128000, // High quality bitrate
            record: false,
          };
          console.log("🔥 AUDIO - Sending configure message:", publish);
          pluginHandleRef.current.send({ message: publish, jsep: jsep });
        },
        error: function (error) {
          console.error("🔥 AUDIO - WebRTC offer error:", error);

          // Provide more specific error messages
          let userMessage =
            "Unable to access microphone. Please check browser settings and ensure it's not in use by another application.";
          let statusMessage = "Microphone access failed";

          if (error.toString().includes("Permission denied")) {
            userMessage =
              "Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.";
            statusMessage = "Microphone permission denied";
          } else if (
            error.toString().includes("NotFound") ||
            error.toString().includes("device not found")
          ) {
            userMessage =
              "No microphone found. Please connect a microphone and refresh the page.";
            statusMessage = "No microphone detected";
          } else if (error.toString().includes("NotAllowedError")) {
            userMessage =
              "Microphone is blocked by your browser or system. Please enable microphone access in your browser and operating system settings.";
            statusMessage = "Microphone access blocked";
          }

          setCallStatus(statusMessage);
          if (onError) onError(userMessage);

          // Use hangup to ensure a full cleanup
          endCall();
        },
      });
    };

    const handleParticipants = (participants) => {
      console.log("🔥 AUDIO - Handling participants:", participants);

      if (!participants || participants.length === 0) {
        console.log("🔥 AUDIO - No participants in room");
        setCallStatus("Waiting for other participant to join...");
        return;
      }

      let remoteParticipants = 0;
      let myId = pluginHandleRef.current?.getId();
      let remoteParticipantNames = [];

      for (const f in participants) {
        const id = participants[f].id;
        const display = participants[f].display;
        const muted = participants[f].muted;

        console.log(
          `🔥 AUDIO - Found participant: ${display} (ID: ${id}, Muted: ${muted})`
        );

        // Count remote participants (not ourselves)
        if (id !== myId) {
          remoteParticipants++;
          remoteParticipantNames.push(display);
          console.log(
            `🔥 AUDIO - Remote participant ${display} is ${
              muted ? "muted" : "unmuted"
            }`
          );
        } else {
          console.log(`🔥 AUDIO - This is our own participant (${display})`);
        }
      }

      // Update call status based on participant count
      if (remoteParticipants > 0) {
        if (remoteParticipants === 1) {
          setCallStatus(`Active call with ${remoteParticipantNames[0]}`);
        } else {
          setCallStatus(`Active call with ${remoteParticipants} participants`);
        }
        console.log(
          `🔥 AUDIO - Call is active with ${remoteParticipants} remote participant(s)`
        );
      } else {
        setCallStatus("Connected - waiting for other participant...");
        console.log("🔥 AUDIO - Waiting for other participant to join");
      }
    };

    const toggleMute = useCallback(() => {
      if (pluginHandleRef.current) {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        const muteRequest = { request: "configure", muted: newMutedState };
        pluginHandleRef.current.send({ message: muteRequest });
        console.log(`Set muted state to: ${newMutedState}`);
      }
    }, [isMuted]);

    const endCall = useCallback(() => {
      console.log("endCall function called");
      if (callStateRef.current === "idle" || isCleaningUpRef.current) {
        console.log(
          "Call already ended or cleanup in progress, skipping endCall."
        );
        return;
      }

      // Set a flag to prevent multiple endCall invocations
      if (isCleaningUpRef.current) {
        console.log("endCall already in progress, skipping onCallEnd");
        return;
      }

      cleanupCall();

      // Only call onCallEnd if we're not already in a cleanup state
      // and if the call state was not already idle when we started
      if (
        onCallEnd &&
        typeof onCallEnd === "function" &&
        !isCleaningUpRef.current
      ) {
        console.log("Calling onCallEnd prop function.");
        onCallEnd();
      } else {
        console.log(
          "Skipping onCallEnd call - cleanup in progress or invalid state"
        );
      }
    }, [onCallEnd]);

    const cleanupCall = () => {
      console.log("🔥 CLEANUP - IMMEDIATE AGGRESSIVE CLEANUP STARTING");

      // Prevent multiple concurrent cleanup calls
      if (isCleaningUpRef.current) {
        console.log("🔥 CLEANUP - Already in progress, skipping.");
        return;
      }

      if (callStateRef.current === "idle") {
        console.log("🔥 CLEANUP - Call already idle, skipping.");
        return;
      }

      isCleaningUpRef.current = true;
      callStateRef.current = "idle";

      try {
        // CRITICAL: SYNCHRONOUS IMMEDIATE MICROPHONE RELEASE
        console.log("🔥 CLEANUP - SYNCHRONOUS MICROPHONE RELEASE");

        // 1. THOROUGH MICROPHONE STREAM CLEANUP (Don't destroy peer connection yet)
        console.log("🔥 CLEANUP - THOROUGH microphone stream cleanup");

        // Stop ALL possible getUserMedia streams that might be capturing microphone
        console.log("🔥 CLEANUP - Stopping ALL getUserMedia streams");

        // Find all active streams in the browser
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Stop streams attached to plugin
          if (pluginHandleRef.current && pluginHandleRef.current.webrtcStuff) {
            const webrtcStuff = pluginHandleRef.current.webrtcStuff;

            // Stop local stream tracks but don't nullify - let Janus handle cleanup properly
            if (webrtcStuff.myStream) {
              console.log("🔥 CLEANUP - Stopping Janus myStream tracks");
              webrtcStuff.myStream.getTracks().forEach((track) => {
                console.log(
                  "🔥 CLEANUP - Stopping Janus track:",
                  track.kind,
                  track.label
                );
                track.stop();
              });
              // Don't nullify - Janus needs to clean up properly to avoid null reference errors
            }

            // Stop remote stream tracks but don't nullify
            if (webrtcStuff.remoteStream) {
              console.log("🔥 CLEANUP - Stopping remote stream tracks");
              webrtcStuff.remoteStream.getTracks().forEach((track) => {
                console.log(
                  "🔥 CLEANUP - Stopping remote track:",
                  track.kind,
                  track.label
                );
                track.stop();
              });
              // Don't nullify - let Janus handle this
            }

            // Don't close peer connection here - let Janus handle it in hangup/detach
            // This prevents the "config.pc is null" error
          }
        }

        // 2. EXHAUSTIVE GLOBAL STREAM CLEANUP
        console.log("🔥 CLEANUP - EXHAUSTIVE global stream cleanup");

        // Create a comprehensive list of all possible stream references
        const streamReferences = [
          { name: "window.localAudioStream", stream: window.localAudioStream },
          {
            name: "window.currentCallStream",
            stream: window.currentCallStream,
          },
          {
            name: "window.getUserMediaStream",
            stream: window.getUserMediaStream,
          },
          { name: "window.microphoneStream", stream: window.microphoneStream },
          { name: "window.audioStream", stream: window.audioStream },
        ];

        // Stop all global streams
        streamReferences.forEach(({ name, stream }) => {
          if (stream && stream.getTracks) {
            console.log(`🔥 CLEANUP - Found and stopping ${name}`);
            stream.getTracks().forEach((track) => {
              console.log(
                `🔥 CLEANUP - Stopping ${name} track:`,
                track.kind,
                track.label,
                track.readyState
              );
              track.stop();
            });

            // Nullify the reference
            if (name === "window.localAudioStream")
              window.localAudioStream = null;
            if (name === "window.currentCallStream")
              window.currentCallStream = null;
            if (name === "window.getUserMediaStream")
              window.getUserMediaStream = null;
            if (name === "window.microphoneStream")
              window.microphoneStream = null;
            if (name === "window.audioStream") window.audioStream = null;

            console.log(`🔥 CLEANUP - ${name} NULLIFIED`);
          }
        });

        // 3. IMMEDIATE AUDIO ELEMENT CLEANUP
        console.log("🔥 CLEANUP - IMMEDIATE audio element cleanup");
        const audioElements = document.querySelectorAll("audio");
        audioElements.forEach((audio, index) => {
          console.log(`🔥 CLEANUP - Cleaning audio element ${index}`);
          try {
            audio.pause();
            audio.currentTime = 0;
            if (audio.srcObject) {
              const stream = audio.srcObject;
              if (stream && stream.getTracks) {
                stream.getTracks().forEach((track) => {
                  console.log(
                    `🔥 CLEANUP - Stopping track from element ${index}:`,
                    track.kind,
                    track.label
                  );
                  track.stop();
                });
              }
              audio.srcObject = null;
            }
            audio.src = "";
            // Remove temporary elements
            if (
              audio.id &&
              (audio.id.includes("temp-") ||
                audio.id.includes("dedicated-") ||
                audio.id.includes("emergency-"))
            ) {
              audio.remove();
              console.log(
                `🔥 CLEANUP - Removed temporary element: ${audio.id}`
              );
            }
          } catch (error) {
            console.log(
              `🔥 CLEANUP - Error cleaning audio element ${index}:`,
              error
            );
          }
        });

        // 4. JANUS PLUGIN CLEANUP (Let Janus handle cleanup properly)
        console.log("🔥 CLEANUP - Janus plugin cleanup");
        if (pluginHandleRef.current) {
          try {
            // Let Janus handle hangup properly to avoid peer connection issues
            pluginHandleRef.current.hangup();
            console.log("🔥 CLEANUP - Janus plugin hangup called");

            // Give a small delay for Janus to process hangup
            setTimeout(() => {
              try {
                if (pluginHandleRef.current) {
                  pluginHandleRef.current.detach();
                  console.log("🔥 CLEANUP - Janus plugin detached");
                  pluginHandleRef.current = null;
                }
              } catch (error) {
                console.log("🔥 CLEANUP - Error during plugin detach:", error);
                pluginHandleRef.current = null;
              }
            }, 100);
          } catch (error) {
            console.log("🔥 CLEANUP - Error during plugin cleanup:", error);
            pluginHandleRef.current = null;
          }
        }

        // 5. JANUS CONNECTION CLEANUP (Delayed to allow proper shutdown)
        console.log("🔥 CLEANUP - Janus connection cleanup");
        if (janusRef.current) {
          // Delay destruction to allow plugin to clean up first
          setTimeout(() => {
            try {
              if (janusRef.current) {
                janusRef.current.destroy();
                console.log("🔥 CLEANUP - Janus connection destroyed");
                janusRef.current = null;
              }
            } catch (error) {
              console.log(
                "🔥 CLEANUP - Error during Janus destruction:",
                error
              );
              janusRef.current = null;
            }
          }, 200);
        }

        // 6. IMMEDIATE AUDIO CONTEXT CLEANUP
        console.log("🔥 CLEANUP - IMMEDIATE audio context cleanup");
        if (window.audioContext) {
          try {
            if (window.audioContext.state !== "closed") {
              window.audioContext.suspend();
              console.log("🔥 CLEANUP - Audio context suspended");
            }
          } catch (error) {
            console.log("🔥 CLEANUP - Error suspending audio context:", error);
          }
        }

        // 7. IMMEDIATE MICROPHONE VERIFICATION AND RELEASE
        console.log("🔥 CLEANUP - IMMEDIATE microphone verification");

        // Clear any lingering stream references
        try {
          // Force garbage collection if available
          if (window.gc) {
            window.gc();
            console.log("🔥 CLEANUP - Forced garbage collection");
          }
        } catch (error) {
          console.log("🔥 CLEANUP - GC not available");
        }

        // 8. IMMEDIATE COMPONENT STATE RESET
        console.log("🔥 CLEANUP - IMMEDIATE component state reset");
        setIsInCall(false);
        setCallStatus("");
        setIsMuted(false);

        // 9. COMPREHENSIVE MICROPHONE VERIFICATION
        console.log("🔥 CLEANUP - Comprehensive microphone verification");

        // First, scan for any remaining active audio tracks that might cause echo
        console.log("🔥 CLEANUP - Scanning for remaining active audio tracks");
        let remainingActiveTracks = 0;

        // Check all audio elements for active streams
        document.querySelectorAll("audio").forEach((audio, index) => {
          if (audio.srcObject && audio.srcObject.getTracks) {
            audio.srcObject.getTracks().forEach((track) => {
              if (track.readyState === "live" && track.kind === "audio") {
                console.log(
                  `🔥 CLEANUP - WARNING: Found live audio track in element ${index}:`,
                  track.label
                );
                remainingActiveTracks++;
                // Force stop this track to prevent echo
                track.stop();
                console.log(
                  `🔥 CLEANUP - Force stopped remaining track: ${track.label}`
                );
              }
            });
          }
        });

        // Check for any window stream references with active tracks
        [
          window.localAudioStream,
          window.currentCallStream,
          window.getUserMediaStream,
          window.microphoneStream,
          window.audioStream,
        ].forEach((stream, index) => {
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((track) => {
              if (track.readyState === "live" && track.kind === "audio") {
                console.log(
                  `🔥 CLEANUP - WARNING: Found live audio track in window stream ${index}:`,
                  track.label
                );
                remainingActiveTracks++;
                // Force stop this track to prevent echo
                track.stop();
                console.log(
                  `🔥 CLEANUP - Force stopped window stream track: ${track.label}`
                );
              }
            });
          }
        });

        if (remainingActiveTracks > 0) {
          console.log(
            `🔥 CLEANUP - WARNING: Found and stopped ${remainingActiveTracks} remaining active audio tracks`
          );
        } else {
          console.log(
            "🔥 CLEANUP - GOOD: No remaining active audio tracks found"
          );
        }

        // Test microphone availability after comprehensive cleanup
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Quick test to verify microphone is available and no echo
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((testStream) => {
              console.log(
                "🔥 CLEANUP - SUCCESS: Microphone is available for new calls"
              );
              console.log(
                `🔥 CLEANUP - Test stream has ${
                  testStream.getTracks().length
                } tracks`
              );

              // Immediately stop the test stream to prevent any interference
              testStream.getTracks().forEach((track) => {
                console.log(
                  `🔥 CLEANUP - Stopping test track: ${track.kind} ${track.label}`
                );
                track.stop();
              });
              console.log(
                "🔥 CLEANUP - Test stream stopped - microphone fully released"
              );
            })
            .catch((error) => {
              console.log(
                "🔥 CLEANUP - ERROR: Microphone NOT available:",
                error.name,
                error.message
              );
              console.log(
                "🔥 CLEANUP - This may indicate microphone is still in use by another source"
              );
            });

          // Log current media devices
          navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
              const audioInputs = devices.filter(
                (device) => device.kind === "audioinput"
              );
              console.log(
                `🔥 CLEANUP - Found ${audioInputs.length} audio input devices available`
              );
            })
            .catch((error) => {
              console.log("🔥 CLEANUP - Error enumerating devices:", error);
            });
        }

        console.log(
          "🔥 CLEANUP - IMMEDIATE CLEANUP COMPLETED - MICROPHONE RELEASED"
        );
      } catch (error) {
        console.error("🔥 CLEANUP - Error during cleanup:", error);
      } finally {
        isCleaningUpRef.current = false;
        // DO NOT call onCallEnd here to prevent infinite recursion
      }
    };

    // Audio diagnostics function
    const diagnoseAudioElements = () => {
      console.log("🔥 AUDIO - DIAGNOSTIC REPORT:");

      const allAudioElements = document.querySelectorAll("audio");
      console.log(
        `🔥 AUDIO - Found ${allAudioElements.length} audio elements on page`
      );

      allAudioElements.forEach((audio, index) => {
        console.log(`🔥 AUDIO - Element ${index}:`, {
          id: audio.id,
          src: audio.src,
          srcObject: !!audio.srcObject,
          volume: audio.volume,
          muted: audio.muted,
          paused: audio.paused,
          readyState: audio.readyState,
          networkState: audio.networkState,
          currentTime: audio.currentTime,
          duration: audio.duration,
          autoplay: audio.autoplay,
          controls: audio.controls,
          tracks: audio.srcObject ? audio.srcObject.getTracks().length : 0,
        });

        // Check if stream has active tracks
        if (audio.srcObject) {
          const tracks = audio.srcObject.getTracks();
          tracks.forEach((track, trackIndex) => {
            console.log(`🔥 AUDIO - Element ${index} Track ${trackIndex}:`, {
              kind: track.kind,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              settings: track.getSettings ? track.getSettings() : "N/A",
            });
          });
        }
      });

      // Check window audio objects
      console.log("🔥 AUDIO - Window audio objects:", {
        localAudioStream: !!window.localAudioStream,
        remoteAudioElement: !!window.remoteAudioElement,
        audioContext: !!window.audioContext,
        audioContextState: window.audioContext
          ? window.audioContext.state
          : "N/A",
      });
    };

    // Periodic diagnostics during calls
    useEffect(() => {
      if (isInCall) {
        console.log("🔥 AUDIO - Starting periodic diagnostics");
        const diagnosticInterval = setInterval(() => {
          diagnoseAudioElements();
        }, 10000); // Every 10 seconds

        // Initial diagnostic after 2 seconds
        setTimeout(() => {
          diagnoseAudioElements();
        }, 2000);

        return () => {
          clearInterval(diagnosticInterval);
          console.log("🔥 AUDIO - Stopped periodic diagnostics");
        };
      }
    }, [isInCall]);

    // Keyboard shortcuts for manual testing
    useEffect(() => {
      const handleKeyPress = (event) => {
        if (!isInCall) return;

        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            adjustVolume(0.1);
            console.log("🔥 AUDIO - Volume UP via keyboard");
            break;
          case "ArrowDown":
            event.preventDefault();
            adjustVolume(-0.1);
            console.log("🔥 AUDIO - Volume DOWN via keyboard");
            break;
          case "d":
          case "D":
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              diagnoseAudioElements();
              console.log("🔥 AUDIO - Manual diagnostic via keyboard");
            }
            break;
          case "t":
          case "T":
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              // Test audio by forcing play on all elements
              const allAudio = document.querySelectorAll("audio");
              allAudio.forEach((audio, index) => {
                if (audio.srcObject) {
                  audio
                    .play()
                    .then(() => {
                      console.log(
                        `🔥 AUDIO - Test play SUCCESS on element ${index}`
                      );
                    })
                    .catch((e) => {
                      console.log(
                        `🔥 AUDIO - Test play FAILED on element ${index}:`,
                        e
                      );
                    });
                }
              });
              console.log("🔥 AUDIO - Manual audio test via keyboard");
            }
            break;
        }
      };

      if (isInCall) {
        document.addEventListener("keydown", handleKeyPress);
        console.log(
          "🔥 AUDIO - Keyboard shortcuts enabled (↑↓ volume, Ctrl+D diagnostic, Ctrl+T test)"
        );
      }

      return () => {
        document.removeEventListener("keydown", handleKeyPress);
      };
    }, [isInCall, volume]);

    useEffect(() => {
      const handleKeyPress = (event) => {
        if (isInCall) {
          switch (event.key) {
            case "ArrowUp":
              event.preventDefault();
              adjustVolume(0.1);
              break;
            case "ArrowDown":
              event.preventDefault();
              adjustVolume(-0.1);
              break;
            case "m":
            case "M":
              event.preventDefault();
              toggleMute();
              break;
            case "Escape":
              event.preventDefault();
              endCall();
              break;
          }
        }
      };

      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }, [isInCall, adjustVolume, toggleMute, endCall]);

    // Always return only hidden audio elements and status data
    // The parent component handles all UI display
    return (
      <>
        {/* Hidden audio elements for call functionality */}
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          id="call-audio-element"
          volume={volume}
          muted={false}
          controls={false}
          style={{ display: "none" }}
        />

        {/* Provide call status for parent component via a data attribute */}
        <div
          id="audio-call-status"
          data-call-status={callStatus}
          data-is-muted={isMuted}
          data-volume={volume}
          style={{ display: "none" }}
        />
      </>
    );
  }
);

AudioCallHandler.displayName = 'AudioCallHandler';

export default AudioCallHandler;
