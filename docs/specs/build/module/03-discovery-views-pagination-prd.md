# BLD-03 — Search, Filters, Views, Sorting, and Pagination PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Customers can find every accessible Build record without false empty states,
silently truncated results, excessive database reads, or filters that broaden
scope when malformed. View and filter state is shareable and consistent across
page, API, export, bulk selection, and saved views.

## Current Source Findings

- Ticket filters currently expose status, priority, type, assignee, label,
  cycle, project, one sprint, and due-date range.
- backend schemas support overlapping but different filter sets for project
  tickets and All Work.
- malformed CSV enum and numeric values are transformed away rather than
  rejected, which can silently broaden a result.
- project-board queries load 100 rows at a time and auto-load to 500 only when
  no filter is active. A filtered board can therefore represent only its first
  page without an explicit completion path.
- board `total` is currently the loaded count, not a server total.
- the board count endpoint is not passed the active filter contract.
- project My Tickets currently fetches the project board collection, filters
  actor/search/status/priority/type in memory, and can therefore omit matching
  tickets beyond the board auto-load ceiling.
- My Work parses workspace, product, project, cycle, and sort URL state, but
  the current request mapping does not send all of those dimensions to the
  backend.
- project directory search and filters are currently applied to an already
  loaded client collection; cross-project All Work omits several exposed
  filter dimensions from its request.
- project grouping/sorting and cross-project bulk selection can operate only on
  loaded rows, so the UI can misrepresent the complete result set.
- the current ticket CSV export downloads the loaded result rather than
  starting a server export over the exact active predicate.
- several option/list reads request very high limits instead of using bounded
  continuation, including portfolio/program projects, templates, teams,
  modules, sprints, cycles, statuses, and active assignees.
- Sprint and Cycle are separate filters for duplicate iteration models.
- the general view switcher advertises Board, List, Table, Calendar, Gantt, and
  Workload even when the page owner or canonical Calendar contract differs.

## Filter Semantics

### Static Filters

Static options are product enums whose valid values do not depend on tenant
data:

- ticket type;
- priority;
- health;
- archived state;
- relation type;
- date operator;
- has/does-not-have;
- client-visible state; and
- system lifecycle categories.

They are versioned API contracts and reject unknown values.

### Dynamic Filters

Dynamic options come from an authorized, scoped backend query:

- project, workspace, managed product, portfolio, program, and team;
- status, label, custom field, custom option, module, epic, milestone, release,
  iteration, form, customer, and saved view;
- assignee, reporter, creator, subscriber, approver, owner, and client;
- integration source, repository, automation, agent, and template.

Dynamic option search is paginated and cancellable. Archived values already
present on records remain readable and removable but are not offered for new
assignment.

## Canonical Ticket Filter Set

| Group | Filters |
|---|---|
| Identity | key, title/description search, exact key, parent, child, epic, module, related ticket |
| Scope | workspace, managed product, project, team, customer |
| Workflow | status, status category, ticket type, priority, resolution, archived |
| People | assignee, unassigned, reporter, creator, subscriber/watcher, last updater |
| Planning | canonical iteration, unscheduled, milestone, release, points/estimate range, progress range |
| Dates | created, updated, start, due, completed, overdue, no due date, relative date window |
| Taxonomy | label, has/no label, custom field value, custom field empty, template/source |
| Relations | blocked, blocking, duplicate, related, has parent, has children, dependency count |
| Collaboration | mentioned me, unread activity, has comments, has attachments, has links |
| Delivery | client visible, recurring, QA linked, incident linked, change linked, approval state |
| Time | estimate, time spent, remaining estimate, over estimate, has/no time entry |

Rules:

- multi-select values use OR within one field and AND across fields;
- include/exclude is explicit;
- `is empty` and `is not empty` are first-class operators;
- date filters support exact, before, after, between, relative, overdue, and
  empty;
- search never bypasses structured filters or permission scope;
- unavailable feature filters are omitted, not disabled without explanation;
- filter option counts are optional but, when shown, reflect the current query
  excluding only their own dimension.

