# R01 — One function answers module availability

**What to build:** `moduleAvailability(orgId, userId, moduleKey)` assembles all six sources and returns the reason, and every guard asks it.

Six sources answer one question and none of them assembles the others:

| Source | Where | In `ModuleGuard` today |
|---|---|---|
| `MODULE_REGISTRY[n].planGated` | `module-registry.ts:26` | indirectly |
| `FALLBACK_CORE_MODULE_KEYS` | `entitlements.service.ts:57` | yes |
| `modules_catalog.isCore` | `entitlements.service.ts:84` | yes |
| `org_modules.enabled` | `entitlements.service.ts:156` | yes |
| `PLAN_LOCKED_MODULES` | `plan-entitlements.constants.ts:74` | **no** |
| `user_module_access` denies | `access.service.ts:452` | **no** |

`isModuleEnabled` reads core keys then the org map, and stops. A caller wanting the whole picture has to know which four are covered and re-derive the other two — which is why 402-versus-403 is currently decided in two files from two different facts.

**This does not change the downgrade policy.** Root §8 records that a paid module already enabled is deliberately not revoked on downgrade. That rule stays; it stops being an implicit consequence of *where* the check sits and becomes a named branch you could change on purpose.

**Owns (exclusive):**
- `backend/src/modules/access/entitlements.service.ts`
- `backend/src/common/rbac/module.guard.ts`
- `backend/src/modules/access/authorize.ts`
- `backend/src/common/rbac/module-availability.ts` (new)
- `backend/src/common/rbac/module-availability.spec.ts` (new)

**Blocked by:** nothing
**Wave:** 1
**Status:** ready-for-agent

- [ ] `moduleAvailability` returns `{ available: true }` or `{ available: false; reason: "not-in-plan" | "org-disabled" | "user-denied" }`. The reason is a value, not an exception type the caller infers.
- [ ] `ModuleGuard`, `authorize` and the access snapshot all call it. Nothing re-derives any of the six inputs.
- [ ] **The recorded policy holds:** `not-in-plan` is returned only when there is no enabled `org_modules` row. An org that enabled a module before a downgrade keeps it. A test pins this so it cannot be changed by accident.
- [ ] `user_module_access` denies are honoured by the guard, not only shown on the access screen. `isCoreModule` still exempts core modules from denial.
- [ ] New types live in `module-availability.ts`, not `access.types.ts` — Q01 owns that file this wave.
- [ ] `@RequireModule` still works and is still correct for routes with no specific permission. It is not deleted.
- [ ] **No new per-request query.** All six inputs are already cached — the entitlement map on its local TTL, the tier through `PlanLimitsService`, denies on the access version. Assembling them adds none.
- [ ] `pnpm db:check-request-txn` still passes — the request-transaction ceiling is the guard against regression here.
- [ ] The property test is a table over `MODULE_REGISTRY`: for every module and every combination of inputs, the guard and `/me/access` return the same availability. Module twenty-one is covered the day it is added.
- [ ] One test per reason, each mutation-checked: drop the tier branch → not-in-plan fails; drop the deny branch → user-denied fails.
- [ ] A cross-tenant module key returns not-found, never forbidden. A 403 on another org's identifier is an existence oracle.
- [ ] `module-registry.spec.ts` and the 15-namespace pin pass unchanged.
- [ ] `tsc --noEmit` exit 0 and the touched specs pass by path.
- [ ] Billing is **not** added to `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`. Platform billing is never delegated.
