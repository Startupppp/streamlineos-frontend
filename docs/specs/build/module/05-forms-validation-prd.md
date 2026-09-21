# BLD-05 — Forms, Validation, Contracts, and Unsaved Work PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Every Build form makes required input clear, prevents invalid work early,
rejects hostile or stale input at the API, enforces durable invariants in the
database, and protects unsaved customer work across every navigation path.
BLD-05A is the current component-level surface census used to enforce this
policy.

## Current Source Findings

- frontend ticket validation excludes `SUBTASK` while backend create/update
  contracts treat ticket type differently.
- frontend original estimate requires greater than zero; backend accepts zero.
- backend create accepts numeric relation IDs without consistently requiring
  positive integers.
- backend update accepts ticket `type` as any string.
- list-filter transforms silently discard invalid numeric and enum values.
- import title validation is weaker than normal ticket creation.
- project settings and other Build components define Zod schemas inline rather
  than in an owned `*-schema.ts` contract.
- project Intake defines its decline schema inline, and its accept submit
  handler currently discards the assignee, cycle, and module values collected
  by the accept form before calling the mutation.
- request schemas, frontend form schemas, response contracts, and database
  constraints are separate definitions with incomplete parity proof.
- the Build dirty-state context is wired to a limited set of forms, while many
  sheets and dialogs can create or edit records.
- the source census found more than 55 mutation surfaces but direct
  dirty-state registration on only six surfaces; nested rich editors,
  overlays, builders, and programmatic navigation remain unproven.
- more than 30 component or page files define inline Zod schemas, preventing
  one owned form contract and making parity checks incomplete.
- the backend has a ticket import mutation but no discoverable Build import UI
  with preview, mapping, dry run, progress, and row-error recovery.
- ticket attachment count is capped differently across current frontend and
  backend boundaries.
- current forms generally surface a global error string; field-path API errors
  are not comprehensively mapped back to controls.
- durable Build schema checks are sparse relative to the documented numeric,
  enum, status, and date-order invariants.

## Validation Layers

### Form Layer

- immediate format and required feedback after interaction;
- cross-field feedback on submit or when both fields are present;
- localized, actionable messages beside the field;
- invalid control focus and error summary for long forms;
- no business authorization inferred from hidden controls.

### API Layer

- strict Zod schema for body, params, and query;
- identity from JWT, never client `orgId` or self `userId`;
- record, relation, module, permission, and data-scope authorization;
- normalized strings, dates, URLs, enums, IDs, and bounded arrays;
- optimistic concurrency on editable records;
- field-path error envelope consumable by forms.

### Database Layer

- tenant-safe foreign keys;
- nullability and uniqueness matching the product contract;
- checks for numeric/range/date invariants;
- indexes that support validated lookup and uniqueness;
- transaction and idempotency constraints for retried writes.

One layer does not replace another. The frontend improves usability, the API
protects trust boundaries, and the database protects durable state.

## Universal Field Rules

- Required labels use visible text plus semantic `aria-required`.
- Optional fields say `Optional`; required fields are not implied only by an
  asterisk.
- Empty string, missing, and `null` have one documented meaning per field.
- User text is trimmed where surrounding whitespace has no meaning.
- Names and titles reject whitespace-only and punctuation-only values.
- IDs are positive integers or canonical UUID/string IDs as defined by the
  owning table.
- dates use ISO date or datetime contracts with explicit timezone behavior.
- start must not exceed end; due must not precede start unless the domain
  explicitly permits it.
- URL fields allow only approved schemes and normalize before storage.
- rich text is sanitized on write and render.
- arrays are deduplicated and bounded.
- enum parsing rejects unknown values rather than removing them.
- relation IDs must belong to the same organization and compatible scope.
- archived or inaccessible options cannot be newly assigned.
- server defaults are visible before submit or returned and patched
  immediately after create.

- [ ] **BLD-05-001** a field contract inventory records name, label, type,
  requiredness, nullability, default, normalization, limits, permission, source,
  and database column for every mutation field.
