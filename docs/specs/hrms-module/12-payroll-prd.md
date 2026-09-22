# HRM-12 — Payroll Product Completion PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Payroll administration under `/payroll/*` and universal self-service `/me/pay`
meet the same release bar as HRMS: reachable navigation, honest filters and
pagination, validated forms, bounded APIs, correct cache invalidation, and
clear ownership versus HR inputs / FnF initiation / reimbursements.

## Ownership Boundary

This PRD owns Payroll product pages, sidebar, run lifecycle UX, salary profiles,
payout/payslips, tax/bank, reports, payroll settings, and ESS pay. HR leave /
attendance still own the source facts; `hr/payroll-inputs` remains the bridge.
Recruitment stays out of scope.

Cross-cutting rules from HRM-01, HRM-04–07, and HRM-09 apply unless this file
overrides them for payroll-specific contracts.

## Current Source Findings

- ~23 routes under `frontend/app/(authenticated)/payroll/**` plus `/me/pay`.
- Sidebar: `sidebar-nav-groups-payroll.ts` — Team Payroll, Command Center, Runs,
  Employees, Salary Structures, Templates, Components, Inputs, Reimbursements,
  Bonuses, Loans, Taxes, Bank Transfers, Payslips, FnF, Reports, Access,
  Settings. **Missing:** `/payroll/setup`.
- `/payroll/workers/[workerId]` is detail-only (no collection nav row).
- Retired `/payroll/me` → `/me/pay`.
- Backend: `modules/payroll` (setup, runs, payout, insights, hr-payroll,
  filings) + `modules/hr/payroll-inputs`.
- Known defects: payout Query key collision risk
  (`payout-batch-key-collision.test.tsx`); `runEmployeeContract` not fully wired
  to `useRunEmployees`; mixed `payroll:*` and `hr:payroll*` / `hr:salary:*`
  permission nouns.

## Locked Boundaries (with HRMS)

| Concern | Owner |
|---------|-------|
| Payroll runs, lock/close, payout, bank transfer, payslip publish | Payroll |
| Self pay | `/me/pay` (universal) |
| Salary structures, templates, components, policies | `/payroll/*` settings & catalogs |
| Period input build from attendance/leave/OT/reimbursements | `hr/payroll-inputs` + `/payroll/inputs` UI; **WFH days paid** per HRM-13 |
| Bonuses, loans, reimbursements ops APIs under `hr/*` | Delivered in Payroll UX at `/payroll/bonuses` etc.; permissions collapse via HRM-08 |
| FnF settlement | `/payroll/fnf`; HR `/hr/fnf` initiates then deep-links here |
| Timesheet handoff | Work Management `/timesheets/payroll` → payroll inputs; no duplicate run UI |
| Tax filing engines beyond configured windows | P2; do not block MVP run cycle |

---

## Page Disposition

| Route | Disposition | Anatomy notes |
|-------|-------------|---------------|
| `/payroll` | KEEP | Command center; queues + next run CTA |
| `/payroll/team` | KEEP | Manager team payroll (`self:payroll`) |
| `/payroll/runs` | KEEP | Run list; filters status/period |
| `/payroll/runs/[runId]` | KEEP | Run detail; tabs inputs/exceptions/payout |
| `/payroll/employees` | KEEP | Salary profiles collection |
| `/payroll/employees/[employeeUserId]` | KEEP | Profile detail; back to employees |
| `/payroll/workers/[workerId]` | KEEP | Secondary detail from workers/employees |
| `/payroll/inputs` | KEEP | Attendance/period inputs bridge |
| `/payroll/salary-structures` | KEEP | |
| `/payroll/templates` | KEEP | |
| `/payroll/components` | KEEP | |
| `/payroll/reimbursements` | KEEP | Prefer this over duplicate HR-only payout UI |
| `/payroll/bonuses` | KEEP | |
| `/payroll/loans` | KEEP | |
| `/payroll/taxes` | KEEP | |
| `/payroll/bank-transfers` | KEEP | Fix query-key collision |
| `/payroll/payslips` | KEEP | |
| `/payroll/fnf` | KEEP | Settlement; accept deep link from `/hr/fnf` |
| `/payroll/reports` | KEEP | |
| `/payroll/access` | KEEP | |
| `/payroll/settings` | KEEP | Policy |
| `/payroll/settings/import-export` | KEEP | |
| `/payroll/setup` | KEEP + NAV | Wizard; **add sidebar or Settings child** |
| `/me/pay` | KEEP | ESS; never require payroll admin permission |
| `/payroll/me` | REMOVE | Already retired; purge callers |

