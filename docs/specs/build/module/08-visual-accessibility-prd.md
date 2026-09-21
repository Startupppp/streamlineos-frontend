# BLD-08 — Visual Hierarchy, Responsive UX, and Accessibility PRD

> Acceptance reference only. Dispatch and status live in
> [`Build execution`](../README.md); do not assign
> or tick a checkbox in this file directly.

## Outcome

Build is compact, calm, legible, and fast to scan while keeping every workflow
usable by keyboard, touch, screen reader, high zoom, reduced motion, and mobile
users. “Agentic” means helpful context and safe action proposals, not decorative
glow or visual noise.

## Current Source Findings

- light theme tokens are technically different: page background is `#f8fafc`
  and card/popover are `#ffffff`. The issue is low perceived separation, not
  literal token equality.
- dark theme already gives background, card, and popover progressively lighter
  surfaces.
- Dialog and Sheet primitives use `bg-background`, so large overlays can look
  like another page canvas rather than an elevated surface.
- Build uses many dialogs, sheets, cards, tables, and dense toolbars with
  inconsistent responsibility.
- Project Chat currently returns no loading UI while its channel request is in
  flight, creating a blank page state.
- some action menus appear on hover at larger breakpoints and remain visible on
  touch sizes; this must be verified for keyboard and zoom rather than assumed.
- the current rich ticket-create flow uses a dialog although it contains
  advanced work assigned to the sheet level.
- the current update reader opens a detail dialog whose main body can omit the
  update title and related context visible in the list.

## Surface Hierarchy

Use semantic tokens, not page-local arbitrary colors:

1. **Canvas** — application/page background.
2. **Primary surface** — main content region.
3. **Contained surface** — card, table, board column, or section.
4. **Elevated surface** — popover, menu, dialog, sheet.
5. **Interactive state** — hover, selected, focused, dragged, invalid.

Rules:

- adjacent levels differ through semantic fill plus border or elevation;
- light and dark modes preserve the same hierarchy;
- card-on-card nesting is replaced by sections, dividers, or one container;
- transparent backgrounds are used only when the parent already supplies
  containment;
- selection is not communicated by color alone;
- overlays include scrim, border, shadow, and an elevated surface token;
- visual hierarchy changes are made in global tokens/primitives when the job is
  global, not copied into Build pages.

- [ ] **BLD-08-001** measure current light/dark surface combinations and approve
  token changes with screenshots, not subjective labels.
  **Measured 2026-09-21; open on the approval clause.**
  Ratios are WCAG 2.1 relative luminance computed from the resolved
  `globals.css` token values, alpha-blending each tint against its real backdrop
  before comparing. The method was checked against the Annex A 21.00:1
  black-on-white reference and two hand-computed mid-greys (`#808080` on white =
  3.95:1) before the pairs were read, so the numbers are not self-certified.
  41 light/dark pairs measured; every chrome, foreground,
  primary, secondary, accent, popover, sidebar and ring pair passes, in both
  modes. All dark-mode status pairs pass with ≥1.6:1 of margin.
  **Three light-mode pairs fall below AA normal text (4.5:1):**
  `status-success-ink` on its surface 3.58:1, `status-warning-ink` 3.46:1,
  `status-danger-ink` 4.41:1.
  **These are not token defects, and the tokens must not be "fixed".** The
  system is deliberately two-level: `-ink` is the 3:1 non-text ink for icons and
  borders (SC 1.4.11), `-ink-strong` is the 4.5:1 text ink.
  `components/ui/__tests__/contrast-status-tokens.test.ts:29` already asserts
  that exactly `["success", "warning", "danger"]` sit below AA — so raising
  `-ink` to the `-ink-strong` value would collapse the two levels and fail the
  test that documents the design.
  **The defect is at call sites that render words in `-ink`.** Extending the
  measurement to the untinted surfaces the audit did not cover:
  `success-ink` and `warning-ink` fail 4.5:1 on **every** light surface —
  card (3.77, 3.58), background (3.60, 3.43) and muted (3.44, 3.27) — so there
  is no light context in which they are safe for text. `danger-ink` (4.41) and
  `neutral-ink` (4.34) additionally fail on `muted`. Every `-ink-strong` clears
  4.5:1 on all three.
  Scope: 1,716 `text-status-{success,warning,danger}-ink` call sites repo-wide;
  about 180 under `features/build/**`, of which 72 pair the ink with a tinted
  `-surface` and are therefore measured failures today. A confirmed example is
  `features/build/navigation/build-scope-recovery.tsx:66`, whose warning
  paragraph renders at 3.46:1.
  Not closed: the item also requires approving changes **with screenshots**, and
  no browser has run. The repo-wide call-site sweep is larger than Build and
  needs its own packet with a ratchet, since a gate over 1,716 sites cannot land
  green in one change.
