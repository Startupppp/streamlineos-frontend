# HRM-02 — Page Inventory (Keep / Merge / Remove / Add) PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Every HRMS-owned page either earns its place with a clear customer job or is
removed. Missing journeys required for a complete people product are listed as
additions with owners. Recruitment pages remain boundary references. **Payroll
pages are first-class** and are dispositioned in [HRM-12](./12-payroll-prd.md);
this file keeps the cross-link and ESS `/me/pay` row.

## Ownership Boundary

This PRD owns page disposition and required page anatomy (states, primary
action, collection strategy). Feature depth for filters, cards, forms, and APIs
is owned by HRM-04 through HRM-07.

## Disposition Legend

| Code | Meaning |
|------|---------|
| **KEEP** | Retain; repair defects listed in child PRDs |
| **MERGE** | Collapse into the listed owner; delete the route after callers move |
| **MOVE** | Change canonical path; delete the old route (no legacy redirect) |
| **REMOVE** | Delete page and all callers; job is obsolete or duplicated |
| **ADD** | New page required for product completeness |
| **BOUNDARY** | Owned by Recruitment; HRMS links only |
| **PAYROLL** | Owned by HRM-12; listed here only for cross-links |

## Current Source Findings

- ~124 `page.tsx` files under `/hr`, plus Directory, `/me` HR, and
  employee-onboarding.
- Strong reference pages: employees list, assets, directory people, recruitment
  pipeline (boundary), leave shared self/admin component.
- Incomplete: location holidays, uneven loading/error coverage, thin hub-only
  secondary recruitment pages, `/payroll/setup` orphan (Payroll).
- Shared intentionally (not duplicates): `/directory` vs `/directory/settings`
  via `basePath`; `/hr/leaves` vs `/me/time-off` via `LeavesWfhContent`.
- Legacy parallel: `components/hr/_onboarding` vs `features/employee-onboarding`.

## Page Anatomy Contract (every KEEP / ADD)

Each retained page must declare:

1. Customer job (one sentence).
2. Permission / entitlement gate.
3. Primary action (or explicit read-only).
4. Loading, error, empty, denied, populated states.
5. Collection strategy: none | cursor page | infinite | calendar window |
   bounded ≤100.
6. Allowed views (table / list / cards / kanban / calendar / org / analytics).
7. Filter and search owner (HRM-04) or N/A.
8. Bulk actions owner (HRM-05) or none.

**Authoritative per-page detail** (filters field-by-field, sheets/dialogs,
components, APIs, tables, cache, scale) lives in
[HRM-14 catalogs](./14-page-catalog-readme.md). This file remains the
keep/merge/remove/add decision table.

- [ ] **HRM-02-001** every KEEP and ADD page has a matching HRM-14 catalog row
  before implementation closes.

---

