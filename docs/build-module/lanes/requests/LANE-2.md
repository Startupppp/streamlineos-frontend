# Lane 2 Requests — Planning: goals, roadmap, portfolios, programs, milestones, releases

These are changes Lane 2 needs but cannot make because they touch request-only shared files.

---

## ~~REQ-2-01: goals goals-list-filters — add `ownerId`, `health`, `due`, `cursor` URL params~~ WITHDRAWN

**Withdrawn reason:** `useBuildListFilters` already supports free-form params without any change.
`use-build-list-filters.ts` line 89 only validates when `definition.options` is present:
`if (definition.options && !definition.options.includes(raw)) return sentinel;`
Adding `{ param: "ownerId" }` (no `options` key) lets any value pass through without touching the
shared file. The `GOAL_FILTER_DEFINITIONS` extension was applied directly in
`frontend/features/build/goals/goals-list-shared.tsx` — Lane 2 territory.

No change to the shared file was ever needed.

---

## REQ-2-02: goals pagination — add cursor pager to Goals page

**File:** `frontend/features/build/goals/goals-page.tsx` (Lane 2 territory — Lane 2 can make this,
but it also needs REQ-2-01 first since cursor paging depends on `useBuildListFilters.resetKey`)

**Note:** This is a prerequisite chain, not a blocked item. Lane 2 owns `goals-page.tsx` and can
implement cursor pagination once REQ-2-01 is applied. No orchestrator action needed beyond REQ-2-01.

---

## ~~REQ-2-03: roadmap URL filters — add `scope`, `productId`, `projectId`, `status`, `horizon`, `ownerId`, `sort` to roadmap tab~~ WITHDRAWN

**Withdrawn reason:** Same refutation as REQ-2-01. The shared file never needed to change.
`ROADMAP_FILTER_DEFINITIONS` was added directly in `frontend/features/build/roadmap/roadmap-list-page.tsx`
(Lane 2 territory) with free-form params (`{ param: "scope" }`, `{ param: "ownerId" }`, etc.).
Each value is threaded to `<RoadmapTab>` as a prop. No shared-file request was ever needed.

---

## ~~REQ-2-04: portfolios URL filters — add `ownerId`, `health`, `sort` to PortfoliosPage~~ WITHDRAWN

**Withdrawn reason:** Same refutation as REQ-2-01. `PORTFOLIO_FILTER_DEFINITIONS` was expanded with
`{ param: "ownerId" }`, `{ param: "health" }`, `{ param: "sort" }` in the new
`frontend/features/build/portfolios/portfolios-toolbar.tsx` file (Lane 2 territory, extracted from
`portfolios-page.tsx` per FE-57 ratchet constraint). No shared-file change was needed.

---

## ~~REQ-2-05: milestones URL filters — add `status`, `ownerId`, `from`, `to` URL params~~ WITHDRAWN

**Withdrawn reason:** Same refutation as REQ-2-01. `MILESTONE_FILTER_DEFINITIONS` was added directly
in `frontend/features/build/milestones/project-milestones-page.tsx` (Lane 2 territory) with all
four params including the free-form `{ param: "ownerId" }`, `{ param: "from" }`, `{ param: "to" }`.
The filter toolbar was also added to the page. No shared-file change was needed.

---

## REQ-2-06: releases URL filters and server pagination — add `from`, `to`, server-side cursor

**File:** `frontend/features/build/shared/use-build-list-filters.ts` (request-only)

**Reason:** The Releases spec requires URL params: `status`, `from`, `to`, `q`, `cursor`.
Currently:
1. Search is client-side (`releases-page.tsx` uses `useMemo` filter on flat array)
2. No cursor pagination (returns flat array from `useReleases`)
3. `frontend/hooks/api/build/releases.ts` — `useReleases` needs cursor/limit/status/search params added

**Intended change:** Refactor `useReleases` to accept cursor params, change
`projects-releases.service.ts` to support cursor pagination and status filter. This is a backend
change (Lane 2 territory for the backend release service file) + frontend hook update.

---

## ~~REQ-2-07: keyboard shortcut bindings for planning pages~~ WITHDRAWN

**Withdrawn reason:** `useBuildListKeyboard` already exists at
`frontend/features/build/shared/use-build-list-keyboard.ts` and handles `/` (search focus),
`j/k` (navigation), `Enter` (open), `Esc` (clear selection). No new shared file was needed.

Lane 2 wired `useBuildListKeyboard` into all affected planning pages (goals, roadmap, portfolios,
milestones, releases) by importing the existing hook — permitted read of a shared file.

**Remaining gap (not a request):** `e` (inline edit) is absent from `useBuildListKeyboard` and
from all other hooks/components. `c` exists globally in
`components/command-palette/hooks/use-keyboard-shortcuts.ts` line 75 but creates a ticket, not a
scope-specific record. `?` opens help globally at line 60. These are observable gaps but not
shared-file requests — either the global binding is already in place or the binding does not exist
anywhere and is out of scope for this lane.

---

## REQ-2-08: milestones pagination — add cursor pagination to ProjectMilestonesPage

**File:** `frontend/features/build/milestones/project-milestones-page.tsx` (Lane 2 territory)
`frontend/hooks/api/build/milestones.ts` (Lane 2 territory)

**Note:** This is Lane 2 work, not a shared-file request. After REQ-2-05 is applied, Lane 2
will add `useCursorPager` + cursor param to `useProjectMilestones` to enable server-paginated
milestone lists. The backend `workspace.service.ts` already limits to 100; pagination would
allow larger sets.
