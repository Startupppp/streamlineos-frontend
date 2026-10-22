import { backendPermissionNames, roleTemplatePermissions } from "@/test-utils/permission-catalog";
import type { PermissionKey } from "@/lib/rbac/permissions";


describe("authority-matrix frontend mirror", () => {
  const catalogNames = backendPermissionNames();

  describe("Rows 1–2 — org ownership transfer, archive, delete are owner-only and must not be grantable permission keys", () => {
    it("catalog has no organization: lifecycle key that would create a grantable ownership bypass", () => {
      const bypassCandidates = [...catalogNames].filter(
        (key) =>
          key.startsWith("organization:") &&
          (key.includes("transfer") || key.includes("archive") || key.includes("delete")),
      );
      expect(bypassCandidates).toEqual([]);
    });
  });

  describe("Row 4 — enable modules: settings:manage is absent from all module role templates", () => {
    const MODULE_ENABLE_KEY: PermissionKey = "settings:manage";

    it("no backend module role template grants settings:manage", () => {
      const templateGrants = roleTemplatePermissions();
      expect(templateGrants.size).toBeGreaterThan(0);
      expect(templateGrants.has(MODULE_ENABLE_KEY)).toBe(false);
    });
  });
});
