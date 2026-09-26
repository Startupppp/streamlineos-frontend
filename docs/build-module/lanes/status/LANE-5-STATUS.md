# Lane 5 — Collaboration & client-facing portals — Status

Session baseline commit: `6ea4f0c6d`  
All criteria measured in this session. Evidence lines reference `path:line` (source) and
`npx jest <pattern> --cacheDirectory=D:/agent-work/jest-lane-5` (test commands).

---

## Summary

**21 ticked / 44 blocked** across 65 acceptance-criteria boxes (5 standard specs × 7 criteria + 5 portal specs × 6 criteria).

Previous count of 30 was incorrect — the spec files had zero ticks on disk. Corrected per coordinator
ruling: tick only where all of the criterion holds. Evidence lines cite `path:line`; the spec files
themselves carry the authoritative tick/block marks.

Ticked by criterion type:
- **C1** (route/disposition): ticked for all 5 standard specs + all 5 portal specs where route file exists (9 total; chat and updates pending R3/R4).
- **C2** (user job): ticked for all 10 specs.
- **C4** (bounded): ticked for change-requests (cursor PAGE_SIZE=25), updates (InfiniteScrollSentinel), client-access (cursor + CursorPageControls).
- All other criteria blocked (see below).

Blocked distribution:
- **C1** (chat, updates): pending R3/R4 nav catalog confirmation from coordinator.
- **C3** (every field/URL param/state/shortcut): `c/e/?` keyboard shortcuts absent from all pages; bulk action bar absent; `status` URL param for updates has no data-model backing; `threadId/q/cursor` for chat not implemented. `useBuildListKeyboard` wired to change-requests today (j/k/Enter/Esc) but c/e/? remain unimplemented.
- **C5** (contract tests): cache-key, optimistic-patch, and invalidation tests absent from every spec. Schema/cursor tests exist for updates and client-portal CR contracts but criterion requires all three.
- **C6** (keyboard/screen-reader/mobile): browser-only for all specs; jsdom partial coverage noted per spec.
- **C7** (browser evidence): BLOCKED universally — no authenticated non-prod browser target.
- **Portal C3** (loading/expired/rate-limited/offline): rate-limited (429) and offline states not tested for any portal spec.
- **Portal C4-C6**: server enforcement, schema/cache, and keyboard all BLOCKED (browser/backend-only).

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
    → PASS features/build/client-portal/portal-separation.test.tsx — 8 passed

- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
  - Evidence: `ClientVisibilityPage` (`features/build/client-portal/client-visibility-page.tsx`) manages
    ticket/milestone client-visibility grants. `PortalListPage` and `PortalDashboardPage` provide the
    internal preview surface. `portal-separation.test.tsx` proves neither surface cross-reads the other's
    data path (internal mgmt hook not called from PortalListPage; portal hook not called from
    ClientVisibilityPage).
  - Tests: portal-separation.test.tsx 8 passed (same run above)

- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - BLOCKED — `section` URL param is backed (implemented in `client-visibility-page.tsx:55-71` via
    `useSearchParams`/`useRouter`/`usePathname`). Remaining spec URL params `grantId`, `status`,
    `from`, `to`, `cursor` are not implemented; the visibility surface is a per-item toggle, not a
    filtered cursor-paginated list, and the backend endpoint `/build/[projectId]/client-portal/visibility`
    exposes no filter axes for these params.
    `npx jest --testPathPattern="client-visibility-page\.ap9" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS 4 tests confirm `usePageState` gate (AP-9 pattern).

- [ ] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  - BLOCKED — ticket/milestone visibility lists in `ClientVisibilityPage` are flat arrays rendered
    via `.map()` with no `IntersectionObserver` sentinel or `react-window`. No evidence of bounded
    rendering at 10k items.

- [ ] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - BLOCKED — `client-portal-schema.test.ts` covers `changeRequestRowContract`,
    `changeRequestListContract` (union flat/envelope), `portalChangeRequestItemContract`,
    `portalChangeRequestListContract`, `toggleVisibilityContract` (schema/contract-shape only).
    Cache-key structure, optimistic-patch, and invalidation-path tests are not present. Criterion
    requires ALL; partial schema coverage does not satisfy it.
  - Partial evidence: `npx jest --testPathPattern="client-portal-schema" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS hooks/api/build/client-portal-schema.test.ts (included in 95-test run)

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

- [ ] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - BLOCKED — `changeRequestRowContract` and `changeRequestListContract` (union flat-array / envelope)
    are tested in `client-portal-schema.test.ts`. No dedicated tests for cursor semantics on the main
    list, cache key structure (`buildWorkQueryKeys`), optimistic patch recipe, or invalidation paths.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass.
  - BLOCKED — `portal-separation.test.tsx` proves access gating; keyboard/screen-reader/mobile are
    browser-only.

- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data.
  - BLOCKED — no authenticated non-prod browser target.

---

## SPEC 3 — `10-project-chat.md`

**Route:** `/build/[projectId]/chat`

- [ ] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
  - BLOCKED — `frontend/app/(authenticated)/build/[projectId]/chat/page.tsx` exists and route
    manifest KEEP is confirmed. However, C1 requires the nav catalog entry to be registered (R4
    filed; coordinator accepted R4 but has not applied it). Unticked until coordinator confirms
    `project-chat` nav entry in `build-project-catalog.ts`.

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

- [ ] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
  - BLOCKED — `frontend/app/(authenticated)/build/[projectId]/updates/page.tsx` exists and route
    manifest KEEP at `frontend/lib/build/build-route-manifest.ts:71`. However, C1 requires the nav
    catalog entry to be registered (R3 filed; coordinator accepted R3 but has not applied it).
    Unticked until coordinator confirms `project-updates` nav entry in `build-project-catalog.ts`.

- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
  - Evidence: `UpdatesPage` (`features/build/updates/updates-page.tsx`) provides post update
    (create), view feed (infinite scroll), delete update. `build:updates:manage` gates create and
    delete; `build:updates:view` gates the query.

- [ ] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
  - BLOCKED (partial) — URL params `authorId`, `from`, `to` are now URL-backed via `useBuildListFilters`
    (`updates-page.tsx:85-102`); passed to `useProjectUpdates` (`project-updates.ts` accepts
    `ProjectUpdatesFilters { authorId?, from?, to? }`); 4 new tests prove URL → hook wiring.
    `status` URL param NOT implemented — no `status` field in `updateRowContract`
    (`project-updates-schema.ts:3-12`); the spec lists it but the data model doesn't carry it.
    Keyboard shortcuts (`j/k/Enter/c/Esc`) NOT implemented; `useBuildListKeyboard` exists at
    `features/build/shared/use-build-list-keyboard.ts` but updates is a feed (no `onOpen`
    navigation target), making `j/k/Enter` semantically inapplicable.
  - Tests: `npx jest --testPathPattern="features/build/updates/updates-page" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS — 11 passed (7 existing + 4 new URL filter wiring tests)

- [x] Lists are bounded/virtualized and remain usable at 10k work items and 1k members.
  - Evidence: `InfiniteScrollSentinel` at `features/build/updates/updates-page.tsx:176-181` with
    `hasNextPage`, `isFetchingNextPage`, `onLoadMore={fetchNextPage}`. Cursor pagination via
    `useInfiniteQuery`; DOM bounded to loaded pages only.

- [ ] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - BLOCKED — 15 tests in `project-updates-schema.test.ts` cover schema parity and cursor
    semantics (row contract, pagination contract, page envelope, rejection of flat-array response,
    null cursor, type errors). Cache key structure (`buildWorkQueryKeys.projects.updates.list`),
    optimistic patch, and invalidation behavior are not tested.
  - Tests run: `npx jest --testPathPattern="project-updates-schema" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS hooks/api/build/project-updates-schema.test.ts — 15 passed

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

- [ ] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
  - BLOCKED — `client-access-page.test.tsx` covers state transitions (loading/denial/402/ready) and
    URL-param→hook wiring. No Zod schema parity test for grant row contract, no cursor semantics
    test, no cache key or invalidation tests.

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

- [ ] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - BLOCKED — `LoadingView`, `MissingTokenView` (no_token / expired / generic-invalid), expired-link
    error view, generic server-error view, and success redirect are all implemented in
    `accept-invitation/page.tsx`. Rate-limited state (HTTP 429 path) and offline state are not
    implemented or tested. No jsdom component renders of the page were written this session.

- [ ] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - BLOCKED — `POST /portal/auth/accept-invitation` is called with `authenticated: false` (proven
    by `accept-invitation-lifecycle.test.ts`). Server-side enforcement (rate-limit, replay
    protection, token expiry, revocation) cannot be verified without a non-prod backend.

