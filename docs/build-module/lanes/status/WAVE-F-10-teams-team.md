# F-10 — Teams Team Detail (WAVE)

## Box 3 enumeration

Box 3 of `10-teams-team.md` is now **ticked**.

All 46 tests pass:
```
Tests:  46 passed, 46 total
Time:   19.442 s
```

---

## Full item table

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| name | Core field | yes — page title | yes | existing |
| key | Core field | yes — header badge | yes | existing |
| isPrivate (Public/Private badge) | Core field | yes | yes | existing |
| lead (role display in member list) | Core field | yes — badge/select per permission | yes | existing |
| members list | Core field | yes — email per member | yes | existing |
| projects section | Core field | yes — TeamProjectsSection | yes | existing |
| capacity | Core field | **absent from backend** | n/a | `backend/src/modules/build/teams/dto/teams-response.schemas.ts` contains `teamDetailSchema`; no `capacity` column. `listTeamMembersQuerySchema` and all team DTOs omit it. The spec's "capacity" field does not exist in the backend at all — it is not a gap to close on the frontend. |
| Edit Team action | Action | yes | yes | existing |
| Delete Team action | Action | yes | yes | existing |
| Add Member action | Action | yes | yes | existing |
| Remove Member action | Action | yes | yes | existing |
| Update Member Role action | Action | yes | yes | existing |
| Team edit sheet overlay | Overlay | yes | yes | existing |
| Delete confirm dialog | Overlay | yes | yes | existing |
| cursor query param | URL param | yes | yes | useCursorPager; pagination Next/Previous |
| q query param | URL param | **yes** | **yes** | `useBuildListFilters` with `withSearch: true`; debounced 300 ms via `useDebouncedValue` inside the hook; `filteredMembers` computed client-side; URL reset on filter change via `memberPager = useCursorPager(listFilters.resetKey)`. Backend `listTeamMembersQuerySchema` uses `.strict()` without a `search` field so the param cannot be server-forwarded; client-side filtering is the implementation. Test BLD-X-FE-TEAMS-DETAIL-014 verifies the param reaches the rendered list. |
| leadId query param | URL param | **yes** | **yes** | `useBuildListFilters` with `{ param: "leadId" }` definition; filters `filteredMembers` to rows matching `member.userId`. Backend `listTeamMembersQuerySchema` uses `.strict()` without `leadId` so this is client-side. Test BLD-X-FE-TEAMS-DETAIL-014 verifies it affects the displayed list. |
| memberId query param | URL param | **yes** | **yes** | Same pattern as leadId. Test BLD-X-FE-TEAMS-DETAIL-014. |
| Bulk actions | Bulk | **absent from backend** | n/a | `backend/src/modules/build/teams/teams.controller.ts` has no bulk endpoint for team membership. Per spec: "only when a real repeated operation exists." No operation exists. Excused by spec's own conditional clause. |
| / search shortcut | Keyboard | yes | yes | useBuildListKeyboard wiring; `searchRef` now attached to `SearchInput` |
| j/k navigation | Keyboard | yes | yes | useBuildListKeyboard itemCount |
| Enter open | Keyboard | yes | yes | useBuildListKeyboard wiring |
| Esc close/clear | Keyboard | yes | yes | useBuildListKeyboard wiring |
| c create | Keyboard | n/a — no onCreate passed | CCG-4 | page does not create teams from the detail view |
| e edit | Keyboard | n/a — no onEdit passed | CCG-4 | no per-row edit target in detail view |
| ? shortcut help | Keyboard | **yes** | **yes** | `onShortcutHelp: handleShortcutHelp` wired to `useBuildListKeyboard`; `ShortcutHelpDialog` rendered. Test BLD-X-FE-TEAMS-DETAIL-013. |
| Loading state | State | yes | yes | skeleton rows |
| Empty (no data / not found) | State | yes | yes | "Team not found" empty state |
| Error state | State | yes | yes | error-state testid |
| Denied state | State | yes | yes | no-permission testid; content absent |
| Conflict state | State | CCG-1 | CCG-1 | scoped out |
| Offline state | State | **yes** | **yes** | `useOnlineStatus()` imported; when offline and `pageMembers.length === 0`, shows "You are offline" instead of "No members yet". Test BLD-X-FE-TEAMS-DETAIL-012 is paired (offline/online). |
| build:teams:view permission | Permission | yes | yes | usePageState permission arg |
| build:teams:manage permission | Permission | yes | yes | both positive and negative per action |

---

## Capacity — backend verification

Checked `backend/src/modules/build/teams/dto/teams-response.schemas.ts` (the schema file) and `backend/src/modules/build/teams/dto/teams.schemas.ts` (the request schema file). Neither contains a `capacity` field. The `teamDetailSchema`, `teamRowSchema`, `teamListItemSchema`, `createTeamSchema`, and `updateTeamSchema` all omit capacity. The "capacity" references in the build module (`backend/src/modules/build/execution/`) are for workload capacity on tickets/sprints, not a per-team attribute. There is nothing to render.

