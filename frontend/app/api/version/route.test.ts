/**
 * @jest-environment node
 */
import { GET } from "./route";

describe("GET /api/version", () => {
  const originalVercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const originalAppVersion = process.env.NEXT_PUBLIC_APP_VERSION;

  afterEach(() => {
    if (originalVercelSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = originalVercelSha;
    if (originalAppVersion === undefined) delete process.env.NEXT_PUBLIC_APP_VERSION;
    else process.env.NEXT_PUBLIC_APP_VERSION = originalAppVersion;
  });

  it("exposes the Vercel commit used by the running deployment", async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";
    process.env.NEXT_PUBLIC_APP_VERSION = "fallback-release";

    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      commitSha: "0123456789abcdef0123456789abcdef01234567",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("falls back to the configured release when Vercel metadata is unavailable", async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    process.env.NEXT_PUBLIC_APP_VERSION = "release-2026-09-30";

    const response = GET();

    await expect(response.json()).resolves.toEqual({ commitSha: "release-2026-09-30" });
  });

  it("returns null when the build identity was not supplied", async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.NEXT_PUBLIC_APP_VERSION;

    const response = GET();

    await expect(response.json()).resolves.toEqual({ commitSha: null });
  });
});
