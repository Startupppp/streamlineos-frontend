# Wave-F-03 Status: Project Overview (`/build/[projectId]`)

## Inherited claims verified this wave

The Wave-E-03 report recorded three blocker categories for box 3 on `10-project.md`:

1. **"No backend endpoints" for `progress`, `risks`, `releases`, `activity`**
2. **URL params `range`, `teamId`, `ownerId` — "not read from URL, no backend filter"**
3. **Keyboard shortcuts — "no list, no search input, no create form"**

Each claim was verified independently against `backend/src/modules/build/core/` (not inherited from the prior report).

---

## Backend endpoint audit

### `progress`

`GET /build/:projectId/analytics` (`projects-reports.controller.ts:74`) returns
`healthBreakdown.completionPct` as part of the analytics payload.  
Schema: `backend/src/modules/build/core/dto/analytics.schemas.ts:33` — `projectAnalyticsQuerySchema`.  
**Endpoint exists.** The previous claim was wrong for `progress`.

### `risks`

The analytics endpoint returns `healthBreakdown.overdueTickets` (the count of non-completed,
non-cancelled tickets whose due date is in the past). No dedicated "risks" endpoint exists, but
overdue count is sufficient to represent risk on a summary page. The analytics data is already
loaded by the overview page.  
**Data exists via analytics. Displayed as the "Overdue" stat card.**

### `releases`

`GET /build/:projectId/releases` (`projects-releases.controller.ts:39`) exists and is paginated.  
Frontend hook: `frontend/hooks/api/build/releases.ts:35` — `useReleases`.  
**Endpoint and hook both exist.** The previous claim was wrong for `releases`.

### `activity`

The only activity endpoint found: `GET /build/:projectId/tickets/:ticketId/activity`
(`projects-tickets.controller.ts:187`) — per-ticket, not per-project.

Searched `backend/src/modules/build/core/`:
- `projects-activity.service.ts` — notification dispatch, not a read endpoint (no `@Get` decorator)
- `projects-changelog.service.ts` — no `@Get` decorator
- `project-resources.controller.ts` — no activity route
- `projects-reports.controller.ts` — no activity route

**No project-level activity endpoint exists.** This is a product gap. The "no backend endpoint"
claim was correct for `activity`.

### URL params `range`, `teamId`, `ownerId`

`projectAnalyticsQuerySchema` (`dto/analytics.schemas.ts:33`) already accepts all three params.
`ProjectsAnalyticsService.getProjectAnalytics` filters by them.  
**Backend already handles them.** The frontend was simply not wired.

---

## Changes made this wave

### `frontend/lib/query-keys/build-work.ts`

`analytics` factory updated to accept optional `params?: QueryKeyParams`. When params are absent
the key is identical to the previous form so no existing queries are invalidated.

### `frontend/hooks/api/build/advanced.ts`

`useProjectAnalytics` now accepts an optional second argument `params?: ProjectAnalyticsParams`
(exported interface with `range`, `teamId`, `ownerId`). The interface type-narrows `range` to
`"7d" | "30d" | "90d"`. Params are forwarded to the API call and included in the query key.

Callers that pass only `projectId` (e.g. `reports-overview-tab.tsx`) are unaffected — the new
argument is optional and defaults to `undefined`.

### `frontend/features/build/overview/project-overview-page.tsx`

1. Imports added: `useSearchParams`, `useOnlineStatus`, `useReleases`, `ProjectAnalyticsParams`,
   `TrendingUp`, `AlertTriangle`.
2. URL params read via `useSearchParams()`. `range` is narrowed to the union type via
   `isAnalyticsRange(v)` type guard. `teamId` is parsed as a positive integer. Invalid or absent
   params produce `undefined` so the analytics query key stays stable when no params are set.
3. `useProjectAnalytics` receives the analytics params.
4. `useReleases` added; its loading/error/refetch are included in the aggregate state.
5. Offline banner rendered when `useOnlineStatus()` returns `false`.
6. `StatCardGrid cols={5}` replaces `cols={3}`. Two new stat cards added:
   - **Progress** — `analytics?.healthBreakdown?.completionPct`, emerald ≥70%, amber ≥40%, default otherwise.
   - **Overdue** — `analytics?.healthBreakdown?.overdueTickets`, amber tone when > 0, links to issues.