- [ ] **HRM-12-001** add `/payroll/setup` to Payroll sidebar (Settings child or
  first-run entry) and route-access tests.
- [x] **HRM-12-002** purge remaining `/payroll/me` callers.
  **Closed — source proof 2026-09-21; same evidence as `HRM-01-002`.**
  No `frontend/app/(authenticated)/payroll/me` directory exists, and no `href`,
  `router.push/replace` or `redirect()` anywhere in `app/`, `components/`,
  `features/` or `lib/` targets it. The remaining `/payroll/me/*` strings are
  the **backend employee self-service API** consumed by
  `hooks/api/payroll/ess.ts` — live by design under CLAUDE.md §8, and not a
  caller of the retired page.
- [ ] **HRM-12-003** every KEEP payroll page documents HRM-02 anatomy fields.
- [ ] **HRM-12-004** run detail `backHref` → `/payroll/runs` with restored
  filters.
- [ ] **HRM-12-005** employee salary detail `backHref` → `/payroll/employees`.
- [ ] **HRM-12-006** FnF: `/hr/fnf` initiate → `/payroll/fnf` settlement with
  entity id; no duplicate settlement UI on HR.

## Sidebar IA

Canonical Payroll group order:

1. Team Payroll (self)
2. Command Center
3. Run Payroll
4. Employees
5. Attendance Inputs
6. Salary Structures → Templates → Components
7. Reimbursements → Bonuses → Loans
8. Taxes → Bank Transfers → Payslips
9. FNF Settlement
10. Reports
11. Access
12. Settings → Policy, Import/Export, **Setup**

- [ ] **HRM-12-007** update `sidebar-nav-groups-payroll.ts` for Setup + order.
- [ ] **HRM-12-008** collapse display of `hr:payroll:*` vs `payroll:*` labels
  after HRM-08 alias map; nav keys must exist in both catalogs.
- [ ] **HRM-12-009** entitlement: paid payroll module gate on admin surfaces;
  `/me/pay` remains universal.

## Search, Filters, Views, Pagination

| Collection | Required filters | Views | Pagination |
|------------|------------------|-------|------------|
| Runs | status, period, year | Table | Cursor ≤100 |
| Run employees | status, exception, search | Table | Cursor ≤100 |
| Salary employees | search, department, active | Table | Cursor ≤100 |
| Inputs periods | status, month | Table | Cursor ≤100 |
| Payslips | period, employee, published | Table | Cursor ≤100 |
| Bank transfers | run, status | Table | Cursor ≤100 |
| Reimbursements / bonuses / loans | status, employee, date | Table | Cursor ≤100 |
| FnF | status, employee | Table | Cursor ≤100 |
| Reports | report type + period | N/A | Aggregate |
| `/me/pay` | period | List of slips | Bounded recent + load more |

- [ ] **HRM-12-010** URL-shareable filters on runs, employees, payslips,
  reimbursements.
- [ ] **HRM-12-011** 300ms debounce on all payroll collection search.
- [ ] **HRM-12-012** no client-only filter over full downloaded run populations.
- [ ] **HRM-12-013** wire `runEmployeeContract` to `useRunEmployees`; remove
  type drift.

## Cards, Row Actions, Bulk

### Run row / card

Open, Continue processing, View exceptions, Export, Lock/Close (permissioned).

### Run employee row

Override input, Mark exception resolved, Exclude from run (confirm), Open
salary profile.

### Payslip row

Preview, Download, Republish (admin), Void (confirm).

### Bulk P0

| Collection | Actions |
|------------|---------|
| Run exceptions | Bulk resolve / recompute |
| Payslips | Bulk publish for run |
| Reimbursements | Bulk approve/reject (align expenses/payroll) |
| Bank transfers | Bulk mark sent (idempotent) |

