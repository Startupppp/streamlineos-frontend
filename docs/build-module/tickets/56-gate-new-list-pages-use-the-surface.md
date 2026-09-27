# 56 — A new Build list page cannot hand-assemble its own surface

**What to build:** The next Build list page inherits the branch order instead of restating it. With the pages migrated, the remaining risk is the 74th page written the old way, and nothing would notice until a user sees "Something went wrong" where an upgrade prompt belonged. A gate fails a Build page that assembles the toolbar, state branch and pager itself rather than going through the surface.

**Blocked by:** 50 — Batch A. 51 — Batch B. 52 — Batch C. 53 — Batch D. 54 — Batch E.

**Status:** ready-for-agent

- [x] A hand-assembled Build list page fails the gate
  Earned 2026-09-27. `frontend/scripts/check-build-list-surface.mjs` fires on the **conjunction** of two
  patterns in a non-test `.tsx` file under `features/build/`: it renders `<DataTable` directly -- with a
  negative lookahead so `<DataTableSkeleton` does not count -- **and** it calls `usePageState(` or renders
  `<PageState`. The conjunction is the point: either half alone is legitimate (a columns file renders a table
  with no page state; a form page owns page state with no table), and it is assembling both by hand that the
  surface exists to replace.
  **Verified independently of the gate's own report.** A separate scan of the same conjunction across the
  module returns exactly five files, and the two that are not in the gate's allowlist --
  `settings/project-settings-access-page.tsx` and `workflow/workflow-page.tsx` -- were each opened and render
  `DataTableSkeleton` only, which the gate is right to exclude. The looser scan was the wrong one; the gate's
  result is accurate.
- [x] The gate has a self-test constructing that page and failing without the check
  Earned 2026-09-27: `node scripts/check-build-list-surface.mjs --self-test` reports **9 passed**, and the
  cases are the ones that matter rather than only the easy positive. It writes synthetic fixtures and asserts
  both directions: a page with `DataTable` + `usePageState` is flagged, a page with `DataTable` + `<PageState`
  is flagged, and four that must **not** be flagged are not -- a `BuildListSurface` adopter, a page whose only
  table reference is `DataTableSkeleton` in a `loading` slot, a table with no page-state branching, and a test
  file carrying the violating shape.
  A gate that resolves nothing reports zero vacuously and passes, so the file count is asserted non-zero too:
  the real run scans **466** files.
- [x] Pages legitimately outside the pattern are enumerated in a ratchet file that may only shrink
  Earned 2026-09-27. `scripts/check-build-list-surface-allowlist.json` holds exactly **three** entries, each
  with its reason: the surface module itself (it *is* the consolidated assembly), `project-budget-page.tsx`
  (its table is a subordinate member-cost breakdown inside a stats dashboard, not the page's surface), and
  `my-work-content.tsx` (it receives `PageStateResolution` as a prop, so the parent owns the page state, and
  it switches between table, bucket-list and board views).
  **The shrink-only property was probed rather than taken on trust**: adding an entry for a file that does not
  exist makes the gate print "An exemption that outlives its subject silently licenses the next violating
  page" and **exit 1**; removing the entry returns it to exit 0. That is the property that keeps the list from
  becoming decoration.
- [x] The gate states what it scans and what it cannot see
  Earned 2026-09-27. Both statements print on every green run, not only on failure. It names the scan -- a
  non-test `.tsx` under `features/build/` rendering `<DataTable` directly and calling `usePageState` or
  rendering `<PageState` -- and then names its blind spots plainly: a page that reaches `DataTable` through an
  intermediate component is invisible to it (it gives `TransitionsTable` and `ProjectMemberRolesSection` as
  the real examples), as is a page that wraps `DataTable` in its own component, as is any runtime-composed
  surface. This matters because text scans miss generated and indirect forms, and a gate whose reach is not
  written down reads as stronger than it is.
- [x] It is green on a settled tree, and that run is recorded
  Earned 2026-09-27, and re-run by the orchestrator rather than accepted from the lane's transcript:
  ```
  node frontend/scripts/check-build-list-surface.mjs
  OK  No hand-assembled Build list page (466 non-test .tsx files scanned under features/build/,
      3 known exemptions).
  exit 0
  ```
  `npx jest scripts/check-build-list-surface.test.ts` reports **9 passed**. Registered in `package.json` as
  `check:build-list-surface` with a `:self-test` sibling, matching the convention that a gate's self-test runs
  first.
