# Build Shared Module Interfaces

## Design rule

Shared UI should be deep: callers provide domain data and intent while pagination, accessibility, keyboard behavior, focus, empty/loading/error states, responsive layout, and interaction mechanics stay behind a small interface. Extend the existing module before creating another.

## Existing evidence

- `frontend/components/ui/data-table.tsx`
- `frontend/components/ui/date-range-picker.tsx`
- `frontend/components/ui/empty-state.tsx`
- `frontend/components/ui/confirm-dialog.tsx`
- `frontend/components/shared/entity-form-dialog.tsx`
- `frontend/components/shared/entity-form-sheet.tsx`
- `frontend/components/shared/page-state.tsx`
- `frontend/components/command-palette/`
- `frontend/features/build/views/kanban-virtual-ticket-list.tsx`

## Required interfaces

```ts
interface DataGridProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  selection?: SelectionModel<T>;
  pagination: CursorPagination | PagePagination;
  sort: SortState;
  onSortChange(next: SortState): void;
  mobileCard?: (row: T) => ReactNode;
  state: "loading" | "ready" | "empty" | "error" | "denied";
}

interface FilterBarProps<F> {
  value: F;
  definitions: FilterDefinition<F>[];
  onChange(next: F): void;
  onSaveView?(): void;
  search?: SearchConfig;
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  itemsByColumn: Record<string, T[]>;
  getItemId(item: T): string;
  renderCard(item: T): ReactNode;
  onMove(command: MoveCommand): Promise<void>;
  virtualized: true;
  wipPolicy?: WipPolicy;
}

interface EntityPickerProps<T> {
  value: string | string[] | null;
  query: string;
  loadPage(input: PickerQuery): Promise<CursorPage<T>>;
  getOption(option: T): { id: string; label: string; description?: string; avatar?: string };
  multiple?: boolean;
  onChange(value: string | string[] | null): void;
}

interface StatusChipProps {
  label: string;
  colorToken: SemanticStatusToken;
  icon?: LucideIcon;
  interactive?: boolean;
  onSelect?(): void;
}

interface CommentThreadProps {
  record: RecordRef;
  comments: CursorPage<Comment>;
  canComment: boolean;
  realtimeChannel?: string;
  onCreate(input: CommentInput): Promise<void>;
}

interface BulkActionBarProps<TAction extends string> {
  count: number;
  actions: Array<{ id: TAction; label: string; destructive?: boolean; disabledReason?: string }>;
  onAction(action: TAction): void;
  onClear(): void;
}

interface CommandPaletteCommand {
  id: string;
  label: string;
  group: string;
  keywords: string[];
  shortcut?: string;
  isAvailable: boolean;
  execute(): void | Promise<void>;
}
```

Additional interfaces: `DateRangePicker`, `PriorityChip`, `ActivityFeed`, `EmptyState`, `AppDialog`, `AppSheet`, `AssigneePicker`, `SavedViewMenu`, `DensityToggle`, and `ContextMenu`.

## Overlay decision rule

- **Popover:** reversible selection or compact inspection that does not interrupt context.
- **Dialog:** focused confirmation or form with at most five fields and no durable sub-navigation.
- **Sheet:** six or more fields, multi-section editing, linked context, or activity required while the originating page stays visible.
- **Full page:** durable URL, collaboration, history, complex builder/execution, or content that users revisit/share.
- Destructive or externally visible actions always use explicit confirmation and retain focus/pending guards.

## Design tokens

| Token | Contract |
|---|---|
| Spacing | 4 px base; dense controls 28–32 px; default controls 36–40 px; page gutters 16/24/32 px |
| Type | 12 metadata, 14 body/control, 16 section, 20 page title, 24 exceptional dashboard title |
| Radius | 4 px controls, 6 px cards/panels, 8 px overlays; no decorative pills except semantic chips |
| Color | semantic CSS tokens only: background/foreground/muted/border/primary/destructive plus status tokens |
| Density | comfortable and compact; persisted user preference, identical semantics |
| Motion | 120–180 ms; reduced-motion respected; no blocking decorative animation |

## Accessibility and responsive rules

- All icon-only controls have accessible names and tooltips.
- Drag operations have keyboard move alternatives and announcements.
- Charts include summaries and data tables.
- Status is never color-only.
- Fixed-format boards/tables use stable tracks and virtualization; text never overlaps.
- Mobile turns tables into specified cards only when essential fields remain visible.

## Acceptance criteria

