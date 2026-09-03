# Ticket 19 — TanStack Query integrity — audit at head

**Head:** `886c19f2b` (`release/code-10-10-v2`), frontend. Working tree has uncommitted edits from
concurrent agents; every line number below was read from the tree as it stands at the time of the audit.
**Prior report:** `reports/19-tanstack-integrity.md` (405 lines). It has no "Status:" line; its headline
states *"Nothing here is ticked."* Four commits have landed since it was written
(`5ede1edaa`, `5582f4309`, `94c7fda2c`, `7469d2789`, `886c19f2b`).

**READ-ONLY audit.** No file in either repo was edited. This report is the only write.

---

## 0. What the prior report established, re-verified at head

Every prior claim I could re-run, I re-ran. All of them still hold:

| Prior claim | My re-measurement at head | Verdict |
|---|---|---|
| `check:query-scope` 0 violations / 5,358 files | exit 0, **5,367 files** | holds |
| `check:query-signal` 1,056 `queryFn` blocks / 426 files, 0 violations | exit 0, **1,056 blocks / 426 files** | holds exactly |
| `check:gated-reads` 720 read sites, 12 permissioned+ungated all held back | exit 0, **720 sites, 12 held back, baseline 0** | holds exactly |
| `check:response-contracts` 84 / 2,665 (3.2%), unparsed 2,581 | exit 0, **84 / 2,665, unparsed 2,581, 1,964 distinct routes, 72 parsed** | holds exactly |
| `check:command-catalog` 1,499 mutation hooks / 229 read hooks, 0 unclassified | exit 0, **1,499 / 229, 225 GATED, 4 OFF-CONTRACT** | holds exactly |
| `check:permission-binding` 438 files, 2,396 gate sites | exit 0, **438 files, 1,707 WRAPPER + 689 ENABLED, 2,384 bindings, 566 controllers / 3,644 routes** | holds |
| `check:contract-drift` reads only 49 timesheets calls | exit 0, **"Timesheets calls extracted: 49"** | holds — still 1.8% of the seam |
| `check:empty-states` green | exit 0, **3,859 files** | holds |
| `check:effect-fetches` green | exit 0, **5,369 files** | holds |
| C096 fix — `project-health-widget.tsx` gates the MOUNT | present: `if (!hasCrmAccess) return null` at line 28, inner `BusinessPulseCard` at line 33 | holds |
| C096 fix — `dashboard-deferred-body.tsx` inert deferral removed | present: `useMyIssues({ enabled: projectsEnabled })` at line 166 | holds |
| C097 fix — `useRecordKbPageVisit` invalidates `pagesRecent()` | present: `hooks/api/kb/pages.ts:398-400` | holds |
| C098 — every optimistic cache patch cancels + rolls back | re-derived by AST over **1,563 mutation sites**: 49 have `onMutate`, **35 patch a cache, 35 have `onError`, 34 cancel in the literal and the 35th (`notifications-inbox.ts:174`) cancels via `beginInboxPatch` → `notifications-inbox-optimistic.ts:45-46`** | holds |
| `useUnreadNotifications` observer collision (left open) | still open: `notification-bell.tsx:259` `enabled: open` vs `alerts-widget.tsx:86` `enabled: !!session?.orgId` | **still open** |

Nothing the prior report closed has regressed. Everything below is new ground.

---

## 1. Corpus I read, with numbers

**Frontend fetch/query surface**

| Thing | Count | How measured |
|---|---|---|
| `hooks/api/**` non-test modules | **489** | `find` |
| `hooks/api/**` test modules | **69** | `find` |
| `useQuery(` / `useQuery<` call sites (non-test, all dirs) | **368 / 376** | grep |
| `useInfiniteQuery` call sites | **34** | TS AST (`scan-infinite.mjs`) |
| `useGatedQuery(` call sites | **237** | grep; gate says 229 hooks / 275 reads |
| `useSuspenseQuery` | **0** | grep |
| `useMutation` + `useAuthorizedMutation` call sites | **1,563** (130 + 1,433) | TS AST (`scan-mutations.mjs`) |
| Seam calls (`apiClient.*` + `serverGet`) | **2,665**, of which 84 contracted | `check:response-contracts` |
| `portalApiClient.*` calls — a **second, unmeasured seam** | **4** | grep |
| Query-key registry | **19 modules + `query-keys.ts`, 3,429 lines, 288 arrow-factory lines** | `wc`, grep |
| SSR prefetch factories | **5** (`access`, `directory`, `hr`×2, `payroll`, `roles`) | `ls lib/prefetch` |
| `HydrationBoundary` mount sites in `app/**` | **6** | grep |
| `QueryClient` instantiations outside tests | **4** (app provider, portal provider, server prefetch client, 2 empty-dehydrate guards) | grep |
| `onMutate` mutation sites / cache-patching ones | **49 / 35** | AST |
| `setQueryData` / `setQueriesData` / `cancelQueries` sites | **122 / 11 / 46** | grep |
| Route-level `error.tsx` boundaries | **196** | `find` |
| Per-panel error boundaries | **1 component, 11 wraps, dashboard only** | grep |

