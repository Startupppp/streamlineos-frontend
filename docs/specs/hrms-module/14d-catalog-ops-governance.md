# HRM-14d — Catalog: Ops, Exit, Governance, Analytics

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

> Parent: [14-page-catalog-readme.md](./14-page-catalog-readme.md)

## Workforce & people ops

### `/hr/workforce` — KEEP
- **Job:** Headcount / workforce planning overview.
- **Views:** KPI + tables/charts.
- **Filters:** period, department, employment type.
- **Pagination:** aggregates; drilldowns ≤100.
- **Backend:** analytics-plus / workforce plans; cached metrics; invalidate on hire/terminate.

### `/hr/workforce-cost` — KEEP (read-only vs payroll runs)
- **Job:** Cost analytics.
- **Views:** Charts + tables; date controls.
- **Filters:** period, department, cost center.
- **Backend:** read models only; **must not** mutate payroll runs; cache period keys.

### `/hr/contingent` — KEEP
- **Job:** Contingent/contractor engagements.
- **Views:** Table.
- **Filters:** status, vendor, end-date, search.
- **Sheets:** create/edit engagement; end confirm.
- **Backend:** contracts/contingent tables; Directory workers link (DR-HRM-01).

### `/hr/cases` — KEEP
- **Job:** HR cases.
- **Views:** Table; optional status board P2.
- **Filters:** status, category, priority, assignee, requester, SLA, created range; `cases-filter-bar`.
- **Pagination:** cursor ≤100.
- **Sheets/dialogs:** create case; assign; status change; close confirm; bulk assign/status.
- **Backend:** hr_cases; scoped; custom-field filters when enabled.

### `/hr/service-delivery` — MERGE → Cases (HRM-00 D05)
- **Job:** None distinct — fold into `/hr/cases`.
- **Action:** migrate records/links/permissions; delete route; extract survivors
  into `features/hr/cases`.
- **Checkbox:** [ ] **HRM-14d-001** MERGE complete; zero callers.

### `/hr/helpdesk` — KEEP
- **Job:** Employee helpdesk tickets.
- **Views:** Tabs/queues; table.
- **Filters:** status, category, assignee, q search 300ms; listSchema parity.
- **Pagination:** cursor ≤100.
- **Sheets:** create; assign; resolve confirm; bulk assign/status.
- **Backend:** helpdesk_tickets; strong existing Zod list schema — keep as pattern.

### `/hr/engagement` — KEEP
- **Job:** Surveys / engagement pulses.
- **Views:** Campaign list + results.
- **Filters:** status, date.
- **Sheets:** launch survey; close confirm.
- **Backend:** engagement tables; anonymous aggregate rules.

### `/hr/accommodations` — KEEP
- **Job:** Workplace accommodations.
- **Views:** Table.
- **Filters:** status, employee, type.
- **Sheets:** create/review; approve confirm (sensitive).
- **Backend:** accommodations; strict ACL; audit.

---

## Compliance & risk

### `/hr/compliance` — KEEP
- **Job:** Compliance tracking.
- **Views:** Table/calendar deadlines.
- **Filters:** status, framework, due range.
- **Sheets:** create item; complete confirm.
- **Backend:** compliance records; reminders.

### `/hr/safety` — KEEP
- **Job:** Safety incidents.
- **Views:** Table.
- **Filters:** status, severity, date, location; search debounce.
- **Sheets:** report incident; close confirm.
- **Backend:** safety tables; scoped.

### `/hr/emergency` — KEEP
- **Job:** Emergency contacts / plans.
- **Views:** Table.
- **Filters:** location, search.
- **Sheets:** edit plan/contact; delete confirm.
- **Backend:** emergency tables.

### `/hr/labor-relations` — KEEP
- **Job:** Labor relations cases/notes.
- **Views:** Tabbed tables.
- **Filters:** status, union, date.
- **Sheets:** create note/case; restrict ACL.
- **Backend:** labor tables; sensitive.

### `/hr/legal-holds` — KEEP (enterprise)
- **Job:** Legal holds.
- **Views:** Table.
- **Filters:** status, subject search.
- **Sheets:** place hold; release confirm (strong).
- **Backend:** legal holds; entitlement gate; audit immutable.

### `/hr/retention` — KEEP
- **Job:** Retention policies.
- **Views:** Policy list.
- **Filters:** entity type, active.
- **Sheets:** edit policy; apply confirm.
- **Backend:** retention rules; job scheduling.

### `/hr/identity` — KEEP
- **Job:** Identity governance hooks.
- **Views:** Table.
- **Filters:** status, system, user search.
- **Sheets:** review access; revoke confirm.
- **Backend:** identity tables; integrate carefully with platform auth.

### `/hr/delegations` — KEEP
- **Job:** Approval delegations.
- **Views:** Table (+ sheet-as-page pattern today — prefer page+sheet).
- **Filters:** active, delegator search.
- **Sheets:** create delegation; revoke confirm.
- **Backend:** delegations; invalidate workflow assignee resolution.

### `/hr/event-stream` — KEEP (ops; not default nav)
- **Job:** HR event stream / audit feed.
- **Views:** Table (append-only feel).
- **Filters:** type, date, actor search.
- **Pagination:** cursor ≤100 **required**.
- **Backend:** event stream; no huge first page; TTL cache optional.

### `/hr/simulator` — REMOVE from customer nav (HRM-00 D11)
- **Job:** Dev/admin simulator.
- **Disposition:** platform-admin only or delete.
- **Checkbox:** [ ] **HRM-14d-002** remove from product nav / gate.

---

## Exit

### `/hr/exit` — KEEP
- **Job:** Exit management overview/checklists.
- **Views:** Table/queues.
- **Filters:** status, last day range, department.
- **Sheets:** start exit; checklist item; cancel confirm.
- **Backend:** exit checklists; invalidate workforce metrics.

### `/hr/fnf` — KEEP (initiate only)
- **Job:** Initiate full & final → deep-link `/payroll/fnf`.
- **Views:** Initiation form/list.
- **Sheets:** initiate confirm; open payroll settlement CTA.
- **Backend:** create settlement request; payroll owns money movement.
- **See:** HRM-12.

### `/hr/termination` — KEEP
- **Job:** Termination workflow.
- **Views:** Form + status.
- **Sheets/dialogs:** terminate confirm (destructive); effective date required.
- **Backend:** terminations; invalidate employees, dashboard, celebrations, directory caches.

---

## Analytics

### `/hr/analytics` — KEEP
- **Job:** HR analytics suite.
- **Views:** Charts + filterable drilldowns.
- **Filters:** date range, department.
- **Backend:** analytics caches; shared invalidator; scope audit.

---

## Cross-cutting

- [ ] **HRM-14d-010** cases + helpdesk bulk assign/status.
- [x] **HRM-14d-011** service-delivery disposition **locked MERGE** (HRM-00 D05);
  execution checkbox remains HRM-14d-001.
- [ ] **HRM-14d-012** simulator nav removed (HRM-00 D11).
- [ ] **HRM-14d-013** Evidence: case create + exit initiate + helpdesk resolve.
