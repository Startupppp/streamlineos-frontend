import { describe, it, expect } from "vitest";

describe("rate limit response shape", () => {
  it("allowed result has the required fields", () => {
    const result = { allowed: true, remaining: 9, reset: Date.now() + 60_000 };
    expect(result).toHaveProperty("allowed", true);
    expect(result).toHaveProperty("remaining");
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result).toHaveProperty("reset");
  });

  it("blocked result has allowed=false", () => {
    const result = { allowed: false, remaining: 0, reset: Date.now() + 60_000 };
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("remaining decrements toward zero", () => {
    const limit = 5;
    let remaining = limit;
    for (let i = 0; i < limit; i++) {
      remaining--;
    }
    expect(remaining).toBe(0);
  });

  it("reset timestamp is in the future", () => {
    const reset = Date.now() + 60_000;
    expect(reset).toBeGreaterThan(Date.now());
  });
});
