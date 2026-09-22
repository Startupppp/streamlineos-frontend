# BLD-04 — Ticket Cards, Bulk Actions, Workflow, and Settings PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Tickets are fast to understand and safe to manipulate from board, list, table,
backlog, detail, and bulk selection. Workflow configuration explains and
enforces behavior without turning display preferences into mutation blockers.

## Current Source Findings

- `use-kanban-drag.ts` rejects a move into a completed status when `Hide done`
  is enabled and tells the user to turn the display filter off.
- the setting is local board state, while completed-item display also exists in
  display options; ownership is ambiguous.
- ticket card/display controls exist, but view-specific property allowlists can
  make options unavailable or inconsistent.
- project settings currently combine general, members, labels, statuses,
  custom fields, integrations, and danger behavior in one page.
- All Work bulk groups selected tickets by project and sends project requests
  concurrently, so cross-project operations need an explicit partial-failure
  contract.
- backend ticket bulk update accepts at most 100 IDs and only assignee, status,
  sprint, priority, and parent fields.
- the current rich ticket-create surface is implemented as a dialog despite
  advanced description, attachment, and relation work that requires the sheet
  contract below.
- current board-card action controls can depend on hover visibility, and
  destructive delete is exposed from card context without the archive-first
  lifecycle being consistently evident.
- current Sprint completion classifies incomplete work with a hard-coded
  `DONE` value instead of the configured completed status category.
- current ticket autosave conflict handling refreshes and toasts without
  offering merge, reload, or copy-edits recovery.

## Ticket Card Information Contract

### Always Visible

- key and concise title;
- workflow status when status is not already represented by the column;
- selection/focus state;
- blocked or conflict indicator;
- client-visible indicator when enabled; and
- action-menu trigger that does not require hover on touch devices.

### Configurable Fields

- type, priority, assignee(s), labels, canonical iteration, module, epic,
  parent, points/estimate, due/start date, progress, customer, milestone,
  release, attachment/comment/subtask counts, time status, QA state, and
  supported custom fields.

### Display Rules

- board defaults to at most five secondary signals;
- list uses one compact metadata row;
- table uses columns and never repeats column data in chips;
- missing values are omitted unless the view explicitly asks to show empties;
- sensitive cost, time, client, or custom-field values are permission checked;
- long titles clamp with accessible full text;
- card configuration is actor-scoped unless saved into a shared view.

- [ ] **BLD-04-001** one field registry owns label, renderer, permission,
  filter, sort, edit capability, and supported layouts.
- [ ] **BLD-04-002** every configurable option renders in each declared layout
  or is absent from that layout's menu.
- [ ] **BLD-04-003** card and row content stays within the query projection;
  adding a field cannot introduce per-card requests.
- [ ] **BLD-04-004** mobile, keyboard, high zoom, and long translated values
  retain identity and actions.

## Ticket Action Menu

Actions appear only when applicable and authorized:

- open detail;
- copy key, copy internal link, copy approved client link;
- edit fields;
- assign or unassign;
- change status, priority, type, iteration, module, epic, milestone, release,
  parent, dates, estimate, labels, and custom fields;
- create subtask;
- add relation or dependency;
- subscribe/unsubscribe;
- duplicate with an explicit copied-field preview;
- move to another project with compatibility preview;
- convert hierarchy/type where valid;
- add to client progress or remove client visibility;
- archive/restore;
- delete only under the approved retention contract.

- [ ] **BLD-04-005** card, row, and detail actions call the same mutation
  owners and validation.
- [ ] **BLD-04-006** move/convert previews incompatible status, iteration,
  label, field, relation, access, and client-visibility changes.
- [ ] **BLD-04-007** destructive actions state impact, require the correct
  confirmation, and preserve recoverability where supported.
- [ ] **BLD-04-008** menus use roving keyboard focus, restore opener focus, and
  remain reachable without hover.

## Inline Edit, Dialog, Sheet, and Full Page

- inline edit: one reversible scalar with immediate validation;
- popover: selection or display preference without a multi-step commitment;
- dialog: short decision or destructive confirmation;
- sheet: rich create/edit, relation management, or a record preview that keeps
  collection context;
- full page: ticket detail, multi-step import/migration, workflow design,
  incident execution, or test execution.

Ticket create uses an adaptive right sheet on desktop and full-height mobile
sheet for description, attachments, relations, and AI preview. A minimal quick
create may remain a dialog only when it asks for title plus scope and defers
advanced fields.

