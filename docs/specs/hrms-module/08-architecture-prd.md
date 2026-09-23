# HRM-08 — Architecture and Cross-Module Boundaries PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

HRMS has one clear system of record for people data, clean permission nouns,
honest module boundaries with Directory / Recruitment / Payroll / Expenses /
Calendar, and no compatibility shims pretending to be products.

## Ownership Boundary

Owns architectural decisions, migration plans, and boundary contracts.
Individual API performance tasks remain HRM-07. Page disposition remains HRM-02.

## Current Architectural Mistakes (source-backed)

| Mistake | Evidence | Fix direction |
|---------|----------|---------------|
| Dual people models | `hr_people` / `hr_employments` vs Directory `workers` / `worker_engagements` | Pick SoR; other becomes projection |
| Dual directory APIs | `GET /hr/directory` vs `/directory/people\|workers` | One pagination + filter contract; deprecate HR directory mega-list |
| Org hierarchy dual entry | `organization/hierarchy` vs `hr/org` compat | FE → hierarchy only; freeze compat |
| Permission alias sprawl | `hr:leaves:view` vs `read`; expenses `view` vs `read`; `hr:payroll*` vs `hr:payrolls*` | Collapse in one migration |
| Overlapping employee verbs | `create/update/delete` and `manage` | Document which gates mutations |
| Expenses keyed `hr:expenses:*` while module is `expenses` | Cross-module ownership drift | Keep keys or migrate with FE together |
| Incomplete cache invalidation | Dashboard/directory keys | Shared invalidator (HRM-07) |
| Inconsistent read caps | 1000 / 500 vs 100 contract | Enforce 100 |
| Dashboard org-wide metrics under analytics read | Possible over-share | Confirm product intent + scope |
| Legacy onboarding trees | `components/hr/_onboarding` + `lib/validation/hr` | Single feature owner |
| Recruitment routes under `/hr/recruitment` with separate product group | OK if intentional; path exception `/recruitment` is stale | Fix exception |
| Payroll split | `modules/payroll`, `hr/payroll-inputs`, `payroll/hr-payroll` | Ownership matrix |
| SQL-managed + Drizzle dual write for time | Intentional phase-1 | Document; don’t knip-delete |
| Large surface (129 controllers / ~234 tables) | Hard to reason | Deliver by subdomain programs |

## Decision Records (Phase 0)

### DR-HRM-01 — People system of record

**Status: LOCKED 2026-09-19 — Option 3 (strangler dual-run).**

**Decision:**

- **New writes** go to Directory `workers` / `worker_engagements` (and Directory
  people APIs where that is the membership surface).
- **HR `hr_people` / `hr_employments`** remain the read/join facade for
  attendance, leave, and legacy HR screens during a time-boxed dual-run.
- **EmploymentFacts** (or successor) is the only allowed join facade; new code
  must not ad-hoc dual-join.
- Cutover deletes duplicate write paths once FE employee list and payroll
  salary profiles read through the chosen APIs without drift.

**Rejected for now:** Option 1 (instant Directory-only) and Option 2
(HR-forever SoR) — too much cutover risk for leave/attendance joins.

- [x] **HRM-08-001** approve DR-HRM-01 — locked Option 3; publish write-path
  table (which API inserts where) as implementation task.
- [ ] **HRM-08-001a** publish the write-path table (Directory vs HR insert
  matrix) in this file’s Evidence Log appendix.
- [ ] **HRM-08-002** implement EmploymentFacts (or successor) as the only join
  facade; ban ad-hoc dual joins in new code.
- [ ] **HRM-08-003** migrate FE employee list to the chosen read API; delete
  duplicate list semantics.

### DR-HRM-02 — Permission alias collapse

**Status: LOCKED 2026-09-19 — see HRM-00 D07.**

- [x] **HRM-08-004** alias map approved in
  [00-product-decisions-prd.md](./00-product-decisions-prd.md) D07.
- [ ] **HRM-08-005** update frontend permission catalog in the same change.
- [ ] **HRM-08-006** remove dead keys after one release with telemetry.

### DR-HRM-03 — Org structure

- [ ] **HRM-08-007** FE Job Architecture links to Organization hierarchy for
  BU/branch/dept/team/location mutations.
- [ ] **HRM-08-008** mark `hr/org` compat controllers deprecated; delete after
  zero callers.