**Commands run (exit codes captured directly, not through a pipe)**

| Command | Exit | Result |
|---|---|---|
| `check:query-scope` | 0 | 5,367 files, 0 violations |
| `check:query-signal` | 0 | 1,056 blocks / 426 files, 0 violations |
| `check:gated-reads` | 0 | 720 sites, 0 counted |
| `check:response-contracts` | 0 | 84/2,665, 18 unresolvable route sites in 15 files |
| `check:command-catalog` | 0 | 1,499 + 229 hooks, 0 unclassified |
| `check:permission-binding` | 0 | 2,384 bindings, 13 held-back reads, 0 unaccounted |
| `check:contract-drift` | 0 | 49 calls (timesheets only) |
| `check:empty-states` | 0 | 3,859 files |
| `check:effect-fetches` | 0 | 5,369 files |
| `jest --maxWorkers=2 --testPathPattern="(lib/query-\|lib/prefetch/\|hooks/api/shared-key-observer-union\|hooks/api/cursor-pagination-contract\|hooks/api/response-contracts)"` | **1** | **26 suites pass, 1 FAILS; 268 pass, 5 fail** — see F2 |
| same, after `jest --clearCache`, `--runInBand` on the failing file | **1** | same 5 failures — not a stale cache |
| `jest --maxWorkers=2 --testPathPattern="(notification\|inbox)"` | 0 | 17 suites, 92 tests, all pass |

**NOT MEASURED** — and what would measure each:
- No browser run, no E2E, no rendered page. C100's *rendered* states are asserted from source reading and
  from the 11 state-named unit tests, not from a screen. Measuring it needs Playwright against a seeded org
  with a role stripped of one panel's permission.
- `npm run build` / `type-check` / full `jest` — forbidden by the laptop budget; run centrally.
- Backend cursor *duplicate/skip* semantics for the 34 infinite queries: I read the shared keyset helper
  (`src/common/pagination/cursor.ts`) and the notifications keyset predicate, but did not run a DB-level
  page-walk under concurrent insert. Measuring it needs a seeded table per route and an inserting writer
  while paging.
- Web-vitals and route-bundle budgets (the two known-red frontend gates) — ticket 29, not re-run here.

---

## 2. Per-criterion assessment

### PRD-C095 — one hierarchical query-key factory per domain, carrying organization, subject, scope, filters, sort, cursor — **partially met**

**Organization / subject dimension: met, but not through the key.** No key literal carries `orgId`. It is
supplied globally instead, by two mechanisms I read end to end:

- `components/providers/query-provider.tsx:50` sets `queryKeyHashFn: scopedQueryKeyHashFn(scope)` where
  `scope = authenticatedScope(orgId, userId)` (`lib/query-scope.ts:28-33`), so every cache entry is
  namespaced by org **and** user.
- `query-provider.tsx:97` remounts the provider on `key={scope}`, destroying the whole client on an org or
  identity change; `lib/api-client.ts:215` additionally calls `clearRegisteredQueryCache()` on a hard 401.
- `lib/prefetch/server-query-client.ts:24-32` computes the *same* scope server-side so dehydrated entries
  land under a hash the client actually computes. The file documents the exact bug this fixes.

That is a sound design and I found no in-scope hole in it. **But it silently drops a property of TanStack's
own hashing — see finding F4:** the stock `hashKey` (`query-core/build/modern/utils.js:85-93`) sorts plain-object
keys before stringifying; `scopedQueryKeyHashFn` is a bare `JSON.stringify([scope, queryKey])` with no
replacer. I proved the divergence in node: `{limit:20,cursor:'abc'}` and `{cursor:'abc',limit:20}` hash
**unequal** under the app's function and **equal** under TanStack's.

**Filters/sort/cursor dimension: met for all 34 infinite queries, verified independently.** I re-derived the
prior report's "proved by construction" claim rather than trusting it: an AST walk over every
`useInfiniteQuery` collected the identifiers reaching each `queryFn` and diffed them against the `queryKey`
text. All 34 came back clean — every residual identifier was a type name, an imported contract, or a
module-level page-size constant (`HISTORY_PAGE_SIZE`, `BOARD_PAGE_SIZE`, `HIERARCHY_PARENT_PAGE_SIZE`).
The two that needed hand-checking were `hooks/api/mail.ts:45` (`searchParams` is rebuilt inside the `queryFn`
from the same `params` already in the key) and `hooks/api/chat-personal-b.ts:205` (`files`/`nextCursor` are
response-type members). **0 filter dimensions outside a key across the infinite-query surface.**

The prior report's 11 low-severity "dimension in the URL but not the key" items on finite queries
(`projectId` on 7 build hooks, `limit` on 3, `params` on 1) are unchanged at head and remain open.

### PRD-C096 — gate with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests — **partially met**

