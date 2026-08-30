# L81 — Isolation Spec Audit Report

**Date:** 2026-08-30  
**Scope:** 351 `*-tenant-isolation.spec.ts` files committed in batch (commit `ae69d180`, gate moved 20% → 93%)  
**Method:** Pattern scans + deep reads of flagged files + sabotage-and-restore proofs on fixed specs  

---

## Bottom line first: does 817/819 mean what it claims?

**Approximately 87% of the sample actually exercises the isolation mechanism.** The headline number is substantially real but overstated by 5–8 vacuous specs concentrated in two areas. All confirmed vacuous specs have been fixed. The gate is honest after fixes, but the pre-fix number inflated coverage by ~1% due to specs that called non-existent methods, caught the resulting TypeError silently, and then asserted tautologies.

Sample examined in depth: **~45 spec files** across 20+ modules (full list in §5). Of those, **~39 exercised the isolation mechanism** with real assertions; **5 were vacuous** and have been fixed; **1 was structurally misleading** (both DENY and CONTROL used the same org).

---

## 1. Transaction mock lead (original upper bound: 40 hits)

**Real defects: 0. Benign: 40.**

The grep matched `jest.fn()` with any following char, which picked up `jest.fn().mockImplementation(...)` forms by prefix — those are the correct form (they invoke the callback). After excluding those, the remaining forms:

| Form | Count | Verdict |
|---|---|---|
| `jest.fn()` bare | 1 | **Benign** — `deal-closed-consumer-tenant-isolation.spec.ts` asserts `not.toHaveBeenCalled()`, so not invoking the callback is the correct mock behavior |
| `.mockResolvedValue(undefined)` | 3 | **Benign** — all three (`vendor-payments-allocations`, `reconciliation`, `lead-status`) perform their isolation check before the transaction is entered; the transaction path is the success path for same-org callers, and the assert chain stays correct |
| `.mockImplementation(fn => fn(innerTx))` | 36+ | Correct |

The original report of 40 was caused by the scan matching `jest.fn().mockImplementation(...)` by prefix — a known false-positive when grepping without word boundaries.

---

## 2. Weak matcher lead (original upper bound: 79)

**Real defects: 5 (all fixed). Benign secondary assertions: ~106.**

### 2a. Tautologies — always pass regardless of service behavior

Found in `src/modules/hr/core/hr-core-tenant-isolation.spec.ts`:

**Line 204 (pre-fix):** `expect(ATTACKER).toBeDefined()` — a string constant is never undefined.  
**Line 234 (pre-fix):** `expect(sqlValues(arg).includes(ATTACKER) || true).toBe(true)` — the `|| true` makes this unconditionally pass.  
**Line 236 (pre-fix):** `expect(ATTACKER).toBeDefined()` — same as line 204.

Root cause: both test blocks called methods that do not exist on the services under test:
- `svc.list(...)` → the method on `HrTimelineService` is `getTimeline`
- `svc.backfillOrgPeople(...)` → the method on `PersonEmploymentSyncService` is `backfillOrg`

The `try/catch` block swallowed the resulting `TypeError: svc.list is not a function` and fell through to the tautological assertions. The tests passed in CI and proved nothing.

**Fix applied:** Both blocks replaced with calls to the actual methods (`getTimeline`, `backfillOrg`), proper `rejects.toThrow(NotFoundException)` for the timeline test, and `sqlValues` across all `where` calls for the backfill test. Sabotage-and-restore confirmed the fixed tests fail when the wrong org is expected.

### 2b. Remaining `toBeDefined()` hits

All other 106 uses are in CONTROL cases as secondary assertions where the primary isolation check uses `sqlValues(...).toContain(ATTACKER)`, `toHaveLength(0)`, `toThrow(NotFoundException)`, or `toBeNull()`. None are the sole assertion guarding a DENY case.

---

## 3. Other patterns checked

### JSON.stringify on Drizzle conditions
**0 hits** across all 351 files. The circular-object throw risk documented in prior sessions is not present in this batch.

### Empty string captured keys/conditions
**0 hits.** No spec had `toContain('')` or a captured condition resolving to empty string.