- [ ] **BLD-03-001** frontend, API, saved view, export, and automation reuse one
  canonical filter vocabulary and serializer.
- [ ] **BLD-03-002** malformed values fail with a field-level 400 and never
  disappear into a broader query.
- [x] **BLD-03-003** every date value is ISO validated and range order is
  checked.
- [ ] **BLD-03-004** archived, deleted, inaccessible, and cross-tenant option
  IDs cannot widen or leak the result.
- [ ] **BLD-03-005** iteration filters use the canonical entity and display
  terminology from settings.
- [ ] **BLD-03-006** custom-field filters use indexed typed values, not
  unbounded client-side JSON scanning.

## Page-Level Filter Matrix

| Page family | Required filters beyond the common ticket set |
|---|---|
| My Work | assigned to me, created by me, subscribed, mentioned, blocked, overdue, due soon, recently completed |
| All Work | workspace, product, project, team, portfolio/program roll-up, actor scope |
| Backlog | unscheduled, iteration candidate, ready/not ready, estimate state, priority, dependency, stale |
| Triage | source, submitted time, missing required field, duplicate candidate, SLA age, triage owner |
| Board/List/Table | common ticket set plus active saved-view dimensions |
| Timeline | start/end window, unscheduled, dependency, milestone/release, critical/late |
| Workload | person/team, date window, capacity source, allocation state, skill where authorized |
| Projects | workspace, product, team, customer, owner, manager, status, health, date, archived, template |
| Products | workspace, owner, lifecycle, health, customer segment, linked-project state |
| Workspaces/Teams | owner, member, status, archived, product/project presence |
| Programs/Portfolios | owner, status, health, goal, product, project, risk, date |
| Goals | level, owner, status, health, parent, product/project, cycle, due date |
| Roadmap/Releases/Milestones | product/project, owner, status, health, date, customer visibility, dependency |
| Updates/Activity | author/actor, update type/action, health, audience, target type, date |
| Inbox/Approvals | unread, unresolved, snoozed, type, requester, approver, project, decision, due/expiry |
| Files | name, type, uploader, project, linked record, date, client visibility |
| Forms/Submissions | form, published state, source, submitter, status, assignee, date |
| Meetings | organizer, attendee, project, date, status, has actions/decisions |
| QA | case/run status, suite, assignee, priority, release, environment, linked issue |
| Risks/Decisions/Changes/Incidents | owner, state, severity/impact, category, project, review date, relation |
| Customers | CRM customer, project/product, owner, health, portal grant, last update |
| Access | actor, role, scope, access source, client/internal, expiry, review state |
| Agents/Automations | type, state, trigger, actor/agent, approval, failure, date, cost/budget |

- [ ] **BLD-03-007** every retained collection implements its applicable row
  with no decorative filter that the backend ignores.
- [x] **BLD-03-008** no client sends its own user or organization ID to express
  `mine`; identity comes from the token.
  **Closed — unit proof, executed 2026-09-21.**
  `backend/src/modules/build/core/work-scope-mine.spec.ts` passed (part of a 6-suite
  / 42-test batch). It is non-vacuous by construction: it captures the emitted
  predicate and asserts **exactly two** `user_id =` bindings, so neither branch of
  the `mine` UNION can widen to the organisation. `scope` is a `z.enum` resolved
  from `@CurrentUser()` (`projects-work-query.service.ts:182-188`), and per-person
  filtering uses a `@me` sentinel the server resolves
  (`projects-tickets-read.service.ts:272`, `projects-work-query.service.ts:225`;
  client side `filter-command-menu.tsx:68`, `ticket-filter-bar.tsx:382`). No
  authenticated Build query key carries an org id.
  Scope *widening* by a permitted actor is a different criterion and stays open at
  BLD-03-009.
- [ ] **BLD-03-009** a user without widening scope cannot select or query
  another actor's private workload.
- [ ] **BLD-03-010** option APIs project only ID, label, state, and required
  context, and cap each page at 100.
- [ ] **BLD-03-031** every BLD-02C through BLD-02F collection row identifies
  its filter-matrix family and every exposed URL key maps to exactly one
  frontend serializer field and backend query field.
