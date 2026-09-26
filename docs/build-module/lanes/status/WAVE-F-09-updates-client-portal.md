## Wave-F-09 — updates C3 / client-portal C3

Session agent: F-09  
Pages: `10-project-updates.md`, `10-project-client-portal.md`

---

### Deliverables

| File | Change |
|------|--------|
| `frontend/features/build/updates/updates-page.tsx` | Added keyboard nav (`useBuildListKeyboard`: `c`, `j/k`, `Esc`, `?`), offline banner (`useOnlineStatus`), `ShortcutHelpDialog`, focused-card ring, `focused` prop on `UpdateCard`, `cn` import |
| `frontend/features/build/updates/updates-page.test.tsx` | Added mocks for `useBuildListKeyboard`, `ShortcutHelpDialog`, `useOnlineStatus`; 4 new tests: offline banner visible, offline banner absent, keyboard `itemCount` correct, `onCreate` gated on `canManage`, `onCreate` omitted when read-only, `onShortcutHelp` wired |
| `frontend/features/build/client-portal/client-visibility-page.tsx` | Added `useOnlineStatus` import and offline banner inside `PmSection index={0}` |
| `frontend/features/build/client-portal/client-visibility-page.ap9.test.tsx` | Added `useOnlineStatus` mock, reset in `beforeEach`, 2 new offline tests (paired) |
| `frontend/features/build/client-portal/portal-separation.test.tsx` | Added `useOnlineStatus` mock (it imports `ClientVisibilityPage`) |

---

### Test run output (all suites)

```
PASS features/build/updates/updates-page.test.tsx (5.242 s)
  √ renders denied state when build:updates:view is not in the access snapshot
  √ renders empty state when there are no updates
  √ renders error state and retry on query failure
  √ renders update cards when data is populated
  √ hides delete button when canManage is false
  √ shows skeleton and not a denial while the access snapshot is still in flight
  √ renders the plan upgrade link the backend sent with a 402 MODULE_NOT_ENABLED
  update cards — core fields and action visibility
    √ renders the status badge text from the update row
    √ renders the audience badge text from the update row
    √ shows the Post Update button when canManage is true
    √ shows the Delete button on a card when canManage is true
  URL-backed filter state — authorId, from, to wired to useProjectUpdates
    √ passes authorId from the URL to useProjectUpdates
    √ passes from from the URL to useProjectUpdates
    √ passes to from the URL to useProjectUpdates
    √ passes undefined for absent params
    √ passes status:published from the URL to useProjectUpdates
    √ passes undefined for an unrecognised status value
  offline state — CCG-5
    √ shows the offline banner when useOnlineStatus returns false
    √ does not show the offline banner when useOnlineStatus returns true
  keyboard navigation — CCG-4
    √ calls useBuildListKeyboard with itemCount matching the number of loaded updates
    √ passes onCreate to useBuildListKeyboard when canManage is true
    √ omits onCreate from useBuildListKeyboard when canManage is false
    √ renders the shortcut help dialog when focusedIndex is set and ? is pressed

PASS features/build/client-portal/client-visibility-page.ap9.test.tsx (5.249 s)
  AP-9: ClientVisibilityPage must resolve through usePageState not a bare boolean useCan gate
    √ does not show access-denied state while the access snapshot is still loading
    √ shows access-denied view when the access snapshot confirms the permission is not held
    √ renders visibility content when usePageState resolves to ready with permission held
    √ passes permission build:clientvisibility:manage to usePageState
  C4: ClientVisibilityPage uses IntersectionObserver sentinel
    √ renders InfiniteScrollSentinel for tickets
    √ passes hasNextPage=false to InfiniteScrollSentinel when hasMore is false
  offline state — CCG-5
    √ shows the offline banner when useOnlineStatus returns false
    √ does not show the offline banner when useOnlineStatus returns true

PASS features/build/client-portal/portal-separation.test.tsx (all 8 passed)
PASS features/build/client-portal/portal-list-page.test.tsx (all 4 passed)
PASS features/build/client-portal/internal-portal-states.test.tsx (all 12 passed)
PASS features/build/updates/update-form-dirty-guard.test.tsx (all 3 passed)
```

---

### Criteria status

#### `10-project-updates.md`

| # | Criterion | Status |
|---|-----------|--------|
| C3 | Fields, states, permissions | **OPEN** — see blockers below |

#### `10-project-client-portal.md`

| # | Criterion | Status |
|---|-----------|--------|
| C3 | Fields, states, permissions | **OPEN** — see blockers below |

---

### Backend claim resolution — updates

Searched: `backend/src/modules/build/updates/`

Routes registered by `UpdatesController` (`backend/src/modules/build/updates/updates.controller.ts`):
- `GET /build/:projectId/updates` — list, returns `updateListPageSchema`
- `POST /build/:projectId/updates` — create, accepts `body` only
- `PATCH /build/:projectId/updates/:updateId` — edit, accepts `body` only
- `DELETE /build/:projectId/updates/:updateId` — soft delete

`updateRowSchema` (`backend/src/modules/build/updates/dto/updates-response.schemas.ts:4`):
```
id, orgId, projectId, authorMembershipId, body, status, audience, createdAt, updatedAt, deletedAt
```

**Frontend contract parity** (`frontend/hooks/api/build/project-updates-schema.ts`): matches the backend row exactly — no drift.

**What the spec requires vs. what the backend provides:**

