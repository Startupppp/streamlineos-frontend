# Audit L5 — Home Area (dashboard · calendar · chat · inbox · mail)

Date: 2026-10-22
Scope: frontend `(authenticated)/{dashboard,calendar,chat,inbox,mail}` + `features/{dashboard,calendar,chat,mail}` + `hooks/api/{calendar,chat-core-read,mail,inbox}` + `lib/prefetch/dashboard`; backend `modules/{dashboard,calendar,chat,mail,notifications}` + `common/{pagination,cache}`

---

## Summary counts

| Category | Issues |
|---|---|
| 1 Duplicate keys / types | 4 |
| 2 Slow-page causes | 7 |
| 3 Caching | 3 |
| 4 Unpaginated lists | 0 |
| 5 Dead / duplicate code | 2 |
| 6 Principle violations | 12 |
| 7 RBAC gaps | 0 |
| 8 Loading skeletons | 2 |
| **Total** | **30** |

---

## Category 1 — Duplicate keys / duplicate types/DTOs

**1-A** `backend/src/common/pagination/pagination.ts:14`
`const PAGE_SIZE_MAX = 100` is a private constant that duplicates the canonical export `PAGE_SIZE_CAP = 100` from `backend/src/common/pagination/list-query.schema.ts:4`. The backend CLAUDE.md anti-pattern table already calls this out. `PAGE_SIZE_MAX` is never imported outside its own file; every callsite that needs the cap should import `PAGE_SIZE_CAP`.
Fix: delete `PAGE_SIZE_MAX`; if `paginateOffset` (the only consumer in that file) uses it, replace with the imported `PAGE_SIZE_CAP`.

**1-B** `frontend/lib/query-keys/platform-hierarchy.ts` — `calendar.events(orgId, userId, start, end, ...)`
The factory embeds `orgId` and `userId` directly as positional elements in the key array. FE-20 requires keys to be tenant-free (scope is enforced by `scopedQueryKeyHashFn`, not by encoding the tenant inside the key). FE-21 explicitly forbids threading `orgId` into an authenticated factory.
Affected sites: `calendar.events`, `calendar.history`, `calendar.sources` factories; consumed in `frontend/hooks/api/calendar.ts` lines ~166, ~240, ~271.

**1-C** `frontend/hooks/api/calendar.ts:166-174`
`queryKey: platformHierarchyQueryKeys.calendar.events(orgId, userId, ...)` — downstream consequence of 1-B; stale across org-switch because the key itself pins the org. Both FE-20 and FE-21 violations.

**1-D** `frontend/hooks/api/calendar.ts:240,271`
Same violation for `calendar.history` and `calendar.sources` query keys.

---

## Category 2 — Slow-page causes

### Frontend — missing server-side prefetch (FE-145)

**2-A** `frontend/app/(authenticated)/calendar/page.tsx`
Server component calls `await requireSession()` then immediately returns `<CalendarWorkspace />`. No `createServerQueryClient`, no `prefetchQuery`, no `HydrationBoundary`. All calendar event and source data fetches begin after the client JS bundle hydrates, adding a full round-trip waterfall on every page load.

**2-B** `frontend/app/(authenticated)/chat/page.tsx`
`export default function Page() { return <ChatHomePage />; }` — plain client render, no server prefetch. Channel list and presence data start fetching client-side only.

**2-C** `frontend/app/(authenticated)/inbox/page.tsx`
Returns `<Suspense><InboxShell /></Suspense>` with no `fallback` prop and no server prefetch. The missing `fallback` means the Suspense boundary renders nothing (blank flash) while the child hydrates. Unified inbox count and item list both fetch client-side.

**2-D** `frontend/app/(authenticated)/mail/page.tsx`
`return <MailShell />` — no server prefetch. Mail folder list and message thread data are fetched client-side.

No equivalent `lib/prefetch/` helper exists for calendar, chat, inbox, or mail; only `lib/prefetch/dashboard.ts` is implemented. Dashboard (which does prefetch) is the outlier; the four Home modules are consistent with each other in not prefetching, but all four violate FE-145.

### Backend — wide selects on read paths (BE-07)

**2-E** `backend/src/modules/calendar/calendar-admin-policy.service.ts:40`
`const [row] = await db.select().from(calendarAdminPolicies).where(...).limit(1)`
Bare `select()` with no column projection. Fetches every column, including any future additions, on a hot read path.

**2-F** `backend/src/modules/calendar/calendar-admin-policy.service.ts:48`
`const [existing] = await tx.select().from(calendarAdminPolicies).where(...).limit(1).for("update")`
Same violation inside a transaction with a row lock.

**2-G** `backend/src/modules/notifications/notification-preference-rules.service.ts:35`
`return this.db.select().from(notificationPreferenceRules).where(...).limit(100)`
Bare `select()`. This runs on every notification-preference lookup (called during notification dispatch).

---

## Category 3 — Caching

**3-A** `backend/src/modules/notifications/notifications-read.service.ts`
`list()` and related query methods hit the database on every request with no `CacheService.cachedForOrg()` wrapper (BE-159). Notification reads are a high-frequency path — every authenticated page load that renders the inbox badge triggers a count query. The service has no caching at all.