- [ ] **HRM-12-014** ship bulk publish payslips for a locked run.
- [ ] **HRM-12-015** ship bulk exception resolve with per-id results.
- [x] **HRM-12-016** fix payout/bank-transfer React Query key collision
  (run id vs batch id). **Closed — source plus a passing regression test
  (2026-09-21).** `lib/query-keys/payroll.ts:34-39` discriminates the two:
  `bankBatches(runId)` ends `…"batches","by-run",runId` and
  `bankBatch(batchId)` ends `…"batches","detail",batchId`, while
  `bankBatches()` with no argument stays the bare prefix so create-batch
  invalidation still sweeps both. `payout-batch-key-collision.test.tsx` mounts
  both hooks with `runId === batchId === 1` — the first payroll any customer
  runs — and passes (3 tests). The org+user hash prefix does not separate
  them, because the collision is inside one org and one user.

## Forms and Validation

| Form | Required highlights |
|------|---------------------|
| Create run | Period, pay date, currency/policy |
| Salary assignment | Employee/worker, structure, effective date |
| Component / template | Code, name, calculation type |
| Loan | Employee, principal, schedule |
| Bonus | Employee, amount, period |
| Reimbursement payout | Claim ref, amount, method |
| Bank transfer batch | Run, account profile |
| Tax window | Jurisdiction, period |
| Setup wizard | Legal entity, pay frequency, bank, tax profile |
| FnF settlement | Employee, last day, components confirm |

- [ ] **HRM-12-017** Zod + API DTO parity for create run, salary assign, loan,
  bonus, setup wizard steps.
- [ ] **HRM-12-018** optional/required label audit on setup wizard and salary
  assignment.
- [ ] **HRM-12-019** unsaved guards on run overrides and salary edit sheets.

## API, Cache, Performance

- [ ] **HRM-12-020** all payroll list endpoints ≤100 + cursor; validate query
  Zod.
- [ ] **HRM-12-021** register payroll cache keys in `CACHE_KEYS`; invalidate on
  run lock, payout publish, salary change, input rebuild, **WFH approve that
  affects an open period**.
- [ ] **HRM-12-022** input rebuild does not N+1 attendance/leave/WFH per
  employee — batch/period projections including WFH paid days.
- [ ] **HRM-12-023** payslip download authorized at data layer; no IDOR via
  guessable ids.
- [ ] **HRM-12-024** `hr/payroll-inputs` and payroll runs share period identity
  contract; document in write-path table.
- [ ] **HRM-12-025** database proof: run generate under ≥500 employees in
  disposable env.

## Architecture Notes

- Payroll module owns run mutation; HR must not create parallel run APIs.
- Directory workers feed contingent pay profiles; SoR follows DR-HRM-01.
- Accounting journal export is Payroll → Accounting link; Accounting remains
  SoR for books.
- AI explain payslip uses metered AI credits; never bypass wallet.

- [ ] **HRM-12-026** publish payroll write-path table (run, input, payout,
  fnf).
- [ ] **HRM-12-027** remove duplicate settlement UX between `/hr/fnf` and
  `/payroll/fnf`.

## Visual / UX

- [ ] **HRM-12-028** command center and run detail use distinguishable sheet
  vs page surfaces (HRM-09 tokens).
- [ ] **HRM-12-029** run status colors are not the only signal (icons/text).
- [ ] **HRM-12-030** loading/error boundaries on runs list, run detail, setup,
  `/me/pay`.

## Competitor Payroll Parity (selected)

| Item | Priority |
|------|----------|
| Guided first-run setup in nav | P0 |
| Exception-first run UX | P0 |
| ESS payslip history + download | P0 |
| Loan/bonus in same cycle | P1 |
| Statutory reports export | P1 |
| Multi-entity (if schema supports) | P2 |
| Full country tax engine pack | Non-goal unless partner epic |

- [ ] **HRM-12-031** close P0 parity rows with browser proof.

## Acceptance / Release

- [ ] **HRM-12-032** journeys: setup → salary assign → input build → run →
  lock → payslip publish → `/me/pay` download.
- [ ] **HRM-12-033** journeys: HR FnF initiate → payroll settle.
- [ ] **HRM-12-034** manager `/payroll/team` scoped correctly.
- [ ] **HRM-12-035** cross-tenant isolation on payslip and run APIs.
- [ ] **HRM-12-036** Evidence Log entries under HRM-11 for all checked HRM-12
  items.
- [ ] **HRM-12-037** `PAGES.md` payroll section updated.
