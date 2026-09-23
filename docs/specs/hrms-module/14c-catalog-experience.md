# HRM-14c — Catalog: Experience (Comp, Docs, Assets, Performance)

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

> Parent: [14-page-catalog-readme.md](./14-page-catalog-readme.md)

## Compensation & benefits

### `/hr/benefits` — KEEP
- **Job:** Plans, enrollments, claims (tabbed).
- **Views:** Tabs My | Claims | Plans admin; tables.
- **Filters:** per tab — status, plan, employee search, date.
- **Pagination:** cursor ≤100 per tab.
- **Sheets:** enroll; claim create; plan create/edit; approve/reject claim confirm.
- **Backend:** benefit tables; scoped reads; invalidate enrollments/claims.

### `/hr/compensation-planning` — KEEP
- **Job:** Comp cycles / worksheets.
- **Views:** Cycle list + worksheet table.
- **Filters:** cycle, department, status.
- **Dialogs:** launch cycle confirm; lock cycle confirm.
- **Backend:** comp planning tables; bound worksheets; audit.

### `/hr/equity` — KEEP
- **Job:** Equity grants.
- **Views:** Table.
- **Filters:** status, employee, vest date range.
- **Sheets:** grant create/edit; cancel confirm.
- **Backend:** equity tables; sensitive ACL.

### `/hr/expenses` — KEEP (admin)
- **Job:** Org expense review.
- **Views:** Table.
- **Filters:** status, category, claimant, date, amount range; search 300ms.
- **Pagination:** cursor ≤100.
- **Components:** `expense-filters`, sheets.
- **Sheets/dialogs:** detail; approve/reject; bulk approve.
- **Backend:** expenses module; `hr:expenses:*`; invalidate lists.

### `/hr/reimbursements` — MERGE→`/payroll/reimbursements`
- Prefer payroll canonical UI; if kept, thin deep-link only.
- **Checkbox:** [ ] **HRM-14c-001** remove duplicate or document single owner.

### `/hr/travel` — KEEP
- **Job:** Travel requests.
- **Views:** Cards/table.
- **Filters:** status, date, traveler search.
- **Sheets:** create/edit travel; cancel confirm.
- **Backend:** travel_requests; policy; invalidate.

### `/hr/travel/approvals` — KEEP
- **Job:** Approve travel.
- **Views:** Table; calendar of trips optional.
- **Filters:** status, date.
- **Dialogs:** approve/reject reason.
- **Bulk:** approve P1.

---

## Documents

### `/hr/documents` — KEEP
- **Job:** Document library.
- **Views:** Table | Grid (`ViewToggle`).
- **Filters:** type, status, owner, subject employee, sensitivity, expiring; search 300ms.
- **Pagination:** cursor ≤100.
- **Components:** `document-filters`, upload sheet.
- **Sheets/dialogs:** upload; preview; archive confirm; request ack.
- **Bulk:** request ack; archive.
- **Backend:** documents; typed filters; expiry query; invalidate library.
- **Current defects (2026-09-19):** filters not URL-synced; “folders” are
  `localStorage`; grid `viewMode` is never passed to the table (dead
  toggle); bulk ZIP is current page only, not selection; History is a
  stub toast; leading-wildcard `ILIKE`; letters queried on library load.
- [ ] **HRM-14C-DOC-001** URL-sync library filters; implement or remove
      grid toggle; replace client folders or persist categories.
- [ ] **HRM-14C-DOC-002** Real row selection + bulk; remove or ship
      version history.

### `/hr/documents/editor/new` · `/hr/documents/editor/[documentId]` — KEEP
- **Job:** Rich document edit.
- **Views:** Editor canvas.
- **backHref:** `/hr/documents`.
- **Dialogs:** unsaved guard; publish confirm.
- **Backend:** document get/put; versioning if any.

### `/hr/documents/templates` · `.../new` · `.../[templateId]/edit` — KEEP
- **Job:** Template CRUD.
- **Views:** Table; editor.
- **Filters:** search, type.
- **Sheets/dialogs:** create; delete confirm; unsaved guard.
- **Backend:** templates; invalidate template options.

