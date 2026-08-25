import { newCorrelationId } from "./correlation";

describe("newCorrelationId", () => {
  it("mints a distinct id per request", () => {
    expect(newCorrelationId()).not.toBe(newCorrelationId());
  });

  it("mints an id the backend accepts unchanged", () => {
    // Mirrors the API's own rule: no whitespace, safe charset, at most 64 chars.
    const id = newCorrelationId();
    expect(id).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(id.length).toBeLessThanOrEqual(64);
  });
});
