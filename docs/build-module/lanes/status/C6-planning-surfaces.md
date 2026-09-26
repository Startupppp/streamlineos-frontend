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
- `pre` — was already present before this session AND verified by reading test bodies
- `CSS` — covered by the global CSS proof (`releases-loading` paired test proves
  `.skeleton-shimmer.animate-pulse { animation: none }` applies page-wide; every case frame with a
  Skeleton element inherits this without a per-case assertion)
- `detail` — hand-rolled list items inside real `PageWrapper`/`PmPageShell` wrappers (see limitation note)
- `✗` — not covered; explains why below

| Page | 375 px | Screen-reader | Reduced motion | Keyboard | HiDPI |
|------|--------|---------------|----------------|----------|-------|
| goals | ✓ | ✓ | ✓ (paired) | ✓ | ✓ |
| goals-goal (detail) | ✓ | ✓ | CSS | ✓ (added F-14) | ✓ |
| portfolios | ✓ | ✓ | ✓ (paired) | ✓ | ✓ |
| portfolios-portfolio (detail) | ✓ | ✓ | ✓ (paired, added F-14) | ✓ (added F-14) | ✓ |
| programs | ✓ | ✓ | CSS | ✓ | ✓ |
| project-milestones | pre | pre | ✗ | pre | ✓ (added prev) |
| project-releases | pre | pre | pre | ✗ | ✓ (added prev) |
| roadmap | ✓ | ✓ | ✓ (paired, added F-14) | ✓ | ✓ |

### Gaps closed by F-14

**goals-goal keyboard (closed):** The `goal-detail-ready` case mounts two `KeyResultRow` items each
with a real `Check in` button (rendered when `canManage`). The keyboard test focuses the first
Check-in button, presses Tab, and asserts the second Check-in button is focused. This proves visual
tab order is maintained across the key-results list without a search toolbar.

**portfolios-portfolio keyboard (closed):** The `portfolio-detail-ready` gallery case was updated to
include `BuildHeaderActions` with Edit portfolio and Delete portfolio buttons — matching what the real
portfolio detail page renders in its header. The keyboard test focuses Edit, presses Tab, and asserts
Delete is focused next.

**portfolios-portfolio reduced motion (closed):** A new `portfolio-detail-loading` gallery case was
added using manual `skeleton-shimmer animate-pulse` shimmer divs. A paired reduced-motion describe
proves `animationName === "none"` under `reducedMotion: "reduce"` and `animationName !== "none"` under
`reducedMotion: "no-preference"`.

**roadmap reduced motion (closed):** A new `roadmap-loading` gallery case was added using manual
`skeleton-shimmer animate-pulse` shimmer divs (the real `RoadmapItemCard` uses framer-motion, which
animates through the Web Animations API and is not assertable via `getComputedStyle`). A paired
reduced-motion describe proves the CSS rule applies to the roadmap loading state.

### Remaining gaps (verified by reading test bodies, not names)

**project-milestones reduced motion:** No `milestones-loading` case exists in the gallery — the
original gallery only has ready/empty/filtered-empty/error/denied states for milestones; there is no
loading skeleton to test. The `milestones-*` gallery cases contain no `skeleton-shimmer` elements, so
the global CSS proof (`releases-loading`) does not extend to a milestones loading skeleton. Marked `✗`
rather than inheriting "pre" from the previous session's unverified claim.

**project-releases keyboard:** The two keyboard describes in the spec that existed before this session
(`"at 1280 × 800 — tab order follows visual order through milestones toolbar"` and `"at 375 × 812 —
filters drawer opens and closes with keyboard"`) are both scoped exclusively to `frame(page,
"milestones-ready")`. No keyboard test is scoped to any releases case. The "pre" label from the
previous session is not supported by the test bodies. Marked `✗`.

