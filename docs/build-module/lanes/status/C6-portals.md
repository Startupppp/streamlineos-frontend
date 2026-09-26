# C6 portals — coverage matrix

Lane G-5. Spec: `frontend/e2e/portals-a11y.spec.ts`. Gallery: `frontend/features/portal/portals-gallery.tsx`.

Baseline drain 2026-09-26: 20 passed, EXIT=0. All 20 tests were against the state BEFORE this session's changes.

## What changed this session

1. `app/(portal)/accept-invitation/page.tsx` — added `export` to `StatusLayout`, `LoadingView`, `ErrorView`, `MissingTokenView`.
2. `features/portal/portals-gallery.tsx` — replaced the hand-rolled `portal-invite-accept` lookalike (no header, no `<main>`) with the real `InviteLoadingView` wrapped in a `data-invite-token` holder; added `portal-invite-accept-error` (real `ErrorView`) and `portal-invite-accept-missing-token` (real `MissingTokenView`).
3. `e2e/portals-a11y.spec.ts` — updated CASES to include the two new case IDs; added 3 keyboard tests and 3 screen-reader tests covering the invite-accept surface and the project-card link.

The spec now has 29 tests (was 20). None of the existing 20 tests was removed or weakened.

## Per-page × per-check matrix

Legend: ✓ covered | ✗ absent | N/A no element to test | BLOCKED cannot close in this lane

Pages 1–5 carry six C6 checks (includes secret-redaction). Pages 6–10 carry five (no secret-redaction).

### Page 1 — External Client Invitation (`/accept-invitation`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | All CASES iterated incl. 3 invite-accept frames |
| Screen-reader | ✓ | NEW: `<main>` landmark on loading; heading on error |
| Reduced-motion | ✗ UNFIXABLE | `LoadingView` uses `animate-spin`; CCG-3 records that `animate-spin` has no `prefers-reduced-motion` override in `globals.css`. Cannot spec-verify suppression without editing shared CSS (outside lane scope). |
| Keyboard | ✓ | NEW: "Need help?" header link on loading; "Contact support" body link on error and missing-token |
| High-density | ✓ | All CASES iterated at 1920×1080 @2× |
| Secret-redaction | ✓ | Existing 3 tests: token in `data-invite-token` only, not in `innerText`, not in any other attribute |

C6 **cannot close** on page 1 until the `animate-spin` gap in `globals.css` is fixed (CCG-3 FE-108 finding).

### Page 2 — External Client Portal (`/client-portal`)

| Check | Status | Notes |
|---|---|---|
| 375 px mobile | ✓ | `portal-project-card`, `portal-project-card-minimal` iterated |
| Screen-reader | ✓ | NEW: project card renders an accessible `<a>` role with `href=/client-portal/101` |
| Reduced-motion | N/A | No CSS `@keyframes` / `animate-*` on `PortalProjectCard`; CSS hover transitions are out of scope |
| Keyboard | ✓ | Existing: project card is reachable by Tab, activatable by Enter |
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
| 375 px mobile | ✗ | BLOCKED |
| Screen-reader | ✗ | BLOCKED |
| Reduced-motion | ✗ | BLOCKED |
| Keyboard | ✗ | BLOCKED |
| High-density | ✗ | BLOCKED |
| Secret-redaction | ✗ | BLOCKED |

BLOCKED: component is `PortalDashboardPage` in `features/build/client-portal/portal-dashboard-page.tsx`, owned by a sibling agent. Adding `export` to it or mounting it in this gallery requires sibling cooperation. No gallery frame exists.

### Page 5 — Internal Portal Projects (`/portal`)

| Check | Status | Notes |
|---|---|---|
| All 6 checks | ✗ | BLOCKED |

BLOCKED: component is `PortalListPage` in `features/build/client-portal/portal-list-page.tsx`, same sibling-owned directory.

### Page 6 — Change Requests (`/build/[projectId]/change-requests`)

| Check | Status | Notes |
|---|---|---|
| All 5 checks | ✗ | BLOCKED |

BLOCKED: `ChangeRequestsPage` calls `useChangeRequests`, `useCan`, `usePageState` etc. at render time. There are no extractable pure-presentation sub-components (loading skeleton and empty state use shared `DataTableSkeleton` / `EmptyState`, not bespoke exports). Mounting the full component would fire production API calls. Closing C6 here requires either (a) the component extracting a static skeleton view, or (b) a mock `QueryProvider` in the gallery.

### Page 7 — Chat (`/build/[projectId]/chat`)

| Check | Status | Notes |
|---|---|---|
| All 5 checks | ✗ | BLOCKED |

BLOCKED: sibling agent owns `features/build/chat/` (and any chat page component).

### Page 8 — Client Portal internal (`/build/[projectId]/client-portal`)

| Check | Status | Notes |
|---|---|---|
| All 5 checks | ✗ | BLOCKED |

BLOCKED: sibling agent owns `features/build/client-portal/client-visibility-page.tsx`.

### Page 9 — Updates (`/build/[projectId]/updates`)

| Check | Status | Notes |
|---|---|---|
| All 5 checks | ✗ | BLOCKED |

BLOCKED: sibling agent owns `features/build/updates/updates-page.tsx`.

### Page 10 — Client Access (`/build/settings/client-access`)

| Check | Status | Notes |
|---|---|---|
| All 5 checks | ✗ | NOT APPLICABLE |

No implementation exists. Spec disposition is ADD. C6 cannot be assessed until the page is built.

## Summary

| Page | C6 closable? | Blocker |
|---|---|---|
| 1. accept-invitation | No | `animate-spin` gap (CCG-3) in `globals.css` |
| 2. /client-portal | **Yes** | Awaiting fresh drain |
| 3. /client-portal/[projectId] | **Yes** | Awaiting fresh drain |
| 4. /portal/[projectId] | No | Sibling owns `features/build/client-portal/` |
| 5. /portal | No | Same sibling |
| 6. change-requests | No | Hook-coupled component, no extractable static view |
| 7. chat | No | Sibling owns feature source |
| 8. /build/[projectId]/client-portal | No | Sibling owns feature source |
| 9. updates | No | Sibling owns feature source |
| 10. client-access | No | Not yet implemented |

2 of 10 pages are spec-ready; 8 remain blocked (7 by sibling ownership or non-existence, 1 by the shared-CSS animate-spin gap).

Per CCG-3: C6 boxes must not be ticked until a fresh serial Playwright drain confirms all 29 tests pass. This report reflects source changes only.
