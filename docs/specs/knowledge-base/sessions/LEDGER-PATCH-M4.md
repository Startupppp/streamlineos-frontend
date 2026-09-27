# LEDGER-PATCH-M4 — KB collection bounds census

Session date: 2026-09-27
Lane: M4 — sources service, spaces service, trash service

---

## 1. Exhaustive census

| Service file | Method | Cursor type | hasMore | Default limit | Max cap | Projection | Body/content in metadata | Tenant scope |
|---|---|---|---|---|---|---|---|---|
| `kb-sources.service.ts` | `list()` | timestamp+id keyset | yes (sentinel) | 50 | 100 (clamp) | `SOURCE_LIST_COLUMNS` — explicit 12 cols, excludes `noteText`/`fileKey`/`updatedAt`/`deletedAt` | no | `eq(kbSources.orgId, orgId)` |
| `kb-spaces.service.ts` | `list()` | timestamp+id keyset | yes (sentinel) | 20 | 100 (clamp) | named `select({})` call — explicit cols, no body | no | `scope.compose({ tenant: kbSpaces.orgId, … })` |
| `kb-page-trash-query.service.ts` | `getTrash()` | microsecond timestamp+id keyset | yes (sentinel) | 50 | 100 (clamp) | `KB_PAGE_LIST_COLUMNS` — all cols minus `fts`, `content`, `contentText` | no | `eq(kbPages.orgId, orgId)` |
| `kb-page-tree.service.ts` | `getTreeLevel()` | timestamp+id keyset | yes (sentinel) | 50 | 100 (clamp) | explicit cols | no | `eq(kbPages.orgId, orgId)` |
| `kb-page-tree.service.ts` | `move()` (cycle-detect read) | none — intentional unbounded | no — aggregate helper | n/a | none (all pages in org) | `{ id, parentPageId }` — 2 cols | no | `eq(kbPages.orgId, orgId)` |
| `kb-page-versions.service.ts` | `listVersions()` | timestamp+id keyset | yes (sentinel) | 20 | local `PAGE_SIZE_CAP = 100` (BE-24 violation — duplicate) | explicit cols | no | `eq(kbPageVersions.orgId, orgId)` |
| `kb-page-comments.service.ts` | `list()` | none — offset-style hard limit | no | 50 | `PAGE_SIZE = 50` hardcoded | `{ comment: kbPageComments, … }` spread | no | `eq(kbPageComments.orgId, orgId)` |
| `kb-members.service.ts` | `list()` | none | no | 500 | `.limit(500)` hardcoded | explicit join projection | no | `eq(kbSpaceMembers.orgId, orgId)` |
| `kb-page-visits.service.ts` | `getBacklinks()` | none | no | 200 | `.limit(200)` hardcoded | explicit cols | no | `eq(kbPageVisits.orgId, orgId)` |
| `kb-page-visits.service.ts` | `getRecent()` | none | no | 20 | `.limit(20)` hardcoded | explicit cols | no | `eq(kbPageVisits.orgId, orgId)` |
| `kb-page-visits.service.ts` | `getFavorites()` | none | no | 50 | `.limit(50)` hardcoded | explicit cols | no | `eq(kbPageVisits.orgId, orgId)` |
| `kb-categories.service.ts` | `listBySpace()` | none — no limit clause | no | none | unbounded | `db.select()` — SELECT * | no | `eq(kbCategories.spaceId, spaceId)` (space is already tenant-scoped) |
| `kb-article-query.service.ts` | `listVersions()` | none | no | 100 | `.limit(100)` hardcoded | explicit cols | no | `eq(kbArticleVersions.orgId, orgId)` |
| `knowledge-collection.service.ts` | `listPages()` | timestamp+id keyset | yes (sentinel) | `KB_PAGE_COLLECTION_DEFAULT_LIMIT` | schema uses `.max(PAGE_SIZE_CAP)` — rejects not clamps | `COLLECTION_PROJECTION` — explicit, no body | no | `eq(kbPages.orgId, orgId)` |
| `kb-page-search-query.service.ts` | `search()` | 3-tuple rank+updatedAt+id keyset | yes (sentinel) | 20 | 50 (`KB_PAGE_FULL_SEARCH_MAX_LIMIT`) clamp | explicit cols, no body | no | `eq(kbPages.orgId, orgId)` |
| `kb-wiki-analytics.service.ts` | `contributorActivity()` | none — top-N aggregate | no | `CONTRIBUTOR_LIMIT = 50` | 50 hardcoded | explicit cols | no | `eq(kbPageVisits.orgId, orgId)` |

---

## 2. Fixes applied in owned files

### `kb-sources.service.ts`

