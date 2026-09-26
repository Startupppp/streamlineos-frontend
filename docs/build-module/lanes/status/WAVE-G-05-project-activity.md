# Wave-G-05 Status: Project Activity Feed (`GET /build/:projectId/activity`)

## Migration decision

**No migration was written.** The `ticketActivityLog` table already stores `orgId` and `ticketId`. A JOIN with the `tickets` table (filtering on `tickets.projectId`) and a JOIN with `projects` (for `projects.key`) produces the project-level feed from existing rows. The reserved range 1325–1329 is unused.

The `uniq_ticket_activity_log_org_id` unique constraint on `(orgId, id)` is an implicit index PostgreSQL can use to scan recent activity for an org in reverse-id order, then apply the ticket→project join as a filter. No new index is required.

---

## Changes made this wave

### Backend

#### `backend/src/modules/build/core/dto/project-activity.schemas.ts` (NEW)
- `projectActivityItemSchema` — activity item with `ticketId`, `ticketTitle`, `ticketNumber`, `projectKey`, `user`, `action`, `label`, `fromValue`, `toValue`, `createdAt`.
- `projectActivityPageSchema` — cursor page of `projectActivityItemSchema`.

#### `backend/src/modules/build/core/projects-activity-feed.service.ts` (NEW)
- `ProjectsActivityFeedService.getProjectActivity(actor, projectId, opts)`
- Calls `assertProjectInOrg` for 404 on cross-tenant or deleted projects.
- Queries `ticketActivityLog` INNER JOIN `tickets` (projectId filter + deletedAt IS NULL) INNER JOIN `projects` (for key) LEFT JOINs `organizationMembers`, `users`, `organizationPeople` (for actor resolution).
- Cursor: `id < $cursor` ORDER BY `ticketActivityLog.id` DESC, matches the sort key exactly.
- Returns `buildCursorPage`, max 100 rows per platform cap (default 50 via `ticketActivityQuerySchema`).
- Actor name resolution uses `resolvePersonDisplayName` (same as per-ticket service). System events (null `userMembershipId`) map to `user: null`.

#### `backend/src/modules/build/core/projects-activity-feed.controller.ts` (NEW)
- `GET /build/:projectId/activity`
- `@RequirePermission("build:view")` — matches `build:view` in both catalogs (BE-112 satisfied).
- `@Validate({ params: projectIdParams, query: ticketActivityQuerySchema })` — all route params declared in strict schemas (BE-14).
- `@ResponseSchema(projectActivityPageSchema)` — OpenAPI coverage (BE-18).
- No write inside GET (BE-33).

#### `backend/src/modules/build/core/projects.module.ts` (UPDATED)
- `ProjectsActivityFeedController` added to controllers array.
- `ProjectsActivityFeedService` added to providers array.

### Backend tests

#### `backend/src/modules/build/core/projects-activity-feed.isolation.spec.ts` (NEW)
5 passing tests:
- cross-tenant project ID rejected as 404 (negative gate)
- empty first page when project has no activity (positive)
- row with resolved actor maps to item with user.name and ticket context (positive)
- row with null actor maps to item with user null (positive; paired with above)
- sentinel row trimmed, hasMore set (positive)

### Frontend

#### `frontend/hooks/api/build/build-tickets-subresource-schema.ts` (UPDATED)
- Added `projectActivityPageContract` — mirrors backend field for field: `id`, `action`, `label`, `fromValue`, `toValue`, `createdAt`, `ticketId`, `ticketTitle`, `ticketNumber`, `projectKey`, `user` (nullable with `id`, `name`, `image`), `pagination`.

#### `frontend/lib/query-keys/build-work.ts` (UPDATED)
- Added `activity: (projectId: number) => [...]` factory under `projects`.

#### `frontend/hooks/api/build/project-activity.ts` (NEW)
- `useProjectActivity(projectId)` — `useQuery`, permission-gated on `build:view`, `staleTime: 30_000`.
- Requests `limit: 20` from `GET /build/:projectId/activity`.
- Contract parsed through `projectActivityPageLazy` (lazy import, matches BE-27 contract drift check).

