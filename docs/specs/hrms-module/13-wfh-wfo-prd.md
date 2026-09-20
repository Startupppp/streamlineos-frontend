# HRM-13 — WFH and WFO (Work Location Modes) PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Work-from-home (WFH) and work-from-office (WFO) are first-class, end-to-end
modes across self-service, manager approval, team attendance, calendars,
policies, filters, bulk actions, payroll inputs, and analytics — not a leave
tab afterthought and not an unlabeled default check-in.

## Ownership Boundary

Owns work-location vocabulary, WFH request lifecycle, WFO check-in rules,
roster/schedule location mode, UI labels, filters, calendar sources, and
payroll paid-status mapping for WFH/WFO days. Leave types that are not
location modes (annual, sick, etc.) stay in Leave. Geofence/device hardware
config stays under Attendance settings; this PRD defines when they apply to
WFO vs WFH.

## Current Source Findings

- WFH is implemented: `wfh_requests` table, `WfhService`, `GET/POST /hr/wfh`,
  `/me/time-off/wfh`, UI tab inside `LeavesWfhContent`, hub pending queue,
  policy type `"wfh"`, attendance status enum includes `WFH`, payroll
  `PAID_STATUSES` includes `WFH`, calendar can emit WFH attendance events.
- WFO is **implicit only**: office days usually land as `PRESENT` (or
  `LATE` / `CHECKED_OUT`) with optional geofence `locationVerified` — there is
  no customer-facing **WFO** label, filter, or request type.
- WFH list is capped at 100 for self; admin pending path exists; team/admin
  discovery filters (date range, department, status URL sync) are weaker than
  leave.
- Unique constraint: one WFH request per org/user/date — no multi-day range
  create in one shot (product may need range → expanded days).
- Attendance history badge knows `WFH` but team cards emphasize `PRESENT`.
- No first-class **planned WFO/WFH** on rosters beyond shift presence.

## Product Vocabulary (locked)

| Mode | Meaning | How it is established |
|------|---------|------------------------|
| **WFO** | Working from a designated office / onsite location | Default for scheduled office days; check-in under office/geofence/device policy; attendance status remains the operational status (`PRESENT`, `LATE`, …) with **workLocation = WFO** |
| **WFH** | Working remotely with approval (or policy auto-grant) | `wfh_requests` approved for that date **or** roster marks remote; attendance status `WFH` (or PRESENT + workLocation WFH — pick one canonical; see DR below) |
| **Hybrid day** | Org schedule says remote or office by weekday/policy | Resolved from policy + roster before check-in; not a third attendance status |

Display labels in product copy: **Work from office (WFO)** and **Work from home (WFH)**. Avoid “remote” alone in customer UI unless paired with WFH.

### DR-HRM-08 — Attendance status vs work location

**Recommendation (lock unless product overrides):**

- Keep attendance `status` as presence lifecycle (`PRESENT`, `WFH`, `ABSENT`, …).
- Treat **`WFH` status as the WFH day marker** (already in schema + payroll).
- Introduce an explicit **`workLocation`** (or derive): `WFO` | `WFH` for filters
  and badges so WFO is visible when status is `PRESENT`/`LATE`/`CHECKED_OUT`.
- Derivation rule until a column exists: `status === 'WFH'` → WFH; else if
  checked in → WFO; else unknown/absent.

- [ ] **HRM-13-001** approve DR-HRM-08; if a column is chosen, migrate and backfill
  derivation; if derived-only, document in API response contract.
- [ ] **HRM-13-002** every attendance list/detail API returns `workLocation`
  (`WFO` | `WFH` | `UNKNOWN`) so FE never invents it.

## Customer Journeys

### Self — WFO day

1. Open `/me/attendance`.
2. See today’s expected mode (WFO/WFH) from policy/roster.
3. Check in; geofence/device rules apply when mode is WFO.
4. History shows **WFO** badge (not only Present).

### Self — WFH day

1. Open `/me/time-off` → WFH tab (or Request WFH CTA on attendance when policy
   allows).
2. Submit date(s), reason, approver; quota enforced.
3. Pending → approved/rejected with notifications.
4. On approved date, check-in (if required) records **WFH**; geofence office
   rule does not fail the day.
5. Calendar shows WFH source.

### Manager / HR

1. Approvals inbox and Leave → WFH approvals / hub queue.
2. Team attendance filterable by WFO vs WFH.
3. Bulk approve/reject WFH (HRM-05 / this PRD).
4. Roster can mark planned WFH/WFO for a week.

- [ ] **HRM-13-003** browser proof both self journeys.
- [ ] **HRM-13-004** browser proof manager filter + approve.

## Pages and Navigation

| Surface | Requirement |
|---------|-------------|
| `/me/time-off` | KEEP WFH tab; rename copy to include WFO context in empty states (“Office and home work”) where helpful |
| `/me/attendance` | Show expected mode + WFO/WFH history badges |
| `/hr/leaves` | KEEP WFH admin/approvals; filters for WFH status |
| `/hr/attendance` | Filters: work location WFO/WFH; calendar colors for both |
| `/hr/approvals` | Include pending WFH beside leave |
| Policies | `wfh` policy + office/WFO attendance policy parameters |
| `/calendar` | Sources: approved WFH + (optional) planned WFO office presence |

- [ ] **HRM-13-005** do not add a separate top-level “WFH” sidebar item; keep
  under Leave + Attendance as today, with clear labels.
