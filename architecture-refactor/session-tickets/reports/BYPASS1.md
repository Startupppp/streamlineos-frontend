# BYPASS1 — Placement Bypass Gate: Cron Leave Reset

**Date:** 2026-08-31
**Gate before:** exit 1 — 7 of 83 bypass sites not on the allowlist
**Gate after:** exit 0 — every database bypass is on the allowlist with a reason

---

## Gate output (before fix)

```
DATABASE BYPASS NOT ALLOWLISTED:
  FAIL  [cron-bypass]  src/modules/cron/cron-leave-reset.service.ts:165
  FAIL  [cron-bypass]  src/modules/cron/cron-leave-reset.service.ts:26
  FAIL  [cron-bypass]  src/modules/cron/cron-leave-reset.service.ts:43
  FAIL  [cron-bypass]  src/modules/cron/cron-leave-reset.service.ts:61
  FAIL  [cron-bypass]  src/modules/cron/cron-leave-reset.service.ts:67
  FAIL  [cron-bypass]  src/modules/cron/cron-leave-reset.service.ts:82
  FAIL  [cron-bypass]  src/modules/cron/cron-leave-reset.service.ts:91
```

---

## Analysis of all 7 sites

All 7 sites are in `CronLeaveResetService`, which has two methods: `resolveLeaveYearStartMonth` and `resetYearlyLeaveBalances`. Both are called exclusively from inside the `forEachOrg` callback in `CronLeaveService.runMonthlyLeaveReset`.

`forEachOrg` calls `withTenant` (sets the tenant GUC via `set_config('app.organization_id', ...)`) and `runWithTenantContext` (sets AsyncLocalStorage). The DRIZZLE token is a proxy (`createTenantAwareDb`) that routes every `this.db.*` call to `context.tx` when an ambient context exists.

So at runtime, all 7 `this.db` accesses were already reaching the correct tenant transaction. The gate flagged them because it does static per-file analysis and cannot see the cross-file call graph.

**Verdict: DEFECT** — not a runtime security hole at current call sites, but a structural correctness failure. The dependency on the ambient context being established by the *caller* was invisible from `cron-leave-reset.service.ts` itself. If the service were ever called outside `forEachOrg`, all queries would hit the raw pool with no GUC, silently bypassing RLS. The correct fix is to make the tenant context dependency explicit by accepting `TenantTx` as a method parameter, which also removes all `this.db` usages from the file and resolves the gate mechanically.

Allowlisting was rejected for all 7 sites: these are per-org operations (not cross-org sweeps), they need an explicit tenant scope, and converting a structural defect into a permanent allowlist entry would turn the gate into a lie.

---

## Fix

**`src/modules/cron/cron-leave-reset.service.ts`**
- Removed `@Inject(DRIZZLE) private readonly db: Db` from the constructor.
- Changed `resolveLeaveYearStartMonth(orgId)` → `resolveLeaveYearStartMonth(tx: TenantTx, orgId)`.
- Changed `resetYearlyLeaveBalances(orgId, newYear)` → `resetYearlyLeaveBalances(tx: TenantTx, orgId, newYear)`.
- Replaced all 7 `this.db` usages with the passed `tx`.
- The write block at line 165 became `tx.transaction(async (savepointTx) => { ... })` — creates a Drizzle savepoint on the already-open tenant transaction.

**`src/modules/cron/cron-leave.service.ts`**
- Changed the `forEachOrg` callback parameter from `(_tx, orgId)` to `(tx, orgId)`.
- Passed `tx` as first argument to `this.reset.resolveLeaveYearStartMonth(tx, orgId)` and `this.reset.resetYearlyLeaveBalances(tx, orgId, ...)`.

---

## Test results

```
Test Suites: 2 passed, 2 total  (cron-leave pattern)
Tests:       14 passed, 14 total

Test Suites: 1 passed, 1 total  (cron-group-b pattern)
Tests:       18 passed, 18 total
```

`pnpm check:route-classification` remains at 0 UNDECLARED.

---

## Files changed

- `backend/src/modules/cron/cron-leave-reset.service.ts`
- `backend/src/modules/cron/cron-leave.service.ts`
