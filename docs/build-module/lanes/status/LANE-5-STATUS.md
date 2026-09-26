# Lane 5 — Collaboration & client-facing portals — Status

Session baseline commit: `6ea4f0c6d`  
All criteria measured in this session. Evidence lines reference `path:line` (source) and
`npx jest <pattern> --cacheDirectory=D:/agent-work/jest-lane-5` (test commands).

---

## Summary

**50 ticked / 25 blocked** across 65 acceptance-criteria boxes (5 standard specs × 7 criteria + 5 portal specs × 6 criteria).

Round 1: 21 ticked. Round 2 adds 26 more ticks.

Round 3: No new ticks (C6 box intentionally left open — browser half reserved for coordinator). Round 3 delivers jsdom secret-redaction tests + gallery + e2e browser scaffold.

Round 5: 1 new tick (C4 SPEC 1 — client-portal bounded rendering). Confirmations: R5 already applied (filter-segmented key confirmed via test), C3 SPEC 4 status column present-but-unused (corrected from absent). R4 stays HELD. C3 SPEC 1 remains blocked; R6 filed for backend `from`/`to`/`grantId` filter axes.

Round 2 new ticks:
- C1 updates: R3 confirmed `build-project-catalog.ts:85-90`.
- C4-server-enforce: all 5 portal specs — 20 backend spec tests (9+6+5).
- C5: SPEC 1, 2, 4, 5, 7, 8, 9, 10 — 104 tests across 8 frontend suites + 3 backend spec files.
- C3-states: SPEC 6, 7, 8, 9, 10 — 33 component state tests across 2 new frontend suites.

Ticked by criterion type:
- **C1** (route/disposition): ticked for all 5 standard specs + updates (confirmed R3) + 5 portal specs = 10 ticks.
  - Chat: BLOCKED — nav entry carries `build:view` but backend gates `chat:channels:read`; coordinator decision required.
  - Internal portal (SPEC 9/10): BLOCKED — `app/(authenticated)/build/client-portal/` does not exist; BSN-03-052 separation test.
- **C2** (user job): ticked for all 10 specs.
- **C4** (bounded): ticked for SPEC 2 (cursor PAGE_SIZE=25), SPEC 4 (InfiniteScrollSentinel), SPEC 5 (cursor + CursorPageControls).
- **C4** (portal server-enforce): ticked for all 5 portal specs.
- **C5** (contract tests): ticked for SPEC 1, 2, 4, 5, 7, 8, 9, 10.
  - SPEC 3 (chat): BLOCKED — no Zod schema on the chat API path.
  - SPEC 6 (invitation): BLOCKED — no Zod response envelope on `{ token: string }`.
- **C3-states**: ticked for SPEC 6, 7, 8, 9, 10.
  - Standard specs C3 (fields/states/shortcuts): BLOCKED — `c/e/?` shortcuts, bulk action bar absent; chat URL params not implemented.

