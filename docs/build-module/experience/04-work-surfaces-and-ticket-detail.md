# Work surfaces and ticket details

Status: planned target

## One work model, many views

Board, list, table, calendar, timeline, workload, My Work, search, and widgets are projections of the same ticket records. Moving or editing a ticket calls the same mutation interface regardless of view. No view owns a private copy of status, rank, assignment, dates, or relationships.

## Choosing a view

| View | Best for | Primary interaction |
|---|---|---|
| Board | Flow and status | Drag within/between groups; open ticket in split pane |
| List | Fast review and keyboard work | Inline edit selected fields; multi-select; split pane |
| Table | Dense comparison and bulk operations | Sort, resize, group, inline edit; split pane |
| Calendar | Date commitments and content schedules | Drag date with confirmation for dependent dates |
| Timeline | Sequence, overlap, and dependencies | Resize dates and connect dependencies |
| Workload | Capacity and allocation | Reassign or reschedule with impact preview |
| My Work | Personal prioritization | Focus, start, snooze, log time, update |

Views share filters, saved views, fields, pagination, selection, and export rules.

## Ticket opening contract

### Split pane

Clicking a ticket from a collection opens a right pane while retaining the source context. The pane occupies 40–55% of desktop width and is resizable. It updates the URL to the canonical ticket ID plus an origin hint. Closing returns focus to the exact originating card/row.

Clicking a related ticket inside the pane replaces the pane content and pushes the prior ticket onto an internal stack. Back returns to the prior ticket. Deep link, refresh, and browser history remain valid.

### Full page

Direct links, global search, notifications, email links, and `Open full page` use the full ticket page. Complex activities such as long document editing, relationship graphs, extensive audit history, or side-by-side comparisons may promote to full page.

### Mobile

The detail opens full screen. A sticky header provides Back, key/status, overflow, and next/previous within the source collection. Draft comments and unsaved description changes survive temporary navigation.

## Ticket detail information architecture

### Header

- breadcrumb: organization / project / optional parent;
- stable key and copy-link control;
- editable title;
- status selector;
- priority indicator;
- watch/follow;
- `Open full page` or `Close` depending context;
- overflow: duplicate, move, convert type, archive/delete by permission, export, audit.

Header changes save independently and show pending/saved/failed state. Conflicts show current server value and the user's attempted value.

### Main column

1. **Description**: rich text, tables, checklist, mentions, links, code, embeds, slash commands; autosaved draft and version history.
2. **Acceptance or definition of done**: structured checklist for applicable types.
3. **Subtasks**: progress, quick add, reorder, convert, open.
4. **Relationships**: parent, children, blocks, blocked by, relates to, duplicates, caused by, release, epic, milestone, goal, client request.
5. **Delivery evidence**: commits/PRs/builds/deployments/QA or uploaded proof through authorized integrations.
6. **Attachments and linked files**: file type, size, uploader, scan state, access, version.
7. **Activity and conversation**: comments, status changes, decisions, approvals, automation/AI actions, edits, and system events.

### Property rail

- assignee(s) and accountable owner;
- reporter/requester;
- team and project;
- ticket type;
- labels;
- start/due dates and timezone;
- estimate/points and effort confidence;
- cycle, epic, module, milestone, release, goal;
- client visibility: internal/draft/visible;
- billable flag, time summary, budget impact projection;
- SLA or service class where configured;
- custom fields grouped by organization/project/template.

Properties use compact label/value rows, searchable selectors, keyboard navigation, optimistic UI with rollback, and an explicit clear action.

### Context tabs

Tabs appear only when data or permission makes them useful:

- Activity
- Time
- QA
- Approvals
- Client
- Files
- Dependencies
- History

## Ticket card specification

### Always visible

- ticket key;
- concise title, two lines maximum;
- status conveyed by column/group and accessible text;
- priority icon and label;
- assignee avatar or `Unassigned`;
- due state when present or overdue;
- blocked indicator when blocked.

### Optional by view configuration

- type;
- labels, maximum two plus count;
- estimate/points;
- cycle, epic, milestone, or release;
- client visibility marker;
- subtask/checklist progress;
- attachment/comment count;
- approval/QA state;
- billable/time/budget signal;
- custom field values.

### Card rules

- Do not show every configured field simultaneously. Default to 5–7 information signals.
- Urgency order is blocked, overdue, SLA risk, priority, ordinary metadata.
- Hover reveals quick actions; touch uses overflow.
- Quick actions never shift the card layout.
- Drag includes a keyboard alternative and impact announcement.
- Cards have compact and comfortable density.

## Collection toolbar

Left to right:

1. view switcher;
2. saved view name and unsaved indicator;
3. search within result;
4. filter;
5. group;
6. sort;
7. fields/display;
8. density;
9. automation or insights when relevant;
10. primary `Create ticket` action.

When items are selected, replace the toolbar with a bulk action bar showing count, clear selection, assign, status, priority, date, labels, move, archive, and `More`. Preview affected items before destructive or high-volume actions.

## Create ticket flow

Quick create requests only title and infers project/status/type from context. The user may expand advanced fields. Pressing Enter creates; `Create and open` opens detail; `Create another` retains safe defaults. The client-facing intake flow uses a request form and triage rather than internal ticket controls.

Required rules:

