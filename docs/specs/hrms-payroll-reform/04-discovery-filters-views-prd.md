# HRM-04 — Search, Filters, Views, and Pagination PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Customers can find every accessible HRMS record without false empty states,
silently truncated results, or client-only filters that lie about the full
result set. Search is debounced, filters are URL-shareable and server-enforced,
views match the job, and pagination exists only where collections are unbounded.

## Ownership Boundary

Owns filter vocabulary, search semantics, view modes, sort, and pagination
policy. API query performance and indexes are HRM-07. Bulk selection interaction
with filters is HRM-05.

## Current Source Findings

- Strong filter modules: employees, documents, expenses, assets, cases,
  work-logs.
- Debounce at 300ms is common on employees, candidates (boundary), directory,
  expenses, documents — but find-expert, handbook, and email-templates often
  skip the same pattern.
- Many lists filter inline without a dedicated `*-filters.tsx` or URL sync.
- Dynamic filters exist for custom fields (`hr/custom-fields/:entityType/filter`)
  but are not wired consistently on employee and case surfaces.
- Backend: employees list has cursor + filters; `GET /hr/directory` loads up to
  1000 with no query Validate; `GET /hr/leaves/team` caps at 500; leave my-list
  lacks status/date filters.
- Views: table dominates; employees have grid/list; holidays have calendar;
  kanban is mainly recruitment (boundary). Attendance lacks first-class calendar
  view mode.

## Filter Semantics

### Static Filters

Product enums that do not depend on tenant data — employment status, leave
status, attendance status, expense status, case priority, document sensitivity
class, boolean flags. Versioned contracts; unknown values → 400.

### Dynamic Filters

Authorized, scoped option queries — department, team, location, manager,
leave type, shift, policy, form, custom field option, asset type, helpdesk
category, assignee. Option search is paginated and cancellable. Archived options
already on records remain removable but are not offered for new assignment.

### Search Semantics

| Collection | Searches | Does not search |
|------------|----------|-----------------|
| Employees | name, email, employee code, phone ( Digits normalized) | free-text across documents |
| Directory people | name, email, title | payroll identifiers |
| Leave (admin) | employee name/code within scoped set | policy body text |
| Attendance | employee name/code | raw biometric payload |
| Documents | title, tags, owner name | binary content (unless dedicated search API) |
| Cases / helpdesk | subject, ticket key, requester | internal audit JSON |
| Assets | tag, serial, assignee name | |
| Expenses / travel | title, claimant, category | receipt OCR unless feature ships |
| Goals / KPIs | title, owner | |

Rules:

- Search never bypasses structured filters or data scope.
- Multi-field search is AND with filters; within search, OR across fields.
- Empty search is not a wildcard that disables indexes — omit the predicate.
- Minimum 2 characters before server search fires (after debounce), except exact
  employee code / ticket key detectors.

### Debounce Contract

- Default UI debounce: **300ms** via `useDebouncedValue`.
- Cancel in-flight queries on change (TanStack Query `queryKey` + abort where
  supported).
- Exact-match shortcuts (employee code, leave request id) may fire on Enter
  immediately without waiting for debounce.

- [ ] **HRM-04-001** every retained collection search uses the debounce contract
  or documents an exception.
- [ ] **HRM-04-002** search predicates are server-side; client-only array filter
  is banned for org-scale lists.

## Canonical Filter Sets by Domain

### Employees

Identity: search, employee code. Org: department, team, location, manager.
Status: active/inactive, employment type, probation. Dates: joined/left range.
Skills: skill id (dynamic). Custom fields: typed operators.

### Attendance

Date range (required default: current pay period or week). Status.
**Work location: WFO | WFH** (HRM-13). Department. Shift. Irregular only.
Geofence breach. Device.

### Leave

Status, leave type, date range, department, employee, policy. Comp-off distinct
type filter on its page.

### WFH requests (under Leave / time-off)

Status, date range, employee, department, approver. URL-synced with `tab=wfh`
(HRM-13).

### Documents

