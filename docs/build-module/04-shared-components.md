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

- [ ] Every new shared module has at least two consumers or replaces an existing duplicate. **2026-09-28 NOT EARNED. Measured this lane, and the measurement reverses the previous recommendation.**

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
  - `form-sheet-chrome` reports 0 direct importers yet has **2 real consumers**, both reaching it through the barrel: `features/build/managed-products/managed-product-form-sheet.tsx:26` and `features/build/modules/module-form-sheet.tsx:12`, each `import { FormSheetChrome } from "@/components/shared"`.

  That last one is the structural problem, and it is large: **263 files import the barrel `@/components/shared`** versus 1,116 deep-path specifier imports. A gate counting import specifiers is blind to every barrel consumer, so its false-positive rate is not a fixable rough edge — it is the design.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether the two-consumer rule gets an automated gate, and if so whether the gate resolves barrel re-exports.

  - **(A) Specifier-counting gate, as previously recommended.** Cost: **red on day one against 7 correct modules.** Going green needs an allowlist seeded with all 7, which makes the gate a list of exceptions rather than a rule. Not recommended.
  - **(B) Code review only, on FE-59 and FE-60.** Cost: zero to build; relies on a reviewer noticing. FE-60's trigger ("promote on its second consumer") is a review-time judgement anyway, and the measurement above shows the population is small enough to eyeball — 30 modules, and only 4 sit at exactly 2 consumers.
  - **(C) Symbol-resolving gate.** Count consumers per exported *symbol*, resolving `components/shared/index.ts` re-exports and excluding imports originating inside `components/shared/`. Cost: a real module-graph walk, roughly the shape of `lib/query-keys/aggregate-import-boundary.test.ts` but with re-export resolution added; it would have correctly scored `FormSheetChrome` at 2 and correctly excluded the 5 private collaborators. Days, not hours, and it needs its own self-test or it reports zero vacuously.

  **Recommended: (B) now, (C) only if a duplicate actually ships.** The previous recommendation of (A) cited `check:over-300` as precedent for cheap count-ratchets, but `check:over-300` counts lines in a file — a fact with no indirection. Consumer counts have two layers of indirection (barrel re-export, intra-directory collaboration) and the measurement above shows both are load-bearing here. There is no evidence of the failure mode the gate would catch: the lowest genuine count is 2, so **no shared module currently violates the rule**. Building (A) would add a gate whose first act is to misreport correct code.

  **NOT A REQUIREMENT:** the 7 low-count modules are correct as they stand. Nothing above says a shared module may ship with one consumer — it says a specifier-counting gate cannot tell the difference.
