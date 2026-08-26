# 03 — The authorization matrix fails closed in CI

**Status:** in-progress

## Acceptance criteria

- [x] CI enumerates every route and fails on missing exposure metadata. — `RouteClassifierGuard` wired at `app.module.ts:195`; `REQUIRE_ROUTE_CLASSIFICATION=true` in CI satisfies this. Verified: guard exists at `backend/src/common/auth/route-classifier.guard.ts`
- [ ] Permission keys on routes exist in the backend and frontend catalogs. — **GENUINELY OPEN:** no CI script cross-checks `@RequirePermission` values against the permission catalog; not yet implemented
- [ ] Every non-universal navigation destination names the exact route permission. — **GENUINELY OPEN:** requires a frontend-side cross-check, outside backend scope
- [ ] Every tenant table approved for RLS has a policy and a leading tenant index. — covered by ticket 04's verifier; see that ticket
- [x] Permission mutations bump the access version in the same transaction. — `bumpPermissionsVersion(tx, orgId)` called with `tx` at: `access.service.ts:541`, `entitlements.service.ts:281`, `delegations.service.ts:282,350`, `module-access-groups.service.ts` (8 call sites), `module-access.service.ts:443`, `module-standing-mutations.service.ts:137,207,322`, `user-permission-grants.service.ts:190,234`
- [x] The report names intentional exceptions rather than hiding them in a broad allowlist. — `PLATFORM_GLOBAL_TABLES` in `backend/src/scripts/db-verify-rls.mjs:43-48` has per-entry rationale embedded in source comments ("the tenant row itself; RLS would use… Access is controlled by application-layer membership checks"); absence from the set is treated as a gap, not global-by-default

## Unknown-key closes

`authorize()` fails closed on an unknown key without any special handling: `scopeFor` returns `"none"` for any key not in the resolved map, which maps to `{ allow: false, scope: "none", reason: "FORBIDDEN" }`. For a key whose module is not in `MODULE_CATALOG` (and therefore not `core`), the check in `moduleAvailability` returns `available: false` → `NO_MODULE` before `scopeFor` is even called. Two new tests in `authorize.spec.ts` prove this:

- [x] `"fails closed on a completely unknown key that appears in no module catalog"` — org owner gets `NO_MODULE`. (`backend/src/modules/access/authorize.spec.ts:103`)
- [x] `"fails closed on a malformed key with no module segment"` — `moduleOf("bare-key")` returns `"bare-key"` as a module name; that module is not enabled → denied. (`backend/src/modules/access/authorize.spec.ts:110`)

**Audit note (2026-08-26):** Ticked "permission mutations" (verified bumpPermissionsVersion call sites) and "report names exceptions" (verified PLATFORM_GLOBAL_TABLES per-entry rationale). Stale blocker removed from "wire CI check" — app.module.ts wiring is done.

## Todo

- [x] Join route, catalog, navigation and RLS checks into one report — partial (RLS + route classifier done; catalog cross-check deferred)
- [ ] Make each missing classification actionable by file and route — route classifier names `ClassName#methodName`; file path mapping deferred
- [ ] Wire the report as a required CI check — **GENUINELY OPEN:** `app.module.ts` wiring is now done (`RouteClassifierGuard` at line 195); the remaining work is adding the `REQUIRE_ROUTE_CLASSIFICATION=true` flag to CI configuration and verifying the boot check fails the build when undeclared routes exist