7. Health card tone updated to use the uppercase backend values: `"EXCELLENT"` → emerald,
   `"GOOD"` → amber, `"AT_RISK"` / `"CRITICAL"` → red.
8. **Next release card** added alongside the milestone card: first `status === "draft"` release
   sorted by `releaseDate`, shows name, planned date, version badge.
9. Skeleton updated to `cols={5} count={5}` and a 3-column card grid placeholder.

### `frontend/features/build/overview/project-overview-page.test.tsx`

Added 16 new tests (total: 25):

- Progress stat card displays `completionPct`
- Overdue stat card displays `overdueTickets`
- Releases query error included in page error (paired positive/negative — FE-122)
- Next release card renders name and version for the nearest `draft` release
- Next release card absent when all releases are `released`
- Offline banner shown/hidden (paired)
- URL param `range` forwarded as typed enum
- URL param `teamId` forwarded as number (not string)
- URL param `ownerId` forwarded correctly
- No URL params → `undefined` passed so the stable query key is preserved
- Invalid range value → `undefined` passed (type guard)
- No element has positive `tabIndex` (jsdom-testable part of the Tab order requirement)

---

## Test results

```
npx jest --runTestsByPath \
  "features/build/overview/project-overview-page.test.tsx" \
  "features/build/reports/reports-overview-tab.test.tsx" \
  "features/build/overview/overview-stat-label.test.ts" \
  --no-coverage

PASS features/build/overview/project-overview-page.test.tsx
PASS features/build/reports/reports-overview-tab.test.tsx
PASS features/build/overview/overview-stat-label.test.ts
Test Suites: 3 passed, 3 total
Tests:       37 passed, 37 total
```

---

## Box 3 assessment — `10-project.md`

| Item | Category | Implemented | Tested | Verdict |
|------|----------|-------------|--------|---------|
| health | core field | ✓ project-overview-page.tsx:145 | ✓ renders stat cards | PASS |
| progress | core field | ✓ :150 (completionPct) | ✓ Progress stat card test | PASS |
| due work | core field | ✓ :117 (totalOpen) | ✓ renders stat cards | PASS |
| risks | core field | ✓ :161 (overdueTickets) | ✓ Overdue stat card test | PASS |
| milestones | core field | ✓ :181 (nextMilestone) | ✓ milestone card test | PASS |
| releases | core field | ✓ :192 (nextRelease) | ✓ release card test | PASS |
| activity | core field | ✗ | ✗ | BLOCKED — no project-level activity endpoint |
| URL param: range | URL state | ✓ :54 → analyticsParams | ✓ range forwarding test | PASS |
| URL param: teamId | URL state | ✓ :57 → analyticsParams | ✓ teamId forwarding test | PASS |
| URL param: ownerId | URL state | ✓ :59 → analyticsParams | ✓ ownerId forwarding test | PASS |
| shortcut: / | shortcut | N/A | N/A | CCG-4 — no search on overview |
| shortcut: c | shortcut | N/A | N/A | CCG-4 — no create on overview |
| shortcut: j/k | shortcut | N/A | N/A | CCG-4 — no list on overview |
| shortcut: Enter | shortcut | N/A | N/A | CCG-4 — no list on overview |
| shortcut: e | shortcut | N/A | N/A | CCG-4 — no edit target |
| shortcut: ? | shortcut | N/A | N/A | CCG-4 — no help panel |
| Tab order | shortcut | ✓ (no positive tabIndex) | ✓ tabIndex test | PASS — browser focus order is C6 |
| Esc closes overlays | shortcut | N/A | N/A | No overlays on this page |
| loading state | state | ✓ | ✓ | PASS |
| empty state | state | ✓ | ✓ | PASS |
| error state | state | ✓ | ✓ | PASS |
| denied state | state | ✓ | ✓ | PASS |
| offline state | state | ✓ :124 | ✓ offline banner test | PASS |
| conflict state | state | N/A | N/A | CCG-1 |
| build:view permission | permission | ✓ | ✓ | PASS |

**Box 3: NOT TICKED.**

Single remaining blocker: **`activity` core field** — no project-level activity endpoint in the
backend. The only activity route is per-ticket (`GET /build/:projectId/tickets/:ticketId/activity`).
A project-level activity feed requires a new backend endpoint.

All other items are implemented and tested, or excused by CCG-1 or CCG-4.