Type, status, owner, employee subject, sensitivity, expired / expiring.

### Cases / Helpdesk

Status, category, priority, assignee, requester, SLA breached, created range.

### Assets

Status, type, location, assignee, warranty expiring.

### Expenses / Travel

Status, category, claimant, date range, amount range, project/cost center if
authorized.

### Performance goals

Status, cycle, owner, team, progress range.

- [ ] **HRM-04-003** implement missing server filters for leave team/admin lists.
- [ ] **HRM-04-004** implement employee filters for manager, location,
  employment status, hire date range, skill.
- [ ] **HRM-04-005** wire dynamic custom-field filters on employees and cases
  where the API already exists.
- [ ] **HRM-04-006** malformed filter values return field-level 400 and never
  broaden the query.
- [ ] **HRM-04-007** URL serializer shares one vocabulary across page, export,
  and bulk selection.

## Views

| Domain | Required views | Optional | Forbidden |
|--------|----------------|----------|-----------|
| Employees | Table, Card/grid | Org embed link | Kanban of employees |
| Attendance | Table, Calendar (month) | Timeline day | Kanban |
| Leave | Table, Calendar (team) | Analytics charts on analytics route | |
| WFH | Table (self + admin) | Team calendar overlay | Separate top-level page |
| Holidays | Calendar, List, Location | | |
| Documents | Table, Grid | | |
| Cases / Helpdesk | Table | Board by status (P2) | |
| Assets | Table | | |
| Goals | Table, Cards | | |
| Org chart | Graph | | Table pretending to be org |
| Approvals inbox | Table / grouped list | | |

- [ ] **HRM-04-008** ship attendance calendar view mode on `/hr/attendance`
  with distinct WFO vs WFH markers (HRM-13).
- [ ] **HRM-04-009** ship team leave calendar view or reuse `/calendar` sources
  including approved WFH with documented deep link.
- [ ] **HRM-04-010** ViewToggle only advertises views the page implements.
- [ ] **HRM-04-011** finish holidays location view configuration.

## Pagination Policy

### Where pagination IS required

Any list that can exceed ~50 rows in a real SMB: employees, directory people,
workers, attendance logs, leave requests, documents, cases, helpdesk tickets,
assets, expenses, travel, goals, work logs, import jobs, audit/event streams.

Contract:

- Cursor-based (keyset) preferred; page numbers only when product requires jump.
- Default limit 25 or 50; max 100.
- Total count optional; when shown must match the filtered query.
- Infinite scroll allowed only with explicit “end of results” and no fake totals.

### Where pagination should be REMOVED or avoided

- Org chart initial viewport (load neighborhood; expand on demand — not pages of
  nodes).
- Holiday year calendar cells.
- Settings catalogs with <30 static rows (leave types in a tiny tenant) — still
  cap at 100 server-side.
- Dashboard metric widgets (aggregates, not lists).
- Wizard steps.
- Single-record detail pages.

### Where current caps are wrong

| Endpoint | Fix |
|----------|-----|
| `GET /hr/directory` limit 1000 | Cursor + max 100 |
| `GET /hr/leaves/team` cap 500 | Cursor + max 100 + filters |
| Board-like UIs that load N then stop | Completion path or “load more” with honesty |

- [ ] **HRM-04-012** enforce max 100 on all HRMS list endpoints in scope.
- [ ] **HRM-04-013** remove fake client pagination over a fully downloaded array
  larger than 100.
- [ ] **HRM-04-014** document each KEEP collection’s strategy in HRM-02 anatomy.

## Saved Views (P2)

- [ ] **HRM-04-015** employee and leave admin saved views store filter JSON
  server-side with permission scope; not localStorage-only for shared teams.

## Acceptance Checks

- [ ] **HRM-04-016** contract tests: malformed filters 400; scoped actor cannot
  widen.
- [ ] **HRM-04-017** browser proof: shareable URLs restore filters on employees,
  leave, documents, cases.
- [ ] **HRM-04-018** database proof: explain plans for employee search + dept
  filter use indexes leading with `org_id`.
