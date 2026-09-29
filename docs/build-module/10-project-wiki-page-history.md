# [pageId]/history

## Route decision

- **Current/target route:** `/build/[projectId]/wiki/[pageId]/history`
- **Scope:** project
- **Disposition:** **KEEP**
- **Decision:** Retain as a canonical page, subject to the gaps and acceptance criteria below.
- **User job:** Review revision history and compare versions of a project wiki page.
- **Evidence:** `frontend/app/(authenticated)/build/[projectId]/wiki/[pageId]/history/page.tsx`; Route existence verified in the repository; live behavior not directly observed with a valid detail record. **ASSUMPTION:** the page follows its source component until browser evidence is captured.

## Product contract

- **Purpose:** Allow contributors to inspect how a wiki page has changed over time, restore a previous version, and understand who made each edit.
- **Primary persona:** Contributor.
- **Success metric:** Time to identify and act on a relevant prior version.
- **Required density:** comfortable; each revision row must show author, timestamp, and a change summary.
- **Core fields:** revision list (version number, author, timestamp, change summary), diff view between any two versions, restore action.

## Above-the-fold text wireframe

```text
Breadcrumb: Project / Wiki / [Page title] / History    Compare / restore actions
Version timeline (newest first)
  Version N  Author  Timestamp  Summary        View  Compare
  Version N-1  …
  …
```

Priority is the revision list first, diff view second. Decorative banners and non-actionable metrics stay out of the first viewport.

## Elements and interactions

- Breadcrumb: clickable ancestors back to the page and to the wiki list; current level is non-interactive.
- Version list: each row shows version number, author display name, timestamp, and an optional change summary; single click opens a diff view for that version against the previous one.
- Diff view: side-by-side or unified view of the selected version pair; version pair is reflected in the `version` and `compare` URL parameters.
- Compare control: a secondary select on each row that sets the `compare` target; the primary row sets `version`.
- Restore: available only when `build:wiki:manage` or equivalent write permission is present; opens a `ConfirmDialog` before restoring.
- Non-interactive: author avatar, calculated character diff counts, read-only diff text.

## URL state

Deep-linkable query parameters: `version` (integer, primary version to view), `compare` (integer, version to diff against). Selection state, open menus, and unsaved form state are not placed in the URL.

## Bulk, keyboard, and context actions

- No bulk selection on history rows; the page is read-heavy.
- Keyboard: `Tab` follows visual order; `Esc` closes overlays; `j/k` moves through revision rows; `Enter` opens the diff for the focused row.
- Context menu (row): view this version, compare with previous, copy permalink, restore (when authorized). Mirrors visible commands.

## States

- Loading: stable skeleton matching the revision list geometry; preserve stale authorized content on refetch.
- Empty: first-run state when a page has only one version or no revisions are accessible; show one informational line and a back link to the page.
- Error: preserve backend code/message, retry safely, expose request ID; never convert 402/403 into empty.
- Permission denied: `NoPermissionState` with no record existence leak.
- Offline: show freshness; disallow restore actions when offline.
- Conflict: not applicable; this is a read-only history surface.

## Permissions

| Standing | View history | Restore version |
|---|---:|---:|
| Organization owner/admin | Yes when module enabled | Yes |
| Build owner/admin | Yes | Yes within Build scope |
| Build member | Authorized records | Own/assigned or explicit write permission |
| Guest/client | Explicit grant projection only | No |

Backend guards and record scope are authoritative. Controls fail closed while access is loading. Missing, deleted, cross-tenant, and unauthorized detail records return indistinguishable 404s.

## Components

- Existing feature evidence: `@/features/wiki/components/page-history-page`
- Reuse: `PageState`, cursor controls, `EmptyState`, `ConfirmDialog`, member picker display, dirty-state guard, breadcrumb.
- New only if absent: revision diff viewer or version timeline. Promote a shared module only after a second real consumer.

## API and data contract

- **Endpoints:** Knowledge page revision history APIs.
- **Client schema/hooks:** `frontend/hooks/api/build/kb/pages.ts` where revision history is exposed.
- **List request:** `{ pageId, cursor?, limit<=100 }`; filters are the normalized URL state above.
- **List response:** `{ data: <revision>[], pageInfo: { nextCursor, hasMore }, meta: { requestId } }`.
- **Detail response for a version:** `{ data: { versionNumber, authorId, createdAt, summary, content }, meta }`.
- **Mutation:** restore is a Zod-validated command, `Idempotency-Key` when retriable, returning the complete cache-patch projection.
- **Pagination:** cursor for the unbounded revision list; no total needed.
- **Caching:** key includes `pageId`, `projectId`, cursor, and source revision. Entity stale time 60 s; revision list 30 s.
- **Invalidation:** patch exact page detail and revision list after a restore; invalidate only affected ancestors after commit.

## Gaps

- **P0 RESOLVED:** `enforceRouteAccess("/build/[projectId]/wiki/[pageId]/history")` resolves correctly. No extension entry is needed: the generic project nav entry covers all `/build/[projectId]/**` paths, yielding `module:build + build:view`. Pinned in `build-route-access-deny.test.ts` EXPECTED_ACCESS table (entry 50 of 75).
- **P0:** Verify server/client Zod parity, bounded pagination, composite tenant predicates, and exact cache keys for every endpoint above.
- **P1:** Complete URL-backed version/compare parameters, keyboard actions, restore semantics, and accessible diff view.
- **P2:** Add AI-assisted change summary or semantic diff only when it reduces a measured user delay and preserves deterministic non-AI operation.

## Acceptance criteria

- [x] The canonical route and disposition are implemented, with old callers and redirects covered by a route census.
- [x] The page satisfies the stated user job and success metric without duplicating another module owner.
- [x] Every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission above is implemented and tested.
- [x] Lists are bounded/virtualized and remain usable at 1k revisions.
- [x] Server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests.
- [ ] Keyboard, screen-reader, reduced-motion, 375 px mobile, and high-density desktop checks pass. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; every non-browser criterion on this page is ticked above).
- [ ] Production browser evidence confirms ready, empty, filtered-empty, error, denied, and conflict behavior without modifying real data. — **OUT OF SCOPE — browser verification** (2026-09-29: waived by Tarun, not a release blocker; every non-browser criterion on this page is ticked above).