- [ ] **BLD-04-009** duplicate rich-create implementations are consolidated.
- [ ] **BLD-04-010** all overlays have dirty-state protection, initial focus,
  labelled title/description, Escape behavior, and focus return.
- [ ] **BLD-04-034** rich ticket create uses the adaptive sheet; the title-only
  quick-create dialog cannot silently grow a second advanced form contract.

## Drag and Drop

- Drag is an alternative to, not the only way to, change status or rank.
- Moving to a completed status succeeds even when completed items are hidden.
  The card leaves the filtered view after the optimistic mutation and a toast
  offers `Undo` where safe.
- `Hide done` controls visibility only. It never changes workflow permission or
  allowed transitions.
- WIP limits are enforced by the backend in the same transaction.
- invalid transition, stale version, rank conflict, WIP breach, and permission
  loss roll back only the affected optimistic fields.
- board auto-scroll, keyboard drag, touch targets, and reduced motion are
  supported.

- [ ] **BLD-04-011** remove the current Hide-done mutation block and add its
  regression.
- [ ] **BLD-04-012** display preference has one owner and persists according to
  actor/default/saved-view precedence.
- [ ] **BLD-04-013** backend transition validation, version check, WIP check,
  rank update, activity event, and outbox event are atomic.
- [ ] **BLD-04-014** concurrent moves preserve deterministic ordering without
  duplicate rank.
- [ ] **BLD-04-015** keyboard users can perform every drag outcome through an
  accessible move action.

## Bulk Selection

Selection modes:

- rendered rows;
- all loaded rows;
- all matching the current server predicate;
- explicit deselection from all matching.

Selection resets or asks for confirmation when scope, filter, sort, or saved
view changes. The toolbar states count and scope.

## Bulk Action Matrix

| Action | Project scope | Cross-project | Rules |
|---|---|---|---|
| Status | Yes | Compatible mapping only | Preview unmapped workflows |
| Priority/type | Yes | Yes | Enum and hierarchy validation |
| Assignee/team | Yes | Membership-compatible | Report skipped inaccessible actors |
| Add/remove labels | Yes | Name/ID mapping preview | Add and remove are distinct |
| Iteration/module/epic | Yes | Normally no | Destination must belong to project |
| Parent/relation | Yes | Validated relation | Prevent cycles and self-reference |
| Start/due dates | Yes | Yes | Range and timezone rules |
| Estimate/points | Yes | Yes | Nonnegative and unit-aware |
| Client visibility | Yes | Yes with grants | Preview exposed fields |
| Subscribe/unsubscribe | Yes | Yes | Actor derived from token |
| Move project | Yes | Yes | Compatibility and access preview |
| Archive/restore | Yes | Yes | Retention and dependency rules |
| Delete | Restricted | Restricted | Impact preview and policy |

- [ ] **BLD-04-016** bulk API accepts a bounded ID set or a signed,
  short-lived server query token for `all matching`.
- [x] **BLD-04-017** authorization and record scope are checked for every
  target; one allowed record never authorizes another.
  **Closed — unit proof, executed 2026-09-21.**
  `projects-bulk-write-isolation.spec.ts` and `ticket-scope-predicate.spec.ts` both
  passed (6-suite / 42-test batch). `readMutationTickets`
  (`core/build-ticket-mutation-policy.ts:34`) evaluates the caller's scope predicate
  **per row** as `allowed: sql\`${policy.predicate}\``, then refuses if the id set is
  incomplete for the project (`:39`) and if **any** row fails scope (`:40`) — so a
  mixed batch cannot be partially applied on the strength of its permitted members.
  The specs pin both halves directly: "rejects a mixed tenant batch without any
  update" and "returns 403 for a same-tenant ticket outside DataScope".
- [x] **BLD-04-018** project-local bulk updates are transactional and
  idempotent.
  **Closed — unit proof, executed 2026-09-21.**
  `build-bulk-mutation-invariants.spec.ts` passed (6-suite / 42-test batch),
  asserting no write occurs on any invalid input. The mutation runs as one
  `db.transaction` under the per-project advisory lock
  (`core/build-ticket-bulk-mutation.ts:43-45`), and the route is fenced by
  `@Idempotent("build.ticket.bulk-update")`
  (`core/projects-tickets.controller.ts:163`), whose header the interceptor requires
  by default. The mutation sets **absolute** values, so a replay is naturally
  convergent.
  Scope: *project-local* bulk only. Cross-project bulk is a different path and
  fails three adjacent criteria — it bypasses the hook layer
  (`use-all-work-bulk.ts:72`), `Promise.all`s per-project calls so one rejection
  fails the whole operation, and reports a single summed toast. Those stay open at
  BLD-04-019, BLD-04-020 and BLD-04-021. The client also mints a **fresh**
  `Idempotency-Key` per attempt (`lib/api-client.ts:285-291`), so a user-initiated
  retry is a new command rather than a replay.
