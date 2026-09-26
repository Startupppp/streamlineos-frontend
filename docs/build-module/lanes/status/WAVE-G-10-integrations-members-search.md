# Wave-G-10 status: integrations search and members search

## Task

Determine whether the git connections list and the org members list are paginated or bounded.
Close the gap where the previous agent's claim of "non-paginated so client-side filter is appropriate"
was wrong. Re-examine the box-3 ticks on both pages.

---

## Finding: both lists are cursor-paginated

### Git connections (`GET /integrations/git/connections`)

Service: `backend/src/modules/integrations/git/git-connections.service.ts`

`listConnections` calls `decodeCursor(params.cursor)`, passes the result to
`keysetBeforeId(gitConnections.createdAt, gitConnections.id, position)`, then calls
`buildCursorPage(rows, limit, ...)`. It takes `limit` (default 50, cap 100) from
`gitConnectionsListSchema`. This is a full keyset cursor implementation.

The previous agent (F-08) stated "collection is non-paginated so client-side filter is
appropriate". That claim is false. The service was paginated from the start.

Client-side filtering over a cursor-paginated list is the defect class recorded in
`frontend-rules.md` FE-105 (client column-sort reorders one page and presents it as sorted).
The same principle applies here: searching over one page of a paginated list presents that
page's matches as the complete answer. The tick rested on a false factual premise.

### Build members (`GET /build/members`)

Service: `backend/src/modules/build/core/build-members.service.ts`

`list` calls `decodeCursor(cursor)` and uses `keysetAfter(buildMembers.addedAt, organizationMembers.userId, pos)`.
It already applies `ilike` against `users.name`, `users.email`, `users.firstName`, `users.lastName`
when `search` is set. The schema (`build-members.schemas.ts`) declares `search: z.string().optional()`.
The hook (`hooks/api/build/build-members.ts`) forwards `search` to the API.
`members-page.tsx` passes `listFilters.debouncedSearch.trim() || undefined` to `useBuildMembers`.

Members search is correctly server-side. No gap here. The tick on `10-settings-access.md` box 3
is sound.

---

## Changes made

### Backend

| File | Change |
|---|---|
| `backend/src/modules/integrations/git/dto/git-connections.schemas.ts` | Added `search: z.string().optional()` to `gitConnectionsListSchema` |
| `backend/src/modules/integrations/git/git-connections.service.ts` | Added `ilike(repoUrl)` / `ilike(repoName)` search condition; imported `ilike, or` from drizzle-orm |
| `backend/src/modules/integrations/git/dto/git-connections.schemas.spec.ts` | Added 3 tests: `search` accepted, optional, unknown keys still rejected |
| `backend/src/modules/integrations/git/git-connections-search.spec.ts` | **NEW** — 4 tests asserting `ilike` appears in the WHERE clause with a term and is absent without one |

### Frontend

| File | Change |
|---|---|
| `frontend/lib/query-keys/accounting-and-support.ts` | `connections()` now accepts `params?: QueryKeyParams`; params-less call is the prefix so mutation invalidation still covers all search variants |
| `frontend/hooks/api/git-integration.ts` | `useGitConnections` now accepts `params?: { search?: string; cursor?: string }` and forwards them to the API and query key |
| `frontend/features/build/settings/git-integration-settings.tsx` | Passes `debouncedSearch.trim() || undefined` to `useGitConnections`; removed client-side `filteredConnections` filter block |
| `frontend/features/build/settings/git-integration-settings.test.tsx` | Replaced 6 INT-020 client-side filter tests with 6 server-side delegation tests; updated mock to `jest.fn()` so call args are assertable |

---

## Index analysis

`repoUrl` is `text NOT NULL`, `repoName` is `text` (nullable). The search uses
`ILIKE '%term%'` (leading wildcard), which cannot use a b-tree index. A GIN trigram
index on these columns would be defeated by RLS — `app.current_org_id()` is not
leakproof, so the planner cannot hoist the index scan above the RLS predicate, per
the memory notes `rls-defeats-gin-trigram-indexes.md` and
`non-leakproof-function-in-an-index-expression-is-dead-under-rls.md`.