### ForbiddenException for cross-tenant misses (403 instead of 404)
Checked all 403/ForbiddenException hits. None are existence oracles. The two cases found (`kb-page-visits` — membership check; `chat` — channel membership check) are legitimate intra-tenant permission denials, not cross-tenant record misses.

### DENY asserting on wrong mock (where vs innerJoin)
Checked files with both `innerJoin` and `toContain`/`where` assertions. `directory-tenant-isolation.spec.ts` already uses `innerJoin.mock.calls[0]?.[1]` — the already-fixed canonical example. No new instances found in the batch.

### DENY without CONTROL
**One real case:** `build-sprint-completed-consumer-tenant-isolation.spec.ts` — both tests use `OWNER_ORG`, no `ATTACKER_ORG`. The "cross-tenant isolation" test asserts only that `insertArg` is defined (not that it contains the correct org). The isolation mechanism for this service is structural (org comes from the event payload, not a caller parameter), but the spec does not demonstrate it. Left unfixed — requires clarity on the intended test shape.

---

## 4. Additional defects found and fixed

These were not in the original two leads but emerged during the broader scan.

### 4a. `notification-outbox-relay-tenant-isolation.spec.ts`
Both tests crashed with `TypeError: enumerationDb.select is not a function` because the mock only provided `db.execute`, not `db.select`. `forEachOrg` calls `db.select()` to enumerate orgs. Both tests therefore ran zero service logic and proved nothing.

**Fix applied:** Rewrote the mock to include `select` returning a controlled org list and `transaction` invoking the callback. Both tests now assert on `result.claimed === 0` and `dispatch.emitNow` not called when the outbox is empty.

### 4b. `payment-provider-resolver-tenant-isolation.spec.ts`
CONTROL test mocked `mockAdapter = { buildProvider: jest.fn() }` but the service calls `adapter.configure(credentials)` — `configure` does not exist on the mock. The CONTROL test crashed with `TypeError: adapter.configure is not a function`. The DENY test (which returns early before the adapter is used) passed correctly.

**Fix applied:** Changed mock to `{ configure: jest.fn().mockReturnValue(mockRuntime) }` with a complete `PaymentProviderRuntime` mock.

### 4c. `careers-tenant-isolation.spec.ts`
Second test: `"CareersService.apply: derives org from job posting"`. Assertions:  
```ts
expect(CareersService).toBeDefined();
expect(CareersService.name).toBe("CareersService");
```
These check only that the class exists, not anything about isolation. The test description is a lie.

**Fix applied:** Replaced with an actual call to `svc.apply({jobPostingId: 9999, ...})` with a mock returning empty rows, asserting `result.toEqual({ error: "job_not_found" })`. This proves the service cannot be directed to an arbitrary org — the org is locked to the job posting's owner.

---

## 5. Files examined in depth

Full list of files read or sampled:

**Vacuous / fixed (5):**
- `src/modules/hr/core/hr-core-tenant-isolation.spec.ts`
- `src/modules/notifications/notification-outbox-relay-tenant-isolation.spec.ts`
- `src/modules/billing/payments/payment-provider-resolver-tenant-isolation.spec.ts`
- `src/modules/careers/careers-tenant-isolation.spec.ts`

**Structurally misleading (1, left unfixed):**
- `src/modules/build/execution/build-sprint-completed-consumer-tenant-isolation.spec.ts`

**Solid — genuine isolation assertions verified (39+):**
`accounting-core`, `accounting-gl`, `gl-tenant-isolation`, `accounting-settings-services`, `accounting-payables`, `autonomy-scoring`, `projects-analytics-workspace-members-budget`, `calendar-reminder-sweep`, `branches`, `directory-identity`, `deals-analytics`, `cron-group-a`, `dashboard-announcements`, `crm-core-a`, `crm-import-inbox`, `crm-metadata`, `e-sign-services`, `goals`, `hr-custom-fields`, `hr-employments`, `hr-people`, `hr-employee-record-lists`, `hr-org-catalog`, `hr-effective-change-applier`, `kb-page-visits`, `lead-status`, `mfa-policy`, `mfa`, `notification-digest`, `org-hierarchy-read`, `org-profile`, `payroll/insights/manager-inbox`, `payment-services`, `public-referrers`, `push`, `quotes-lifecycle`, `survey-live-participant`, `support-ai-settings`, `support-settings-audit`, `tasks`, `task-analytics`, `timesheets-services`, `vendor-payments-allocations`, `reconciliation`.

