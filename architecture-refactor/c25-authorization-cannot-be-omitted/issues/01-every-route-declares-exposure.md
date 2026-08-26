# 01 — Every route declares its exposure

**Status:** in-progress

**Audit note (2026-08-26):** `RouteClassifierGuard` is fully wired as `APP_GUARD` in `app.module.ts:195` (before `JwtAuthGuard`). The "registration outside scope" note in the todo below is stale — it was written by the subagent that created the guard file; the orchestrator wired it. Boot-time test verified at `route-classifier.guard.spec.ts:72–102`. Three criteria remain genuinely open. The "12 JWT-only files" claim cannot be verified without booting the app; the RouteClassifierGuard `undeclared` set at boot is the authoritative count.

## Acceptance criteria

- [ ] Every route is exactly one of public, universal authenticated or permissioned.
- [x] A global guard denies a route with no classification or contradictory classifications. — `backend/src/common/auth/route-classifier.guard.ts:86-96`; wired `app.module.ts:195`
- [x] Universal employee routes remain available and still derive the actor from authentication. — `backend/src/common/auth/universal.decorator.ts` (`@Universal()`); `RouteClassifierGuard` passes `IS_UNIVERSAL` routes
- [ ] The current JWT-only controller files are classified one by one; none is bulk-allowlisted. — **GENUINELY OPEN:** requires a fan-out over all controller files; the "12" count in the original description is unverifiable without booting the app — the RouteClassifierGuard `undeclared` set at startup is the authoritative list
- [ ] `backend/CLAUDE.md` describes the new runtime invariant after it exists. — **GENUINELY OPEN:** `backend/CLAUDE.md` §2 lists `JwtAuthGuard`, `MfaGuard`, `ModuleGuard` as global guards but does not yet mention `RouteClassifierGuard` or the public/universal/permissioned three-way classification as a runtime invariant
- [ ] Swagger/OpenAPI generation records the classification without exposing production docs.

## Todo

- [x] Add explicit universal metadata — `backend/src/common/auth/universal.decorator.ts` (`IS_UNIVERSAL`, `@Universal()`)
- [x] Register the classifier globally — `backend/src/common/auth/route-classifier.guard.ts` (`RouteClassifierGuard`) created and wired at `backend/src/app.module.ts:195` (before `JwtAuthGuard`; `DiscoveryModule` imported at `app.module.ts:105`)
- [ ] Classify current routes with evidence — fan-out task over all controller files; boot the app with `REQUIRE_ROUTE_CLASSIFICATION=true` to get the authoritative undeclared list
- [x] Add the boot-time denial test — `backend/src/common/auth/route-classifier.guard.spec.ts:72-102`

## What the guard does today

`RouteClassifierGuard` is wired as the first `APP_GUARD` in `app.module.ts`. The boot log reports all unclassified routes. With `REQUIRE_ROUTE_CLASSIFICATION=true`:

- The process refuses to start until every route carries `@Public()`, `@Universal()`, or `@RequirePermission()`.
- At request time, unclassified routes are denied with `ForbiddenException`.

The false-positive risk: `RouteClassifierGuard` checks only for the *presence* of any `REQUIRE_PERMISSION` metadata, not whether the key exists in the catalog. That validation is ticket 03's job.

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)