## A. Home and Self-Service (`/me/*`)

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/me/time-off` | KEEP | Shares leave **and WFH** UI with `/hr/leaves` (HRM-13) |
| `/me/attendance` | KEEP | Self check-in / history; **WFO/WFH badges** (HRM-13) |
| `/me/expenses` | KEEP | Self expenses |
| `/me/pay` | KEEP | Self payslips; never payroll admin |
| `/me/documents` | KEEP | Self document vault |
| `/me/onboarding` | KEEP | Self onboarding tasks |
| `/me/job-openings` | KEEP | Universal internal openings |
| `/me/referrals` | KEEP | Universal referrals |
| `/me/recruitment` | BOUNDARY | Candidate-facing; Recruitment owns depth |
| Retired `/hr/onboarding/my-tasks` | REMOVE | Already retired; purge callers |

- [ ] **HRM-02-002** confirm `/me/*` gates use live-session membership, not
  paid HR entitlement, for the universal surfaces above.
- [ ] **HRM-02-003** ADD `/me/profile` only if Directory person self-edit is not
  already reachable from Home; otherwise KEEP Directory person self path and
  document it (avoid a third profile editor).

## B. Directory and Company

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/directory` | KEEP | Company people directory |
| `/directory/[personId]` | KEEP | Person profile |
| `/directory/workers` | KEEP | Workforce engagements; modulesAny hrms\|payroll |
| `/directory/access` | KEEP | Directory ACL |
| `/directory/settings` | KEEP | Admin people via same component + `basePath` |
| `/directory/settings/[personId]` | KEEP | Admin person detail |
| `/hr/announcements` | KEEP | **Locked:** Home → Company sidebar only; HR hub may deep-link; do not add to HR product sidebar (DR-HRM-07) |

- [x] **HRM-02-004** do not invent `/directory/settings/workers`; workers stay
  at `/directory/workers`. **Closed — source proof 2026-09-21.** The route tree
  under `frontend/app/(authenticated)/directory/` is exactly `[personId]`,
  `access`, `settings`, `settings/[personId]` and `workers`. There is no
  `settings/workers` directory, and `/directory/workers` exists.
- [ ] **HRM-02-005** ADD manager team roster at `/me/team` or document that
  manager scope is only via `/hr/employees` filters — pick one and ship it.

## C. HR Overview and Employees

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr` | KEEP | Module hub |
| `/hr/dashboard` | KEEP | Analytics dashboard |
| `/hr/approvals` | KEEP | Cross-workflow inbox |
| `/hr/employees` | KEEP | Canonical employee collection |
| `/hr/employees/[employeeId]` | KEEP | Employee profile |
| `/hr/employees/skills-matrix` | KEEP | Capability matrix |
| `/hr/employees/find-expert` | KEEP | Expert search |
| `/hr/org-chart` | KEEP | Reporting graph |
| `/hr/org` | MERGE/MOVE | Prefer Organization hierarchy; freeze HR org compat after FE migration (HRM-08) |
| `/hr/positions` | KEEP | Job architecture positions |
| `/hr/onboarding` | KEEP | Admin onboarding queue |
| `/hr/onboarding/[userId]` | KEEP | Person onboarding |
| `/hr/onboarding/probation` | KEEP | Probation queue (secondary OK) |
| `/employee-onboarding` | KEEP | New-hire wizard outside authenticated HR chrome |

- [ ] **HRM-02-006** REMOVE or archive dead code under
  `components/hr/_onboarding` once `features/employee-onboarding` is sole owner.
- [ ] **HRM-02-007** ADD employee create/edit full-page only if sheet capacity is
  insufficient; default remains sheet/dialog for create.

## D. Time and Attendance

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/attendance` | KEEP | Team attendance; **WFO/WFH filters** (HRM-13) |
| `/hr/shifts` | KEEP | Shift definitions |
| `/hr/rosters` | KEEP | Roster planning; planned WFO/WFH P1 (HRM-13) |
| `/hr/overtime` | KEEP | OT requests / logs |
| `/hr/geofencing` | KEEP | Applies to **WFO** check-in rules (HRM-13) |
| `/hr/biometric` | KEEP | Biometric event feed; nav under Time clocks parent (HRM-00 D06) |
| `/hr/devices` | KEEP | Clock hardware registry; nav under Time clocks parent (HRM-00 D06) |
| `/hr/work-logs` | KEEP | Work log review |

- [ ] **HRM-02-008** ADD attendance calendar view as a view mode on
  `/hr/attendance` (not a new top-level route) per HRM-04; color WFO vs WFH
  per HRM-13.
- [x] **HRM-02-009** biometric + devices — **KEEP both routes**; one sidebar
  parent (HRM-00 D06). No page MERGE.

## E. Leave (and WFH requests)

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/leaves` | KEEP | Admin leave **+ WFH tab** (`LeavesWfhContent`); see HRM-13 |
| `/hr/leave-policies` | KEEP | Include **wfh** policy type |
| `/hr/holidays` | KEEP | Holiday calendar; finish location view |
| `/hr/comp-off` | KEEP | Comp-off |
| `/hr/leaves/analytics` | KEEP | Leave analytics; include WFH usage |

- [ ] **HRM-02-010** finish location holidays configuration end-to-end (page is
  KEEP but incomplete).
- [ ] **HRM-02-010a** WFH/WFO journeys close under HRM-13 (no second WFH page).

## F. Compensation, Expenses, Travel

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/benefits` | KEEP | Benefit plans |
| `/hr/compensation-planning` | KEEP | Comp cycles |
| `/hr/equity` | KEEP | Equity grants |
| `/hr/expenses` | KEEP | Expense admin |
| `/hr/reimbursements` | MERGE→PAYROLL | Prefer `/payroll/reimbursements` as canonical ops UI; keep HR route only if it is a thin redirect-free deep link — otherwise MOVE callers to payroll and REMOVE |
| `/hr/travel` | KEEP | Travel requests |
| `/hr/travel/approvals` | KEEP | Travel approvals |

## G. Performance

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/performance` | KEEP | Performance home |
| `/hr/goals` | KEEP | Goals |
| `/hr/kpis` | KEEP | KPIs |
| `/hr/feedback` | KEEP | 360 / feedback |
| `/hr/performance/analytics` | KEEP | Analytics |

- [ ] **HRM-02-011** ADD review-cycle detail route if cycles are only embedded;
  otherwise document cycle ownership on `/hr/performance`.

## H. Documents

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/documents` | KEEP | Library |
| `/hr/documents/editor/new` | KEEP | Editor |
| `/hr/documents/editor/[documentId]` | KEEP | Editor |
| `/hr/documents/templates` | KEEP | Templates |
| `/hr/documents/templates/new` | KEEP | |
| `/hr/documents/templates/[templateId]/edit` | KEEP | |
| `/hr/document-types` | KEEP | Types |
| `/hr/document-review` | KEEP | Review queue |
| `/hr/handbook` | KEEP | Handbook |
| `/hr/email-templates` | KEEP | Email templates |
| `/hr/background-verification` | KEEP | BGV |

## I. Assets

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/assets` | KEEP | Asset inventory |
| `/hr/asset-returns` | KEEP | Returns |

## J. Workforce, People Ops, Governance

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/workforce` | KEEP | Workforce overview |
| `/hr/workforce-cost` | KEEP | Cost views (read; no payroll run mutate) |
| `/hr/contingent` | KEEP | Contingent workers |
| `/hr/cases` | KEEP | HR cases |
| `/hr/service-delivery` | MERGE → `/hr/cases` | **Locked HRM-00 D05** |
| `/hr/helpdesk` | KEEP | Employee helpdesk |
| `/hr/engagement` | KEEP | Engagement surveys |
| `/hr/accommodations` | KEEP | Accommodations |
| `/hr/compliance` | KEEP | Compliance |
| `/hr/safety` | KEEP | Safety |
| `/hr/emergency` | KEEP | Emergency contacts / plans |
| `/hr/labor-relations` | KEEP | Labor |
| `/hr/legal-holds` | KEEP | Legal holds |
| `/hr/retention` | KEEP | Retention policies |
| `/hr/identity` | KEEP | Identity governance |
| `/hr/delegations` | KEEP | Approver delegations |
| `/hr/simulator` | REMOVE or MOVE | Dev/admin simulator must not ship in default HR nav |
| `/hr/event-stream` | KEEP (settings-adjacent) | Ops event stream; not primary nav |
| `/hr/exit` | KEEP | Exit management |
| `/hr/fnf` | KEEP (initiate only) | Deep-link to `/payroll/fnf` for settlement (HRM-12) |
| `/hr/termination` | KEEP | Termination workflow |
| `/hr/analytics` | KEEP | HR analytics |
| `/hr/access` | KEEP | HR access admin |

- [ ] **HRM-02-012** `/hr/service-delivery` **MERGE into cases** (HRM-00 D05).
  ⚠ **Reopened 2026-09-21 — was ticked, and source contradicts it.** The page
  still exists at
  `frontend/app/(authenticated)/hr/service-delivery/page.tsx` and is still a
  live customer nav destination at
  `components/layout/sidebar/sidebar-nav-routes-hr-governance.ts:40`. The
  disposition is locked; the merge was never performed. The tick recorded the
  decision, not the work.
- [ ] **HRM-02-013** `/hr/simulator` **out of customer nav** (HRM-00 D11).
  ⚠ **Reopened 2026-09-21 — was ticked, and source contradicts it.**
  `frontend/app/(authenticated)/hr/simulator/page.tsx` still exists (with a
  `loading.tsx`) and is still linked from
  `components/layout/sidebar/sidebar-nav-routes-hr-governance.ts:134`, so a
  dev/admin simulator ships in default HR nav — exactly what D11 forbids.
  This also blocks `HRM-03-007`, whose nav test must assert the absence of
  `/hr/simulator`: written honestly against current source, that test fails.

## K. HR Settings

| Route | Disposition | Notes |
|-------|-------------|-------|
| `/hr/settings` | KEEP | Settings hub |
| `/hr/settings/company` | KEEP | |
| `/hr/settings/import-export` | KEEP | |
| `/hr/settings/integrations` | KEEP | |
| `/hr/settings/policies` | KEEP | |
| `/hr/settings/workflows` | KEEP | |
| `/hr/settings/templates` | KEEP | |
| `/hr/settings/forms` | KEEP | |
| `/hr/settings/forms/[formId]` | KEEP | |
| `/hr/settings/forms/[formId]/submissions` | KEEP | |
| `/hr/settings/custom-fields` | KEEP | |
| `/hr/settings/preview` | KEEP | |
| `/hr/settings/versions` | KEEP | |
| `/hr/settings/automations` | KEEP | |

- [ ] **HRM-02-014** ADD `/hr/settings/notifications` for HR notification
  templates if not covered by platform notifications.
- [ ] **HRM-02-015** ADD `/hr/settings/leave` only if leave policies should
  leave the operational `/hr/leave-policies` route; prefer one owner.

## L. Recruitment (BOUNDARY)

All `/hr/recruitment/**` routes are **BOUNDARY**. HRMS may:

- deep-link hired candidate → onboarding;
- show headcount / open-req signals on HR dashboard;
- keep universal `/me/job-openings` and `/me/referrals`.

HRMS must not expand ATS page anatomy in this pack.

- [ ] **HRM-02-016** record ATS pages as out-of-scope with link to future
  Recruitment program; no KEEP repairs here beyond broken deep links that
  strand HR onboarding.

## M. Payroll (IN SCOPE — see HRM-12)

Payroll routes are **not** boundary-only. Full keep/merge/remove/add, nav,
filters, bulk, validation, and API todos live in
[HRM-12 — Payroll](./12-payroll-prd.md).

Cross-links this pack must honor:

- `/me/pay` — universal ESS (also listed in §A).
- `/payroll/setup` — must gain sidebar entry (HRM-12-001).
- `/hr/fnf` initiates; `/payroll/fnf` settles.
- `/payroll/inputs` consumes `hr/payroll-inputs`.
- Reimbursements canonical UI → `/payroll/reimbursements`.

- [ ] **HRM-02-016b** do not duplicate payroll page anatomy in this file;
  close payroll disposition checkboxes only in HRM-12.

## Pages to Add (product completeness)

| Priority | Page / capability | Why |
|----------|-------------------|-----|
| P0 | Manager team view (`/me/team` or scoped employees) | Managers lack a self-service team surface |
| P0 | Attendance calendar view mode | Customers expect month grid, not only tables |
| P0 | Complete location holidays | Empty incomplete state today |
| P1 | Org announcements composer polish under existing route | Already routed; ensure create/edit |
| P1 | Employee bulk import status page (if jobs are API-only) | Visibility into import jobs |
| P1 | Policy acknowledgement tracking | Common competitor gap |
| P2 | Succession / talent grid if performance already stores data without UI | Only if backend already has records |
| P2 | HR notification preferences | Reduce email noise |

- [ ] **HRM-02-017** prioritize ADD list; reject any ADD that duplicates Directory
  or Payroll.
- [ ] **HRM-02-018** update `PAGES.md` after every MOVE/REMOVE/ADD lands.

## Unnecessary Pages (default REMOVE candidates)

Confirm with product before delete:

1. `/hr/simulator` in customer product nav.
2. `/hr/service-delivery` if indistinguishable from cases/helpdesk.
3. Duplicate org structure UI once hierarchy is canonical.
4. Any recruitment secondary that is only a settings-hub link farm **stays
   BOUNDARY** — not deleted by this pack.

- [ ] **HRM-02-019** close REMOVE candidates with browser proof that no hub,
  notification, or email still links to them.

## Acceptance Checks

- [x] **HRM-02-020** disposition defaults approved via
  [HRM-00](./00-product-decisions-prd.md); execution remains in catalogs.
- [ ] **HRM-02-021** every KEEP page has anatomy fields filled.
- [ ] **HRM-02-022** zero orphan KEEP pages without sidebar, hub, or intentional
  secondary entry.
