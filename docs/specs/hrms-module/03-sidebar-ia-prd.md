# HRM-03 — Sidebar Information Architecture and Component Reuse PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

HRMS navigation is scannable, permission-truthful, and free of dead or
enterprise-only clutter in the default tree. Shared UI primitives are reused
instead of HR-only forks wherever Build/CRM already solved the pattern.

## Ownership Boundary

This PRD owns sidebar grouping, labels, order, badges, permission keys on nav
items, and the reuse catalog. Route existence is HRM-01. Page keep/remove is
HRM-02.

## Current Source Findings

- HR nav is split across
  `sidebar-nav-routes-hr-foundation.ts`,
  `sidebar-nav-routes-hr-employee-experience.ts`,
  `sidebar-nav-routes-hr-governance.ts`,
  `sidebar-nav-routes-hr-settings.ts`, assembled by
  `sidebar-nav-groups-hr.ts`.
- Home owns For Me + Company (announcements, people, workers).
- Administration owns Directory settings + access.
- Recruitment is a separate product group under `/hr/recruitment` paths.
- Announcements appear in Home but not HR foundation.
- ~21 recruitment/document secondary routes are intentional hub/settings links,
  not sidebar rows.
- HR prefers `HrSheet` / rich-surface; `EntityFormSheet`, `PageTabsToolbar`, and
  directory-style bulk bars are underused.

## Canonical Sidebar Structure (HRMS product)

Default visible groups for an HR admin with full `hr:*` access:

1. **Overview** — Hub, Dashboard, Approvals Inbox
2. **People** — Employees (+ Skills, Find Expert, Org Chart, Positions),
   Onboarding (+ Probation as child or hub-only)
3. **Time** — Attendance (+ Shifts, Rosters, Overtime, Geofencing,
   **Time clocks → Devices | Biometric**, Work Logs)
4. **Leave** — Leaves (+ **WFH**, Policies, Holidays, Comp-Off, Analytics)
5. **Pay-adjacent (HR)** — Benefits, Comp Planning, Equity, Expenses, Travel
   (Reimbursements **not** in HR nav — canonical `/payroll/reimbursements`,
   HRM-00 D09)
6. **Performance** — Performance (+ Goals, KPIs, Feedback, Analytics)
7. **Documents** — Documents (+ Types, Review, Handbook, Email Templates, BGV)
8. **Assets** — Assets, Asset Returns
9. **People Ops** — Cases, Helpdesk, Engagement, Accommodations
10. **Risk & Governance** — Compliance, Safety, Emergency, Labor, Legal Holds,
    Retention, Identity, Delegations
11. **Workforce** — Workforce, Workforce Cost, Contingent
12. **Lifecycle** — Exit (+ FnF handoff, Termination)
13. **Insights** — Analytics, Access
14. **Settings** — `/hr/settings/*` children

Rules:

- Hide empty groups when the actor lacks every child permission.
- Enterprise-only items (legal holds, equity, simulator) appear only when the
  org entitlement and permission both allow.
- `/hr/event-stream` and `/hr/simulator` are not default sidebar items.
- Announcements: **locked Home Company only** (DR-HRM-07). Do not add
  `/hr/announcements` to the HR product sidebar. Hub deep-link is allowed.
- Job Architecture `/hr/org` remains until hierarchy migration completes, then
  becomes a link to Organization settings hierarchy.

### Home (unchanged contract)

For Me: Time Off, Attendance, Expenses, Pay, My Documents, Onboarding Tasks,
**Team** (`/me/team` for managers — HRM-00 D08), Job Openings, Referrals
(+ Recruitment BOUNDARY).

Company: **Announcements** (sole sidebar entry), People, Workers (gated).

### Payroll sidebar

Owned by [HRM-12](./12-payroll-prd.md). HR sidebar must not re-list Run Payroll,
Payslips, or Bank Transfers.

### Administration (unchanged contract)

Directory, Directory Access.

- [ ] **HRM-03-001** rewrite HR group files to match the canonical structure
  without changing unrelated products.
