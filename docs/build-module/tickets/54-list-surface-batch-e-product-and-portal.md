# 54 — Batch E: the managed-product and portal lists adopt the surface

**What to build:** The managed-product lists — products, product projects, goals, feedback, insights, roadmap — and the client-facing portal lists render through the list surface. This is the last batch, so it also removes whatever remains of the old assembly for pages now fully migrated.

The portal pages carry the extra constraint: an external client's list must never show a control or a column the client cannot have, and its empty state must not disclose that filtered-out rows exist.

**Blocked by:** 49 — A Build list surface exists, and a list can be rendered without fetching.

**Status:** done — all five boxes earned; the caller-less-helper box was earned 2026-09-29 by running the sweep

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
- [x] Any remaining shared assembly helper with no callers left is deleted
  **Earned 2026-09-29 by running the sweep instead of reasoning about it.** The criterion is a
  postcondition over a set — "no caller-less shared assembly helper survives" — and the set is empty, so
  the postcondition holds. Nothing was deleted because there was nothing to delete, and that is the tick:
  an unticked box here is indistinguishable from a box nobody swept.
  Verified 2026-09-29 — two greps from `frontend/`, both counting non-test importers over
  `app components features hooks lib` and matching relative, aliased and lazy `import()` forms:
  1. per-module importer count for all **61 modules** of `features/build/shared/` (the 41 non-test ones) —
     `grep -rn -E "(from|import\()[[:space:]]*[\"'][^\"']*/<stem>[\"']" app components features hooks lib | grep -v '\.test\.'`
     per stem — **minimum 1**, no zero. Six sit at exactly one caller
     (`assignee-filter-submenu`, `build-list-gallery`, `filter-command-menu`, `filter-flat-search`,
     `module-disabled-state`, `use-filter-command-menu-state`); the prior lanes' figures reproduce.
  2. the same sweep widened to **every** non-test module under `features/build/` — 14 files report zero
     importers and **every one of them is a test harness, fixture or spec** reached only from a `.test.*`
     file, which the filter deliberately excludes (`webhook-page-test-harness`,
     `use-board-url-state-test-harness`, `project-board-content-test-harness`,
     `workload-board-page-test-harness`, `epics-page-test-harness`, `releases-page-test-harness`,
     `product-scope-pages.test-harness`, `inbox-list-test-harness`, `inbox-test-mocks`,
     `my-work-page-test-harness`, `bug-row-contract.spec`, `build-scope-browser.test-harness`,
     `use-build-scope-directory.test-fixtures`), with one exception noted below.
  And the surface still renders without any deletion: `npx jest features/build/shared` → **20 suites,
  254 tests passed**.
  **The one exception, recorded rather than acted on:** `features/build/overview/organization-overview-page.tsx`
  has no importer outside its own `.test.tsx` — a page with tests and no route, not a shared assembly
  helper. It is outside this box's subject and outside this ticket's batch; deleting a page on a
  reachability question belongs with tickets 41/42 and the kill list, not here.
  What this proves: no module under `features/build/shared/`, and no non-harness module under
  `features/build/`, is importable-but-unimported, so no assembly helper was left behind by batches A–E.
  What it does not prove: a grep sees static and `import()` specifiers only — a module reached through a
  re-export barrel under a different name, or by a string built at runtime, would not be counted, and an
  importer that is itself dead code still counts as a caller here.
  Superseded reasoning, kept for provenance: earlier lanes left this box unchecked as "vacuous, not
  failed". The sweep is the same result; the difference is that a postcondition satisfied over an empty
  set is satisfied, and `usePageState` (FE-40) and `DataTableSkeleton` (FE-59) were never candidates —
  both are mandated primitives outside `features/build/`, and deleting either would be a CLAUDE.md
  violation rather than a cleanup.
- [x] Each page's rows can be supplied as props
  Earned 2026-09-27 for both lists in the batch. `managed-products-page.tsx` passes `rows={displayed}` and
  `product-feedback-page.tsx` passes `rows={data?.data ?? []}`, so either table can be driven from a fixture
  without mocking its hook. The three portal surfaces are not lists, so the criterion does not reach them.