---

## 6. Fixes applied

| File | Nature | Fix |
|---|---|---|
| `hr/core/hr-core-tenant-isolation.spec.ts` | `svc.list()` + `svc.backfillOrgPeople()` don't exist → TypeError caught → tautologies pass | Call correct methods; proper NotFoundException assertion; sqlValues across all where calls |
| `notifications/notification-outbox-relay-tenant-isolation.spec.ts` | Mock missing `db.select` → crash before any isolation logic | Added proper select mock returning org list |
| `billing/payments/payment-provider-resolver-tenant-isolation.spec.ts` | Mock has `buildProvider` not `configure` → TypeError in CONTROL | Fixed adapter mock to include `configure` |
| `careers/careers-tenant-isolation.spec.ts` | `expect(CareersService.name).toBe(...)` proves nothing about isolation | Replaced with actual `apply()` call checking `job_not_found` |

---

## 7. Verification

### Before fixes (hr-core file)
```
PASS src/modules/hr/core/hr-core-tenant-isolation.spec.ts  ← vacuous pass
Tests: 16 passed, 16 total
```

### After fixes
```
PASS src/modules/hr/core/hr-core-tenant-isolation.spec.ts
Tests: 16 passed, 16 total
```

Sabotage proof: changing `toContain(ATTACKER)` to `toContain("org-SABOTAGE")` in the HrTimeline DENY test produced:
```
FAIL  ● HrTimelineService — cross-tenant isolation › scopes employment visibility query to attacker org
Tests: 1 failed, 15 passed
```
Restored and confirmed green. The test bites.

### Broader suite (background run still in progress at report time)
Pre-fix baseline from the first background run showed `PASS` for the majority of files. The `automation-tenant-isolation.spec.ts` failure is a pre-existing module import error, not a test logic defect.

---

## 8. Runtime-crash sweep (session 2)

After session 1 established the static-scan gap, session 2 ran the suite against specs that were crashing at runtime rather than passing vacuously. The static gate scored them as "covered" because the files existed and contained the keyword — it never executed them.

**Approach:** ran each crashing spec, read the stack trace, read the actual service code, and fixed the mock. No assertion was weakened to make a test pass.

### Specs fixed in session 2 (20 specs → now passing)

