# 19 — TanStack Query and Next.js data-layer integrity

**Headline:** runtime response-contract coverage at the fetch seam went from
**71 / 2,665 seam calls (2.7%, 60 distinct routes)** to **84 / 2,665 (3.2%, 72 distinct routes)** —
**+13 call sites over 12 newly-contracted routes**, all authorization-bearing, five of them also
pagination-bearing. The residual is **2,581 unparsed seam calls across 1,892 uncontracted routes**.

Nothing here is ticked. Every number below was produced by a command I ran and read; where a gate is
cited, its measured scan reach is stated and reproduced by an independent walk.

---

## 0. Commands run, with real exit codes

Exit codes captured directly (`cmd > log 2>&1; RC=$?`), never through a pipe — `${PIPESTATUS[0]}` is
empty in this zsh.

| Command | Exit | Number it produced |
|---|---|---|
| `pnpm check:query-scope` | 0 | 5,358 files scanned, 0 violations |
| `pnpm check:query-signal` | 0 | 1,056 `queryFn` blocks across 426 files, 0 violations |
| `pnpm check:gated-reads` | 0 | 720 read call sites under `hooks/api/**`; 12 permissioned+ungated, all held back; baseline 0 |
| `pnpm check:response-contracts` | 0 | **84 / 2,665 parsed (3.2%)**, unparsed 2,581 vs baseline 2,594 |
| `pnpm check:command-catalog` | 0 | 1,499 mutation hooks, 229 read hooks; 0 unclassified |
| `pnpm check:permission-binding` | 0 | 438 frontend files, 2,396 gate sites, 2,384 bindings checked |
| `pnpm check:route-access-contract` | 0 | 26 nav source files, 204 permission keys |
| `pnpm check:effect-fetches` | 0 | 5,358 files scanned, 0 violations |
| `pnpm check:empty-states` | 0 | 3,854 files scanned, 0 violations |
| `pnpm check:contract-drift` | 0 | **49 calls** — timesheets only (see §1) |
| `pnpm check:cycles` (madge) | 0 | 5,355 files processed, no circular dependency |
| `pnpm type-check` (via `heavy.sh 2`) | 0 | 0 errors, run four times across the change |
| `jest --maxWorkers=2 --testPathPattern="(features/dashboard\|components/dashboard\|hooks/api)"` | 0 | 76 suites, 784 tests passed |
| `jest --maxWorkers=2 --testPathPattern="(lib/query-keys\|lib/query-scope-isolation\|…\|lib/prefetch)"` | 0 | 27 suites, 274 tests passed (baseline, before my changes) |
| `pnpm check:type-assertions` | **1** | **NOT MINE** — see §8 |

---

## 1. Measured scan reach of every gate I rely on

A passing gate is not a satisfied criterion. For each gate below: what it says it scans, the number it
printed, and an independent walk of the same corpus. Two gates are far narrower than their names.

| Gate | Its own reported reach | My independent walk | Verdict |
|---|---|---|---|
| `check:query-scope` | 5,358 files | `find . -name '*.ts*'` minus `node_modules`/`.next` = **5,371**; minus `feedbucket-widget` = **5,353** | reproduces (±5 for scripts) |
| `check:query-signal` | 1,056 `queryFn` blocks / 426 files | `grep -c "queryFn:"` over hooks app features components lib = **1,056**; files = 406 non-test + 16 test = **422** | reproduces exactly on sites |
| `check:gated-reads` | 720 read sites | `grep useQuery(/useQuery</useInfiniteQuery/useSuspenseQuery` under `hooks/api` non-test = **734** | reproduces (14 = imports/type refs) |
| `check:permission-binding` | 438 files, 2,396 gate sites | files matching its own prefilter regex over `hooks features components app lib`, non-test = **438** | **reproduces exactly** |
| `check:response-contracts` | 2,665 seam calls | its own `--json` re-walk = 2,665; 34 `useInfiniteQuery` sites all found | reproduces |
| `check:command-catalog` | 229 read hooks | `grep -c "useGatedQuery("` non-test = **237** | reproduces (8 = re-export/wrapper lines) |

