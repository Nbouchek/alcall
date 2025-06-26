// Janus WebRTC Gateway JavaScript Library Loader
// This is a fallback loader that dynamically loads the full Janus library

(function () {
  console.log("Loading Janus library from local fallback...");

  // If Janus is already loaded, don't load again
  if (typeof window.Janus !== "undefined") {
    console.log("Janus already loaded");
    return;
  }

  // Try to load from a reliable CDN
  const script = document.createElement("script");
  script.src = "https://unpkg.com/janus-gateway@1.2.3/dist/janus.min.js";
  script.async = false;
  script.onload = function () {
    console.log("Janus library loaded successfully from unpkg CDN");
    window.janusLoaded = true;
  };
  script.onerror = function () {
    console.error("Failed to load Janus from unpkg CDN");
    // Create a minimal Janus object to prevent errors
    window.Janus = {
      init: function (callbacks) {
        console.warn("Janus library not available - using stub");
        if (callbacks && callbacks.callback) {
          callbacks.callback();
        }
      },
      isWebrtcSupported: function () {
        return false;
      },
    };
  };
  document.head.appendChild(script);
})();
