# HRM-14e — Catalog: HR Settings

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

> Parent: [14-page-catalog-readme.md](./14-page-catalog-readme.md)

Settings are configuration, not operational work. Each page: loading/error/empty,
permission gate, unsaved guards on editors.

### `/hr/settings` — KEEP
- **Job:** Settings hub grid.
- **Views:** Hub cards (`HubGrid`).
- **Filters:** none.
- **Components:** settings-hub mode.
- **Backend:** optional aggregate; mostly links.

### `/hr/settings/company` — REDIRECT
- **Live behavior:** redirects to `/settings/organization`.
- **Disposition:** KEEP redirect **or** REPLACE hub card to point directly at
  organization settings; do not build a duplicate company page.
- **Checkbox:** [ ] **HRM-14e-001** hub link targets canonical org settings; document in PAGES.md.

### `/hr/settings/import-export` — KEEP
- **Job:** Import/export jobs UI.
- **Views:** Jobs table.
- **Filters:** status, entity type, date.
- **Pagination:** cursor ≤100.
- **Sheets:** start import; download export; cancel job confirm.
- **Backend:** `hr_import_jobs` / `hr_export_jobs`; async; progress polling; invalidate entity lists on success.

### `/hr/settings/integrations` — KEEP
- **Job:** HR-related Composio/integrations surface.
- **Views:** Connection cards/list.
- **Sheets:** connect/disconnect confirm.
- **Backend:** integrations module; never store provider tokens in HR tables.

### `/hr/settings/policies` — KEEP
- **Job:** Policy engine admin (includes leave/wfh/attendance types).
- **Views:** DataTable.
- **Filters:** type, active, search.
- **Sheets/dialogs:** edit policy; publish version confirm; delete confirm.
- **Backend:** policies; versions; invalidate evaluation caches.

### `/hr/settings/workflows` — KEEP
- **Job:** Workflow definitions.
- **Views:** List + editor sheet.
- **Filters:** status, entity.
- **Sheets/dialogs:** edit; activate/deactivate confirm.
- **Backend:** workflow defs/instances; invalidate pending approval resolvers.

### `/hr/settings/templates` — KEEP
- **Job:** Letter/HR templates settings.
- **Views:** DataTable.
- **Filters:** category, search.
- **Sheets/dialogs:** edit; delete confirm.
- **Backend:** template engine.

### `/hr/settings/forms` — KEEP
- **Job:** HR forms catalog.
- **Views:** DataTable.
- **Filters:** status, search.
- **Sheets:** create form meta; archive confirm.
- **Backend:** forms; link builder.

### `/hr/settings/forms/[formId]` — KEEP
- **Job:** Form builder.
- **Views:** Builder canvas.
- **backHref:** `/hr/settings/forms`.
- **Dialogs:** unsaved guard; publish confirm.
- **Backend:** form schema put; validate field types.

### `/hr/settings/forms/[formId]/submissions` — KEEP
- **Job:** Form submissions list.
- **Views:** DataTable.
- **Filters:** date, status, submitter search.
- **Pagination:** cursor ≤100.
- **Sheets:** submission detail.
- **Backend:** submissions; PII ACL.

### `/hr/settings/custom-fields` — KEEP
- **Job:** Custom field definitions + filter wiring.
- **Views:** DataTable by entity.
- **Filters:** entity type.
- **Sheets:** create field; archive confirm; option editor.
- **Backend:** custom fields; **dynamic filter** endpoint must stay authorized + indexed (HRM-04).

### `/hr/settings/preview` — KEEP
- **Job:** Effective rules preview.
- **Views:** Preview panel.
- **Filters:** employee/context selectors (dynamic).
- **Backend:** settings-hub effective rules; no writes.

### `/hr/settings/versions` — KEEP
- **Job:** Policy version history.
- **Views:** Version list.
- **Filters:** policy id, date.
- **Dialogs:** rollback confirm.
- **Backend:** versions immutable; rollback clones new version.

### `/hr/settings/automations` — KEEP
- **Job:** HR automations.
- **Views:** Rules table.
- **Filters:** status, trigger.
- **Sheets/dialogs:** edit rule; dry-run sheet (differentiator); enable confirm.
- **Backend:** automations + webhooks; audit; dry-run without side effects.

### ADD candidates
- `/hr/settings/notifications` — HR notification templates (if not platform-covered).
- **Checkbox:** [ ] **HRM-14e-002** decide ADD vs platform notifications only.

---

## Maintainability rules for settings

1. One editor pattern (`EntityFormSheet` / builder) — no one-off modals per setting.
2. Publish/version for anything affecting payroll/leave calculations.
3. Every mutation invalidates the **consumer** caches (not only settings list).
4. Custom-field changes bump filter option versions so stale UI options cannot widen queries.

- [ ] **HRM-14e-010** all settings pages have unsaved guards where editable.
- [ ] **HRM-14e-011** Evidence: custom field create → appears in employee filter options.