Request suppression is well covered: `check:permission-binding` matches **2,384 gate sites against 3,644
backend routes with 0 unaccounted mismatches**, and `useGatedQuery` (`hooks/api/gated-query.ts:43`) composes
the caller's `enabled` with the permission rather than letting it replace it.

The residual is the **observer-union class**, which the prior report opened and left with "17 unaudited,
co-mounting unverified". I closed the decidable half of that. TanStack enables a key when *any* observer
enables it, so a collision is only a defect when the two observers are co-mounted — and there is one set of
observers that is co-mounted with *everything*: the persistent shell. I scanned every consumer call site of
every project read hook, resolving each identifier through its import (which kills the `useForm`
react-hook-form collision my first pass produced):

> **956 read hooks; 125 hooks observed from ≥2 sites with differing arguments; of those, 3 have an
> observer in the always-mounted shell.** All three hand-checked:
>
> - **`usePendingApprovals` — false positive, same one the prior report named.** Two different hooks share
>   the name. `components/layout/app-sidebar.tsx:11` imports it from `@/hooks/api/dashboard` (key
>   `dashboard.pendingApprovals()`); `features/workflows/approvals/approvals-page.tsx:25` imports it from
>   `@/hooks/api/workflows-approvals` (key `workflows.approvals()`). Different keys; no union. The one real
>   pair (`app-sidebar.tsx:178` vs `features/dashboard/hr-widgets.tsx:314`) carries the *same* module+permission
>   conditions on both sides. Dismissed.
> - **`useEntitlements` — real, F7.** `components/layout/header/product-switcher-menu.tsx:62` writes
>   `useEntitlements(open)`; `features/billing/components/plan-usage-meters.tsx:82` and
>   `features/chat/huddle-panel.tsx:70` observe the same `queryKeys.billing.entitlements()` with the
>   default `enabled = true`. Both are page-level, so both co-mount with the shell. The deferral is inert.
> - **`usePmWorkspaces` — real, but a different shape, F6.** Not a gate union: the chip's route gate sits
>   *below* the hook call.

Plus **F8**, the prior report's own open item, confirmed unchanged at head.

**Required identifiers: no defects found.** I re-walked every query site for an optional identifier
interpolated into a template path with no matching `enabled` guard; the same 3 candidates come back and all
3 branch the URL instead (`build/projects.ts:483`, `hr/hr-automations.ts:67`, `hr/recruitment/interviews.ts:346`).

### PRD-C097 — mutations invalidate or update every affected list/detail/count/dashboard key — **partially met**

Re-derived from scratch over **1,563 mutation sites**: 1,531 resolve to a write verb, **21 carry no
`mutationKey`** (prior report said 22; one was fixed), and **119 write-verb mutations invalidate nothing,
set nothing, have no `onSuccess`/`onSettled`, and take no caller passthrough** (prior report: 121).
Excluding CRM and Inventory leaves **99**. I triaged them by reading each hook and, where the answer was not
obvious from the hook, its callers and the backend handler.

- **67 are AI draft/preview endpoints** whose result the user applies by hand — no server list to refresh.
- **1 real defect: F1** (`useUpdatePublicWhiteboard`). A PATCH that writes the exact row its own sibling
  query reads, with no cache update.
- **1 systemic money-adjacent gap: F10.** Those 67 AI calls are `charge: true` at the gateway
  (`recruitment-candidate-ai.service.ts:207` is one of them) and debit the org's AI wallet.
  `queryKeys.billing.aiCredits()` (`hooks/api/ai-credits.ts:34`) is read at `staleTime: 300_000`. Not one of
  the 67 invalidates it.
- The rest I could dismiss with evidence: `useCreateKbArticleFromTicket` opens the new article via
  `window.open` (a full document load — `ticket-kb-deflection-panel.tsx:45-49`);
  `useCreateHrEmployeeExportJob` / `useCreateExpenseExportJob` return an id the caller immediately polls with
  `useHrEmployeeExportJob` (`hr/import-export.ts:229-232`) and no list exists;
  `useGenerateCandidateCompositeScore` persists **nothing** — I read the service
  (`recruitment-candidate-ai.service.ts:137-252`), it reads, calls the gateway and returns;
  `useGenerateWorkspace` runs inside the org-setup wizard for a brand-new org, whose scope has no warm cache;
  `useAcceptInvitation`/`useDeclineInvitation`/`useVerifyEmail` are pre-session token flows followed by a
  fresh sign-in; the remaining previews, renders, sends and huddle-signalling calls have no cached server
  state at all.

**Residual: 0 unaudited non-AI zero-invalidation writes outside CRM/Inventory.** The prior report's
"50 unaudited" is now closed, at the cost of two findings (F1, F10).

### PRD-C098 — optimistic updates only where concurrency is defined — **met**

Re-derived, not transcribed. Of the 1,563 mutation sites, **49 use `onMutate`; 35 of those patch a cache**.
All 35 have `onError`. 34 call `cancelQueries` in the literal; the 35th (`useMarkAllNotificationsRead`,
`hooks/api/notifications-inbox.ts:174`) cancels through `beginInboxPatch`
(`notifications-inbox-optimistic.ts:45-46`), which cancels both `notifications.lists()` and
`notifications.unreadCount()`.