- [ ] **BLD-05-002** frontend and backend parity tests cover every inventoried
  field and reject contract drift.
- [ ] **BLD-05-003** all request schemas are strict and live in the owning
  module's schema file.
- [x] **BLD-05-004** all form schemas live in `*-schema.ts`, with types derived
  from the schema. **Closed — zero inline schemas remain.**
  Thirty-two components under `features/build/**` declared their react-hook-form
  `z.object` inline. Each moved to the `*-schema.ts` owning its folder, reusing
  the existing file where one was already present (`goal-form-schema.ts`,
  `intake-schema.ts`, `meeting-form-schema.ts`) rather than adding a second.
  All 22 schema files derive their type with `z.infer`; no hand-written parallel
  interface survives. `create-epic-dialog` and `edit-epic-dialog` each carried
  an identical copy of the priority and status lists — now one definition in
  `epic-schema.ts`.
  Verified by a repo scan returning no `z.object(` outside a `*-schema.ts` under
  `features/build/**` or `app/(authenticated)/build/**`; `pnpm type-check` clean;
  127 Build suites / 740 tests green. Commit `1430903f8`.
  No validation rule, field or message changed — this was a move, so it is not
  evidence that any form's rules are correct, only that they are owned.

## Form Inventory and Minimum Contract

| Form family | Minimum required input and cross-field rules |
|---|---|
| Project create/edit | name; stable key policy; owner/access validity; start/end order; workspace/product/customer links authorized |
| Workspace create/edit | name; owner; unique normalized name within allowed scope; archive/move impact |
| Managed product create/edit | name; owner; lifecycle; workspace and project links authorized; portal defaults explicit |
| Ticket create/edit | project from context; title 3–500 and meaningful; valid type/status; relation IDs compatible; date order; recurrence consistency |
| Ticket move/convert | destination; status/field mapping; hierarchy valid; visibility/access impact confirmed |
| Iteration | name; start/end; status transition; overlap/cadence and active-iteration rules |
| Module/epic | name/title; project; owner/date/progress rules; no hierarchy cycle |
| Milestone/release | name; target date/version rules; dependency and client-publication impact |
| Update | summary; health where required; audience; client visibility; reporting period uniqueness where configured |
| Goal/key result/check-in | title; owner; level; target/timebox; metric baseline/target/unit compatibility |
| Risk | title; probability; impact; owner; review date and mitigation requirements |
| Decision | title/context; owner; decision/status; supersession relation valid |
| Change request | title; reason; impact; requester; approver; affected scope; decision requirements |
| Incident | title; severity; status; commander/owner; start/resolution order; postmortem requirements |
| Meeting/action item | title; date/attendees or source meeting; action owner and due-date rules |
| QA case/run/result | title; project/suite; ordered steps; expected result; run cases; result evidence rules |
| Intake form/question | name; at least one valid field before publish; unique keys; required/conditional logic acyclic |
| Submission triage | target action; field mapping; duplicate/merge provenance retained |
| Automation | name; one trigger; valid conditions; at least one action; loop/rate/permission preview |
| Webhook/integration | endpoint/provider; events/scopes; URL security; secret rotation; test result |
| Custom field | name; type immutable after incompatible data; options unique; required/default compatibility |
| Status/workflow transition | stable state identity; category; source/target; no orphan default/completed state |
| Template | name; visibility; included sections; version and incompatible target preview |
| Client grant/visibility | client actor; exact scope; expiry where policy requires; fields/resources allowlisted |
| Member/access role | actor; scope; role; no self-escalation; last-owner protection |
| File/attachment | size, count, MIME/content agreement, filename, scan result, relation authorization |
| Comment/reaction | nonempty sanitized content; target access; mention recipients authorized |
| Time entry | project/ticket access; date; positive duration; overlap/period/approval rules |
| Budget/cost | currency; nonnegative amount; date/category; finance permission and precision |
| Agent proposal/credential | exact scope/action; confirmation policy; secret shown once; expiry and budget bounds |