**3-B** `backend/src/modules/notifications/unified-inbox.service.ts`
`listUnified()` joins calendar, mail, and notification data on every request with no caching (BE-159). The unified inbox is rendered on every Home page load and is among the heaviest read operations in the module.

**3-C** `frontend/hooks/api/mail-action-cache.ts:278-279`
`invalidateAfterMailSend()` issues:
```ts
invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all })
invalidateQueries({ queryKey: platformCoreQueryKeys.inbox.all })
```
Both are broad prefix invalidations that bust every cached mail query (all folders, all threads, all counts) and every inbox query after a single send/reply action. FE-133 requires mutations to patch the cache from the server response (`setQueryData`) rather than issuing broad invalidations. FE-35 reinforces this: prefer `setQueryData` + narrow invalidation. The send response contains the newly sent message; at minimum the invalidation scope should be narrowed to the sent folder key rather than `mail.all`.

---

## Category 4 — Unpaginated lists

No violations found. All major list endpoints use bounded pagination:
- Chat messages: `safeLimit = Math.min(Math.max(1, limit), 100)` in `chat-message-timeline.service.ts`
- Mail: cursor-based via `useInfiniteQuery` in `mail.ts`
- Notifications / unified inbox: `useInfiniteQuery` with cursor in `inbox.ts`
- Calendar events: range-bounded with source-type batching

---

## Category 5 — Dead / duplicate code

**5-A** `backend/src/common/pagination/pagination.ts:14` — `PAGE_SIZE_MAX`
Redundant private constant (same value as `PAGE_SIZE_CAP`). Already listed in backend CLAUDE.md anti-patterns. No external consumer. Dead internal copy.

**5-B** `frontend/lib/prefetch/` — partial prefetch infrastructure
Only `dashboard.ts` exists. The pattern (`createServerQueryClient` + `prefetchQuery` + `dehydrate`) is established but never replicated for the other four Home modules. This is the structural gap that produces 2-A through 2-D; it also means the prefetch helpers directory is half-built.

---

## Category 6 — Principle violations

### FE-114 — React Compiler enabled; no new useMemo / useCallback / React.memo

**6-A** `frontend/features/dashboard/dashboard-client.tsx:3`
`import { useMemo, useCallback, type ReactNode } from "react"` — both hooks imported.

**6-B** `frontend/features/dashboard/dashboard-client.tsx:96-99`
```ts
const openIssueCount = useMemo(
  () => myIssuesData?.length ?? 0,
  [myIssuesData],
);
```
Trivial inline expression; the Compiler handles this. Replace with `const openIssueCount = myIssuesData?.length ?? 0`.

**6-C** `frontend/features/dashboard/dashboard-client.tsx:114-117`
```ts
const handleRefresh = useCallback(() => {
  void refetch();
  void refetchExecutive();
}, [refetch, refetchExecutive]);
```
Unnecessary with the Compiler. Inline or define without `useCallback`.

**6-D** `frontend/hooks/api/chat-core-read.ts:1-3`
`import { useCallback, useMemo } from "react"` — both hooks imported.

**6-E** `frontend/hooks/api/chat-core-read.ts:139-143`
```ts
const channels = useMemo(
  () => pages?.flatMap((p) => p.channels),
  [pages],
);
```
Single-expression derivation; Compiler optimises this.

**6-F** `frontend/hooks/api/chat-core-read.ts:146-149`
`const loadMore = useCallback(() => { if (hasNextPage) fetchNextPage(); }, [...])` — unnecessary.

**6-G** `frontend/hooks/api/chat-core-read.ts:151-153`
`const handleRefetch = useCallback(() => void refetch(), [refetch])` — unnecessary.

**6-H** `frontend/hooks/api/chat-core-read.ts:309-315`
`useMemo` inside `usePresenceMap` to build a presence lookup map — unnecessary with the Compiler.

**6-I** `frontend/features/mail/mail-accounts-sheet.tsx:3`
`import { memo, useCallback, useState } from "react"` — `memo` (component-level memoisation equivalent to `React.memo`) is imported. FE-114 forbids new uses; existing uses must be removed when the file is touched.

### BE-07 — Explicit projections; no bare select()

**6-J** `backend/src/modules/calendar/calendar-admin-policy.service.ts:40`
`db.select().from(calendarAdminPolicies)` — no column list. (See 2-E for context.)

**6-K** `backend/src/modules/calendar/calendar-admin-policy.service.ts:48`
`tx.select().from(calendarAdminPolicies)` — no column list. (See 2-F.)

**6-L** `backend/src/modules/notifications/notification-preference-rules.service.ts:35`
`this.db.select().from(notificationPreferenceRules)` — no column list. (See 2-G.)

---

## Category 7 — RBAC gaps

No gaps found.

- The `(authenticated)` layout (`app/(authenticated)/layout.tsx:27`) calls `requireSession()` at the top, protecting all child routes without each page needing to repeat it.
- All backend controllers use class-level `@UseGuards(JwtAuthGuard)` plus per-route `@RequirePermission(...)` or `@Universal()` decorators. Dashboard, calendar, chat, mail, and notifications controllers were individually verified.
- The `calendar/page.tsx` redundantly calls `requireSession()` again (harmless but unnecessary given the layout already does it).