- [x] Every new shared module has at least two consumers or replaces an existing duplicate. **2026-09-28 NOT EARNED. Measured this lane, and the measurement reverses the previous recommendation.**

  Measured: `frontend/components/shared/` holds **30** modules. Distinct non-test consumer files per module, counting `from "@/components/shared/<name>"` specifiers outside `components/shared/` itself:

  ```
    0  form-sheet-chrome          0  index                    0  page-state-plan-views
    0  page-state-shared          0  session-expired-state     1  access-denied
    1  page-state-views           2  ctc-breakdown-panel       2  presence-dot
    2  presence-status-picker     2  submission-bulk-toolbar   4  anonymity-suppressed-notice
    5  approval-route-panel       5  sanitized-html            5  source-badge
    6  entity-form-dialog         6  rich-surface              8  entity-form-sheet
    8  error-reference            9  dashboard-gate           10  app-dialog
   13  ticket-status-badge       21  app-sheet                30  format-ticket-key
   56  hr-sheet                  65  loading-state            68  dirty-state-context
   94  no-permission-state      286  page-state              401  error-state
  ```

  **The gate described in option (A) would report 7 of 30 modules (23%) as violations, and all 7 would be false positives.** Traced individually:

  - `page-state-shared`, `page-state-plan-views`, `page-state-views`, `session-expired-state`, `access-denied` are **private decomposition inside `components/shared/`** — `page-state.tsx:9-10` imports `SessionExpiredState` and `{DeniedView, FeatureLockedView, QuotaExceededView}`; `page-state-views.tsx:9,11` imports from `page-state-shared` and `page-state-plan-views`; `dashboard-gate.tsx:5` imports `AccessDenied`. Splitting one component into collaborating files is the opposite of the duplication FE-59 targets, and a consumer-count gate punishes it.
  - `index` is the barrel itself.
  - `form-sheet-chrome` reports 0 direct importers yet has **6 real consumers**, every one of them through the barrel (`components/shared/index.ts:4` re-exports it): `features/build/managed-products/managed-product-form-sheet.tsx:26`, `features/build/modules/module-form-sheet.tsx:12`, `features/build/portfolios/portfolio-form-sheet.tsx:19`, `features/build/programs/program-form-sheet.tsx:15`, `features/build/teams/team-form-sheet.tsx:20` and `features/hr/enterprise/comp/equity-grant-sheet.tsx:12`. **COUNT CORRECTED: the previous entry said 2.** It undercounted the very example it used to argue the gate is blind, which makes the argument stronger, not weaker: a specifier-counting gate would score the fifth-most-reused module in `components/shared/` at zero.

  That last one is the structural problem, and it is large. Re-measured this lane with a module-graph walk over `app`, `components`, `features`, `hooks` and `lib`, excluding `*.test.tsx?` and imports originating inside `components/shared/`: **262 non-test files import the barrel `@/components/shared`**, against **866 files** carrying a deep-path specifier (`grep -rlE 'from "@/components/shared/'`, 1,134 occurrences). A gate counting import specifiers is blind to every one of those 262 barrel consumers, so its false-positive rate is not a fixable rough edge — it is the design. The full re-measured distribution reproduces the table above module for module, with two differences, both from sibling-lane edits in flight: `error-reference` 8 → 9 and the barrel count 263 → 262. Nothing else moved, so the shape of the measurement is stable even though two of its integers are not.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether the two-consumer rule gets an automated gate, and if so whether the gate resolves barrel re-exports.

  - **(A) Specifier-counting gate, as previously recommended.** Cost: **red on day one against 7 correct modules.** Going green needs an allowlist seeded with all 7, which makes the gate a list of exceptions rather than a rule. Not recommended.
  - **(B) Code review only, on FE-59 and FE-60.** Cost: zero to build; relies on a reviewer noticing. FE-60's trigger ("promote on its second consumer") is a review-time judgement anyway, and the measurement above shows the population is small enough to eyeball — 30 modules, and only 4 sit at exactly 2 consumers.
  - **(C) Symbol-resolving gate.** Count consumers per exported *symbol*, resolving `components/shared/index.ts` re-exports and excluding imports originating inside `components/shared/`. Cost: a real module-graph walk, roughly the shape of `lib/query-keys/aggregate-import-boundary.test.ts` but with re-export resolution added; it would have correctly scored `FormSheetChrome` at 2 and correctly excluded the 5 private collaborators. Days, not hours, and it needs its own self-test or it reports zero vacuously.

  **DECISION RESOLVED 2026-09-28 — (B), review-enforced on FE-59 and FE-60.** (A) is rejected: it would be red on day one against 7 correct modules and would need an allowlist seeded with all of them, which converts a rule into a list of exceptions. The precedent cited for (A), `check:over-300`, counts lines in a file — a fact with no indirection; consumer counts have two layers of it (barrel re-export, intra-directory collaboration) and the measurement above shows both are load-bearing. (C) is the technically correct instrument and stays on the shelf: build it if a duplicate actually ships, not before, since it costs a module-graph walk with re-export resolution plus its own self-test to avoid reporting zero vacuously.

  **THE BOX STILL DOES NOT TICK, and after this measurement the reason is exactly one file.** Tracing each of the 7 low-count modules to a real consumer count, and reading the criterion as the disjunction it is — *two consumers* **or** *replaces an existing duplicate*:

  | Module | Real consumers | Second clause | Verdict |
  |---|---|---|---|
  | `index` | 262 | — | the barrel, not a component |
  | `form-sheet-chrome` | 6 | — | satisfied |
  | `page-state-shared` | 3 intra (`page-state-views.tsx:9`, `page-state-plan-views.tsx:7`, `session-expired-state.tsx:6`) | — | satisfied |
  | `page-state-views` | 2 (`page-state.tsx`, `app/(authenticated)/access-denied/page.tsx`) | — | satisfied |
  | `access-denied` | 2 (`dashboard-gate.tsx:5`, `features/organization/organization-structure-page.tsx`) | — | satisfied |
  | `page-state-plan-views` | 1 (`page-state-views.tsx:11`) | **yes** — created in `671ccfa97`, the commit that deleted 288 lines from `components/entitlement-gate.tsx` | satisfied by the second clause |
  | `session-expired-state` | 1 (`page-state.tsx:9`) | **no** — `88b1ab7c6` adds it and deletes nothing | **FAILS** |

  `git show --stat 671ccfa97` shows `entitlement-gate.tsx | 288 +-------` against the new `page-state-plan-views.tsx | 98 +`, so that module demonstrably replaced a duplicate renderer. `git show --stat 88b1ab7c6` shows `session-expired-state.tsx | 48 +++` with no deletion anywhere: it is a genuinely new single-consumer module in `components/shared/`, which is also what FE-60 says not to do — promote on the *second* consumer. **One file of thirty makes the box false as written, and it would be a rewording, not a measurement, to call it something other than a shared module.**

  The cheap repair is inlining, not promotion: `page-state.tsx` is 89 lines and `session-expired-state.tsx` is 48, so folding one into the other lands at 137 — well inside FE-57's 300-line ratchet, and it removes the file rather than adding an exception. (The reverse note for context: `page-state.tsx` plus its four collaborators is 486 lines in total, which is why the decomposition exists at all.) Source edit, out of this lane's write scope; routed to the orchestrator.

  **NOT A REQUIREMENT:** six of the 7 low-count modules are correct as they stand, and the seventh is a one-file defect with a one-file fix. Nothing above says a shared module may ship with one consumer — it says a specifier-counting gate cannot tell which ones do.

  **2026-09-28, third lane — EARNED. The one-file defect the entry above named has been repaired by this lane, and the box is now true as written.**

  The repair is the one the entry above recommended: inline, not promote. `components/shared/session-expired-state.tsx` is **deleted**, and its `SessionExpiredState` component now lives as a module-private function inside its only consumer, `frontend/components/shared/page-state.tsx:14-57`, called from the `session-expired` arm at `:98`. The file is **132 lines**, inside FE-57's 300-line ratchet as predicted (89 + 48 = 137 estimated; 132 actual, the five-line saving being the removed import header and the `handleSignIn` wrapper collapsing into the `onClick`).

  No dangling reference: `grep -rn "session-expired-state" app components features hooks lib scripts` → **no matches**. The module was never in the barrel either (`grep -n "session-expired" components/shared/index.ts` → no hit), so nothing outside the directory could have reached it.

  **THE POPULATION IS NOW 29 MODULES, AND EVERY ONE SATISFIES THE CRITERION AS THE DISJUNCTION IT IS.** `ls components/shared/ | grep -v '\.test\.' | wc -l` → **29**. Re-traced this lane, only the seven that a specifier count would flag:

  | Module | Real consumers | Verdict |
  |---|---|---|
  | `index.ts` | 262 barrel importers | the barrel, not a component |
  | `form-sheet-chrome` | **6** — `features/build/{managed-products,modules,portfolios,programs,teams}/*-form-sheet.tsx` + `features/hr/enterprise/comp/equity-grant-sheet.tsx`, all through the barrel | satisfied |
  | `page-state-shared` | **3** intra-directory — `page-state-views.tsx:9`, `page-state-plan-views.tsx:7`, `page-state.tsx:12` | satisfied (the third consumer moved from the deleted file to `page-state.tsx`, so the count is unchanged at 3) |
  | `page-state-views` | **2** — `page-state.tsx:11`, `app/(authenticated)/access-denied/page.tsx:4` | satisfied |
  | `access-denied` | **2** — `components/shared/dashboard-gate.tsx`, `features/organization/organization-structure-page.tsx` | satisfied |
  | `page-state-plan-views` | 1 — `page-state-views.tsx` | satisfied by the **second clause**: `git show --stat 671ccfa97` ("feat(page-state): one renderer for every page outcome") shows `components/entitlement-gate.tsx | 288 +-----` against the new `page-state-plan-views.tsx | 98 +` — re-verified on disk this lane |
  | ~~`session-expired-state`~~ | — | **module removed** |

  Commands, verbatim, `frontend/`:

  ```
  $ ls components/shared/ | grep -v '\.test\.' | wc -l
  29
  $ grep -rn "session-expired-state" app components features hooks lib scripts
  (no output)
  $ node scripts/check-page-state-usage.mjs --self-test
  PASS: self-test (5 assertions)
  $ node scripts/check-page-state-usage.mjs
  ✔  No self-closing <PageState /> call sites.
  $ nice -n 10 npx jest --maxWorkers=2 page-state
  Test Suites: 11 passed, 11 total
  Tests:       136 passed, 136 total
  ```

  The 11 suites include `components/shared/page-state.test.tsx` and `components/ui/__tests__/page-states-responsive.a11y.test.tsx`, so the `session-expired` arm is still exercised through `PageState` after the inline — which is what makes the deletion a refactor rather than a removal of behaviour.

  **The (B) decision recorded above is unchanged by this.** No gate was built and none should be: the box is now true by measurement, and the instrument that would have policed it would still have scored `FormSheetChrome` at zero. (C) stays on the shelf on the same terms — build it if a duplicate actually ships.
