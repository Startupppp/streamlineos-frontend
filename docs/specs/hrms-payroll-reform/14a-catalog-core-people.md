# HRM-14a — Catalog: Core People & Self-Service

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

> Parent: [14-page-catalog-readme.md](./14-page-catalog-readme.md)

## A. Home self-service (`/me/*`)

### `/me/time-off` — KEEP
- **Job:** Request/view leave and WFH.
- **Perm:** session (universal); mutations `self:leaves` / `self:attendance` as wired.
- **CTA:** Request leave | Request WFH.
- **Views:** Tabs (Leave | WFH | Approvals if manager); tables per tab.
- **Filters:** Leave: status, type, date range. WFH: status, month. URL: `tab`, `status`, `from`, `to`. Debounce N/A on selects; search N/A.
- **Pagination:** cursor ≤100 per tab list.
- **Components:** `LeavesWfhContent`, `PageWrapper`, `WfhRequestSheet`, leave request sheet, status badges, WFO/WFH copy (HRM-13).
- **Sheets/dialogs:** Leave request sheet; WFH request sheet; reject WFH/leave confirm + reason dialog.
- **Bulk:** none on self.
- **Backend:** `GET/POST /me/time-off/*`, `GET/POST /hr/wfh` or me aliases; tables `leave_requests`, `wfh_requests`, `leave_balances`; cache invalidate on create/decide; indexes `(org,user,status)`, `(org,user,date)`.
- **Scale:** never load full history unbounded; month windows default.

### `/me/attendance` — KEEP
- **Job:** Check-in/out; see history with WFO/WFH.
- **CTA:** Check in / Check out.
- **Views:** Timer card + day/week history table; optional mini calendar.
- **Filters:** date range (default current week/month).
- **Pagination:** history cursor ≤100.
- **Components:** `MyAttendancePage`, `TimerCard`, `daily-history-table`, regularization dialog.
- **Sheets/dialogs:** Regularization dialog; geofence failure dialog with Request WFH CTA.
- **Backend:** attendance check-in/out, status, logs; return `workLocation`; geofence verify; cache day status short TTL; invalidate on check-in and WFH approve.
- **Scale:** one active open attendance row per user/day.

### `/me/expenses` — KEEP
- **Job:** Submit/track own expenses.
- **Views:** Table/list.
- **Filters:** status, date range, category; search title debounced.
- **Pagination:** cursor ≤100.
- **Components:** `MyExpensesPage`, expense form dialog/sheet, receipt upload.
- **Sheets/dialogs:** Create/edit expense; delete confirm; submit confirm.
- **Backend:** expenses module APIs with `hr:expenses`/`self` keys; attachments storage; invalidate list on mutate.

### `/me/pay` — KEEP (Payroll ESS)
- **Job:** View/download own payslips.
- **Views:** List by period.
- **Filters:** year/period.
- **Pagination:** recent N + load more ≤100.
- **Components:** `MyPayrollPageContent`, download button.
- **Sheets/dialogs:** Payslip preview sheet (optional).
- **Backend:** `payroll/me` / ESS; IDOR-safe by actor; no admin cache shared with runs.
- **See also:** HRM-12 / 14f.

### `/me/documents` — KEEP
- **Job:** Personal vault + acknowledgements.
- **Views:** List/grid.
- **Filters:** type, status (pending ack), search debounced.
- **Pagination:** cursor ≤100.
- **Components:** `MyDocumentsPage`, preview sheet, ack confirm dialog.
- **Backend:** documents ACL subject=self; invalidate on upload/ack.
- **Current defects (2026-09-19):** status-only rows; no per-row
  upload/view/download; hard `limit: 100` with no pager.
  `frontend/PAGES.md` still claims `requirePermission`.
- [ ] **HRM-14A-DOC-001** Row actions by status; cursor past 100; fix
      PAGES.md gate note.

### `/me/onboarding` — KEEP
- **Job:** Complete assigned onboarding tasks.
- **Views:** Task list / checklist.
- **Filters:** status (open/done).
- **Pagination:** bounded task list (typically <50); still cap 100.
- **Components:** `MyOnboardingTasksPage`, task detail sheet.
- **Sheets/dialogs:** Task complete confirm; upload sheet.
- **Backend:** onboarding tasks self routes; invalidate userSession on gate complete.

### `/me/job-openings` — KEEP (universal)
- **Job:** Browse internal openings.
- **Views:** Cards/list.
- **Filters:** department, location, search debounced.
- **Pagination:** cursor ≤100.
- **Components:** `MyJobOpeningsPage`.
- **Sheets/dialogs:** Apply confirm; detail sheet.
- **Backend:** public-to-member job list; no candidate PII of others.
- **BOUNDARY note:** apply flow may touch recruitment APIs.

