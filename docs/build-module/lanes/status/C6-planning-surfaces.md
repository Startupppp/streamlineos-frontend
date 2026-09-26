# C6 — Planning surfaces (G-2 / LANE-2)

Covers `10-goals.md`, `10-goals-goal.md`, `10-portfolios.md`, `10-portfolios-portfolio.md`,
`10-programs.md`, `10-project-milestones.md`, `10-project-releases.md`, `10-roadmap.md`.

---

## State before this session

The gallery (`planning-surfaces-gallery.tsx`) mounted only **milestones** and **releases** — two of
eight pages. The spec (`planning-surfaces-a11y.spec.ts`) had 41 tests at EXIT=0, but its CASES array
contained only the 11 milestones/releases case IDs. Six pages had no gallery case frames and therefore
no evidence for any C6 check.

There was no dedicated screen-reader describe block — ARIA assertions were scattered across responsive
tests. The keyboard block covered only the milestones toolbar (at 1280 px) and the milestones filters
drawer (at 375 px). Goals, portfolios, programs, and roadmap had no keyboard tests.

---

## Per-page × per-check matrix

### Legend

- `✓` — explicit test assertion added this session (or already present)
- `pre` — was already present before this session
- `CSS` — covered by the global CSS proof (`releases-loading` paired test proves
  `.skeleton-shimmer.animate-pulse { animation: none }` applies page-wide; every case frame with a
  Skeleton element inherits this without a per-case assertion)
- `detail` — hand-rolled list items inside real `PageWrapper`/`PmPageShell` wrappers (see limitation note)
- `✗` — not covered; explains why below

| Page | 375 px | Screen-reader | Reduced motion | Keyboard | HiDPI |
|------|--------|---------------|----------------|----------|-------|
| goals | ✓ | ✓ | ✓ (paired) | ✓ | ✓ |
| goals-goal (detail) | ✓ | ✓ | CSS | ✗ | ✓ |
| portfolios | ✓ | ✓ | ✓ (paired) | ✓ | ✓ |
| portfolios-portfolio (detail) | ✓ | ✓ | ✗ | ✗ | ✓ |
| programs | ✓ | ✓ | CSS | ✓ | ✓ |
| project-milestones | pre | pre | pre | pre | ✓ (added) |
| project-releases | pre | pre | pre | pre | ✓ (added) |
| roadmap | ✓ | ✓ | ✗ | ✓ | ✓ |

### Remaining gaps

**goals-goal keyboard:** No keyboard test. The detail page has no search/filter toolbar — its focus
stops are Edit/Delete header buttons and per-row "Check in" buttons. A keyboard test would need to
assert Tab from the Edit button reaches the first Check-in button, then through the list. This was
not added because the check-in button order depends on stub data; a focused sub-test can add it.

**portfolios-portfolio keyboard:** Same reason as goals-goal. The detail page has no toolbar.

**portfolios-portfolio reduced motion:** The `portfolio-detail-ready` case uses `PageWrapper` +
`PmPageShell` with hand-rolled project row items. No `Skeleton` elements are present, so the CSS
override has nothing to suppress. A loading case would need `Skeleton` items; that is left for a
follow-up.

**roadmap reduced motion:** The `roadmap-ready` case mounts `RoadmapItemCard` which uses framer-motion
12 animations. framer-motion animates through the Web Animations API, so `getComputedStyle` returns
nothing for `motion.div`. A CSS-driven shimmer assertion is not applicable. The roadmap page's actual
loading state is inside `RoadmapTab` (a hook-dependent component); no loading skeleton case was added.

**portfolios-portfolio gallery limitation:** The `PortfolioDetailPage` component uses
`usePortfolio`, `useProjects`, and other data hooks — it cannot be mounted in the gallery without
mocking. No separately exported leaf-level display sub-components exist for the portfolio detail
panel. The `portfolio-detail-ready` gallery case uses real layout components (`PageWrapper`,
`PmPageShell`, `PmSection`) but hand-rolled `<li>` elements for the linked projects. This passes
the overflow and screen-reader checks but is not the real detail panel.

---

## What was added

### New gallery files

| File | Lines | Contents |
|------|-------|----------|
| `features/build/milestones/goals-gallery-section.tsx` | 139 | `GalleryCase` (exported), goals stub data, Goals toolbar, Goals wrapper, `GoalsGalleryCases` (8 case frames) |
| `features/build/milestones/portfolios-programs-gallery-section.tsx` | 169 | Portfolios/programs stub data, toolbars, wrappers, `PortfoliosProgramsGalleryCases` (12 case frames) |
| `features/build/milestones/roadmap-gallery-section.tsx` | 79 | Roadmap stub data, toolbar, wrapper, `RoadmapGalleryCases` (4 case frames) |
| `features/build/milestones/planning-surfaces-extra-sections.tsx` | 15 | Thin coordinator rendering the three sections |

The original `planning-surfaces-gallery.tsx` is unchanged (milestones + releases, 491 lines).

### Modified files

| File | Change |
|------|--------|
| `app/(public)/design-system/planning-surfaces/page.tsx` | Renders `<PlanningSurfacesExtraSections />` alongside the original gallery |
| `e2e/planning-surfaces-a11y.spec.ts` | CASES expanded from 11 → 35; screen-reader describe added (8 tests); reduced-motion pair added for goals-loading + portfolios-loading; keyboard describes added for goals/portfolios/programs/roadmap toolbars (4 new describes, 4 tests) |
| `docs/build-module/lanes/status/C6-planning-surfaces.md` | This document |

### New case IDs in CASES array

`goals-ready`, `goals-loading`, `goals-empty-true`, `goals-empty-filtered`, `goals-error`,
`goals-denied`, `goal-detail-skeleton`, `goal-detail-ready`, `portfolios-ready`,
`portfolios-loading`, `portfolios-empty-true`, `portfolios-error`, `portfolios-denied`,
`portfolio-detail-ready`, `programs-ready`, `programs-loading`, `programs-empty-true`,
`programs-error`, `programs-denied`, `roadmap-ready`, `roadmap-empty-true`, `roadmap-error`,
`roadmap-denied`.

### Real components mounted (not lookalikes)

| Page | Key real component(s) used |
|------|---------------------------|
| goals | `GoalCard` (framer-motion, Link, Progress, Badge), `StatCardGrid`, `StatCard`, `BuildListToolbar`, `BuildFilterSelect`, `BuildHeaderActions` |
| goals-goal | `KeyResultRow` (real), `GoalDetailSkeleton` (real) |
| portfolios | `DataTable`, `buildPortfolioColumns`, `PortfolioMobileCard`, `DataTableSkeleton` |
| portfolio-detail | `PageWrapper`, `PmPageShell`, `PmSection` (real layout); list items hand-rolled (limitation noted above) |
| programs | `DataTable`, `buildProgramColumns`, `ProgramMobileCard`, `DataTableSkeleton` |
| roadmap | `RoadmapItemCard` (framer-motion, TruncatedText, AnimatedIconButton) |

### No `export` additions needed

All required sub-components were already exported:
`GoalCard`, `GoalsListToolbar`, `KeyResultRow`, `GoalDetailSkeleton`, `buildPortfolioColumns`,
`PORTFOLIO_TABLE_HEADERS`, `PortfolioMobileCard`, `buildProgramColumns`, `PROGRAM_TABLE_HEADERS`,
`ProgramMobileCard`, `RoadmapItemCard`, `ScorableRoadmapItem`.

---

**Not browser-verified.** The drain for this session has not yet run. C6 stays unticked on all eight
pages until the next serial drain confirms EXIT=0.