#### `frontend/features/build/overview/project-overview-page.tsx` (UPDATED)
- Imports `useProjectActivity`.
- `activityQuery` added; its `isError` and `error` are included in the aggregate page state (FE-41 satisfied).
- `handleRetry` calls `activityQuery.refetch()`.
- "Recent activity" card rendered when `activityQuery.data.data.length > 0`; hidden when empty (no empty-card noise).
- Each item shows: `user.name ?? "System"`, `label`, `projectKey-ticketNumber`, `ticketTitle`, `formatShortDate(createdAt)`.
- Names are displayed, never raw IDs (FE-85 satisfied).

#### `frontend/features/build/overview/project-overview-page.test.tsx` (UPDATED)
- `useProjectActivity` mock added.
- 4 new tests (total: 29):
  - Activity items render with actor name, action label, ticket key (positive — FE-122)
  - No activity section when data is empty (negative — FE-122 paired)
  - System actor name for null-user events (positive)
  - Activity query error included in page error (positive; ensures 402/403 is not silently dropped — FE-41)

---

## Test results

```
npx jest --runTestsByPath \
  "features/build/overview/project-overview-page.test.tsx" \
  "features/build/reports/reports-overview-tab.test.tsx" \
  "features/build/overview/overview-stat-label.test.ts" \
  --no-coverage

PASS features/build/overview/overview-stat-label.test.ts
PASS features/build/reports/reports-overview-tab.test.tsx
PASS features/build/overview/project-overview-page.test.tsx

Test Suites: 3 passed, 3 total
Tests:       41 passed, 41 total
```

```
npx jest --runTestsByPath \
  "src/modules/build/core/projects-activity-feed.isolation.spec.ts" \
  --no-coverage

PASS src/modules/build/core/projects-activity-feed.isolation.spec.ts

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

---

## Box 3 assessment — `10-project.md`

| Item | Category | Implemented | Tested | Verdict |
|------|----------|-------------|--------|---------|
| health | core field | ✓ | ✓ | PASS |
| progress | core field | ✓ | ✓ | PASS |
| due work | core field | ✓ | ✓ | PASS |
| risks | core field | ✓ | ✓ | PASS |
| milestones | core field | ✓ | ✓ | PASS |
| releases | core field | ✓ | ✓ | PASS |
| **activity** | **core field** | **✓ (new)** | **✓ (new)** | **PASS** |
| URL param: range | URL state | ✓ | ✓ | PASS |
| URL param: teamId | URL state | ✓ | ✓ | PASS |
| URL param: ownerId | URL state | ✓ | ✓ | PASS |
| shortcut: / | shortcut | N/A | N/A | CCG-4 — no search on overview |
| shortcut: c | shortcut | N/A | N/A | CCG-4 — no create on overview |
| shortcut: j/k/Enter/e/? | shortcut | N/A | N/A | CCG-4 — no list/edit target |
| Tab order | shortcut | ✓ (no positive tabIndex) | ✓ | PASS — browser focus order is C6 |
| Esc closes overlays | shortcut | N/A | N/A | No overlays on this page |
| loading state | state | ✓ | ✓ | PASS |
| empty state | state | ✓ | ✓ | PASS |
| error state | state | ✓ | ✓ | PASS |
| denied state | state | ✓ | ✓ | PASS |
| offline state | state | ✓ | ✓ | PASS |
| conflict state | state | N/A | N/A | CCG-1 |
| build:view permission | permission | ✓ | ✓ | PASS |

**Box 3: TICKED.**

All core fields now implemented and tested. Activity was the single remaining blocker; it is resolved by `GET /build/:projectId/activity` (no migration needed) and the `useProjectActivity` hook + activity card in the overview page.

## Deploy ordering

`projects-activity-feed.service.ts` reads only from existing tables (`ticket_activity_log`, `tickets`, `projects`). No new schema objects. **No migration is required, and the code is safe to deploy immediately.** Railway will ship the backend on the next push; Vercel will ship the frontend.