---

## Category 8 — Loading skeletons

**8-A** `frontend/app/(authenticated)/calendar/settings/` — missing `loading.tsx`
`page.tsx` exists; no sibling `loading.tsx`. FE-144 requires every `page.tsx` to have its own `loading.tsx` with a matching skeleton. Navigation to `/calendar/settings` shows a raw Suspense boundary with no skeleton.

**8-B** `frontend/app/(authenticated)/chat/invite/[inviteToken]/` — missing `loading.tsx`
`page.tsx` exists (renders `<ChatInviteJoinPage token={inviteToken} />`); no sibling `loading.tsx`. Invite-accept is a cold-entry path where the skeleton gap is visible to new users.

Compliant (skeletons present): `dashboard/loading.tsx`, `calendar/loading.tsx`, `chat/loading.tsx`, `inbox/loading.tsx`, `mail/loading.tsx`.

---

## Fix lanes (DISJOINT file groups)

Each lane touches non-overlapping files and can be executed in parallel.

### Lane A — Query key factory cleanup (Cat 1-B/C/D + Cat 2 partial)
Files: `frontend/lib/query-keys/platform-hierarchy.ts`, `frontend/hooks/api/calendar.ts`
Work: Remove `orgId` and `userId` from `calendar.events`, `calendar.history`, and `calendar.sources` factory signatures. Update all call-sites in `calendar.ts`. Verify that invalidation prefix keys (`eventsAll`, `sourcesAll`, `historyAll`) still match after the key shape change.

### Lane B — Server prefetch for Home modules (Cat 2-A/B/C/D + Cat 5-B)
Files: `frontend/lib/prefetch/calendar.ts` (new), `frontend/lib/prefetch/chat.ts` (new), `frontend/lib/prefetch/inbox.ts` (new), `frontend/lib/prefetch/mail.ts` (new), `frontend/app/(authenticated)/calendar/page.tsx`, `frontend/app/(authenticated)/chat/page.tsx`, `frontend/app/(authenticated)/inbox/page.tsx`, `frontend/app/(authenticated)/mail/page.tsx`
Work: Create prefetch helpers following `lib/prefetch/dashboard.ts` pattern. Update each page to `async`, call the prefetch helper, wrap children in `<HydrationBoundary state={state}>`. Fix the missing `fallback` on inbox `<Suspense>`.

### Lane C — Backend projection fixes (Cat 2-E/F/G + Cat 6-J/K/L)
Files: `backend/src/modules/calendar/calendar-admin-policy.service.ts`, `backend/src/modules/notifications/notification-preference-rules.service.ts`
Work: Replace bare `db.select()` calls with explicit column projections. Use `{ id: ..., ... }` column maps matching what the service actually uses from the returned rows.

### Lane D — Notification caching (Cat 3-A/B)
Files: `backend/src/modules/notifications/notifications-read.service.ts`, `backend/src/modules/notifications/unified-inbox.service.ts`
Work: Wrap hot read methods with `CacheService.cachedForOrg()` (short TTL, e.g. 10–15 s). Add corresponding `invalidateNamespace()` or `invalidateMany()` calls in the write paths (mark-read, dismiss, etc.).

### Lane E — Mail send cache patch (Cat 3-C)
Files: `frontend/hooks/api/mail-action-cache.ts`
Work: In `invalidateAfterMailSend`, replace the broad `mail.all` invalidation with `setQueryData` on the specific sent-folder key using the response body, and narrow the inbox invalidation to the count key rather than `inbox.all`.

### Lane F — React Compiler memoisation cleanup (Cat 6-A/B/C)
Files: `frontend/features/dashboard/dashboard-client.tsx`
Work: Remove `useMemo`/`useCallback` imports and usages at lines 96-99 and 114-117. Inline the expressions.

### Lane G — React Compiler memoisation cleanup (Cat 6-D/E/F/G/H)
Files: `frontend/hooks/api/chat-core-read.ts`
Work: Remove `useMemo`/`useCallback` imports. Inline `channels` derivation, `loadMore`, `handleRefetch`, and the presence map memo.

### Lane H — React.memo removal (Cat 6-I)
Files: `frontend/features/mail/mail-accounts-sheet.tsx`
Work: Remove `memo` import and any `memo(...)` wrapper usage. Remove `useCallback` usages in the same file.

### Lane I — PAGE_SIZE_MAX dedup (Cat 1-A + Cat 5-A)
Files: `backend/src/common/pagination/pagination.ts`
Work: Delete `PAGE_SIZE_MAX`. Import `PAGE_SIZE_CAP` from `list-query.schema.ts` and substitute.

### Lane J — Missing loading.tsx skeletons (Cat 8-A/B)
Files: `frontend/app/(authenticated)/calendar/settings/loading.tsx` (new), `frontend/app/(authenticated)/chat/invite/[inviteToken]/loading.tsx` (new)
Work: Create minimal loading skeletons matching the shape of the respective pages (calendar settings form skeleton; invite page card skeleton).