- [ ] **BLD-03-032** a filter, sort, group, count, export, or bulk action over
  a paged collection is server-evaluated; loaded-row behavior is labeled and
  never presented as the complete result.

## Search

- URL key is consistently `q`; backend mapping to `search` is centralized.
- Typing is debounced 300 ms, cancels stale requests, and retains the prior
  result geometry while loading.
- exact ticket keys take precedence over fuzzy text.
- text is trimmed, length bounded, and escaped through parameterized queries.
- server search covers the documented fields only and labels its scope.
- recent searches and suggestions are tenant and actor scoped.
- no-result state shows active filters and a one-click clear action.

- [ ] **BLD-03-011** project and cross-project search use indexed plans at
  realistic scale.
- [x] **BLD-03-012** out-of-order responses cannot replace newer results.
  **Closed — gate proof, executed 2026-09-21.**
  `pnpm check:query-signal` passed with its self-test (run as part of the full
  41-gate battery; both exit 0). The gate resolves the `signal` argument **by
  position**, which is the failure mode that matters here — a `signal` passed into
  the wrong parameter slot would otherwise satisfy a text scan while aborting
  nothing. Every Build `queryFn` destructures and forwards it
  (`hooks/api/build/ticket-queries.ts:78-94`, into `apiClient` at `:41-42`), so a
  superseded request is aborted rather than allowed to resolve late. Search commits
  are debounced 300 ms (`components/list-view/use-list-filter-params.ts:63,210`).
  Note this covers request **abortion**. It does not cover a late *session* or
  *scope* switch: `frontend/CLAUDE.md:26` records that the scoped query hash does
  not fence in-flight switches, which stays open at BLD-03-A02 and BSN-04-A07.
- [ ] **BLD-03-013** search, filters, count, export, and bulk target the same
  result predicate.
- [ ] **BLD-03-014** direct URL search works on hard refresh and rejects
  malformed or oversized input.

## Views

### Issues

- **Board** — workflow or assignee grouped; per-column continuation and WIP.
- **List** — compact hierarchy, keyboard navigation, inline essentials.
- **Table** — configurable columns, resize/reorder, server sort, bulk selection.
- **Timeline** — date/dependency planning; unscheduled lane and zoom.
- **Calendar link** — opens the unified Calendar with Build filters; it is not a
  separate Build page or local view implementation.
- **Workload link** — opens the dedicated capacity page because capacity has
  different data, filters, and permissions.

### Other Records

- Grid/card is permitted for projects, products, templates, and visual
  portfolios when cards communicate more than a table row.
- List/table is the default for operational queues and governance registers.
- Board is offered only where a real state transition exists.
- Timeline is offered only for records with meaningful dates and dependencies.
- Settings, forms, and read-only summaries do not gain view switchers.

- [ ] **BLD-03-015** unsupported view/page combinations are absent.
- [ ] **BLD-03-016** switching views preserves compatible search, filters,
  sort, group, selection scope, and saved-view identity.
- [ ] **BLD-03-017** each view remains truthful when only part of the collection
  is loaded.
- [ ] **BLD-03-018** board, table, list, and timeline share one record and
  mutation owner rather than parallel business logic.
- [x] **BLD-03-033** the general view switcher does not render local Calendar
  or Gantt implementations; Calendar deep-links to `/calendar` and Gantt maps
  to the canonical Timeline layout.

## Saved Views

A saved view stores:

- owner scope and visibility: private, project, workspace, or organization;
- layout, filters, exclusions, sort, grouping, sub-grouping, columns, density,
  card fields, completed visibility, and version;
- optional default or pin state per actor;
- creator, updater, timestamps, and migration version.

It never stores a cursor, tenant ID from the client, or unauthorized option.

- [ ] **BLD-03-019** create, update, duplicate, rename, share, set default,
  archive, and delete are permission checked.
- [ ] **BLD-03-020** opening a view reports missing/archived fields and offers a
  safe repair rather than silently changing meaning.
