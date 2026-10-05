# UI components, filters, and state system

Status: planned target

## Design goals

- Fast enough for daily keyboard work and understandable on first use.
- Dense when users need comparison; calm when they need focus.
- One interaction language across projects, products, clients, reports, and settings.
- Accessible and touch-capable without creating separate mobile logic.
- Honest about data freshness, permission, partial scope, and failures.

## Page shell

### Header

Height is 56–64 px depending on density. It contains breadcrumb/back, icon, title, optional status, scope selector, freshness, secondary actions, one primary action, and overflow. Do not place more than three standalone actions before overflow.

### Toolbar

Sticky beneath the header on long collections. It contains view, saved view, search, filter, group, sort, display, and create. On narrow screens, search/filter/create stay visible and the rest moves into `View options`.

### Content width

- Tables/boards/timelines use available width.
- Reading/editing surfaces cap line length at roughly 75–90 characters.
- Detail pages use a main column and 280–360 px property rail on desktop.
- Drawers and panes are resizable and remember a user preference within safe bounds.

## Core components

### RecordCard

Slots:

1. type/key eyebrow;
2. title;
3. state and urgency signals;
4. configurable metadata row;
5. progress/relationship row;
6. assignee and due state;
7. hover/touch actions.

Variants: work item, project, client, goal, milestone, release, request, approval, risk, file, template. Each variant may add two domain fields but must retain the same interaction positions.

### DataTable

Required capabilities: cursor pagination or virtualization, stable multi-sort, column show/hide/order/resize/pin, keyboard cell navigation, inline editing for safe scalar fields, row selection, bulk actions, density, accessible headers, loading placeholders, and URL-backed view state.

Pinned columns are limited to preserve mobile/medium layouts. Inline edits use field-specific validation and expose saving/failure status without blocking other rows.

### KanbanBoard

Column header shows name, count, optional WIP limit and aggregate. Card movement validates the workflow transition before optimistic placement. Rejected movement returns the card and explains the rule. Large columns virtualize and paginate without corrupting order.

### DetailPane

Supports resize, full-page promotion, close, history back/forward, next/previous in origin result, stable URL, unsaved-draft guard, and focus restoration. Only one primary pane is visible; related record navigation reuses it.

### EmptyState

Contains concise state title, cause, one primary action, one optional secondary action, and context-aware learning link. Do not use illustrations that push the action below the fold.

Variants:

- true empty: create/import/use template;
- filtered empty: show filters and clear/reset;
- no permission: access/request path;
- unavailable: integration/module unavailable and recovery;
- completed: celebrate briefly and show next useful destination.

### Form

Labels remain visible above inputs. Required status appears in label and validation. Group fields into short sections, use progressive disclosure, save drafts for long forms, focus the first error, summarize submission errors, and never clear entered data after server failure.

### Select/Combobox

Searches by label and key, supports keyboard, recent choices, clear action, and async pagination. It displays disabled options with a reason when useful. People selectors distinguish users, groups, clients, and guests.

### Date and time control

Supports typed input, calendar, relative dates, timezone visibility, clear, and presets. Changing a date with dependency or SLA impact opens a preview. Store instants in UTC and date-only commitments as explicit local dates with timezone context.

### Confirmation

Use inline confirmation for low-impact reversible action. Use a dialog for destructive, public, permission, payment, broad automation, or large bulk action. State impact, affected count/scope, recovery, and required typed phrase only for exceptional irreversible actions.

### Toast and operation center

Toasts acknowledge immediate results and offer Undo when safe. Long jobs go to an operation center showing queued/running/succeeded/partially failed/failed/cancelled, progress, result file/report, correlation ID, and retry rules.

## Status and semantic tokens

Use semantic tokens rather than hard-coded domain colors:

- neutral/draft;
- information/planned;
- active/in progress;
- success/done/approved;
- warning/at risk/waiting;
- danger/blocked/failed/overdue;
- accent/selected.

Each has foreground, background, border, icon, and focus variants in light/dark themes and WCAG-compliant contrast. Status text or icon always accompanies color.

## Filter grammar

### Expression model

```ts
type FilterEnvelope = { version: 1; expression: FilterExpression | null };
type FilterExpression = FilterGroup | FilterCondition;

type FilterGroup = {
  kind: "group";
  operator: "and" | "or";
  children: FilterExpression[];
};

type FilterCondition = {
  kind: "condition";
  fieldId: string;
  operator: FilterOperator;
  value?: unknown;
};
```

