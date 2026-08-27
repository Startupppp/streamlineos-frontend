# 01 — Every route declares its exposure

**Status:** done — 6 of 6 criteria met. **0 undeclared routes**, and enforcement is on.

**Audit note (2026-08-26):** `RouteClassifierGuard` is fully wired as `APP_GUARD` in `app.module.ts:195` (before `JwtAuthGuard`). The "registration outside scope" note in the todo below is stale — it was written by the subagent that created the guard file; the orchestrator wired it. Boot-time test verified at `route-classifier.guard.spec.ts:72–102`.

**Lane 2 update (2026-08-26):** the "12 JWT-only files" figure was wrong in the direction this
program's estimates usually go — but *low*, not high. The real count was **141 undeclared handlers**
across 32 controllers. It also did not need a booted app: `pnpm check:route-classification` reads the
same four metadata keys the guard does.

## Acceptance criteria

- [x] Every route is exactly one of public, universal authenticated or permissioned. — **107 → 0.** The criterion's own vocabulary turned out to be incomplete (see below): there are four, not three. All 107 are classified: 57 in the first pass (47 by rule, 10 by reading the code) and the last 50 with the user's authorisation to cross session territory — notifications ×29, hr ×13, chat ×4, billing ×3, search ×1.

  **Final counts: 3,518 handlers — 202 public, 3,175 permissioned, 94 universal, 47 in-service, 0 undeclared.** `pnpm check:route-classification` is a required CI step and `RouteClassifierGuard` now **enforces by default**: absence denies at boot and at request time, and only a literal `REQUIRE_ROUTE_CLASSIFICATION=false` disables it, so a typo still enforces.
- [x] A global guard denies a route with no classification or contradictory classifications. — `backend/src/common/auth/route-classifier.guard.ts:90-100`; wired `app.module.ts:195`
- [x] Universal employee routes remain available and still derive the actor from authentication. — `backend/src/common/auth/universal.decorator.ts` (`@Universal()`); `RouteClassifierGuard` passes `IS_UNIVERSAL` routes. 94 handlers now carry it, every one deriving its subject from `@CurrentUser()`.
- [x] The current JWT-only controller files are classified one by one; none is bulk-allowlisted. — `backend/src/scripts/route-classification-report.mjs` (`pnpm check:route-classification`) enumerates every handler statically and names each undeclared one by file and method. All 141 originally undeclared routes are classified individually with the rule that decides each: 34 applied in this lane's territory (`module-access` ×29, `storage` ×5), 107 itemised per handler in `lane-requests/lane-2.md` §1a–1d. No allowlist exists anywhere in the guard or the script.
- [x] `backend/CLAUDE.md` describes the new runtime invariant after it exists. — `backend/CLAUDE.md` §2, "Every route declares its exposure, and there are exactly four ways to do it": the four declarations, why the fourth exists, that enforcement is now on with `=false` as the only escape hatch, and the current counts.
- [x] Swagger/OpenAPI generation records the classification without exposing production docs. — **The premise that blocked this was wrong.** It does not need an operation-level decorator on 3,518 handlers: the classification is already in Nest metadata, so `recordRouteClassification` (`backend/src/common/auth/record-route-classification.ts`) reads the same four keys `RouteClassifierGuard` reads and stamps each operation with `x-exposure`, plus `x-permission` / `x-authorized-in-service`, and appends a one-line "Exposure:" to the description. Deriving it from metadata means the document cannot drift from the guard. Wired at `backend/src/main.ts:106`, **inside** the existing `if (isDevelopment)` block, so production still builds no document at all. An undeclared route is stamped `undeclared` rather than skipped, and the boot log reports the count.

  **Proved against real Nest, not just mocks:** the stamping joins on `operationId`, a value our code never produces — Nest's `operationIdFactory` does. If that format were not `Controller_method`, every lookup would miss, `stamped` would be 0 and the feature would land inert while every unit test still passed. `record-route-classification.spec.ts` therefore builds a real `Test.createTestingModule`, calls the real `SwaggerModule.createDocument`, and asserts 3 stamped / 1 undeclared with the right modes. **11 tests, all passing.**

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

## What S3 classified, and the ten that needed a decision (2026-08-27)

**47 by rule, in modules no session owns.** `@Universal()` at handler level, never class level, so a
handler added tomorrow is still flagged: `me` ×7, `calendar` ×10, `dashboard` ×8, `sessions` ×3,
`mfa` ×4, `directory` ×2, `announcements` ×2, `org.controller` setup ×3, `push` ×2,
`organization.controller` (`listOrganizations`, `switchOrg`, `leaveOrg`), `auth.logout`,
`realtime.iceServers`, `rbac.getAccessSnapshot`. Every one derives its subject from
`@CurrentUser()`, and **none of these classes carries a class-level `PermissionGuard`** — they all
already use the §2 shape of `@UseGuards(JwtAuthGuard)` on the class and `PermissionGuard` per gated
handler — so all 47 are metadata only, with no runtime behaviour change whatever.