- [ ] **BLD-05-005** every active create/edit/import/bulk form maps to one row in
  the inventory.
- [ ] **BLD-05-006** each row is expanded with actual current fields before
  implementation; requiredness is approved by product and backend owners.
- [ ] **BLD-05-007** fields labelled optional in UI are optional in the API and
  database, and the inverse.
- [ ] **BLD-05-008** hidden conditional fields are cleared or retained by an
  explicit rule and never submitted accidentally.
- [ ] **BLD-05-030** the source census and form appendix contain the identical
  component set; each row names route, component, save model, frontend schema,
  request schema, mutation, response/error mapping, and database invariants.

## Ticket Contract Repairs

- [ ] **BLD-05-009** create/edit/import/duplicate/template/bulk share one title,
  type, priority, points, estimate, link, and date policy.
- [ ] **BLD-05-010** `SUBTASK` is represented by one explicit hierarchy policy;
  frontend and backend cannot disagree.
- [ ] **BLD-05-011** zero-value estimate semantics are aligned.
- [ ] **BLD-05-012** type, priority, recurrence frequency, workflow status, and
  relation type reject unknown strings.
- [ ] **BLD-05-013** status, assignee, reporter, iteration, epic, module,
  customer, and parent are validated against project, tenant, access, and
  compatibility.
- [ ] **BLD-05-014** reporter defaults to the current actor; setting a different
  reporter requires an explicit product need and permission.
- [ ] **BLD-05-015** import applies the same row rules as normal create and
  reports row/field errors without partially claiming success.
- [ ] **BLD-05-031** Ticket type is one three-way contract across frontend,
  request schemas, and the database; `SUBTASK` cannot be accepted by only one
  or two layers.
- [ ] **BLD-05-032** setting another reporter or actor is either removed from
  client input or protected by a named permission and data-scope test.

## Imports and Files

- import preview shows parsed rows, mappings, defaults, warnings, and errors;
- CSV formula-leading cells are neutralized on export and treated as text on
  import;
- large import is asynchronous, idempotent, resumable or safely restartable,
  and has a downloadable error report;
- uploads validate size before transfer and content after transfer;
- executables and unsafe active content follow the platform file policy;
- failed scan never publishes a file URL;
- deleting a linked file follows retention and audit policy.

- [ ] **BLD-05-016** import has dry-run and commit contracts against the same
  parser.
- [ ] **BLD-05-017** import cannot reference another tenant's project, actor,
  status, label, or customer.
- [ ] **BLD-05-018** attachment limits are enforced at UI, API, object storage,
  and durable metadata layers.
- [ ] **BLD-05-033** one attachment count and size policy is shared by picker,
  form schema, request schema, upload service, and storage metadata.
- [ ] **BLD-05-034** ticket import has a discoverable permission-gated UI with
  mapping, dry run, commit, progress, cancellation policy, and row-error
  download before the backend endpoint is considered complete.

## Async and Cross-Field Validation

- unique key/name checks are debounced and advisory; the database remains
  authoritative;
- stale async responses cannot overwrite a newer value;
- unavailable validation service produces a retryable error, not false success;
- date, hierarchy, workflow, transition, and relation checks run again inside
  the write transaction;
- conflict errors preserve entered values and explain the changed server state.

- [ ] **BLD-05-019** duplicate name/key races produce a field-level 409.
- [ ] **BLD-05-020** stale version produces merge/reload choices.
- [x] **BLD-05-021** relation-cycle and last-owner checks are transactional.
  **Closed — unit proof, executed 2026-09-21.**
  Relation cycle: `assertSelfRefChain` runs on `tx` inside `this.db.transaction`
  (`core/projects-tickets-update.service.ts:246,255,257`, helper at `:56-124`).
  Proven by `core/projects-ticket-ancestry-race.spec.ts`, which is non-vacuous in
  the way that matters here — its `tx` mock returns an inverse edge that the
  non-transactional `db` handle does not, so a check performed *before* the
  transaction would pass and the spec would fail.
  Last owner: `pm-workspace-memberships.service.ts:174-197` and `232-270`, proven by
  `pm-workspace-memberships.service.spec.ts`, whose transaction mock **does** invoke
  its callback (`:88`) — without that, every assertion inside the transaction would
  be silently void.
  Both suites passed in a 6-suite / 42-test batch.

