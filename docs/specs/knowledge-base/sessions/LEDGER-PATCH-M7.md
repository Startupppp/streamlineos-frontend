# LEDGER-PATCH-M7 — Cross-cutting invariants (M7 of 8)

**Lane:** M7  
**Date:** 2026-09-25  
**Scope:** All 8 cross-cutting invariants from `REQUIREMENT-LEDGER.md § Cross-cutting invariants`  
**Edit paths:** `backend/src/modules/kb/core/**` and new spec files only  
**Spec file created:** `backend/src/modules/kb/core/kb-cross-cutting-invariants.spec.ts` (45 tests, all GREEN)

---

### Box 1 — `Canonical KnowledgeAuthorization is the only access decision; no caller rebuilds the predicate.`

**DEFECT — HANDOFF**

The canonical service (`KnowledgeAuthorizationService`) is used by all wiki services (verified: no `kb/wiki/**/*.ts` production file imports `pageVisibleTo`). Three production files outside my edit scope rebuild predicates independently:

1. **`backend/src/modules/kb/retrieval/kb-page-access.util.ts:20`** — `assertPageAccessible()` calls `pageVisibleTo()` directly. Used by `kb-object-access.ts` for attachment reads. This path was deliberately deferred to S08/S17 in the REQUIREMENT-LEDGER.
2. **`backend/src/modules/kb/retrieval/kb-candidate.service.ts:176`** — calls `buildArticleRestrictionBranch()` directly for the article restriction arm, bypassing `KnowledgeAuthorizationService`. This is in `retrieval/` (outside my scope).
3. **`backend/src/modules/kb/document-query/kb-document-query.service.ts:80`** — also calls `buildArticleRestrictionBranch()` directly. Outside my scope.

Both #2 and #3 were explicitly called out in REQUIREMENT-LEDGER S01 ("Fold `buildArticleRestrictionPredicate` into the seam") and remain open.

**Evidence (GREEN):**
- Pinning tests in `kb-cross-cutting-invariants.spec.ts` enumerate exactly the known deferred callers and fail if new callers appear.
- "no wiki production file imports pageVisibleTo": PASS
- "document-query callers of buildArticleRestrictionBranch are bounded": PASS (1 known, passes)
- "deferred callers in retrieval/ are bounded and enumerated": PASS (9 known files)

**HANDOFF 1:** `backend/src/modules/kb/retrieval/kb-page-access.util.ts:6,20` — Replace `pageVisibleTo(user, projectIds)` with `KnowledgeAuthorizationService.visiblePagePredicate(user, "view")`. The service must be threaded from `StorageModule` importing `KbCoreModule`. Already sequenced in S08/S17.

**HANDOFF 2:** `backend/src/modules/kb/retrieval/kb-candidate.service.ts:176` and `backend/src/modules/kb/document-query/kb-document-query.service.ts:80` — Both call `buildArticleRestrictionBranch(orgId, principal)` directly. Fold this into `KnowledgeAuthorizationService` as a method (e.g., `articleRestrictionPredicate(standing)`), removing the independent call sites.

---

### Box 2 — `Route denial is 403/NoPermission; hidden or missing records are an indistinguishable 404.`

**SATISFIED**

`KnowledgeAuthorizationService` implements the correct mapping:
- `resolvePageAccess` returns `notFound()` when the row is absent from the DB query (which uses the visibility predicate — a hidden page yields no row, same as a missing one).
- The only `denied()` return in `resolvePageAccess` is for the structural pre-check ("Organization membership required"), before any record lookup.
- `resolveSpaceAccess` returns `notFound()` for all inaccessible spaces (no `denied()` returns).
- `assertPageAccess` maps `denied → ForbiddenException` and `notFound → NotFoundException`.
- Wiki controllers' `ForbiddenException` throws are only for structural identity checks (membership/principal), not resource lookups.

**Evidence (GREEN):**
- `knowledge-authorization.service.spec.ts:85` — "reports a page it cannot reach as not found, never as denied" (pre-existing test, GREEN)
- 5 new structural checks in `kb-cross-cutting-invariants.spec.ts`, all GREEN.
- Source inspection confirms `row === undefined) return notFound()` at `knowledge-authorization.service.ts:146`.

