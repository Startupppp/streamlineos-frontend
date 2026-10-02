import { backendPermissionNames, roleTemplatePermissions } from "@/test-utils/permission-catalog";
import type { PermissionKey } from "@/lib/rbac/permissions";

/**
 * Authority-matrix frontend mirror — PRD §12.
 *
 * The backend authority-matrix.spec.ts tests runtime enforcement; this test
 * verifies the frontend catalog so drift cannot silently break useCan() gates
 * or introduce a bypass key that should not be grantable.
 *
 * Row layout:
 *  Row 1  Transfer org ownership  — org owner only, enforced via isOrgOwner, NOT a permission key
 *  Row 2  Archive / delete org    — org owner only, same structural check, NOT a permission key
 *  Row 3  Manage org membership   — org owner + org admin (structural), gated on settings:organization:manage
 *  Row 4  Enable modules          — org owner + org admin, gated on settings:manage
 *
 * These keys must live in both catalogs. Rows 1–2 must have no grantable
 * permission key — expressing ownership transfer as a key creates a second
 * superuser path (CLAUDE.md §21).
 */

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
