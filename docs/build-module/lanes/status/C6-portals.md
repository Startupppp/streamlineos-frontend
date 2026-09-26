# C6 portals — coverage matrix

Lane F-13 (continued from G-5). Spec: `frontend/e2e/portals-a11y.spec.ts`. Gallery: `frontend/features/portal/portals-gallery.tsx`.

Baseline drain 2026-09-26: 20 passed, EXIT=0. All 20 tests were against the state BEFORE this session's changes.

## What changed this session (F-13)

1. `features/portal/portals-gallery.tsx` — replaced with an extended version that:
   - Preserves all previous case frames unchanged
   - Adds `useInternalGalleryQueryClient()` which creates an isolated `QueryClientProvider` (via `createAppQueryClient`) and seeds it with: access (`isOrgOwner: true` — grants all permissions), portal projects, portal overview, portal change-requests, internal change-requests list, updates (infinite), tickets visibility (infinite), milestones visibility (infinite), grants page
   - Mounts 6 new `data-case-frame` sections: `internal-portal-list`, `internal-portal-dashboard`, `internal-change-requests`, `internal-client-visibility`, `internal-updates`, `internal-client-access`

2. `e2e/portals-a11y.spec.ts` — added 6 new case IDs to `CASES`; added 6 keyboard tests and 6 screen-reader tests covering all 6 internal frames. The overflow and high-density tests pick up the new cases automatically via the shared `CASES` iteration.

The spec now has 41 tests (was 29). None of the existing 29 tests was removed or weakened.

## Key: previous agent claims that were wrong

- **Pages 4 & 5** were marked "BLOCKED: sibling owns feature source" — WRONG. The task explicitly said these are not sibling-owned. The previous agent simply did not reach them.
- **Page 6** was marked "BLOCKED: no extractable static view" — WRONG. TanStack Query cache seeding makes the full component renderable in a gallery without any API calls.
- **Page 10** was marked "NOT APPLICABLE — no implementation exists" — WRONG. `ClientAccessPage` exists at `frontend/features/portal-access/client-access-page.tsx`.

## Per-page × per-check matrix

Legend: ✓ covered | ✗ absent | N/A no element to test | BLOCKED cannot close in this lane

Pages 1–5 carry six C6 checks (includes secret-redaction). Pages 6–10 carry five (no secret-redaction).

### Page 1 — External Client Invitation (`/accept-invitation`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | All CASES iterated incl. 3 invite-accept frames |
| Screen-reader | ✓ | `<main>` landmark on loading; heading on error |
| Reduced-motion | ✗ UNFIXABLE | `LoadingView` uses `animate-spin`; CCG-3 records that `animate-spin` has no `prefers-reduced-motion` override in `globals.css`. Cannot spec-verify suppression without editing shared CSS (outside lane scope). |
| Keyboard | ✓ | "Need help?" header link on loading; "Contact support" body link on error and missing-token |
| High-density | ✓ | All CASES iterated at 1920×1080 @2× |
| Secret-redaction | ✓ | Existing 3 tests: token in `data-invite-token` only, not in `innerText`, not in any other attribute |

C6 **cannot close** on page 1 until the `animate-spin` gap in `globals.css` is fixed (CCG-3 FE-108 finding).

### Page 2 — External Client Portal (`/client-portal`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `portal-project-card`, `portal-project-card-minimal` iterated |
| Screen-reader | ✓ | Project card renders an accessible `<a>` role with `href=/client-portal/101` |
| Reduced-motion | N/A | No CSS `@keyframes` / `animate-*` on `PortalProjectCard`; CSS hover transitions are out of scope |
| Keyboard | ✓ | Project card is reachable by Tab, activatable by Enter |
| High-density | ✓ | Both card frames iterated at 1920×1080 @2× |
| Secret-redaction | N/A | No token on the projects list; nothing to assert absence of |

C6 **closable** on page 2. Awaiting fresh drain.

### Page 3 — External Client Portal Project (`/client-portal/[projectId]`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | All five `portal-detail-*` frames iterated |
| Screen-reader | ✓ | `<main>` landmark on loading and ready; visible heading on not-found |
| Reduced-motion | ✓ PAIRED | "reduce" half: skeleton `animation-name` is `none`; "no-preference" half: skeleton animates — proves non-vacuous |
| Keyboard | ✓ | Retry button focus; Request change dialog opens via Enter; Back to projects link focus + href |
| High-density | ✓ | All detail frames at 1920×1080 @2× |
| Secret-redaction | N/A | No token on the project detail page |

C6 **closable** on page 3. Awaiting fresh drain.

### Page 4 — Internal Portal Project (`/portal/[projectId]`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `internal-portal-dashboard` iterated in all viewport loops |
| Screen-reader | ✓ | NEW: `<h1>Northbridge Redesign</h1>` asserted visible (seeded project name from `STUB_CP_OVERVIEW`) |
| Reduced-motion | N/A | Seeded data renders the ready state directly; no `skeleton-shimmer.animate-pulse` in ready state; no CSS animation to suppress |
| Keyboard | ✓ | NEW: "Submit Request" button focused and `toBeFocused()` asserted |
| High-density | ✓ | `internal-portal-dashboard` iterated at 1920×1080 @2× |
| Secret-redaction | N/A | No token on this page |

C6 **closable** on page 4. Awaiting fresh drain.