### `/hr/document-types` — KEEP
- **Job:** Type catalog (required fields, expiry rules).
- **Views:** Table.
- **Sheets:** create/edit; delete confirm.
- **Backend:** document types; small catalog still capped.
- **Current defects:** UI reads `applicableRoles`; API is `roles[].roleSlug`
  (`document-type-list.tsx`, `config-response.schemas.ts`). FE
  `isMandatory` default false vs BE default true. Inline Zod in `.tsx`.
  No search; hook drains `limit: 100`.
- [ ] **HRM-14C-DOC-003** Map `roles[].roleSlug` end-to-end; align
      mandatory default; move schema to `*-schema.ts`; add search.

### `/hr/document-review` — KEEP
- **Job:** Review queue.
- **Views:** Table.
- **Filters:** status, type, assignee.
- **Sheets:** review decide; reject reason.
- **Backend:** review queue scoped.
- **Current defects:** sidebar + page gate `hr:documents:view`; list query
  `hr:onboarding:manage`; action UI `hr:employees:manage`. FE omits
  `REJECTED` though API allows it. Filters not URL-synced.
- [ ] **HRM-14C-DOC-004** Gate route, nav, and actions on
      `hr:onboarding:manage`. Wire Reject. URL-sync filters.

Self-service `/me/documents` is owned by
[14a](./14a-catalog-core-people.md) (`HRM-14A-DOC-001`).

### `/hr/handbook` — KEEP
- **Job:** Handbook publish/read.
- **Views:** Article list + reader.
- **Filters:** search (**debounce**), section.
- **Sheets:** edit article; publish confirm.
- **Backend:** handbook content; CDN/storage as designed.

### `/hr/email-templates` — KEEP
- **Job:** HR email templates.
- **Views:** Table.
- **Filters:** search debounce, category.
- **Sheets:** edit template; delete confirm.
- **Backend:** templates; preview render.

### `/hr/background-verification` — KEEP
- **Job:** BGV cases.
- **Views:** Table.
- **Filters:** status, employee, vendor, date.
- **Sheets:** initiate BGV; status update; cancel confirm.
- **Backend:** BGV tables; vendor integration via Composio if any.

---

## Assets

### `/hr/assets` — KEEP (strong reference)
- **Job:** Asset inventory.
- **Views:** Table.
- **Filters:** status, type, location, assignee, warranty; toolbar.
- **Pagination:** cursor ≤100.
- **Components:** `asset-filter-toolbar`, assign sheet.
- **Sheets/dialogs:** create; assign; retire confirm.
- **Bulk:** assign location; mark repair.
- **Backend:** assets; indexes; invalidate on assign.

### `/hr/asset-returns` — KEEP
- **Job:** Return queue.
- **Views:** Table.
- **Filters:** status, employee, date.
- **Sheets:** process return; damage confirm.
- **Backend:** returns; link assets.

---

## Performance

### `/hr/performance` — KEEP
- **Job:** Performance home / cycles.
- **Views:** Hub + cycle list; calendar accents.
- **Filters:** cycle, status.
- **Sheets:** create cycle; launch confirm.
- **Backend:** review cycles; scoped.

### `/hr/performance/analytics` — KEEP (extract inline)
- **Job:** Performance analytics charts.
- **Views:** Charts + DataTable drilldown.
- **Filters:** cycle, department, date.
- **Maintainability:** move inline page into `features/hr/performance/*`.
- **Checkbox:** [ ] **HRM-14c-002** extract feature module.

### `/hr/goals` — KEEP
- **Job:** Goals OKRs.
- **Views:** Table | Cards.
- **Filters:** status, cycle, owner, team, progress range.
- **Sheets:** create/edit goal; archive confirm; KR editor.
- **Backend:** goals/key_results; scoped by owner/team.

### `/hr/kpis` — KEEP
- **Job:** KPI library + competency frameworks (tabs).
- **Views:** Tabbed tables.
- **Filters:** search, category.
- **Sheets:** create KPI/framework.
- **Backend:** KPI tables.

### `/hr/feedback` — KEEP
- **Job:** 360 / continuous feedback.
- **Views:** List/cards.
- **Filters:** cycle, status, subject search.
- **Sheets:** request feedback; submit response; close confirm.
- **Backend:** feedback tables; privacy ACL.

---

## Cross-cutting

- [ ] **HRM-14c-010** documents expiry filter + notifications.
- [ ] **HRM-14c-011** assets + expenses bulk paths.
- [ ] **HRM-14c-012** Evidence: document ack + asset assign + goal create.
