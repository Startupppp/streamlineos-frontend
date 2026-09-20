# DOC-07 — API, Database, Cache, and Performance

## Outcome

Every Documents API is tenant-scoped, record-authorized, projected, indexed,
and bounded. Cache keys have writers and invalidation. Silent org-wide reads
and stale search results are defects.

## Current Source Findings

| Defect | Evidence |
|---|---|
| Page ACL ignores space membership | `kb-page-visibility.ts:22-44` vs `kb-access.service.ts:135-140` |
| Create page does not `assertSpaceAccessible` | `kb-pages.service.ts:84-94` |
| `GET /kb/sources` org-wide | `kb-sources.service.ts:115-122` |
| Analytics aggregates org-wide | `kb-analytics.service.ts:70-111` |
| Review **list** skips page visibility | `kb-page-reviews-query.service.ts:85-119` vs `listDue` `:134-178` |
| Record-link delete skips page ACL | `kb-page-record-links.service.ts:63-73` |
| Ask / page AI gated on `:view` not `kb:ai:generate` | `kb-ask.controller.ts:102`, `kb-page-ai.controller.ts:97` |
| Tree / trash / reviews silent caps | 2000 / 100 / 100 |
| Missing `kb_pages (org_id, space_id)` index | `pages.ts:70-81` |
| Sources list sort lacks matching index | `kb-sources.service.ts:121` vs `sources.ts:50` |
| Search keys never invalidated | `pagesSearch(q, aclVersion)` |
| Analytics keys never invalidated | publish / verify / ask |
| `aclVersion` = space-id list only | `pages.ts:29-31` |
| Space delete does not invalidate page tree | spaces mutations |
| Frontend catalog missing 13 keys | `frontend/lib/rbac/permissions/kb.ts` vs backend |
| No bulk API | DOC-05 |
| Article list restriction predicate unused on some paths | `kb-article-query.service.ts` (re-verify at implement) |

## API Work Items (every list/mutation)

For each endpoint: filters, projection, index, bound, cache key, writers,
invalidation, failure behavior, tests.

### Pages

- [ ] **DOC-07-001** Add `GET /kb/pages` list (DOC-04-001) with DataScope +
      `pageVisibleTo` + **space accessibility**. Project
      `KB_PAGE_LIST_COLUMNS` only.
- [ ] **DOC-07-002** Apply space membership inside `pageVisibleTo` (or a
      single `KbAccessService` used by pages and articles).
- [ ] **DOC-07-003** `POST/PATCH /kb/pages` calls `assertSpaceAccessible`
      when `spaceId` is set.
- [ ] **DOC-07-004** `POST /kb/pages/bulk` (DOC-05-008) — max 100 ids,
      per-id ACL, partial results.
- [ ] **DOC-07-005** Tree: lazy children endpoint or `parentId` + cursor;
      stop silent 2000.
- [ ] **DOC-07-006** Trash / search list: cursor, `hasMore`, no silent 100.
- [ ] **DOC-07-007** Shared-with-me filter uses share grants, not
      `createdById <> me`. Add the grant table/query if missing.

### Spaces / members

- [ ] **DOC-07-008** `GET /kb/spaces` cursor + `q` + audience; archive
      status. Cap default 50.
- [ ] **DOC-07-009** Archive/restore mutations (no customer hard delete).
- [ ] **DOC-07-010** Wire space-members hooks; members list cursor 50;
      `assertSpaceAccessible` + `kb:spaces:manage`.

### Sources / retrieval

- [ ] **DOC-07-011** `GET /kb/sources?spaceId=&cursor=` filtered by
      accessible spaces + creator. Index
      `(org_id, created_at DESC, id DESC)` and keep `(org_id, space_id)`.
- [ ] **DOC-07-012** Ask / page-AI / article-AI / research-brief enqueue
      require `kb:ai:generate` **and** the read key.

### Reviews / links / templates / jobs

- [ ] **DOC-07-013** Review list joins `pageVisibleTo` like `listDue`.
      Create review calls `assertPageAccessible`. Cursor pagination.
- [ ] **DOC-07-014** Record-link delete loads the source page and
      `assertPageAccessible`.
- [ ] **DOC-07-015** Templates list cursor; drop silent 200.
- [ ] **DOC-07-016** Import/export job lists cursor; drop client slice.

### Analytics / settings / search

- [ ] **DOC-07-017** Analytics: apply canonical visibility on **existing**
      overview/gaps endpoints (D20). Accept `from`/`to`/`spaceId`. Split
      page vs leftover article metrics. Reuse or delete overview
      `trustScore` — do not add a second score. Insights filter
      `gapKind=ai_no_context`.