### DR-HRM-04 — Recruitment boundary

HRMS may:

- convert hired candidate → onboarding task;
- show open headcount on HR dashboard;
- keep `/me/job-openings` and `/me/referrals`.

HRMS must not:

- own pipeline kanban, offer generation, scorecards, or ATS settings in this
  pack’s delivery scope.

- [ ] **HRM-08-009** document deep-link contract hire → `/hr/onboarding/[userId]`.
- [ ] **HRM-08-010** fix stale `/recruitment` product path exception.

### DR-HRM-05 — Payroll / expenses / FnF (Payroll IN SCOPE)

**Status: LOCKED 2026-09-19 — Payroll delivered inside this program via HRM-12.**

| Concern | Owner |
|---------|-------|
| Payroll runs, payslips generation, bank transfer | Payroll module + HRM-12 |
| Self pay view | `/me/pay` (universal) |
| Salary structures templates | `/payroll/salary-structures` + settings |
| Payroll input snapshots from HR | `hr/payroll-inputs` + `/payroll/inputs` UI |
| **WFH / WFO paid presence** | Attendance + WFH approve → inputs; `WFH` in paid statuses; WFO via `PRESENT` (HRM-13) |
| Expenses claims | Expenses module; permissions may stay `hr:expenses:*` until alias migration |
| Travel | HRMS |
| Reimbursements payout UI | Canonical `/payroll/reimbursements` (HRM-12); retire duplicate HR ops UI |
| FnF settlement | `/payroll/fnf`; HR `/hr/fnf` initiates then deep-links |
| Workforce cost analytics | HRMS read models; no run mutate |
| Setup wizard | `/payroll/setup` — must be in Payroll nav |

- [ ] **HRM-08-011** encode the matrix in code owners / module README references.
- [ ] **HRM-08-012** ensure workforce-cost APIs are read-only regarding runs.
- [ ] **HRM-08-012a** align HR reimbursements / FnF routes with HRM-12 canonical
  URLs (no duplicate settlement).

### DR-HRM-06 — Calendar

- [ ] **HRM-08-013** HR holiday, leave, birthday, probation, **approved WFH**,
  and optional planned WFO sources register on `/calendar` only; delete any
  parallel HR calendar page if present.

### DR-HRM-07 — Announcements sidebar placement

**Status: LOCKED 2026-09-19 — Home Company only.**

- Sidebar: Home → Company → Announcements → `/hr/announcements`.
- Do **not** list Announcements under the HR product sidebar group.
- HR hub may deep-link to `/hr/announcements`.
- Create/edit remains permission-gated on that route.

- [x] **HRM-08-013a** approve DR-HRM-07.
- [ ] **HRM-08-013b** verify no HR sidebar duplicate; add hub deep-link if
  missing; nav tests cover Home-only.

### DR-HRM-08 — WFH / WFO work location

**Status: recommended in HRM-13; implement via HRM-13-001.**

Canonical product modes are **WFO** (office) and **WFH** (home). Attendance
`status` keeps lifecycle values; APIs expose `workLocation`. See
[HRM-13](./13-wfh-wfo-prd.md).

- [ ] **HRM-08-013c** land DR-HRM-08 with HRM-13-001; no third competing
  vocabulary (`remote` alone) in customer UI.

## Layering Rules

1. Business logic only in backend services — no frontend `lib/services` HR
   domain logic.
2. Authorize every read/write at data layer with tenant + scope.
3. No `forwardRef` cycles; shared types in neutral modules.
4. Controllers validate; services enforce invariants; repositories/query helpers
   apply scope.
5. Idempotency on bulk and onboard endpoints.
6. Outbox for external side effects (email, Composio) — no fire-and-forget
   without durable record.

- [ ] **HRM-08-014** cycle gate `pnpm check:cycles` clean for touched HR graphs.
- [ ] **HRM-08-015** ban new imports from legacy onboarding paths.
- [ ] **HRM-08-016** document event-sourced attendance/leave ledger write path
  vs Drizzle tables for implementers.

## Acceptance Checks

- [ ] **HRM-08-017** Phase 0 decisions recorded with dates and owners.
- [ ] **HRM-08-018** after migrations, one primary FE path per people list job.
- [ ] **HRM-08-019** cross-module e2e: hire → onboard; exit → FnF initiate;
  expense approve → payroll input visibility (named disposable env).