I checked the one hazard this pattern usually hides — a prefix-scoped patch hitting entries of different
shapes. `queryKeys.notifications.unreadList()` is `[…,"notifications","list","unread"]`, a **prefix child**
of `lists()` = `[…,"notifications","list"]`, so a patch scoped to `lists()` reaches both the
`InfiniteData<Notification[]>` inbox pages and the flat `Notification[]` the bell renders.
`snapshotAndPatchLists` (`hooks/api/notifications-inbox-cache.ts:20-38`) branches on the shape
(`isInfiniteData` / `isNotificationList`) and patches each correctly, snapshotting the raw value for
rollback. That is right, and it is the kind of thing that is usually wrong.

The remaining 14 `onMutate` sites set a UI flag or only cancel — no cache to roll back.

### PRD-C099 — cursor pagination does not duplicate/skip; changing filter/sort resets pagination — **partially met**

**Reset-on-filter-change: met, and I verified it rather than inheriting it** (see C095 above — all 34 sites,
every filter dimension inside the key).

**Page-param mechanics: no offset arithmetic anywhere.** All 34 are cursor-based; the one that derives its
own cursor (`notifications-inbox.ts:103-104`, `lowestNotificationId`) does so because `/notifications` orders
by `id DESC` with `id < cursor` — I confirmed that predicate in the backend
(`notifications-read.service.ts:232-233` `lt(notifications.id, filters.cursor)` with
`orderBy(desc(notifications.id))` and a `limit + 1` sentinel trimmed by `buildIdCursorPage`).

**Latent falsy-cursor class, recorded with its exact precondition.** 11 sites guard the page param with
truthiness (`if (pageParam)` / `pageParam ? … : …`) while the param is a **number**:
`chat-ai-assistant.ts:48,100`, `kb/chat-history.ts:43,83`, `kb/pages.ts:219`, `kb/research-briefs.ts:25`,
`blog.ts:26`, `inbox.ts:33`, `mail.ts:53`, `chat-search.ts:85`, `chat-core-read.ts:169`,
`chat-personal-a.ts:17`. A cursor of `0` is dropped, the request replays page one, and infinite scroll
duplicates forever with no error. Safe **only** while every such cursor is a positive serial id — which it is
today. The one site that does it right is `chat-personal-b.ts:210` (`pageParam !== undefined`).
**Severity P2, latent.**

**Behavioural proof: F2 — the only one in the repo is RED at head.** `hooks/api/cursor-pagination-contract.test.tsx`
fails 5 of its 6 tests. C099 therefore has **zero passing behavioural evidence** at head, and 33 of 34 infinite
queries never had any.

### PRD-C100 — loading, background-refresh, empty, partial-error, full-error, offline, permission-denied, revoked-access — **not met**

Walked state by state, with a number for each:

| State | Mechanism at head | Coverage |
|---|---|---|
| loading | skeletons throughout; `useGatedQuery` documents the v5 `isPending`/`isLoading` trap (`gated-query.ts:16-25`) | no dedicated gate |
| background-refresh | `placeholderData: keepPreviousData` on paged reads | **0 dedicated tests** |
| empty | `check:empty-states` green over 3,859 files | 2 tests |
| **partial-error** | `INLINE_READ_ERROR` (`lib/query-error-policy.ts:46`) — **0 adopters**; `HomeSectionBoundary` — 11 wraps, dashboard only | **F9** |
| full-error | `throwOnError: readErrorReachesBoundary` global default; 196 route `error.tsx` | `lib/query-error-policy.test.ts`, `hooks/api/read-error-reaches-boundary.test.tsx` |
| offline | `ShellOfflineBanner`, notifications offline indicator | 3 tests |
| permission-denied | `Gated<…>` carries the refusal on **275 reads** | **10 non-test files render it — all 10 in CRM**, which is out of scope. **0 in-scope surfaces render the refusal.** |
| **revoked-access** | portal expiry path | **0 tests, and the path is broken — F3** |

The permission-denied number deserves care: `check:gated-reads` prints "1 non-test file(s) read it". My own
grep for `access.denied` / a destructured `access:` from a gated read finds **10**
(`app/(authenticated)/crm/clients/[clientId]/page.tsx:109`, `app/(authenticated)/crm/inbox/page.tsx:62`,
`features/crm/{settings/automations/builder/run-history-drawer:62, settings/automations/builder/automation-builder:64,
deals/detail/deal-competitors-card:93, deals/detail/deal-stakeholders-card:260, shared/customer-360-timeline:73,
autonomy/autonomy-scoreboard:122, timeline/my-tasks-panel:59, issues/issue-detail-sheet:121}`). The gate
under-reports by 9. Either way the conclusion is the same and sharper than the prior report's: **the pattern
exists, it works, and it has been adopted in exactly one module — the one this release excludes.**