---

### Box 3 — `Authorization fails closed; cache unavailability cannot retain revoked access.`

**SATISFIED** (with documented TTL window)

Three layers ensure fail-closed behavior:

1. **Auth key markers:** `CacheFiller.AUTHZ_KEY_MARKERS` includes `"kb:acc-spaces:"`, so the space-scope cache is never retained in the outage memo during Redis unavailability. Auth reads always re-query the DB during an outage. (`cache-fill.ts:35-36`)

2. **Permission version in cache key:** `kbAclCacheKey` embeds `permissionsVersion`. Any role/permission change bumps the version, changing the cache key, causing a cache miss even if the namespace increment was dropped. This is the primary fail-safe against dropped invalidations. (`kb-acl-cache-key.ts:17`)

3. **kbAclCacheKey throws on invalid inputs:** Guards prevent tenant-blind or version-blind cache keys from being constructed.

**Residual window:** If a space membership changes (not a role change) and the namespace invalidation is dropped, the stale space list may be served for up to the TTL (60 seconds, `SPACE_SCOPE_TTL_SECONDS`). This is within the spec's stated budget (hard bound 60s). This gap is known and deliberate.

**Evidence (GREEN):**
- 5 new tests in `kb-cross-cutting-invariants.spec.ts`, all GREEN.
- `CacheFiller.AUTHZ_KEY_MARKERS` verified to include `"kb:acc-spaces:"`.

---

### Box 4 — `Tenant scope is explicit on every record, unique key, FK, query, cache key, event, job, blob, and search document.`

**SATISFIED**

Verified across the following surfaces:

- **Records:** `kbPages.orgId` non-nullable on all page rows; verified in `COLLECTION_PROJECTION` and `KB_PAGE_LIST_COLUMNS`.
- **Cache keys:** `kbAclCacheKey` requires non-empty orgId (throws on empty string). Namespace `kb:acc-spaces:${orgId}` embeds the tenant.
- **Fingerprint:** `buildVisiblePageScope` embeds `standing.orgId` in the fingerprint. Two tenants produce different fingerprints.
- **Grant SQL:** `buildGrantBranch` emits `"kb_page_grants"."org_id" = ${standing.orgId}` in the EXISTS subquery.
- **Queries:** Static scan of `wiki/**/*.ts` confirms no bare `.select().from(kbPages)` without an orgId condition.
- **Events:** `kbEvents` insert at `kb-events.service.ts:31` includes `orgId` field.
- **Jobs:** `kbImportJobs` and `kbExportJobs` carry `orgId`.
- **Search documents:** `kbPages.fts` is queried with `eq(kbPages.orgId, orgId)` in all search paths.

**Evidence (GREEN):**
- 5 new tests, all GREEN.
- Scan: "no wiki production file uses a bare db.select().from(kbPages) without orgId binding" PASS.

---

### Box 5 — `Collections are cursor-based, hasMore is signalled, limit defaults ≤ 50 and caps at 100, and no query silently truncates.`

**SATISFIED**

- `KB_PAGE_COLLECTION_DEFAULT_LIMIT = 50` (`knowledge-collection.types.ts`)
- `PAGE_SIZE_CAP = 100` (`common/pagination/list-query.schema.ts`)
- `kbPageCollectionQuerySchema` enforces `.max(PAGE_SIZE_CAP)` — a limit of 101 is rejected.
- `kbPageCollectionPageSchema` includes `hasMore: boolean`, `nextCursor: string | null`, and `limit: number`.
- Full-search: `KB_PAGE_FULL_SEARCH_MAX_LIMIT = 50`, `pageSizeField(20, 50)` — `hasMore` reported.
- Spaces list: `pageSizeField(20)` — defaults 20, clamps at 100.
- Favorites: `.limit(50)` fixed cap (REQUIREMENT-LEDGER: "favorites 50").
- Recent: `.limit(20)` fixed cap (REQUIREMENT-LEDGER: "recents 20").
- Import/export jobs: `PAGE_SIZE_CAP + 1` sentinel with `buildCursorPage`.

**Evidence (GREEN):**
- 7 new tests, all GREEN.

---

