import {
  signInPathForMissingSession,
  SESSION_EXPIRED_QUERY,
  SESSION_EXPIRED_VALUE,
} from "@/lib/auth-session-cookies";

function parseParams(path: string): URLSearchParams {
  const idx = path.indexOf("?");
  return new URLSearchParams(idx === -1 ? "" : path.slice(idx + 1));
}

describe("signInPathForMissingSession — always includes session=expired", () => {
  test("returned path starts with /signin and carries the expired flag", () => {
    const path = signInPathForMissingSession();
    expect(path.startsWith("/signin?")).toBe(true);
    expect(parseParams(path).get(SESSION_EXPIRED_QUERY)).toBe(SESSION_EXPIRED_VALUE);
  });

  test("returned path carries no callbackUrl when called with no argument", () => {
    const path = signInPathForMissingSession();
    expect(parseParams(path).get("callbackUrl")).toBeNull();
  });
});

describe("signInPathForMissingSession — accepts a valid callbackUrl", () => {
  test("accepts /build/45?tab=board and includes it as callbackUrl", () => {
    const path = signInPathForMissingSession("/build/45?tab=board");
    expect(parseParams(path).get("callbackUrl")).toBe("/build/45?tab=board");
  });

  test("a valid callbackUrl is present alongside the expired flag", () => {
    const path = signInPathForMissingSession("/dashboard");
    const params = parseParams(path);
    expect(params.get(SESSION_EXPIRED_QUERY)).toBe(SESSION_EXPIRED_VALUE);
    expect(params.get("callbackUrl")).toBe("/dashboard");
  });
});

describe("signInPathForMissingSession — rejects unsafe callbackUrls (open-redirect prevention)", () => {
  test("rejects //evil.com — protocol-relative open redirect is excluded", () => {
    const path = signInPathForMissingSession("//evil.com");
    expect(parseParams(path).get("callbackUrl")).toBeNull();
  });

  test("accepts /dashboard — confirming the negative above is not a blanket exclusion", () => {
    const path = signInPathForMissingSession("/dashboard");
    expect(parseParams(path).get("callbackUrl")).toBe("/dashboard");
  });

  test("rejects a backslash-bearing path — Windows open-redirect vector is excluded", () => {
    const path = signInPathForMissingSession("/path\\evil");
    expect(parseParams(path).get("callbackUrl")).toBeNull();
  });

  test("accepts /build/123 — confirming the backslash negative is selective", () => {
    const path = signInPathForMissingSession("/build/123");
    expect(parseParams(path).get("callbackUrl")).toBe("/build/123");
  });

  test("rejects /signin self-reference — prevents a redirect loop", () => {
    const path = signInPathForMissingSession("/signin?session=expired");
    expect(parseParams(path).get("callbackUrl")).toBeNull();
  });

  test("accepts /settings — confirming the signin self-reference negative is selective", () => {
    const path = signInPathForMissingSession("/settings");
    expect(parseParams(path).get("callbackUrl")).toBe("/settings");
  });

  test("rejects /signin without query params — plain /signin is also a self-reference", () => {
    const path = signInPathForMissingSession("/signin");
    expect(parseParams(path).get("callbackUrl")).toBeNull();
  });
});
