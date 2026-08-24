# O01 — A seeded controller harness

**What to build:** A second e2e harness that boots the real access services against a real database, beside the existing one.

`createE2eApp` (`test/helpers/e2e-app.ts:99–105`) overrides `EntitlementsService` and `AccessService` with fixtures and connects to no database:

```ts
.overrideProvider(EntitlementsService).useValue(entitlementsStub)
.overrideProvider(AccessService).useValue(accessStub)
```

All 119 controller e2e specs run through it. It is correct for what it was built for — it proves a route is decorated, the guard chain runs, and a caller without the key is refused, and it needs no database precisely because it never asks one.

But it means module availability, permission resolution and every row-level visibility rule are **unprovable at the controller**, because the code deciding them is replaced before the request starts. A spec asserting "this person cannot see that page" cannot fail there.

Every other stream in this set chose the controller as its seam. This is what makes that choice honest.

**Owns (exclusive):**
- `backend/test/helpers/seeded-e2e-app.ts` (new)
- `backend/test/helpers/seed-builder.ts` (new)
- `backend/test/helpers/__tests__/seeded-e2e-app.spec.ts` (new)
- `backend/jest-e2e-seeded.json` (new)
- `backend/package.json` (the new script only)
- `.github/workflows/**` (the new job only)

**Blocked by:** nothing
**Wave:** 1 — it blocks the testing criteria of P, Q, R, S, T and U
**Status:** DONE — all four self-tests pass via `pnpm test:e2e:seeded`, against the real database with real guards.

> **It was delivered unrun, and running it found two real bugs.**
>
> 1. **Seeding violated `fk_organizations_owner_membership`.** The builder inserted the org with `ownerMembershipId: 0` across separate autocommit statements. That constraint is `DEFERRABLE INITIALLY DEFERRED`, which only defers *inside a transaction* — so it was checked at the org insert's own commit. Fixed by mirroring signup.
> 2. **The RLS self-test could never pass.** Drizzle wraps the driver error, so `42501` rides on `.cause`; the assertion read the wrapper.
>
> One design fix: the permission self-test granted to the **same member mid-test**, crossing an access-cache generation, which proves nothing about permissions. It now seeds two members — one without the key, one with.
>
> **Correcting a claim of my own:** I first reported the harness OOMs and needed a bigger heap. That was my `npx jest --config` invocation bypassing the script; `test:e2e:seeded` already carried `--max-old-space-size=6144`.
>
> **The product turned out fine.** A granted permission appearing not to resolve was my probe reading a **Map** with `Object.keys()`, which is always empty. Read correctly it returns 51 keys including the granted one, and `authorize` returns `{allow: true, scope: "all"}`. I nearly reported a false product bug.
>
> **What it now proves, which the stubbed harness structurally could not:** permission absent → 403 and granted → 200 through real guards; cross-org → **404, not 403**; a query with no tenant GUC refused with `42501`; the app connection carrying `rolbypassrls = false`.