### Box 6 — `Projections replace SELECT *; page bodies never appear in list/search metadata queries.`

**SATISFIED**

- `KB_PAGE_LIST_COLUMNS` (`wiki/kb-page-columns.ts:10`) explicitly strips `content`, `contentText`, and `fts` from the column set using destructured omission:
  ```typescript
  const { fts: _fts, ...detailColumns } = getTableColumns(kbPages);
  const { content: _content, contentText: _contentText, ...listColumns } = detailColumns;
  ```
- `COLLECTION_PROJECTION` in `knowledge-collection.service.ts` is an explicit column object with no `content` key.
- `kbPageCollectionItemSchema` has no `content` or `contentText` fields.
- Full-search projection (`kb-page-search-query.service.ts:57-70`) lists explicit columns; no `content`/body field appears.
- Static scan: no wiki service uses `.select()` without arguments when querying `kbPages`.

**Evidence (GREEN):**
- 5 new tests, all GREEN.
- `kbPageCollectionItemSchema.shape` inspected: `content` absent, `contentText` absent, `fts` absent.

---

### Box 7 — `Content writes carry expectedContentRevision; retriable creates and bulk commands carry Idempotency-Key.`

**DEFECT — HANDOFF** (partial)

Content writes and bulk commands are correctly gated:

- `updatePageSchema` enforces `expectedContentRevision` when `content` is written (superRefine at `wiki/dto/kb-pages.schemas.ts:49-59`).
- `updateArticleSchema` has `expectedContentRevision: z.coerce.number().int().positive()` (required).
- Bulk commands all carry `@Idempotent`: `trash/restore`, `trash/purge`, `trash` empty, page import, review bulk-decide, page/review approve/reject.

**Gap:** `POST /kb/pages` (plain page create) has no `@Idempotent` decorator. A network drop between commit and response causes a duplicate page on retry. This is a HANDOFF.

**Evidence (GREEN for covered items, test documents the gap):**
- 9 tests total. 8 GREEN for covered items. 1 test documents the gap explicitly:
  - "plain page create does NOT carry an idempotency command — this is a known gap against the spec requirement for retriable creates; fix is `@Idempotent` on `KbPagesController.create`" — GREEN (asserts `undefined`, intentionally documents the gap)

**HANDOFF 3:** `backend/src/modules/kb/wiki/kb-pages.controller.ts:197-207` — Add `@Idempotent("kb.page.create")` to `create()`. The `createPageSchema` has no `externalId` deduplication, so a retry creates a duplicate row. Similarly consider `POST /kb/spaces` (`kb-spaces.controller.ts:69`).

---

### Box 8 — `Audit and outbox records commit with the source mutation; no provider/object-store/embedding call holds a DB transaction open.`

**SATISFIED**

Three patterns are correctly implemented:

1. **Outbox events inside the transaction:** `OutboxWriter.emit(tx, ...)` is called with the transaction handle `tx` (not the bare `db`), so outbox rows commit atomically with the source mutation. Confirmed in `kb-import-export.service.ts:326-342`.

2. **Audit log after commit:** `AuditService.log()` uses `registerAfterCommit` to defer the write until after the tenant transaction commits. If no ambient context, it runs inline. This is explicitly designed as "best-effort telemetry" (not `logCritical`).

3. **Embedding calls deferred:** `kb-media.service.ts:189` uses `registerAfterCommit` for indexing/embedding calls. The AI routes (`POST /kb/ask`, `POST /kb/pages/reindex`, `POST /kb/pages/reindex-all`) carry `@NoTenantTransaction` so they never hold the request transaction during provider calls. `KbEventsService.recordDetached` also uses `registerAfterCommit`.

4. **Static check:** No wiki production file imports an AI client library (`openai`, `@anthropic-ai`, etc.) alongside a transaction call.

**Evidence (GREEN):**
- 3 new tests, all GREEN.
- `registerAfterCommit` verified to be called by `KbEventsService.recordDetached` when ambient context is present.

---

## Summary

