# Wave-B-11 Requests

Items that could not be closed in this session and require either a migration, a new backend endpoint, or work in another agent's territory (B02).

---

## RQ-B11-01: Project Overview — missing fields: progress, risks, releases, activity

**Page:** `/build/[projectId]` (ProjectOverviewPage)
**Spec:** `docs/build-module/10-project.md`
**Blocker:** Backend / data model

The spec requires: health, progress, due work, risks, milestones, releases, activity.

Currently implemented: health (healthStatus), milestone (nextMilestone), openIssues.

Missing:
- `progress` — `healthBreakdown.completionPct` exists in the analytics response but is not displayed. Can be surfaced from the existing endpoint without a migration.
- `risks` — Not in any backend response schema. Requires a new backend aggregation (either a field on the analytics endpoint or a separate risks endpoint).
- `releases` — No releases endpoint or DB table in scope. Requires a new feature area.
- `activity` — No activity feed endpoint. Requires a new endpoint returning recent events for the project.

**Recommended path:** Add `completionPct` from existing analytics response for progress (no migration needed). File a separate backend request for risks, releases, and activity endpoints.

---

## RQ-B11-02: Project Overview — URL params: range, teamId, ownerId

**Page:** `/build/[projectId]` (ProjectOverviewPage)
**Spec:** `docs/build-module/10-project.md`
**Blocker:** Frontend + backend (the analytics endpoint does not accept these params)

The spec requires URL params `range`, `teamId`, `ownerId` to filter the overview stats.

Neither the frontend (`project-overview-page.tsx`) nor the backend analytics endpoint accepts these params. Implementing this requires:
1. Adding param extraction in `ProjectOverviewPage`
2. Adding these to the `useProjectOverview` hook call
3. Adding them to the backend analytics query schema and service filter logic

This is self-contained (no other agent's territory) but requires backend work.

---

## RQ-B11-03: Workload — URL-backed filters (from, to, teamId, memberId, group)

**Page:** `/build/[projectId]/workload` (ProjectBoardPage with defaultView="workload")
**Spec:** `docs/build-module/10-project-workload.md`
**Blocker:** B02 territory (`features/build/views/use-board-url-state.ts`)

The spec requires URL params `from`, `to`, `teamId`, `memberId`, `group` for workload filtering.

These filters currently exist in `workloadFilters` state in `use-board-url-state.ts` (B02 territory) but are stored in `useState`, not URL-backed. Making them URL-backed requires modifying B02's `use-board-url-state.ts`.

**Owner:** B02 agent (views and URL state).

---

## RQ-B11-04: Workload — leave and actual fields

**Page:** `/build/[projectId]/workload`
**Spec:** `docs/build-module/10-project-workload.md`
**Blocker:** Data model

The spec requires: member, capacity, leave, allocation, estimate, actual, variance.

- `leave` — Leave data is managed by the HR module. The workload capacity endpoint (`/build/workload/capacity`) does not include leave days. Requires integration with the leave/HR service.
- `actual` — Logged hours vs estimated hours. The current workload model uses ticket estimates and allocation counts; tracked time (actual) is not in the current data model.

**Recommended path:** Add a leave-days lookup to the workload capacity aggregation (requires HR module integration). Add a time-tracking field to tickets (requires migration).

---

## RQ-B11-05: Issues — group and sort URL params

**Page:** `/build/[projectId]/issues` (ProjectBoardPage)
**Spec:** `docs/build-module/10-project-issues.md`
**Blocker:** B02 territory (`features/build/views/use-board-url-state.ts`)

The spec requires URL params `group` and `sort` to control issue grouping and sort order.

`use-board-url-state.ts` (B02) does not expose `group` or `sort` as URL-backed params. The board grouping logic is internal to the view components, also in B02's territory.

**Owner:** B02 agent.

---

## RQ-B11-06: Updates — wins, risks, next, citations structured fields

**Page:** `/build/[projectId]/updates` (UpdatesPage)
**Spec:** `docs/build-module/10-project-updates.md`
**Blocker:** DB migration required

The spec requires an update to contain: status, summary, wins, risks, next, author, audience, citations.

Currently the DB schema (`project_updates` table) has only `body`, `status`, `audience`, `authorMembershipId`. The spec's structured fields (wins, risks, next, citations) are separate named sections within an update.

Implementing this requires:
1. A migration adding columns (or a JSONB `content` column with structured sections) to `project_updates`
2. Backend schema, service, and response contract updates
3. Frontend form update (separate fields for each section)
4. Frontend display update (render each section with its label)

This is blocked on a migration being written, journalled, and applied.

---

## RQ-B11-07: Updates — author display name

**Page:** `/build/[projectId]/updates`
**Spec:** `docs/build-module/10-project-updates.md`
**Blocker:** Backend join / lookup

The `UpdateCard` currently shows `authorMembershipId` as a raw number. The spec implies showing the author's display name.

The backend service returns `authorMembershipId` but does not join to the memberships/users table to resolve the display name. Adding this requires either:
1. A JOIN in the `listUpdates` query to fetch `displayName` from the membership/user table
2. A separate members lookup hook on the frontend

This is unblocked (no migration needed) but was not in scope for this wave.