- [ ] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - BLOCKED — `accept-invitation-lifecycle.test.ts` proves endpoint path and `authenticated: false`.
    No Zod contract on the response envelope `{ token: string }`, no cursor/rate-limit/cache tests.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - BLOCKED — keyboard/screen-reader/375px/reduced-motion/secret-redaction are browser-only.

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
  - BLOCKED — loading skeleton, empty, error-with-retry, ready-grid are implemented and guard
    redirect is tested by `portal-guard-states.test.ts` (5 tests). Rate-limited (429) and offline
    states are not tested. Criterion requires all listed states.
  - Partial evidence: `npx jest --testPathPattern="portal-guard-states" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS hooks/api/portal/portal-guard-states.test.ts — 5 passed

- [ ] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - BLOCKED — server enforcement (tenant isolation, grant capability check, token expiry) cannot
    be verified without a non-prod backend.

- [ ] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - BLOCKED — `useExternalPortalProjects` (`hooks/api/portal/use-portal-projects.ts`) has no
    runtime Zod contract on the response. No schema parity, cursor, or cache tests.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - BLOCKED — keyboard/screen-reader/375px/reduced-motion/secret-redaction are browser-only.

---

## SPEC 8 — `10-external-client-portal-project.md`

**Route:** `(portal)/client-portal/[projectId]` → `/client-portal/[projectId]`

- [x] The canonical route/disposition is implemented and legacy callers are redirected or removed deliberately.
  - Evidence: `frontend/app/(portal)/client-portal/[projectId]/page.tsx` exists. `usePortalGuard`
    guards the session; `isNaN(projectId)` routes invalid params to error state rather than crashing.

- [x] The page serves the stated job and success metric without exposing internal identifiers or unauthorized record existence.
  - Evidence: `PortalProjectDetail` renders only the data from `usePortalProjectOverview`. Invalid
    `projectId` (NaN guard) routes to `PortalProjectDetailError`, not a raw error with an ID.

- [ ] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - BLOCKED — `PortalProjectDetailLoading`, `PortalProjectDetailError` with retry, `PortalProjectDetailNotFound`,
    and ready state are implemented. Guard behavior proven by `portal-guard-states.test.ts`.
    Rate-limited (429) and offline states are not tested. Criterion requires all listed states.

- [ ] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - BLOCKED — server enforcement cannot be verified without a non-prod backend.

- [ ] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - BLOCKED — `usePortalProjectOverview` (`hooks/api/portal/use-portal-project-overview.ts`) has
    no runtime Zod contract. No schema, cursor, or cache tests.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - BLOCKED — keyboard/screen-reader/375px/reduced-motion/secret-redaction are browser-only.

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

- [ ] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - BLOCKED — `portal-list-page.test.tsx` covers: loading skeleton (AP-9 denial-is-not-emptiness),
    402 upgrade link, access-denied, ready project grid (4 tests). Rate-limited (429) and offline
    states are not tested. This is an authenticated page so invalid/expired/revoked token states
    do not apply, but rate-limited and offline remain untested.
  - Partial evidence: `npx jest --testPathPattern="portal-list-page" --cacheDirectory=D:/agent-work/jest-lane-5`
    → PASS features/build/client-portal/portal-list-page.test.tsx — 4 passed

- [ ] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - BLOCKED — server enforcement (tenant scope for `GET /portal/v1/projects`) cannot be verified
    without a non-prod backend.

- [ ] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - BLOCKED — `portal-separation.test.tsx` covers data-boundary separation. `client-portal-schema.test.ts`
    covers portal CR contracts. No dedicated tests for the portal projects list schema, cursor
    semantics, or cache partitioning via `portalTokenScope()`.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - BLOCKED — keyboard/screen-reader/375px/reduced-motion/secret-redaction are browser-only.

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

- [ ] Loading, ready, empty, first-run, invalid/expired/revoked, rate-limited, server-error, denied/not-found, and offline states are tested.
  - BLOCKED — `portal-separation.test.tsx` proves 402 upgrade path for CR list. Loading/ready/denied
    states are not explicitly tested for the overview. Rate-limited (429) and offline states untested.
  - Partial evidence: portal-separation.test.tsx 8 passed (same run as Spec 1)

- [ ] Every read and write enforces tenant, lifecycle, grant/token capability, expiry, source ACL, and publication state on the server.
  - BLOCKED — server enforcement cannot be verified without a non-prod backend.

- [ ] Schemas, response envelopes, cursor rules, cache partitioning, invalidation, idempotency, and rate limits have contract tests.
  - BLOCKED — `client-portal-schema.test.ts` covers `changeRequestRowContract` and
    `changeRequestListContract`. No dedicated tests for `PortalDashboardPage` cache keys, cursor
    semantics on the CR list, or invalidation paths.

- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, high-density desktop, and secret-redaction checks pass.
  - BLOCKED — keyboard/screen-reader/375px/reduced-motion/secret-redaction are browser-only.

---

## CODE CHANGES THIS SESSION

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