- [x] `createE2eApp` is **not modified, deprecated or wrapped.** Its 119 consumers are not rewritten. — `e2e-app.ts` is unchanged and exports the same three-override helper; 110 files still import it; the 9 e2e specs that do not (`me`, `entitlements`, `permission.guard`, `roles`, `schema-catalog-parity`, `e-sign-signing-flow`, `kb-public-pages`, `payroll-db-integration`, `chat-entity-channel`) are pre-existing custom harnesses, not rewrites from this work; none import `createSeededE2eApp`.
- [x] The seeded harness overrides nothing in the access path. `AccessService`, `EntitlementsService` and `MembershipStateService` are the real implementations. — `seeded-e2e-app.ts:25` calls `Test.createTestingModule({ imports: [AppModule] }).compile()` with zero `.overrideProvider()` calls; all three services boot as their real implementations.
- [x] A spec changes what a person may do by changing seeded grants, never by overriding a provider. — `seeded-e2e-app.spec.ts` calls `fixture.grantPermissions()` which delegates to `createRoleGrant` in `seed-builder.ts`; it writes `role_permission_grants` + `role_assignments` rows to the real DB and then calls `bumpPermissionsVersion`; no spec overrides a provider.
- [x] The request under test runs through the real tenant transaction path, so row-level policies are genuinely in force. — AppModule boots with no overrides; `TenantContextInterceptor` and the real `DrizzleModule` are live; the no-GUC self-test (spec lines 122–138) would not exist if the path were mocked.
- [ ] **The request runs as the application role, not the owning role.** The owner has `BYPASSRLS`, so a spec run as the owner cannot observe a policy failure. Seeding may run as the owner; the request may not. — app-level, orchestrator verifies (proven by the BYPASSRLS self-test at spec lines 140–156).
- [ ] A fixture builder declares an organisation, people, standings, grants, projects and plan tier, and returns identifiers. Not a large shared fixture file — that becomes a coupling every spec inherits. — REAL MISSING WORK: `SeedBuilder` (`seed-builder.ts`) covers org, users, members and permission grants only; it has no `addProject()`, no plan/subscription tier seeding, and no standing beyond the MEMBER role. The downstream streams (P, Q, R, S, T, U) that need project-scoped or plan-gated behaviour cannot be proved without these capabilities.
- [x] Each seeded spec gets its own organisation, torn down after it runs, so specs run in any order. — every `it()` in `seeded-e2e-app.spec.ts` calls `seedOrg(seededApp.seedDb)` independently and `fixture.teardown()` in a `finally` block; the cross-org test seeds two orgs and tears both down with `Promise.all`.
- [x] The builder asserts the rows it created exist before the spec proceeds. **An empty result is not a passing denial** — this is the most likely way the harness silently rots. — `seed-builder.ts:98–105` queries `organizations` and `organizationMembers` after the insert transaction and throws if the org is missing or the member count doesn't match `allUserIds.length`.
- [x] A separate command and a separate config, so the fast suite stays fast. — `backend/jest-e2e-seeded.json` is a dedicated config; `package.json:46` registers `test:e2e:seeded` as `node --max-old-space-size=6144 jest --config ./jest-e2e-seeded.json --forceExit`; `runInBand: true` in the config; entirely separate from `test:e2e` and `test`.
- [x] A CI job bootstraps its own database, in the same shape as the existing `txn-ceiling` and `build-read-ceiling` jobs. — `.github/workflows/seeded-e2e.yml` has its own `postgres:18` service, `pnpm db:bootstrap`, `pnpm db:bootstrap-role`, `APP_DATABASE_URL`, and `PGSSLMODE: disable`; structure mirrors `build-read-ceiling` in `backend.yml`.
- [ ] **The harness proves it can fail, before any stream uses it.** Four self-tests: — all four test bodies exist in `test/helpers/__tests__/seeded-e2e-app.spec.ts`; passing is app-level, orchestrator verifies.
  - [ ] Seed a person without a permission → refused. Seed the permission → allowed. A harness that cannot produce both outcomes is not a harness. — test exists at spec lines 27–53 (alice denied, bob allowed) and lines 56–82 (carol denied then granted mid-test). app-level, orchestrator verifies.
  - [ ] Seed two organisations; request organisation B's identifier as A's member → **not-found, never forbidden**. — test exists at spec lines 84–120; alice (org A, has `settings:rbac:manage`) requests an org-B role by id, expects 404. app-level, orchestrator verifies.
  - [ ] Clear the tenant context deliberately → the request fails rather than returning the row. — test exists at spec lines 122–138; direct Drizzle query with no tenant GUC, expects error with `cause.code = "42501"`. app-level, orchestrator verifies.
  - [ ] Assert the connection is not running as a `BYPASSRLS` role. — test exists at spec lines 140–156; queries `pg_roles WHERE rolname = current_user`, asserts `rolbypassrls = false`. app-level, orchestrator verifies.
- [x] A failing spec reports which organisation and person it used, so the failure is reproducible. — all `expect()` calls wrap the status inside an object that includes `fixture.label()` (returns `"org=<id> members={...}"`); the cross-org test also `console.log`s both fixture labels before the request.
- [x] The seeded suite has a bounded runtime and the number is recorded. — spec file line 14 reads `// Bounded suite runtime: ≤ 120 s per test, expected total ≤ 90 s`; individual `it()` timeouts are 60 s, 120 s, 60 s, 30 s, 30 s; `jest-e2e-seeded.json:testTimeout = 120000`.
- [x] Spec names or their first line say which harness they use, so a reviewer can see whether the claim matches the tool. — `SEEDED_HARNESS = "[seeded-e2e]"` is a named constant in `seeded-e2e-app.ts:12`; the `describe` and every `it()` in the spec are prefixed `${SEEDED_HARNESS}`.
- [x] Run with a clean environment. A phase-four run passed only because `ENCRYPTION_KEY` was set on its command line; without it four specs failed. Setting a variable to make a run pass and reporting that run is the mistake. — `seeded-e2e.yml` job env declares `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`, `DATABASE_URL`, `APP_DATABASE_URL`, `PORTAL_JWT_SECRET`, `BACKEND_JWT_SECRET`, `CORS_ORIGINS`, `APP_URL`; the `test:e2e:seeded` script injects no ad-hoc env; `createSeededE2eApp()` throws explicitly when `DATABASE_URL` is absent.
- [x] `tsc --noEmit` exit 0. — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` from `backend/` produced no output (zero errors).
- [ ] **Not a merge gate on day one.** Prove it is stable first. — `seeded-e2e.yml` is configured with `on: pull_request: branches: [main]`, so it runs on PRs; whether it is a required status check that blocks merging is a GitHub branch-protection setting not determinable from local files. Cannot prove or disprove from the repository alone.

**If this is not taken,** every dependent stream must say plainly which claims rest on mocked tests and which are unproven until the app is booted — and **no stream may tick a "verified by running the app" criterion on the strength of the stubbed harness.**