| Spec field | Backend column | Status |
|---|---|---|
| `status` | `status: enum["draft","published"]` | ✓ implemented and tested |
| `audience` | `audience: enum["internal","client"]` | ✓ implemented and tested |
| `summary` (spec label for body) | `body: string` | ✓ rendered as `update.body` |
| `author` (display) | `authorMembershipId: int` | ✗ no name in schema — display name requires a join not present in `updateRowSchema` |
| `wins` | absent from schema | ✗ column does not exist |
| `risks` | absent from schema | ✗ column does not exist |
| `next` | absent from schema | ✗ column does not exist |
| `citations` | absent from schema | ✗ column does not exist |

**C3 blockers for updates:**
1. `wins`, `risks`, `next`, `citations` — not in `backend/src/modules/build/updates/dto/updates-response.schemas.ts`. Not in `createUpdateSchema` or `editUpdateSchema` either. No database column exists; no migration would be safe to write here (no reserved range).
2. Author display name — `authorMembershipId` is returned but no display name. Would require either a join in the service (`backend/src/modules/build/updates/updates.service.ts`) returning an `authorName` field, or a separate resolution hook on the frontend. Neither exists.

**What C3 cannot close without:** a backend migration adding `wins`, `risks`, `next`, `citations` columns + corresponding schema + service updates + a joined `authorName` projection.

**What was closed in this pass** (frontend-only, no backend dependency):
- Keyboard: `j/k` moves through update cards; `c` fires Post Update dialog when `canManage`; `Esc` clears selection; `?` opens `ShortcutHelpDialog`. No `/` (no search input on this page), no `Enter` (no detail view), no `e` (no edit action) — all three absent per CCG-4 because their targets don't exist.
- Offline: `useOnlineStatus()` banner wired and tested (paired positive/negative).
- All existing tests continue to pass (23/23).

---

### Backend claim resolution — client portal

Searched: `backend/src/modules/build/client-portal/`

Controllers registered in this directory:
1. `ClientPortalController` (`client-portal.controller.ts`) — routes at `build/portal`:
   - `GET build/portal/projects` — lists projects a member has portal access to
   - `GET build/portal/projects/:projectId/overview` — project overview (milestones, tasks, attachments, comments)
   - `GET build/portal/projects/:projectId/change-requests` — list CRs
   - `POST build/portal/projects/:projectId/change-requests` — submit CR
2. `ClientVisibilityController` (`client-visibility.controller.ts`) — routes at `build/:projectId/client-visibility`:
   - `GET build/:projectId/client-visibility` — summary of ticket/milestone visibility
   - `PATCH build/:projectId/client-visibility/tickets/:ticketId` — toggle ticket visibility
   - `PATCH build/:projectId/client-visibility/milestones/:milestoneId` — toggle milestone visibility
   - `PATCH build/:projectId/client-visibility/comments/:commentId` — toggle comment visibility
   - `PATCH build/:projectId/client-visibility/attachments/:attachmentId` — toggle attachment visibility

**What the spec requires vs. what the backend provides:**

| Spec field | Backend | Status |
|---|---|---|
| `visible sections/fields` | `ticketVisibilityItemSchema`, `milestoneVisibilityItemSchema` in `client-portal-response.schemas.ts:64-76` | ✓ ticket and milestone toggles implemented and tested |
| `section` URL param | `section` query param drives tab selection | ✓ wired |
| `grant` | no grant entity anywhere in `backend/src/modules/build/client-portal/` | ✗ not implemented |
| `publication state` | not in any response schema | ✗ not implemented |
| `expiry` | not in any response schema | ✗ not implemented |
| `preview content` | `portalProjectOverviewSchema` exists for the client-facing portal but no "preview" for the management surface | ✗ not implemented on management page |

Additional URL params from spec: `grantId`, `status`, `from`, `to`, `cursor` — none are wired because the features they filter (grants, publication status, date ranges) have no backend implementation.

**C3 blockers for client portal:**
1. `grant` — no table, no route, no schema anywhere in `backend/src/modules/build/client-portal/`. No portal access grant concept exists.
2. `publication state` — no such field on any client portal response schema.
3. `expiry` — no such field.
4. `preview content` — the `portalProjectOverviewSchema` provides project data to clients, but there is no "preview" endpoint for the internal management view at `/build/[projectId]/client-portal`.

**What C3 cannot close without:** backend routes and schema for grants, publication state, and expiry, plus a management-side preview endpoint, plus frontend implementation of all four features.

**What was closed in this pass** (frontend-only):
- Offline: `useOnlineStatus()` banner wired and tested (paired positive/negative).
- All existing tests continue to pass (8 + 8 + 4 + 12 passing suites).
- Keyboard: `ClientVisibilityPage` is a toggle management surface — no list for `j/k`, no create action, no search. `Tab` follows visual order via browser's native focus management (Switch controls are focusable). `Esc` closes overlays; no overlays exist on this page currently. CCG-4 requires only `Tab`/`Esc` unconditionally; all per-target shortcuts are absent by definition.

---

### Summary

Both pages remain at C3 OPEN. The previous agent's verdict was correct in substance: the missing fields are genuinely absent from the backend schemas. This pass resolves the inherited claims to file paths (not just "no backend API"), implements everything frontend-closable (keyboard nav on updates, offline state on both), and confirms 23 + 8 tests all green.

**Remaining work to close C3:**
- **Updates**: backend migration + schema for `wins`, `risks`, `next`, `citations`; joined `authorName` projection in `updates.service.ts`; then frontend contract extension and render.
- **Client portal**: backend implementation of portal grants, publication state, expiry, and management-side preview; then frontend.

Neither requires a new migration from this lane (no reserved migration range), and the openapi.json was not hand-edited.