- [x] DataGrid supports server and cursor pagination without pretending a cursor is a page number. `frontend/components/ui/data-table.tsx:86` tags `mode === "cursor"` as `cursorPag` and `mode === "server"` as `serverPag`; line 99 disables client-side sorting when either is active (`isServerPagination = serverPag !== null || cursorPag !== null`), with comment explicitly stating "a server- or cursor-paginated table holds one page, and sorting that page would present a slice as the sorted set."
- [x] Kanban remains virtualized and keyboard operable. `frontend/features/build/views/kanban-virtual-ticket-list.tsx:258` renders with `mode="virtual"`; lines 118-134 attach `ariaAttributes`, `aria-label={ticket.title}`, and `onKeyDown={handleKeyDown}` to each card. Browser-level focus order and drag-keyboard-alternative require real-browser testing (FE-123); source confirms the hooks are wired.
- [ ] Overlay choice follows the documented rule on every page. **2026-09-28 NOT EARNED. Measured this lane; the previous recommendation of (B) stands, and now has a cost attached instead of an assertion.**

  Measured across the 635 non-test `.tsx` files in `frontend/features/build/` and `frontend/app/(authenticated)/build/`: **Dialog in 22 files · Sheet in 30 · Popover in 10 · Drawer in 6 · ResponsivePopover in 28.** So 96 overlay call sites across 5 primitives are in scope, and `ResponsivePopover` is already the second-most-used — FE-111's "below `md`, rung-2/3/4 panels become a Drawer" is being honoured through a shared primitive rather than per-site branching, which is the outcome the rule wants.

  The rung decision this box asks about — Popover vs Dialog vs Sheet vs full page — turns on **field count** (FE-74: ≤5 fields → Dialog; 6+ or multi-section → Sheet), **durable URL**, **sub-navigation** and **whether the originating page must stay visible**. None of those four is recoverable from a JSX tag. A scanner can count `<FormField>` children inside a `<Dialog>`, but the `EntityFormDialog`/`EntityFormSheet` primitives take fields as a prop from a sibling `*-form-fields.tsx` (FE-75), so the count is not in the overlay's own subtree.

  **THE DECISION THE OWNER MUST MAKE, in one sentence:** whether overlay-rung compliance gets an automated gate or stays a review obligation.

  - **(A) Gate.** Scan the 96 sites and compare against the FE-110 ladder. Cost: it must resolve each overlay's field set across the `*-form-fields.tsx` boundary, then decide "durable URL" and "sub-navigation" — both of which are product judgements with no syntactic marker. A gate that guesses will be noisy, and a noisy gate gets switched off; that is the failure the `check:lifecycle-predicates` self-test explicitly guards against with its own "a gate that flags hundreds gets switched off" assertion. **Not recommended.**
  - **(B) Code review only — RECOMMENDED.** FE-110 and FE-74 are in `frontend/CLAUDE.md`, and the ladder diagram in `UI-KIT.md#overlay-ladder` is the single reference. Cost: zero to build; it relies on a reviewer checking the rung. The population is 96 sites, and two of the four rungs are already delegated to shared primitives (`EntityFormDialog`/`EntityFormSheet`, `ResponsivePopover`), so the rung is usually decided by which primitive the author imports — visible in the first line of a diff.
  - **(C) Partial gate on the one mechanical clause.** FE-74's field-count threshold *is* mechanical wherever fields are declared inline. Cost: much smaller than (A), but it only covers the inline-schema cases, and FE-75 exists to move schemas out of line — so the gate's coverage shrinks as FE-75 is honoured. A gate that works best on non-compliant code is the wrong instrument.

  **Adjacent measurement, which is the enforceable half of this box.** `check:dialog-descriptions` is a real gate over the same surface and it runs green: self-test 32 assertions passed; gate → `210 overlay sites across 5088 files render without a description or an explicit aria-describedby (baseline 215) — OK`. That ratchet enforces overlay *accessibility* (the §Accessibility rule above), and it has improved by 5 against its baseline. It does not speak to rung choice, and it should not be cited as if it did.

  **NOT A REQUIREMENT:** leaving rung choice to review is a decision that it is not statically decidable, not permission to escalate past the first rung that fits. FE-110 still makes that a violation.
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

  **BROWSER-ONLY — focus and responsive.** FE-123 states plainly that jsdom cannot see layout overflow, real focus order or paint, and no gate in `frontend/package.json` measures focus management or breakpoint behaviour. Two specific things this box asserts and no static evidence can support:
  - **Focus.** Whether `entity-form-dialog.tsx` / `entity-form-sheet.tsx` trap focus, restore it to the trigger on close, and keep it inside the overlay on Tab — and whether `vaul` Drawer takes focus at all, which is a known real-browser-only observation.
  - **Responsive.** Whether FE-111's `md` switch from popover to Drawer actually renders a Drawer at 375px, and whether the fill chain (FE-98) leaves each state filling height rather than collapsing.

  What *was* verified adjacent to those: `check:dialog-descriptions` self-test 32 passed, gate → `210 overlay sites across 5088 files render without a description or an explicit aria-describedby (baseline 215) — OK`. That is an accessibility ratchet on overlay *labelling*, improving against baseline; it says nothing about focus order. And `ResponsivePopover` is imported in 28 Build files, which is structural evidence that the responsive switch is delegated to a shared primitive rather than hand-branched — but importing it is not the same as rendering a Drawer at 375px.

  **WHAT WOULD SETTLE IT.** A real-browser pass at 375 / 768 / 1280 (FE-120) over one representative surface per primitive — an `EntityFormDialog`, an `EntityFormSheet`, a `ResponsivePopover` and a `PageState` in each of its loading/error/empty/denied branches — checking: focus moves into the overlay on open, returns to the trigger on close, Tab does not escape; the popover renders as a Drawer below `md`; each state fills its container instead of collapsing. Until that is recorded, this box has four mechanics verified and two unverified, which is why it is unticked rather than partially ticked.

  **THE SCOPE QUESTION the previous entry raised is now moot for the four static mechanics** — `check:page-state-usage` and `check:empty-states` both scan `app`, `components` and `features`, so they already cover feature-level components, not just the primitives. There is no primitives-only-versus-feature-scope decision left to make: the gates are feature-wide and Build is clean in both.