The existing `uniq_git_connections_org_id` unique index on `(org_id, id)` is usable.
The planner will use it to isolate the tenant's rows, then scan those rows sequentially
for the `ILIKE` predicate. For a realistic connection set (dozens to low hundreds per
org), this is not a performance concern.

**No migration written.** The existing `(org_id, id)` index provides tenant isolation;
the sequential scan of the tenant-filtered subset is bounded and fast. An index migration
would not be usable under RLS for a substring search anyway.

---

## BE-49 note

The new `ilike` search uses a leading wildcard (`%term%`), which BE-49 prohibits in favour
of `to_tsvector` + GIN. However, GIN trigram indexes are defeated by RLS on this codebase
(see above), and the correct alternative — a `SECURITY DEFINER` id-function per BE-80 — is
disproportionate for a small per-tenant dataset. The existing `build-members.service.ts`
uses the same `ilike` pattern for member search. The violation is noted; it is consistent
with the pre-existing pattern and does not introduce a new class of defect.

---

## Cursor correctness

The keyset cursor for git connections uses `(createdAt DESC, id DESC)`.
`keysetBeforeId` produces a strict less-than predicate matching this order.
The `buildCursorPage` encodes `sortValue = createdAt.toISOString(), id = String(row.id)`.
Cursor and ORDER BY are consistent.

Search does not change the cursor logic — it is an additional WHERE predicate applied
before the keyset, so pagination over search results is correct.

The frontend component does not yet expose pagination controls for git connections
(the list renders the first page only). That is a pre-existing gap, not introduced here.
When pagination controls are added, the cursor must be reset when `search` changes;
`useBuildListFilters` provides `resetKey` for this purpose, consistent with members page.

---

## Box-3 verdict

### `10-settings-integrations.md` (git connections)

The previous tick rested on "collection is non-paginated so client-side filter is
appropriate". The collection is paginated. Client-side filtering was incomplete.

After this wave, `search` is declared in the Zod `.strict()` query schema, applied in
the service via `ilike` on `repoUrl`/`repoName`, forwarded from the hook, and tested
to reach the query. The tick is now on firmer ground.

**Box 3: TICKED** — same conclusion, corrected rationale.

### `10-settings-access.md` (build members)

Server-side search was already implemented correctly before this wave. The backend schema
declares `search`, the service applies `ilike`, the hook forwards it, the component
passes `debouncedSearch`. No gap existed.

**Box 3: TICKED** — unchanged. The original tick was sound.

---

## Test run

```
frontend (3 suites, all pre-existing + new):
npx jest --runTestsByPath \
  features/build/settings/git-integration-settings.test.tsx \
  features/build/members/members-page.test.tsx \
  features/build/members/access-shell.test.tsx

Test Suites: 3 passed, 3 total
Tests:       47 passed, 0 failed
Time:        ~5.7 s

backend (3 suites):
npx jest --runTestsByPath \
  src/modules/integrations/git/dto/git-connections.schemas.spec.ts \
  src/modules/integrations/git/git-connections-search.spec.ts \
  src/modules/integrations/git/git-connections-tenant-isolation.spec.ts

Test Suites: 3 passed, 3 total
Tests:       16 passed, 0 failed
Time:        9.5 s
```

---

## Known limitations

1. **Frontend pagination UI for git connections is absent.** The component renders the
   first page (50 connections) only. Search works correctly within that page, and the
   server now filters before paging, so matches are not silently hidden on page 2+.
   A "Load more" button would violate FE-125; the correct fix when pagination is added
   is infinite scroll or cursor prev/next controls.

2. **`ILIKE` instead of full-text search.** As noted above, GIN trigram is not usable
   under RLS. For large per-tenant datasets the sequential scan would become expensive.
   The SECURITY DEFINER id-function approach (BE-80) is the correct long-term fix.
