import { resolveRouteAccess } from "../route-access";

describe("Unknown Build project segments (D7)", () => {
  it("keeps /build/:id/nonsense inside Build permission space so the catch-all can 404", () => {
    const decision = resolveRouteAccess("/build/29/nonsense");
    expect(decision.kind).toBe("permission");
    if (decision.kind === "permission") {
      expect(decision.orgModuleKey).toBe("build");
      expect(decision.permission).toBe("build:view");
    }
  });

  it("does not classify nonsense as route:unregistered unknown", () => {
    expect(resolveRouteAccess("/build/29/totally-fake-page").kind).not.toBe(
      "unknown",
    );
  });

  it("still prefers the exact issues gate over the catch-all descendant", () => {
    const decision = resolveRouteAccess("/build/29/issues");
    expect(decision.kind).toBe("permission");
    if (decision.kind === "permission") {
      expect(decision.permission).toBeTruthy();
    }
  });
});
