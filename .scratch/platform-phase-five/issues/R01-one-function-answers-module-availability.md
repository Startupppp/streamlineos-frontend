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

- [x] `moduleAvailability` returns `{ available: true }` or `{ available: false; reason: "not-in-plan" | "org-disabled" | "user-denied" }`. The reason is a value, not an exception type the caller infers. — module-availability.ts:1-5.
- [ ] `ModuleGuard`, `authorize` and the access snapshot all call it. Nothing re-derives any of the six inputs. — `ModuleGuard` (module.guard.ts:60) and `authorize` (authorize.ts:30) both call it, but `AccessSnapshotResolver.resolveModuleFlags` (access-snapshot.resolver.ts:95-111) does not — it independently reads `getEffectiveModuleMap` + `isPlanGatedModule` + `denied.has`, re-deriving the same logic.
- [x] **The recorded policy holds:** `not-in-plan` is returned only when there is no enabled `org_modules` row. An org that enabled a module before a downgrade keeps it. A test pins this so it cannot be changed by accident. — module-availability.spec.ts:103-126.
- [x] `user_module_access` denies are honoured by the guard, not only shown on the access screen. `isCoreModule` still exempts core modules from denial. — module.guard.ts:25-28 calls `getUserDeniedModules`; core bypasses at module-availability.ts:36.
- [x] New types live in `module-availability.ts`, not `access.types.ts` — Q01 owns that file this wave. — module-availability.ts:1-5.
- [x] `@RequireModule` still works and is still correct for routes with no specific permission. It is not deleted. — require-module.decorator.ts:3-5; used in module.guard.ts.
- [x] **No new per-request query.** All six inputs are already cached — the entitlement map on its local TTL, the tier through `PlanLimitsService`, denies on the access version. Assembling them adds none. — `getUserDeniedModules` has a local TTL cache (access.service.ts:408-410); `getModuleMap` has a dual-layer cache (entitlements.service.ts:116-147).
- [ ] `pnpm db:check-request-txn` still passes — the request-transaction ceiling is the guard against regression here. — app-level, orchestrator verifies.
- [ ] The property test is a table over `MODULE_REGISTRY`: for every module and every combination of inputs, the guard and `/me/access` return the same availability. Module twenty-one is covered the day it is added. — module-availability.spec.ts:190-244 iterates over MODULE_REGISTRY for `moduleAvailability` in isolation and auto-covers new modules; but the "guard and /me/access agree" property is unverifiable because the access snapshot re-derives module flags independently (see criterion 2 above), so they can disagree.
- [x] One test per reason, each mutation-checked: drop the tier branch → not-in-plan fails; drop the deny branch → user-denied fails. — module-availability.spec.ts:129-161.
- [ ] A cross-tenant module key returns not-found, never forbidden. A 403 on another org's identifier is an existence oracle. — unknown module key returns `{ available: false, reason: "org-disabled" }` (module-availability.spec.ts:248-260) and the guard throws `ModuleDisabledException` = 402 Payment Required (module.guard.ts:66; api-exceptions.ts:35), not 404.
- [x] `module-registry.spec.ts` and the 15-namespace pin pass unchanged. — 24 tests pass in module-registry.spec.ts; 15-entry `NON_MODULE_NAMESPACES` pin in administering-module-exists.spec.ts passes (45 total tests, all pass).
- [x] `tsc --noEmit` exit 0 and the touched specs pass by path. — tsc: zero errors; all referenced specs pass.
- [x] Billing is **not** added to `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`. Platform billing is never delegated. — `billing.planGated = false` so not in `planGatedModuleIds()` → not in MODULE_CATALOG; `billing.ladder = "platform-admin"` so not in `delegableModuleIds()` → not in ACCESS_MANAGED_MODULES; module-registry.spec.ts:66-70 pins both.
