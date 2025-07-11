import "@testing-library/jest-dom";

// Mock the Audio API
global.Audio = jest.fn(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  currentTime: 0,
}));

// Mock WebRTC APIs
global.MediaStream = jest.fn();
global.RTCPeerConnection = jest.fn(() => ({
  addTrack: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn(),
  setRemoteDescription: jest.fn(),
  createAnswer: jest.fn().mockResolvedValue({}),
  close: jest.fn(),
}));

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue(new MediaStream()),
};

// Mock AudioContext
global.AudioContext = jest.fn(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 0 },
  })),
  destination: {},
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock window.HTMLMediaElement
Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
  configurable: true,
  get() {
    return () => Promise.resolve();
  },
});

Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
  configurable: true,
  get() {
    return () => {};
  },
});

// Set up a basic DOM environment
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  window.HTMLElement.prototype.hasPointerCapture = jest.fn();
}

// Mock console methods to avoid noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Warning: ReactDOM.render is no longer supported") ||
      args[0].includes("Warning: React.createFactory()") ||
      args[0].includes("Warning: componentWillMount") ||
      args[0].includes("Warning: componentWillReceiveProps") ||
      args[0].includes("Warning: componentWillUpdate"))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Warning: useLayoutEffect does nothing on the server") ||
      args[0].includes("Warning: React.createFactory()"))
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
};

console.log = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("Download the React DevTools")
  ) {
    return;
  }
  originalConsoleLog.call(console, ...args);
};

// Mock document.createRange
document.createRange = () => ({
  setStart: () => {},
  setEnd: () => {},
  commonAncestorContainer: {
    nodeName: "BODY",
    ownerDocument: document,
  },
  getBoundingClientRect: () => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
  }),
});

// Mock window.getComputedStyle
window.getComputedStyle = (element) => ({
  getPropertyValue: (prop) => "",
  ...element.style,
});

// Mock window.scroll
window.scroll = jest.fn();
window.scrollTo = jest.fn();

// Set up fake timers
jest.useFakeTimers();
