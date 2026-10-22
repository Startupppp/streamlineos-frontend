# HRM-14b — Catalog: Time, Leave, WFH/WFO

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

> Parent: [14-page-catalog-readme.md](./14-page-catalog-readme.md) · Companion: [HRM-13](./13-wfh-wfo-prd.md)

## Attendance & time ops

### `/hr/attendance` — KEEP
- **Job:** Team attendance admin; WFO/WFH visibility.
- **Views:** Table (default) | **Calendar month** (required ADD) | day timeline optional.
- **Filters:** date range (required), status, **workLocation WFO|WFH**, department, shift, exception-only, geofence breach, search employee 300ms. URL synced.
- **Pagination:** logs cursor ≤100; calendar loads month window only.
- **Components:** `AttendanceContent`, team cards, `ViewToggle`, filter toolbar, status + workLocation badges.
- **Sheets/dialogs:** Regularize sheet; exception resolve confirm; bulk regularize bar.
- **Backend:** attendance logs/team-status; Zod query; projected columns; indexes `(org,date,status)`, `(org,membership,date)`; invalidate on check-in/regularize/WFH approve.
- **Scale:** no download-all-month-then-filter client-side for large orgs.

### `/hr/shifts` — KEEP
- **Job:** Shift definitions.
- **Views:** Table.
- **Filters:** active, search name.
- **Pagination:** ≤100 (often small catalog — still capped).
- **Sheets:** create/edit shift; delete confirm.
- **Backend:** shifts CRUD; invalidate shift options cache used by rosters/attendance filters.

### `/hr/rosters` — KEEP
- **Job:** Assign shifts to people/days; planned WFO/WFH (P1).
- **Views:** Week grid / table.
- **Filters:** team, week start, location.
- **Pagination:** week window; employees in scope ≤100 per fetch or virtualize.
- **Sheets:** assign shift; copy week confirm; planned workLocation select.
- **Backend:** roster entries; batch writes; invalidate roster + attendance expected mode.

### `/hr/overtime` — KEEP
- **Job:** OT requests/logs.
- **Views:** Table.
- **Filters:** status, date range, department, search.
- **Pagination:** cursor ≤100.
- **Sheets:** create OT; approve/reject reason dialog; bulk approve P1.
- **Backend:** OT tables; policy eval; invalidate OT list + payroll inputs if open.

### `/hr/geofencing` — KEEP
- **Job:** Configure office geofences for **WFO** enforcement.
- **Views:** List + map preview if available.
- **Filters:** location, active.
- **Sheets:** create/edit geofence; delete confirm.
- **Backend:** geofence CRUD; used at check-in; cache per org locations.

### `/hr/biometric` — KEEP (HRM-00 D06)
- **Job:** Biometric event review / reconcile.
- **Nav:** Child of **Time clocks** (sibling of Devices).
- **Views:** Table.
- **Filters:** device, date, status, employee search.
- **Pagination:** cursor ≤100.
- **Sheets:** reconcile event → attendance confirm.
- **Backend:** biometric events; bound reads.

### `/hr/devices` — KEEP (HRM-00 D06)
- **Job:** Time-clock devices registry.
- **Nav:** Child of **Time clocks**.
- **Views:** Table.
- **Filters:** status, location, search.
- **Sheets:** register device; disable confirm.
- **Backend:** devices table; status enum.
- Deep-link empty states between Devices ↔ Biometric.

### `/hr/work-logs` — KEEP
- **Job:** Review work logs / timesheet-like entries.
- **Views:** Table; advanced filter sheet.
- **Filters:** date, employee, project/cost (if any), status; advanced sheet.
- **Pagination:** cursor ≤100.
- **Components:** `work-log-filters`, advanced filter sheet.
- **Backend:** work logs; scope; no unbounded export without job.

### `/hr/comp-off` — KEEP
- **Job:** Comp-off balance/requests.
- **Views:** Table + calendar accents.
- **Filters:** status, employee, date.
- **Sheets:** request/grant sheet; approve dialog.
- **Backend:** comp-off ledger; policy; invalidate balances.

---

## Leave & WFH

### `/hr/leaves` — KEEP
- **Job:** Admin leave + WFH + approvals (`LeavesWfhContent`).
- **Views:** Tabs Leave | WFH | Approvals; tables; team calendar overlay P0.
- **Filters:**  
  - Leave: status, type, date range, dept, employee search.  
  - WFH: status, date range, dept, approver, employee.  
  URL: `tab`, filters. Debounce search 300ms.
- **Pagination:** each list cursor ≤100 (**fix team leaves 500 cap**).
- **Components:** shared with `/me/time-off`; admin chrome; bulk approve bar.
- **Sheets/dialogs:** leave decide; WFH decide; reject reason; cancel confirm; bulk reject reason.
- **Backend:** leaves + wfh services; narrow `with:`; `invalidateHrOrgCaches` + leave-analytics namespace; payroll paid path for WFH.
- **Scale:** keyset; projected employee fields only.

### `/hr/leave-policies` — KEEP
- **Job:** Leave + **wfh** policy config.
- **Views:** Table of policies.
- **Filters:** type (leave|wfh), active.
- **Sheets:** policy editor sheet; version confirm; delete confirm.
- **Backend:** policies + evaluation; invalidate policy summary caches.

### `/hr/holidays` — KEEP
- **Job:** Holiday calendar (org + **location**).
- **Views:** Calendar | List | Location (finish incomplete location view).
- **Filters:** year, location (dynamic).
- **Pagination:** year-bounded; no fake pages of days.
- **Sheets:** create holiday; delete confirm; location assign.
- **Backend:** holidays; location mapping; calendar source registration.
- **Checkbox:** [ ] **HRM-14b-001** complete location view end-to-end.

### `/hr/leaves/analytics` — KEEP
- **Job:** Leave/WFH usage analytics.
- **Views:** Charts + tables.
- **Filters:** date range, department, type including WFH.
- **Pagination:** aggregates; drilldown tables ≤100.
- **Backend:** leave-analytics namespace cache; invalidate on leave/WFH decide.

---

## Cross-cutting checkboxes

- [ ] **HRM-14b-010** attendance calendar + workLocation filter shipped.
- [ ] **HRM-14b-011** WFH admin filters URL-synced + bulk decide.
- [ ] **HRM-14b-012** team leaves API ≤100 + cursor.
- [ ] **HRM-14b-013** geofence failure ↔ Request WFH CTA wired.
- [ ] **HRM-14b-014** Evidence: WFO check-in + WFH approve → attendance + payroll input.