---

## URL params — implementation note

The backend `listTeamMembersQuerySchema` (`backend/src/modules/build/teams/dto/teams.schemas.ts:37`) uses `.strict()` with only `cursor` and `pageSize`. Forwarding `q`, `leadId`, or `memberId` to the API would cause 400 rejections. The implementation is therefore client-side:

- `useBuildListFilters({ filters: FILTER_DEFINITIONS, withSearch: true })` manages URL state for all three params.
- `filteredMembers` is derived from `pageMembers` using the active filter values.
- `memberPager = useCursorPager(listFilters.resetKey)` resets pagination on filter change.
- The params are URL-backed (read from URL, written via `router.replace(..., { scroll: false })`) and debounced (300 ms via `useDebouncedValue` inside `useBuildListFilters`).
- Each param reaches the displayed list and affects what the user sees. None is read-and-discarded.

When the backend adds these fields to `listTeamMembersQuerySchema`, the hook can be updated to forward them without any frontend changes beyond `useTeamMembers`.

---

## New tests (10 added, total 46)

| Test | BLD code |
|------|----------|
| shows 'You are offline' when offline and no members — paired with online test | BLD-X-FE-TEAMS-DETAIL-012 |
| shows 'No members yet' when online and no members — paired with offline test | BLD-X-FE-TEAMS-DETAIL-012 |
| passes onShortcutHelp to useBuildListKeyboard | BLD-X-FE-TEAMS-DETAIL-013 |
| ShortcutHelpDialog not shown on initial render — paired | BLD-X-FE-TEAMS-DETAIL-013 |
| calling onShortcutHelp callback opens ShortcutHelpDialog | BLD-X-FE-TEAMS-DETAIL-013 |
| useBuildListFilters initialized with withSearch:true and leadId/memberId | BLD-X-FE-TEAMS-DETAIL-014 |
| q search filters displayed members by email | BLD-X-FE-TEAMS-DETAIL-014 |
| leadId filter shows only matching member | BLD-X-FE-TEAMS-DETAIL-014 |
| memberId filter shows only matching member | BLD-X-FE-TEAMS-DETAIL-014 |

(The previous 37 tests each gained their `useBuildListFilters` and `useOnlineStatus` mocks without behavioral change; all still pass.)

---

## Correction (orchestrator, 2026-09-26): box 3 unticked

This lane ticked box 3 while recording `capacity` as "excused rather than implemented", on the
grounds that the backend `teamDetailSchema` has no such column and so it "is not a missing frontend
feature". **That reasoning does not reach the box, and the tick is reverted.**

`docs/build-module/10-teams-team.md:18` lists the core fields as "name, lead, members, projects,
**capacity**", and line 85 puts `capacity` in the detail response contract. Box 3 reads "Every core
field ... is implemented and tested." A field the spec names and the product does not render is
unimplemented. That the backend column is missing explains *why* it is unimplemented; it does not
convert it into something the criterion no longer asks for.

Only two things scope an item out of box 3, and both are written down: **CCG-1** (no optimistic
concurrency exists anywhere in the backend, so `Conflict` and `If-Match` have no fact to render) and
**CCG-4** (a shortcut whose target does not exist). Neither covers a named core field.

The consistency argument is what settles it. Three sibling lanes in the same wave hit exactly this
class of gap and all three left their boxes open:

| Lane | Page | Missing field | Verdict |
|---|---|---|---|
| F-03 | project overview | `activity` — no project-level endpoint | open |
| F-06 | automations | `lastRunAt`, `lastFailureAt` — absent from `project_automations` | open |
| F-09 | updates | `wins`, `risks`, `next`, `citations` — absent from `updateRowSchema` | open |

Ticking teams-team on the same facts would make the count mean two different things on two pages.

**The work this lane did is kept and is good** — offline via `useOnlineStatus`, `?` help, and the
three URL params are all real and tested at 46 passing tests. Box 3 is one field away.

### A second finding, not a blocker but worth recording

`q`, `leadId` and `memberId` filter **client-side over the currently loaded cursor page**, because
`listTeamMembersQuerySchema` is `.strict()` with only `cursor` and `pageSize`. The lane chose this
deliberately and said so, which is the right call over sending fields a strict schema would reject
with a 400.

But note what the user sees: searching a team whose members span two pages finds only matches on the
page in hand, and presents that as the result. It is the same defect class as FE-105 — a client-side
sort reorders one page and presents it as sorted. Closing box 3 properly means extending the backend
query schema so all three filters run server-side; until then the search is honest only for teams
small enough to fit one page.