**portfolios-portfolio gallery limitation (unchanged):** The `PortfolioDetailPage` component uses
`usePortfolio`, `useProjects`, and other data hooks — it cannot be mounted in the gallery without
mocking. No separately exported leaf-level display sub-components exist for the portfolio detail
panel. The `portfolio-detail-ready` gallery case uses real layout components (`PageWrapper`,
`PmPageShell`, `PmSection`) with real `BuildHeaderActions` for the header and hand-rolled `<li>`
elements for the linked projects. The keyboard and screen-reader checks are valid for what is mounted;
they do not prove the real hook-driven page behaves the same.

---

## What was added (previous session)

### New gallery files

| File | Lines | Contents |
|------|-------|----------|
| `features/build/milestones/goals-gallery-section.tsx` | 139 | `GalleryCase` (exported), goals stub data, Goals toolbar, Goals wrapper, `GoalsGalleryCases` (8 case frames) |
| `features/build/milestones/portfolios-programs-gallery-section.tsx` | 169+ | Portfolios/programs stub data, toolbars, wrappers, `PortfoliosProgramsGalleryCases` (12+ case frames) |
| `features/build/milestones/roadmap-gallery-section.tsx` | 79+ | Roadmap stub data, toolbar, wrapper, `RoadmapGalleryCases` (4+ case frames) |
| `features/build/milestones/planning-surfaces-extra-sections.tsx` | 15 | Thin coordinator rendering the three sections |

The original `planning-surfaces-gallery.tsx` is unchanged (milestones + releases, 491 lines).

### Modified files (previous session)

| File | Change |
|------|--------|
| `app/(public)/design-system/planning-surfaces/page.tsx` | Renders `<PlanningSurfacesExtraSections />` alongside the original gallery |
| `e2e/planning-surfaces-a11y.spec.ts` | CASES expanded from 11 → 35; screen-reader describe added (8 tests); reduced-motion pair added for goals-loading + portfolios-loading; keyboard describes added for goals/portfolios/programs/roadmap toolbars (4 new describes, 4 tests) |

## What was added (F-14)

### Gallery changes

| File | Change |
|------|--------|
| `features/build/milestones/portfolios-programs-gallery-section.tsx` | `portfolio-detail-ready` updated to include `BuildHeaderActions` (Edit portfolio, Delete portfolio); `portfolio-detail-loading` case added with shimmer skeleton |
| `features/build/milestones/roadmap-gallery-section.tsx` | `roadmap-loading` case added with shimmer skeleton |

### Spec changes

| Addition | Type |
|----------|------|
| `portfolio-detail-loading` and `roadmap-loading` added to CASES array | Coverage |
| `reduced motion — portfolio-detail and roadmap skeleton shimmers also stop` describe | New paired reduced-motion describe (4 tests: 2 reduce + 2 no-preference) |
| `at 1280 × 800 — goal-detail key results keyboard order` describe | New keyboard describe (1 test: Tab between Check-in buttons) |
| `at 1280 × 800 — portfolio-detail header actions keyboard order` describe | New keyboard describe (1 test: Tab from Edit to Delete button) |

### Matrix corrections

| Page | Check | Previous label | Corrected label | Reason |
|------|-------|----------------|-----------------|--------|
| project-milestones | Reduced motion | pre | ✗ | No milestones-loading case; no skeleton elements in any milestones gallery frame; CSS proof from releases-loading does not extend to a non-existent skeleton |
| project-releases | Keyboard | pre | ✗ | Both pre-existing keyboard describes are scoped to milestones-ready only; no test presses a key in any releases frame |

### New case IDs added to CASES array

`portfolio-detail-loading`, `roadmap-loading`

### Real components mounted

| Page | Key real component(s) used |
|------|---------------------------|
| portfolio-detail-ready (updated) | `BuildHeaderActions` with Edit + Delete actions added to `PageWrapper` |
| portfolio-detail-loading (new) | Manual shimmer divs (no real skeleton component exists for portfolio detail) |
| roadmap-loading (new) | Manual shimmer divs (CSS-assertable; `RoadmapItemCard` uses framer-motion which is not assertable via getComputedStyle) |

---

**Not browser-verified.** The drain for this session has not yet run. C6 stays unticked on all eight
pages until the next serial drain confirms EXIT=0.