- [ ] **BLD-04-019** cross-project bulk returns per-project/per-record outcomes,
  never a misleading global success toast.
- [ ] **BLD-04-020** retry reuses an idempotency key and targets failed records
  only.
- [ ] **BLD-04-021** cache patch or invalidation covers every changed detail,
  filtered collection, count, aggregate, and client progress projection.
- [ ] **BLD-04-035** cross-project bulk preview states every target project,
  incompatible mapping, inaccessible record, and expected partial-failure
  behavior before commit.

## Workflow Settings

Each project configures:

- status name, stable identity, category, color, order, and active/archive;
- initial and completed states;
- allowed transitions by role or data scope;
- required fields, resolution, approval, or checklist before completion;
- reopen behavior;
- WIP limits;
- automatic actions and notifications;
- completed-item visibility defaults;
- carry-over at iteration completion; and
- status mapping for template, import, move, and cross-project bulk.

Status identity is not the mutable display name. Renaming a status must not
break tickets, saved views, automations, analytics, or webhooks.

- [ ] **BLD-04-022** statuses use stable IDs throughout storage and contracts,
  or a migration proves an equally safe canonical identity.
- [ ] **BLD-04-023** one completed category supports multiple completed states
  without hard-coded `DONE` logic.
- [ ] **BLD-04-024** status archive is blocked or migrated when referenced by
  tickets, defaults, views, rules, or templates.
- [ ] **BLD-04-025** transition errors name the failed rule and preserve the
  edit/drag context.
- [ ] **BLD-04-026** workflow preview simulates a role and record without
  mutating data.

## Iteration Completion

Completion preview includes:

- completed, incomplete, blocked, and unestimated counts;
- destination for incomplete work: backlog or next iteration;
- subtasks and dependency impact;
- velocity/carry-over implications;
- client-visible release/update impact; and
- automations that will run.

- [ ] **BLD-04-027** completion is one idempotent transaction plus durable
  outbox effects.
- [ ] **BLD-04-028** active-iteration uniqueness and date overlap rules are
  explicit.
- [ ] **BLD-04-029** undo is offered only while no incompatible downstream
  write has occurred.
- [ ] **BLD-04-038** iteration completion derives all completed states from the
  workflow category and contains no hard-coded status name.

## Ticket Detail

- field changes use optimistic concurrency;
- activity and comments paginate independently;
- attachments are bounded and permission scoped;
- subtasks and relations avoid recursive unbounded loading;
- comments, descriptions, and links are sanitized;
- client preview shows the exact external projection;
- stale edits receive merge/reload choices rather than silent overwrite.

- [ ] **BLD-04-030** detail route `projectId` must match the ticket's project
  for read, update, rank, delete, activity, and subresources.
- [ ] **BLD-04-031** comment, attachment, watcher, assignee, relation, and
  activity collections are bounded.
- [ ] **BLD-04-032** detail response and subresource queries do not duplicate
  large collections.
- [ ] **BLD-04-033** comment and update drafts are actor, organization, scope,
  and record keyed with defined expiry.
- [ ] **BLD-04-036** card action triggers remain visible and operable for
  touch, keyboard, high zoom, and reduced-pointer users.
- [ ] **BLD-04-037** archive is the default removal action; permanent delete is
  shown only when the approved retention policy and dependency preview permit
  it.
- [ ] **BLD-04-039** ticket edit conflict offers reload, compare/merge where
  supported, and copy-local-edits recovery rather than toast-only data loss.

## Acceptance

- [ ] **BLD-04-A01** card field/action matrix passes in board, list, table,
  detail, and mobile layouts.
- [ ] **BLD-04-A02** drag, keyboard move, bulk, inline edit, and detail edit
  produce the same validated workflow outcome.
- [ ] **BLD-04-A03** hidden-completed, filtered-board, WIP, stale-write,
  partial-failure, retry, and permission-revocation regressions pass.
- [ ] **BLD-04-A04** workflow and iteration settings survive rename, archive,
  template apply, import, project move, and cross-project bulk.
- [ ] **BLD-04-A05** database tests prove tenant, project, actor, and client
  isolation for all ticket mutations.
