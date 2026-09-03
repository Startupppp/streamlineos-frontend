# Three P1 production defects — fixed, each with a test that fails before

Scope: the three defects browser measurement found and no ticket owned as a box.
Reported in `reports/30b-states-a11y-and-journeys.md` §5 findings 1 and 2, and in
`issues/23-benchmark-manifest-and-regression-gates.md` line 12 (`GET /clients`).

All three were verified in source before any edit; the restatements handed to me
were correct in substance but incomplete in two places, noted below.

---

## P1 #1 — `/build` and `/build/all` render "Failed to load projects"

### The chain, verified

| Step | Evidence |
|---|---|
| Frontend type declares `page` | `types/projects/projects.ts` `ProjectFilters` |
| The page sends it | `features/build/project-list/projects-page.tsx:293` `useProjects({ page, … })` |
| The hook spreads filters straight into the query string | `hooks/api/build/projects.ts` `apiClient.get("/build", { ...filters })` |
| Backend schema is keyset and strict | `src/modules/build/core/dto/project-core.schemas.ts:47-53` — `{ search, status, afterId, limit, pmWorkspaceId }`, `.strict()` |
| `.parse()` throws, and nothing catches it | `src/common/validation/zod-validation.interceptor.ts` calls `schemas.query.parse(req.query)`; `AllExceptionsFilter` maps `ZodError` to 400 |

### The half the restatement did not carry

The response is wrong too, not just the request. `ProjectsQueryService.queryProjects`
returns `{ data, hasMore, nextCursor }` — there is no `total`, no `page`, no
`totalPages`. The frontend typed it `PaginatedResponse<ProjectListItem>` and built

```ts
const pagination = data ? { page: data.page, total: data.total, totalPages: data.totalPages } : undefined;
```

which is three `undefined`s feeding a numbered `TablePagination`. So even with the
400 removed, the pager could never have worked. **Dropping `page` from the request
alone would have been a wrong fix that looked right.**

### Decision

The backend is the correct side and the frontend changes. `GET /build` never
accepted a page number and never returned one; it is keyset by design
(`orderBy desc(projects.id)`, `lt(projects.id, afterId)`, `limit + 1` to compute
`hasMore`). **The UI does not need offset paging** — it needs the walk the endpoint
serves, which is what `useInfiniteAllWork` in the same module already does for
`/build/all-work`. No backend schema was widened.

### Changed

- `types/projects/projects.ts` — `ProjectFilters` now mirrors the schema (`afterId`, not `page`); new `ProjectListResponse` for what `/build` actually answers.
- `hooks/api/build/projects.ts` — `useProjects` retyped to `ProjectListResponse`; new `useInfiniteProjects` walking the keyset.
- `lib/query-keys/build-work.ts` — `projects.listInfinite`, mirroring the existing `allWorkInfinite` shape.
- `features/build/project-list/projects-page.tsx` — no `page` URL param, no `TablePagination`, a Load more control.
- `hooks/api/build/projects-list-contract.test.tsx` — new.

The optimistic patch in `useUpdateProject` was widened to the `InfiniteData` shape
as well. It matched on `if (!old?.data) return old;`, and an infinite cache has
`pages`, not `data` — so without this an inline project edit would have left the
list page stale until a refetch, which frontend `CLAUDE.md` §2 forbids.

### Proof

`pnpm exec jest --runInBand --testPathPattern="projects-list-contract"`

- after: **exit 0, 5/5**
- before (with `page` restored on `ProjectFilters`): **1 failed, 4 passed** — `expect(unknown).toEqual([])` received `["page"]`

The test reads the backend `listProjectsSchema` through `test-utils/backend-repo.ts`
`backendPath`, asserts the schema is `.strict()` (so the subset rule is real, not
decorative), asserts the scan found a non-trivial schema (a broken scan must fail,
not pass), asserts every `ProjectFilters` field exists in it, and then renders both
hooks and checks what reaches `apiClient.get` — including that page two sends
`afterId: 41` after `getNextPageParam` returns 41 from `nextCursor`.

Independently, `tsc` is now the gate at every call site. With `page: 1` put back on
the `useInfiniteProjects` call:

```
features/build/project-list/projects-page.tsx(295,5): error TS2353: Object literal may only
specify known properties, and 'page' does not exist in type 'ProjectFilters'.
```

---

## P1 #2 — `/calendar` errors on every load

### The chain, verified