Whole-route permission denial is handled server-side (`requirePermission` in the route file,
`enforceRouteAccess` in the layout), so the exposure is a *panel* inside a permitted page whose own read is
gated shut: the user sees an empty panel, not a refusal.

### PRD-C101 — prove types and runtime parsing cannot silently accept a backend contract change — **not met**

The number is unchanged and honest: **84 of 2,665 seam calls carry a contract (3.2%); 2,581 unparsed;
1,964 distinct routes of which 72 are parsed somewhere.** `lib/api-envelope.ts` still holds the single
`payload as T` reached whenever no contract argument is passed. `contracts/openapi.json` still arbitrates the
request half only.

Two things the prior report did not cover, which I pushed into:

1. **The SSR half.** `check:response-contracts` *does* count `serverGet` in its seam and carries a
   self-test (case h) that fails "a contracted route read uncontracted through `serverGet`" — so the
   SSR/client asymmetry the payroll factory documents (`lib/prefetch/payroll.ts:9-19`) is genuinely gated.
   Three of five prefetch factories carry a contract (`directory.ts:20` `workersPageContract`,
   `payroll.ts:24` `payrollRunsPageContract`, `roles.ts:13` `rolesPageContract`). **Two do not** —
   `lib/prefetch/hr.ts:32,42` — and neither does their client half, so the gate cannot see them (**F11**).
   `prefetchAccess` bypasses fetch entirely (`getServerAccessResult()`), so no contract applies.
2. **Hydration key match.** I checked all five prefetched keys against the key their client hook builds.
   All five match: `queryKeys.hr.documents({limit:20})` vs `useHrDocumentList`'s default `{limit: 20}`
   (`hooks/api/hr/documents.ts:28-39`); `queryKeys.hr.assets({page:1,limit:20})` vs `useHrAssetList`'s
   default `{page:1,limit:20}` (`hooks/api/hr/assets.ts:33-39`); the other three likewise. **No dead
   prefetch found.** Note this match is only safe because both halves build the object in the same property
   order — see F4.
3. **A second seam nothing measures: F12.** `portalApiClient` (4 call sites) does its own
   `body.data as T` at `lib/portal-api-client.ts:83`. `check:response-contracts` keys on
   `node.expression.expression.getText() === "apiClient"` and `check:query-signal` on `/\bapiClient\.(\w+)/`,
   both of which miss `portalApiClient`.

### PRD-C137 — key factories, parsing, invalidation, **hydration**, **cancellation**, **retry**, optimistic concurrency, pagination — **partially met**

The prior report covered six of the eight dimensions. The two it did not name at all:

- **Retry: met.** `components/providers/query-provider.tsx:29-39` — one retry maximum, never on a 4xx except
  408/429, never on a contract violation, mutations `retry: 0`. The reasoning is in the file and it is
  correct. **Exception: `features/portal/components/portal-providers.tsx:15` sets a bare `retry: 1`**, so the
  portal retries 403s and 404s (F5).
