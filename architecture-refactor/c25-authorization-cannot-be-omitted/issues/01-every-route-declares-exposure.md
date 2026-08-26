# 01 — Every route declares its exposure

**Status:** in-progress

## Acceptance criteria

- [ ] Every route is exactly one of public, universal authenticated or permissioned.
- [x] A global guard denies a route with no classification or contradictory classifications.
- [x] Universal employee routes remain available and still derive the actor from authentication.
- [ ] The 12 current JWT-only controller files are classified one by one; none is bulk-allowlisted. (Blocked: classifying the controllers requires edits to files outside scope `backend/src/common/**` and `backend/src/modules/access/**`; each controller file needs exactly one of `@Public()`, `@Universal()`, or `@RequirePermission()` at class or handler level — that is a separate fan-out over all controller files.)
- [ ] `backend/CLAUDE.md` describes the new runtime invariant after it exists. (Blocked: `backend/CLAUDE.md` is not in this agent's scope.)
- [ ] Swagger/OpenAPI generation records the classification without exposing production docs.

## Todo

- [x] Add explicit universal metadata — `backend/src/common/auth/universal.decorator.ts` (`IS_UNIVERSAL`, `@Universal()`)
- [x] Register the classifier globally — `backend/src/common/auth/route-classifier.guard.ts` (`RouteClassifierGuard`) created; **registration in `app.module.ts` is outside scope** — the wiring line is:
  ```ts
  { provide: APP_GUARD, useClass: RouteClassifierGuard },
  ```
  in the `providers` array of `AppModule`, BEFORE `JwtAuthGuard`. `DiscoveryModule` must also be imported there.
- [ ] Classify current routes with evidence — fan-out task over all controller files
- [ ] Add the boot-time denial test — `RouteClassifierGuard.onApplicationBootstrap` throws when `REQUIRE_ROUTE_CLASSIFICATION=true`; a unit test for this is needed in `route-classifier.guard.spec.ts`

## What breaks on the next deploy

`RouteClassifierGuard` is not yet wired as `APP_GUARD` (that requires `app.module.ts` which is outside this agent's scope). Until wired, the guard has no effect. Once wired:

- Every route that lacks `@Public()`, `@Universal()`, or `@RequirePermission()` at the handler **or** class level will be denied with 403 at the first request.
- The boot log will list all such routes at startup.
- With `REQUIRE_ROUTE_CLASSIFICATION=true`, the process will refuse to start until every route is classified.

The false-positive risk: `ModuleGuard` reads a generated `:access:` key of the form `module:access:view`. `RouteClassifierGuard` does not inspect key content — it only checks for the *presence* of any `REQUIRE_PERMISSION` metadata. A route with `@RequirePermission("build:workspaces:members:manage")` passes the classifier regardless of whether that key exists in the catalog. That validation is ticket 03's job.

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)