### `/me/referrals` — KEEP
- **Job:** Submit/track referrals.
- **Views:** Table.
- **Filters:** status.
- **Pagination:** cursor ≤100.
- **Components:** `MyReferralsPage`, refer sheet.
- **Backend:** referral create/list self-scoped.

### `/me/recruitment` — BOUNDARY
- See 14g. Keep route; no deep ATS anatomy here.

### `/me/team` — ADD (P0)
- **Job:** Manager sees direct reports attendance/leave/WFH at a glance.
- **Perm:** manager scope via reporting lines / DataScope.
- **Views:** Table + optional week calendar.
- **Filters:** workLocation WFO/WFH, leave status, date.
- **Components:** reuse employees scoped list + attendance badges.
- **Sheets:** quick approve leave/WFH.
- **Backend:** scoped team roster endpoint; no org-wide leak.
- **Checkbox:** [ ] **HRM-14a-001** ship `/me/team`.

---

## B. Directory

### `/directory` — KEEP
- **Job:** Company people discovery.
- **Views:** Table (default).
- **Filters:** search (name/email/title) 300ms, department/team if exposed.
- **Pagination:** cursor ≤100.
- **Components:** `PeopleDirectoryPage`, `DataTable`, person dialog/sheet.
- **Sheets/dialogs:** Read-only peek; admin edit only on settings basePath.
- **Backend:** `GET /directory/people`; projected columns; cache versioned per org; invalidate on person update.
- **Scale:** never `GET /hr/directory` 1000-cap path.

### `/directory/[personId]` — KEEP
- **Job:** Person profile.
- **Views:** Detail tabs (about, org, contact).
- **Filters:** none.
- **Components:** `PersonDetailPage`; backHref → `/directory`.
- **Sheets/dialogs:** Edit contact (if allowed) sheet; confirm sensitive changes.
- **Backend:** person get by id; tenant not-found; no cross-tenant.

### `/directory/workers` — KEEP
- **Job:** Workforce engagements.
- **Views:** Table.
- **Filters:** status, engagement type, search; modulesAny hrms|payroll.
- **Pagination:** cursor ≤100.
- **Components:** `WorkersPage`, engagement form sheet, archive confirm.
- **Backend:** workers/engagements SoR (DR-HRM-01); invalidate workers list + payroll profiles.

### `/directory/access` — KEEP
- **Job:** Directory ACL.
- **Views:** Table of roles/grants.
- **Filters:** search member.
- **Components:** `ModuleAccessPage`.
- **Sheets/dialogs:** Grant/revoke confirm.
- **Backend:** access grants; audit log; invalidate access cache.

### `/directory/settings` — KEEP
- Same as `/directory` with `basePath` admin + manage actions.
- **Extra sheets:** invite/edit person; deactivate confirm.
- **Bulk:** invite/assign where users-directory pattern applies.

### `/directory/settings/[personId]` — KEEP
- Admin person detail; backHref → `/directory/settings`.

---

## C. HR hub & overview

### `/hr` — KEEP
- **Job:** HR command hub with queues.
- **Views:** Hub cards/queues (not a collection table).
- **Filters:** none (queues pre-filtered pending).
- **Components:** `HrHubPage`, rich surface, queue cards.
- **Sheets:** none primary; cards deep-link.
- **Backend:** hub aggregate (pending leave, WFH, onboarding, docs); **must** use scoped queries; cache short TTL; invalidate with leave/WFH/onboard writers.
- **Scale:** parallel bounded fetches; no full-table scans.

### `/hr/dashboard` — KEEP
- **Job:** Analytics overview.
- **Views:** Charts + KPI tiles.
- **Filters:** date range, department (optional).
- **Pagination:** none (aggregates).
- **Components:** `HrDashboardPage`.
- **Backend:** dashboard metrics; all keys in `CACHE_KEYS`; full invalidator (HRM-07); DataScope audit.

### `/hr/approvals` — KEEP
- **Job:** Cross-workflow inbox (leave, WFH, expense, travel, attendance, docs).
- **Views:** Grouped list/table; filter by type.
- **Filters:** type, status, date, requester search debounced.
- **Pagination:** cursor ≤100.
- **Components:** `HrApprovalsPage`, approve/reject sheets.
- **Sheets/dialogs:** Approve confirm; reject reason sheet; bulk approve bar (P0).
- **Backend:** unified or fan-in pending endpoints; per-type decide APIs; invalidate each domain cache.