- [x] DataGrid supports server and cursor pagination without pretending a cursor is a page number. `frontend/components/ui/data-table.tsx:86` tags `mode === "cursor"` as `cursorPag` and `mode === "server"` as `serverPag`; line 99 disables client-side sorting when either is active (`isServerPagination = serverPag !== null || cursorPag !== null`), with comment explicitly stating "a server- or cursor-paginated table holds one page, and sorting that page would present a slice as the sorted set."
- [x] Kanban remains virtualized and keyboard operable. `frontend/features/build/views/kanban-virtual-ticket-list.tsx:258` renders with `mode="virtual"`; lines 118-134 attach `ariaAttributes`, `aria-label={ticket.title}`, and `onKeyDown={handleKeyDown}` to each card. Browser-level focus order and drag-keyboard-alternative require real-browser testing (FE-123); source confirms the hooks are wired.
- [ ] Overlay choice follows the documented rule on every page. **2026-09-28 NOT EARNED. Measured this lane; the previous recommendation of (B) stands, and now has a cost attached instead of an assertion.**

  Measured across the 635 non-test `.tsx` files in `frontend/features/build/` and `frontend/app/(authenticated)/build/`, and reproduced exactly this lane: **Dialog in 22 files · Sheet in 30 · Popover in 10 · Drawer in 6 · ResponsivePopover in 28.** So 96 overlay call sites across 5 primitives are in scope, and `ResponsivePopover` is already the second-most-used — FE-111's "below `md`, rung-2/3/4 panels become a Drawer" is being honoured through a shared primitive rather than per-site branching, which is the outcome the rule wants.

  **CLAIM CORRECTED — the form rungs are NOT delegated to shared primitives.** The previous entry argued for (B) partly on the grounds that "two of the four rungs are already delegated to shared primitives (`EntityFormDialog`/`EntityFormSheet`, `ResponsivePopover`), so the rung is usually decided by which primitive the author imports — visible in the first line of a diff". Measured: `EntityFormDialog` appears in **2** Build files and `EntityFormSheet` in **2**, against 22 files using a raw `<Dialog` and 30 using a raw `<Sheet`. Of those, **34 hand-wire `useForm` inside the overlay** — 11 dialogs and 23 sheets. So for the two form rungs the author picks the raw primitive in the overwhelming majority of cases, FE-74's "prefer `EntityFormSheet`/`EntityFormDialog`" is honoured at 4 sites of 38, and the rung is *not* legible from an import line. That argument for (B) does not survive; the argument that survives is the one below about what a scanner can and cannot decide.

  The rung decision this box asks about — Popover vs Dialog vs Sheet vs full page — turns on **field count** (FE-74: ≤5 fields → Dialog; 6+ or multi-section → Sheet), **durable URL**, **sub-navigation** and **whether the originating page must stay visible**. None of those four is recoverable from a JSX tag. A scanner can count `<FormField>` children inside a `<Dialog>`, but the `EntityFormDialog`/`EntityFormSheet` primitives take fields as a prop from a sibling `*-form-fields.tsx` (FE-75), so the count is not in the overlay's own subtree.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether overlay-rung compliance gets an automated gate or stays a review obligation.

  - **(A) Gate.** Scan the 96 sites and compare against the FE-110 ladder. Cost: it must resolve each overlay's field set across the `*-form-fields.tsx` boundary, then decide "durable URL" and "sub-navigation" — both of which are product judgements with no syntactic marker. A gate that guesses will be noisy, and a noisy gate gets switched off; that is the failure the `check:lifecycle-predicates` self-test explicitly guards against with its own "a gate that flags hundreds gets switched off" assertion. **Not recommended.**
  - **(B) Code review only — RECOMMENDED.** FE-110 and FE-74 are in `frontend/CLAUDE.md`, and the ladder diagram in `UI-KIT.md#overlay-ladder` is the single reference. Cost: zero to build; it relies on a reviewer checking the rung. The population is 96 sites, and two of the four rungs are already delegated to shared primitives (`EntityFormDialog`/`EntityFormSheet`, `ResponsivePopover`), so the rung is usually decided by which primitive the author imports — visible in the first line of a diff.
  - **(C) Partial gate on the one mechanical clause.** FE-74's field-count threshold *is* mechanical wherever fields are declared inline. Cost: much smaller than (A), but it only covers the inline-schema cases, and FE-75 exists to move schemas out of line — so the gate's coverage shrinks as FE-75 is honoured. A gate that works best on non-compliant code is the wrong instrument.

  **Adjacent measurement, which is the enforceable half of this box.** `check:dialog-descriptions` is a real gate over the same surface and it runs green: self-test 32 assertions passed; gate → `210 overlay sites across 5088 files render without a description or an explicit aria-describedby (baseline 215) — OK`. That ratchet enforces overlay *accessibility* (the §Accessibility rule above), and it has improved by 5 against its baseline. It does not speak to rung choice, and it should not be cited as if it did.

  **THE MECHANICAL CLAUSE IS MEASURABLE AFTER ALL, AND BUILD FAILS IT AT NINE SITES.** FE-74's threshold — ≤5 fields → Dialog, 6+ or multi-section → Sheet — is decidable wherever fields are declared as `<FormField>` in the overlay's own file. Counted for all 34 hand-wired form overlays in Build (`grep -c '<FormField'` per file):

  *Dialogs — all 11 compliant.* `approvals/decide-dialog.tsx` 2 · `approvals/delegate-dialog.tsx` 1 · `goals/add-link-dialog.tsx` 2 · `goals/check-in-dialog.tsx` 2 · `incidents/incident-follow-up-form.tsx` 5 · `settings/agent-token-create-dialog.tsx` 1 · `settings/git-integration-settings.tsx` 3 · `templates/apply-template-dialog.tsx` 4 · `whiteboard/create-board-dialog.tsx` 1 · plus `forms/components/form-submissions-tab.tsx` and `forms/form-detail-page.tsx` at 0 (their dialogs are not forms). Not one Dialog carries 6+ fields; `incident-follow-up-form.tsx` sits exactly on the boundary at 5. **The "≤5 → Dialog" half of FE-74 holds across Build without exception.**

  *Sheets — 9 sit at the Dialog rung with nothing visible to justify the escalation.* At 3 fields: `views/saved-views/create-view-sheet.tsx`, `templates/create-template-sheet.tsx`, `client-portal/portal-cr-sheet.tsx`, and the `New Webhook` sheet in `webhooks/project-webhooks-page.tsx:412`. At 4: `feedbucket/create-feedbucket-widget-sheet.tsx`, `milestones/milestone-upsert-sheet.tsx`. At 5: `meetings/action-item-form-sheet.tsx`, `releases/release-form-sheet.tsx`, `roadmap/changelog-sheet.tsx`. None of the nine contains a `Separator`, a `<Tabs`, a `<h3` or a section header, so none shows multi-section editing or durable sub-navigation on its face. Under FE-110 — "escalating past the first rung that fits is a violation" — each is a candidate violation, and the only thing that can excuse it is the one clause a scanner cannot read: whether the originating page must stay visible, or whether linked context is required. **`qa/test-run-sheet.tsx` shows what a justified one looks like:** 5 fields but 6 `<Tabs` occurrences, so durable sub-navigation puts it at the Sheet rung legitimately.

  *And the boundary the scanner genuinely cannot cross, with a named example.* Three Build sheets declare `useForm` and zero `<FormField>`: `goals/goal-form-sheet.tsx`, `meetings/meeting-form-sheet.tsx`, `intake/intake-page.tsx`. For the first, the field count lives in a sibling schema per FE-75 — `features/build/goals/goal-form-schema.ts:21-30` declares **7** fields (`title`, `description`, `level`, `status`, `ownerId`, `startDate`, `dueDate`) plus a dynamic key-results repeater, so the Sheet rung is correct and a `<FormField>` scan reads it as 0. That is the concrete case behind the paragraph above: FE-75 moves the count out of the overlay's subtree, so a gate built on the overlay's own JSX gets the answer wrong precisely where the codebase is most compliant.

  **DECISION RESOLVED 2026-09-28 — (B), review-enforced, with (C) explicitly rejected rather than deferred.** (A) is rejected because two of FE-110's four inputs (durable URL, sub-navigation) have no syntactic marker and a guessing gate gets switched off — the failure `check:lifecycle-predicates` names in its own self-test assertion. (C) is rejected on a sharper ground than cost: the measurement above shows its coverage is *inversely* correlated with compliance. It can only read overlays that declare fields inline, FE-75 exists to move them out, and the one Build sheet whose rung is unambiguously correct (`goal-form-sheet.tsx`, 7 schema fields) is exactly the one a `<FormField>` scan scores at 0. A gate that works best on non-compliant code is the wrong instrument. So the ladder stays a review obligation, read off `frontend/CLAUDE.md` FE-74/FE-110 and the `UI-KIT.md#overlay-ladder` diagram.

  **WHAT WOULD SETTLE THE BOX**, which the decision does not: a recorded rung note for each of the 9 named sheets, saying which FE-110 clause puts it above the Dialog rung, or a move down to a Dialog. Nine judgements, each a sentence. Until one of those exists the box asserts compliance "on every page" while nine pages have an unexplained escalation, so it stays unticked. Those are frontend source files; routed to the orchestrator.

  **NOT A REQUIREMENT:** leaving rung choice to review is a decision that it is not statically decidable, not permission to escalate past the first rung that fits. FE-110 still makes that a violation, and the nine sites above are candidate violations awaiting a judgement, not sanctioned exemptions.

  **2026-09-28, third lane — the nine rung notes the entry above asked for are recorded here. Two of the nine are justified, seven are not, so the box stays unticked and its blocker is now seven named files rather than nine unexamined ones.**

  The rung-4 clauses, read off `frontend/UI-KIT.md:124-138` (§ Overlay ladder) rather than paraphrased: `6+ fields`, `multi-section`, or `keep context`. `read-only detail of one record` is the `AppSheet` arm and does not apply to a form. A judgement below is a judgement about which of those three clauses applies, which is exactly what the (B) decision leaves to a reader — recording it here is what makes the obligation discharged rather than asserted.

  | Sheet | Fields | The clause, or its absence | Verdict |
  |---|---|---|---|
  | `templates/create-template-sheet.tsx` (219 lines) | 3 `<FormField>` | **multi-section.** Beyond the three fields it renders a second, non-form section — a `Default Tasks ({tickets.length})` heading at `:170` over an editable repeater at `:184` (`tickets.map`), with per-row edit handlers at `:74` and a submit mapper at `:90`. A variable-length editable list is the multi-section case. | **justified** |
  | `releases/release-form-sheet.tsx` (253 lines) | 5 | **judgement, not a clause.** Field 5 is a `TiptapEditor` with a static menu bar in a `min-h-[140px]` bordered box and a 10,000-character counter (`:211-236`). A rich-text editor with a toolbar is not a field the rung-3 `sm:max-w-md` dialog can hold, so the escalation is defensible — but "an embedded editor" is not one of the ladder's three clauses, and this note records a reader's call rather than a rule. | **justified on a recorded judgement** |
  | `views/saved-views/create-view-sheet.tsx` (179 lines) | 3 | **none found.** `layoutType` (`:100`) renders an option-card grid over `LAYOUT_TYPES` (`:108`) and `visibility` (`:134`) a card list over `VISIBILITY_OPTIONS` (`:142`). Both are single bounded choices; a card presentation makes a field taller, and FE-110 counts fields, not pixels. No second section, no 6th field, nothing the originating page must keep visible. | **candidate violation** |
  | `client-portal/portal-cr-sheet.tsx` (166 lines) | 3 | **none found.** `title`, `description`, `impact` — all three inside one `<div className="space-y-4">` at `:94`. Two are `Textarea`. Three fields, one section. | **candidate violation** |
  | `feedbucket/create-feedbucket-widget-sheet.tsx` (212 lines) | 4 | **none found.** `name`, two `Switch` rows (`:133`, `:160`), `defaultAssigneeId` — one `SheetBody` at `:101`, one `space-y-4`. | **candidate violation** |
  | `milestones/milestone-upsert-sheet.tsx` (323 lines) | 5 | **none found in the sheet.** One `SheetBody` (`:206`), one `space-y-4`, five fields. The 323 lines are a concurrency conflict resolver, and it renders as a **separate stacked `TicketConflictDialog`** at `:315-319`, not as a section inside this sheet — so it is not the multi-section clause. A reader could argue a dialog stacked over a dialog is worse than one over a sheet; that is an argument about the conflict path, not about this form's rung, and it is not recorded here as a justification. | **candidate violation** |
  | `meetings/action-item-form-sheet.tsx` (185 lines) | 5 | **none found.** `title`, `description`, `assigneeId`, `status`, `dueDate` in one `SheetBody` (`:109`). Exactly on FE-74's `≤5 → Dialog` boundary, with nothing above it. | **candidate violation** |
  | `roadmap/changelog-sheet.tsx` (204 lines) | 5 | **none found.** `title`, `content` (a `rows={6}` `Textarea`, `:129`), `type`, `version`, `isPublished` switch — one `SheetBody` (`:108`). The tall textarea is the same pixels-not-fields argument rejected above. | **candidate violation** |
  | `webhooks/project-webhooks-page.tsx:412` (`New Webhook`) | 3 | **not read by this lane.** `features/build/webhooks/**` is owned by a peer lane editing it live; reading it for a rung note would have raced its edits. Routed with the other two clauses unresolved. | **unexamined** |

  So the settling work the previous entry costed at "nine judgements, each a sentence" has been done for eight of nine, and the answer is not the hoped-for one: **seven escalations have no ladder clause behind them.** Under FE-110 each is a violation, and the criterion says "on every page", so the box cannot tick. The remedy for the seven is a move down to `EntityFormDialog` — which is also the FE-74 preference the measurement above shows is honoured at 4 sites of 38 — and each is a frontend source file under `features/build/` owned by a peer lane, so all seven are routed to the orchestrator rather than edited here.

  **SETTLES WHEN** the seven named sheets either move down to the Dialog rung or gain a clause that puts them above it, and `webhooks/project-webhooks-page.tsx:412` gets the same note once its lane is quiet. **The (B) decision is unaffected** — nothing here argues for a gate; it demonstrates that the review obligation (B) relies on had in fact not been discharged on eight surfaces, which is the cost (B) was accepted with.
