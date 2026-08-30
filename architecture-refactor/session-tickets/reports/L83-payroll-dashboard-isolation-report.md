# L83 — Payroll & Dashboard Tenant-Isolation Spec Fixes

**Result:** 9 suites, 52 tests — all green. No real isolation holes found. All failures were broken doubles.

---

## Per-suite breakdown

### 1. `payroll-runs-tenant-isolation.spec.ts` — 11 tests ✓

**Was failing:** 4 tests.

**PayrollRunLockService.acquire (2 failures) — broken double.**
- The `makeDb` factory exposed only the SELECT builder's `where`. `acquire` is update-only; none of its orgId predicates reached `allArgs`.
- DENY test threw `ConflictException` (correct 404-by-emptiness behavior) but the spec didn't expect a throw, so the assertion line never ran.
- CONTROL test: the returning mock returned `generationLockToken: null`, so `updated[0].generationLockToken !== token` always threw.
- Fix: exposed `updateWhere` from `makeDb`; added it as an optional fourth param to `allArgs`; DENY test now uses `rejects.toThrow()` then checks `updateWhere` args; CONTROL test captures the token from `set()` via a closure mock and returns it in the row.

**RunBatchLoaderService.loadRunBatchData (2 failures) — broken double.**
- Spec passed a single object `{ orgId, runId, ... }` but the service signature is positional `(orgId, runId, month, toggles, profiles, lockedPeriodId)`. The object landed as `orgId`, leaving `profiles = undefined`, which threw on `.map()`.
- Fix: called with positional args and a non-empty `profiles` array (one EMPLOYEE entry). With `profiles = [profile]`, `loadComponentsByProfile(orgId, profileIds)` runs its `innerJoin + where` query which captures `orgId` in the SELECT builder `where` mock.

### 2. `payroll-setup-tenant-isolation.spec.ts` — 17 tests ✓

**Was failing:** 2 tests.

**PayslipTemplatesService.update / .delete — broken double.**
- Both methods do a `SELECT … WHERE (id = X AND orgId = Y) LIMIT 1` first. With an empty db, this returns nothing, so the service correctly throws `NotFoundException` (404).
- The spec expected `result = undefined` (update) or no throw (delete) — wrong expectation for correct isolation behavior.
- Fix: changed both to `rejects.toThrow()`. The SELECT `where` mock still captures `ATTACKER`; `allArgs` passes.

### 3. `payroll-insights-tenant-isolation.spec.ts` — 8 tests ✓

**Was failing:** 5 tests.

**TaxAdminService.list (2 failures) — broken double.**
- The method was renamed from `list` to `listDeclarations` in the service. `svc.list is not a function`.
- Fix: renamed call sites.

**TaxAdminService.approve / .reject (2 failures) — broken double.**
- Same pattern as PayslipTemplates: update returns `[]`, `[updated] = []` gives `undefined`, service throws 404.
- `allArgs` also didn't capture the update's where (same missing `updateWhere` issue as suite 1).
- Fix: exposed `updateWhere` from `makeDb`, added to `allArgs`, wrapped calls in `rejects.toThrow()`.

**TeamRewardsService.getTeamRewards (1 failure) — broken double.**
- Service returns `{ mode, honestyNote, reportCount, members, payCompression }`. Spec asserted `result.directReports` (undefined) and called `.toHaveLength(0)`.
- Fix: changed `result.directReports` to `result.members`.

### 4. `fnf-hr-payroll-tenant-isolation.spec.ts` — 3 tests ✓

**Was failing:** 1 test.

**FnfService.listFnf collect() — broken double.**
- The `collect` function traversed Drizzle condition AST objects recursively without a cycle guard. Drizzle's internal SQL objects have circular references (shared dialect/internals), causing infinite recursion and a stack overflow.
- Fix: added a `seen = new Set<object>()` cycle guard to `collect`.

### 5. `payout-validation-tenant-isolation.spec.ts` — 2 tests ✓

**Was failing:** 1 test (CONTROL).