The client never sends arbitrary query language or SQL. The server resolves field IDs from an allowlisted catalog, validates operator/type, compiles a tenant-scoped query, applies effective data scope, bounds complexity, and returns a normalized expression.

### Operators by type

| Type | Operators |
|---|---|
| Text | is, is not, contains, does not contain, starts with, is empty, is not empty |
| Enum/status | is any of, is none of, is empty, is not empty |
| Person/group | is any of, is none of, includes me, unassigned |
| Date/time | on, before, after, between, today, this/next/last period, overdue, empty |
| Number/currency/duration | equals, not equal, greater/less, between, empty |
| Boolean | is true, is false |
| Relationship | includes, excludes, has any, has none, is blocked, blocks |
| Hierarchy | is, is under, includes descendants, no parent |
| Text search | matches terms in selected allowed fields |

Relative date expressions store semantic values such as `next_7_days`; the server evaluates them using organization/user timezone as declared by the field contract.

### Filter builder interaction

1. `Filter` opens a popover on desktop and full sheet on mobile.
2. Suggested common filters appear first, followed by searchable field catalog.
3. Selecting a field shows only valid operators and value controls.
4. Added conditions appear as readable chips and in an advanced grouped editor.
5. Results update with a short debounce for reads; high-cost queries require `Apply`.
6. Users can clear one, clear all, undo, save as view, or copy a shareable view link.

Plain-language summary example: `Status is In progress or Blocked AND Due before next Friday AND Assignee is me`.

### Filter catalog requirements

Every filterable field descriptor supplies stable ID, localized label, type, operators, value-source endpoint, permission requirement, supported scopes/views, indexed flag, cost class, and null semantics. Custom fields join the catalog by stable field ID.

### Ticket and cross-work field catalog

This catalog is the target for Issues, Backlog, My Work, All Work, saved views, Command Center drill-down, reports, exports, and AI queries. `Completeness Next` starts after the invite → module assignment → client grant sequence. `Later` fields need query/index evidence and a clear user action before promotion. A field is omitted from the picker when the actor lacks permission or when its source module is unavailable; a saved view retains the field definition and shows a repair state rather than silently dropping it.

| Stable field ID | Control / operators | Scope and source | Priority / acceptance |
|---|---|---|---|
| `ticket.status` | multi-select; is any/none, empty, closed/open group | project workflow/status table | Existing picker, Current unverified; counts and records share scope |
| `ticket.priority` | multi-select; is any/none, empty | Ticket row | Existing picker, Current unverified; default view does not hide urgent work |
| `ticket.type` | multi-select; is any/none | Ticket type catalog | Existing picker, Current unverified; type=Epic never means membership in an Epic |
| `ticket.assignees` | member picker; includes me, any/none, unassigned | canonical Ticket assignee relation plus Module Access candidate projection | Existing picker, Current unverified; multi-assignee semantics use `contains any/all` only when explicitly selected |
| `ticket.cycle` | cycle picker; any/none, empty, current cycle | Cycle membership | Existing picker, Current unverified; current-cycle resolves by project/team and is timezone safe |
| `ticket.dueDate` | date range and relative presets; overdue, empty | Ticket commitment date | Existing absolute range, Current unverified; relative presets Completeness Next |
| `ticket.labels` | label picker; contains any/all/none, empty | Ticket-label relation | Completeness Next; UX-026; no duplicate rows under multi-label joins |
| `ticket.epic` | Epic picker; any/none, empty | Ticket-to-Epic association, not Ticket type | Completeness Next; UX-027; exact linked Epic membership |
| `ticket.release` | Release picker; any/none, empty, released/unreleased | Ticket-release membership | Completeness Next; UX-025; only actual ship-set membership |
| `ticket.assigneeMe` | one-click chip; includes current actor | same assignee query | Completeness Next; no separate permission or noncanonical query |
| `ticket.project` | project picker; any/none | authorized project reachability | Completeness Next for All Work; candidate list omits unreachable projects |
| `ticket.relationship` | dependency kind, blocking/blocked/related/duplicate, has any/none | typed Ticket relation graph | Completeness Next; validate direction and no self/foreign edge |
| `ticket.parent` | parent/subtask picker; is/is under/no parent | Ticket hierarchy | Completeness Next; descendant query bounded and cycle-free |
| `ticket.reporter` | person picker; is any/none/me | Ticket reporter identity | Later; distinct from assignee and creator |
| `ticket.createdBy` | person picker; is any/none/me | immutable Ticket creator | Later; must not infer from reporter |
| `ticket.assignedBy` | person picker; is any/none/me | auditable latest assignment event | Later; explicitly defines event source/time and historical ambiguity |
| `ticket.watchers` | person picker; includes me, any/none, empty | subscription identity with current access recheck | Later; watcher subscription never grants record access |
| `ticket.milestone` | milestone picker; any/none, empty | typed Ticket-milestone link | Later; milestone hierarchy is distinct from due date |
| `ticket.goal`, `ticket.workstream`, `ticket.product` | scoped picker; any/none, empty | typed planning links | Later; value candidates use owner reachability |
| `ticket.createdAt`, `ticket.updatedAt`, `ticket.completedAt` | before/after/between/relative/empty where nullable | indexed Ticket lifecycle fields | Later; UTC storage with actor timezone for date buckets |
| `ticket.statusChangedAt` | before/after/between/relative | authorized status-event projection | Later; not a mutable copied timestamp without parity check |
| `ticket.estimateSeconds`, `ticket.actualSeconds` | equals/greater/less/between/empty | estimate on Ticket; actuals from Timesheets projection | Later; source revision/freshness shown, no direct Build time-ledger scan |
| `ticket.archived`, `ticket.closed` | boolean toggle | Ticket lifecycle and workflow status | Later; archived records require archive permission and explicit inclusion |
| `ticket.titleText`, `ticket.descriptionText` | contains / text search with matched snippet | authorized full-text index | Later; bounded search and no unindexed broad scan |
| `ticket.clientVisibility` | published/hidden/pending | portal publication projection | Conditional on visibility permission; client query remains grant scoped |
| `custom.<definitionId>` | operator determined by text/number/date/enum/boolean type | governed custom-field definition and indexed typed value | Completeness Next for active, filterable definitions; sensitive fields require field policy; schema version stays stable |