`features/calendar/calendar-view.tsx:101-107` sets one window for every source:
`startOfMonth(subMonths(currentDate, 1))` → `endOfMonth(addMonths(currentDate, 1))`,
i.e. three whole months, 89–92 days. `features/calendar/use-hr-calendar-events.ts`
formats that window and sends it to `GET /hr/calendar`, whose service caps at
`MAX_WINDOW_DAYS = 62` (`src/modules/hr/helpdesk/hr-calendar.service.ts:37,56-57`).
That is the only source of the string `"Date window must not exceed 62 days."` in
the backend, and `/hr/calendar` has exactly one caller in the frontend.

### Why the fix is not in `calendar-view.tsx`

The obvious edit — narrow the shared window — would be wrong. The three-month
window is **deliberate** for the unified endpoint: `CALENDAR_MAX_SPAN_DAYS = 120`
carries a documented rationale, and `src/modules/calendar/calendar-span.spec.ts`
derives the client's 92-day worst case across five years and fails if that limit
ever drops back under it. So the caller that gives is the HR one, and only it.

### Changed

`features/calendar/use-hr-calendar-events.ts` — `clampToHrCalendarWindow` narrows to
60 days centred on the view window's midpoint. 60 rather than 62 so a DST shift
cannot round it over the cap; centred so the whole six-week month grid stays
covered in either week-start convention.

### Proof

`pnpm exec jest --runInBand --testPathPattern="hr-calendar-window"`

- after: **exit 0, 5/5**
- before (clamp neutered to identity): **2 failed, 3 passed** — the hook put **91 days** on the wire against a cap of 62

The test recomputes the cap the way the service does — `Math.ceil((to - from) / 86_400_000)`
on the two `YYYY-MM-DD` strings, not on the Date objects — checks all 84 months of
2024–2030, and separately asserts the clamped window still contains
`startOfWeek(startOfMonth) → endOfWeek(endOfMonth)` for `weekStartsOn` 0 and 1. One
test deliberately pins that the *unclamped* window is over the cap for all 84
months, so the regression this guards cannot quietly stop being a regression.

---

## P1 #3 — `GET /clients` 500s on both tenants, SQLSTATE 25P02

### The swallowed first error

`ClientAccountsService.backfillConvertedLeadsToClientAccounts` inserts

```sql
'ACCOUNT_OPENING'::text,
```

into `client_accounts.status`, which is the enum `client_account_status`. Postgres
has **no assignment cast from `text` to an enum**, so the statement fails 42804
during parse — before execution, which is why it failed on both tenants regardless
of whether either had anything to backfill.

`TenantContextInterceptor` (global `APP_INTERCEPTOR`, `src/app.module.ts:215`) runs
the whole request inside one tenant transaction, and `createTenantAwareDb` routes
`this.db` to that ambient `tx`. `getClientAccounts` fired the backfill into it as
`void this.tryBackfill(orgId, userId)` — unawaited, same connection, same
transaction. The failure aborted the transaction; the list read's own statements
then answered 25P02. And `tryBackfill` wrapped both backfills in a `catch` that
logged `warn` and returned, so the 42804 never surfaced anywhere: only its shadow
did.

### Reproduced and fixed against a real database

`psql -d scratch_perf_seed` (local, journal head 665, the seeded perf database),
org `aaaaaaaa-…-0001`, the exact INSERT, inside `BEGIN … ROLLBACK`:

```
BEGIN
ERROR:  column "status" is of type client_account_status but expression is of type text
ERROR:  current transaction is aborted, commands ignored until end of transaction block
ROLLBACK
```

Both the root error and its shadow, in order, in one transaction. With the cast
corrected to `::client_account_status`, same database, same transaction, rolled back:

```
BEGIN
INSERT 0 1600
 follow-up statement OK: 1600
ROLLBACK
```

Nothing was written: every probe ran inside a rolled-back transaction, on a
`scratch_`-prefixed database.

### Changed

`src/modules/clients/client-accounts.service.ts`

