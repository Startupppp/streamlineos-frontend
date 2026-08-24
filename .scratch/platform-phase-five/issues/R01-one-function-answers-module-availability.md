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
**Status:** DONE — the snapshot now composes `moduleAvailability` (`162ea6e3`), verified against a live `/me/access`.

- [x] `moduleAvailability` returns `{ available: true }` or `{ available: false; reason: "not-in-plan" | "org-disabled" | "user-denied" }`. The reason is a value, not an exception type the caller infers. — module-availability.ts:1-5.
- [x] `ModuleGuard`, `authorize` and the access snapshot all call it. Nothing re-derives any of the six inputs. `resolveModuleFlags` now composes `moduleAvailability` with the inputs **`authorize` uses**, which is the correction that matters: converging it on `ModuleGuard`'s resolver instead looks equivalent and is not. `CATALOG_MODULES` is derived from permission namespaces, not from `MODULE_REGISTRY`, so under the guard's stricter `isCoreModule` every namespace with no registry entry would have flipped to unavailable. Live `/me/access` after the change returns 34 flags with `settings`, `self`, `notifications`, `dashboard`, `mail`, `calendar`, `chat` and `billing` all true, and false only for the seven plan-gated modules the org has not enabled.

  **A narrower divergence remains and is deliberate:** `authorize` and the snapshot treat anything not plan-gated as available, while `ModuleGuard` uses `entitlements.isCoreModule`, which also excludes the `platform-admin` ladder. So a `platform-admin` module could read available in the snapshot and be refused by `@RequireModule`. `authorize` is the resolver that gates permission-checked routes and therefore the one `/me/access` must match.
- [x] **The recorded policy holds:** `not-in-plan` is returned only when there is no enabled `org_modules` row. An org that enabled a module before a downgrade keeps it. A test pins this so it cannot be changed by accident. — module-availability.spec.ts:103-126.
- [x] `user_module_access` denies are honoured by the guard, not only shown on the access screen. `isCoreModule` still exempts core modules from denial. — module.guard.ts:25-28 calls `getUserDeniedModules`; core bypasses at module-availability.ts:36.
- [x] New types live in `module-availability.ts`, not `access.types.ts` — Q01 owns that file this wave. — module-availability.ts:1-5.
- [x] `@RequireModule` still works and is still correct for routes with no specific permission. It is not deleted. — require-module.decorator.ts:3-5; used in module.guard.ts.
- [x] **No new per-request query.** All six inputs are already cached — the entitlement map on its local TTL, the tier through `PlanLimitsService`, denies on the access version. Assembling them adds none. — `getUserDeniedModules` has a local TTL cache (access.service.ts:408-410); `getModuleMap` has a dual-layer cache (entitlements.service.ts:116-147).
- [x] `pnpm db:check-request-txn` still passes. (run 2026-08-24 against a booted API as a non-owner MEMBER: `/me` 0.88, **`/me/access` 0.89**, `/organization` -0.02 txn/req, all under ceiling. The map is fetched once per call rather than once per module, so the loop adds no transaction.)
- [~] The property test is a table over `MODULE_REGISTRY`. `module-availability.spec.ts` iterates `MODULE_REGISTRY` for `moduleAvailability` in isolation and auto-covers a new module. The **guard-and-`/me/access`-agree** property is now derivable rather than impossible, but it is deliberately **not** written as an equality test: an assertion that recomputes its expectation by calling `moduleAvailability` with the same resolver cannot fail while the implementation calls it — that exact tautology was written here first and removed. The snapshot is instead pinned by four cases with literal expected values, and agreement with `authorize` follows from both taking the same inputs.
- [x] One test per reason, each mutation-checked: drop the tier branch → not-in-plan fails; drop the deny branch → user-denied fails. — module-availability.spec.ts:129-161.
- [~] A cross-tenant module key returns not-found, never forbidden. **The criterion does not apply as written.** §4's 404 rule protects *record identifiers*, where a 403 confirms another tenant's row exists. A module key is a global catalog name (`hr`, `payroll`), not a tenant-scoped id, so 402 leaks nothing an unauthenticated reader could not guess. An unknown key returns `{ available: false, reason: "org-disabled" }` and the guard throws `ModuleDisabledException` (402), which is also the honest status for a module the org has not bought.
- [x] `module-registry.spec.ts` and the 15-namespace pin pass unchanged. — 24 tests pass in module-registry.spec.ts; 15-entry `NON_MODULE_NAMESPACES` pin in administering-module-exists.spec.ts passes (45 total tests, all pass).
- [x] `tsc --noEmit` exit 0 and the touched specs pass by path. — tsc: zero errors; all referenced specs pass.
- [x] Billing is **not** added to `MODULE_CATALOG` or `ACCESS_MANAGED_MODULES`. Platform billing is never delegated. — `billing.planGated = false` so not in `planGatedModuleIds()` → not in MODULE_CATALOG; `billing.ladder = "platform-admin"` so not in `delegableModuleIds()` → not in ACCESS_MANAGED_MODULES; module-registry.spec.ts:66-70 pins both.