- [ ] **HRM-13-006** hub queue “WFH pending” deep-links to filtered approvals /
  leaves WFH tab (no 404).

## Request and Policy Rules

### WFH request

| Field | Required |
|-------|----------|
| Date or date range | Yes — range expands to per-day rows honoring uniq(org,user,date) |
| Reason | Yes |
| Approver | Yes unless policy auto-approves |
| Notes | Optional (max lengths already in schema) |

Rules:

- Cannot request WFH on holiday / already-on-leave day (clear error).
- Cannot double-book WFH when attendance already WFO-checked-in same day
  without cancel/regularize path.
- Monthly quota from policy; surface remaining quota in UI.
- Reject requires reason.
- Permission: self create via `self:attendance` / documented key; approve via
  leave/attendance approve scope (align FE/BE — today e2e uses
  `self:attendance` for WFH).

### WFO (office) rules

- Default expected mode when roster/policy says office.
- Check-in may require geofence and/or device when configured.
- Failure mode: show “Outside office geofence” with regularize / request WFH
  CTA when policy allows same-day switch.
- No separate “request WFO” for default office workers; optional **planned
  office day** only for mostly-remote employees (P2).

- [ ] **HRM-13-007** multi-day WFH create expands server-side with partial
  failure reporting.
- [ ] **HRM-13-008** block WFH vs leave/holiday conflicts with field errors.
- [ ] **HRM-13-009** WFO geofence failure offers policy-aware recovery CTAs.
- [ ] **HRM-13-010** align WFH permission keys FE/BE; document in HRM-08 alias
  map if split `self:leaves` vs `self:attendance`.

## Filters, Search, Views

| Collection | Filters |
|------------|---------|
| My WFH | status, month |
| Admin/team WFH | status, date range, employee, department, approver |
| Team attendance | **workLocation** WFO/WFH, status, date, department |
| Approvals inbox | type=leave\|wfh |

Views:

- Attendance calendar: color WFO vs WFH distinctly (HRM-09: not color-only).
- Leave/WFH team calendar: include approved WFH days.
- URL sync for WFH status filter (today often local state only).

- [ ] **HRM-13-011** server filters for admin WFH list; cursor ≤100.
- [ ] **HRM-13-012** attendance workLocation filter server-enforced.
- [ ] **HRM-13-013** URL-shareable WFH filters on `/hr/leaves?tab=wfh&…` and
  `/me/time-off`.
- [ ] **HRM-13-014** 300ms debounce on employee search within WFH admin lists.

## Cards, Row Actions, Bulk

### WFH row

View, Approve, Reject (reason), Cancel (requester), Open employee.

### Attendance row

Show WFO/WFH badge; Regularize; Request WFH (when eligible).

### Bulk P0

- Bulk approve/reject WFH pending (with reason on reject).
- Bulk export team attendance including workLocation.

- [ ] **HRM-13-015** ship WFH bulk approve/reject API + UI.
- [ ] **HRM-13-016** attendance export includes workLocation column.

## Forms / Zod / API

- [ ] **HRM-13-017** WFH form + API DTO parity (date range, reason, approver).
- [ ] **HRM-13-018** WFH policy form: monthly quota, eligible roles, auto-approve
  rules, blackout dates.
- [ ] **HRM-13-019** attendance check-in API accepts/returns workLocation;
  rejects impossible combos (e.g. force WFH status without approval when policy
  forbids).

## Data, Cache, Payroll, Calendar

- [ ] **HRM-13-020** on WFH approve/reject/cancel: invalidate WFH lists, hub
  pending, attendance day, leave analytics, calendar sources, payroll-input
  period if open.
- [ ] **HRM-13-021** payroll inputs treat WFH as paid presence (already in
  `PAID_STATUSES`); document WFO=`PRESENT` path; regression test.
- [ ] **HRM-13-022** calendar source: approved WFH + optional planned WFO;
  toggleable on `/calendar`.
- [ ] **HRM-13-023** indexes: wfh (org, status, date); attendance filter by
  derived/stored workLocation must remain ≤100 and scoped.
- [ ] **HRM-13-024** approve WFH writes/updates attendance marker for that date
  in one transaction (no orphan approved WFH without attendance truth).

## Rosters and Shifts (P1)

- [ ] **HRM-13-025** roster entry optional `plannedWorkLocation` WFO|WFH.
- [ ] **HRM-13-026** team roster week view shows W/O icons for planned mode.

## Competitor Parity (location modes)

| Capability | Priority |
|------------|----------|
| Request + approve WFH with quota | P0 (exists — harden) |
| Visible WFO vs WFH on team attendance | P0 |
| Calendar WFH | P0 |
| Same-day switch WFO→WFH with policy | P1 |
| Hybrid weekly template | P1 |
| Auto-approve WFH within quota | P1 |
| Office seat / desk booking | Non-goal |

- [ ] **HRM-13-027** close P0 rows with browser + API proof.

## Acceptance Checks

- [ ] **HRM-13-028** self WFH create → manager approve → attendance shows WFH →
  `/me/pay` / payroll input counts day paid.
- [ ] **HRM-13-029** self WFO check-in → history shows WFO → team filter WFO
  returns the row.
- [ ] **HRM-13-030** cross-tenant WFH id approve fails closed.
- [ ] **HRM-13-031** Evidence Log under HRM-11 for HRM-13 items.
- [ ] **HRM-13-032** update `PAGES.md` leave/attendance notes for WFH/WFO.