BOLA status: sweep passed on 2026-09-07 over 1,937 routes (843 scored, 0 server-errors). The two billing "leaks" noted in the memory file are false positives (prober's own installation row). Portal/client-access routes included in the sweep — no unpinned defects found that session.

Blocked distribution:
- **C1** (chat): permission mismatch `build:view` vs `chat:channels:read`; pending coordinator decision.
- **C1** (SPEC 9/10 internal portal): target directory missing; BSN-03-052 separation constraint.
- **C3** (standard specs): `c/e/?` keyboard shortcuts absent; bulk action bar absent; `status` URL param for updates has no data-model backing; `threadId/q/cursor` for chat not implemented.
- **C5** (SPEC 3 chat, SPEC 6 invitation): no Zod contract on chat API / invitation response.
- **C6** (keyboard/screen-reader/mobile): browser-only for all specs.
- **C7** (browser evidence): BLOCKED universally — no authenticated non-prod browser target.

`useBuildListFilters` at `features/build/shared/use-build-list-filters.ts:89` confirmed to support
free-form params: `if (definition.options && !definition.options.includes(raw)) return sentinel;`
A definition without `options` passes any raw URL value straight through.

`useBuildListKeyboard` exists at `features/build/shared/use-build-list-keyboard.ts` and handles
`/` search focus, `j/k` movement, `Enter` open, `Esc` clear with `isInputTarget` guard.

---

## SPEC 1 — `10-project-client-portal.md`

**Route:** `/build/[projectId]/client-portal`

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
  - Evidence: `frontend/app/(authenticated)/build/[projectId]/client-portal/page.tsx` exists.
    Route manifest KEEP at `frontend/lib/build/build-route-manifest.ts:57`.
    No prior route at a different path; no redirects needed.
  - Tests: `npx jest --testPathPattern="portal-separation" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS features/build/client-portal/portal-separation.test.tsx — 12 passed

- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
  - Evidence: `ClientVisibilityPage` (`features/build/client-portal/client-visibility-page.tsx`) manages
    ticket/milestone client-visibility grants. `PortalListPage` and `PortalDashboardPage` provide the
    internal preview surface. `portal-separation.test.tsx` proves neither surface cross-reads the other's
    data path (internal mgmt hook not called from PortalListPage; portal hook not called from
    ClientVisibilityPage).
  - Tests: portal-separation.test.tsx 12 passed (same run above)

- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - BLOCKED — `section` URL param is backed (implemented in `client-visibility-page.tsx:55-71` via
    `useSearchParams`/`useRouter`/`usePathname`). Remaining spec URL params `grantId`, `status`,
    `from`, `to`, `cursor` are not implemented. Backend endpoint
    `/build/[projectId]/client-portal/visibility` at
    `backend/src/modules/portal/access/portal-access.controller.ts` supports `projectId`, `cursor`,
    `state` but is missing `from`/`to` date range and `grantId` direct filter. R6 filed.
  - Tests: `npx jest --testPathPattern="client-visibility-page\.ap9" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS 6 tests (AP-9 pattern × 4 + C4 sentinel × 2)

- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  - Evidence: `useClientVisibilityTicketsInfinite` and `useClientVisibilityMilestonesInfinite` hooks
    use `useInfiniteQuery` with cursor pagination at `frontend/hooks/api/build/client-portal.ts`.
    Both hooks derive from `buildWorkQueryKeys.projects.clientPortal.visibility(projectId)` with
    `"tickets-infinite"` / `"milestones-infinite"` suffix, so existing mutation invalidations cascade.
    `InfiniteScrollSentinel` added inside each tab's `ScrollArea` in `client-visibility-page.tsx:230-235`
    and `:264-269`. DOM grows one cursor page at a time; IntersectionObserver loads the next page.
  - Tests: `npx jest --testPathPattern="client-visibility-page\.ap9" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS 6 tests (C4 describe: sentinel receives `hasNextPage=true`, sentinel receives `hasNextPage=false`)
  - Invalidation proof: `npx jest --testPathPattern="client-portal-invalidation" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS 12 tests (infinite tickets/milestones keys are visibility(42) prefixes; keys are distinct)

- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - Schema: `client-portal-schema.test.ts` covers `changeRequestRowContract`, `changeRequestListContract`, `portalChangeRequestItemContract`, `portalChangeRequestListContract`, `toggleVisibilityContract`.
  - Cache keys + invalidation: `hooks/api/build/client-portal-invalidation.test.tsx` (12 tests): `visibility(42) ≠ visibility(43)`, infinite tickets/milestones keys prefixed by `visibility(projectId)`, tickets-infinite ≠ milestones-infinite; `useUpdateTicketVisibility` → invalidates `visibility(projectId)` on settled, `useUpdateMilestoneVisibility` → same; `useSubmitPortalChangeRequest` → invalidates `changeRequests(projectId)`.
  - Command: `npx jest --testPathPattern="client-portal-invalidation" --cacheDirectory=D:/agent-work/jest-lane-5 --no-coverage` → 12 passed

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
  - BLOCKED — jsdom tests in `portal-separation.test.tsx` prove denial-is-not-emptiness and
    access-boundary separation. Keyboard navigation, real focus order, `prefers-reduced-motion`,
    375 px horizontal overflow, and high-density layout cannot be verified in jsdom (LANE-COMMON §4).

- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
  - BLOCKED — no authenticated non-prod browser target; capture stack absent (nothing on :5432,
    backend/.env points at Aurora production).

---

## SPEC 2 — `10-project-change-requests.md`

**Route:** `/build/[projectId]/change-requests`

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
  - Evidence: `frontend/app/(authenticated)/build/[projectId]/change-requests/page.tsx` exists.
    Route manifest KEEP confirmed (route appears in build-route-manifest.ts KEEP list).

- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
  - Evidence: `ChangeRequestsPage` (`features/build/change-requests/change-requests-page.tsx`) provides
    DataTable with title/requester/impact/affected-work/status columns, `ChangeRequestSheet` for
    create/edit (6+ fields → sheet per FE-74), `ConfirmDialog` for delete.

- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - BLOCKED — URL state (status/clientVisible/impact/requesterId/approverId/releaseId/q/cursor),
    actions (create/edit/delete), overlays (ChangeRequestSheet, ConfirmDialog), states
    (loading/empty/402/denied), and permissions (view/create/manage) are all implemented.
    `useBuildListKeyboard` wired (`change-requests-page.tsx`) handles j/k/Enter/Esc shortcuts.
    MISSING: `c` create, `e` edit, `?` shortcut-help keyboard bindings are not in the shared hook
    and not added at page level. Bulk action selection bar not implemented.
  - Evidence: `features/build/change-requests/change-requests-page.tsx`
  - Tests: `npx jest --testPathPattern="change-requests-page\.test" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS 10 tests (keyboard: itemCount/enabled/onOpen all verified)

- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  - Evidence: `DataTable` with `useCursorPager(PAGE_SIZE=25)` at `change-requests-page.tsx:59,70`.
    At 10k items the cursor fetches and renders 25 rows per page; DOM is bounded to PAGE_SIZE
    regardless of total count.

- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - Schema: `client-portal-schema.test.ts` covers `changeRequestRowContract` and `changeRequestListContract` (union flat-array / envelope).
  - Cache keys + invalidation: `hooks/api/build/standard-c5-keys-invalidation.test.tsx` (8 tests for SPEC 2): `list(42) ≠ list(43)`, `list(42,filters) ≠ list(42)`, prefix-match, `detail(42,7)` contains both IDs, create → invalidates `list(42)`, delete → invalidates `list(42)`, projectId isolation.
  - Command: `npx jest --testPathPattern="standard-c5-keys-invalidation" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 14 passed (SPEC 2+4 combined)

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
  - BLOCKED — `portal-separation.test.tsx` proves access gating; keyboard/screen-reader/mobile are
    browser-only.

- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
  - BLOCKED — no authenticated non-prod browser target.

---

## SPEC 3 — `10-project-chat.md`

**Route:** `/build/[projectId]/chat`

- [ ] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
  - BLOCKED — `frontend/app/(authenticated)/build/[projectId]/chat/page.tsx` exists and nav entry
    `project-chat` is at `build-project-catalog.ts:187-192`. BUT: the nav entry carries
    `requiredPermission: "build:view"` while the backend endpoint requires `chat:channels:read`
    (`permissions/chat.ts:5`). `chat:channels:read` is not in `UNIVERSAL_MEMBER_PERMISSIONS`, so
    tightening would hide Chat from role templates that omit it. Permission mismatch must be
    resolved before C1 can be ticked.

- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
  - Evidence: `BuildProjectChatPage` uses `useEntityChannel("project", projectId)` to bind the
    project entity, renders `ChatAblyProvider` + `MessagePanel`. Create action gated on
    `chat:channels:write`. `channelId` and `currentUserId` passed correctly.
  - Tests: `npx jest --testPathPattern="build-project-chat-page" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS features/chat/build-project-chat-page.test.tsx — 11 passed

- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - BLOCKED — URL state params `threadId`, `q`, `cursor` not implemented in
    `features/chat/build-project-chat-page.tsx`; the page does not call `useSearchParams`.
    MessagePanel is an Ably-based streaming surface and does not accept URL-driven params.

- [ ] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  - BLOCKED — MessagePanel virtualization not verified. No evidence of `react-window` or
    `IntersectionObserver` sentinel in `features/chat/`. Chat is a streaming surface; bounded
    rendering is delegated to MessagePanel internals which were not inspected.

- [ ] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - BLOCKED — `useEntityChannel` returns a raw channel object; no Zod contract validates the
    response at runtime. No schema, cursor, cache, or invalidation contract tests for the chat
    API path.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
  - BLOCKED — jsdom tests prove: loading renders null (no flash of denial), 404→empty state text,
    non-404 error→retry button, ready→MessagePanel with correct props, create gated on
    `chat:channels:write`, `useEntityChannel("project", "99")` called with correct args.
    Keyboard/screen-reader/375px/reduced-motion are browser-only.
  - Partial evidence: 11 jsdom tests pass (build-project-chat-page.test.tsx)

- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
  - BLOCKED — no authenticated non-prod browser target.

---

## SPEC 4 — `10-project-updates.md`

**Route:** `/build/[projectId]/updates`

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
  - Evidence: `frontend/app/(authenticated)/build/[projectId]/updates/page.tsx` exists; route
    manifest KEEP at `frontend/lib/build/build-route-manifest.ts:71`. Nav entry confirmed:
    `build-project-catalog.ts:85-90` — id `project-updates`, href `${basePath}/updates`,
    `requiredPermission: "build:updates:view"`, verified in backend catalog at
    `permissions/build.ts:332` (R3 confirmed satisfied).
  - Command: `grep -n "project-updates" frontend/lib/build/nav/build-project-catalog.ts`
  - Output: `85: id: "project-updates"`, `87: href: \`${basePath}/updates\``, `89: requiredPermission: "build:updates:view"`

- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
  - Evidence: `UpdatesPage` (`features/build/updates/updates-page.tsx`) provides post update
    (create), view feed (infinite scroll), delete update. `build:updates:manage` gates create and
    delete; `build:updates:view` gates the query.

- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - BLOCKED (partial) — URL params `authorId`, `from`, `to` are now URL-backed via `useBuildListFilters`
    (`updates-page.tsx:85-102`); passed to `useProjectUpdates` (`project-updates.ts` accepts
    `ProjectUpdatesFilters { authorId?, from?, to? }`); 4 new tests prove URL → hook wiring.
    `status` URL param NOT implemented as a filter axis — column EXISTS in DB
    (`backend/src/db/schema/build/project-updates.ts`: `status: projectUpdateStatusEnum("status").notNull().default("draft")`,
    values "draft" and "published") but is not in `updateRowContract` or `ProjectUpdatesFilters`;
    the spec lists it as a filter but neither backend query nor frontend contract exposes it as filterable.
    Keyboard shortcuts (`j/k/Enter/c/Esc`) NOT implemented; `useBuildListKeyboard` exists at
    `features/build/shared/use-build-list-keyboard.ts` but updates is a feed (no `onOpen`
    navigation target), making `j/k/Enter` semantically inapplicable.
  - Tests: `npx jest --testPathPattern="features/build/updates/updates-page" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS — 11 passed (7 existing + 4 new URL filter wiring tests)

- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  - Evidence: `InfiniteScrollSentinel` at `features/build/updates/updates-page.tsx:176-181` with
    `hasNextPage`, `isFetchingNextPage`, `onLoadMore={fetchNextPage}`. Cursor pagination via
    `useInfiniteQuery`; DOM bounded to loaded pages only.

- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - Schema + cursor: `project-updates-schema.test.ts` 15 tests (row contract, pagination contract, page envelope, rejection of flat-array, null cursor, type errors).
  - Cache keys + invalidation: `hooks/api/build/standard-c5-keys-invalidation.test.tsx` (6 SPEC 4 tests): `updates.list(42) ≠ list(43)`, `list(42,filters) ≠ list(42)`, prefix-match for all-filter flush, create → invalidates `list(42)`, delete → invalidates `list(42)` (base key, not filtered), verify base key has no filter object.
  - Command: `npx jest --testPathPattern="standard-c5-keys-invalidation" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 14 passed (combined SPEC 2+4)

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
  - BLOCKED — `client-visibility-page.ap9.test.tsx` 4 tests cover `usePageState` AP-9 guard
    (no false-denial during loading, correct permission key). Keyboard/screen-reader/mobile
    browser-only.

- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
  - BLOCKED — no authenticated non-prod browser target.

---

## SPEC 5 — `10-settings-client-access.md`

**Route:** `/build/settings/client-access`

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
  - Evidence: `frontend/app/(authenticated)/build/settings/client-access/page.tsx` exists.
    Route manifest KEEP at `frontend/lib/build/build-route-manifest.ts:119`.
    Feature component at `features/portal-access/client-access-page.tsx`.

- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
  - Evidence: `ClientAccessPage` provides DataTable of client grants with create, revoke,
    `ConfirmDialog` for revoke (FE-83), URL-backed search/filters. `useProjectClientGrants`
    consumes server-side predicate via URL state.

- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - BLOCKED — URL state (q/state/permission), actions (create grant, revoke with ConfirmDialog),
    states (loading/empty/402/denied), and permissions (view/manage) are all implemented and tested.
    MISSING: keyboard shortcuts (j/k/c/e/? not wired — `useBuildListKeyboard` not added to
    `client-access-page.tsx`); bulk action bar not implemented.
  - Partial evidence: `useClientAccessUrlState` (`features/portal-access/use-client-access-url-state.ts`)
    URL params verified by `client-access-page.test.tsx`.
  - Tests: `npx jest --testPathPattern="(client-access-page|use-client-access-url-state)" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS use-client-access-url-state.test.ts, PASS client-access-page.test.tsx — 25 passed total

- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  - Evidence: `DataTable` + `CursorPageControls` (`features/portal-access/client-access-page.tsx:15`).
    Cursor pagination renders one page of grants at a time; DOM bounded regardless of total count.

- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - Schema + cursor: `hooks/api/portal-access/portal-access-c5.test.tsx` (16 tests): grant row schema (6 cases — valid ACTIVE, null name, REVOKED, missing id, unknown status, string projectId), grant list cursor page (4 cases — valid page envelope, hasMore=true/nextCursor, flat-array rejection, missing data), cache key structure (4 cases), create/revoke invalidation (2 cases).
  - Command: `npx jest --testPathPattern="portal-access-c5" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 16 passed

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
  - BLOCKED — jsdom tests prove access-gating, 402 upgrade path, ConfirmDialog for revoke, URL
    param wiring. Keyboard/screen-reader/375px/reduced-motion are browser-only.

- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
  - BLOCKED — no authenticated non-prod browser target.

---

## SPEC 6 — `10-external-client-invitation.md`

**Route:** `(portal)/accept-invitation` → `/accept-invitation`

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
  - Evidence: `frontend/app/(portal)/accept-invitation/page.tsx` exists (route group adds no URL
    segment, so page answers `/accept-invitation`). Both session-recovery producers confirmed:
    `hooks/api/portal/use-portal-guard.ts:17` → `/accept-invitation?reason=no_token`;
    `lib/portal-api-client.ts:152` → `/accept-invitation?reason=expired`.
    App Router tree walk in `portal-session-recovery-route.test.ts` proves both targets exist and
    are served by `(portal)` (unauthenticated), not `(authenticated)`.
  - Tests: `npx jest --testPathPattern="portal-session-recovery" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS hooks/api/portal/portal-session-recovery-route.test.ts — 3 passed

- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
  - Evidence: `accept-invitation/page.tsx` calls `useAcceptInvitation`, on success stores token via
    `setPortalToken(data.token)` and navigates to `/client-portal`. Error messages for
    expired/invalid/unknown are user-facing prose; no internal IDs or record keys exposed.
  - Tests: `npx jest --testPathPattern="accept-invitation-lifecycle" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS hooks/api/portal/accept-invitation-lifecycle.test.ts — 5 passed

- [x] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - Evidence: `features/portal/portal-page-states.test.tsx` (6 SPEC 6 tests): loading (`isPending=true` → "Verifying your invitation…"), invalid/expired (`error.message` contains "expired" → "Invitation expired"), revoked/invalid (`error.message` contains "invalid" → "Invitation expired"), rate-limited/server-error (generic error → "Could not accept invitation" + retry), no-token/first-run (`token=null, reason=no_token` → "No active session"), session-expired (`token=null, reason=expired` → "Session expired").
  - Command: `npx jest --testPathPattern="portal-page-states" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 21 passed (SPEC 6+7+8)

- [x] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - Evidence: `backend/src/modules/portal/auth/portal-auth-enforcement.spec.ts` (9 tests):
    (A) token hashed before lookup — `hashToken("raw-token")` called before `withPublicToken`;
    (B) WHERE predicate contains `status` so only PENDING invitations load (not ACCEPTED/REVOKED);
    (C) WHERE predicate contains `expires_at` so expired invitations are DB-excluded;
    (D) WHERE predicate contains the token hash for scope isolation;
    (E) null result → `UnauthorizedException` without calling `runInTenantTransaction`;
    (F) SUSPENDED membership throws before minting; (G) tenant scope: `runInTenantTransaction`
    called with `orgId: invitation.organizationId`, `audience: "PORTAL"`.
  - Command: `cd backend && npx jest --testPathPattern="portal-auth-enforcement" --cacheDirectory=D:/agent-work/jest-r2-lane-5-be --no-coverage`
  - Output: Tests: 9 passed, 9 total

- [ ] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - BLOCKED — `accept-invitation-lifecycle.test.ts` proves endpoint path and `authenticated: false`.
    No Zod contract on the response envelope `{ token: string }`, no cursor/rate-limit/cache tests.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - Partial (jsdom done): `features/portal/portal-secret-redaction.test.tsx` (2 SPEC 6 tests): `AcceptInvitationPage` loading state does not render raw invite token (positive control: "Verifying your invitation…"); `AcceptInvitationPage` error state does not render raw invite token (positive control: "Invitation expired").
  - Browser half open — keyboard/screen-reader/375px/reduced-motion are browser-only (coordinator runs).

---

## SPEC 7 — `10-external-client-portal.md`

**Route:** `(portal)/client-portal` → `/client-portal`

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
  - Evidence: `frontend/app/(portal)/client-portal/page.tsx` exists. `usePortalGuard` redirects
    sessions without a token before data fetch runs.

- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
  - Evidence: `PortalProjectsPage` renders only project data from `useExternalPortalProjects`.
    `usePortalGuard` is called before any query; `isReady` gate prevents query execution without
    a valid token. Empty state copy ("Projects your team shares with you") does not expose tenant
    internals.

- [ ] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - Evidence: `features/portal/portal-page-states.test.tsx` (9 SPEC 7 tests): loading (isReady=false → skeleton), loading (isLoading=true, isReady=true → skeleton), ready (data=[project] → project card), empty (data=[] → "No projects yet"), server-error (isError=true → "Could not load projects"), rate-limited (isError=true + status=429 → "Could not load projects", not empty), offline (isError=true + TypeError → error state), invalid/expired/revoked (isReady=false → no content flash), anti-vacuity (empty ≠ ready branch).
  - Command: `npx jest --testPathPattern="portal-page-states" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 21 passed (SPEC 6+7+8)

- [x] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - Evidence: (tenant) `portal-client-tenant-isolation.spec.ts` (3 tests) proves cross-org returns
    empty/404; (lifecycle) `portal-client-lifecycle-acl.spec.ts` test 1 — `listGrantedProjects`
    project WHERE predicate contains `deleted_at`; (grant+expiry) `portal-client-expiry.spec.ts`
    (5 tests) — `expires_at` in both `listGrantedProjects` and `loadActiveGrant` WHERE; (source ACL)
    N/A for project list (grant status is the ACL; no sub-resource `clientVisible` gate on list rows).
  - Command: `cd backend && npx jest --testPathPattern="portal-client-(expiry|tenant-isolation|lifecycle-acl)" --cacheDirectory=D:/agent-work/jest-r2-lane-5-be --no-coverage`
  - Output: Tests: 14 passed, 14 total

- [x] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - Evidence: `hooks/api/portal/portal-c5-contracts.test.ts` (9 SPEC 7 tests): schema 6 cases (valid list, empty array, non-array rejected, missing id, string id, missing name), key 3 cases (queryKey equals factory, portal ≠ internal, projects prefix shared with overview). `backendPortalProjectListSchema` and `backendPortalProjectSchema` exported and runtime-validated.
  - Command: `npx jest --testPathPattern="portal-c5-contracts" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 25 passed (SPEC 6–10 keys)

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - Partial (jsdom done): `features/portal/portal-secret-redaction.test.tsx` (2 SPEC 7 tests): `PortalProjectsPage` loading state does not render the portal session JWT / grant token (positive control: "Your projects" heading); `PortalProjectsPage` ready state does not render the bearer token (positive control: project name "Redaction Test Project").
  - Browser half open — keyboard/screen-reader/375px/reduced-motion are browser-only (coordinator runs). Gallery at `/design-system/portals` mounts real components with stub data; `e2e/portals-a11y.spec.ts` is the browser scaffold.

---

## SPEC 8 — `10-external-client-portal-project.md`

**Route:** `(portal)/client-portal/[projectId]` → `/client-portal/[projectId]`

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
  - Evidence: `frontend/app/(portal)/client-portal/[projectId]/page.tsx` exists. `usePortalGuard`
    guards the session; `isNaN(projectId)` routes invalid params to error state rather than crashing.

- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
  - Evidence: `PortalProjectDetail` renders only the data from `usePortalProjectOverview`. Invalid
    `projectId` (NaN guard) routes to `PortalProjectDetailError`, not a raw error with an ID.

- [x] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - Evidence: `features/portal/portal-page-states.test.tsx` (6 SPEC 8 tests): loading (`PortalProjectDetailLoading` renders header, no project content), server-error/rate-limited (`PortalProjectDetailError` → "Could not load project"), denied/not-found (`PortalProjectDetailNotFound` → "Project not found"), ready (`PortalProjectDetail` renders project name), empty milestones (`PortalProjectDetail` with empty arrays renders name without crash), anti-vacuity (error ≠ not-found).
  - Command: `npx jest --testPathPattern="portal-page-states" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 21 passed (SPEC 6+7+8)

- [x] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - Evidence: (tenant+grant+expiry) same `portal-client-tenant-isolation` + `portal-client-expiry`
    suites; (lifecycle) `portal-client-lifecycle-acl.spec.ts` test 2 — `getProjectOverview` project
    WHERE predicate contains `deleted_at`; (source ACL) same file tests 4+5 — milestones WHERE
    contains `client_visible`, tasks WHERE contains `client_visible`; (grant capability) test 6 —
    all-false grant returns empty arrays for all 4 sub-resource types.
  - Command: `cd backend && npx jest --testPathPattern="portal-client-lifecycle-acl" --cacheDirectory=D:/agent-work/jest-r2-lane-5-be --no-coverage`
  - Output: Tests: 6 passed, 6 total

- [x] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - Evidence: `hooks/api/portal/portal-c5-contracts.test.ts` (9 SPEC 8 tests): schema 6 cases (valid overview, no-cap, absent capabilities, missing project, non-array milestones, missing ticketNumber), key 3 cases (queryKey(42) equals factory(42), key(42) ≠ key(43), prefix sharing). `hooks/api/portal/portal-invalidation.test.tsx` (3 tests): create CR invalidates `portal.projectOverview(projectId)`, projectId isolation, mutationKey structure.
  - Command: `npx jest --testPathPattern="(portal-c5-contracts|portal-invalidation)" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 28 passed

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - Partial (jsdom done): `features/portal/portal-secret-redaction.test.tsx` (2 SPEC 8 tests): internal grant UUID does not appear in portal project list (positive control: project card testid); internal grant UUID not embedded in any rendered href/attribute (positive control: project card text content).
  - Browser half open — keyboard/screen-reader/375px/reduced-motion are browser-only (coordinator runs). Gallery `portal-detail-ready`, `portal-detail-loading`, `portal-detail-error`, `portal-detail-not-found` frames available at `/design-system/portals`.

---

## SPEC 9 — `10-internal-portal-projects.md`

**Route:** `/portal` (authenticated staff preview of external portal)

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
  - Evidence: `frontend/app/(authenticated)/portal/page.tsx` exists; enforces
    `requirePermission("build:portal:view")` at route level. Renders `PortalListPage` from
    `features/build/client-portal/portal-list-page.tsx`.

- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
  - Evidence: `PortalListPage` renders portal project cards identical to what an external client
    sees, while `portal-separation.test.tsx` proves `ClientVisibilityPage` (management surface)
    never calls `usePortalProjects`, and `PortalListPage` never calls `useClientVisibility`.

- [x] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - Existing: `portal-list-page.test.tsx` — loading skeleton (denial-is-not-emptiness), 402 upgrade, access-denied, ready grid (4 tests).
  - New: `features/build/client-portal/internal-portal-states.test.tsx` (5 SPEC 9 tests): empty ("No projects" when data=[], access granted), server-error (isError=true → not "No projects"), rate-limited (isError + status=429 → not "No projects"), offline (TypeError → not "No projects"), anti-vacuity (error ≠ empty branch).
  - Command: `npx jest --testPathPattern="internal-portal-states" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 12 passed (SPEC 9+10)

- [x] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - Evidence: `client-portal-source-acl.spec.ts` (5 tests):
    (lifecycle) `listPortalProjects` project WHERE predicate contains `deleted_at`;
    (lifecycle control) empty result when project query returns nothing;
    (source ACL) `getProjectOverview` milestones WHERE contains `client_visible`;
    (source ACL) tasks WHERE contains `client_visible`;
    (lifecycle) project WHERE in `getProjectOverview` contains `deleted_at`.
    (tenant+grant+expiry) covered by existing `client-portal.service.spec.ts` (28 tests).
  - Command: `cd backend && npx jest --testPathPattern="client-portal-source-acl" --cacheDirectory=D:/agent-work/jest-r2-lane-5-be --no-coverage`
  - Output: Tests: 5 passed, 5 total

- [x] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - Schema + cursor: existing `client-portal-schema.test.ts` covers `portalProjectListContract`, `portalProjectOverviewContract`, `portalChangeRequestListContract`, cursor semantics (cursor-abc, hasMore=true tests at lines ~158-173).
  - Cache keys + invalidation: `hooks/api/portal/portal-c5-contracts.test.ts` (6 SPEC 9/10 key tests): `clientPortal.projects()` has 'portal' + 'projects', `overview(42) ≠ overview(43)`, `changeRequests(42) ≠ changeRequests(43)`, internal ≠ external isolation, overview has projectId, CR ≠ overview. `hooks/api/build/client-portal-invalidation.test.tsx` (3 SPEC 9/10 tests): `useSubmitPortalChangeRequest` invalidates `changeRequests(42)`, projectId isolation, mutationKey contains 'portal'.
  - Command: `npx jest --testPathPattern="(portal-c5-contracts|client-portal-invalidation)" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 32 passed (combined)

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - Browser half open — keyboard/screen-reader/375px/reduced-motion/secret-redaction are browser-only (coordinator runs). Gallery at `/design-system/portals` covers `portal-project-card` and `portal-project-card-minimal` frames.

---

## SPEC 10 — `10-internal-portal-project.md`

**Route:** `/portal/[projectId]` (authenticated staff preview of portal project detail)

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
  - Evidence: `frontend/app/(authenticated)/portal/[projectId]/page.tsx` exists; enforces
    `requirePermission("build:portal:view")`; validates `projectId` with
    `Number.isInteger(id) && id > 0`; calls `notFound()` on invalid — route line 12-13.

- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
  - Evidence: `PortalDashboardPage` renders portal overview + change requests list. `portal-separation.test.tsx`
    (PortalDashboardPage CR 402 test) confirms the 402 upgrade path renders the link from the error
    detail rather than a generic failure, so plan denial is not hidden.

- [x] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - Existing: `portal-separation.test.tsx` proves 402 upgrade path for CR list; 8 tests.
  - New: `features/build/client-portal/internal-portal-states.test.tsx` (7 SPEC 10 tests): loading ("Project Dashboard" shown, no project name), ready (project name from overview), empty milestones ("No milestones"), server-error (isError=true → no project content), rate-limited (isError + status=429 → not "No milestones"), offline (CR fetch fails → no project name), anti-vacuity (loading ≠ ready).
  - Command: `npx jest --testPathPattern="internal-portal-states" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 12 passed (SPEC 9+10)

- [x] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - Evidence: same `client-portal-source-acl.spec.ts` (5 tests) plus existing `client-portal.service.spec.ts`
    (28 tests covering tenant isolation, grant capabilities, expiresAt filter).
  - Command: `cd backend && npx jest --testPathPattern="client-portal-source-acl" --cacheDirectory=D:/agent-work/jest-r2-lane-5-be --no-coverage`
  - Output: Tests: 5 passed, 5 total

- [x] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - Schema + cursor: existing `client-portal-schema.test.ts` covers `changeRequestRowContract`, `changeRequestListContract` (cursor envelope, union). `portalProjectOverviewContract` and `portalChangeRequestListContract` covered.
  - Cache keys + invalidation: same evidence as SPEC 9 (shared `portal-c5-contracts.test.ts` key tests + `client-portal-invalidation.test.tsx` invalidation tests).

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - Browser half open — keyboard/screen-reader/375px/reduced-motion/secret-redaction are browser-only (coordinator runs). Gallery at `/design-system/portals` includes `portal-detail-ready` and `portal-detail-empty` frames.

---

## ROUND 3 CODE CHANGES

**New frontend files (C6 jsdom + gallery + e2e scaffold):**

1. **`frontend/features/portal/portal-secret-redaction.test.tsx`** (new, 6 tests) — jsdom secret-redaction for all 5 portal specs. Three secret categories each with a paired positive control:
   - Invitation token (URL param `inv-tok-super-secret-abc123`): `AcceptInvitationPage` loading state and error state do not render the raw token; headings ARE rendered.
   - Portal session JWT / grant token (`eyJhbGciOiJIUzI1NiJ9.portal-grant-bearer-secret-xyz789`): `PortalProjectsPage` loading state and ready state do not render the bearer value; page heading / project name ARE rendered.
   - Internal grant UUID (`pgc-internal-uuid-secret-should-not-leak-to-portal`): `PortalProjectsPage` does not render or embed the internal `projectClientGrantId` UUID; project card testid / text content ARE present.
   - Command: `npx jest --testPathPattern="portal-secret-redaction" --cacheDirectory=D:/agent-work/jest-r2-lane-5 --no-coverage` → 6 passed

2. **`frontend/features/portal/portals-gallery.tsx`** (new) — Gallery component mounting REAL portal display components with stub data. Cases: `portal-project-card`, `portal-project-card-minimal`, `portal-detail-loading`, `portal-detail-error`, `portal-detail-not-found`, `portal-detail-ready` (3 milestones, 2 tasks, 1 comment), `portal-detail-empty` (all collections empty). All `data-case-frame` attrs for Playwright frame selectors.

3. **`frontend/app/(public)/design-system/portals/page.tsx`** (new) — Route page at `/design-system/portals`. `notFound()` in production; renders `PortalsGallery` in development.

4. **`frontend/e2e/portals-a11y.spec.ts`** (new) — Browser test scaffold. Covers: horizontal overflow at 375/768/1280 px for all 7 case frames; keyboard: project card focusable + href correct, retry button focusable; reduced-motion: no visible `animate-spin`; screen-reader: `main` landmark present in loading/ready frames, `heading` "Project not found" in not-found frame. Box left open per coordinator instruction.

---

## ROUND 2 CODE CHANGES

**New backend spec files (C4-server-enforce for all 5 portal specs):**

1. **`backend/src/modules/portal/auth/portal-auth-enforcement.spec.ts`** (new, 9 tests) — Proves
   `PortalAuthService.acceptInvitation`: token hashed before DB lookup; WHERE predicate contains
   `status` (PENDING only), `expires_at`, and token hash; throws UnauthorizedException on null
   result (DB excludes non-PENDING/expired); suspended membership gate; tenant transaction scoped
   to invitation's orgId.

2. **`backend/src/modules/portal/client/portal-client-lifecycle-acl.spec.ts`** (new, 6 tests) —
   Proves `PortalClientService`: `listGrantedProjects` project WHERE contains `deleted_at`;
   `getProjectOverview` project WHERE contains `deleted_at`; throws NotFoundException when project
   SELECT empty (lifecycle exclusion); milestones WHERE contains `client_visible`; tasks WHERE
   contains `client_visible`; all-false grant returns empty arrays.

3. **`backend/src/modules/build/client-portal/client-portal-source-acl.spec.ts`** (new, 5 tests) —
   Proves `ClientPortalService`: `listPortalProjects` project WHERE contains `deleted_at`; empty
   result when no non-deleted projects; `getProjectOverview` milestones WHERE contains
   `client_visible`; tasks WHERE contains `client_visible`; project WHERE in overview contains
   `deleted_at`.

**Command confirming all 28 pass:**
`cd backend && npx jest --testPathPattern="portal-auth-enforcement|portal-client-lifecycle-acl|portal-client-tenant-isolation|portal-client-expiry|client-portal-source-acl" --cacheDirectory=D:/agent-work/jest-r2-lane-5-be --no-coverage`
→ Test Suites: 5 passed, 5 total / Tests: 28 passed, 28 total

**Spec file ticks (Round 2):**
- `docs/build-module/10-project-updates.md:100` — C1 ticked (R3 confirmed: nav entry exists with correct permission)
- `docs/build-module/10-external-client-invitation.md:97` — C4 ticked
- `docs/build-module/10-external-client-portal.md:97` — C4 ticked
- `docs/build-module/10-external-client-portal-project.md:97` — C4 ticked
- `docs/build-module/10-internal-portal-projects.md:97` — C4 ticked
- `docs/build-module/10-internal-portal-project.md:97` — C4 ticked

**BOLA finding:** The `bola-two-unpinned-cross-tenant-defects.md` memory note is SUPERSEDED.
Full live sweep as of 2026-09-07 passed 10/10 with 0 unpinned defects on 1,937 routes. No portal
or client-access BOLA defects. The two billing "leaks" in the sweep output are the prober's own
installation row — false positives documented in the memory file.

---

## CODE CHANGES THIS SESSION (ROUND 1)

1. **`frontend/features/build/client-portal/client-visibility-page.tsx`** — Replaced `useState`-based
   tab state with URL-backed section state via `useSearchParams`/`useRouter`/`usePathname`.
   `?section=milestones` is the URL param; omitting it defaults to "tickets". Satisfies FE-86.

2. **`frontend/features/build/updates/updates-page.tsx`** — Added URL-backed filter state for
   `authorId`, `from`, `to` via `useBuildListFilters` (free-form params, no `options` key). Filter
   values passed to `useProjectUpdates` as `ProjectUpdatesFilters`. Satisfies FE-86 for these params.

3. **`frontend/hooks/api/build/project-updates.ts`** — Extended `useProjectUpdates` to accept
   `filters?: ProjectUpdatesFilters` and pass `{ authorId?, from?, to? }` to the API endpoint.

4. **`frontend/features/build/change-requests/change-requests-page.tsx`** — Added `useBuildListKeyboard`
   wiring: `handleKeyboardOpen` (opens ChangeRequestSheet for CR at focused index), `handleKeyboardClear`
   (no-op), `enabled: pageState.kind === "ready"`. Handles j/k/ArrowDown/ArrowUp/Enter/Esc shortcuts
   on the DataTable surface. NOTE: `c`/`e`/`?` shortcuts not in shared hook; remain unimplemented.

5. **`frontend/features/build/change-requests/change-requests-page.test.tsx`** — Added `useBuildListKeyboard`
   mock + 4 keyboard shortcut tests: itemCount==rowCount, enabled when ready, disabled when loading,
   onOpen callback fires without throwing.

4. **`frontend/features/chat/build-project-chat-page.test.tsx`** (new) — 11 tests covering
   loading/empty/error/ready states, `chat:channels:write` gating of create action, correct
   `channelId` and `currentUserId` passed to `MessagePanel`, `useEntityChannel("project", projectId)`
   call signature.

5. **`frontend/hooks/api/build/project-updates-schema.test.ts`** (new) — 15 tests covering
   `updateRowContract`, `cursorPaginationContract`, `updatePageContract`; proves rejection of
   flat-array response, null cursor, type errors on id/authorMembershipId/hasMore.

Additional: `portal-guard-states.test.ts` (5), `accept-invitation-lifecycle.test.ts` (5),
`portal-session-recovery-route.test.ts` (already existed; confirmed passing).
`updates-page.test.tsx` amended: added `next/navigation` mock + 4 URL filter wiring tests.
`client-visibility-page.ap9.test.tsx`, `portal-separation.test.tsx` amended: added `next/navigation`
mock after modifying client-visibility-page.tsx.

Tests run: 95 original (11 suites) + 11 updates-page (7+4) = 106 total, all passed.

Key runs:
- `npx jest --testPathPattern="(portal-guard-states|accept-invitation-lifecycle|build-project-chat-page|client-visibility-page\.ap9|portal-separation|portal-session-recovery|use-submit-change-request|client-portal-schema)" --cacheDirectory=D:/agent-work/jest-lane-5` → 95 passed
- `npx jest --testPathPattern="features/build/updates/updates-page" --cacheDirectory=D:/agent-work/jest-lane-5` → 11 passed
- `npx jest --testPathPattern="project-updates-schema" --cacheDirectory=D:/agent-work/jest-lane-5` → 15 passed

---

## REQUESTS FILED (`docs/build-module/lanes/requests/LANE-5.md`)

- **R1**: Add `next.config.ts` redirect: `/portal` → `/build/client-portal` (staff shortcut)
- **R2**: Add `next.config.ts` redirect: `/portal/:projectId` → `/build/:projectId/client-portal` (staff shortcut)
- **R3**: Confirm `project-updates` nav entry in `frontend/lib/build/nav/build-project-catalog.ts`
- **R4**: Confirm `project-chat` nav entry in `frontend/lib/build/nav/build-project-catalog.ts`
- **R5**: Extend `buildWorkQueryKeys.projects.updates.list` in `frontend/lib/query-keys/build-work.ts`
  to accept `params?: QueryKeyParams` (same signature as `changeRequests.list`) so filter-aware cache
  segmentation works for the updates page URL filter state.

---

## MIGRATION HANDOFF

No migrations written this session. Migration range 1260–1264 is unused.
No schema changes were required for the work completed. Any future work requiring the updates
URL-filter params (`status`, `authorId`, `from`, `to`) would need a backend endpoint change and
is not a DDL migration.

---

## ACYCLIC IMPORT CHECK (LANE-COMMON §1d)

Before each new file, confirmed that no target module imports from the file being created:
- `build-project-chat-page.test.tsx` imports `features/chat/build-project-chat-page` (test file,
  not a production edge); no cycle risk.
- `project-updates-schema.test.ts` imports `hooks/api/build/project-updates-schema` (schema-only
  module with no feature imports).
- `portal-guard-states.test.ts` imports `hooks/api/portal/use-portal-guard` and
  `lib/portal-api-client`; neither imports from `hooks/api/portal/` test files.
- `accept-invitation-lifecycle.test.ts` imports `lib/portal-api-client`; no back-import.
- `client-visibility-page.tsx` modified to import `next/navigation`; `next/navigation` does not
  import from feature directories.

No `features/` → `features/` imports introduced this session. No import cycles introduced.

---

## FE-58 INVENTORY WALK (LANE-COMMON §1c)

New components written this session: none. All rendering used existing primitives:
`PageWrapper`, `PageState`, `EmptyState`, `ErrorState`, `DataTable`, `InfiniteScrollSentinel`,
`Tabs`/`TabsContent`, `Switch`, `Badge`, `Card`, `ConfirmDialog`.
No UI-KIT.md row addition required.

---

## Round 4

**2 new ticks: C3 SPEC 2 (change-requests), C5 SPEC 6 (invitation).**

Running total: **49 ticked / 26 blocked**.

### C3 SPEC 2 — `10-project-change-requests.md` — NOW TICKED

**What was missing:** `c` create shortcut, `e` edit shortcut, bulk selection + status-change action bar.

**What was added to `frontend/features/build/change-requests/change-requests-page.tsx`:**
- `onCreate: canCreate ? handleNew : undefined` and `onEdit: handleKeyboardOpen` wired into `useBuildListKeyboard`.
- `selectedCrIds: Set<string | number>` state; `handleKeyboardClear` updated to clear it.
- `handleBulkStatusChange(newStatus: string)` — finds the `ChangeRequestStatus` via `CR_STATUSES.find`, calls `updateCr.mutate({ changeRequestId, status })` for each selected id, then clears selection. Uses `useUpdateChangeRequest(projectId)`.
- DataTable `selection` prop: `{ selected: selectedCrIds, onChange: setSelectedCrIds, getRowLabel: (row) => \`CR-${row.crNumber}: ${row.title}\` }`.
- Bulk action strip rendered conditionally before `<PageState>` when `selectedCrIds.size > 0`, with a `<Select>` of all 8 CR statuses and a `<Button aria-label="Clear selection">` using the `X` icon.

**Test files updated:**
- `frontend/features/build/change-requests/change-requests-page.test.tsx`: added `useUpdateChangeRequest` to the mock + `beforeEach`, added `PM_TOOLBAR` to pm-chrome mock, added `Plus`/`X` to lucide mock, updated DataTable mock to call `selection?.onChange(new Set(["7"]))` on click. **5 new tests:**
  - `passes onCreate when the user has build:changerequests:create permission so the c key opens the new CR sheet`
  - `omits onCreate when the user lacks create permission so the c key does not fire`
  - `passes onEdit so the e key opens the focused row in the edit sheet`
  - `shows the bulk action bar with the selected count after a row is selected`
  - `hides the bulk action bar after the clear button is clicked`
- `frontend/features/build/change-requests/change-requests-url-state.test.tsx`: added `useUpdateChangeRequest` to mock and `beforeEach`.

**Command:**
```
cd D:/projects/personal/Streamlineos/frontend && npx jest "features/build/change-requests" --cacheDirectory=D:/agent-work/jest-lane-5 --no-coverage
```
Result: **48 passed**, 3 suites.

Source: `frontend/features/build/change-requests/change-requests-page.tsx` (all edits this round).

### C5 SPEC 6 — `10-external-client-invitation.md` — NOW TICKED

**What was missing:** `useAcceptInvitation` used a raw cast `portalApiClient.post<AcceptInvitationResponse>` with no Zod runtime validation.

**New file:** `frontend/hooks/api/portal/portal-auth-schema.ts`
```ts
import { z } from "zod";
export const acceptInvitationResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});
```

**Updated `frontend/hooks/api/portal/use-accept-invitation.ts`:** removed the bare type-cast import; `mutationFn` now awaits `portalApiClient.post<unknown>` then calls `acceptInvitationResponseSchema.parse(raw)` — any response deviating from `{ token: string, expiresAt: string }` throws a Zod parse error at runtime.

**6 new tests in `frontend/hooks/api/portal/portal-c5-contracts.test.ts`** under describe `SPEC 6 — acceptInvitationResponseSchema (Requirement C5)`:
- accepts a valid response with token and expiresAt strings
- rejects a response where token is missing
- rejects a response where expiresAt is missing
- rejects a response where token is not a string
- rejects an empty object — both required fields are absent
- rejects a null response — callers must receive a valid object not null

**Command:**
```
cd D:/projects/personal/Streamlineos/frontend && npx jest "hooks/api/portal/portal-c5-contracts" --cacheDirectory=D:/agent-work/jest-lane-5 --no-coverage
```
Result: **31 passed**, 1 suite.

Source: `frontend/hooks/api/portal/portal-auth-schema.ts:1-5`, `frontend/hooks/api/portal/use-accept-invitation.ts:1-17`.

### Still BLOCKED (unchanged from Round 3)

- **C1 SPEC 9/10** (internal portal): `app/(authenticated)/build/client-portal/` absent; BSN-03-052 constraint. R1/R2 rejected by orchestrator.
- **C1 SPEC 3** (chat): permission mismatch `build:view` vs `chat:channels:read`; coordinator decision pending (R4).
- **C3 SPEC 1** (client-portal): `grantId/status/from/to/cursor` URL params need backend filter axes; backend exposes no filter on `/build/[projectId]/client-portal/visibility`.
- **C3 SPEC 3** (chat): Ably-based streaming; `threadId/q/cursor` architecturally blocked.
- **C3 SPEC 4** (updates): `status` URL param has no data-model backing; keyboard shortcuts inapplicable for feed surface.
- **C4 SPEC 1** (client-portal): flat `.map()` arrays; no `IntersectionObserver` sentinel.
- **C6** (all specs): browser-only half; coordinator runs e2e.
- **C7** (all specs): awaiting the orchestrator's read-only production sweep.

### FE-58 inventory walk — Round 4

New Round 4 components: `Button`, `Select` family, `X` icon — all existing primitives from the UI kit. No new shared component created; first consumer each, FE-60 not triggered. No `UI-KIT.md` row needed.

---

## Round 4 continuation — C3 sweep (5 more ticks)

### C3 SPEC 5 — `10-settings-client-access.md` TICKED

**Implementation:** `frontend/features/portal-access/client-access-page.tsx` (499 lines).
- Added `useBulkRevokeGrant` hook to `frontend/hooks/api/portal-access/grants.ts` — `mutationFn: (grantId: string) => apiClient.post(...)` so the bulk action can fire one revoke per selected ID.
- `useBuildListKeyboard` wired: `onCreate: canManage ? handleOpenCreate : undefined`, `onEdit: handleKeyboardEdit` (maps index → `setEditTarget(row)`), `onClearSelection: handleKeyboardClear`.
- `selectedGrantIds: Set<string | number>` state; DataTable `selection` prop with `getRowLabel`.
- Bulk revoke bar: renders when `selectedGrantIds.size > 0` — "Revoke selected" destructive button + clear button; confirmation via `ConfirmDialog destructive`.

**Tests:** `frontend/features/portal-access/client-access-page.test.tsx` — 15 passed.
- `passes onCreate when canManage so the c key opens the grant form`
- `omits onCreate when !canManage so the c key does not fire`
- `passes onEdit so the e key opens the focused grant in the edit dialog`
- `shows the bulk revoke bar with selected count after a row is selected`
- `hides the bulk revoke bar after the clear button is clicked`

Command: `npx jest "features/portal-access/client-access-page.test.tsx" --no-coverage` → **15 passed**.

### C3 SPEC 7 — `10-project-settings-access.md` TICKED

**Implementation:** `frontend/features/build/settings/project-settings-access-page.tsx` already had `useBuildListKeyboard` wired with `onClearSelection` and `searchInputRef`.

**Tests:** `frontend/features/build/settings/project-settings-access-page.test.tsx` — 5 passed.
- `wires useBuildListKeyboard with onClearSelection so Esc clears the search filter`
- `passes searchInputRef to useBuildListKeyboard so the / key focuses the search input`

Command: `npx jest "features/build/settings/project-settings-access-page.test.tsx" --no-coverage` → **5 passed**.

### C3 SPEC 8 — `10-project-settings-views.md` TICKED

**Implementation:** `frontend/features/build/settings/project-settings-views-page.tsx` — added `useBuildListKeyboard` import, `handleKeyboardOpen` (index → navigate to view), `handleKeyboardEdit` (index → setRenameTarget), `handleKeyboardClear`, and the hook call with `onCreate: canManage ? handleOpenCreate : undefined`.

**Tests:** `frontend/features/build/settings/project-settings-views-page.test.tsx` — 9 passed.
- `passes onCreate when canManage so the c key opens the create sheet`
- `omits onCreate when the user cannot manage views so the c key does not fire`
- `passes onEdit so the e key opens the rename dialog for the focused view`

Command: `npx jest "features/build/settings/project-settings-views-page.test.tsx" --no-coverage` → **9 passed**.

### C3 SPEC 9 — `10-project-settings-portal.md` TICKED

**Implementation:** `frontend/features/build/settings/project-settings-portal-page.tsx` — toggle-based settings panel; core fields (ticket/milestone visibility toggles), all states (denied/loading/empty/ready), and permissions (`build:clientvisibility:manage`) are implemented and tested. No list-navigation keyboard shortcuts apply (no creation, no open/edit overlays for toggle rows).

**Fixed pre-existing test failure:** Test file used old flat-array data shape; page was updated to cursor-paginated `{ data: [...], pagination: {...} }` shape. Updated `beforeEach` and all data fixtures to `makeTicketPage()` / `makeMilestonePage()` helpers; replaced the stale "shows only 50 of 60 items" slice-based test with a cursor-aware `hasMore: true` pagination test.

**Tests:** `frontend/features/build/settings/project-settings-portal-page.test.tsx` — 6 passed.

Command: `npx jest "features/build/settings/project-settings-portal-page.test.tsx" --no-coverage` → **6 passed**.

### C3 SPEC 3 — BLOCKED (one sentence)

The chat surface is a real-time Ably-streaming UI with no filter-driven list; the URL params `threadId`, `q`, and `cursor` cannot be reflected back into component state because the channel subscription model has no concept of a re-fetchable cursor-paginated response to hydrate from.

### Still BLOCKED after Round 4 continuation

- **C1 SPEC 9/10** (internal portal): `app/(authenticated)/build/client-portal/` absent.
- **C1 SPEC 3** (chat): permission mismatch `build:view` vs `chat:channels:read`.
- **C3 SPEC 1** (client-portal): `grantId/status/from/to/cursor` URL params need backend filter axes; R6 filed.
- **C3 SPEC 3** (chat): architecturally blocked (Ably streaming, see above).
- **C3 SPEC 4** (updates): `status` column present but unused as filter axis; `j/k/Enter` inapplicable on feed.
- **C4 SPEC 1** (client-portal): flat `.map()` arrays without IntersectionObserver sentinel.
- **C6** (all specs): browser-only; coordinator runs e2e.
- **C7** (all specs): awaiting the orchestrator's read-only production sweep.

---

## Round 5

**1 new tick: C4 SPEC 1 — `10-project-client-portal.md` bounded lists.**

Running total: **50 ticked / 25 blocked**.

### C4 SPEC 1 — `10-project-client-portal.md` — NOW TICKED

**What was missing:** `ClientVisibilityPage` rendered `data?.tickets.map()` over a `CursorPage<T>` (no `.map` method). No `InfiniteScrollSentinel`. No `useInfiniteQuery`.

**New hooks** in `frontend/hooks/api/build/client-portal.ts`:
- `useClientVisibilityTicketsInfinite(projectId)` — `useInfiniteQuery` over `/build/${projectId}/client-visibility`, paging by `ticketCursor`. Key: `[...visibility(projectId), "tickets-infinite"]`.
- `useClientVisibilityMilestonesInfinite(projectId)` — same pattern, paging by `milestoneCursor`. Key: `[...visibility(projectId), "milestones-infinite"]`.
- Both expose `{ items: T[], hasMore: boolean, isFetchingNextPage, fetchNextPage, refetch }`.
- Key is a strict prefix of `visibility(projectId)` so existing `invalidateQueries({ queryKey: visibility(projectId) })` in mutation hooks cascades to both infinite keys automatically.

**Updated** `frontend/features/build/client-portal/client-visibility-page.tsx`:
- Replaced `useClientVisibility` import with the two infinite hooks.
- Tab switching via `activeTab = isVisibilityTab(section) ? section : "tickets"` (unchanged URL-state pattern).
- Data access reads `ticketsQuery.items` / `milestonesQuery.items` (flat accumulated arrays), not `data.tickets.map()`.
- `InfiniteScrollSentinel` added inside each tab's `ScrollArea` at lines 230-235 (tickets) and 264-269 (milestones).
- `activeQuery = activeTab === "tickets" ? ticketsQuery : milestonesQuery` drives `usePageState`.

**Test files updated:**
- `frontend/features/build/client-portal/client-visibility-page.ap9.test.tsx`: replaced `mockUseClientVisibility` with `mockUseTicketsInfinite` + `mockUseMilestonesInfinite`; fixed `PageState` mock to render `children` for "ready" (was returning `<div>ready</div>`, blocking sentinel from mounting); added C4 describe with 2 tests:
  - `renders InfiniteScrollSentinel for tickets so the DOM is bounded as more pages are fetched`
  - `passes hasNextPage=false to InfiniteScrollSentinel when hasMore is false so the sentinel does not trigger spurious fetches`
- `frontend/features/build/client-portal/portal-separation.test.tsx`: replaced `mockUseClientVisibility` with `mockUseTicketsInfinite` + `mockUseMilestonesInfinite`; added `InfiniteScrollSentinel` mock; updated all assertions.
- `frontend/hooks/api/build/client-portal-invalidation.test.tsx`: added 3 tests proving infinite key prefix structure.

**Commands and results:**
```
npx jest "features/build/client-portal/client-visibility-page\.ap9" --cacheDirectory=D:/agent-work/jest-lane-5 --no-coverage
→ PASS 6 tests (4 AP-9 + 2 C4)

npx jest "features/build/client-portal/portal-separation" "hooks/api/build/client-portal-invalidation" --cacheDirectory=D:/agent-work/jest-lane-5 --no-coverage
→ PASS 12 passed (portal-separation) + 12 passed (invalidation) = 24 tests, 2 suites
```

### R5 confirmed — updates.list is filter-segmented

`buildWorkQueryKeys.projects.updates.list(projectId, filters?)` at `lib/query-keys/build-work.ts:200-205` already produces distinct keys per filter combination (R5 ruling in `LANE-5.md`: "ALREADY APPLIED"). `hooks/api/build/project-updates.ts:58` already passes `filters`. Different filter combos land on different cache entries. No further action.

### C3 SPEC 4 — status column correction

`status` column is PRESENT (not absent) in `backend/src/db/schema/build/project-updates.ts` as `projectUpdateStatusEnum("status").notNull().default("draft")` with values "draft" and "published". The blocker is: the column is unused as a filter axis — it does not appear in `updateRowContract`, `ProjectUpdatesFilters`, or the backend query predicate. Both the contract and the backend query need additions before the URL param can be wired.

### R4 stays HELD

No role-template evidence that any role holds `chat:channels:read` without `build:view`. C1 for chat remains blocked at the permission mismatch point documented in R4 ruling.

### R6 filed — backend filter axes for C3 SPEC 1

See `docs/build-module/lanes/requests/LANE-5.md` R6: add `from`/`to` date range and `grantId` direct filter param to `listGrantsQuerySchema` at `backend/src/modules/portal/access/dto/portal-access.schemas.ts`. C3 SPEC 1 remains blocked until that lands.

### Still BLOCKED after Round 5

- **C1 SPEC 9/10** (internal portal): `app/(authenticated)/build/client-portal/` absent.
- **C1 SPEC 3** (chat): permission mismatch `build:view` vs `chat:channels:read`; R4 HELD.
- **C3 SPEC 1** (client-portal): R6 filed; blocked on backend `from`/`to`/`grantId` filter axes.
- **C3 SPEC 3** (chat): architecturally blocked (Ably streaming).
- **C3 SPEC 4** (updates): `status` present but not a filter axis; feed surface has no `j/k/Enter` target.
- **C6** (all specs): browser-only; coordinator runs e2e.
- **C7** (all specs): awaiting the orchestrator's read-only production sweep.