- [ ] **DOC-07-035** Space list `articleCount` today counts `kb_articles`
      (`kb-spaces.service.ts:86-97`). Switch to `kb_pages` (or a combined
      field named honestly). Stop scanning the full page tree on the
      client (`spaces-page.tsx:35-44`).
- [ ] **DOC-07-018** Settings GET/PATCH remain `kb:settings:manage`;
      retention only until more settings are approved.
- [ ] **DOC-07-019** Unify or document `/kb/pages/search` vs `/kb/search`.
      Wiki full search uses pages search + facets. Help-centre deflection
      keeps unified search. Align permission keys.

### Help centre (dual-run)

- [ ] **DOC-07-020** Confirm `GET /kb/articles` applies space + DataScope +
      restriction predicate on every list path. Fix any skip with a deny
      test.

## Indexes (close only with EXPLAIN)

Run as the application role with the tenant GUC set.

- [ ] **DOC-07-021** `kb_pages (org_id, updated_at DESC, id DESC)` including
      `deleted_at` strategy used by the list (partial where needed).
- [ ] **DOC-07-022** `kb_pages (org_id, space_id)` (partial `deleted_at is
      null` if that is the live list).
- [ ] **DOC-07-023** Share-grant table indexes leading `org_id` +
      `membership_id` (after D03 schema).
- [ ] **DOC-07-024** `kb_sources (org_id, created_at DESC, id DESC)`.
- [ ] **DOC-07-025** Review list index already `(org_id, status, due)` —
      prove the new visibility join still uses it.

## Cache / Invalidation Matrix

Query keys: `frontend/lib/query-keys/knowledge-and-surveys.ts`.
Help-centre keys stay on `accountingAndSupportQueryKeys.supportKb`.

| Resource | Key dimensions | Writers | Invalidate / patch |
|---|---|---|---|
| Page list | filters + cursor | create, update title/status/space, delete, restore, bulk, import | prefix of that list + tree |
| Page tree / by project | projectId | move, create, delete, restore, import, space archive | both trees |
| Page detail | pageId | patch (optimistic), visibility, lock, verify, restore version | setQueryData when body returned |
| Search | `q` + filters + `aclVersion` | any page write or ACL change | invalidate search prefix |
| Recent / favorites / trash | actor | visit, favorite, delete, restore, purge | those keys only |
| Reviews | filters | create, approve, reject, bulk | lists + `page(id)` on decide |
| Spaces | — | CRUD, archive | `spaces()`, `space(id)`, **page tree** |
| Sources | spaceId + cursor | create, delete | sources prefix |
| Analytics | range + spaceId | publish, verify, ask (P1) | analytics prefix or staleTime 60s + explicit invalidate on publish |
| Settings | — | patch | `settings()` |
| Jobs | tab | import/export | patch job row |
| Chat | conversationId | CRUD messages | existing |
| Briefs | — | enqueue, rate | existing |
| Articles | support keys | article CRUD, **migration run** | **both** wiki and support prefixes |

- [ ] **DOC-07-026** Invalidate `pagesSearch` / unified search on create,
      rename, delete, visibility, restore, import, migration.
- [ ] **DOC-07-027** Include permission version + space membership version
      in `aclVersion`, not only space ids.
- [ ] **DOC-07-028** Space archive/delete invalidates page tree and lists.
- [ ] **DOC-07-029** Publish/verify invalidates analytics overview.
- [ ] **DOC-07-030** Migration run invalidates wiki **and** support KB keys.
- [ ] **DOC-07-031** Writer-matrix tests: scope change, revoked access,
      rollback, cache unavailable (fail open to network, never stale-allow
      a revoked page).

## Permission Catalog

- [ ] **DOC-07-032** Copy the missing 13 keys into
      `frontend/lib/rbac/permissions/kb.ts` (`scopable` flags included).
- [ ] **DOC-07-033** CI test: frontend KB names === backend KB names.

## Query Budget

- No N+1: tree `hasChildren` stays one query + in-memory set.
- No `SELECT *` on pages/articles/sources.
- Default limit 25, max 100 (Quick find 20 stays).
- Analytics `COUNT(DISTINCT)` joins must be re-checked for row inflation
      (`kb-analytics.service.ts:165-177`).

- [ ] **DOC-07-034** Rewrite analytics page-stat query if EXPLAIN shows
      join fan-out.

## Acceptance

- [ ] Cross-tenant and missing-space-membership denies on list, get,
      search, ask citation, analytics title, and bulk.
- [ ] Named EXPLAIN evidence for DOC-07-021–025.
- [ ] Cache matrix rows have a test or a recorded failure behavior.

## Evidence Log

_Empty until the numbered items close._
