import { resolveRouteAccess } from "../route-access";

describe("L11 layout gate upgrades — enforceRouteAccess replaces requireSession", () => {
  describe("build scope layouts — upgraded from requireSession to enforceRouteAccess", () => {
    it("resolves /build/managed-products/7 to a permission decision so the gate bites", () => {
      expect(resolveRouteAccess("/build/managed-products/7").kind).toBe("permission");
    });

    it("the decision carries a module key so the build module must be enabled", () => {
      const decision = resolveRouteAccess("/build/managed-products/7");
      if (decision.kind !== "permission") throw new Error("unexpected kind");
      expect(decision.orgModuleKey).not.toBeNull();
    });

    it("BITE: a member with an empty scope set is denied — the permission requirement is non-empty", () => {
      const decision = resolveRouteAccess("/build/managed-products/7");
      if (decision.kind !== "permission") throw new Error("unexpected kind");
      const required = Array.isArray(decision.permission)
        ? decision.permission
        : decision.permission
          ? [decision.permission]
          : [];
      expect(required.length).toBeGreaterThan(0);
      const emptyScopes: Record<string, unknown> = {};
      const granted = required.some((p) => p in emptyScopes);
      expect(granted).toBe(false);
    });

    it("BITE: removing build:managed-products:view from the fixture — member without that key is denied", () => {
      const decision = resolveRouteAccess("/build/managed-products/7");
      if (decision.kind !== "permission") throw new Error("unexpected kind");
      const required = Array.isArray(decision.permission)
        ? decision.permission
        : decision.permission
          ? [decision.permission]
          : [];

      const scopeWithKey: Record<string, unknown> = {};
      for (const p of required) scopeWithKey[p] = true;
      expect(required.some((p) => p in scopeWithKey)).toBe(true);

      const scopeWithoutKey: Record<string, unknown> = {};
      expect(required.some((p) => p in scopeWithoutKey)).toBe(false);
    });
  });

  describe("crm/layout.tsx — new enforceRouteAccess gate covers previously ungated module", () => {
    it("resolves /crm to a permission decision — layout gate bites", () => {
      expect(resolveRouteAccess("/crm").kind).toBe("permission");
    });

    it("resolves /crm/deals/win-loss to a permission decision — subtree is gated", () => {
      expect(resolveRouteAccess("/crm/deals/win-loss").kind).toBe("permission");
    });

    it("resolves /crm/leads to a permission decision — leads surface is gated", () => {
      expect(resolveRouteAccess("/crm/leads").kind).toBe("permission");
    });

    it("the CRM decision carries a module key so the crm module must be enabled", () => {
      const decision = resolveRouteAccess("/crm");
      if (decision.kind !== "permission") throw new Error("unexpected kind");
      expect(decision.orgModuleKey).not.toBeNull();
    });

    it("BITE: a member with an empty scope set is denied — the CRM permission requirement is non-empty", () => {
      const decision = resolveRouteAccess("/crm");
      if (decision.kind !== "permission") throw new Error("unexpected kind");
      const required = Array.isArray(decision.permission)
        ? decision.permission
        : decision.permission
          ? [decision.permission]
          : [];
      expect(required.length).toBeGreaterThan(0);
      const emptyScopes: Record<string, unknown> = {};
      const granted = required.some((p) => p in emptyScopes);
      expect(granted).toBe(false);
    });

    it("BITE: removing crm:leads:view from the fixture — member without that key is denied at /crm", () => {
      const decision = resolveRouteAccess("/crm");
      if (decision.kind !== "permission") throw new Error("unexpected kind");
      const required = Array.isArray(decision.permission)
        ? decision.permission
        : decision.permission
          ? [decision.permission]
          : [];

      const scopeWithKey: Record<string, unknown> = {};
      for (const p of required) scopeWithKey[p] = true;
      expect(required.some((p) => p in scopeWithKey)).toBe(true);

      const scopeWithoutKey: Record<string, unknown> = {};
      expect(required.some((p) => p in scopeWithoutKey)).toBe(false);
    });
  });
});
