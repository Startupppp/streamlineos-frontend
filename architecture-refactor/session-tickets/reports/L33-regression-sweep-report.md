# L33 Regression Sweep Report — 2026-08-30

## Summary

- **Backend jest:** 424+ suite failures across shards 1–4 (all share root cause: stale Jest transform cache). Shards 5–6 show 11 real failures with distinct bugs. Total: ~424 failed, ~422 passed across 6 shards (1,023 shards 1–4 are cache-poisoned; real signal is shards 5–6 only).
- **Frontend jest:** 1 failed suite (1 test), 156 passed.
- **Backend typecheck:** FAIL — 26 errors.
- **Frontend typecheck:** PASS.
- **Backend cycles:** PASS (0 circular).
- **Frontend cycles:** PASS (0 circular).

---

## Gate Table — Backend

| Gate | Result | Key Output |
|---|---|---|
| `check:route-classification` | PASS | 3 518 handlers — 0 undeclared |
| `check:permission-keys` | PASS | |
| `check:navigation-permissions` | PASS | |
| `check:tenant-indexes` | PASS | |
| `check:scope-application` | PASS | |
| `check:record-access` | PASS | |
| `check:module-entitlement` | PASS | |
| `check:module-lifecycle` | PASS | |
| `check:idempotent-commands` | PASS | |
| `check:tenant-isolation` | **FAIL** | 281 tenant-owned services with no cross-tenant negative test (66% covered) |
| `check:log-secrets` | PASS | |
| `check:placement-bypass` | PASS | |
| `check:owner-authority` | PASS | |
| `check:migration-chain` | PASS | |
| `verify:rbac-integrity` | PASS | |
| `check:outbox-consumers` | **FAIL** | 10 orphaned event types emitted but never consumed |
| `scan:legacy-actors:check` | PASS | |
| `openapi:check` | **FAIL** | Cannot find module `../../common/outbox/outbox.module` from `support/core/support.module.ts` — wrong relative depth (needs `../../../`) |

## Gate Table — Frontend

| Gate | Result |
|---|---|
| `check:routes` | PASS |
| `check:query-scope` | PASS |
| `check:formatters` | PASS |
| `check:empty-states` | PASS |
| `check:effect-fetches` | PASS |
| `check:icon-labels` | PASS |
| `check:dead-code` | PASS |
| `check:client-pages` | PASS |
| `check:route-access-contract` | PASS |
| `check:contract-drift` | PASS |
| `check:contract-vendor` | PASS |
| `check:module-manifest` | PASS |
| `verify:server-data-seam` | PASS |

---

## Failing Backend Gates — Details

### `check:outbox-consumers` — 10 orphaned events
Emitted but no consumer exists:
- `chat.message.fanout` — `modules/chat/chat-messages.service.ts`
- `sign.envelope.sent` / `.completed` / `.voided` — `modules/e-sign/`
- `inventory.purchase_order.received` / `sales_order.fulfilled` / `shipment.dispatched` / `stock.adjusted` — `modules/inventory/`
- `accounting.invoice.paid` / `payment.received` / `invoice.issued` — `modules/invoices/`
- `integration.connection.disconnected` — `modules/organization/core/org-membership-access-revocation.ts`

### `openapi:check` — support.module.ts broken import
`src/modules/support/core/support.module.ts:8` imports
`../../common/outbox/outbox.module` which resolves to `modules/common/outbox/` (does not exist).
Correct path is `../../../common/outbox/outbox.module` (three levels up from `modules/support/core/`).
Last touched in commit `02b99a8c` (feat(payroll)). The OpenAPI document cannot be generated so the spec check crashes the process.

### `check:tenant-isolation` — 281 missing cross-tenant tests
Coverage 66% (535/816 tenant-owned services). This is a pre-existing gap, not a new regression — no change to the service count was found between recent commits. Notable uncovered modules: `build/core/` (17+ services), `ai/core/services/` (12 services), `billing/payments/` (8 services).

---

## Backend Jest — Stale Cache Analysis (Shards 1–4)

**Root cause:** A lane split `src/db/schema/hr/hiring.ts` into four files (`hiring-candidates.ts`, `hiring-core.ts`, `hiring-interviews.ts`, `hiring-pipeline.ts`). The source files currently use the new imports correctly (`./hiring-candidates`, `./hiring-core`). However, the Jest transform cache (`$TEMP/jest/jest-transform-cache-*/`) contains stale compiled entries for `offboarding.ts` and `job-boards.ts` that still require `./hiring` (the deleted file). Multiple workers pick up these stale entries rather than the current source, causing `Cannot find module './hiring'` to propagate through the schema barrel (`db/schema/index.ts`) and fail every test that touches the schema.

- `hiring.ts` is shown as `D` (unstaged deletion) in `git status`.
- `hiring-candidates.ts`, `hiring-core.ts`, `hiring-interviews.ts`, `hiring-pipeline.ts` are `??` (untracked) — the split is incomplete (not yet committed).
- `recruitment-candidate-vault.spec.ts` additionally hard-codes `readFileSync("../../../db/schema/hr/hiring.ts")` — this fails with `ENOENT` even with a clean cache.