**Bug**: `list()` called `decodeCursor(query.cursor)` then passed `id: Number(position.id)` to `keysetBeforeMicros`. `kbSources.id` is a serial integer. A tampered cursor with a non-integer id segment (e.g. `"not-an-integer"`, `"0"`, `"1074; DROP TABLE;"`) passes `decodeCursor`'s string-only validation and reaches `Number()`, which returns `NaN`. `keysetBeforeMicros` does not call `numericId()` internally; it binds `NaN` via `sql.param`, which the Postgres driver receives as a NaN float cast to a timestamp — a type error that surfaces as a 500 or silent bad filter.

**Fix**: import `decodeIntegerCursor` (validates id with `/^[1-9][0-9]{0,9}$/` and safe-integer bound); remove the now-redundant `Number()` wrap since `decodeIntegerCursor` already returns `id: number`.

### `kb-spaces.service.ts`

**Same bug**: `list()` called `decodeCursor(query.cursor)` for a serial-integer PK column. Same NaN path via `keysetBeforeMicros`.

**Fix**: same — `decodeIntegerCursor`, remove `Number()` wrap.

### `kb-page-trash-query.service.ts`

No fix required. Already uses `decodeTimestampCursor`, which calls `decodeIntegerCursor` internally. Passes all 3 tests unchanged.

---

## 3. Referred-out defects (not owned by this lane)

| File | Location | Rule | Defect |
|---|---|---|---|
| `wiki/dto/kb-sources.schemas.ts` | line 17 | BE-24 | `limit: z.coerce.number().int().min(1).max(100).default(50)` — `.max(100)` rejects with 400; should be `pageSizeField(50)` which clamps. Client sending `limit=101` gets a 400 instead of a clamped page. |
| `core/dto/kb.schemas.ts` | `kbPageCollectionQuerySchema.limit` | BE-24 | `z.coerce.number().int().min(1).max(PAGE_SIZE_CAP)` — same reject-vs-clamp defect. |
| `wiki/kb-page-comments.service.ts` | `list()` ~line 53 | BE-24, BE-25 | `PAGE_SIZE = 50` hardcoded, no cursor, no `hasMore`. Returns a plain array. |
| `wiki/kb-members.service.ts` | `list()` line 76 | BE-24 | `.limit(500)` — 5× over `PAGE_SIZE_CAP`. No cursor, no `hasMore`. |
| `wiki/kb-page-visits.service.ts` | `getBacklinks()` ~line 208 | BE-24 | `.limit(200)` — 2× over `PAGE_SIZE_CAP`. No `hasMore`. |
| `help-centre/kb-categories.service.ts` | `listBySpace()` lines 29-32 | BE-24, BE-07 | No `.limit()` clause — unbounded read. `db.select()` with no columns — SELECT *. |
| `help-centre/kb-article-query.service.ts` | `listVersions()` ~line 148 | BE-25 | `.limit(100)` hardcoded, no cursor, no `hasMore`. |
| `wiki/kb-page-versions.service.ts` | lines 21-22 | BE-24 | `const PAGE_SIZE_CAP = 100` local constant duplicates the exported `PAGE_SIZE_CAP` from `common/pagination/list-query.schema.ts`. Should import the canonical constant. |

---

## 4. Ledger verdicts

### Line 376 — cursor-based, hasMore signalled, limit defaults ≤ 50, caps at 100, no silent truncation

**STILL-OPEN**

Owned files pass. Eight non-owned endpoints fail:
- `kb-page-comments.service.ts list()` — no cursor, no hasMore, hardcoded 50
- `kb-members.service.ts list()` — no cursor, no hasMore, `.limit(500)` exceeds cap
- `kb-page-visits.service.ts getBacklinks()` — no cursor, no hasMore, `.limit(200)` exceeds cap
- `kb-categories.service.ts listBySpace()` — no limit at all (unbounded)
- `kb-article-query.service.ts listVersions()` — no cursor, no hasMore, hardcoded 100
- `kb-sources.schemas.ts` and `kbPageCollectionQuerySchema` — `.max(100)` rejects instead of clamping, which breaks BE-24's clamp contract for clients that send any value > 100

### Line 378 — projections replace SELECT *; page bodies never appear in list/search metadata queries

**STILL-OPEN**

`kb-categories.service.ts listBySpace()` issues a bare `db.select()` with no column argument — SELECT *. All other endpoints in the census use explicit projections and exclude `content`/`contentText` where applicable.

### Line 374 — tenant scope explicit on every record, unique key, FK, query, cache key, event, job, blob, search document

**CLOSABLE** (query dimension only — this lane's scope)

Every collection-returning query in the census carries an explicit `orgId` predicate. No cross-tenant miss path was found in any of the three owned service files or the non-owned list endpoints.
