# HRM-14f — Catalog: Payroll (every page)

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

> Parent: [14-page-catalog-readme.md](./14-page-catalog-readme.md) · Companion: [HRM-12](./12-payroll-prd.md)

Global payroll defaults: cursor ≤100; debounce 300ms; sheets elevated vs page;
`payroll:*` / `hr:payroll*` alias collapse via HRM-08; cache keys in `CACHE_KEYS`;
invalidate on run lock, payout publish, salary change, input rebuild, WFH/leave
affecting open periods.

### `/payroll` — KEEP — Command center
- **Views:** Hub queues + KPIs.
- **Filters:** none (pre-aggregated).
- **Components:** `PayrollCommandCenterPage`.
- **Backend:** command-center aggregate; bounded pending exceptions; short TTL cache.

### `/payroll/team` — KEEP — Manager team payroll
- **Perm:** `self:payroll`.
- **Views:** Table of reports’ pay status.
- **Filters:** period, status.
- **Pagination:** cursor ≤100 scoped to reports.
- **Backend:** manager payroll insights; DataScope.

### `/payroll/runs` — KEEP
- **Views:** Table.
- **Filters:** status, period, year; search run name/code.
- **Pagination:** cursor ≤100.
- **Dialogs:** create run; delete draft confirm.
- **Backend:** runs list Zod; indexes `(org,status,period)`.

### `/payroll/runs/[runId]` — KEEP
- **Views:** Detail tabs — summary, employees, inputs, exceptions, payout.
- **backHref:** `/payroll/runs` + filters.
- **Filters (employees tab):** status, exception, search; **wire runEmployeeContract**.
- **Pagination:** run employees cursor ≤100.
- **Dialogs:** lock/close/reopen confirms; exclude employee confirm; recompute.
- **Bulk:** resolve exceptions; publish payslips.
- **Backend:** run detail; inputs; exceptions; payout; transactional lock; invalidate run + payslips + me pay.

### `/payroll/employees` — KEEP
- **Views:** DataTable salary profiles.
- **Filters:** search, department, active, structure.
- **Pagination:** cursor ≤100.
- **Sheets:** assign structure; edit compensation; history.
- **Backend:** payroll employees; Directory/HR subject per DR-HRM-01.

### `/payroll/employees/[employeeUserId]` — KEEP
- **Views:** Profile detail + history tables.
- **backHref:** `/payroll/employees`.
- **Sheets:** edit assignment; end assignment confirm.

### `/payroll/workers/[workerId]` — KEEP (secondary)
- **Views:** Contingent worker pay profile.
- **Entry:** from workers/employees — no sidebar row required.
- **Sheets:** edit engagement pay.

### `/payroll/inputs` — KEEP
- **Job:** Period inputs from attendance/leave/OT/WFH/reimbursements.
- **Views:** Period table; period detail.
- **Filters:** status, month; calendar picker.
- **Dialogs:** build/rebuild confirm; lock/unlock confirm; adjustment approve/reject.
- **Backend:** `hr/payroll-inputs` + payroll UI; batch projections; include **WFH paid**; invalidate on rebuild.

### `/payroll/salary-structures` — KEEP
- **Views:** Table/cards.
- **Filters:** active, search.
- **Sheets/dialogs:** create/edit structure; archive confirm.
- **Backend:** structures; version carefully.

### `/payroll/templates` — KEEP
- **Views:** Table.
- **Filters:** search, active.
- **Sheets/dialogs:** edit template; delete confirm.

### `/payroll/components` — KEEP
- **Views:** DataTable.
- **Filters:** type (earning/deduction), search.
- **Sheets/dialogs:** create/edit; delete confirm.
- **Backend:** components catalog.

### `/payroll/reimbursements` — KEEP (canonical)
- **Views:** Table.
- **Filters:** status, employee, date, amount.
- **Sheets:** payout act; reject confirm.
- **Bulk:** approve/reject.
- **Backend:** claims; align with expenses; invalidate.

### `/payroll/bonuses` — KEEP
- **Views:** Table.
- **Filters:** period, status, employee search.
- **Sheets:** create bonus; void confirm.
- **Backend:** `hr/bonuses` or payroll hr-payroll; permission `hr:bonuses:manage`.

### `/payroll/loans` — KEEP
- **Views:** Table.
- **Filters:** status, employee.
- **Sheets:** create loan/schedule; close confirm.
- **Backend:** loans; run loan-adjustments.

### `/payroll/taxes` — KEEP
- **Views:** Windows/tables.
- **Filters:** jurisdiction, period.
- **Sheets:** configure window; file confirm (if filings).
- **Backend:** tax windows; filings submodule.

### `/payroll/bank-transfers` — KEEP
- **Views:** Batches table.
- **Filters:** run, status.
- **Sheets:** create batch; mark sent confirm.
- **Bulk:** mark sent idempotent.
- **Backend:** payout batches; **fix Query key collision** (run id vs batch id).
- **Checkbox:** [ ] **HRM-14f-001** fix payout-batch-key-collision.

### `/payroll/payslips` — KEEP
- **Views:** Table.
- **Filters:** period, employee, published.
- **Pagination:** cursor ≤100.
- **Actions:** preview, download, republish, void confirm.
- **Bulk:** publish for run.
- **Backend:** publications; IDOR-safe download.

### `/payroll/fnf` — KEEP — Settlement
- **Views:** Table + settlement detail.
- **Filters:** status, employee.
- **Sheets:** settle confirm; reverse (permissioned).
- **Entry:** from `/hr/fnf` initiate.
- **Backend:** fnf settlement; money movement owner.

### `/payroll/reports` — KEEP
- **Views:** Report picker + results; calendar period.
- **Filters:** report type, period.
- **Backend:** reports; export jobs for large.

### `/payroll/access` — KEEP
- Module access pattern.

### `/payroll/settings` — KEEP
- **Views:** Policy settings forms.
- **Dialogs:** save confirm; unsaved guard.
- **Backend:** payroll policies.

### `/payroll/settings/import-export` — KEEP
- Same pattern as HR import-export for payroll entities.

### `/payroll/setup` — KEEP + **ADD NAV**
- **Job:** First-run wizard.
- **Views:** Multi-step wizard.
- **Dialogs:** abandon confirm; finish confirm.
- **Nav:** Settings → Setup (HRM-12-001).
- **Backend:** entities, policies, bank, tax profile bootstrap.
- **Checkbox:** [ ] **HRM-14f-002** sidebar entry + route-access test.

### `/me/pay` — KEEP
- Documented in 14a; ESS only.

### `/payroll/me` — REMOVE
- Retired; purge callers.

---

## Schema / scalability notes (payroll)

| Area | Tables (folder) | Notes |
|------|-----------------|-------|
| Runs | `schema/payroll/runs*` | Event-sourced run events; bound employee pages |
| Inputs | `inputs`, `input-capture` | Rebuild must batch attendance/leave/WFH |
| Payout | `payout`, payslip publications | Idempotent publish |
| Setup | templates, components, policies, entities-periods | Version breaking changes |
| Workforce | workforce pay profiles | Align Directory workers |

- [ ] **HRM-14f-010** every payroll list has Zod query + ≤100.
- [ ] **HRM-14f-011** journey evidence: setup → salary → inputs → run → payslip → `/me/pay`.
- [ ] **HRM-14f-012** disposable DB proof ≥500 employees run generate.
