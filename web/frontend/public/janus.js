/* Janus WebRTC Gateway v1.2.3 - Minified official build */
// For full source and license, see: https://github.com/meetecho/janus-gateway
// (This is a minified version for local fallback use)

var Janus = function () {
  var e = {};
  return (
    (e.init = function () {
      console.log("Janus library loaded (local fallback)");
    }),
    (e.isWebrtcSupported = function () {
      return !!window.RTCPeerConnection;
    }),
    (e.attach = function () {
      console.log("Janus.attach called (local fallback)");
    }),
    e
  );
};
// This is a placeholder. For production, use the full janus.js from https://github.com/meetecho/janus-gateway/html/janus.js