**Filter composition:** the first picker offers Status, Priority, Type, Assignee, Cycle, Due, Labels, Epic, Release, and Me; advanced search exposes the remaining allowed fields. Basic mode creates AND conditions with readable chips. Advanced mode supports nested AND/OR up to the shared depth cap. Null is never equal to empty string or unassigned. Query normalization gives the same result set in list, board, dashboard, report, export, and AI, subject to each actor's access.

**Saved views and creation:** personal, project, team, and organization scopes require explicit share/manage permission; favorites and default views are preferences over the same view ID. A saved filter may power a report widget through the same normalized expression and metric identity. `Create from filtered view` may prefill a field only for a single unambiguous equality condition that the actor can edit; it never copies OR/NOT, hidden, relationship, date-relative, or permission-filtered predicates into a new record. Prefill is previewed and can be cleared.

**Deferred query language:** historical `WAS/CHANGED`, Jira-style function helpers, arbitrary JQL, open-Sprint aliases, and cross-object script expressions are Deferred. Current Cycle and released/unreleased are ordinary typed chips, with no separate Sprint storage identity. The original findings and their explicit dispositions are in [the WOW crosswalk](../audit/original-wow-research-crosswalk.md).

### Query safety and performance

- Cap nesting depth, condition count, `IN` values, text length, scope IDs, date range, and returned rows.
- Require stable deterministic sort plus ID tie-breaker.
- Use cursor pagination for changing datasets.
- Maintain indexes beginning with tenant and common scope/status/date columns.
- Use search infrastructure for full text; do not apply unbounded contains scans.
- Reject or asynchronously export queries above cost policy.
- Return a query fingerprint, freshness, and `hasNextPage` without expensive exact totals when not needed.

## Saved-view model

```ts
type SavedView = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  scopeRef: { type: string; id: string };
  name: string;
  visibility: "private" | "project" | "team" | "organization";
  viewType: "board" | "list" | "table" | "calendar" | "timeline" | "workload";
  filter: FilterEnvelope | null;
  search?: { text: string; fields: string[] };
  groupBy?: string[];
  sort: Array<{ fieldId: string; direction: "asc" | "desc" }>;
  display: Record<string, unknown>;
  filterVersion: 1;
  version: number;
};
```

The view stores configuration, never result data. View access and data access are independently authorized.

## Search

### Command search

`Ctrl/Cmd+K` opens destinations, recent records, create actions, and commands. Results are tenant/module/scope aware. Destructive commands never execute directly from search; they open review.

### Collection search

Searches within the current scoped query and displays matched fields. The URL stores the term when the view is shareable. Highlight only snippets returned from an authorized search projection.

