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

---

## 5. Line 374 full-clause audit — M4 addendum

Session date: 2026-09-28. Scope: `backend/src/db/schema/kb/**`, `backend/src/db/schema/support/kb*.ts`, `backend/src/modules/kb/**`.

### Clause verdicts

| Clause | Verdict |
|---|---|
| record | PROVEN |
| unique key | DEFECT (5 constraints) |
| FK | PROVEN |
| cache key | PROVEN |
| event | PROVEN |
| job | PROVEN |
| blob | PROVEN |
| search document | PROVEN |

---

### record — PROVEN

Every `kb_*` table enumerated in `backend/src/db/schema/kb/` and `backend/src/db/schema/support/kb*.ts` carries a non-nullable `org_id` column. Tables audited: `kb_pages`, `kb_spaces`, `kb_space_members`, `kb_page_favorites`, `kb_page_visits`, `kb_page_links`, `kb_sources`, `kb_page_reviews`, `kb_import_jobs`, `kb_export_jobs`, `kb_ai_interactions`, `kb_events`, `kb_chat_conversations`, `kb_chat_messages`, `kb_research_briefs`, `kb_page_grants`, `kb_tags`, `kb_page_tags`, `kb_page_attachments`, `kb_linked_documents`, `kb_linked_document_audiences`, `kb_page_versions`, `kb_page_comments`, `kb_page_templates`, `kb_settings`, `kb_indexed_bytes_quota` (orgId is PK), `kb_page_translations`, `kb_page_restrictions`, `kb_page_purge_ledger`, `kb_health_items`, `kb_page_feedback`, `kb_categories`, `kb_article_chunks`, `kb_ingestion_checkpoints`. No `kb_*` table is missing `org_id`.

---

### unique key — DEFECT

Five unique indexes on `kb_*` tables lack `org_id`. Per the requirement definition, a unique key without `org_id` is a cross-tenant collision. All five reference `pageId`, which is a global serial PK on `kb_pages` (org-exclusive by construction), so practical collision across tenants is not possible — but the formal requirement is not met.

| Index name | Table | Columns | File:line | Cross-tenant consequence |
|---|---|---|---|---|
| `uniq_kb_page_favorites_page_user` | `kb_page_favorites` | (pageId, userId) | `backend/src/db/schema/kb/pages.ts:234` | A user with memberships in two orgs could not independently record the same global pageId as a favorite from each — the constraint fires globally instead of per-org. |
| `uniq_kb_page_visits_page_user` | `kb_page_visits` | (pageId, userId) | `backend/src/db/schema/kb/pages.ts:279` | Same: visit dedup is global, not per-org. |
| `uniq_kb_page_links_source_target` | `kb_page_links` | (sourcePageId, targetPageId) | `backend/src/db/schema/kb/pages.ts:324` | Link dedup is global; the composite FK `fk_kb_page_links_org_source/target` already prevents cross-tenant links, so the practical collision window is closed but the formal constraint remains non-compliant. |
| `uniq_kb_page_versions_page_version` | `kb_page_versions` | (pageId, versionNumber) | `backend/src/db/schema/kb/page-collab.ts:34` | Version number dedup is global per page; since each pageId belongs to one org, no cross-tenant collision is reachable. Formal non-compliance only. |
| `uniq_kb_page_translations` | `kb_page_translations` | (pageId, locale) | `backend/src/db/schema/kb/translations.ts:33` | Translation dedup is global; same reasoning — pageId is org-exclusive, collision unreachable in practice. |

Mitigation: all five composite FKs that reference the page column use `(orgId, pageId) → kbPages(orgId, id)`, preventing rows from crossing tenants at the FK level.

---

### FK — PROVEN

Every cross-`kb_*` FK is composite, leading with `org_id`. Representative sample:

| FK name | Table | Columns |
|---|---|---|
| `fk_kb_pages_org_space` | `kb_pages` | (orgId, spaceId) → kbSpaces(orgId, id) |
| `fk_kb_pages_org_parent` | `kb_pages` | (orgId, parentPageId) → kbPages(orgId, id) |
| `fk_kb_page_grants_org_page` | `kb_page_grants` | (orgId, pageId) → kbPages(orgId, id) |
| `fk_kb_chunks_org_page` | `kb_article_chunks` | (orgId, pageId) → kbPages(orgId, id) |
| `fk_kb_space_members_org_space` | `kb_space_members` | (orgId, spaceId) → kbSpaces(orgId, id) |

