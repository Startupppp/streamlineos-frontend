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

