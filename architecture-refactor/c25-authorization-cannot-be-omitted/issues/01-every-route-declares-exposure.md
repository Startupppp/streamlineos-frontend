# 01 — Every route declares its exposure

**Status:** in-progress — 4 of 6 criteria met; the remaining 2 are blocked on other lanes (see `lane-requests/lane-2.md` §1)

**Audit note (2026-08-26):** `RouteClassifierGuard` is fully wired as `APP_GUARD` in `app.module.ts:195` (before `JwtAuthGuard`). The "registration outside scope" note in the todo below is stale — it was written by the subagent that created the guard file; the orchestrator wired it. Boot-time test verified at `route-classifier.guard.spec.ts:72–102`.

**Lane 2 update (2026-08-26):** the "12 JWT-only files" figure was wrong in the direction this
program's estimates usually go — but *low*, not high. The real count was **141 undeclared handlers**
across 32 controllers. It also did not need a booted app: `pnpm check:route-classification` reads the
same four metadata keys the guard does. Two criteria remain open, both blocked on other lanes
applying the classifications in `lane-requests/lane-2.md` §1.

## Acceptance criteria

- [ ] Every route is exactly one of public, universal authenticated or permissioned. — **OPEN, and the criterion's own vocabulary turned out to be incomplete (see below): there are four, not three.** 3,508 handlers: 202 public, 3,165 permissioned, 33 in-service, 1 universal, **107 undeclared**. The 107 are all in other lanes' modules, classified with their governing rule in [`lane-requests/lane-2.md`](../../lane-requests/lane-2.md) §1 rather than bulk-allowlisted. **BLOCKED on those lanes applying them.**
- [x] A global guard denies a route with no classification or contradictory classifications. — `backend/src/common/auth/route-classifier.guard.ts:90-100`; wired `app.module.ts:195`
- [x] Universal employee routes remain available and still derive the actor from authentication. — `backend/src/common/auth/universal.decorator.ts` (`@Universal()`); `RouteClassifierGuard` passes `IS_UNIVERSAL` routes. Enforcement stays off precisely so these keep working until the 107 are classified.
- [x] The current JWT-only controller files are classified one by one; none is bulk-allowlisted. — `backend/src/scripts/route-classification-report.mjs` (`pnpm check:route-classification`) enumerates every handler statically and names each undeclared one by file and method. All 141 originally undeclared routes are classified individually with the rule that decides each: 34 applied in this lane's territory (`module-access` ×29, `storage` ×5), 107 itemised per handler in `lane-requests/lane-2.md` §1a–1d. No allowlist exists anywhere in the guard or the script.
- [x] `backend/CLAUDE.md` describes the new runtime invariant after it exists. — `backend/CLAUDE.md` §2, "Every route declares its exposure, and there are exactly four ways to do it": the four declarations, why the fourth exists, the opt-in enforcement flag, and the current counts.
- [ ] Swagger/OpenAPI generation records the classification without exposing production docs. — **half done.** Production exposure is already prevented: `backend/src/main.ts:96` gates the whole `SwaggerModule` block behind `if (isDevelopment)`. Recording the classification **in** the generated document is not built, and is deliberately left: it would need an operation-level decorator applied across 3,508 handlers, which is worth doing only once the 107 above are classified and the shape is stable. **BLOCKED on the same 107.**

## The vocabulary was three-way and the codebase is four-way

Classifying the 141 found 29 `module-access` routes that **are** authorized — by
`assertModuleAccessPolicy`, which resolves module management *standing*. Standing is not expressible
as a permission key, and `backend/CLAUDE.md` §5 is explicit that a custom or delegated
`<module>:access:manage` grant is **view-only and never creates management authority**. So both
available answers were wrong: `@RequirePermission` would advertise a second, weaker way into an
administration surface, and `@Universal()` would claim that surface is platform core.

`@AuthorizedInService("<what checks it>")`
(`backend/src/common/auth/authorized-in-service.decorator.ts`) is the fourth declaration. The
argument is required and is the point — it declares *where* the check lives so a reviewer can follow
the name to it, and an empty name is not a declaration (`route-classifier.guard.spec.ts`, "denies
@AuthorizedInService with an empty name").

## Todo

- [x] Add explicit universal metadata — `backend/src/common/auth/universal.decorator.ts` (`IS_UNIVERSAL`, `@Universal()`)
- [x] Register the classifier globally — `backend/src/common/auth/route-classifier.guard.ts` (`RouteClassifierGuard`) created and wired at `backend/src/app.module.ts:195` (before `JwtAuthGuard`; `DiscoveryModule` imported at `app.module.ts:105`)
- [x] Classify current routes with evidence — `pnpm check:route-classification`, reproducible on demand and wired to a package script. The earlier note said this needed a booted app; it does not — the static report agrees with the guard because both read the same four metadata keys, and the script's `--self-test` pins the parser.
- [x] Add the boot-time denial test — `backend/src/common/auth/route-classifier.guard.spec.ts:72-102`, plus two new cases for the fourth declaration.

**Validation (Lane 2, 2026-08-26):** `tsc --noEmit` clean. `npx jest src/common/auth
src/modules/module-access src/modules/storage` → **16 suites, 203 tests passed**.
`pnpm check:route-classification:self-test` → pass.

## What the guard does today

`RouteClassifierGuard` is wired as the first `APP_GUARD` in `app.module.ts`. The boot log reports all unclassified routes. With `REQUIRE_ROUTE_CLASSIFICATION=true`:

- The process refuses to start until every route carries `@Public()`, `@Universal()`, `@RequirePermission()` or `@AuthorizedInService("…")`.
- At request time, unclassified routes are denied with `ForbiddenException`.

**Do not turn it on yet.** 107 routes are still undeclared and the largest group is platform core —
`/me/*`, calendar, notifications, dashboard, sessions, logout. Enforcing today 403s exactly the
surfaces root §8 promises every member.

The false-positive risk: `RouteClassifierGuard` checks only for the *presence* of any `REQUIRE_PERMISSION` metadata, not whether the key exists in the catalog. **That validation now exists** — `pnpm check:permission-keys` (ticket 03), wired at `backend/.github/workflows/ci.yml:61`.

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)