- [ ] **HRM-03-002** every nav item has a real permission key that exists in
  both backend and frontend catalogs.
- [ ] **HRM-03-003** badge sources (approvals, leaves) document cache keys and
  invalidation owners.
- [x] **HRM-03-004** announcements dual-listing — **locked Home-only**; remove
  any HR sidebar duplicate if present; keep Home Company entry.
- [ ] **HRM-03-005** biometric/devices — **two children under Time clocks**
  (HRM-00 D06).
  ⚠ **Reopened 2026-09-21 — was ticked, and source contradicts it.** In
  `components/layout/sidebar/sidebar-nav-routes-hr-foundation.ts:103-114`,
  "Biometric" (`/hr/biometric`) and "Time Clock Devices" (`/hr/devices`) are
  flat siblings alongside Geofencing and Work Logs. No "Time clocks" parent
  node exists, so they are not two children of anything. They also gate on
  different keys — `hr:attendance:manage` and `hr:biometric:manage` — which
  the grouping has to resolve.
- [ ] **HRM-03-006** entitlement gating for paid HR surfaces uses live
  entitlements, never frontend-only constants.
- [ ] **HRM-03-007** nav tests assert href existence, access classification, and
  absence of removed items (`/hr/simulator`, retired onboarding).

## Permission Label Hygiene

- Prefer one verb family per resource: `view` / `manage` / `approve` — collapse
  `read` aliases per HRM-08.
- Nav uses the least privilege that still reveals the page; mutations stay
  harder inside the page.
- Self-service items carry no `hr:*` requirement.

- [ ] **HRM-03-008** audit every HR nav `requiredPermission` against
  `backend/src/modules/rbac/permissions/hr*.ts` and frontend mirrors.

## Component Reuse Catalog

### Must reuse (do not fork)

| Component | Use for |
|-----------|---------|
| `PageWrapper` | loading / error / empty / denied shells |
| `DataTable` | tabular collections |
| `EmptyState` / `ErrorState` / `NoPermissionState` | explicit states |
| `SearchInput` + `useDebouncedValue` (300ms default) | collection search |
| `ViewToggle` | table / list / board switches |
| `FILTER_TOOLBAR_ROW` / `FILTER_SELECT_TRIGGER` | filter toolbars |
| `EntityFormSheet` / `EntityFormDialog` | standard create/edit forms |
| `PageTabsToolbar` | settings and detail tabs |
| `LeavesWfhContent` pattern | shared self/admin workflows |
| `PeopleDirectoryPage` + `basePath` | Home vs Admin directory |
| Rich surface (`RichPanel` / hero) | HR hub and settings hubs only |

### Promote to shared when a second consumer appears

| Local today | Promote when |
|-------------|--------------|
| `features/hr/shared/employee-picker.tsx` | Payroll or Directory needs same picker |
| Asset filter toolbar | Another HR inventory-like list copies it |
| Cases filter bar | Helpdesk shares identical facets |

### Stop inventing

| Anti-pattern | Prefer |
|--------------|--------|
| One-off search without debounce | `SearchInput` + `useDebouncedValue` |
| Parallel Zod in `lib/validation/hr` | Feature `*-schema.ts` |
| Custom sheet chrome per form | `EntityFormSheet` / `HrSheet` with shared tokens |
| Inline filter selects without URL sync | HRM-04 filter serializer |

- [ ] **HRM-03-009** migrate at least employees, assets, expenses, and cases
  create/edit flows onto `EntityFormSheet` or document why `HrSheet` remains.
- [ ] **HRM-03-010** delete unused HR-only wrappers after migration.
- [ ] **HRM-03-011** document the reuse catalog in `frontend/features/hr/README`
  only if one already exists; otherwise keep this PRD as source of truth.

## Acceptance Checks

- [ ] **HRM-03-012** browser proof: HR admin, manager-scoped, and
  self-service-only actors each see the correct tree.
- [ ] **HRM-03-013** no sidebar href 404s; secondary hub links remain intentional.
- [ ] **HRM-03-014** Evidence Log lists removed nav items and permission fixes.