### `/hr/announcements` — KEEP (Home nav only)
- **Job:** Publish/read company announcements.
- **Views:** List + composer.
- **Filters:** status (draft/published), search.
- **Pagination:** cursor ≤100.
- **Components:** `AnnouncementsAdminPage`, composer sheet.
- **Sheets/dialogs:** Create/edit sheet; publish/unpublish confirm; delete confirm.
- **Backend:** announcements CRUD; audience ACL; invalidate list + home badge if any.

---

## D. Employees & org

### `/hr/employees` — KEEP (reference page)
- **Job:** Org employee directory (HR admin).
- **Views:** Table | Card grid (`ViewToggle`).
- **Filters:** search, department, status/active, role; **ADD:** manager, location, employmentStatus, hired range, skill, custom fields (HRM-04). URL synced.
- **Pagination:** cursor ≤100.
- **Components:** `EmployeesListPage`, `employees-filters`, `DataTable`, `ViewToggle`, export.
- **Sheets/dialogs:** Onboard/create sheet; edit sheet; deactivate/exit confirm; bulk bar (dept/manager/deactivate).
- **Backend:** `GET /hr/employees` listEmployeesSchema; cache `hr:employees:list`; EmploymentFacts join; indexes `(org,dept,active)`.
- **Scale:** no client-side filter of full dump.

### `/hr/employees/[employeeId]` — KEEP
- **Job:** Employee profile & HR actions.
- **Views:** Tabs (profile, job, time, docs, assets, notes).
- **backHref:** `/hr/employees` + restored filters.
- **Components:** `EmployeeDetailsView`; OS deep-links (chat/mail) P1.
- **Sheets/dialogs:** Edit sections; assign asset; terminate confirm.
- **Backend:** employee get scoped; patch with Zod; audit trail.

### `/hr/employees/skills-matrix` — KEEP
- **Job:** Skill coverage matrix.
- **Views:** Matrix grid (bounded axes).
- **Filters:** team, skill category, search.
- **Pagination:** page employees ≤100; skills catalog separate.
- **Backend:** batched skill reads; forbid Cartesian explosion.

### `/hr/employees/find-expert` — KEEP
- **Job:** Find people by skill.
- **Views:** Result list/cards.
- **Filters:** skill (dynamic), department; search **must** debounce 300ms.
- **Backend:** skill search indexed; scoped.

### `/hr/org-chart` — KEEP
- **Job:** Reporting graph.
- **Views:** Org graph (neighborhood expand) — **not** paginated table of all nodes.
- **Filters:** search person → focus node; parentId expand.
- **Components:** `OrgChartPage`.
- **Backend:** orgChartQuerySchema; neighborhood query; never full org blob.

### `/hr/org` — MERGE/MOVE → hierarchy
- **Job:** Job architecture / org structure hub (compat).
- **Views:** Hub links.
- **Backend:** deprecate `hr/org` compat; FE → `organization/hierarchy`.
- **Checkbox:** [ ] **HRM-14a-002** migrate then delete route.

### `/hr/positions` — KEEP
- **Job:** Position catalog.
- **Views:** Table.
- **Filters:** status, department, search.
- **Pagination:** cursor ≤100.
- **Sheets:** create/edit position; archive confirm.
- **Backend:** positions tables; invalidate positions list.

### `/hr/onboarding` — KEEP
- **Job:** Admin onboarding queue.
- **Views:** Table.
- **Filters:** status, cohort, search, date.
- **Pagination:** cursor ≤100.
- **Sheets:** start onboard; bulk onboard; assign checklist.
- **Backend:** onboard + bulk onboard; invalidate employees + dashboard + celebrations.

### `/hr/onboarding/[userId]` — KEEP
- **Job:** Person onboarding progress.
- **backHref:** `/hr/onboarding`.
- **Views:** Checklist detail.
- **Sheets:** task override; complete confirm.

### `/hr/onboarding/probation` — KEEP (secondary)
- **Job:** Probation queue.
- **Views:** Table.
- **Filters:** status, end-date range, manager.
- **Sheets:** extend/close probation confirm.

### `/employee-onboarding` — KEEP
- **Job:** New-hire wizard (outside HR chrome).
- **Views:** Multi-step wizard.
- **Filters:** none.
- **Components:** `EmployeeOnboardingShell` + step schemas.
- **Dialogs:** abandon confirm; submit confirm.
- **Backend:** onboarding draft Zod; bank/personal; complete gate stamps DB.

### `/hr/access` — KEEP
- Module access for HR product — same pattern as directory access.

---

## Cross-cutting checkboxes

- [ ] **HRM-14a-010** all §A–D rows implemented or explicitly deferred with owner.
- [ ] **HRM-14a-011** `/hr/settings/company` redirect documented in 14e (not duplicated here as a page).
- [ ] **HRM-14a-012** Evidence: employees + directory + me attendance/time-off browser journeys.
