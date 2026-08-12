# Build — PM UI contract

Closes the Phase 5 deliverable "produce a short PM UI contract document".

## Scope separation
Personal (`/me/*`, My Work) · project (`/build/[projectId]/*`) · portfolio (`/build/portfolios`,
`/build/workspaces/[id]/*`). These never mix in one sidebar group. Workspace-prefixed routes scope
their data by workspace (`DECISIONS.md` B-21); `pm-workspaces` stays org-wide because it is the
switcher.

## One data layer behind every view
Board, list, table and calendar are presentations of one query layer: the same `queryOptions`
factories, the same filter object, the same mutations. Changing a ticket's status behaves
identically in every view because they all call the same optimistic mutation. Adding a view means
adding a renderer, never a second fetch path.

## Components
- **Tables** — the shared `DataTable` with server-side sort/filter/paginate and a real `pagination`
  prop. Never an unbounded `.map()` over a collection.
- **Pagination** — `TablePagination` only.
- **Long/unbounded surfaces** — virtualized with `react-window` v2; canonical
  `kanban-virtual-ticket-list.tsx`.
- **Forms** — react-hook-form + the Zod schema shared with the backend. Small → Dialog, large →
  Sheet.
- **Async buttons** — `LoadingButton isPending`, never a hand-rolled spinner.
- **Page shell** — `PageWrapper`; the shell owns the background.
- **Errors** — `getErrorMessage(error: unknown)` everywhere; never `.message` raw.
- **Pickers** — never ask for an id. Entity selection uses a searchable `Combobox`
  (`DECISIONS.md` B-20 records the two approval entity types dropped for having no list source).

## States
Loading = skeletons matching the real layout. Empty = fills the content height with an illustration,
a message and the primary action — a new project's blank board tells the user what to do next.
Error = message + retry. Permission-denied = distinct from empty, and derived from the same
`useCan` source the backend enforces.

## Drag and drop
`@hello-pangea/dnd`, which provides the **keyboard equivalent natively**: the drag handle carries
`tabIndex`, `aria-describedby` (announcing the instructions) and the key handler — Space lifts,
arrows move, Space drops, Escape cancels.

Under virtualization, `react-window` injects its own `ariaAttributes` containing `role: "listitem"`.
**It must be spread *before* `dragHandleProps`**, otherwise it clobbers the library's drag-handle
role and the affordance is no longer announced, while the keys keep working — a silent
accessibility regression that looks fine in manual testing. That ordering is load-bearing.

Reorders are optimistic against the exact cache the view renders from, and reconcile with the
server's authoritative rank on settle.

## Accessibility & responsive
Labelled inputs, focus trapped and restored in dialogs, visible focus rings. Verified at 375 / 768 /
1280. Task detail, comments, My Work and time entry must work at 375px; board and timeline may
degrade to a list. Below `md`, filter/menu panels are Drawers via `ResponsivePopover`.