## Unsaved Work Contract

Every mutating surface chooses one:

1. explicit Save plus dirty-state registration;
2. proven autosave with saving/saved/error state and local recovery; or
3. atomic immediate mutation with rollback.

Covered exits include sidebar, breadcrumb, row link, scope selector, command
palette, browser Back/Forward, overlay close, Escape, refresh, tab close,
organization switch, sign-out, and programmatic post-action navigation.

- [ ] **BLD-05-022** enumerate every Build form, sheet, dialog, rich editor,
  whiteboard, meeting note, update, workflow editor, and settings surface.
- [ ] **BLD-05-023** every enumerated surface declares its save model and has a
  regression for dirty exit.
- [ ] **BLD-05-024** pending submission disables duplicate commit but does not
  trap the user indefinitely after a network failure.
- [ ] **BLD-05-025** `Stay`, `Discard`, and `Save and continue` appear only when
  supported and preserve focus.
- [ ] **BLD-05-026** local drafts are actor, tenant, scope, and record keyed,
  encrypted or non-sensitive by policy, expired, and cleared after commit.

## Error Presentation

- API errors have stable code, summary, field paths, retryability, correlation
  ID, and safe details.
- first invalid field receives focus after submit.
- long forms show a linked error summary.
- global toast does not replace field errors.
- conflict/dependency dialogs remain open and show every actionable blocker.
- secrets and internal SQL/provider errors never reach the client.

- [ ] **BLD-05-027** all forms map backend field paths to controls.
- [ ] **BLD-05-028** unknown errors retain user input and provide retry/support
  context.
- [ ] **BLD-05-029** errors are announced once to assistive technology.
- [ ] **BLD-05-035** every documented date-order, nonnegative/range, enum,
  stable status, and tenant-safe relation invariant identifies its owning
  database check, constrained relation, or explicit transactional proof.
- [ ] **BLD-05-036** the Intake accept mutation submits every field displayed
  by its form or removes the field; assignee, Cycle, and module cannot be
  collected and discarded.
- [x] **BLD-05-037** every non-trivial inline Build Zod object is moved to its
  one owning `*-schema.ts` only after confirming no canonical schema already
  exists; the root constitution's trivial single-field guard exception remains
  valid. **Closed — source proof 2026-09-21.** `z.object(` outside a
  `*-schema.ts` returns zero files across `frontend/features/build/**` and
  `frontend/app/(authenticated)/build/**`; so do `z.discriminatedUnion(`,
  `z.tuple(` and `z.record(`, which the original `z.object`-only census would
  have missed.
  ⚠ This does **not** also close `BLD-05A-003`, whose text adds "no duplicate
  shape remains". Absence of inline objects does not prove absence of two
  `*-schema.ts` files declaring one shape; that clause is still unproven.

## Acceptance

- [ ] **BLD-05-A01** schema parity gate covers all Build request forms and has a
  failing drift self-test.
- [ ] **BLD-05-A02** boundary tests cover empty, null, whitespace, limit,
  Unicode, invalid enum, invalid date, relation mismatch, stale version, and
  cross-tenant IDs.
- [ ] **BLD-05-A03** named database tests prove unique/check/FK and race
  behavior.
- [ ] **BLD-05-A04** browser tests prove required markers, keyboard error
  recovery, unsaved exits, offline submit, and server field errors.
- [ ] **BLD-05-A05** no production or development flow uses stubbed validation,
  fake options, or mock success.