**PayoutValidationService CONTROL db mock — broken double.**
- `loadRunEmployeePayees` does `select().from().leftJoin().leftJoin().leftJoin().where()`. The mock returned `{ from: fn }` → `{ where }` with no `leftJoin`.
- `efService` mock also missing `getFactsBatch`, `getSensitiveFactsBatch`, `getSensitiveFactsByPersonBatch` — all called even with empty row results.
- Fix: replaced `where`-only chain with a self-returning chain object supporting `leftJoin`, `innerJoin`, `where`, `orderBy`, `limit`; added missing `efService` methods returning empty Maps.

### 6. `onboarding-flow-new-tenant-isolation.spec.ts` — 5 tests ✓

**Was failing:** 2 tests.

**ModuleChecklistService insert returning — broken double.**
- `ensureChecklistsForModules` inserts a checklist row and immediately destructures `[checklist] = await tx.insert(...).returning()`. `makeDb([])` made the returning resolve to `[]`, so `checklist = undefined` and `checklist.id` threw.
- Fix: changed `txDb.insert().values().returning()` to resolve `[{ id: 1 }]`. The DENY tests that skip the insert (empty modules list) are unaffected; the CONTROL and the third test now proceed through the seeding loop.

### 7. `dashboard-birthdays-tenant-isolation.spec.ts` — 2 tests ✓

**Was failing:** 2 tests.

**Wrong cache method and missing `access` method — broken double.**
- `getBirthdays` calls `buildOrgDashboardCacheKey(this.access, orgId, ...)` which internally calls `access.getPermissionsVersion(orgId)`. Spec mock had only `{ holds }`.
- `getBirthdays` then calls `cache.cachedForOrg(orgId, key, fn, ttl)`. Spec mock had only `{ cached }`.
- Fix: added `getPermissionsVersion: jest.fn().mockResolvedValue(1)` to `access`; replaced `cached` with `cachedForOrg` (signature `(_orgId, _k, fn) => fn()`).

### 8. `dashboard-announcements-tenant-isolation.spec.ts` — 2 tests ✓

**Was failing:** 2 tests.

**Missing `innerJoin` in `from()` chain — broken double.**
- `getActiveAnnouncements` does `select().from(announcements).innerJoin(users, ...).where(...)`. The `from()` mock returned `{ where, leftJoin }` with no `innerJoin`.
- Fix: added `innerJoin: jest.fn().mockReturnValue(joinResult)` alongside `leftJoin`.

### 9. `dashboard-crm-tenant-isolation.spec.ts` — 2 tests ✓

**Was failing:** 2 tests.

**`db.query` undefined — broken double.**
- `getTodayActivities` uses `this.db.query.crmActivities.findMany({where: ...})`. The spec's `makeDb` only mocked `db.select` (no `query` property).
- Fix: added `query: { crmActivities: { findMany: crmFindMany } }` to the db mock where `crmFindMany` captures the `where` arg into `wheres[]` using the same `sqlValues` traversal pattern.

---

## Real isolation holes found

None. All nine services correctly scope their queries to the caller's orgId. The 404 pattern on missing records (update/delete returning empty) is correct behavior — a 403 would confirm the record exists.

---

## DENY proof (two suites)

**Suite 1 — `payroll-runs` / `PayrollRunLockService.acquire` DENY test:**
Temporarily dropped `updateWhere` from the `allArgs(where, findFirst, findMany)` call (simulating a double that doesn't track update-path where clauses). Test went red: `Expected: "org-attacker", Received array: []`. Restored.

**Suite 2 — `dashboard-announcements` DENY test:**
Temporarily removed `innerJoin` from the `from()` mock (the mechanism that routes the query through the where-capturing chain). Both tests went red: `TypeError: this.db.select(...).from(...).innerJoin is not a function`. Restored.

---

## Final counts

| Suite | Tests | Status |
|---|---|---|
| payroll-runs-tenant-isolation | 11 | PASS |
| payroll-setup-tenant-isolation | 17 | PASS |
| payroll-insights-tenant-isolation | 8 | PASS |
| fnf-hr-payroll-tenant-isolation | 3 | PASS |
| payout-validation-tenant-isolation | 2 | PASS |
| onboarding-flow-new-tenant-isolation | 5 | PASS |
| dashboard-birthdays-tenant-isolation | 2 | PASS |
| dashboard-announcements-tenant-isolation | 2 | PASS |
| dashboard-crm-tenant-isolation | 2 | PASS |
| **Total** | **52** | **all green** |

`NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck` — clean (no errors).
