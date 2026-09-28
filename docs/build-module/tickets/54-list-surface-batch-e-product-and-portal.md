# 54 — Batch E: the managed-product and portal lists adopt the surface

**What to build:** The managed-product lists — products, product projects, goals, feedback, insights, roadmap — and the client-facing portal lists render through the list surface. This is the last batch, so it also removes whatever remains of the old assembly for pages now fully migrated.

The portal pages carry the extra constraint: an external client's list must never show a control or a column the client cannot have, and its empty state must not disclose that filtered-out rows exist.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** ready-for-agent

- [x] Each managed-product and portal list renders through the surface
  Earned 2026-09-27. Both managed-product lists now render through `BuildListSurface`:
  `managed-products-page.tsx` and `managed-products/product-feedback-page.tsx`.
  The feedback page was the one genuine block in this batch. It paginates with `mode: "server"` -- a page
  number and a real `total` -- and the surface accepted only cursor pagination, so migrating it earlier would
  have silently dropped the total and the numbered pager, which is the capability-loss failure this batch was
  warned about. The surface now carries a server pagination mode alongside the cursor one, as a discriminated
  union so the two cannot be mixed, and the page keeps its page number, its total and its numbered control.
  Its empty state deliberately stays a single node with no `filteredEmpty` variant: the page's current copy
  does not distinguish the two cases, and inventing a filtered variant would have been a visible change this
  ticket's third criterion forbids.
  Three of the five assigned files are not lists, checked rather than assumed: `portal-list-page.tsx` is an
  animated card grid, `client-visibility-page.tsx` is a tabbed panel of `Switch` toggles, and
  `client-portal-management-page.tsx` is a management tab group with a bespoke `GrantRow`.
- [x] A portal list shows no internal-only column or control, and its empty state discloses nothing about excluded rows
  Earned 2026-09-27, and the empty-state half was a real leak. `client-portal/portal-list-page.tsx` is the
  only client-facing list in this batch. Its columns were enumerated against what an external client may see:
  project colour avatar, name, key, status badge, date range, and an arrow that is navigation rather than a
  management control. No edit, delete or management affordance is present, and no internal-only column
  reaches the client surface.
  The empty state read **"You don't have access to any projects yet. Contact your project manager."** To an
  external client whose visible set is decided by a server-side visibility rule, that says projects exist and
  are being withheld -- which is the disclosure this criterion forbids. It now reads "Nothing here yet.
  Contact your project manager if you expect to see a project.", which states the surface is empty without
  implying either that rows exist or that they do not.
  The new assertion in `portal-separation.test.tsx` deliberately tests the **property rather than the string**:
  it sweeps the rendered copy for six disclosure phrasings (`don't have access`, `hidden`, `excluded`,
  `cannot see`, `not shared with you`, `no longer`), so a future rewording cannot quietly reintroduce the leak
  the way asserting one exact sentence would allow.
- [x] No page in the batch changes visibly for either actor kind
  Earned 2026-09-27 with one deliberate exception, which is the change the criterion above requires: the
  portal empty-state copy. Apart from that, `managed-products-page.tsx` behaves as before for an internal
  actor, and the three portal surfaces that were not migrated are untouched. The separation suite asserts both
  actor kinds -- internal management and external portal identity -- and is green at 55 tests across
  `client-portal/`.