1. **Root statement** — `'ACCOUNT_OPENING'::client_account_status`.
2. **Not in the read's transaction** — `registerAfterCommit(backfill)`, falling back
   to running it inline when there is no ambient context. This is verbatim what
   backend `CLAUDE.md` §4 prescribes for this exact failure mode ("a `void something(...)`
   keeps that context after the handler returns"), and the deferred hook runs in its
   own `runInNewTenantTransaction`, so a maintenance write can no longer poison a read.
3. **Swallow removed** — the `catch` around the two backfills is gone. A failure now
   reaches the interceptor's after-commit handler, which logs at `error` and calls
   `reportError`. §4 rule 5: "Never swallow a deferred failure, or the next outage is
   invisible too."

The redis-lock `catch` was kept: it degrades to running without the lock rather than
returning, which is a deliberate fallback, not a swallow of the root error.

### Proof

`pnpm exec jest --runInBand --testPathPattern="client-accounts-backfill"`

- after: **exit 0, 4/4**
- before (all three edits reverted): **4 failed, 0 passed**

`pnpm exec jest --runInBand --testPathPattern="src/modules/clients/"` → **exit 0, 4 suites, 18 tests**.

One existing spec needed a one-line mock addition. `clients-tenant-isolation.spec.ts`
gave `ClientAccountsService` a db with no `execute`, and the old `void` + `catch`
hid that — the spec was passing over a backfill that threw on every call. It now
provides `execute`. That is the swallow being visible, working as intended.

---

## Gates run

| Command | Exit | Result |
|---|---|---|
| `pnpm -C streamlineos-backend typecheck` | 0 | clean |
| `pnpm -C frontend type-check` | 2 | 4 errors, **none in a file I touched** — `components/assistant/global-ask-os.tsx` (1), `features/accounting/assets/create-asset-sheet.tsx` (3) |
| `pnpm -C streamlineos-backend check:spec-typecheck` | 2 | 2 errors, **not mine** — `src/modules/kb/wiki/kb-page-attachment-purge.spec.ts` |
| `pnpm -C frontend exec eslint <7 changed files>` | 0 | 0 errors, 1 pre-existing warning on a line I did not touch |
| `pnpm -C frontend check:cycles` | 0 | 5278 files, no circular dependency |
| `pnpm -C streamlineos-backend check:cycles` | 0 | 5565 files, no circular dependency |
| `pnpm -C frontend check:query-scope` | 0 | |
| `pnpm -C frontend check:query-signal` | 0 | |
| `pnpm -C frontend check:colors` | 0 | |
| `pnpm -C frontend check:over-300` | 0 | |
| `pnpm -C frontend check:effect-fetches` | 0 | |
| `pnpm -C frontend check:file-sizes` | 1 | 5 files over 500, **none mine** — hr/cases, notifications-inbox ×2, crm, inventory |
| `pnpm -C frontend exec jest --testPathPattern="query-keys\|projects\|build"` | 0 | 20 suites, 122 tests |

**Not run:** the browser journey harness, `next build`, any e2e or seeded-e2e suite,
backend lint.

---

## Cross-territory findings, not fixed

1. **Ticket 30 box 3 is unblocked but not closed.** Its stated blocker was
   "`/build/all` renders Failed to load projects … there is no row to click, so there
   is no board to open". That drift is fixed. The box still needs a browser re-run,
   and its second blocker is untouched: `/build/<id>` cannot server-render on
   `Cannot find module 'undici/lib/handler/wrap-handler.js'` (a lockfile problem).
   I did not edit ticket 30 — I closed no box in it.
2. **Ticket 23** names four routes answering 500 with no p95. One of them,
   `GET /clients`, is fixed here; the other three (`POST /build/{projectId}/tickets`,
   `POST /chat/channels/{channelId}/messages`, `GET /cron/notifications-retention-sweep`)
   are untouched and I did not verify whether they share this cause. I did not edit
   ticket 23 — I closed no box in it.
3. **`useProjects({ limit: 200 })`** at `features/build/portfolios/portfolio-detail-page.tsx:152`
   silently receives 100. `pageSizeField` clamps rather than rejects, so the caller
   believes it has every project and has 100. In my territory but not one of the three
   defects; left alone rather than widened into.
4. **The same `void` + `catch` shape elsewhere.** `logSideEffectFailure` is imported at
   `client-accounts.service.ts:2` and used at line 308 for a notification email — that
   one is a genuine best-effort side channel, not this bug. I did not sweep other
   modules for the pattern; `reports/38b-outbox-and-fire-and-forget.md` exists and
   presumably owns that.

## Honest gaps

- **Nothing was verified in a running browser.** All three fixes are proved by tests
  and, for #3, by SQL against a real seeded database — not by loading the pages.
  The 30b harness needs a live app plus a minted session.
- The frontend typecheck is **red on 4 errors in two other territories**, so I cannot
  report the frontend as green — only that none of the errors are in a file I changed.
- **`GET /clients` was not exercised over HTTP** after the fix. The statement is proved
  correct against `scratch_perf_seed` and the deferral is proved by unit test, but no
  request was made against a booted API — which backend `CLAUDE.md` §8 explicitly says
  is the only real proof for post-commit-hook work.
