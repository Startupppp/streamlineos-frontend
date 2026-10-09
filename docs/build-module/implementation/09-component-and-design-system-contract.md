# 09 — Component and design-system contract

Status: Planned feature contracts over Current UI kit

Use `frontend/UI-KIT.md` for primitive props/tokens and [UI components/filter system](../experience/06-ui-component-and-filter-system.md) for Build semantics. The components below are deep feature modules: they accept a small authorized view model and callbacks; they do not fetch or implement authorization.

## Core feature components

| Module/interface | Responsibility | Required inputs | States and behavior | Forbidden responsibility |
|---|---|---|---|---|
| `BuildPageShell` | Header, breadcrumbs, toolbar, responsive regions | title, context, actions, status slot | sticky actions, one H1, mobile overflow, skip target | data fetch or access decision |
| `RecordCollection` | List/table/board/timeline/calendar rendering | normalized records, view config, selection/open handlers | loading, first/filtered empty, partial/error/offline, virtual/bounded list | mutating records or inventing fields |
| `RecordCard` | Compact Ticket/record summary | canonical href, key/title, status, priority, owner, dates, labels, optional progress/client flag | max seven visible signals; link surface; nested buttons stop propagation; selected/focus/drag states | navigation policy or hidden field fetch |
| `RecordTable` | Dense accessible collection | columns, rows, sort/group, row actions | semantic table/grid choice, sticky header, keyboard row open, mobile priority columns | unbounded client filtering |
| `KanbanBoard` | Status/group lanes and reorder | bounded columns/cards, move command, WIP policy result | keyboard move alternative, optimistic pending, conflict rollback, column error | direct status write bypassing command seam |
| `DetailPane` | Desktop contextual detail | canonical URL, header/sections, close/full-page handlers | history push/replace, focus trap only when modal semantics apply, resize bounds | unique sheet-only record identity |
| `RecordDetailPage` | Direct/mobile detail | header, sections, commands, return target | not-found/denied/deleted/conflict, sticky mobile actions | collection state ownership |
| `FilterBuilder` | Build `FilterEnvelope` v1 | field registry, envelope, change/apply callbacks | nested groups depth 4, typed operators, keyboard reorder, validation summary | executing a query or altering authorized scope |
| `SavedViewPicker` | Select/save/fork/share views | authorized views, active ID, ownership/capabilities | personal/shared badges, dirty state, conflict/fork | embedding raw unvalidated filters |
| `CommandCenterGrid` | Versioned widget layout | dashboard/layout version, widget registry, query results | add/remove/reorder/resize, partial widget errors, reset/restore, mobile single column | each widget issuing an independent unbounded request |
| `OperationStatus` | Mutation/import/export progress | operation state, retry/cancel/download actions | queued/running/partial/failed/completed/expired | pretending accepted means completed |
| `PermissionState` | Denied/revoked/unavailable UI | safe reason code, recovery destination | no record metadata leak; focus/action guidance | deciding authorization |

## RecordCard anatomy

Header contains type icon, key, status, and client visibility when relevant. Body contains two-line title and optional one-line description. Metadata order is urgency first: overdue/blocker, priority, assignee, due date/cycle, labels, estimate/progress. The overflow menu contains only authorized secondary actions; destructive actions open a named confirmation showing impact. Avatar has accessible name; color is never the only status signal.

The card root is an anchor to the canonical record. Checkbox, assignee, status, and overflow controls are buttons with `stopPropagation`; they cannot nest inside the anchor, so use a stretched-link/sibling layout. Enter opens, Space selects only when selection mode is active. Drag has a keyboard alternative and visible pending/rollback state.

## Forms/dialogs/sheets

- Forms use shared field, description, inline error, and summary patterns. Server errors bind by machine code/path; unknown safe errors appear at the form level.
- Dialogs are for confirmation or short focused choices. Sheets are for create/edit/context work that preserves the parent; complex settings and direct records use pages.
- Close with unsaved changes prompts to discard/save draft. Escape never discards without that policy.
- Submit remains disabled while the same mutation is in flight; server idempotency still covers retry/double delivery.
- Focus enters at the heading/first invalid field and returns to the invoker.

## Other required modules

Dropdowns expose a button trigger and roving keyboard menu. Tabs use URL state when deep-linkable. Badges use semantic token variants. Date pickers store UTC/ISO semantics and display actor timezone. File uploaders show validation, per-file progress, cancel/retry, malware-processing state, and authorized preview. Editors sanitize rendered content and preserve draft/revision conflict. Timelines/activity feeds cursor-page and distinguish actor/system events. Notifications/toasts never carry secrets and link to canonical destinations.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Implement the shared page shell, collection views, card/row, detail pane/page, filter builder, saved-view picker, dashboard grid, operation status, and permission state using the existing UI kit.
- [ ] Validate each card/row uses the specified information hierarchy and seven-signal limit, keyboard semantics, accessible names, truncation, status color plus text, and consistent density.
- [ ] Exercise sheet, dialog, and full-page actions with focus return, browser history, modifier click, Escape, conflict, upload, and mobile behavior.
