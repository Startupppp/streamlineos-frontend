# 26: Resolve Timesheets API contract drift

**What to build:** Timesheet entry, rate, exception and settings workflows use one canonical billing type, source and approval-mode contract across API and UI.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Product decisions select one accepted enum/value model for every known drift.

  **The Postgres enums are canonical.** Six of the seven drifts were the frontend offering values the database has never been able to store; the frontend was aligned to the enums and no migration was needed.

  | Field | Was (frontend) | Now | Decision |
  |---|---|---|---|
  | `billingType` | `BILLABLE \| NON_BILLABLE \| INTERNAL` | `BILLABLE \| NON_BILLABLE \| FIXED` | `INTERNAL` removed — `NON_BILLABLE` already carries it. `FIXED` added: the backend supports it and drives `isBillable = false`, but the UI never offered it. |
  | `source` | `MANUAL \| TIMER \| GRID \| IMPORT` | `MANUAL \| TIMER \| API \| IMPORT` | The week grid sends `MANUAL`; spreadsheet entry is manual entry. `API` added to match the enum exactly. |
  | `approvalMode` | `NONE \| MANAGER \| PROJECT \| CLIENT` | `MANAGER \| AUTO \| MULTI_LEVEL` | `NONE` maps onto `AUTO` — same meaning, relabelled "No approval (auto-approve)". `PROJECT` and `CLIENT` removed: no approval routing implements them. `MULTI_LEVEL` gained. |

  Two user-visible options were removed. That was put to the product owner explicitly before implementing rather than decided in passing, because both were selectable in the settings form.

- [x] Backend validation, OpenAPI, frontend types/forms and persisted values agree.

  Frontend: `features/timesheets/types.ts` (the three unions and `BILLING_TYPE_LABEL`), `settings/rate-form-schema.ts`, `settings/general-settings-schema.ts`, `settings/rate-form-sheet.tsx`, `settings/general-settings-form.tsx`, `my-time/week-grid.tsx`. Backend Zod and the enums were already correct and are unchanged.

  **The seventh drift was not what it looked like, and the first fix was wrong.** `POST /timesheets/exceptions/{exceptionId}/resolve` reported an extra `reason` field. Frontend and backend already agreed — `resolveExceptionSchema` requires `reason` and the controller applies it. The OpenAPI document was the outlier, and the first attempt hand-edited `openapi.json` on the theory that the field "used to be called `note`". Re-checking the document showed the real cause:

  ```
  /payroll/runs/{runId}/exceptions/{exceptionId}/resolve  operationId: ExceptionsController_resolve
  /timesheets/exceptions/{exceptionId}/resolve            operationId: ExceptionsController_resolve
  ```

  **Two controller classes were both named `ExceptionsController`**, so the generator collided them and the payroll operation overwrote the timesheets one — giving the timesheets endpoint payroll's `{ note }` body *and* payroll's `x-permission: payroll:runs:update`. The published contract had been advertising the wrong permission for this endpoint. A hand-edited body would have left that lie in place.

  Fixed at the source: the timesheets class is now `TimesheetExceptionsController` (`modules/timesheets/core/exceptions.controller.ts` and its module registration), which also satisfies backend §7's naming rule. Regenerated:

  ```
  $ pnpm openapi:generate
  openapi.json written — 3540 operations
  exposure stamped on 3540, 0 undeclared
  zod contracts applied to 1916 operations

  operationId:  TimesheetExceptionsController_resolve
  x-permission: timesheets:exceptions:manage
  body:         {"reason": {"type":"string","minLength":3,"maxLength":500}}, required: ["reason"]
  ```

  Generation needs six environment variables and no database; S6's `openapi-env.ts` seam and `evidence/41-openapi/OPENAPI-CI.md` supply safe placeholders. The regenerated document adds 1 operation and removes 0, so no other session's contract was clobbered.

- [x] Existing stored values receive a safe compatibility/backfill path.

  **No backfill is needed, and that is proved rather than assumed.** `migrations/0143_timesheets_text_to_enums.sql` created all three types with exactly the backend-canonical values:

  ```sql
  CREATE TYPE "timesheet_billing_type"  AS ENUM ('BILLABLE','NON_BILLABLE','FIXED');
  CREATE TYPE "timesheet_entry_source"  AS ENUM ('MANUAL','TIMER','API','IMPORT');
  CREATE TYPE "timesheet_approval_mode" AS ENUM ('MANAGER','AUTO','MULTI_LEVEL');
  ```

  No later migration alters them. `INTERNAL`, `GRID`, `NONE`, `PROJECT` and `CLIENT` were never legal values, so no row can hold one — Postgres would have rejected the insert even if Zod had let it through. What actually happened at runtime was that Zod stripped the value and the write silently became a no-op.

- [x] Contract-drift checks report zero unapproved differences and workflows pass.

  ```
  $ node scripts/check-contract-drift.mjs
  === KNOWN UNFIXED DEFECTS — 0 baselined drift(s) tracked ===
  ✔  No new timesheets contract drift detected.
  EXIT=0
  ```

  `scripts/contract-drift/known-drift.mjs` `KNOWN_DRIFT` is `[]`. The checker fails on a stale baseline entry as well as a new violation, so an emptied baseline is load-bearing, not cosmetic.

  ```
  $ node ./node_modules/jest/bin/jest.js features/timesheets   → 8 passed
  $ node ./node_modules/jest/bin/jest.js src/modules/timesheets → 13 suites, 98 passed
  $ npx tsc --noEmit                                            → 0 errors
  $ NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck        → 0 errors
  ```

  `features/timesheets/contract-enums.test.ts` reads the accepted values out of `contracts/openapi.json` rather than restating literals, so the test cannot pass by drifting alongside the code.

## Also fixed here

Three of ticket 35's nineteen formatter findings live in this territory and were done with it: `reports/project-budgets-tab.tsx` and `reports/report-format.ts` now use `formatCurrencyFull` with the per-record currency, and `settings/rates-tab.tsx` uses `formatMoney` with `useOrgDisplay()`, keeping its explicit `"—"` guard for null and NaN.