- [ ] **BLD-08-002** Card, Popover, Dialog, Sheet, menu, tooltip, and board
  column have distinct documented elevation roles.
- [ ] **BLD-08-003** no retained Build page uses identical adjacent surface
  treatment that erases container boundaries.
- [ ] **BLD-08-004** status, priority, risk, health, and client visibility pair
  color with text/icon/pattern.

## Page Layout

### Standard Collection

- compact page header;
- optional scope/breadcrumb line;
- primary action aligned with title at desktop and in a stable action row on
  mobile;
- search/filter/view toolbar;
- active filter chips only when filters are present;
- content fills remaining height;
- pagination/continuation is part of the content, not a floating surprise.

### Detail

- identity and state first;
- primary fields grouped by customer job;
- description/evidence center;
- activity/comments in a bounded, independently paginated region;
- sticky actions only when they do not cover content;
- deterministic back/close target.

### Settings

- scope and inheritance visible;
- left sub-navigation on wide screens, accessible selector on small screens;
- one section owner per route;
- sticky Save only for explicit-save forms;
- danger/archive separated after normal settings.

- [ ] **BLD-08-005** all retained pages map to collection, overview, detail,
  execution, settings, or canvas anatomy.
- [ ] **BLD-08-006** page headers contain no duplicate breadcrumb, back, title,
  scope, or action controls.
- [ ] **BLD-08-007** dense toolbars wrap or collapse predictably at 320, 375,
  768, 1024, and 1440 CSS pixels.

## Density and Readability

- compact density is default for expert work, not tiny text;
- comfortable density is available for tables/list/board where useful;
- primary text uses the normal readable token; micro text is metadata only;
- keys, dates, and numeric values use tabular or monospace treatment only where
  it improves comparison;
- titles truncate after preserving key and action access;
- descriptions do not appear on every card by default;
- whitespace groups related controls before borders and cards are added.

- [ ] **BLD-08-008** board card defaults show at most five secondary signals.
- [ ] **BLD-08-009** tables support resize/reorder without making the first
  identity column inaccessible.
- [ ] **BLD-08-010** 200% zoom and browser text scaling do not overlap, clip, or
  hide required actions.

## Overlay Ladder

| Surface | Use | Do not use |
|---|---|---|
| Inline | One reversible scalar | Multi-field validation or destructive action |
| Popover | Filter, sort, display, short selector | Long form or nested navigation |
| Dialog | Confirmation, short decision, irreversible impact | Rich create/edit with files and sections |
| Sheet | Rich create/edit, preview, relation manager | Multi-step migration or execution workspace |
| Full page | Detail, builder, workflow design, import, incident/test execution | One short confirmation |

Responsive behavior:

- desktop side sheets become full-height mobile sheets;
- dialogs fit the viewport and scroll internally without hiding title/actions;
- nested modal stacks are removed or replaced by one owned flow;
- destructive confirmation is never buried behind a second menu after submit.

- [ ] **BLD-08-011** inventory every Build overlay and assign one ladder level.
- [ ] **BLD-08-012** rich ticket/project forms no longer masquerade as small
  dialogs.
- [ ] **BLD-08-013** overlays have visible titles, descriptions, close action,
  dirty-state behavior, initial focus, focus trap, and focus return.
- [ ] **BLD-08-014** no overlay opens another blocking overlay for a normal
  path.

## Boards, Tables, Lists, and Timelines

### Board

- column headers stay visible;
- counts distinguish total from loaded;
- each column has its own continuation;
- card actions work without hover;
- horizontal scrolling exposes position and supports keyboard/touch;
- drag has accessible move alternatives.

### Table

- semantic table where feasible;
- sortable headers state direction;
- selection announces count and scope;
- pinned identity/actions do not cover data;
- virtualization retains accessible row identity and focus.

### List

- hierarchy depth is visible without relying only on indentation;
- expand/collapse is keyboard operable;
- compact metadata order remains consistent.

### Timeline

- rows remain linked to accessible text data;
- zoom and date navigation are labelled;
- unscheduled and dependency states are available without pointer precision;
- reduced motion removes animated pans/transitions.

- [ ] **BLD-08-015** each view passes mouse, touch, keyboard, and screen-reader
  task checks.
- [ ] **BLD-08-016** virtualized content preserves focus and announcements when
  rows unmount.
- [ ] **BLD-08-017** sticky regions never obscure focused content.

## Feedback and State

Every page distinguishes:

- initial loading;
- background refresh;
- empty collection;
- no filter results;
- denied;
- offline/stale;
- recoverable error;
- not found;
- conflict;
- partial success.

Rules:

- skeletons match final geometry;
- background refresh does not erase usable data;
- empty state has at most one primary next step;
- error keeps user input and context;
- optimistic change is visibly pending only when meaningful;
- toast confirms transient outcome but does not carry required detail;
- destructive or partial errors stay in context.