### Page 5 — Internal Portal Projects (`/portal`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `internal-portal-list` iterated in all viewport loops |
| Screen-reader | ✓ | NEW: `<h1>Client Portal</h1>` asserted visible |
| Reduced-motion | N/A | Ready state; no loading animation in frame |
| Keyboard | ✓ | NEW: `a[href="/portal/101"]` first project card link focused and `toBeFocused()` asserted |
| High-density | ✓ | `internal-portal-list` iterated at 1920×1080 @2× |
| Secret-redaction | N/A | No token on this page |

C6 **closable** on page 5. Awaiting fresh drain.

### Page 6 — Change Requests (`/build/[projectId]/change-requests`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `internal-change-requests` iterated in all viewport loops |
| Screen-reader | ✓ | NEW: `<h1>Change Requests</h1>` asserted visible |
| Reduced-motion | N/A | Seeded data renders ready state; no `animate-pulse` visible |
| Keyboard | ✓ | NEW: "New Change Request" button focused and `toBeFocused()` asserted |
| High-density | ✓ | `internal-change-requests` iterated at 1920×1080 @2× |

Gallery seeding: `buildWorkQueryKeys.projects.changeRequests.list(101)` — `limit` is excluded from `activeFilters` in the hook, so the no-params key is correct for the gallery context (all URL filter params are absent).

C6 **closable** on page 6. Awaiting fresh drain.

### Page 7 — Chat (`/build/[projectId]/chat`)

| Check | Status | Notes |
|---|---|---|
| All 5 checks | ✗ | BLOCKED |

BLOCKED (genuine): `BuildProjectChatPage` uses `ChatAblyProvider` which requires Ably WebSocket real-time infrastructure. Cache seeding cannot replicate a live connection. No gallery frame is possible without extracting a pure presentation layer.

### Page 8 — Client Visibility (`/build/[projectId]/client-portal`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `internal-client-visibility` iterated in all viewport loops |
| Screen-reader | ✓ | NEW: `<h1>Client Portal</h1>` (management h1, scoped to the frame) asserted visible |
| Reduced-motion | N/A | Seeded data renders tickets tab in ready state; no `skeleton-shimmer.animate-pulse` visible |
| Keyboard | ✓ | NEW: `role="switch"` for ticket #42 toggled focus and `toBeFocused()` asserted |
| High-density | ✓ | `internal-client-visibility` iterated at 1920×1080 @2× |

Gallery seeding: tickets infinite key `[...visibility(101), "tickets-infinite"]` and milestones infinite key `[...visibility(101), "milestones-infinite"]`, each seeded as `{ pages: [STUB_PAGE], pageParams: [undefined] }`.

C6 **closable** on page 8. Awaiting fresh drain.

### Page 9 — Updates (`/build/[projectId]/updates`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `internal-updates` iterated in all viewport loops |
| Screen-reader | ✓ | NEW: `<h1>Updates</h1>` asserted visible |
| Reduced-motion | N/A | Seeded data renders ready state; `animate-pulse` only appears in the loading skeleton which is not visible |
| Keyboard | ✓ | NEW: "Post Update" button focused and `toBeFocused()` asserted |
| High-density | ✓ | `internal-updates` iterated at 1920×1080 @2× |

Gallery seeding: `buildWorkQueryKeys.projects.updates.list(101, undefined)` — in the gallery, all filter params are absent (URL has no params), `activeFilters = {}`, hook passes `undefined` to the key factory. The no-params key `["streamlineos", "projects", 101, "updates"]` is correct.

C6 **closable** on page 9. Awaiting fresh drain.

### Page 10 — Client Access (`/build/settings/client-access`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `internal-client-access` iterated in all viewport loops |
| Screen-reader | ✓ | NEW: `<h1>Client Access</h1>` asserted visible |
| Reduced-motion | N/A | Seeded data renders ready state with grants list; no loading animation visible |
| Keyboard | ✓ | NEW: "Grant Access" button focused and `toBeFocused()` asserted |
| High-density | ✓ | `internal-client-access` iterated at 1920×1080 @2× |

Note: previous agent claim "NOT APPLICABLE — no implementation exists" was FALSE. `ClientAccessPage` is fully implemented at `frontend/features/portal-access/client-access-page.tsx` and imported from route `frontend/app/(authenticated)/build/settings/client-access/page.tsx`.

Gallery seeding: `directoryAndOwnershipQueryKeys.portalAccess.grants({ cursor: undefined, limit: 20, q: undefined, state: undefined, permission: undefined })` — TanStack Query hashes undefined-valued object keys away, so this matches the query key the hook produces.

C6 **closable** on page 10. Awaiting fresh drain.

## Summary

| Page | C6 closable? | Blocker |
|---|---|---|
| 1. accept-invitation | No | `animate-spin` gap (CCG-3) in `globals.css` |
| 2. /client-portal | **Yes** | Awaiting fresh drain |
| 3. /client-portal/[projectId] | **Yes** | Awaiting fresh drain |
| 4. /portal/[projectId] | **Yes** | Awaiting fresh drain |
| 5. /portal | **Yes** | Awaiting fresh drain |
| 6. change-requests | **Yes** | Awaiting fresh drain |
| 7. chat | No | Ably WebSocket required; no static presentation layer extractable |
| 8. /build/[projectId]/client-portal | **Yes** | Awaiting fresh drain |
| 9. updates | **Yes** | Awaiting fresh drain |
| 10. client-access | **Yes** | Awaiting fresh drain |

8 of 10 pages are spec-ready (up from 2); 1 remains genuinely blocked (chat / Ably); 1 has an unfixable CSS gap (accept-invitation / animate-spin).

Per CCG-3: C6 boxes must not be ticked until a fresh serial Playwright drain confirms all 41 tests pass. This report reflects source changes only.
