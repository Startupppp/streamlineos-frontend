import { BUILD_COMPAT_REDIRECTS } from "./build-compat-redirects";

describe("build compatibility redirect sources (BT-72df56ae5a79)", () => {
  it("sources are all distinct", () => {
    const sources = BUILD_COMPAT_REDIRECTS.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("/build/assigned redirects to /build/my-work", () => {
    const rule = BUILD_COMPAT_REDIRECTS.find((r) => r.source === "/build/assigned");
    expect(rule?.destination).toBe("/build/my-work");
  });

  it("/build/freelancer redirects to /build/my-work", () => {
    const rule = BUILD_COMPAT_REDIRECTS.find((r) => r.source === "/build/freelancer");
    expect(rule?.destination).toBe("/build/my-work");
  });

  it("/build/drafts redirects to the my-work drafts section", () => {
    const rule = BUILD_COMPAT_REDIRECTS.find((r) => r.source === "/build/drafts");
    expect(rule?.destination).toBe("/build/my-work?section=drafts");
  });
});