- [ ] Shared modules own loading, error, empty, denied, focus, and responsive mechanics. **2026-09-28 NOT EARNED — BROWSER-ONLY for two of the six named mechanics. The previous entry recommended ticking now; that would have over-claimed, because `focus` and `responsive` are not observable from any gate in this repo.**

  The box names six mechanics. Four are statically verifiable and were verified this lane. Two are not.

  **VERIFIED — loading, error, empty, denied.**

  ```
  $ cd frontend && node scripts/check-page-state-usage.mjs --self-test
  PASS: self-test (5 assertions)
    (a) flags a self-closing <PageState />
    (b) accepts a <PageState> that wraps children
    (c) is not fooled by JSX nested inside an attribute expression
    (d) does not match a different tag sharing the prefix
    (e) reports exactly one violation across the fixture tree

  $ node scripts/check-page-state-usage.mjs
  PageState call sites scanned in: app, components, features
  ✔  No self-closing <PageState /> call sites.
  ```

  Assertion (e) is what makes this non-vacuous: the self-test proves the scanner finds a planted violation, so `✔` means "scanned and clean", not "matched nothing".

  ```
  $ node scripts/check-no-handrolled-empty-states.mjs --self-test
  check-no-handrolled-empty-states self-tests: 8 passed

  $ node scripts/check-no-handrolled-empty-states.mjs
  ✖  3 hand-rolled empty state block(s) found.
     Use <EmptyState> from components/ui/empty-state.tsx when touching these files:
    features/hr/employees/detail/timeline-tab.tsx:70
    features/hr/global/compliance-page-content.tsx:232
    features/hr/global/compliance-page-content.tsx:309
  ```

  That gate is RED, but **all 3 violations are in `features/hr/` and none is in Build territory** — so the *empty* mechanic is owned by the shared primitive everywhere in Build. Routed to the orchestrator for the HR lane; not a Build blocker.

  **MEASUREMENT HAZARD, recorded because it will bite the next lane.** The first run of `check:empty-states` in this lane crashed instead of reporting: `errno: -4094, code: 'UNKNOWN', syscall: 'scandir', path: 'frontend\features\crm\settings\__tests__'`, thrown from `walkFiles` (`scripts/check-no-handrolled-empty-states.mjs:164`). A direct `readdirSync` of that exact directory succeeds, and an immediate re-run of the gate completed normally — so it is a transient Windows `scandir` failure while sibling lanes are writing the tree, not a defect in the gate or in that directory. **A crash is not a pass.** The gate prints its self-test line and then dies, so a caller reading only the head of the output would record "8 passed" and conclude the gate was green. Re-run before trusting any result from this gate.

  **CORRECTION 2026-09-28 — THE BROWSER HARNESS EXISTS, AND IT NEEDS NO BACKEND.** The claim below that "no gate in `frontend/package.json` measures focus management or breakpoint behaviour" is false, and it is the kind of false claim that retires a box permanently. On disk: `frontend/app/(public)/design-system/` holds **12** public gallery routes (`build-list`, `content-intake`, `execution-core`, `governance-qa`, `managed-products`, `org-work`, `planning-surfaces`, `portals`, `qa-execution`, `settings`, `teams-team`, plus the index), and `frontend/e2e/` holds **10 Playwright specs that drive them** — `build-list-responsive.spec.ts` plus nine `*-a11y.spec.ts`. Between them: **379 tests, all three viewports (375/768/1280), 163 focus assertions** (`toBeFocused` / `document.activeElement`). `playwright.config.ts:162-168` boots its own server (`pnpm exec next dev -p <PORT>`), and **none of these 10 specs carries a `hasBackendSecrets`/`hasTenantEnv` skip guard** — that guard is on `authenticated-shell.spec.ts`, `hrms-routes.spec.ts` and the five `inventory-*` specs, which are the ones that skip without a backend. These do not skip; the gallery routes are public and render fixture rows.

  **Two of this box's six mechanics are therefore already measured in a real browser.** `e2e/build-list-responsive.spec.ts:168-188`, test *"the filters drawer takes focus, shows every filter and gives it back"*: opens the trigger, asserts `page.getByRole("dialog")` is visible, evaluates `node.contains(document.activeElement)` to prove focus moved inside, presses `Escape`, asserts the dialog is hidden and `await expect(trigger).toBeFocused()`. That is focus-in, focus-restore, on a real overlay. And the responsive switch: *"three filters collapse behind one labelled drawer trigger"* at 375 (`:160`) against *"filters return inline and the drawer trigger retires"* at 768 (`:274`) is FE-111's `md` boundary, measured.

  **What genuinely remains** is coverage, not instrumentation — one primitive of four is exercised, and `PageState`'s branches are not mounted in a gallery at all (`features/build/shared/build-list-gallery-cases.tsx` imports only `EmptyState`, at `:9`, used at `:304`; no `PageState`, `LoadingState`, `ErrorState` or `NoPermissionState`). Missing: `EntityFormDialog`, `EntityFormSheet`, the `vaul` Drawer, and a gallery case per `PageState` branch. This lane did **not** run the suite — it boots `next dev` on a shared port and writes `.next-e2e` into a tree seven lanes are editing, which would be measuring a moving tree; it should be scheduled when the tree is quiet. So the box stays unticked for want of four gallery cases and their specs, **not** for want of a harness.

  **Two mechanics not yet covered by that harness.** FE-123 is right that jsdom cannot see layout overflow, real focus order or paint; what was wrong was concluding that nothing in this repo can. Specifically still unmeasured:
  - **Focus.** Whether `entity-form-dialog.tsx` / `entity-form-sheet.tsx` trap focus, restore it to the trigger on close, and keep it inside the overlay on Tab — and whether `vaul` Drawer takes focus at all, which is a known real-browser-only observation.
  - **Responsive.** Whether FE-111's `md` switch from popover to Drawer actually renders a Drawer at 375px, and whether the fill chain (FE-98) leaves each state filling height rather than collapsing.

  What *was* verified adjacent to those: `check:dialog-descriptions` self-test 32 passed, gate → `210 overlay sites across 5088 files render without a description or an explicit aria-describedby (baseline 215) — OK`. That is an accessibility ratchet on overlay *labelling*, improving against baseline; it says nothing about focus order. And `ResponsivePopover` is imported in 28 Build files, which is structural evidence that the responsive switch is delegated to a shared primitive rather than hand-branched — but importing it is not the same as rendering a Drawer at 375px.

  **WHAT WOULD SETTLE IT — and it is now a small, costed piece of work, not a rebuilt stack.** Add gallery cases under `frontend/app/(public)/design-system/` for an `EntityFormDialog`, an `EntityFormSheet`, a `vaul` Drawer and a `PageState` in each of its loading/error/empty/denied branches, then extend the existing `*-a11y.spec.ts` pattern over them at 375/768/1280 (FE-120), asserting: focus moves into the overlay on open, returns to the trigger on close, Tab does not escape; the popover renders as a Drawer below `md`; each state fills its container instead of collapsing. `ResponsivePopover` is already done — `e2e/build-list-responsive.spec.ts:168-188` and `:160`/`:274` are the template to copy. Operational notes for whoever runs it: the config refuses to reuse a server, so free port 3000 first, and it writes `NEXT_DIST_DIR=.next-e2e`, which is worth knowing because a stale `.next-e2e` has broken the frontend typecheck before. Until those cases exist this box has four mechanics verified statically and two verified for one primitive only, which is why it is unticked rather than partially ticked.

  **THE SCOPE QUESTION the previous entry raised is now moot for the four static mechanics** — `check:page-state-usage` and `check:empty-states` both scan `app`, `components` and `features`, so they already cover feature-level components, not just the primitives. There is no primitives-only-versus-feature-scope decision left to make: the gates are feature-wide and Build is clean in both.

  **2026-09-28, third lane — STILL NOT EARNED, and the two outstanding mechanics stay BROWSER-ONLY. Said plainly: this lane did not run a browser, so it produced no focus or responsive evidence and will not substitute a source audit or a component test for either.**

  Re-verified the statically verifiable half, this lane, `frontend/`:

  ```
  $ node scripts/check-page-state-usage.mjs --self-test
  PASS: self-test (5 assertions)
    (a) flags a self-closing <PageState />
    (b) accepts a <PageState> that wraps children
    (c) is not fooled by JSX nested inside an attribute expression
    (d) does not match a different tag sharing the prefix
    (e) reports exactly one violation across the fixture tree
  $ node scripts/check-page-state-usage.mjs
  PageState call sites scanned in: app, components, features
  ✔  No self-closing <PageState /> call sites.
  ```

  Still green after this lane's inline of `SessionExpiredState` into `page-state.tsx` (see box 1) — which is the change that matters for this box too, because the `session-expired` arm is now rendered from inside `PageState` rather than delegated to a sibling module, and the 11 `page-state` suites (136 tests) still pass over it.

  **The four gallery cases the entry above costed have NOT been added, and this lane deliberately did not add them.** Adding a `PageState` case, an `EntityFormDialog` case, an `EntityFormSheet` case and a `vaul` Drawer case to `frontend/app/(public)/design-system/` is cheap; the assertions that would earn the box are not, because they only mean anything once the Playwright suite runs, and running it here would boot `next dev` on a shared port and write `.next-e2e` into a tree six peer lanes are editing live. A pass measured against a moving tree is not a measurement. **The box therefore stays unticked for want of a browser run, not for want of a harness or of gallery code** — the harness is real (12 public gallery routes, 10 non-skipping specs, 379 tests, 375/768/1280, 163 focus assertions) and `e2e/build-list-responsive.spec.ts:168-188` is the template.

  **SETTLES WHEN** the tree is quiet enough to schedule one Playwright run: add the four gallery cases, extend the `*-a11y.spec.ts` pattern over them at the three viewports, and record which of `focus moves in / returns to trigger / Tab does not escape / renders a Drawer below md / each state fills rather than collapses` each one satisfies. Free port 3000 first; the config refuses `reuseExistingServer`, and a stale `.next-e2e` has broken the frontend typecheck before.