- validate module, project membership, create permission, workflow status, and plan limit server-side;
- accept an idempotency key;
- return the canonical ticket plus allowed capabilities;
- create audit and transactional outbox records in the same commit;
- notify and automate asynchronously after commit;
- never fail the committed ticket because a notification failed.

## Update and conflict behavior

- Small independent fields update separately.
- Description uses revision IDs and autosaved drafts.
- Ordering uses rank tokens and server reconciliation.
- Dragging status executes a workflow transition, including required-field/approval rules.
- Bulk mutation is a first-class command with per-item result, bounded size, idempotency, and one audit batch plus item details.
- A stale update returns a typed conflict; the UI offers refresh, reapply, or compare when meaningful.

## Activity feed

The feed merges human comments and typed system events while preserving their difference. Filters: all, comments, work changes, time, client, approvals, QA, automation, AI. Each event shows actor type, timestamp, source, before/after for relevant fields, and correlation link for jobs/automations.

AI-generated or AI-executed changes are labeled with both the initiating human and executing agent. Edited comments retain history where policy requires.

## Ticket-level actions

- Assign/start/complete/reopen.
- Add subtask or related ticket.
- Link goal, cycle, epic, milestone, release, client request, incident, risk, decision, approval, or file.
- Log time or open full timesheet.
- Request review/approval or client approval.
- Share to client portal only after visibility preview.
- Create change request from scope impact.
- Summarize, draft update, find duplicates, decompose, or propose fields with AI.
- Move/duplicate/archive/delete under permission and retention policy.

## Filter model for work collections

Minimum fields:

- project, team, product, client;
- status/status category and type;
- assignee, owner, reporter, creator, watcher;
- priority, label, custom field;
- created, updated, start, due, completed date;
- overdue, blocked, unassigned, stale, SLA risk;
- cycle, epic, module, milestone, release, goal;
- parent/child/relationship;
- client-visible, billable, approval state, QA state;
- estimate/points, tracked time, remaining effort, budget impact;
- attachment/comment/subtask presence;
- free text with field selection.

Operators and behavior are specified in the shared filter document.

## Saved views

A saved view stores scope, filter expression, search, group, sort, fields, view type, density, and optional card configuration. Visibility can be private, project, team, or organization. Shared view visibility never widens record access. Updates use versions; `Save as new` avoids accidental shared changes.

## States

| State | Required UI |
|---|---|
| Loading | Stable skeleton; keep prior safe data during refetch |
| True empty | Explain the workflow and offer create/import/template |
| Filtered empty | Show active filters, clear/reset, and saved-view context |
| Unauthorized | State blocked action and access-request path without record details |
| Not found | Neutral message; do not distinguish inaccessible from nonexistent when security requires |
| Offline | Show cached read freshness; queue only explicitly supported safe drafts |
| Failed read | Retry with correlation ID |
| Failed mutation | Preserve input, rollback optimistic state, explain recovery |
| Partial bulk result | Per-item success/failure with retry only failed safe items |

## Ticket interface

```ts
interface TicketCommands {
  create(input: CreateTicketCommand): Promise<TicketMutationResult>;
  change(input: ChangeTicketCommand): Promise<TicketMutationResult>;
  transition(input: TransitionTicketCommand): Promise<TicketMutationResult>;
  bulkChange(input: BulkTicketCommand): Promise<BulkTicketResult>;
}

interface TicketQueries {
  get(input: GetTicketQuery): Promise<TicketProjection>;
  list(input: ListTicketsQuery): Promise<TicketConnection>;
}
```

These are deep modules. Their implementations hide policy, tenancy, validation, workflow rules, ranking, concurrency, audit, outbox, projections, and cache invalidation. Board, list, AI, automation, import, and portal adapters call the same commands.

## Acceptance criteria

- A ticket click behaves consistently by origin and preserves source context.
- Related-ticket navigation maintains a back stack in the detail pane.
- Every visible action matches a server-returned capability and is reauthorized on mutation.
- Board/list/table/calendar/timeline/workload display the same committed state after reconciliation.
- Client-facing data comes only from the client projection and explicit visibility state.
- Keyboard, screen reader, touch, deep link, refresh, history, optimistic failure, and conflict flows are tested.
- Network retries cannot create duplicate tickets, comments, time entries, approvals, or notifications.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Unify My Work, All Work, backlog, board, list, calendar, and timeline over canonical ticket IDs and FilterEnvelope v1; preserve saved-view predicates and authorized counts.
- [ ] Implement collection opening rules: primary click opens ticket pane, direct URL/modifier-click opens full detail, related ticket stacks panes, mobile opens full screen, and Back/close restores origin state.
- [ ] Build the ticket detail header, description/acceptance, property rail, subtasks/relations, comments, files, activity, approvals, time, and client visibility with the exact fields and allowed actions specified above.
- [ ] Implement ticket card density and optional fields per saved view; hide inaccessible metadata, show blocked/overdue signals, and provide accessible board/list alternatives.
- [ ] Wire create, assign, transition, rank, link, comment, attach, time, and publish actions to canonical commands with expectedRevision, idempotency, validation, audit, and conflict-preserving drafts.
- [ ] Deliver typed filters, removable chips, Clear all, filtered-empty, bounded bulk preview, and saved-view ownership/share permissions consistently across every work collection.
- [ ] Verify real persisted actions, relation navigation, file access, status conflicts, optimistic rollback, cache invalidation, keyboard/screen-reader use, mobile, and denial for unrelated project/tenant/client actors.
