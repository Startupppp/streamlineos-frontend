# HRM-00 — Normative Product and Architecture Decisions

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Authority

These decisions remove ambiguity across the HRMS-module documents (HRM-01
through HRM-15). They are **normative** unless the user explicitly changes one.
Older design text and completed evidence must be reconciled to these contracts
before implementation can close.

Locked by user on 2026-09-19 unless noted as locked in this file by program
default when the user said to proceed with remaining Phase 0 gates.

## D01 — People System of Record (Strangler)

**Status: LOCKED 2026-09-19 (user).**

- New writes go to Directory `workers` / `worker_engagements` (and Directory
  people APIs where that is the membership surface).
- HR `hr_people` / `hr_employments` remain the read/join facade for attendance,
  leave, and legacy HR screens during a time-boxed dual-run.
- `EmploymentFacts` (or successor) is the only allowed join facade.
- Cutover deletes duplicate write paths once FE lists and payroll salary
  profiles read without drift.

- [ ] **HRM-00-D01-A** write-path table published; EmploymentFacts is sole join;
  no new ad-hoc dual joins.

## D02 — Announcements Live in Home Only

**Status: LOCKED 2026-09-19 (user).**

- Sidebar: Home → Company → Announcements → `/hr/announcements`.
- Do not list Announcements under the HR product sidebar.
- HR hub may deep-link to the same route.

- [ ] **HRM-00-D02-A** nav tests assert Home-only; no HR sidebar duplicate.

## D03 — Payroll Is In Scope; Recruitment Is Boundary

**Status: LOCKED 2026-09-19 (user).**

- Payroll administration is delivered by HRM-12 / catalog 14f.
- Recruitment ATS page anatomy is BOUNDARY (14g); only hire → onboarding and
  headcount signals are in this program.

- [ ] **HRM-00-D03-A** no ATS feature PRs merge under HRMS without Scope change;
  payroll PRs reference HRM-12/14f.

## D04 — WFO and WFH Are First-Class Work Locations

**Status: LOCKED 2026-09-19 (user / HRM-13).**

- Customer labels: **Work from office (WFO)** and **Work from home (WFH)**.
- Attendance APIs expose `workLocation` (`WFO` | `WFH` | `UNKNOWN`).
- `status === 'WFH'` marks WFH days; office presence with check-in maps to WFO
  when status is PRESENT/LATE/CHECKED_OUT (derived or stored per HRM-13-001).
- Geofence/device rules apply to WFO; approved WFH does not fail office geofence.
- No separate top-level WFH sidebar item — Leave tab + Attendance filters.

- [ ] **HRM-00-D04-A** attendance list/detail contracts return `workLocation`;
  calendars and payroll inputs treat WFH as paid presence.

## D05 — Service Delivery Merges into Cases

**Status: LOCKED 2026-09-19 (program proceed).**

- `/hr/service-delivery` has no distinct customer job from Cases.
- **MERGE** into `/hr/cases` (or a Cases tab) after migrating any unique
  records, links, and permissions.
- Delete the route and inline `page.tsx`; extract any survivors into
  `features/hr/cases`.
- Helpdesk remains separate (employee ticket queue vs HR case file).

- [ ] **HRM-00-D05-A** zero callers to `/hr/service-delivery`; Cases owns the
  job; `PAGES.md` updated.

## D06 — Biometric and Devices Stay Two Routes, One Nav Parent

**Status: LOCKED 2026-09-19 (program proceed).**

- Keep **two pages**: `/hr/devices` (clock hardware registry) and
  `/hr/biometric` (event/reconcile feed) — different jobs and permissions.
- Sidebar: single parent **Time clocks** with children Devices | Biometric
  events (not two peer top-level items that look duplicate).
- Shared empty states deep-link to each other (no device → prompt register;
  device without events → open biometric feed).

- [ ] **HRM-00-D06-A** sidebar groups Devices + Biometric under one parent;
  both routes retained with catalog rows in 14b.

## D07 — Permission Alias Collapse

**Status: LOCKED 2026-09-19 (program proceed).**

Canonical verbs: **`view` | `manage` | `approve` | `create`** where create is
still required as a distinct gate; otherwise prefer `manage`.

| Retire (alias) | Canonical |
|----------------|-----------|
| `hr:leaves:read` | `hr:leaves:view` |
| `hr:expenses:read` | `hr:expenses:view` |
| `hr:expenses:manage` when approve/create already express intent | keep `view`/`create`/`approve`; `manage` only for admin config |
| `hr:payrolls:*` | `hr:payroll:*` or module `payroll:*` per surface (see matrix) |
| Overlapping `hr:employees:create\|update\|delete` vs `manage` | **Mutations use `hr:employees:manage`**; granular keys remain for role packs that already grant them until one release telemetry then retire |