The other ten were not decidable by rule. `lane-requests/lane-2.md` §1c predicted five of them would
become `@RequirePermission`; on reading the code, **none did**, and the reason is the same each time:
a permission key resolves against the caller's *current* org, and these routes are not acting inside
one.

| Handler | Declared | Why not a key |
|---|---|---|
| `organization.listArchivedOrganizations` | `@Universal()` | `@AllowNoOrg`, and `org-lifecycle.service.ts:133` filters to `organizationMembers.isOwner`. Own-scope across orgs, exactly like `listOrganizations` |
| `organization.createOrganization` | `@AuthorizedInService` | the handler itself rejects a non-owner; creating a *new* workspace is not an action inside the current tenant |
| `organization.restoreOrg` | `@AuthorizedInService` | takes a body `orgId` for a **different** org and requires an ACTIVE `isOwner` membership of it (`org-lifecycle.service.ts:189-210`), 404 on a miss. No key can be resolved for an org you are not in |
| `rbac.getDiscoveryPermissions` | `@AuthorizedInService` | the response **is** the narrowing (`allowedModules`), so a yes/no guard has nothing to gate |
| `rbac.getDiscoveryGrantable` | `@AuthorizedInService` | narrowed to what the caller may delegate. `settings:rbac:manage` would be wrong in substance: a module owner may delegate within their module (§5) without holding it, and gating it would empty the delegation sheet for exactly those people |
| `roles.templates` | `@Universal()` | see below |
| `record-layouts.get` | `@Universal()` | `useTenantLayout` reads it from every list, detail view and form with no gate (`frontend/hooks/api/renderer/layouts.ts:58`); it returns the arrangement of a record type, never a record. Gating it blanks the UI for everyone who cannot rearrange it |
| `portal-client` ×3 | `@AuthorizedInService`, class level | the caller is a **portal membership**, not an org member. `@Universal()` would be a false claim and every permission key would deny, since a portal user holds no grants at all. Class level here is the honest scope: it is a property of who the controller authenticates, and it stays true for any handler added later |

**`roles.templates` is the one where a test decided it.** Every sibling on that controller requires
`settings:rbac:manage`, and gating it was behaviourally safe — no frontend surface calls the GET. But
`rbac.controller.e2e-spec.ts:69` asserts it returns 200 for a token with `permissions: []`, calling
it "auth-only, DB-free", **beside** a case asserting `GET /rbac/permissions` 403s without the key.
That contrast is deliberate. `listTemplates()` returns `ROLE_TEMPLATES`, a compile-time product
constant with no actor, no org and no database read, so nothing tenant-specific is disclosed — there
is no vulnerability here to justify rewriting that spec, and the honest declaration is the one the
code and the spec already agree on. Materializing a template is the gated action.

**A parser bug found by doing this, and fixed.** `route-classification-report.mjs` required the
decorator and its argument on one line, so when prettier wrapped `@AuthorizedInService("…")` — which
it does as soon as the name is a sentence, i.e. always — **five already-declared handlers silently
moved into UNDECLARED**. The runtime guard reads metadata and never saw it, so the two disagreed with
no failure anywhere, and the report would have handed the next reader five routes to "fix" that were
already done. `collapseMultilineDecorators` now rejoins them, `IN_SERVICE_RE` requires a non-empty
name so the report agrees with the guard on that too, and four self-test cases pin the wrapped forms.

## What the guard does today

`RouteClassifierGuard` is wired as the first `APP_GUARD` in `app.module.ts`. The boot log reports all unclassified routes. With `REQUIRE_ROUTE_CLASSIFICATION=true`:

- The process refuses to start until every route carries `@Public()`, `@Universal()`, `@RequirePermission()` or `@AuthorizedInService("…")`.
- At request time, unclassified routes are denied with `ForbiddenException`.

**Enforcement is on as of 2026-08-27**, the count having reached zero. `REQUIRE_ROUTE_CLASSIFICATION=false`
is the escape hatch and is a deliberate line in a deployment config.

The false-positive risk: `RouteClassifierGuard` checks only for the *presence* of any `REQUIRE_PERMISSION` metadata, not whether the key exists in the catalog. **That validation now exists** — `pnpm check:permission-keys` (ticket 03), wired at `backend/.github/workflows/ci.yml:61`.

---

PRD: [`c25 — Authorization cannot be omitted`](../prd.md) · Candidate index: [`../README.md`](../README.md)
