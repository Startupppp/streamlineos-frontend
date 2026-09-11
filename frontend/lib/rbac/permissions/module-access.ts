import type { Permission } from "./types";

/**
 * Every module whose access ladder the backend delegates, mirroring
 * `delegableModuleIds()` in `streamlineos-backend/src/common/rbac/module-registry.ts`.
 *
 * This list is what generates the `<module>:access:view|manage` half of the
 * frontend catalogue, so a module missing here is a module whose access keys
 * this repository cannot name. It was short by four — `blog`, `directory`,
 * `feedbucket` and `workflows` — while the backend generated, catalogued and
 * seeded all fourteen, and `catalog-sync.test.ts` had to subtract the generated
 * keys on both sides to stay green, which turned the one assertion that would
 * have caught the drift into a no-op.
 *
 * `catalog-sync.test.ts` now asserts equality against the vendored
 * `contracts/permission-catalog.json` instead, so adding a delegable module on
 * the backend without adding it here is a test failure rather than silent drift.
 */
export const ACCESS_MANAGED_MODULES = [
  "hr",
  "crm",
  "build",
  "accounting",
  "inventory",
  "support",
  "surveys",
  "payroll",
  "sign",
  "timesheets",
  "blog",
  "directory",
  "feedbucket",
  "workflows",
] as const;

export const MODULE_ACCESS_PERMISSIONS: Permission[] =
  ACCESS_MANAGED_MODULES.flatMap((moduleKey) => [
    {
      name: `${moduleKey}:access:view`,
      resource: `${moduleKey}:access`,
      action: "view",
      description: `View roles, permissions and assignments for the ${moduleKey} module`,
    },
    {
      name: `${moduleKey}:access:manage`,
      resource: `${moduleKey}:access`,
      action: "manage",
      description: `View access administration for the ${moduleKey} module; changing roles, permissions, or assignments additionally requires Module Admin, Module Owner, Org Admin, or Org Owner authority`,
    },
  ]);