**Fix:** Run `node ./node_modules/jest/bin/jest.js --clearCache` then commit/stage the four new files and remove `hiring.ts`. One spec (`recruitment-candidate-vault.spec.ts`) must also drop the hardcoded path.

**Status: WORK-IN-PROGRESS** — this is an in-flight refactor by a concurrent lane; the source is correct, only the cache and git staging are incomplete.

---

## Real Backend Test Failures (Shards 5–6, not cache-related)

### `src/common/pagination/cursor.spec.ts` — `buildIdCursorPage`
- `reports no next page when exactly one page remains`: `nextCursor` returns `null` instead of `undefined`
- `handles an empty page`: same
- **Module:** `common/pagination`
- **Last churn:** `072880bb` (cursor-page performance reviews) — regression likely introduced here

### `src/common/pagination/list-query.schema.spec.ts` — 10 failing assertions
- Schemas `listProjectCustomersSchema`, `roadmapListQuerySchema`, `feedbackListQuerySchema`, `changelogListQuerySchema`, `timeEntriesListQuerySchema`, `teamTimesheetsQuerySchema`, `listManagedProductsQuerySchema`, `listWorkspacesQuerySchema`, `listMembersQuerySchema`, `listPortfoliosQuerySchema` all return `page: undefined` instead of defaulting to 1
- **Module:** `common/pagination` / `build`, `hr`, `payroll`
- **Last churn:** `e03387eb` (one sentinel algorithm) — pagination sentinel refactor broke the `page` default

### `src/modules/finance/ap/vendor-payments-list-tenant-isolation.spec.ts`
- `TypeError: this.db.select(...).from(...).leftJoin is not a function`
- The mock does not chain `leftJoin` — the service added a `leftJoin(purchaseBills, ...)` but the test mock was not updated
- **Module:** `modules/finance/ap`
- **Last churn:** `6488b92e` (harden finance and communication tenant flows)

### `src/modules/finance/ap/recurring-bills-tenant-isolation.spec.ts`
- `result.data` is `undefined` — the service returns a different shape than the test expects (`{ data, pagination }` envelope broken)
- **Module:** `modules/finance/ap`
- **Last churn:** `233e4513`

### `src/modules/finance/ap/vendor-credits-tenant-isolation.spec.ts`
- Cross-tenant isolation test fails — list query likely scopes incorrectly
- **Module:** `modules/finance/ap`

### `src/modules/finance/ap/vendor-payments-allocations-tenant-isolation.spec.ts`
- Same-tenant control fails
- **Module:** `modules/finance/ap`

### `src/modules/build/managed-products/managed-products.service.spec.ts`
- `listManagedProducts — pagination envelope` returns `undefined` instead of `{ data, pagination }`
- **Module:** `modules/build/managed-products`
- **Last churn:** `e03387eb` (lists sentinel refactor)

### `src/modules/support/core/support-tickets.service.spec.ts`
- `addMessage — audit logging by isInternal` — mock wiring: the db.transaction mock doesn't invoke its callback for the activity insert path
- **Module:** `modules/support/core`
- **Last churn:** `231bbcd0`

### `src/modules/activities/my-tasks-tenant-isolation.spec.ts`
- Task query scope fails (cross-tenant isolation)
- **Module:** `modules/activities`
- **Last churn:** `231bbcd0`

### `src/modules/notifications/notification-delivery-class.spec.ts`
- `direct email caller inventory` — 3 new files call `EmailService` directly (`auth-passwordless.service.ts`, `org-member-departure.service.ts`, possibly others) without routing through the outbox; spec enforces an allowlist
- **Module:** `modules/notifications`
- **Last churn:** `e766ee30` / `86569411`

### `src/modules/hr/recruitment/recruitment-candidate-vault.spec.ts`
- `ENOENT: hiring.ts` — spec reads the file at a hardcoded path; WIP alongside the hiring split
- **Module:** `modules/hr/recruitment`

---

## Backend Typecheck Errors (26 total)

| Module | Error Summary |
|---|---|
| `modules/accounting/core` | `page`/`pageSize` don't exist on cursor-based query type (3 services, 6 errors) — cursor migration removed `page`/`pageSize` but callers still destructure them |
| `modules/build/execution/timesheets.service.ts` | `SQL<unknown> \| undefined` not assignable to `SQL<unknown>` (2 errors) |
| `modules/hr/recruitment/recruitment-automation.service.ts` | `description` not in insert type; `description` not in `Partial<…>` (2 errors) |
| `modules/hr/recruitment/recruitment-candidates.service.ts` | `interviews` not in Drizzle with-relation; implicit `any` parameter (2 errors) |
| `modules/hr/recruitment/recruitment-jobs.service.ts` | `applications` not in Drizzle with-relation (1 error) |
| `modules/payroll/runs/generate-pipeline.service.ts` | `string` not assignable to payroll source enum; `ResolvedComponent` not found (2 errors) |
| `modules/payroll/runs/run-batch-loader.service.ts` | `SectionMap`/`ResolvedComponent` not found (4 errors) |
| `modules/support/core/support.module.ts` | Cannot find module `../../common/outbox/outbox.module` (wrong relative path — 1 error, same as openapi gate) |
| `src/scripts/benchmark-access-service.ts` | Expected 5 args, got 4 (1 error) |

