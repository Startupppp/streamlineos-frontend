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
**Status:** DONE — all four self-tests pass. The fourth was failing on a real product bug, not a harness fault.

> **Delivered unrun.** The implementing pass reported `tsc` exit 0 and stopped. Running it found three things `tsc` could not:
> 1. **It OOMed.** Booting the real `AppModule` inside jest exhausts the default 4 GB heap. It needs `NODE_OPTIONS=--max-old-space-size=8192`, the same as this repo's `tsc`. Until that is in the script, the harness does not run at all.
> 2. **Seeding violated `fk_organizations_owner_membership`.** The builder inserted the org with `ownerMembershipId: 0` across separate autocommit statements. That FK is `DEFERRABLE INITIALLY DEFERRED`, which only helps *inside a transaction* — so it was checked at the org insert's own commit. Fixed by mirroring signup: pre-allocate the membership id from the sequence and land org + owner + members in one transaction.
> 3. **The RLS assertion could never pass.** Drizzle wraps the driver error, so `42501` rides on `.cause`, not the top level. It asserted on the wrapper.
>
> **Now passing (3):** cross-org resource returns **404 not 403**; a direct query with no tenant GUC is refused with `42501`; the app connection has `rolbypassrls = false`.
>
> **Resolved — and it was a product bug.** `safeAccessTableRead` was not the cause. The harness was right and the code was wrong.
>
> The evidence came from instrumenting every boundary rather than reasoning about it. The tell: the *other* self-test passes while granting the same key, and it grants at **build** time; the failing one granted **after** a request had already resolved permissions. Tracing the version across the grant showed it: `dbVersion=[]` and `svcVersion=1` before, then after the grant `dbVersion=[{"permissions_version":1}]` and `svcVersion=1` — **the bump did not move the version**.
>
> `bumpPermissionsVersion` inserted a fresh row with the column default of `1`, and a reader with no row also sees `1`. Its `onConflictDoUpdate` increments only on conflict, so the **first bump for an organisation was a no-op**. Every version-keyed cache entry stayed reachable, and the design deliberately does not scan Redis — `access.service.ts` says so in as many words: "A bump makes every previous generation unreachable, so scanning Redis to delete it is both redundant and expensive." That is only true if the version actually moves.
>
> Fixed in `access-invalidate.ts`: a first bump lands at `2`, above the no-row baseline. Pinned by three tests in `access-invalidate.spec.ts` covering first bump, later bumps and monotonicity.
>
> **Production exposure is narrower than it sounds, and worth stating honestly.** Signup seeds system roles, which bumps during org setup — so the row usually exists before anyone resolves permissions, and later bumps increment correctly. All 8 orgs in the development database have a row, at versions 4 to 65. The window is an organisation with **no** row whose permissions are resolved before its first-ever access mutation: fixtures, imports, direct creation, and this harness. The invariant the whole cache design rests on was still false, which is the reason to fix it.

- [ ] `createE2eApp` is **not modified, deprecated or wrapped.** Its 119 consumers are not rewritten.
- [ ] The seeded harness overrides nothing in the access path. `AccessService`, `EntitlementsService` and `MembershipStateService` are the real implementations.
- [ ] A spec changes what a person may do by changing seeded grants, never by overriding a provider.
- [ ] The request under test runs through the real tenant transaction path, so row-level policies are genuinely in force.
- [ ] **The request runs as the application role, not the owning role.** The owner has `BYPASSRLS`, so a spec run as the owner cannot observe a policy failure. Seeding may run as the owner; the request may not.
- [ ] A fixture builder declares an organisation, people, standings, grants, projects and plan tier, and returns identifiers. Not a large shared fixture file — that becomes a coupling every spec inherits.
- [ ] Each seeded spec gets its own organisation, torn down after it runs, so specs run in any order.
- [ ] The builder asserts the rows it created exist before the spec proceeds. **An empty result is not a passing denial** — this is the most likely way the harness silently rots.
- [ ] A separate command and a separate config, so the fast suite stays fast.
- [ ] A CI job bootstraps its own database, in the same shape as the existing `txn-ceiling` and `build-read-ceiling` jobs.
- [ ] **The harness proves it can fail, before any stream uses it.** Four self-tests:
  - [ ] Seed a person without a permission → refused. Seed the permission → allowed. A harness that cannot produce both outcomes is not a harness.
  - [ ] Seed two organisations; request organisation B's identifier as A's member → **not-found, never forbidden**.
  - [ ] Clear the tenant context deliberately → the request fails rather than returning the row.
  - [ ] Assert the connection is not running as a `BYPASSRLS` role.
- [ ] A failing spec reports which organisation and person it used, so the failure is reproducible.
- [ ] The seeded suite has a bounded runtime and the number is recorded.
- [ ] Spec names or their first line say which harness they use, so a reviewer can see whether the claim matches the tool.
- [ ] Run with a clean environment. A phase-four run passed only because `ENCRYPTION_KEY` was set on its command line; without it four specs failed. Setting a variable to make a run pass and reporting that run is the mistake.
- [ ] `tsc --noEmit` exit 0.
- [ ] **Not a merge gate on day one.** Prove it is stable first.

**If this is not taken,** every dependent stream must say plainly which claims rest on mocked tests and which are unproven until the app is booted — and **no stream may tick a "verified by running the app" criterion on the strength of the stubbed harness.**
