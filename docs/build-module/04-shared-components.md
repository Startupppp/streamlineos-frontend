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

- [ ] Every new shared module has at least two consumers or replaces an existing duplicate. **2026-09-27 OWNER-DECISION:** Q: Should the two-consumer rule be enforced by a gate or by code review? Options: (A) Gate — extend `aggregate-import-boundary.test.ts` pattern to count consumers of each new `components/shared/` export and fail PRs with a single consumer. (B) Code review only — rely on FE-59 in `CLAUDE.md`, no automated enforcement. Recommended: A — the file-sizes ratchet (`check:over-300`) shows the count-shrink pattern is cheap to maintain; a consumer-count baseline JSON today prevents silent drift. Settling evidence: any PR adding a `components/shared/` export with one consumer triggers the gate.
- [x] DataGrid supports server and cursor pagination without pretending a cursor is a page number. `frontend/components/ui/data-table.tsx:86` tags `mode === "cursor"` as `cursorPag` and `mode === "server"` as `serverPag`; line 99 disables client-side sorting when either is active (`isServerPagination = serverPag !== null || cursorPag !== null`), with comment explicitly stating "a server- or cursor-paginated table holds one page, and sorting that page would present a slice as the sorted set."
- [x] Kanban remains virtualized and keyboard operable. `frontend/features/build/views/kanban-virtual-ticket-list.tsx:258` renders with `mode="virtual"`; lines 118-134 attach `ariaAttributes`, `aria-label={ticket.title}`, and `onKeyDown={handleKeyDown}` to each card. Browser-level focus order and drag-keyboard-alternative require real-browser testing (FE-123); source confirms the hooks are wired.
- [ ] Overlay choice follows the documented rule on every page. **2026-09-27 OWNER-DECISION:** Q: Is static enforcement needed for overlay rule compliance, or does code review cover it? Options: (A) Gate — scan page files for `Dialog`/`Sheet`/`Popover` usage and compare against the FE-110 rung ladder; requires per-surface DOM semantics, impractical statically. (B) Code review only — FE-110 is in `CLAUDE.md` and visible to all contributors; violators surface in PR review. Recommended: B — overlay choice is context-dependent (entity complexity, mobile breakpoint, action count) and cannot be reliably classified by AST alone; the rule is clear enough for review. Settling evidence: the existing `UI-KIT.md` overlay-ladder diagram gives reviewers a single reference.
- [ ] Shared modules own loading, error, empty, denied, focus, and responsive mechanics. **2026-09-27 OWNER-DECISION:** Q: Does this box require verifying the 4 UI primitives only, or all feature-level components that consume them? Options: (A) Primitives scope — `page-state.tsx`, `empty-state.tsx`, `entity-form-dialog.tsx`, `entity-form-sheet.tsx` are correct (confirmed: `check:page-state-usage` PASS, FE-40/FE-41 enforced at page level). Tick the box now. (B) Feature scope — audit every feature-level component; requires a per-component walkthrough of 75 page routes. Recommended: A — the primitives are the integration point; FE-40 enforces their correct usage at every page boundary. Feature components that bypass the primitives are caught by `check:page-state-usage`. Settling evidence: `check:page-state-usage` currently passes; no bypass has been detected.
