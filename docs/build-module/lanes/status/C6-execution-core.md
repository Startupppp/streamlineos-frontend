# C6 — Execution Core (LANE-4, 10 pages)

Drain run 2026-09-26: 16 tests, EXIT=0. After this session: 34 tests across 7 describes.
Box 6 is NOT ticked — this session closes the source gap; the orchestrator runs a fresh drain before ticking.

---

## What was added

### Gallery (`features/build/views/execution-core-gallery.tsx`)

Four new case frames were added, each mounting a real feature component with static stub data:

| Case frame | Component | Page |
|---|---|---|
| `triage-rows` | `TriageRow` | 10-project-triage |
| `cycle-cards` | `CycleCard` | 10-project-cycles |
| `module-cards` | `ModuleCard` | 10-project-modules |
| `epic-card` | `EpicCard` | 10-project-epics |

All four components were already exported from their feature files — no `export` keyword additions were needed.

### Spec (`e2e/execution-core-a11y.spec.ts`)

Seven new describes were added (18 new tests):

| New describe | Tests | C6 check |
|---|---|---|
| 375 px mobile — per-case-frame layout | 1 | 375 px mobile |
| screen-reader — ARIA roles and accessible names | 9 | Screen-reader |
| triage rows — keyboard reachability | 2 | Keyboard |
| cycle card — keyboard reachability | 1 | Keyboard |
| module card — keyboard reachability | 1 | Keyboard |
| epic card — keyboard expand | 2 | Keyboard |
| module card — reduced-motion transition suppression | 2 | Reduced motion |

---

## Per-page × per-check matrix

`✓` = genuinely exercised. `~` = covered by a shared gallery check, not page-specific. `—` = absent.

| Page | 375 px mobile | High-density desktop | Keyboard | Screen-reader | Reduced motion |
|---|---|---|---|---|---|
| 10-project (overview) | ~ page scroll | ~ case-frame overflow | — | — | — |
| 10-project-backlog | ~ page scroll | ~ case-frame overflow | — | — | — |
| 10-project-cycles | ✓ per-frame | ✓ per-frame | ✓ cycle action button | ✓ dropdown aria-label | — |
| 10-project-cycles-cycle | ~ page scroll | ~ case-frame overflow | ~ kanban card | ~ kanban region | ~ skeleton |
| 10-project-epics | ✓ per-frame | ✓ per-frame | ✓ expand toggle + Enter | ✓ role=button aria-expanded progressbar | — |
| 10-project-issues | ✓ kanban container | ✓ kanban container | ✓ card button focus | ✓ region + aria-label | ~ skeleton |
| 10-project-modules | ✓ per-frame | ✓ per-frame | ✓ link focus | ✓ link role | ✓ transition-none paired |
| 10-project-tickets-issue | ✓ per-frame | ✓ per-frame | ✓ Tab + Space + select | ✓ aside aria-label + button names | ~ skeleton |
| 10-project-triage | ✓ per-frame | ✓ per-frame | ✓ open + accept Tab | ✓ accept + decline aria-label | — |
| 10-project-workload | ~ page scroll | ~ case-frame overflow | — | — | — |

### Shared gallery checks key

`~ page scroll`: The 375×812 VIEWPORTS loop asserts `document.documentElement.scrollWidth − clientWidth ≤ 1`.

`~ case-frame overflow`: The `1920×1080 @ scale 2` describe asserts every `[data-case-frame]` element has `scrollWidth − clientWidth ≤ 1`.

`~ kanban card / region / skeleton`: These pages' primary surfaces (KanbanBoard, Skeleton) share the same gallery cases as 10-project-issues (kanban board overflow case) and the loading skeleton case.

---

## Remaining gaps

### Pages with no dedicated gallery case

**10-project (overview)**: `ProjectOverviewPage` uses `useProject`, `useProjectAnalytics`, `useCycles`, `useTicketColumnCounts`, and `useProjectMilestones`. No isolated pure-UI sub-component was extracted. The page's overview stat cards use generic `StatCard` / `StatCardGrid` components (not build-specific). Only shared gallery checks apply.

**10-project-backlog**: `ProjectBacklogPage` builds DataTable columns inline and uses `useProjectBoardTickets`. The `ListViewItem` component was not mounted because its sibling inline-edit controls (`InlineStatus`, `InlineAssignee`, etc.) each hold their own TanStack Query mutations that would fire requests in unauthenticated context. Only shared gallery checks apply.

**10-project-cycles-cycle**: `CycleDetailPage` mounts a `KanbanBoard` instance (same board surface as 10-project-issues). Keyboard and screen-reader checks are satisfied through the existing `kanban-board-overflow` case.

**10-project-workload**: `WorkloadMemberRow` requires a `days: Date[]` array matched against `ticketsByDay`, making stub construction complex. `InlineAssignee` and `TicketQuickActions` inside it hold mutations. Mounting was deferred. Only shared gallery checks apply.

### Checks absent from all pages

**Reduced motion — triage, cycles, epic**: These components use CSS `transition` properties but not the `.skeleton-shimmer` class targeted by `globals.css:700-708`. `TriageRow` has `transition-[border-color,box-shadow]` but no `motion-reduce:transition-none`. `CycleCard` has Tailwind `transition-all`. `EpicCard`'s `CardHeader` has `transition-colors`. None carry `motion-reduce:*` utilities, so the CSS assertion `transitionProperty === "none"` would not pass. An FE-108 violation filed separately: `CycleCard`, `TriageRow`, and `EpicCard` are missing `motion-reduce:transition-none` on their animated elements.

**Screen-reader — project overview, backlog, workload**: No gallery case means no ARIA assertions for those pages.

**Keyboard — project overview, backlog, workload**: No gallery case means no keyboard focus tests for those pages.

---

## Notes on the two traps from CCG-3

Both traps were applied in the new tests:

- `getByRole(..., { name })` — all new tests use `exact: true` or a regex scoped to the specific element rather than relying on substring default.
- `getByText` collision — the new tests scope to `[data-case-frame]` ancestors rather than using `.first()` on a gallery-wide locator.