- **Hydration: partially met.** Six `HydrationBoundary` mounts, five prefetch factories, key-match verified
  above, cross-request leakage impossible (`createServerQueryClient` builds a fresh client per call and
  `serverFetch` is a React `cache` keyed on the caller's own token, `lib/server-fetch.ts:35-43`). The gaps
  are F11 (2 of 5 factories uncontracted) and the order-sensitivity in F4, which is what makes an SSR/client
  key match a property of insertion order rather than of the key.

### PRD-C007 — the umbrella — **not met**

C095 partial, C096 partial, C097 partial, C098 met, C099 partial (and its only behavioural proof red),
C100 not met, C101 not met, C137 partial.

---

## 3. Findings

| # | Sev | File:line | Failure scenario | Proposed fix |
|---|---|---|---|---|
| **F1** | **P1** | `hooks/api/build/whiteboards-public.ts:26-34` | `useUpdatePublicWhiteboard` PATCHes `/public/whiteboard-links/:token` and neither invalidates nor sets `queryKeys.whiteboards.publicLink(token)` — the key its own file's `usePublicWhiteboard` (line 16-24, `staleTime: 30_000`) reads, and which seeds Excalidraw's `initialData` at `features/build/whiteboard/public-board-view.tsx:208`. An editor draws; the 3-second debounce saves scene S1 (`public-board-view.tsx:119`); they navigate away and back inside the SPA within 30 s; the query is still fresh so the canvas is re-seeded with the pre-save S0; their next stroke schedules a save of **S0 + that stroke**, silently discarding S1, and `saveStatus` reads "saved". | In `useUpdatePublicWhiteboard`, take the `queryClient` and add `onSuccess: (res) => qc.setQueryData(queryKeys.whiteboards.publicLink(token), (prev) => prev ? { ...prev, data: sceneData, updatedAt: res.updatedAt } : prev)`. A confirmed self-write, not an optimistic patch — the server returns `updatedAt`, so C098's "await the backend result" branch applies. |
| **F2** | **P1** | `hooks/api/cursor-pagination-contract.test.tsx:81-85` (and 4 more mocks in the file) | The suite fails 5 of 6 tests at head, reproducibly after `jest --clearCache` and under `--runInBand`. Its mock resolves a bare `Notification[]`, but `hooks/api/notifications-inbox.ts:93-101` now unwraps an envelope — `(await apiClient.get<IdCursorPage<Notification>>(…)).data` — which the backend genuinely returns (`notifications-read.service.ts:255` returns `{ data, hasMore, nextCursor }`). So `.data` is `undefined`, `getNextPageParam` throws on `lastPage.length`, the query never reaches `isSuccess`, and every `waitFor` times out. The product code is correct; the test is stale. Effect: the repo test run is red, and **the only behavioural duplicate/skip proof for cursor pagination in the codebase does not pass**, so C099's cited evidence does not exist at head. | Wrap each mock resolution in the envelope: `Promise.resolve({ data: firstPage, hasMore: true, nextCursor: 12 })`. Then add a test that bites — assert the hook still pages correctly when `hasMore` is true but `data` is short — so a future envelope change fails loudly instead of timing out. |
| **F3** | **P1** | `lib/portal-api-client.ts:113`, `hooks/api/portal/use-portal-guard.ts:13` | Both redirect an external portal client to `/portal/accept-invitation`. That route does not exist: `(portal)` is a **route group**, so the accept page (`app/(portal)/accept-invitation/page.tsx`) serves `/accept-invitation`. `/portal/accept-invitation` matches `app/(authenticated)/portal/[projectId]/page.tsx` with `projectId="accept-invitation"`, whose layout calls `requireSession()` (`app/(authenticated)/layout.tsx:25`). There is no middleware and no rewrite (`next.config` has exactly two redirects, neither related). So when a portal JWT expires the client is sent to `/signin` — or, if they happen to hold a StreamlineOS session, to `notFound()` via `parseInt("accept-invitation") === NaN` (`[projectId]/page.tsx:12-13`). The "Session expired — use your invitation link" screen (`accept-invitation/page.tsx:76-92`) is unreachable dead UI, and C100's revoked-access state renders as the wrong application. `components/layout/sidebar/sidebar-nav-items.ts:61,255` records the same wrong prefix, so a third caller believes it too. | Change both redirects to `/accept-invitation` and fix the two `sidebar-nav-items.ts` prefixes. Add one test that asserts the portal 401 path targets a route that exists in `app/(portal)/`. |
| **F4** | P2 | `lib/query-scope.ts:35-39` | `scopedQueryKeyHashFn` returns `JSON.stringify([scope, queryKey])`. TanStack's `hashKey` — the function it replaces — sorts plain-object keys first (`@tanstack/query-core@5.90.12/build/modern/utils.js:85-93`). Verified in node: the app's function hashes `{limit:20,cursor:'abc'}` and `{cursor:'abc',limit:20}` **unequal**; TanStack's hashes them equal. Cache identity is now property-order sensitive: two call sites that build the same logical params in different order get two entries (a duplicate fetch, and a stale one served), and `getQueryData`/`setQueryData` with a differently-ordered object silently miss — which is exactly how an optimistic patch writes nowhere and a rollback restores nothing. **Currently latent:** an AST scan of every `queryKeys.*({…})` object-literal call site — 16 factories, 18 sites — found **0 order collisions**, and the hook-side builders insert properties in a fixed sequence. Nothing pins it: neither `key-factory-contract.test.ts` nor `query-scope-isolation.test.tsx` mentions ordering. | Restore the normalisation: `JSON.stringify([scope, queryKey], (_, v) => isPlainObject(v) ? Object.keys(v).sort().reduce(…) : v)` — or simply `JSON.stringify([scope, hashKey(queryKey)])`, reusing TanStack's exported `hashKey`. Add one test asserting two orderings of the same params hash equal. |
| **F5** | P2 | `features/portal/components/portal-providers.tsx:9-21` | A second `QueryClient` for the `(portal)` route group with **none** of the three tenant guards the authenticated client has: no `queryKeyHashFn` (so no scope prefix), no `registerQueryCacheClearer`, and no `key={scope}` remount. Its keys carry no subject dimension either — `queryKeys.portal.projects()` is a constant (`lib/query-keys/directory-and-ownership.ts:117`) and `projectOverview(projectId)` keys on an org-local integer (line 118-119). `PortalLayout` is not remounted across client-side navigation inside the group, and `app/(portal)/accept-invitation/page.tsx:115-116` swaps `localStorage.portal_jwt` and then `router.replace("/client-portal")` — a soft navigation. If that page is ever reached soft, customer B is served customer A's cached project list for `staleTime: 30_000` and it lingers for the default 10-minute `gcTime`. **I could not construct a live trigger today**: the only entries to `/accept-invitation` are an emailed link (full document load, fresh cache) and F3's broken redirect, and no in-app link points at it. It also sets a bare `retry: 1`, so it retries 403/404 that the main client deliberately does not. | Build the portal client with `createAppQueryClient(portalTokenSubject)` — or at minimum give it `queryKeyHashFn` keyed on a hash of the portal token — and call `queryClient.clear()` in `setPortalToken`. Fixing F3 removes one path to the soft navigation but not the class. |
| **F6** | P2 | `components/layout/header/pm-workspace-context-chip.tsx:29-34` | `usePmWorkspaces({ limit: 20 })` is called at line 29; the route gate `if (!isProductManagementRoute) return null` is at line 34, **below** it. The chip is mounted unconditionally in the shell header (`components/layout/header/global-header.tsx:113`), so every authenticated page load — `/hr`, `/payroll`, `/chat`, `/settings` — issues `GET /build/pm-workspaces?limit=20` for any user holding `build:workspaces:view`, and warms a key nothing on that page reads. The gate renders as a route restriction and suppresses no request. | Pass the condition into the query: `usePmWorkspaces(isProductManagementRoute ? { limit: 20 } : undefined, { enabled: isProductManagementRoute })`, adding an options argument to the hook, or split the component so the outer one returns `null` before the inner one calls the hook — the shape `project-health-widget.tsx` already uses. |
| **F7** | P2 | `components/layout/header/product-switcher-menu.tsx:62` | `useEntitlements(open)` defers the billing entitlements read until the product-switcher menu opens. `hooks/api/entitlements.ts:19` keys it on `queryKeys.billing.entitlements()`, and two page-level observers take the default `enabled = true` on the same key: `features/billing/components/plan-usage-meters.tsx:82` and `features/chat/huddle-panel.tsx:70`. Both are inside the shell, so on the billing page or with a chat huddle panel open the shell's deferral suppresses nothing. Not an authorization hole — the route is `@Universal()` (`src/modules/billing/core/billing.controller.ts:111-112`) — but a deferral that reads as intent and does not defer, on a `staleTime: 900_000` read. | Either drop the `open` argument and accept the read as unconditional, or give the shell its own narrower key (`queryKeys.billing.entitlements("switcher")`) if the deferral is worth keeping. Recording the reason in a comment beats a condition that cannot fire. |
| **F8** | P2 | `features/notifications/notification-bell.tsx:259` | Still open from the prior report, re-confirmed at head. The bell defers `useUnreadNotifications({ enabled: open })` while `features/dashboard/alerts-widget.tsx:86` observes the same `queryKeys.notifications.unreadList()` with `enabled: !!session?.orgId`. The bell is global chrome; on `/dashboard` its deferral is inert and the request fires on load. | Same shape as F7: co-mounted observers must agree, or the deferring one needs its own key. |
| **F9** | P2 | `lib/query-error-policy.ts:46` | `INLINE_READ_ERROR` — the documented escape hatch for "a panel beside five that loaded" — has **zero adopters** outside its own definition (`grep` over `hooks app features components lib`, non-test: 1 hit, and 1 raw `throwOnError: false`). The global default is `throwOnError: readErrorReachesBoundary`, which returns `true` for any errored read holding no data. Per-panel containment exists in exactly one place: `HomeSectionBoundary` (`features/dashboard/home-section-boundary.tsx`), 11 wraps, all in `features/dashboard/dashboard-deferred-body.tsx`. So on any other multi-panel page one 500 from one widget unmounts the whole route into `error.tsx`; and the inline `error` + `refetch` branches those widgets render (e.g. `features/dashboard/alerts-widget.tsx:86-89`) are unreachable code. C100's partial-error state has a mechanism and no adoption. | Pick the multi-panel routes and decide per panel: spread `INLINE_READ_ERROR` where the panel renders its own error card, or wrap it in a section boundary. Then add a gate: a read whose component renders an `ErrorState`/`error` branch must carry one of the two, or the branch is dead. |
| **F10** | P2 | `hooks/api/ai-credits.ts:34` (read) vs the 67 charging mutations | Every AI mutation goes through a gateway with `charge: true` and debits the org's AI credit wallet (`recruitment-candidate-ai.service.ts:207` is one). None of the 67 invalidates `queryKeys.billing.aiCredits()` or `queryKeys.billing.aiCreditTransactions(...)`. `useAiCreditsWallet` runs at `staleTime: 300_000`. A user runs several AI actions and opens `/settings/billing` inside five minutes: the wallet shows the balance from before the spends, with no indication it is stale. The purchase path does invalidate (`ai-credits.ts:100-102`), so the omission is only on the spend side. | Invalidate `queryKeys.billing.aiCredits()` and `aiCreditTransactions` from the shared AI mutation wrapper rather than in 67 places — every one of them already routes through `useAuthorizedMutation`, so one `onSettled` in a small `useAiMutation` wrapper covers the set. |
| **F11** | P2 | `lib/prefetch/hr.ts:32`, `lib/prefetch/hr.ts:42` | `prefetchHrDocuments` and `prefetchHrAssets` call `serverGet<HrDocumentListResponse>` / `serverGet<HrAssetListResponse>` with no contract, typed from hand-written interfaces declared in the same file (lines 9-26) that duplicate — and can drift from — `hooks/api/hr/{documents,assets}.ts`. The dehydrated snapshot is what the page paints from, so a backend shape change reaches the screen through **two** unchecked casts on first paint. `check:response-contracts` cannot flag it: its rule fires only when a route is contracted on the client and uncontracted through `serverGet`, and here neither half is contracted. The other three factories are contracted; this is the odd pair out. | Derive `hrDocumentsPageContract` / `hrAssetsPageContract` from the backend projection, wire both into the client hooks and both prefetch factories, and delete the duplicated interfaces in `lib/prefetch/hr.ts`. |
| **F12** | P2 | `lib/portal-api-client.ts:124-133`, `:83` | The portal client is a second fetch seam that no gate sees. `check:response-contracts` matches only a callee whose object text is exactly `apiClient` and `check:query-signal` only `/\bapiClient\.(\w+)/`, so `portalApiClient` misses both. It does `body.data as T` at line 83 with no contract, and `get(url, params?)` **has no `signal` parameter at all**, so the two portal reads (`use-portal-projects.ts:8`, `use-portal-project-overview.ts:10`) cannot be cancelled — a portal client who navigates away mid-request leaves it in flight. C137 names cancellation; these two are outside every measurement of it. | Add `signal?: AbortSignal` to `portalApiClient.get`/`post` and thread it from the `queryFn` context; widen both gate regexes to `[A-Za-z]*[aA]piClient` (4 new seam calls, so the counts barely move — but they stop being invisible). |
| **F13** | P2 | `hooks/api/gated-query.ts:16-25` (mechanism) | 275 reads carry a `PermissionGate` saying *why* they have no data; **10 non-test files render it, and all 10 are CRM**, which this release excludes. In every in-scope module a panel whose read is gated shut renders as "nothing here" — the exact "a 500 looks like no data" shape, in its permission variant. Route-level denial is caught server-side, so the exposure is panel-level: e.g. a user on a page they may see, with a widget they may not, gets an empty widget rather than a refusal. Also measured: C100 names 8 states and **3 of them — background-refresh, partial-error, revoked-access — have 0 dedicated tests** anywhere in the tree. | Adopt the CRM pattern (`access.denied ? <AccessDenied/> : …`) in the in-scope panels, starting with the dashboard widgets and the HR/payroll sub-panels; then raise `check:gated-reads`' informational line into a floor ("≥N of 275 gated reads render their refusal") so the adoption count cannot silently fall. Note the gate's own count (1) under-reports the true count (10) — fix its detector at the same time. |

---

## 4. What head already gets right

Worth stating plainly, because it is unusual and it is load-bearing:

- **Tenant isolation of the cache is designed, not incidental.** Scope-prefixed hashing, a provider remount
  keyed on identity, a registered clearer fired on a hard 401, and a server prefetch client that computes the
  *same* scope. `lib/query-scope.ts:3-17` documents the exact failure it prevents (a prefetch dehydrated under
  the default hash that typechecks, tests and builds clean while being entirely dead). I found no in-scope
  hole in it.
- **Retry policy is a considered verdict, not a default.** 4xx never retried except 408/429, contract
  violations never retried, mutations never retried.
- **Failed reads do not render as absences.** `readErrorReachesBoundary` sends an errored, dataless read to a
  boundary, with four carefully-argued exclusions (holding data, ABORTED, 401, suspended-membership 403).
  The `/hr/comp-off` "0.0 days earned" story is in the file as the reason.
- **Optimistic updates are disciplined.** 35 cache-patching mutations, all cancel, all snapshot, all roll
  back — including the shape-branching prefix patch in `notifications-inbox-cache.ts` that would be the
  easiest thing in this codebase to get wrong.
- **All 34 infinite queries are keyset, none offset**, and every one carries its filter set in its key.
- **The gates state their own blindness.** `check:gated-reads` prints, unprompted, that it covers only
  `hooks/api/**` and that it "reported 0 while 48 existed". `check:response-contracts` prints "97.8% of the
  seam is still an unchecked cast. This gate freezes that debt; it does not retire it."
  `check:contract-drift` prints its timesheets-only reach. That honesty is why this audit could be short in
  the places it is short.

---

## 5. Blocked on infrastructure

- **C100's rendered states.** Deciding whether a permission-denied panel shows a refusal or an empty card
  needs a browser against a seeded org with a role stripped of one panel's permission. Not runnable under
  this wave's budget. What would measure it: Playwright, two roles, one route per in-scope module,
  screenshot-asserting the panel.
- **C099's duplicate/skip half for the other 33 infinite queries.** Needs a seeded table per route and a
  concurrent inserter while paging; the frontend can only be shown to *forward* the cursor faithfully, which
  is what F2's test does for 1 of 34.
- **Nothing else.** Every other criterion here was measurable with the tools available and was measured, or
  is named above as NOT MEASURED with the method that would close it.