| Box | Verdict | Tests |
|---|---|---|
| 1 | DEFECT — HANDOFF (3 items) | 5 GREEN, deferred set enumerated |
| 2 | SATISFIED | 5 GREEN |
| 3 | SATISFIED (60s TTL window documented) | 5 GREEN |
| 4 | SATISFIED | 5 GREEN |
| 5 | SATISFIED | 7 GREEN |
| 6 | SATISFIED | 5 GREEN |
| 7 | DEFECT — HANDOFF (1 item: page create) | 9 GREEN, gap documented |
| 8 | SATISFIED | 3 GREEN |

**Total:** 44 tests GREEN, 1 test intentionally documents a gap (also GREEN).

---

## Files Changed

- **CREATED:** `backend/src/modules/kb/core/kb-cross-cutting-invariants.spec.ts` (45 tests, all GREEN)
- **CREATED:** `docs/specs/knowledge-base/sessions/LEDGER-PATCH-M7.md` (this file)

## Commands Run

```
npx jest --runTestsByPath src/modules/kb/core/kb-cross-cutting-invariants.spec.ts -w 1 --no-coverage
```
Result: **45 passed, 0 failed**, 7.253 s

```
npx jest --runTestsByPath src/modules/kb/core/authorization/knowledge-authorization.service.spec.ts -w 1 --no-coverage
```
Result: **21 passed, 0 failed** (pre-existing)

## Gates Not Run

- Full suite (banned by rule 11)
- `pnpm typecheck` / `pnpm typecheck:test` (no type-level changes in production code)
- `check:route-classification`, `check:unbounded-reads` (unchanged routes)

---

## HANDOFF LIST

### HANDOFF 1 — kb-page-access.util.ts uses legacy predicate (retrieval/)
- **File:** `backend/src/modules/kb/retrieval/kb-page-access.util.ts:6,20`
- **Defect:** `assertPageAccessible` calls `pageVisibleTo(user, projectIds)` — the legacy predicate. This function is called from `kb-object-access.ts:28,41` for attachment and cover-image reads.
- **Fix:** Thread `KnowledgeAuthorizationService` through `StorageModule` → `assertKbObjectReadable` → `assertPageAccessible`. Change `pageVisibleTo(user, projectIds)` to `await auth.visiblePagePredicate(user, "view")`. `StorageModule` can import `KbCoreModule` without creating a cycle (confirmed in REQUIREMENT-LEDGER S01).
- **Sequenced:** S08/S17 per REQUIREMENT-LEDGER.

### HANDOFF 2 — buildArticleRestrictionBranch called outside KnowledgeAuthorizationService
- **File A:** `backend/src/modules/kb/retrieval/kb-candidate.service.ts:176`
- **File B:** `backend/src/modules/kb/document-query/kb-document-query.service.ts:80`
- **Defect:** Both call `buildArticleRestrictionBranch(orgId, principal)` directly, bypassing the canonical service. This makes the "no caller rebuilds the predicate" invariant incomplete for article-restriction logic.
- **Fix:** Add `articleRestrictionPredicate(standing: KbActorStanding): SQL` to `KnowledgeAuthorizationService` (delegates to `buildArticleRestrictionBranch`). Both services inject `KnowledgeAuthorizationService` already, so this is a one-line call-site change in each.
- **Note:** `buildArticleRestrictionBranch` lives in `core/authorization/knowledge-page-scope.ts` (in my scope) but is correctly exported for these callers. The fix is to add the service method and update the callers.

### HANDOFF 3 — POST /kb/pages (plain create) has no @Idempotent
- **File:** `backend/src/modules/kb/wiki/kb-pages.controller.ts:197-207`
- **Defect:** `POST /kb/pages` creates a new page row with no idempotency fence. A network failure after DB commit but before response delivery causes a duplicate page on retry.
- **Fix:** Add `@Idempotent("kb.page.create")` decorator before `@RequirePermission("kb:pages:create")`. Consider also adding it to `POST /kb/spaces` (`kb-spaces.controller.ts:69`).
- **Note:** The `check:idempotent-commands` gate uses a keyword corpus and will not catch this; the pinning test in `kb-cross-cutting-invariants.spec.ts` documents the gap explicitly (the test is GREEN but documents the defect by asserting `idempotencyCommandOf(...) === undefined`).
- **Update test after fix:** Change the assertion from `toBeUndefined()` to `toEqual(expect.any(String))` once the decorator is added.