## Bulk actions

Bulk selection can be page-only or `all matching` with explicit query snapshot. Before execution show:

- selected/matching count;
- affected scope;
- excluded/denied estimate without leaking identities;
- fields/actions to change;
- automation/notification side effects;
- undo or rollback availability.

The result provides succeeded, skipped, denied, conflicted, and failed counts plus an authorized error report.

## Responsive behavior

| Component | Desktop | Mobile |
|---|---|---|
| Sidebar | persistent/collapsible | drawer |
| Toolbar | inline | search/filter/create + options sheet |
| Table | configured columns | card/list projection; optional horizontal detail table |
| Board | multi-column | one column at a time with column switcher |
| Detail pane | split and resizable | full screen |
| Filters | popover/side panel | full-screen sheet |
| Dashboard | responsive grid | ordered single column |
| Property rail | right rail | collapsible Properties section |

## Accessibility

- Meet WCAG 2.2 AA for shipped workflows.
- Visible focus, skip links, semantic landmarks/headings, labeled controls, error association, live regions for async results.
- Complete keyboard operation for board, table, panes, menus, dialogs, drag alternatives, and rich editor essentials.
- Respect reduced motion and system contrast preferences.
- Do not trap focus except in modal dialogs; restore it on close.
- Announce saving, saved, error, reordered, selection count, and filter-result changes without excessive chatter.

## Internationalization

- No concatenated UI sentences.
- Locale-aware date, number, currency, duration, plural, week start, and name formatting.
- User and organization timezone are always explicit in schedule-sensitive operations.
- Layout tolerates 30–40% text expansion and right-to-left support can be added without structural redesign.
- Currency conversion is never implied; reports state source currency and conversion policy.

## Error and recovery language

Every error states what failed, whether saved data is safe, what the user can do, and a correlation ID for support. Never expose stack traces, provider secrets, SQL, internal permission keys, or inaccessible record metadata.

## Component acceptance criteria

- The same field renders and edits consistently in card, table, pane, full page, dashboard drill-down, and mobile.
- Shared filters round-trip through URL/saved view without semantic change.
- Permission and scope changes cannot leave sensitive cached options/results visible.
- Components distinguish loading, empty, filtered-empty, denied, partial, stale, and error.
- Keyboard, screen reader, touch, localization, dark theme, high zoom, and reduced motion are part of definition of done.



## Canonical filter wire policy

FilterEnvelope v1 is the only public filter wire contract. FilterOperator is a registry enum: eq, neq, in, not_in, contains, not_contains, starts_with, is_empty, is_not_empty, before, after, between, gt, gte, lt, lte, includes, excludes, has_any, has_none, under, and relative_date. UI words map to these codes. Date presets and Me resolve through typed values, not magic strings in entity IDs. View/dashboard storage includes filterVersion: 1; every non-null filter is an envelope. Null means no additional condition, never bypass scope.

Limits: depth 4, conditions 50, IN values 100, scope IDs 50, search length 500, page size default 50/max 100. Relative values include timezone and named preset; currency comparisons require currency. Compiler schema/operator errors return 422 with field path. Effective access is applied outside and before the user expression, so OR can never escape tenant or scope.

Full screen contracts: [screen index](./screens/README.md). Exact route and alias behavior: [route decisions](./routes-and-screen-decisions.md).

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [ ] Implement the shared page shell, RecordCard, DataTable, KanbanBoard, DetailPane, forms, empty states, confirmations, and operation feedback with the exact field/permission contracts above.
- [ ] Use one versioned FilterEnvelope v1 parser and field registry across saved views, dashboards, reports, exports, search, and AI; enforce typed operators, maximum depth, authorized fields, and bounded pagination on the server.
- [ ] Implement filter-builder chips, nested groups, validation, clear/reset, URL serialization, and migration/error states for removed or inaccessible custom fields.
- [ ] Persist private/team/project saved views with owner permissions, layout columns, grouping/sort, revision conflicts, and safe defaults; test cross-device reload and revoked access.
- [ ] Implement command search and collection search with debouncing, permission-aware suggestions, keyboard navigation, source freshness, and no cross-tenant result leakage.
- [ ] Implement bulk-selection semantics for loaded versus all matching rows with a bounded server snapshot, per-record authorization, preview, idempotent execution, and partial-failure report.
- [ ] Verify semantic status tokens, focus order, screen reader labels, contrast, 44 px mobile targets, dense-card truncation, timezone/locale rendering, and recoverable network/conflict states.