- [ ] **BLD-08-018** state matrix is implemented on every retained route.
- [ ] **BLD-08-019** stale and offline data are labelled with last successful
  update and unsafe writes disabled.
- [ ] **BLD-08-020** loading and error announcements do not repeat on every
  query refresh.

### State Applicability by Page Anatomy

- **Collection:** all ten states apply; conflict appears in inline/overlay
  mutation, and partial success applies to bulk/import/export.
- **Overview:** loading, refresh, denied, stale/offline, error, not found, and
  embedded-section empty states apply; no-filter and partial success apply only
  to an embedded collection/action.
- **Detail:** loading, refresh, denied, stale/offline, error, not found, and
  conflict apply; empty means an empty child section, never a fake missing
  record.
- **Execution:** loading/resume, refresh, denied, offline, error, not found,
  conflict, and partial success apply; safe local progress recovery is explicit.
- **Settings:** loading, refresh, denied, offline, error, not found, conflict,
  and dependency-blocked states apply; a section never uses a decorative empty
  collection state.
- **Canvas/editor:** loading/recovery, refresh, denied, offline, error, not
  found, conflict, and partial sync apply with version and autosave status.

Every BLD-02C through BLD-02F page inherits exactly one anatomy. A page may
mark a state N/A only with a product reason in its page contract.

- [ ] **BLD-08-031** every retained page records its anatomy, applicable state
  set, N/A reasons, and browser evidence IDs; validation reports zero blank
  cells.

## Accessibility

- WCAG 2.2 AA target;
- semantic landmarks and one meaningful page heading;
- visible focus ring with sufficient contrast;
- complete keyboard order and no trap outside active modal;
- minimum practical pointer target of 44 by 44 CSS pixels for primary touch
  controls, with compact desktop affordances retaining adequate spacing;
- labels for icon-only controls;
- programmatic error, required, expanded, selected, pressed, sort, drag, and
  live status;
- contrast verified for text, icons, controls, borders needed to understand
  state, focus, and charts;
- charts expose text summary and underlying data;
- reduced motion disables nonessential animation;
- high contrast/forced colors preserve controls and state.

- [ ] **BLD-08-021** automated accessibility checks run on representative
  states but do not replace manual testing.
- [ ] **BLD-08-022** keyboard task suite covers navigation, filters, views,
  board move, table bulk, forms, overlays, and settings.
- [ ] **BLD-08-023** screen-reader task suite covers one collection, ticket
  detail, board, form validation, partial bulk result, and client preview.
- [ ] **BLD-08-024** light, dark, forced-colors, reduced-motion, and 200% zoom
  evidence is recorded.
- [ ] **BLD-08-032** each retained page records desktop, tablet, mobile,
  200%-zoom, keyboard, and touch behavior or an explicit N/A reason.
- [ ] **BLD-08-030** update detail shows title, author/time, health/audience,
  body, attachments/relations, and permitted actions without relying on the
  obscured list row.

## Agentic UX

- Agent Pulse shows only scope-relevant proposals, failures, and completed
  outcomes.
- AI actions name target records, exact change, evidence, permission, and cost.
- suggestions are visually distinct from committed data.
- approve, edit, reject, and inspect evidence remain compact and predictable.
- progress does not simulate certainty or invent status.
- AI is absent when it cannot provide scoped, evidence-backed value.

- [ ] **BLD-08-025** no agent count reuses unrelated global notification data.
- [ ] **BLD-08-026** pending proposals remain distinguishable from executed
  actions and expire safely.
- [ ] **BLD-08-027** client-visible AI drafts require explicit human approval.

## Responsive Product Contract

- mobile prioritizes My Work, ticket detail, updates, comments, approvals, quick
  create, and client progress;
- complex board/timeline remains usable through scroll and alternate list
  access, not hidden;
- table columns collapse by priority and expose a row detail sheet;
- settings navigation becomes a labelled selector;
- no hover-only control;
- safe-area insets and virtual keyboard do not cover actions.

- [ ] **BLD-08-028** persona task flows pass on narrow phone, tablet, laptop,
  and large desktop viewports.
- [ ] **BLD-08-029** landscape/portrait changes preserve unsaved state and
  current record.

## Acceptance

- [ ] **BLD-08-A01** approved before/after screenshots cover every page anatomy,
  overlay level, theme, and responsive breakpoint.
- [ ] **BLD-08-A02** no global primitive change regresses non-Build screens in
  focused visual/browser checks.
- [ ] **BLD-08-A03** automated and manual accessibility findings at release
  severity are closed.
- [ ] **BLD-08-A04** freelancer, enterprise operator, and external client can
  complete their primary flows without hidden, ambiguous, or duplicated
  controls.
