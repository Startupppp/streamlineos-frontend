import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

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

// jsdom exposes neither TextEncoder/TextDecoder nor a WebCrypto `subtle`, which
// `jose` needs. Server-only modules that sign a JWT (lib/auth-session.ts) must
// therefore declare `@jest-environment node` rather than be polyfilled here:
// under jsdom, jose's browser build throws inside SignJWT.sign(), so a caller
// returns its failure path BEFORE reaching the network and a "returns null when
// the response stalls" assertion passes without a request ever being made.
const { TextEncoder, TextDecoder } = require("node:util");
if (typeof globalThis.TextEncoder === "undefined")
  globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === "undefined")
  globalThis.TextDecoder = TextDecoder;
