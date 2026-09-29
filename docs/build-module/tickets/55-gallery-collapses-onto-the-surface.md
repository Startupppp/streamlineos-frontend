# 55 — The visual harness collapses onto the row-taking surfaces, and shares its fixtures with the tests

**What to build:** Seeing a Build list in a browser stops requiring a hand-rebuilt copy of it. 4,149 lines of visual fixture harness live inside the Build feature across twelve gallery files, and the largest authored file in the whole frontend is one of them at 949 lines with an empty interface. It exists because the page modules had no seam that accepts data — you could not hand a risks page eight rows, it fetched — so someone rebuilt the list from its column definitions plus hundreds of lines of literals.

The deletion test says it must not simply go: delete the gallery and the complexity reappears as "no way to inspect overflow and focus order in a browser", a class jsdom cannot cover. But with the surfaces taking rows as props, each gallery entry collapses to a list rendered with a fixture, and the fixtures become shared with the unit tests instead of being a second, drifting copy of the same data.

**Blocked by:** 50 — Batch A. 51 — Batch B. 52 — Batch C. 53 — Batch D. 54 — Batch E.

**Status:** done for everything automation can reach — four boxes earned; the fifth is browser-only and waived 2026-09-29

- [x] Each gallery entry renders the real surface with a fixture, not a rebuilt copy of it
  Earned 2026-09-27. Every list entry in both governance gallery files now renders through `BuildListSurface`
  with a fixture array. `governance-qa-gallery.tsx`: `RisksTable`, `IncidentsTable`, `DecisionsTable`,
  `ApprovalsTable`, `RisksWithSelection` — all call `BuildListSurface<TRow>` with typed props.
  `qa-execution-gallery.tsx`: `QaTestCasesTable` and `QaRunExecutionCase` call `BuildListSurface<TRow>`.
  Non-list cases (`BudgetOverview`, `IncidentDetailCase`, `ReportsTabsCase`) do not rebuild a list surface;
  they render detail components (`DataTable`, `IncidentSlaPanel`, `Tabs`) that are not list surfaces.
  No gallery entry rebuilds a list from raw column definitions.
- [x] The fixtures live in one place and are used by both the galleries and the unit tests
  Earned 2026-09-27. `features/build/shared/build-list-fixtures.ts` is the single source.
  The governance gallery imports `GOVERNANCE_RISK_ROWS` (and five other fixture arrays) from that file.
  `risks-page.test.tsx` now also imports `GOVERNANCE_RISK_ROWS` and drives the "rows are present"
  assertion with it (line 263: `riskPage(GOVERNANCE_RISK_ROWS)`). All 9 tests pass after the change.
  Command: `node node_modules/jest/bin/jest.js --runInBand --no-cache --cacheDirectory D:/agent-work/jest-lane5
  --runTestsByPath features/build/governance/risks-page.test.tsx` — 9 passed, 0 failed.
- [ ] Every visual case the galleries covered is still reachable in a browser, including overflow and focus order — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; the box names the browser in its own text, and overflow widths, computed control heights and focus order are not observable in jsdom, so no command in this checkout can settle it. The static half — all 13 cases still exist and are routed — is verified below; the waived half is a Playwright or human pass over `/design-system/governance-qa` and `/design-system/qa-execution`.)
  **BROWSER-ONLY.** All 13 cases that existed before the split are still present: `RisksTable`,
  `IncidentsTable`, `DecisionsTable`, `ApprovalsTable`, `RisksWithSelection`, five loading-skeleton entries,
  an empty state and an error state live in `governance-qa-gallery.tsx` (route `/design-system/governance-qa`).
  `QaTestCasesTable`, `BudgetOverview`, `IncidentDetailCase`, `QaRunExecutionCase`, `ReportsTabsCase` and
  the loading-qa skeleton moved to `qa-execution-gallery.tsx` (route `/design-system/qa-execution`).
  No visual case was deleted. Overflow column widths, computed control heights and focus order require a real
  browser to verify; jsdom cannot see those.
  LANE-50 static verification: confirmed present by grep. `governance-qa-gallery.tsx`: `RisksTable` (line 79),
  `IncidentsTable` (line 126), `DecisionsTable` (line 173), `ApprovalsTable` (line 220),
  `RisksWithSelection` (line 272), four `DataTableSkeleton` loading entries (lines 413, 427, 441, 455+),
  `EmptyState` and `ErrorState` entries. `qa-execution-gallery.tsx`: `QaTestCasesTable` (line 112),
  `BudgetOverview` (line 156), `IncidentDetailCase` (line 204), `QaRunExecutionCase` (line 235),
  `ReportsTabsCase` (line 324), one `DataTableSkeleton` loading entry (line 386). The browser-only exclusion
  is legitimate: overflow, focus order and computed heights are not observable in jsdom.
- [x] No gallery file exceeds 500 lines, and the total harness size is recorded before and after
  Earned 2026-09-27. The split was necessary because `governance-qa-gallery.tsx` was 860 lines.
  Before this session: 12 gallery files totalling ~4,087 lines; `governance-qa-gallery.tsx` at 860 was the
  largest.
  After: 13 gallery files (the new `qa-execution-gallery.tsx` is the split), 4,139 lines total.
  File sizes: `settings-gallery.tsx` 498, `governance-qa-gallery.tsx` 494,
  `managed-products-gallery.tsx` 491, `planning-surfaces-gallery.tsx` 480, `execution-core-gallery.tsx` 430,
  `qa-execution-gallery.tsx` 405, `build-list-gallery-cases.tsx` 325, `content-intake-gallery.tsx` 331,
  `portfolios-programs-gallery-section.tsx` 242, `goals-gallery-section.tsx` 139,
  `build-list-gallery.tsx` 108, `team-home-gallery.tsx` 102, `roadmap-gallery-section.tsx` 94.
  All 13 files are under 500 lines. The total grew by 52 lines: the new shared exports
  (`noop`, `GALLERY_STATIC_PAGINATION`) added 13 lines to `build-list-gallery-cases.tsx`, and the split
  introduced a new file header and `QaExecutionGallery` export wrapper (+39 net).
- [x] A gallery entry that no longer matches its page's real props fails to compile
  Earned 2026-09-27. Verified by adding `__galleryProbe: string` as a required prop to
  `BuildListSurfaceProps<TRow>` in `build-list-surface.tsx`, then running
  `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --project tsconfig.json`.
  Both gallery files raised TS2741 ("Property '__galleryProbe' is missing in type…") on every
  `BuildListSurface` call site: 5 errors in `governance-qa-gallery.tsx`, 2 errors in
  `qa-execution-gallery.tsx`. After restoring the prop, tsc reported no errors in either file.
  No `as any` or `@ts-ignore` bypasses exist in either gallery file.
