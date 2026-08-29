import "@testing-library/jest-dom";

process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1500";

// jsdom has no ResizeObserver — components like TruncatedText (used inside PageWrapper,
// ubiquitous across authenticated pages) need at least a no-op stub to mount under Jest.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no window.matchMedia — code checking prefers-reduced-motion / dark-mode media
// queries needs at least a stub (defaults to "no match") to run under Jest.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