- [x] **BLD-03-021** private views cannot be resolved by another actor.
  **Closed — source proof plus a bite-proven regression test (2026-09-21).**
  `ViewsService` exposes no get-by-id route: `workspace.controller.ts:166-266`
  registers list/create/update/delete only, at both project and workspace scope.
  Both read paths narrow the WHERE to
  `or(visibility = "shared", createdBy = userId)`
  (`workspace.service.ts:234-240`, `:300-306`), and all four mutation paths
  reject a non-owner private view with `ForbiddenException`
  (`:271-274`, `:288-291`, `:342-345`, `:364-367`) — 403 rather than 404
  because the caller is inside the correct tenant.
  Eight tests added to `workspace-tenant-isolation.spec.ts`, including the
  shared-view and owner controls so the guard is proven to gate privacy rather
  than authorship. Bite-proved: neutering the four guards fails exactly the
  four negative tests.
- [ ] **BLD-03-022** default-view resolution has a deterministic fallback when
  access is revoked.

## Sorting and Grouping

- Server sorting uses a stable unique tie-breaker.
- Null placement is documented.
- User-facing sort names map to an allowlisted backend expression.
- Board rank is scoped to its group and cannot collide across columns.
- Grouping by status, assignee, priority, type, iteration, module, epic, label,
  project, or supported custom field is server-aware.
- Empty groups are optional display state, not fake records.

- [ ] **BLD-03-023** every sort has a matching index or measured acceptable
  plan.
- [ ] **BLD-03-024** keyset cursor encoding contains the sort tuple and rejects
  a cursor created for another filter/sort/scope.
- [ ] **BLD-03-025** drag rank and server sort remain deterministic under
  concurrent updates.

## Pagination Strategy

| Collection | Strategy |
|---|---|
| Issues, All Work, My Work, activity, comments, Inbox, updates, submissions | Cursor/keyset; `Load more` or virtual continuation |
| Board | Independent cursor and count per visible column; no hidden global 500-row ceiling |
| Search/typeahead option lists | Cursor/keyset, maximum 100 per page |
| Projects, products, workspaces, teams, portfolios, programs, templates, access registers | Server offset pagination only when total and page jump are required; otherwise cursor |
| Reports and analytics | Explicit date/scope limit; server aggregation; no raw unbounded rows |
| Statuses, labels, custom fields, workflow transitions | No pagination only with enforced per-project limits and one bounded read |
| Small enums and local action menus | No API pagination |

Rules:

- default 25–50 rows; maximum 100 unless an export job;
- no `SELECT *`, unbounded list, fixed first-page client filter, or auto-fetch
  loop used to simulate completeness;
- page controls state loaded count, total when exact, and whether more exists;
- filter or sort changes reset the cursor and selection safely;
- export is asynchronous and re-authorizes the predicate at execution;
- bulk `select all matching` uses a server-side query token, not IDs for only
  the rendered page.

- [ ] **BLD-03-026** filtered boards expose every matching item through
  per-column continuation.
- [x] **BLD-03-027** column counts accept the identical authorized filter
  contract as board rows.
- [ ] **BLD-03-028** no UI labels loaded count as total count.
- [ ] **BLD-03-029** lists remain responsive at 100, 1,000, 10,000, and
  enterprise-scale records through server paging and row/column virtualization.
- [ ] **BLD-03-030** pagination has no duplicates or omissions during stable
  traversal and documents concurrent-write semantics.

## Acceptance

- [ ] **BLD-03-A01** contract tests prove URL, frontend request, backend schema,
  service predicate, count, export, and saved-view parity.
- [ ] **BLD-03-A02** invalid enum, ID, date, operator, cursor, and cross-tenant
  option tests fail closed.
- [ ] **BLD-03-A03** database plans for common and worst-case filter/sort
  combinations meet BLD-06 budgets.
- [ ] **BLD-03-A04** browser tests cover share, refresh, Back, view switch,
  clear, no-results, archived options, and more-than-one-page data.
- [ ] **BLD-03-A05** accessibility tests cover filter announcements, chip
  removal, view selection, table sorting, board continuation, and focus.