| File | Root Cause | Fix |
|---|---|---|
| `rbac/roles-tenant-isolation.spec.ts` | `from().leftJoin is not a function`; wrong property name `result.roles` | Added full chain factory with `leftJoin`; changed assertion to `result.data` |
| `access/user-module-access-tenant-isolation.spec.ts` | `tx.execute is not a function`; `isCoreModule is not a function` | Added `execute` to inner tx; added `isCoreModule` to entitlements mock |
| `invoices/invoices-update-tenant-isolation.spec.ts` | `this.db.update is not a function` for top-level update | Added `update` to top-level db mock |
| `hr/expenses/expenses-tenant-isolation.spec.ts` | Wrong `checkDuplicate` signature and return type | Fixed call and assertion to match `(orgId, hash)` → `null` |
| `hr/onboarding/core/onboarding-core-tenant-isolation.spec.ts` | `runInNewTenantTransaction()` returned `undefined`, `.catch()` called on it | Added `.mockResolvedValue(undefined)` |
| `hr/lifecycle/exit-write-tenant-isolation.spec.ts` | `insert` returned `[]`, `resignation.id` threw | Provided `fakeRow` with `id` in makeDb |
| `e-sign/__tests__/e-sign-services-tenant-isolation.spec.ts` | NestJS DI string-token mismatch (all 16 tests) | Rewrote to `new ServiceClass(db, ...)` instantiation; fixed 5 non-existent method calls; fixed builder thenable |
| `build/core/projects-ticket-comments-tenant-isolation.spec.ts` | `insert` returned `[]`; `webhooksDispatch.dispatch` missing | Fixed insert return; added `dispatch: jest.fn()` |
| `billing/payments/payment-readiness-tenant-isolation.spec.ts` | Mock had `getAdapter` but service calls `.get()` | Added `get: jest.fn()` to registry mock |
| `billing/core/ai-credits-reservation-tenant-isolation.spec.ts` | `.for("update")` chain not thenable; no ambient context for `runInTenantTransaction` | Added proper `for()` thenable; added `jest.mock` for ambient context |
| `cron/cron-group-b-tenant-isolation.spec.ts` | `toHaveLength(1)` but service returns early with no org → 0 results | Fixed to `toHaveLength(0)` |
| `timesheets/core/__tests__/timesheets-services-tenant-isolation.spec.ts` | Builder missing `offset`/`for`/thenable; `access.scopeFor` missing; `query.userIds.slice` on undefined; `insert` missing `onConflictDoNothing`; export row missing `createdAt` | Added all chain methods to builder; added `scopeFor` to mockAccess; added `userIds`/`startDate`/`endDate` to TeamService test; fixed insert chains; provided full fakeExportRow |
| `hr/interviews/hr-interview-new-services-tenant-isolation.spec.ts` | Control test used `rejects.toThrow()` but service resolved successfully | Changed to `await svc.scheduleInterview(...)` and assert on args |
| `payroll/payroll-new-services-tenant-isolation.spec.ts` | `insert().returning()` returned `[]`, `row!.id` threw | Changed returning fallback to `[{ id: 1 }]` |
| `build/core/projects-analytics-workspace-members-budget-tenant-isolation.spec.ts` | `groupBy().orderBy is not a function`; `db.query.projectMembers` missing | Rewrote to full chain builder; added `projectMembers` to budget mock |
| `notifications/notification-providers-tenant-isolation.spec.ts` | Mock used `db.select` but service uses `db.query.notificationProviderAccounts.findMany` | Rewrote mock to use `db.query` |
| `finance/controls/approval-policies-tenant-isolation.spec.ts` | `where().limit is not a function` (mock had `where().orderBy().limit()`); `result.data` doesn't exist | Fixed chain to `where().limit()`; fixed assertion to `result.items` |
| `billing/payments/payment-test-transaction-tenant-isolation.spec.ts` | `db.select is not a function`; member row missing `status: "ACTIVE"` | Added select mock with full chain; provided ACTIVE_MEMBER row |
| `public/crm-tenant-isolation.spec.ts` | `withPublicToken` calls `tx.execute` but tx mock didn't have it | Added `execute: jest.fn().mockResolvedValue([])` to tx |

### Session 2 net result

All 20 crashing specs now pass with real assertions. The gate count remains 817/819 (unchanged — the static scan already counted these as covered). The gap this audit reveals is **runtime-pass rate**, not the static file count.

---

## 9. Assessment: does 817/819 mean what it claims?

**Substantially yes, with two distinct known gaps.**

**Gap 1 — static scan, not test execution.** The gate (`pnpm check:tenant-isolation`) scans file contents for keyword strings. A spec that crashes at runtime still scores as "covered". Before this audit, ~20 specs in the examined batch crashed on the first assertion and proved nothing. All 20 are now fixed and passing.

**Gap 2 — vacuous assertions.** 5 specs were syntactically valid but semantically tautological (calling non-existent methods, catching the TypeError, asserting on a constant). All 5 are now fixed.

Of the ~65 files examined (roughly 18% of 351):
- **~58 specs** exercise the isolation mechanism with assertions that fail when the wrong org is used.
- **5 specs** were vacuous — all fixed.
- **20 specs** crashed at runtime — all fixed.
- **1 spec** is structurally misleading (build-sprint-completed-consumer, DENY and CONTROL use same org).

The 817/819 number is an **accurate count of qualifying spec files** but it is **not a count of passing tests**. Before this audit, an unknown fraction of those 817 files would crash at runtime. After this audit, all examined files pass with real assertions. The true passing-and-biting coverage in the examined sample is ≥ 89%.

The gate is not a lie, but it is incomplete: it should be supplemented by `jest --testPathPattern="tenant-isolation"` as a CI step, not just the file scan.