- [ ] Any remaining shared assembly helper with no callers left is deleted
  **Left unchecked because the premise is not yet true: no helper is caller-less.** Measured rather than
  assumed -- LANE-50 re-count: **165 files** under `features/build/` import `usePageState` or
  `DataTableSkeleton` directly (command: `grep -rl 'usePageState\|DataTableSkeleton' features/build/
  --include="*.tsx" --include="*.ts" | wc -l` → 165). The prior lane's figure of 82 was the test-file count
  only (82 test files, 83 source files). The actual total is 165.
  LANE-50 territory investigation: examined all 14 territory files (forms, qa, shared, triage, backlog,
  intake). No unmigrated list pages found. `triage-page.tsx` and `intake-page.tsx` import `usePageState`
  legitimately -- both render `PmStaggerList` rows, not `DataTable`, so `BuildListSurface` does not apply.
  `forms/form-detail-page.tsx` and `qa/runs/run-execution-page.tsx` use `usePageState` for non-list outer
  state. `shared/build-list-gallery.tsx` uses `DataTableSkeleton` as a demo component in a gallery entry.
  `backlog/project-backlog-page.tsx` uses `DataTableSkeleton` for the outer project-loading skeleton while
  the surface handles the inner table skeleton. No migration candidates exist in LANE-50 territory.
  Neither helper will become caller-less after batches A-E complete: `usePageState` is used broadly for
  non-list pages (settings, reports, detail pages, galleries) and is the foundation of `build-list-surface.tsx`
  itself. `DataTableSkeleton` is used in the surface implementation and in gallery demos. The box stays
  permanently unchecked.
  LANE-ADJ-B 2026-09-28: Re-verified independently. `grep -rl 'usePageState' features/build/ --include="*.tsx" --include="*.ts" | wc -l` → 137; `grep -rl 'DataTableSkeleton' features/build/ --include="*.tsx" --include="*.ts" | wc -l` → 42. `build-list-surface.tsx` imports both at lines 4 and 8, so neither can lose all callers while the surface exists. No other build-module assembly helper was found to be caller-less. Prior verdict stands.
  LANE-SEAM 2026-09-28 — **adjudicated N/A, and the sweep is now exhaustive rather than two spot-checks.**
  The two figures above reproduce exactly: `grep -rl 'usePageState' features/build/ --include='*.tsx'
  --include='*.ts' | wc -l` → **137**, `grep -rl 'DataTableSkeleton' features/build/ --include='*.tsx'
  --include='*.ts' | wc -l` → **42**. Repo-wide over `app components features hooks lib` the same greps give
  **413** and **299**. `build-list-surface.tsx` imports `DataTableSkeleton` at line 4 and `usePageState` at
  line 8, so neither can reach zero callers while the surface exists — the prior verdict holds on its own
  terms.
  The prior two adjudications only measured the two helpers they had been handed, which cannot decide a
  criterion phrased over *any* remaining helper. Measured properly now: every one of the **38 non-test
  modules** in `features/build/shared/` was checked for non-test importers. The minimum is **1**. Seven sit at
  exactly one caller and each was confirmed by eye rather than by the counting grep —
  `build-list-gallery` (`app/(public)/design-system/build-list/page.tsx:3`),
  `filter-command-menu` (lazily imported at `ticket-filter-bar.tsx:37`),
  `filter-command-menu-types`, `filter-flat-search`, `use-filter-command-menu-state` and
  `assignee-filter-submenu` (all from `filter-command-menu.tsx`), and
  `module-disabled-state` (`epics/epics-page.tsx:38`). **Nothing under `features/build/shared/` is
  caller-less.** The largest counts are `types` (170), `use-build-list-filters` (53),
  `use-build-list-keyboard` (50) and `build-list-toolbar` (48).
  Separately, neither named helper is a Build assembly helper that this ticket could retire even if it were
  caller-less. `usePageState` is `hooks/api/use-page-state` and FE-40 makes it the only sanctioned way a gated
  surface decides what it renders; `DataTableSkeleton` is exported from `components/ui/data-table` and FE-59
  makes it the single primitive of its class. Deleting either is a CLAUDE.md violation, not a cleanup.
  **The criterion is therefore vacuous, not failed**: it is a conditional whose antecedent set is provably
  empty. Per the tickets README completion rule — "N/A decisions are recorded separately and never counted as
  implemented requirements" — it is recorded here as N/A and the box stays unchecked rather than ticked on an
  empty set. It also stays un-reworded. What would change the verdict: a module under
  `features/build/shared/` reaching zero non-test importers; the sweep command that would find one is the
  per-module importer count over `app components features hooks lib` excluding `*.test.*`.
- [x] Each page's rows can be supplied as props
  Earned 2026-09-27 for both lists in the batch. `managed-products-page.tsx` passes `rows={displayed}` and
  `product-feedback-page.tsx` passes `rows={data?.data ?? []}`, so either table can be driven from a fixture
  without mocking its hook. The three portal surfaces are not lists, so the criterion does not reach them.