No FK between two `kb_*` tables was found that omits `org_id`. Cross-tenant FK traversal is impossible by DB constraint. Source: `backend/src/db/schema/kb/*.ts` and `backend/src/db/schema/support/kb*.ts`.

---

### cache key — PROVEN

All KB cache keys enumerated from the construction sites:

| Key template | Construction site | org_id present |
|---|---|---|
| `kb:qembed:${orgId}:${model}:${queryHash}` | `backend/src/common/cache/cache-keys.ts:78` | yes |
| `kb:acc-spaces:${orgId}` (namespace) | `backend/src/modules/kb/core/kb-acl-cache-key.ts:163` | yes |
| `o${orgId}:p${permissionsVersion}:k${kind}:c${ceiling}:m${mbr}:u${userId}` (version key) | `backend/src/modules/kb/core/kb-acl-cache-key.ts:93` | yes |
| `kb:chunk-count:${orgId}:b${bound}` | `backend/src/modules/kb/retrieval/kb-vector-candidate-query.ts:70` | yes |

**Stale-note correction**: a prior audit note claimed `CACHE_KEYS.kbQueryEmbedding` omits the tenant. That note is **STALE**. The current implementation at `cache-keys.ts:78` is `kb:qembed:${orgId}:${model}:${queryHash}` — orgId is the second segment. The key is fully tenant-scoped.

---

### event — PROVEN

`KbEventsService.record()` inserts into `kb_events` with `orgId` as first argument (`backend/src/modules/kb/core/kb-events.service.ts:29`). Every `OutboxWriter.emit()` call from KB carries `organizationId: orgId` in the envelope:

| Emission site | File:line |
|---|---|
| KB page index event | `backend/src/modules/kb/wiki/kb-page-writer.service.ts:125` |
| KB source index event | `backend/src/modules/kb/wiki/kb-sources.service.ts:403–405` |
| KB import job event (initial) | `backend/src/modules/kb/wiki/kb-import-export.service.ts:130–132` |
| KB import job event (retry) | `backend/src/modules/kb/wiki/kb-import-export.service.ts:360–362` |

---

### job — PROVEN

Every KB outbox consumer re-establishes tenant context from the event, not ambient state:

| Consumer | orgId source | Tenant re-establishment |
|---|---|---|
| `KbIngestionConsumer` | `event.organizationId` (line 62) | `runInNewTenantTransaction(this.db, orgId, …)` (line 111) |
| `KbIngestionDeleteConsumer` | `event.organizationId` (line 35) | `runInNewTenantTransaction(this.db, orgId, …)` (line 38) |
| `KbImportProcessConsumer` | payload `orgId: z.string()` (line 42) | `runInNewTenantTransaction(this.db, orgId, …)` (line 45) |

Source: `backend/src/modules/kb/retrieval/kb-ingestion-consumer.ts`, `kb-ingestion-delete-consumer.ts`, `backend/src/modules/kb/wiki/kb-import-process.consumer.ts`.

---

### blob — PROVEN

`StoragePlacementResolver.objectKey()` at `backend/src/modules/storage/storage-placement.ts:150` mints every key as `${orgId}/${folder}/${uuid}-${name}`. KB upload sites:

| Upload path | Folder arg | Resulting key prefix |
|---|---|---|
| Media upload | `kb-media/${u.orgId}` | `${orgId}/kb-media/${orgId}/…` |
| Source upload | `kb-sources/${user.orgId}` | `${orgId}/kb-sources/${orgId}/…` |
| Export upload | `"kb-exports"` | `${orgId}/kb-exports/…` |

All three callers pass `orgId` as the first arg to `storage.uploadFile()`, which is the segment prepended by `objectKey`. Source: `backend/src/modules/kb/wiki/kb-media.service.ts:124`, `kb-sources.service.ts:318`, `kb-export.service.ts:84–90`.

---

### search document — PROVEN

`kb_article_chunks` (`backend/src/db/schema/support/kb-chunks.ts:29`) has `org_id text notNull`. Both retrieval paths filter on it:

- ANN path: `WHERE org_id = ${orgId}` at `backend/src/modules/kb/retrieval/kb-vector-candidate-query.ts:35`
- Exact path: `WHERE org_id = ${orgId}` at `backend/src/modules/kb/retrieval/kb-vector-candidate-query.ts:47`

Chunk insert in `backend/src/modules/kb/retrieval/kb-chunk-repository.ts:73` always includes `orgId` in the row values. Chunk count cache key `kb:chunk-count:${orgId}:b${bound}` is tenant-scoped.
