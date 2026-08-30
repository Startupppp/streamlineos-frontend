import { isChunkLoadError } from "./chunk-load";

describe("isChunkLoadError", () => {
  it("returns false for a non-Error value", () => {
    expect(isChunkLoadError("string")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(42)).toBe(false);
  });

  it("returns false for a regular runtime error", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(new TypeError("undefined is not a function"))).toBe(false);
  });

  it("detects a webpack ChunkLoadError by name", () => {
    const err = new Error("Loading chunk 1 failed.");
    err.name = "ChunkLoadError";
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("detects the webpack message pattern 'Loading chunk N failed'", () => {
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk abc-hash failed.\n(http://example.com/chunk.js)"))).toBe(true);
  });

  it("detects 'Failed to fetch dynamically imported module' (native ESM)", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: https://example.com/chunk.js"))).toBe(true);
  });

  it("detects 'Error loading dynamically imported module'", () => {
    expect(isChunkLoadError(new Error("Error loading dynamically imported module: https://example.com/chunk.js"))).toBe(true);
  });

  it("detects 'Importing a module script failed' (Safari / native browser modules)", () => {
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isChunkLoadError(new Error("LOADING CHUNK 5 FAILED."))).toBe(true);
    expect(isChunkLoadError(new Error("IMPORTING A MODULE SCRIPT FAILED."))).toBe(true);
  });
});