**Payroll nouns:**

- Run/payout/payslip/bank/tax/settings → `payroll:*`
- HR payroll-inputs and legacy HR salary read → `hr:payroll:view` /
  `hr:payroll:generate` / `hr:salary:view` until FE migrated, then prefer
  `payroll:inputs:*` / `payroll:salaries:view` in one coordinated FE+BE change

**WFH:** self create uses the documented self attendance/time-off key already
enforced in e2e; approve uses the same approve scope as leave unless a dedicated
`hr:wfh:approve` is introduced in the same alias migration (do not leave FE/BE
split undocumented).

- [ ] **HRM-00-D07-A** alias map checked into `hr*.permissions.ts` + frontend
  catalog in one PR; role defaults migrated; dead keys removed after telemetry.

## D08 — Manager Team Home

**Status: LOCKED 2026-09-19 (program proceed).**

- ADD `/me/team` as the manager self-service roster (direct reports).
- Do not overload `/hr/employees` as the only manager surface.
- Approvals remain on `/hr/approvals` and leave/WFH tabs; `/me/team` is
  visibility + quick actions, not a second inbox.

- [ ] **HRM-00-D08-A** `/me/team` shipped with DataScope; catalog 14a row done.

## D09 — Reimbursements and FnF Canonical URLs

**Status: LOCKED 2026-09-19 (program proceed).**

- Reimbursement **ops UI** canonical: `/payroll/reimbursements`.
- `/hr/reimbursements` deleted after callers move (no legacy redirect).
- FnF **initiation**: `/hr/fnf`; **settlement**: `/payroll/fnf`.
- No duplicate settlement chrome on HR.

- [ ] **HRM-00-D09-A** single reimbursements UI; FnF handoff deep-link tested.

## D10 — Org Structure Compat Freezes

**Status: LOCKED 2026-09-19 (program proceed).**

- Mutations for BU/branch/dept/team/location use Organization hierarchy.
- `/hr/org` becomes a read-only hub or link-out, then is deleted after zero
  callers to `hr/org` compat write APIs.

- [ ] **HRM-00-D10-A** compat writes deprecated; FE uses hierarchy; route removed.

## D11 — Simulator Is Not a Customer Page

**Status: LOCKED 2026-09-19 (program proceed).**

- `/hr/simulator` removed from all customer nav.
- Gate behind platform-admin or delete if unused in production paths.

- [ ] **HRM-00-D11-A** nav/tests exclude simulator for normal HR roles.

## D12 — Settings Company Is Not an HR Page

**Status: LOCKED 2026-09-19 (program proceed).**

- `/hr/settings/company` redirect to `/settings/organization` is acceptable
  only until the hub card points directly at organization settings; then remove
  the HR route file.

- [ ] **HRM-00-D12-A** hub links canonical org settings; HR company route gone.

## D13 — Calendar Owns Time Surfaces

**Status: LOCKED (constitution + program).**

- `/calendar` is the only calendar.
- HR registers holidays, leave, birthdays, probation, approved WFH, optional
  planned WFO as sources.
- Attendance/leave pages may offer **embedded calendar view modes**; they do
  not create `/hr/calendar`.

- [ ] **HRM-00-D13-A** no parallel HR calendar route; sources registered.

## D14 — Page Catalog Is Authoritative for Anatomy

**Status: LOCKED 2026-09-19 (program proceed).**

- Keep/merge/remove decisions: HRM-02 + this file.
- Per-page filters, views, sheets, dialogs, APIs, cache: **HRM-14**.
- Implementers do not invent alternate anatomy that contradicts 14a–14f.

- [ ] **HRM-00-D14-A** HRM-01–13 defer to 14 for page-level detail; conflicts
  resolved by updating 14 then the domain PRD.

## Decision-Gate Acceptance

- [x] **HRM-00-A01** Phase 0 product gates HRM-00-001 through HRM-00-004 are
  satisfied by D01–D14 (disposition defaults locked here).
- [ ] **HRM-00-A02** each decision has a migration owner, dependency order, and
  release evidence row in HRM-11.
- [ ] **HRM-00-A03** HRM-01 through HRM-15 do not reopen these as implementation
  alternatives.
- [ ] **HRM-00-A04** `02`, `03`, `08`, `14b`, `14d`, `15` text reconciled to this
  file (no “decide later” left for D05–D07).
