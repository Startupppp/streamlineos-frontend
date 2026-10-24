/** @jest-environment node */
import nextConfig from "../next.config";

describe("/favicon.ico", () => {
  it("serves the generated app icon instead of a 404 for browsers that ask for it directly", async () => {
    const rewrites = await nextConfig.rewrites?.();
    const list = Array.isArray(rewrites) ? rewrites : [...(rewrites?.beforeFiles ?? []), ...(rewrites?.afterFiles ?? []), ...(rewrites?.fallback ?? [])];

    expect(list).toContainEqual({ source: "/favicon.ico", destination: "/icon" });
  });
});
