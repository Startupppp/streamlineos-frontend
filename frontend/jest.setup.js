import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";

// lib/api-client.ts, lib/portal-api-client.ts and lib/backend-url.ts throw at MODULE scope
// when NEXT_PUBLIC_API_URL is unset. next/jest reads .env, which is gitignored and absent in
// CI and in every fresh worktree, so 26 suites — including the rf-surface and inventory-a11y
// ratchets — died in setup and reported as one failure each instead of running. Tests never
// reach a real backend (fetch is always mocked); a real value still wins.
process.env.NEXT_PUBLIC_API_URL ||= "http://localhost:1500";

expect.extend(toHaveNoViolations);

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

// jsdom implements no layout, so `Element.prototype.scrollIntoView` does not
// exist. cmdk calls it in a layout effect whenever a Command list selects an
// item, which is every Combobox, MemberPicker and the command palette — the
// popover opens and then the whole tree throws, so a test that clicks one reads
// as a broken component rather than a missing DOM method.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
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

// jsdom implements `Blob`/`File` but not `Blob.prototype.text()` or
// `arrayBuffer()`, so any component that reads an uploaded file — the staged
// importer, for one — throws before a single assertion runs. Reading the
// FileReader way is what jsdom does support.
if (typeof Blob !== "undefined" && typeof Blob.prototype.text !== "function") {
  Blob.prototype.arrayBuffer = function arrayBuffer() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
  Blob.prototype.text = function text() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