### Gates that scan far less than they appear to — both are findings

**`check:contract-drift` reads 49 calls out of 2,665 — 1.8% of the fetch seam.**
Its `HOOK_DIRS` are literally `hooks/api/timesheets` and `hooks/api/timesheets-core`
(`scripts/check-contract-drift.mjs:18-21`). The gate is honest in its output line ("Timesheets calls
extracted: 49") but its *name* reads repo-wide, and a reader quoting "contract-drift is green" is
quoting a timesheets-only result. Worse for this ticket: it compares the **request** half against
`contracts/openapi.json`, and that artifact carries a 2xx response schema on **1 of 3,642 operations**
(independently re-measured, §2). So `check:contract-drift` can never catch a response drift, which is
the defect class C101 exists for.

**`check:gated-reads` covers `hooks/api` only — `SCAN_DIRS = ["hooks/api"]`
(`scripts/check-gated-reads.mjs:113`).** It says so itself, at length, and records that it once
"reported 0 while 48 existed". Both dashboard defects in §6 live in `features/**` and
`components/**`, so this gate could not see either one.

**No gate in `scripts/` reasons about more than one observer on a query key.** `grep -c observer
scripts/*.mjs` matches only the two Web-Vitals scripts (a different sense of the word).
`check:permission-binding` does walk `features/`/`app/`/`components/`, but it emits one row per call
site (WRAPPER / ENABLED) and holds no notion of a key observed twice — so the least-restrictive-observer
defect class in §6 is invisible to the whole harness. That is a harness gap, not a one-off.

---

## 2. PRD-C101 — proving types and runtime parsing cannot silently accept a contract change

**This is the load-bearing criterion and a typecheck cannot satisfy it.** `apiClient.get<T>(...)` is a
cast: `lib/api-envelope.ts:100` is the single `payload as T` in the module, reached whenever no
contract argument is passed. Both repos typecheck clean over it.

**Independently re-measured, not transcribed:** `contracts/openapi.json` holds **3,642 operations** and
exactly **1** carries a 2xx response content schema (`GET /calendar/admin/settings`). The response half
of the contract is unarbitrated project-wide.

### Coverage, before and after

| | Before | After | Δ |
|---|---|---|---|
| Seam calls carrying a contract | 71 | **84** | +13 |
| Percentage of the 2,665-call seam | 2.7% | **3.2%** | +0.5pp |
| Distinct routes parsed somewhere | 60 | **72** | +12 |
| Unparsed seam calls | 2,594 | **2,581** | −13 |

**Residual: 2,581 unparsed seam calls, 1,892 routes with no contract anywhere.** That is the honest
number. This ticket moved 12 routes; it did not retire the debt.

### The 12 routes contracted, and why these 12

Selected on the brief's rule — authorization-bearing first, pagination-bearing next. **Every contract
was derived from the backend PROJECTION, not from the frontend type**, because a contract copied from
the client's own declaration encodes the drift instead of catching it.

| Route | Why it is high value | Backend source read |
|---|---|---|
| `GET /module-access/:mk/groups` | role groups + their permission grants + the **optimistic-concurrency `version`** the PUT sends back | `module-access-group-crud.service.ts` `hydrateGroups()` |
| `GET /module-access/:mk/members` | who holds module access; id-cursor page | `module-access-roster.service.ts` `listMembers()` |
| `GET /module-access/:mk/member-candidates` | who *may* be granted access; id-cursor page | `listMemberCandidates()` |
| `GET /module-access/:mk/groups/:id/members` | group roster | `module-access-group-members.service.ts` |
| `GET /module-access/:mk/members/:id/grants` | per-person permission grants — pure authorization | `user-permission-grants.service.ts` `listGrants()` |
| `GET /module-access/:mk/audit-log` | authorization evidence; `{data,pagination}` cursor page | `module-access.service.ts` `getAuditLog()` |
| `GET /module-access/:mk/ownership` | module owner identity + pending transfer | `module-access-ownership.service.ts` `fetchOwnership()` |
| `GET /principal-groups` | group→role→permission join; cursor page | `rbac/principal-groups.service.ts` `list()` |
| `GET /principal-groups/:id/members` | group roster | same file, members read |
| `GET /principal-groups/:id/roles` | includes **`rank`**, the assignability ceiling `assertMayAssignRole` compares against | `getAssignedRoles()` |
| `GET /me/api-tokens` | a personal API token's **`scopes`** ARE its credential; cursor page | `api-tokens/user/user-api-tokens.service.ts` `list()` |
| `POST /me/api-tokens` + `GET /me/api-tokens/permissions` | the one-time raw token; the grantable scope catalog | `personal-token-scope-policy.ts` |

Three places the frontend types were **wrong** and the contracts are not: `avatarUrl` is always present
and nullable (`users.image`), never absent; `email` is coalesced to `""` server-side so it is never
null; the module audit row's `id` is a `serial`, i.e. always a number, while the client type says
`string | number`.

### The proof, in the established pattern

`hooks/api/response-contracts-module-access.test.ts` — **21 tests, exit 0**. Two halves, and the second
is the point, matching `response-contracts-chat.test.ts` and the backend's
`chat-huddle-wire-shape.spec.ts`:

- **ACCEPTS** (8): the real projection, an empty grant array, a null avatar, both page envelopes, a
  widening deploy that adds a field.
- **BITES** (13): a group that lost `version`; grants re-nested under `permission` (the exact
  `members[].membership.user` shape that shipped); a scope outside the four-value enum; a member whose
  identity moved into a nested `user`; `membershipId` retyped to string; `avatarUrl` gone rather than
  null; **the two page envelopes swapped**; a roster cursor retyped to string (which
  `typeof pageParam === "number"` silently drops, replaying page one forever); a `pagination` block
  missing `hasMore`; an audit row with no actor; a `createdAt` that arrived as a Date-shaped object; an
  ownership row with no `ownerId`; a flattened pending transfer.

A contract copied from `module-access/types.ts` passes all eight of the first half and fails the second
— that is the difference between satisfiable and true.

**Not `.strict()`, deliberately** — an added backend field is a compatible deploy; a removed, renamed
or retyped one is what these reject. That matches `lib/api-envelope.ts`'s documented policy, and a
violation throws as an `ApiContractError` (an `ApiError`), so it reaches the screen through
`getErrorMessage` as an error state rather than as a silent pass.

**Structural note:** `principal-groups-schema.ts` and `user-api-tokens-schema.ts` now own their types
via `z.infer` and the hook files re-export them. That was required, not stylistic: having the schema
import types from the hook that imports the schema is a cycle, and `madge --circular` is at zero
(re-verified, exit 0, 5,355 files).

---

## 3. PRD-C095 — one hierarchical query-key factory per domain

**Reach:** 21 registry files under `lib/query-keys/`, 3,429 lines, >200 factories parsed by
`lib/query-keys/key-factory-contract.test.ts`, which additionally walks the whole tree for partial
factory calls. Suite green (exit 0) — it asserts a shorter call is always an invalidation **prefix** of
a longer one, that omitting a trailing optional argument never leaves a literal `undefined` in a key,
and that no call site under-supplies a factory in a way that makes `invalidateQueries` match nothing.

**My independent check — do the response-varying dimensions reach the key?** I wrote an AST walk over
every `useQuery` / `useInfiniteQuery` / `useSuspenseQuery` / `useGatedQuery` site and reported each
identifier that is a **parameter of the enclosing `use*` hook**, reaches the `queryFn`, and is absent
from the `queryKey`.

- 22 sites flagged. **All 22 triaged by hand; 0 are cache-correctness defects.** The overwhelming
  majority are derived locals that *are* in the key (`y` from `year`, `term` from `search`,
  `normalizedSearch` from `search`, `queryParams` from `params`, `wanted` from `userIds`).
- Genuinely absent-but-harmless dimensions, recorded rather than fixed:
  - `hooks/api/build/ticket-queries.ts:118`, `:162`, `build/ticket-activity.ts:36`,
    `build/ticket-sub-resources.ts:170`, `build/watchers.ts:18`, `build/whiteboards.ts:91`,
    `git-integration.ts:111` — `projectId` is in the URL path but not the key. Safe only because
    ticket ids are globally unique; it is a latent aliasing risk if that ever stops holding. **Severity:
    low, open.**
  - `hooks/api/calendar.ts:30` (`limit`), `hooks/api/hr/hr-webhooks.ts:49` (`limit`),
    `hooks/api/leads.ts:69` (`limit`), `hooks/api/accounting/banking.ts:392` (`params`) — a row-count
    or filter dimension outside the key, so two callers with different values share one entry.
    **Severity: low, open** (leads is CRM, out of scope).

**Cursor pagination keys, all 34 sites:** every one carries its filter set in the key
(`allWorkInfinite({...filters})`, `timesheets.approvals(filters)`, `notifications.list({...params})`).
The five machine-flagged "drift" candidates among them were all imported helpers or type members —
zero real ones.

---

## 4. PRD-C096 — gating with effective access and required identifiers

**Request suppression.** `check:permission-binding` is the gate that actually bites here: **438 files,
1,707 WRAPPER + 689 ENABLED gate sites, 2,384 bindings matched against the backend controllers** (566
controllers, 3,642 routes, 0 unresolved handlers), 0 unaccounted mismatches. That reach reproduces
exactly under an independent walk. `check:gated-reads` is *not* evidence at repo scale — `hooks/api`
only, 720 sites, and it prints its own blindness.

**Required identifiers — my own walk.** I scanned every query site for an identifier that is
**declared optional** and is interpolated into a template-literal path, with no matching guard in
`enabled`. **3 candidates over 771 query sites; all 3 are false positives:**
`build/projects.ts:483` branches `projectId ? …/${projectId}/labels : /build/labels`;
`hr/hr-automations.ts:67` branches `ruleId ? … : …`; `hr/recruitment/interviews.ts:346` computes
`const enabled = interviewerIds.length > 0 && !!date` and passes it. **0 malformed-request defects
found.**

**The defect class the harness cannot see** — two observers on one key, only one gated. See §6.

---

## 5. PRD-C097 / C098 — invalidation, and optimistic updates only where concurrency is defined

**Reach:** an AST walk of every `useMutation` / `useAuthorizedMutation` call site across
`hooks features app components lib`, non-test: **1,563 sites**.

### C098 — optimistic behaviour

**49 sites use `onMutate`.** Machine-flagged: 13 without `cancelQueries` in the literal, 5 without
`onError`. **All 18 triaged by hand; 0 real defects.**

- `hooks/api/mail.ts:178` — `cancelQueries` is inside `applyMailActionToCaches`
  (`hooks/api/mail-action-cache.ts:31-32`), which also snapshots and is restored by `restoreMailCaches`.
- `hooks/api/notifications-inbox.ts` ×7 — same shape; `beginInboxPatch` /
  `useNotificationRowPatch` cancel both keys (`notifications-inbox-optimistic.ts:45,46,138`).
- `hooks/api/organization.ts` ×4 and `hooks/common/auth-hooks.ts:139` — `onMutate` sets a UI flag
  (`setAutoSignOutSuppressed`) and clears it in `onSettled`. **No cache is patched, so there is nothing
  to roll back.** Not optimistic updates.
- `hooks/api/crm/deals.ts:353` — `onMutate` only cancels; no patch, no rollback needed.

So C098 holds as written: every optimistic **cache** patch in the repo cancels first, snapshots into a
typed context, restores in `onError` and invalidates in `onSettled`.

### C097 — invalidation coverage

- **22 mutation sites carry no `mutationKey`** (CLAUDE.md §2 requires one on every mutation). One was
  mine and is **fixed**: `hooks/api/support/kb-attachments.ts:94` `useDownloadSupportKbAttachment`.
  `hooks/api/authorized-mutation.ts:39` is the wrapper itself (it forwards the caller's key) — not a
  defect. The remaining **20 are in `features/**` and `app/**`, another territory** — listed in §7.
- **207 write mutations invalidate nothing and set nothing.** Narrowed to those with no `onSuccess`,
  no `onSettled` and no caller passthrough: **121**, of which **67 are AI draft endpoints** (draft-first
  POSTs whose result the user applies — no server state to refresh) leaving **61 non-AI**.
- **11 of the 61 triaged by hand.** Ten are legitimate: `useRenderLetter`, `usePreviewTemplate`,
  `usePreviewPayslipTemplate`, `usePreviewMacro` (previews), `useSendSigninLink` (sends an email),
  `useInitiateIntegrationConnection` (returns a redirect URL), `useMfaSetup` (returns a QR/secret; the
  enable step invalidates), and three chat-huddle real-time signalling calls with no cached list.

**One real C097 defect found and fixed:**

> `hooks/api/kb/pages.ts:392` `useRecordKbPageVisit` POSTs `/kb/pages/:id/visit`, which upserts
> `kb_page_visits` (`kb-page-visits.service.ts:160-185`) — the exact table `GET /kb/pages/recent` reads.
> It invalidated nothing, while `useKbPagesRecent` (same file, line 139) holds
> `queryKeys.kb.pagesRecent()` at `staleTime: 30_000`. Result: the wiki's "Recently visited" list did
> not refresh after visiting a page. **Fixed** — `onSuccess` now invalidates `queryKeys.kb.pagesRecent()`,
> matching the three sibling mutations in the same file that already do (lines 255, 273, 335).

**Residual, stated as a number: 50 of the 61 non-AI zero-invalidation writes are unaudited.**
Severity: low-to-medium, open. They are individually cheap to check and collectively a day's work.

---

## 6. The observer-union defect class (routed to me mid-task)

TanStack enables a query when **any** observer enables it. A component that writes
`enabled: <permission>` on a key another component already observes without that condition has written
a gate that never suppresses a request: it reads as authorization in review and is inert at runtime.

**Both reported sites confirmed by reading the render tree.** `features/dashboard/dashboard-client.tsx`
mounts `ExecutiveKpiWidget` (line 206) *and* `DashboardDeferredBody` (line 210) →
`dashboard-deferred-body.tsx` → `HomeWidgetGrid` → `BusinessPulseWidget`. They are co-mounted on
`/dashboard`.

**(1) `components/dashboard/project-health-widget.tsx` — inert permission gate. FIXED.**
`BusinessPulseWidget` passed `enabled: hasCrmAccess` (`crm:leads:view`) to `useExecutiveDashboard`,
whose key is `queryKeys.dashboard.executive()` — the same key `ExecutiveKpiWidget` observes with no CRM
condition. The gate never suppressed anything. **No leak was possible** — the route declares
`@RequirePermission("hr:analytics:read")` (`dashboard.controller.ts:113-118`) and the hook already
gates on exactly that key, and the service branches on `canSeeCrm(u)` server-side so a non-CRM caller
receives the core-only body. But the gate was a false claim, and it is 403-spam waiting to happen.
**Fix: the permission now gates the MOUNT.** The widget is split — an outer component resolves access
and returns `null`, and only the inner component calls the hook. That is correct in every
configuration, including one where this widget is mounted alone.

**(2) `features/dashboard/dashboard-deferred-body.tsx` — inert deferral. FIXED.**
`useMyIssues({ enabled: deferredVisible && projectsEnabled })` shares
`queryKeys.dashboard.myIssues()` with `dashboard-client.tsx:87`, which reads it **eagerly and
legitimately** — `openIssueCount` feeds `useDashboardStatCards`, an above-the-fold stat card. The
deferral was unattainable. **Fix: the condition now states the truth** (`enabled: projectsEnabled`),
with one comment naming the eager sibling, so the next reader does not re-add a deferral that cannot
work.

**Regression proof — `hooks/api/shared-key-observer-union.test.tsx`, 6 tests, exit 0.** Two tests pin
the mechanism on a synthetic key (one gated-shut observer beside an open one still fires; all-shut
sends nothing). Four pin the dashboard: no request without `crm:leads:view`; **still no observer of its
own beside the sibling**; one request once CRM is held; silence when neither key is held.

**Bite-proved, not assumed.** I restored the pre-fix widget verbatim and re-ran: **exit 1**, with
exactly `✕ still mounts nothing of its own beside the sibling that observes the same key`. Restoring
the fix: **exit 0, 6/6**. The old code fails the new assertion; that is what makes it a gate rather
than a description.

**Repo-wide extent of the class — the number you asked for.** I wrote a walk over consumer call sites
of project query hooks: **3,487 observer sites, 2,840 distinct (hook + arguments) identities**.
**20 identities are observed from two or more sites whose `enabled` differs.** A collision is only a
defect when the two observers are **co-mounted**, which the scanner cannot decide, so 20 is an upper
bound, not a defect count. Two were the dashboard pair (now fixed and no longer flagged). Of the rest I
hand-checked the globally-mounted ones:

- **`useUnreadNotifications()` — a real instance, another territory.**
  `features/notifications/notification-bell.tsx:259` gates on `enabled: open` while
  `features/dashboard/alerts-widget.tsx:86` observes the same `queryKeys.notifications.unreadList()`
  with `enabled: !!session?.orgId`. The bell is global chrome, so on `/dashboard` its `open` deferral
  is inert. Not a permission hole — a deferral that does not defer, on a 30s-interval read.
  **Owner: `features/notifications/**` + `features/dashboard/**`.**
- **`usePendingApprovals()` — false positive.** Two *different* hooks share the name
  (`hooks/api/dashboard.ts:270` and `hooks/api/workflows-approvals.ts:19`) on different keys; my
  scanner groups by name and conflated them. Recorded so nobody re-chases it.
- The remaining ~17 (`useHrDepartments`, `useHrEmployees({limit:100})`, `useProjects`,
  `useTicketSearch`, `useOrgMembers`, …) are same-hook-different-page pairs. Co-mounting is
  **unverified** for all of them. **Severity: low, open, 17 unaudited.**

**Recommendation for ticket 30 (harness):** this class deserves a gate. The rule is mechanical — for
each (hook, arguments) identity, if two observers can be co-mounted and their `enabled` differs, the
weaker one decides. The hard half is the co-mounting decision; a first cut that only considers
observers reachable from one route's component tree would have caught both dashboard defects and the
notification bell. My scanner is at
`.../scratchpad/scan-key-collisions.mjs` if it is useful as a starting point.

---

## 7. PRD-C099 / C100 — pagination integrity and states

**C099 reach:** all **34 `useInfiniteQuery` sites** in the repo, every one of them in `hooks/api/**`,
extracted with their `queryKey`, `getNextPageParam`, `initialPageParam` and `staleTime`.

- Three distinct page envelopes are in use and **they are not interchangeable**: `{data, pagination:
  {limit, hasMore, nextCursor}}` (17 sites), `{data, pageInfo: {…}}` (4 sites), and flat
  `{…, nextCursor}` (13 sites). `getNextPageParam` reads a different path on each, so a swap ends
  pagination at page one with **no error anywhere**. Nothing in the repo pinned that distinction; the
  module-access contracts now do, with an explicit test (`keeps the two page envelopes apart`).
- Every one of the 34 carries its filter/sort set in the query key, so **changing a filter resets
  pagination** structurally. Proved by construction for all 34, and behaviourally for one.
- **Behavioural proof exists for exactly 1 of 34** — `hooks/api/cursor-pagination-contract.test.tsx`,
  which drives `useInfiniteNotifications` through a page whose ids disagree with its order (continues
  from the lowest id, not the last element), proves ids accumulate exactly once, that a short page
  stops, that a falsy-but-real cursor (`0`) still travels, and that an unread filter gets its own key
  and its own first page. **That hook is excluded from my territory** (`hooks/api/notifications-inbox*`).
  **Residual: 33 of 34 infinite queries have no duplicate/skip test. Severity: medium, open.**

**C100 states.** `check:empty-states` is green over 3,854 files, and `hooks/api/gated-query.ts` carries
the one piece of this criterion that lives in my territory: a disabled query in v5 reports
`isPending: true, isFetching: false`, so `isLoading` is false and a permission-denied read looks exactly
like a read that finished and found nothing. `useGatedQuery` returns `Gated<…>` so the refusal travels
with the query. **But `check:gated-reads` measures and prints that only 1 non-test file actually reads
that gate** (`features/crm/timeline/my-tasks-panel.tsx`) against 275 `useGatedQuery` reads that carry
one. Rendering the refusal is an `app/**` + `features/**` change — **ticket 30's territory, not mine.**
Offline and background-refresh states are likewise rendered in `features/**`. **C100 is
NOT satisfied from this ticket's territory; the data layer supplies the signal and almost nothing
consumes it.** Severity: medium, open, cross-territory.

---

## 8. Blocked / not mine

- **`pnpm check:type-assertions` exits 1.** Two failures, both on
  `components/layout/command-palette.tsx` / `command-palette-dialog.tsx`, which another agent is
  editing right now (`git status` shows the file modified and uncommitted in the shared tree; last
  commit `cf46a885d` is a command-palette refactor). **Zero `as X` / `as unknown as` / `@ts-ignore` in
  any file I touched** — verified by grep over all eleven. Not my regression; not mine to fix.
- **20 mutations without a `mutationKey` in `features/**` and `app/**`** —
  `features/auth/components/passwordless-signin-form.tsx` (×3),
  `features/hr/asset-returns/asset-returns-page.tsx` (×2),
  `features/hr/document-review/review-sheet.tsx`, `features/hr/fnf/fnf-page-client.tsx` (×2),
  `features/hr/recruitment/headcount/headcount-page.tsx` (×5),
  `features/settings/delegations/grant-delegation-sheet.tsx`,
  `features/settings/organization/org-holiday-calendar-section.tsx` (×2),
  `app/(auth)/signin/page.tsx` (×2), `app/(public)/forms/[token]/page.tsx`,
  `app/(public)/intake/[projectId]/page.tsx`. Severity: low.
- **`useUnreadNotifications` observer collision** (§6) — needs
  `features/notifications/notification-bell.tsx` and `features/dashboard/alerts-widget.tsx`.
- **`hooks/api/accounting/expenses.ts:65,175`** read an HR-owned route with an accounting key. Already
  documented as deliberate in `check:permission-binding`; the fix is an accounting-owned endpoint on
  `feat/accounting-module`, not a client key change. Not a regression, restated so it is not lost.

---

## 9. Files changed

```
hooks/api/module-access/module-access-schema.ts      (+ 7 contracts, backend-derived)
hooks/api/module-access/catalog.ts                   (audit-log contract wired)
hooks/api/module-access/groups.ts                    (groups page + group members wired)
hooks/api/module-access/members.ts                   (members page + candidates + grants wired)
hooks/api/module-access/ownership.ts                 (ownership contract wired)
hooks/api/principal-groups-schema.ts                 (NEW — 3 contracts + z.infer types)
hooks/api/principal-groups.ts                        (contracts wired; types moved to break a cycle)
hooks/api/user-api-tokens-schema.ts                  (NEW — token page + create response)
hooks/api/user-api-tokens.ts                         (3 contracts wired; types moved)
hooks/api/user-api-tokens-pagination.test.tsx        (asserts the contract argument travels)
hooks/api/kb/pages.ts                                (C097 fix: visit invalidates pagesRecent)
hooks/api/support/kb-attachments.ts                  (missing mutationKey)
hooks/api/response-contracts-module-access.test.ts   (NEW — 21 tests, accepts + bites)
hooks/api/shared-key-observer-union.test.tsx         (NEW — 6 tests, bite-proved)
components/dashboard/project-health-widget.tsx       (C096 fix: permission gates the mount)
features/dashboard/dashboard-deferred-body.tsx       (C096 fix: inert deferral removed)
```

No git commands were run. The orchestrator commits.