**Root causes by cluster:**
- `accounting` — cursor migration introduced `limit/cursor` schema but callers still use `page/pageSize` (same commit family as the pagination schema failures)
- `hr/recruitment` — schema column removal (description, interviews, applications) not reflected in service code
- `payroll/runs` — missing type exports `ResolvedComponent`/`SectionMap` (likely split-file WIP)
- `support.module.ts` — wrong relative depth for outbox import (regression, confirmed by openapi gate)

---

## Cycles

- Backend: **PASS** — 0 circular dependencies (4 340 files scanned)
- Frontend: **PASS** — 0 circular dependencies (4 735 files scanned)

---

## Frontend Test Failures

| Suite | Test | Module |
|---|---|---|
| `features/module-access/module-access-page.test.tsx` | `shows ownership only to the canonical module owner` — Ownership tab appears for org-admin+module-admin when spec expects it hidden | `features/module-access` |

**Attribution:** The "Ownership" tab is displayed when `isOrgAdmin: true && isModuleAdmin: true`. The spec asserts this combination should NOT see the tab. This is a UI authorization regression — the gate that hides the Ownership tab from non-owners has been loosened. Last churn: `86569411` (module ownership transfer feature).

---

## Work-in-Progress vs Regression Split

### Likely WIP (do not route as bugs yet)

| Item | Evidence |
|---|---|
| `hiring.ts` deleted + 4 split files untracked | `git status` shows `D` + 4 `??`; source imports are already updated; only cache and staging are incomplete |
| `recruitment-candidate-vault.spec.ts` ENOENT | Directly depends on `hiring.ts` file path; will self-heal once the split is committed |
| `payroll/runs` missing `ResolvedComponent`/`SectionMap` | Classic split-file WIP: types defined in one new file, consumer in another, not yet complete |
| `hr/recruitment` `description`/`interviews` schema drift | Column appears to have been removed from the schema but service not yet updated |

### Likely Regressions (route to owning lane)

| Item | Module Tree | Owning Lane | Severity |
|---|---|---|---|
| `support.module.ts` wrong outbox import path | `modules/support` | L11 | P0 — crashes API boot and openapi gate |
| `cursor.spec.ts` `nextCursor: null` vs `undefined` | `common/pagination` | L29/L08 | High — pagination contract broken |
| `list-query.schema.spec.ts` `page` defaults to undefined | `common/pagination` (10 schemas across build/hr/payroll) | L29 | High — affects 10 list endpoints |
| `finance/ap` leftJoin mock missing / shape broken (4 suites) | `modules/finance/ap` | L08 | High — finance tenant isolation tests broken |
| `build/managed-products` pagination shape undefined | `modules/build/managed-products` | L03 | High |
| `accounting/core` `page`/`pageSize` TS errors | `modules/accounting/core` | L07 | Medium — typecheck only |
| `notifications/notification-delivery-class` email callers | `modules/notifications` | L14 | Medium — new direct callers bypass outbox |
| `module-access-page` Ownership tab visible to non-owners | `features/module-access` | L18 | High — authorization regression |
| `activities/my-tasks` cross-tenant isolation | `modules/activities` | L04 | High — tenant isolation |
| `outbox-consumers` 10 orphaned events | cross-module | Originating lanes | Medium |
| `check:tenant-isolation` 281 missing tests | cross-module | All module lanes | Low (pre-existing) |

---

## Top 10 Failing Module Trees by Failure Count

1. **`common/pagination`** — 12 test failures + 6 typecheck errors (cursor contract + page default + accounting callers)
2. **`modules/finance/ap`** — 6 test failures (leftJoin mock, shape mismatch across 4 suites)
3. **`modules/hr/recruitment`** — 4 typecheck errors + 1 test (hiring WIP + schema drift)
4. **`modules/support/core`** — 1 typecheck error + 1 test + P0 openapi/boot failure
5. **`modules/payroll/runs`** — 4 typecheck errors (missing type exports)
6. **`modules/build/managed-products`** — 1 test failure (pagination shape)
7. **`modules/notifications`** — 1 test failure (email-caller allowlist)
8. **`features/module-access`** — 1 test failure (ownership tab auth regression)
9. **`modules/activities`** — 1 test failure (cross-tenant isolation)
10. **`modules/accounting/core`** — 4 typecheck errors (cursor migration, callers not updated)

---

*Report written by L33 (read-only sweep). No files were modified other than this report.*
