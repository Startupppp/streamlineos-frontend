# Ticket 16 — Knowledge Base, Wiki and Chatbot — audit at head

**Backend head:** `2f37e1bb0` (branch `release/code-10-10-v2`); last KB commit `ccd31ad23 fix(kb): release the connection before the retrieval provider call`.
**Frontend head:** `7469d2789` (branch `release/code-10-10-v2`).
**Prior report:** `reports/16-knowledge-wiki-chatbot.md` (backend head `591cf663` at the time). Read in full. This audit
verifies its claims at head, **corrects two of them**, and closes the items it left NOT RUN.

Read-only pass. No repository file was edited. The only artefacts I created are this report and an isolated
throwaway Postgres database `kb_perf_t16` on localhost (see §6).

---

## 1. What I read — with numbers

### Backend KB module (`src/modules/kb/`)
| unit | count |
|---|---|
| `.ts` files total | **235** |
| non-spec source files | **138** |
| spec files | **97** |
| controllers | **30** |
| HTTP handler decorators (`@Get/@Post/@Put/@Patch/@Delete`) | **141** |
| mutating handlers (`@Post/@Put/@Patch/@Delete`) | **94** |
| `openapi.json` paths under `/kb` | **110** (of 2,700 repo-wide) |
| `openapi.json` operations under `/kb` | **138** |
| schema files under `src/db/schema/kb/` | **16** |

Files read line-by-line (not grepped): `kb-search.service.ts` (399), `kb-candidate.service.ts` (261),
`kb-indexing.service.ts` (344), `kb-attachment-indexing.service.ts` (271), `kb-chunk-repository.ts` (235),
`kb-embedding-resumption.ts` (104), `kb-ingestion-checkpoint.service.ts` (95), `kb-ingestion-lease.service.ts` (96),
`kb-ingestion-consumer.ts` (139), `kb-chunk-visibility.ts` (21), `kb-page-visibility.ts` (56),
`kb-ask.service.ts` (§ 200–305), `kb-sources.service.ts` (§ 60–240), `kb-sources.controller.ts` (82),
`kb-page-indexing.controller.ts` (55), `kb-search.controller.ts` (33), `dto/kb-ai.schemas.ts`,
`kb-hnsw-iterative-scan.spec.ts` (121), `common/tenant/tenant-context.interceptor.ts` (§ 100–161),
`common/pagination/list-query.schema.ts`.

### Live catalog (`scratch_head_1010`, bootstrapped at journal head, 944 tables)
| unit | count |
|---|---|
| `kb_*` tables | **33** |
| of those with `org_id` + RLS enabled + 1 policy | **32 / 32** (the 33rd is `kb_tenant_backfill_issues`, a diagnostic table) |
| foreign keys declared **from** `kb_*` tables | **104** |
| of those tenant-composite (`org_id` in both sides) | **86** |
| of those to a tenant-root table (`users`) | **18** |
| **not** tenant-composite | **0** |
| PK/UNIQUE constraints on `kb_*` | **62** |
| indexes inspected in detail | **54** across 8 core tables |

### Frontend
| unit | count |
|---|---|
| `features/wiki/**` | **60** files |
| `features/help-centre/**` | **26** files |
| `hooks/api/kb/**` | **24** files |
| KB query keys in `lib/query-keys/knowledge-and-surveys.ts` | **70** |
| app files importing `hooks/api/kb` | **47** |

### Commands run (literal, with exit codes)
| command | exit | result |
|---|---|---|
| `pnpm check:placement-bypass` (backend) | **0** | 147 bypass sites; 45 `provider-in-transaction`; all allowlisted. Repaired since the prior audit (it was 1). |
| `pnpm exec jest --runInBand --testPathPattern="modules/kb/retrieval/"` | **0** | **33 suites / 279 tests passed** |
| `psql` catalog sweeps (composite FK, PK/UNIQUE, RLS, policies, indexes, function bodies) | 0 | see tables above |
| `EXPLAIN (ANALYZE, BUFFERS)` on a 54,000-chunk / 50,000-page synthetic corpus | 0 | see §6 |

Not run, deliberately, per the laptop budget: `pnpm typecheck`, `next build`, the full jest suite.

---

## 2. Two corrections to the prior report

### 2.1 "There is NO ingestion-job table… no lease, no retry, no DLQ" — **half wrong at head, and it was half wrong then too**

The prior report's headline C133/C134 architecture finding is overbroad. **Pages and articles have a durable,
leased, retried, dead-lettered ingestion path** and have since `2026-09-02`, before that audit was written:

- `kb-pages.service.ts:253`, `kb-page-status.service.ts:83,112,141`, `kb-page-versions.service.ts:158`,
  `kb-page-tree.service.ts:204`, `kb-articles.service.ts:172,217,248,274,363` all `OutboxWriter.emit(tx, …)`
  a `kb.content.index` event **inside the same transaction as the content write**.
- `kb-ingestion-consumer.ts` consumes it: per-org concurrency cap (`KB_MAX_CONCURRENT_PER_ORG = 20`),
  a Redis mutual-exclusion lease with a 300 s TTL and a token-checked release (`kb-ingestion-lease.service.ts`),
  `shouldDeadLetter(event.retryCount)` at line 78, structured start/complete/fail logging with `durationMs`.
- `kb-ingestion-delete-consumer.ts` handles de-indexing on delete.
- `kb_ingestion_checkpoints` is a real table with a real unique key and is the resumption/dedupe store
  (`kb-embedding-resumption.ts`).

**What *is* true, and is the sharper finding:** the ingestion path is **bifurcated**. `kb_sources` and
`kb_media` never emit an outbox event. `kb-sources.service.ts:84` and `:155` still use
`registerAfterCommit`, and `kb_sources.status` is still the whole state machine for that half, advanced
in-process. So the same module ships two different reliability contracts for the same job, and the weaker one
has no lease, no attempt counter, no DLQ and no reclaimer. See F3.

### 2.2 "`resolveCitations` re-verifies every candidate against the asker's visibility" — **incomplete**

`kb-ask.service.ts:273-289` `resolveVisibleArticles` re-applies org, accessible spaces, `status='published'`
and the owner DataScope filter. It does **not** re-apply `KbCandidateService.articleRestrictionFilter` — the
per-article `kb_article_restrictions` ACL that `retrieveTopArticles` (`kb-search.service.ts:235`) *does*
apply on the way in. The re-verification is therefore blind to one of the two article ACL dimensions.
Narrow window (a restriction added between retrieval and the model's reply), defence-in-depth only. See F9.

### Claims from the prior report I re-verified and that **still hold at head**
- `kb_space_grants` has **no application writer**. Only `src/scripts/verify-membership-revocation.ts:339` inserts;
  read at `kb-access.service.ts:128`, deleted at `org-membership-access-revocation.ts:194`. That ACL branch is
  permanently empty in production.
- The after-commit drain runs each hook inside a fresh tenant transaction —
  `tenant-context.interceptor.ts:147 runInNewTenantTransaction(this.db, resolved.orgId, …)` — so the three
  "not fixed" `provider-in-transaction` sites (`kb-media#upload`, `kb-sources#upload`, `kb-sources#createNote`)
  still hold a connection across an embedding round trip. Unchanged.
- `check:placement-bypass` is now **green** (exit 0, repaired in the concurrent gate wave). Its KB entries
  are on the allowlist as PRE-EXISTING/UNAUDITED for `support-kb.controller.ts:258,282,294`.
- 33/33 KB retrieval suites, 279/279 tests green at head.

---

## 3. Per-criterion assessment

### PRD-C133 — schema/architecture composite integrity → **MET for schema; NOT MET for ingestion state**

The prior report left "spaces/memberships/revisions/attachments composite-integrity sweep" as NOT RUN.
**I ran it.** Walked in the order the criterion names:

| dimension | table(s) | verdict |
|---|---|---|
| **spaces** | `kb_spaces` | org_id ✓, RLS ✓, `uniq_kb_spaces_org_id (org_id,id)` ✓, FK→`organization_members` composite ✓ |
| **memberships** | `kb_space_members`, `kb_space_grants` | `kb_space_members`: composite unique ✓ plus two natural keys — `uniq_..._org_space_membership (org_id,space_id,membership_id) WHERE membership_id IS NOT NULL` and `uniq_..._org_space_role (org_id,space_id,role) WHERE role IS NOT NULL` ✓. `kb_space_grants`: unique `(org_id,space_id,principal_type,principal_id,permission_key)` ✓ but **no `uniq_kb_space_grants_org_id`**, so nothing can form a composite FK to it (F11). |
| **documents/pages** | `kb_pages`, `kb_articles` | org_id ✓, RLS ✓, composite unique ✓. 8 composite FKs on `kb_pages` alone (parent, space, source article, project, 5 membership columns) — all `(org_id, x) → (org_id, id)` ✓ |
| **immutable revisions** | `kb_page_versions`, `kb_article_versions` | append-only in practice; natural keys are `(page_id, version_number)` / `(article_id, version_number)` — **not tenant-prefixed**, unlike every other natural key in the module (F11) |
| **attachments** | `kb_article_attachments`, `kb_page_attachments` | org_id ✓, RLS ✓, composite unique ✓, composite FK to parent ✓ |
| **ingestion jobs** | `kb_ingestion_checkpoints` | exists; unique `(org_id,content_type,content_id,chunk_index)` ✓; **no `uniq_..._org_id`** (F11); **no `embedding_model` column** (F5); **no retention** (F6) |
| **chunks/embeddings** | `kb_article_chunks` | org_id ✓, RLS ✓, composite unique ✓, **4 composite FKs** (article, page, source, attachment) ✓. Two partial dedupe uniques on `(org_id, {article,page}_id, chunk_index, content_revision, acl_revision, embedding_model)` ✓. **HNSW index `idx_kb_chunks_embedding_hnsw` is on `embedding` alone, not tenant-partitioned — this is F1.** |
| **deletion/reindex state** | — | de-indexing verified in all three places by the prior report; I re-confirmed `isNull(kbPages.deletedAt)` on `reindexPageOnRequest` (`kb-indexing.service.ts:171`) and the delete consumer's purge. Unchanged. |

**Zero non-composite foreign keys across 104 FKs.** The tenant-composite integrity the criterion asks about is
genuinely, measurably present. This is the strongest part of the module.

**What blocks "met":** the ingestion *state* half. There is no reclaimer for a `kb_sources` row stranded in
`processing`, and the write of `failed` is itself best-effort (`kb-sources.service.ts:221`
`.catch(() => undefined)`). F3.

### PRD-C134 — queries/cache/workers → **NOT MET**

Walked each dimension the criterion names:

- **Revision/search plans** — NOT RUN by the prior report. **Measured.** See §6. The article/page search plan
  materialises the entire match set on every request because of `count(*) OVER ()`; the vector-retrieval plan
  is structurally wrong at scale. F1, F2.
- **Ingestion leases/retries/DLQ** — the prior report said "absent". **Correction: present for pages/articles**
  (§2.1), **absent for sources/attachments** (F3).
- **Chunk dedupe** — NOT AUDITED by the prior report. **Audited.** It is mostly *right*: `sha256` is taken over
  the **source text** (`kb-indexing.service.ts:88, 209`), not the rejoined chunks, matching backend CLAUDE.md §7;
  an unchanged hash skips re-embedding and only rewrites the ACL columns (`:103-116`, `:219-232`);
  `embedChunksWithResumption` reuses per-chunk checkpoints so a retry does not re-pay. **Two real gaps:**
  the checkpoint key omits `embedding_model` (F5), and `indexSource`/`indexAttachment` bypass the
  hash/checkpoint machinery entirely — they unconditionally delete and re-embed every chunk (F4).
- **Permission-aware cache keys** — the prior report verified these correct. I did not re-derive; I confirmed
  the frontend half it did not look at, and it is also correct: `scopedQueryKeyHashFn(scope)` in
  `components/providers/query-provider.tsx:50` hashes every key under `authenticated:<orgId>:<userId>`, and
  `queryClient.clear()` fires on org switch (`hooks/common/auth-hooks.ts:170`) and sign-out (`:125`).
  `queryKeys.kb.pagesSearch(q, aclVersion)` additionally carries a space-membership ACL dimension.
  **No finding.**
- **Purge/reindex** — `POST /kb/pages/reindex-all` is an unbounded, un-idempotent, credit-spending loop held
  inside the request transaction, and `check:placement-bypass` cannot see it. F7, F8.
- **Realistic-corpus latency** — NOT RUN by the prior report. **Measured.** §6.

### PRD-C135 — frontend/TanStack/tests → **PARTIALLY MET**

- **Editor/revision conflicts** — NOT RUN by the prior report. **Audited, and head mostly gets this right:**
  `kb-pages.service.ts:212-236` implements a `contentRevision` compare-and-swap returning
  `409 {code:"STALE_REVISION"}`, and `features/wiki/components/page-document.tsx:145-174` sends
  `expectedContentRevision`, latches on 409 and offers a Reload action. **But the autosave loses writes in two
  ways that have nothing to do with the conflict path** — F10.
- **Search cursors** — NOT RUN. **Audited.** Mixed: revision history is a real cursor
  (`hooks/api/kb/pages.ts:213-231`, `nextCursor`); chat history and conversations take `cursor`
  (`dto/kb-ai.schemas.ts:31-52`); **article search is OFFSET pagination with no page ceiling** (F2);
  **`GET /kb/pages/search` and `GET /kb/sources` have no pagination at all** — hard `LIMIT 20` and
  `LIMIT 100` respectively (`kb-pages.service.ts:311`, `kb-sources.service.ts:30,61`), so a tenant past
  100 sources can never see the rest.
- **Permission changes** — NOT RUN. **Audited.** `/knowledge` and `/knowledge/wiki/**` are declared universal
  by design (`lib/rbac/route-access/universal-routes.ts:84-98`, with a written reason); administrative
  subtrees are gated in `route-access-extensions.ts:90-127`. Every KB read hook carries
  `enabled: useCan("kb:…")`. Coherent. The prior report's note that `<RequireModule module="kb">` is a no-op
  stands — it is redundant, not wrong.
- **Citations/source integrity** — verified sound except for the restriction dimension. F9.
- **Ingestion states** — NOT RUN. **Audited, and it is a live defect:** `hooks/api/kb/sources.ts:30-31`
  polls every 3 s for as long as any source is `processing`, with no ceiling, no backoff and no retry action —
  and the backend has no reclaimer for a stranded `processing` row. F3.
- **ACL/purge/reindex E2E** — **NOT MEASURED.** See §7.
- **`features/wiki/**` and `features/help-centre/**`** — the prior report did not audit these. I did:
  86 files enumerated, the editor/autosave path and the sources/ingestion path read line-by-line,
  error-boundary policy traced. Findings F10; and a positive result in §5.

---

## 4. Findings

| # | Sev | Location | Summary |
|---|---|---|---|
| F1 | **P0** | `src/modules/kb/retrieval/kb-candidate.service.ts:26-38` | Vector retrieval silently returns ~21% of the requested candidate pool once a tenant's chunk table is large enough for the planner to choose the HNSW index. Measured. |
| F2 | **P1** | `src/modules/kb/retrieval/kb-search.service.ts:120-126` | `count(*) OVER ()` materialises the entire match set on every search request, page 1 included; `page` has no ceiling. Measured: 32 MB of temp spill on a 50 k-row match set. |
| F3 | **P1** | `src/modules/kb/wiki/kb-sources.service.ts:84,155,221` + `frontend/hooks/api/kb/sources.ts:30` | Source ingestion has no lease, no retry, no DLQ and no reclaimer; a stranded `processing` row makes the UI poll every 3 s forever. |
| F4 | **P1** | `src/modules/kb/retrieval/kb-attachment-indexing.service.ts:54,152,235` | `indexSource` / `indexAttachment` / `indexPageDocument` bypass the content-hash short-circuit and the resumption checkpoints entirely — every call re-embeds and re-charges. |
| F5 | **P1** | `src/modules/kb/retrieval/kb-ingestion-checkpoint.service.ts:15-37` | The resumption checkpoint key omits `embedding_model`; on a model change, old-space vectors are silently reused and stamped with the new model name. |
| F6 | P2 | `src/modules/kb/retrieval/kb-ingestion-checkpoint.service.ts` | `kb_ingestion_checkpoints` holds a full 1536-float vector per chunk and is cleared only on ingestion success. No sweeper, no retention. |
| F7 | **P1** | `src/modules/kb/retrieval/kb-page-indexing.controller.ts:42-54` | `POST /kb/pages/reindex-all` runs up to 100 sequential embedding round trips inside one request transaction, and `check:placement-bypass` does not see it. |
| F8 | **P1** | `src/modules/kb/wiki/kb-sources.controller.ts:43,62` | The four credit-spending KB write routes carry no `@Idempotent` and no content dedupe: a retried upload double-charges embedding credits. 6 of 94 KB mutating handlers are idempotent. |
| F9 | P2 | `src/modules/kb/retrieval/kb-ask.service.ts:273-289` | Post-answer citation re-verification omits `articleRestrictionFilter`, the dimension retrieval applies on the way in. |
| F10 | **P1** | `frontend/features/wiki/components/page-document.tsx:134-175` | Wiki autosave silently discards edits: a title patch is clobbered by a body patch within the 1500 ms window, and no flush happens on unmount or tab close. |
| F11 | P2 | `src/modules/kb/…` / live catalog | Four natural/composite keys break the module's own tenant-prefixed convention. |
| F12 | P2 | `src/modules/kb/retrieval/kb-candidate.service.ts:85-93, 168-174` | The two vector-candidate queries carry **no** explicit tenant predicate — `orgId` reaches only the catch-block logger. Tenancy rests entirely on RLS. |
| F13 | P2 | `src/modules/kb/retrieval/kb-indexing.service.ts:322-325` | `reindexAllPages(orgId?)` has a live branch with no org predicate at all. Unreachable from HTTP today. |
| F14 | P2 | `src/modules/kb/core/kb-events.service.ts` callers | `kb_events` takes a row per article view and per search, awaited inside the request transaction, with no retention. |

---

### F1 — P0 — vector retrieval returns 21% of what it asks for at realistic tenant size

**File:** `src/modules/kb/retrieval/kb-candidate.service.ts:26-38` (and the index
`idx_kb_chunks_embedding_hnsw`, which is on `embedding` alone with no tenant partition).

```ts
async vectorChunkIds(vector: string, cap: number): Promise<number[]> {
  if (cap === 0) return [];
  await this.db.execute(sql`SET LOCAL hnsw.iterative_scan = relaxed_order`);
  const annRows = await this.db.execute(
    sql`SELECT id FROM public.kb_article_chunks ORDER BY embedding <=> ${vector}::vector LIMIT ${cap}`,
  );
  const annIds = annRows.map((r) => Number(r["id"]));
  if (annIds.length > 0) return annIds;              // <-- the bug is this condition
  const fenceRows = await this.db.execute(
    sql`SELECT app.search_kb_chunk_ids(${vector}::vector, ${cap}) AS id`,
  );
  return fenceRows.map((r) => Number(r["id"]));
}
```

The `org_id` restriction is supplied by RLS (`kb_article_chunks.tenant_isolation`,
`org_id = app.current_org_id()`), i.e. as a **post-filter on top of the HNSW scan**.

**Measured** (§6, synthetic corpus, target tenant = 25,200 of 54,000 chunks, request `LIMIT 240`):

| setting | rows returned |
|---|---|
| `hnsw.iterative_scan = relaxed_order` — **what the code sets** | **50** |
| `hnsw.iterative_scan = strict_order` | 50 |
| `hnsw.iterative_scan = off` | 15 |
| `relaxed_order` + `hnsw.ef_search = 400` | 50 |
| `relaxed_order` + `hnsw.ef_search = 1000` | 50 |
| `relaxed_order` + `hnsw.max_scan_tuples = 200000` | 50 |
| `app.search_kb_chunk_ids` fence (SECURITY DEFINER, explicit `org_id` predicate) | **50** |
| exact scan, HNSW disabled | **240** ✓ |

Plan for the failing case:
```
Limit (actual rows=50.00)  Buffers: shared hit=482 read=338
  -> Index Scan using idx_kb_chunks_embedding_hnsw on kb_article_chunks (actual rows=50.00)
       Filter: (org_id = app.current_org_id())
       Rows Removed by Filter: 1103
```

At the *small* end (a 1,200-chunk tenant in the same table) the planner chooses a bitmap scan on
`idx_kb_chunks_org_page` + top-N heapsort instead and returns the full 240 — **so the defect only appears
above a corpus-size threshold**, which is why it survives every test and every demo tenant.

**Failure scenario.** A tenant with a real knowledge base asks `POST /kb/ask "what is the expense policy"`.
`retrieveTopArticles` asks `vectorChunkIds` for `pool*4 = 72` candidates for articles and again for pages;
`retrieveTopSources` asks for `limit*4`. Each returns roughly a fifth of the requested set, drawn from the
HNSW entry region rather than the tenant's true nearest neighbours. The relevant chunk is not in the pool,
the model is handed context that does not contain the answer, and the user is told
*"I don't have that information — try opening a support ticket."* No error, no log line, no metric. The system
reports success. Retrieval quality degrades monotonically as the corpus grows, which is the opposite of what
anyone building a knowledge base expects.

The fallback fence never fires: it is gated on `annIds.length > 0`, and 50 > 0.

**`kb-hnsw-iterative-scan.spec.ts` (33 suites green) does not catch this.** It is a string-matching mock —
it asserts the SQL text contains `SET LOCAL hnsw.iterative_scan = relaxed_order`, that the SET precedes the
ANN query, and that the fence fires only when the ANN returns zero rows. It certifies that the mechanism is
*invoked*; it cannot and does not measure recall. This is the "gates report green over unread code" shape
from the project's own memory, in a spec written specifically about this line.

**Proposed fix.** Neither `iterative_scan`, `ef_search`, `max_scan_tuples` nor the SECURITY DEFINER fence
changes the plan shape, so no tuning knob will fix it. Two options that will:
1. **Partition `kb_article_chunks` by `org_id`** (hash or list) and build the HNSW index per partition. The
   org predicate then becomes partition pruning and HNSW top-k runs inside the tenant. This is pgvector's
   documented answer to multi-tenant filtering, and it makes both the recall and the cost correct.
2. **Short term, before partitioning lands:** change the fence condition from `annIds.length > 0` to
   `annIds.length >= cap`, and make the fence do an exact scan (`SET LOCAL enable_indexscan = off` inside the
   function, or an explicit `ORDER BY … ` over a materialised org-scoped CTE). Measured cost of the exact plan
   at 25,200 tenant chunks: 119 ms and 101,896 buffers — correct but ~800 MB of reads per query, and
   `/kb/ask` issues three of them. Acceptable as a stopgap, not as the destination.
Either way, add a recall assertion to `kb-hnsw-iterative-scan.spec.ts` that runs against a seeded corpus
rather than a string mock, or the same regression returns.

---

### F2 — P1 — search materialises the whole match set on every request

**File:** `src/modules/kb/retrieval/kb-search.service.ts:120-126`, with
`src/modules/kb/retrieval/dto/kb-ai.schemas.ts:7` and `src/common/pagination/list-query.schema.ts:6`.

```ts
totalCount: sql<string>`count(*) OVER ()`,
…
.orderBy(desc(this.candidates.keywordRank(tsquery)), desc(kbArticles.updatedAt))
.limit(input.pageSize)
.offset(offset);
```

`pageSizeField(20, 50)` caps the page at 50. `pageNumberField = z.coerce.number().int().min(1).default(1)` —
**no `.max()`**. So `?page=100000000&pageSize=50` is a valid request producing `OFFSET 5,000,000,000`.

**Measured** on a 50,000-page tenant, same query shape:

| request | plan | buffers | temp | time |
|---|---|---|---|---|
| page 1 (`OFFSET 0`) | `Limit → Sort(top-N) → WindowAgg (rows=50,000)` | 2,638 | read 2,496 / written 1,483 (**≈32 MB spill**) | 51.7 ms |
| page 900 (`OFFSET 44,950`) | `Limit → Sort (external merge, Disk: 2456 kB) → WindowAgg (rows=50,000)` | 2,632 | read 2,803 / written 1,791 | 71.0 ms |

The `count(*) OVER ()` window is what forces the WindowAgg to emit all 50,000 matching rows **before** the
top-N sort. The cost is O(match set), not O(page size) — **on page 1**, for every caller.

**Failure scenario.** A tenant with 200 k articles; a user searches a common word ("policy") that matches
60% of the corpus. Every keystroke-triggered search (the hook has `staleTime: 0`) drives a full
materialisation and disk spill. Ten concurrent users on that tenant saturate `temp_file` I/O for everyone on
the instance. Separately, an unauthenticated-looking scripted `page=` sweep is a cheap amplification against
a `GET` route that only needs `kb:articles:view`.

**Proposed fix.** (a) Cap `pageNumberField` — a `.max()` bounding `page * pageSize` to the same ceiling other
list routes use. (b) Replace `count(*) OVER ()` with either a separate capped count
(`SELECT count(*) FROM (… LIMIT 10000) s`, reporting "10,000+") or a keyset cursor, matching what
`kb_page_versions` already does. The existing `else` branch at `:132-137` already runs a separate count query
for the empty-page case, so the shape is half-built already.

---

### F3 — P1 — source ingestion strands, and the UI hot-loops on it forever

**Files:** `src/modules/kb/wiki/kb-sources.service.ts:84, 155, 221`;
`src/common/tenant/tenant-context.interceptor.ts:145-157`;
`frontend/hooks/api/kb/sources.ts:30-31`.

The full chain, verified end to end at head:

1. `createNote` / `createFile` insert `kb_sources` with `status:"processing"` and register the indexing work
   via `registerAfterCommit`. **No outbox event is emitted** — unlike pages and articles, which do (§2.1).
2. `tenant-context.interceptor.ts:151` fires each hook as `void run().catch(…)` — **detached**, after the
   response has been returned, with no shutdown drain.
3. If the process is killed between commit and drain (deploy, OOM, SIGTERM), the hook never runs. There is no
   lease, no attempt counter, no reclaimer and no timeout for `kb_sources`. The row stays `processing` forever.
4. Even inside the hook, the failure branch writes the `failed` status through
   `.catch(() => undefined)` (`kb-sources.service.ts:221`) — a failure to record a failure is silent, and again
   leaves the row at `processing`.
5. The frontend then does this, forever:
   ```ts
   refetchInterval: (query) =>
     query.state.data?.some((s) => s.status === "processing") ? 3000 : false,
   ```
   No ceiling, no backoff, no terminal state, and **no retry mutation exists** — `hooks/api/kb/sources.ts`
   exposes upload, create-note and delete only.

**Failure scenario.** A user uploads a 20 MB PDF at 14:59. A deploy restarts the API at 15:00. The upload
succeeded (the row and the R2 object both exist), so the user sees the source listed as "Processing…". It
stays that way permanently. Every open Sources sheet in that tenant issues `GET /kb/sources` every 3 seconds
— 0.33 rps per open tab, indefinitely — and the source is never indexed, so `/kb/ask` silently ignores it.
The user's only recourse is to delete and re-upload, which re-charges embedding credits (F8).

**Proposed fix.** Emit `kb.content.index` from `createNote`/`createFile` the way `kb-pages.service.ts:253`
already does, and let `KbIngestionConsumer` — which already has the lease, the retry count and the
dead-letter branch — own it. `KbSourceAdapter` is already registered in `kb-ingestion-consumer.ts:51`, so the
consumer side needs no new code. Add a terminal `dead_lettered` status so the UI can stop polling and offer a
retry; bound `refetchInterval` with backoff and a ceiling regardless.

---

### F4 — P1 — three indexing paths re-embed and re-charge unconditionally

**File:** `src/modules/kb/retrieval/kb-attachment-indexing.service.ts:54, 152, 235`.

`kb-indexing.service.ts` does dedupe properly: hash the source text, compare against the stored chunk's
`content_hash`, and if it matches, update only the ACL columns and return without touching the provider
(`:103-116`, `:219-232`). It also routes through `embedChunksWithResumption`, which reuses per-chunk
checkpoints.

`KbAttachmentIndexingService` does neither. All three of `indexSource`, `indexAttachment` and
`indexPageDocument` call `embedInBatches` directly — no hash comparison, no `loadCheckpoints`, no
`saveCheckpoints` — then `DELETE` and re-`INSERT` the whole chunk set. `content_hash` is left NULL on every
row they write.

**Failure scenario.** `POST /kb/articles/:id/reindex-all` (already allowlisted as an unaudited
provider-in-transaction site) walks every article and calls `indexAttachment` for each. Run it twice — as an
operator would while debugging a retrieval complaint — and every attachment in the tenant is re-embedded and
re-billed at full price, with byte-identical inputs. The same is true of every source re-upload.

A second consequence: because these rows are written with no `aclRevision`, they take the column default `1`.
`articleVectorCandidates` inner-joins `eq(kbArticleChunks.aclRevision, kbArticles.aclRevision)`
(`kb-candidate.service.ts:100`). Once an article's ACL revision has moved past 1 — which
`bumpSpaceAclRevision` does on any space membership change — an attachment indexed *afterwards* is written at
revision 1, does not match, and is **excluded from vector retrieval permanently**, until the next
unrelated space-wide bump happens to resync it via `syncAclRevisionForSpace`.

**Proposed fix.** Route all three through the same `sha256(text)` → `loadArticleChunkState` → skip-if-unchanged
→ `embedChunksWithResumption` path `kb-indexing.service.ts` already uses, and write `contentHash` and the
parent's current `aclRevision` on every inserted row.

---

### F5 — P1 — resumption checkpoints are not keyed by embedding model

**File:** `src/modules/kb/retrieval/kb-ingestion-checkpoint.service.ts:15-37`; live table
`kb_ingestion_checkpoints` (columns confirmed: `id, org_id, content_type, content_id, content_hash,
chunk_index, content, embedding, created_at` — **no `embedding_model`**).

`loadCheckpoints` matches on `(org_id, content_type, content_id, content_hash)`. `EMBEDDING_MODEL` is a
compile-time constant (`src/modules/ai/core/providers/embeddings.service.ts:4 = "text-embedding-3-small"`).
`replacePageBodyChunks` then stamps every row with the *current* `EMBEDDING_MODEL`
(`kb-chunk-repository.ts:185`) regardless of which model produced the vector it is storing.

**Failure scenario.** The team upgrades to `text-embedding-3-large`. Any content whose ingestion was
interrupted before the upgrade has checkpoints in the old vector space. On the retry, `loadCheckpoints` hits
on `content_hash` (the text did not change), returns old-space vectors, and they are inserted into
`kb_article_chunks` labelled `embedding_model = 'text-embedding-3-large'`. They now sit in the same HNSW index
as genuine new-model vectors. Cosine distance between two different embedding spaces is meaningless, so those
chunks return effectively random similarity — and because `uniq_kb_chunks_page_revision` includes
`embedding_model`, the database considers them perfectly well-formed. If the dimensions differ, the insert
throws instead, which at least fails loudly.

**Proposed fix.** Add `embedding_model` to `kb_ingestion_checkpoints`, include it in
`uniq_kb_ingestion_checkpoint` and in the `loadCheckpoints` predicate. (Migration; reported, not made.)

---

### F6 — P2 — checkpoint table grows without bound

`clearCheckpoints` is called from exactly two places — inside `replaceArticleBodyChunks` and
`replacePageBodyChunks` (`kb-chunk-repository.ts:155, 195`), i.e. only on ingestion **success** — plus GDPR
subject erasure. There is no cron, no retention, no sweeper (grepped: zero matches for
`kb_ingestion_checkpoints` under any cron/sweep/purge/retention path). Each row holds a full 1536-float
vector plus the chunk text. Every permanently-failed or dead-lettered ingestion leaves its checkpoints behind
forever. **Fix:** a retention sweep on `created_at` older than the outbox's dead-letter horizon.

---

### F7 — P1 — `reindex-all` is 100 provider round trips inside one request transaction, invisible to the gate

**File:** `src/modules/kb/retrieval/kb-page-indexing.controller.ts:42-54` →
`kb-indexing.service.ts:322-343`.

```ts
for (const page of batch)
  await this.indexPage(page.orgId, page.id);   // REINDEX_ALL_BATCH_SIZE = 100
```

`indexPage → this.embed → embedChunksWithResumption(deps, request) → aiGateway.embedBatchWithCredit`. The
handler carries no `@NoTenantTransaction`, so all of it runs inside the request transaction that
`TenantContextInterceptor` opened, against the 60 s `idle_in_transaction_session_timeout` that `withTenant`
sets. `POST /kb/pages/:pageId/reindex` has the same shape at 1×.

**`check:placement-bypass` does not see either of them.** I confirmed this against the gate's own output at
head: 147 bypass sites, 45 `provider-in-transaction` entries, and **zero mentions of
`kb-page-indexing.controller.ts`**. The gate models the static call chain and loses it at
`embedChunksWithResumption`, a free function that receives the gateway as a property of a `deps` object
rather than as a class member. (The same output reports `registerAfterCommit 0` while KB alone has four —
that detector appears inert too.) This is a second demonstrated reach gap in a gate the prior report relied on,
alongside the `void`-promise gap it found.

**Failure scenario.** An admin clicks "Reindex all" on a tenant with 100 pages of real content. Ten to sixty
seconds in, `idle_in_transaction_session_timeout` kills the transaction while the pooled connection is still
checked out mid-embed. Under pool pressure this is a tenant-wide 500, not a slow request. Meanwhile every
embed already issued has been billed.

**Proposed fix.** `@NoTenantTransaction()` on both handlers plus `@UseInterceptors(AiRequestAbortInterceptor)`,
following the pattern `kb-ask.controller.ts` now uses; and better, emit `kb.content.index` per page and let the
outbox consumer drain them — the consumer already exists and already leases. Separately, teach
`check-placement-bypass.mjs` to follow a deps-object indirection, or the next one of these lands unseen too.

---

### F8 — P1 — the credit-spending KB routes have no idempotency key

**Files:** `src/modules/kb/wiki/kb-sources.controller.ts:43` (`POST /kb/sources`), `:62`
(`POST /kb/sources/note`); `kb-page-indexing.controller.ts:29,42`; `kb-media.controller.ts`; `kb-ask.controller.ts`.

**6 of 94** KB mutating handlers carry `@Idempotent` (repo-wide: 245 across all controllers). The six are
publish, review approve/reject, import and article migration — none of the six is a route that spends money.
Every route that calls the AI gateway with `charge: true` lacks one:

| route | provider call | idempotent? |
|---|---|---|
| `POST /kb/sources` | `embedBatchWithCredit` | no |
| `POST /kb/sources/note` | `embedBatchWithCredit` | no |
| `POST /kb/media` | `embedBatchWithCredit` | no |
| `POST /kb/pages/:id/reindex` | `embedBatchWithCredit` | no |
| `POST /kb/pages/reindex-all` | up to 100 × `embedBatchWithCredit` | no |
| `POST /kb/ask` | `invokeTextWithUsage` | no |

For pages and articles the content-hash short-circuit accidentally covers most of the retry case. For
**sources it does not**: each `POST /kb/sources` inserts a *new* `kb_sources` row, so the checkpoint key
(`contentId`) is different and the embed is paid in full again. F4 means the attachment paths have no
short-circuit at all.

**Failure scenario.** A user on a phone uploads a 20 MB PDF. The request times out at the client while the
server is still embedding. The client retries. Two `kb_sources` rows exist, two full embed batches are billed,
and both appear in retrieval as duplicate sources — so `/kb/ask` cites the same document twice.

**Proposed fix.** `@Idempotent("kb.source.create")` / `"kb.source.note"` / `"kb.page.reindex"` /
`"kb.pages.reindex-all"` / `"kb.ask"`. Note the project memory: `@Idempotent` routes 400 without the header, so
the frontend `apiClient.upload`/`post` calls must send one in the same change.

---

### F9 — P2 — citation re-verification omits article restrictions

**File:** `src/modules/kb/retrieval/kb-ask.service.ts:273-289`.

`resolveVisibleArticles` re-applies org, `inArray(spaceId, accessibleSpaceIds)`, `status='published'` and the
owner DataScope. It does not re-apply `KbCandidateService.articleRestrictionFilter`, which
`retrieveTopArticles` applies at `kb-search.service.ts:235` for non-admins.

**Failure scenario.** The asker retrieves article A (unrestricted). During the provider call an admin adds a
`kb_article_restrictions` row scoping A to the Finance role. The re-verification pass — whose whole purpose is
to catch exactly this — passes A, and A is returned as a citation with title and slug to a user who can no
longer open it. Narrow window; title/slug disclosure only, since the article body is fetched through the
gated read route. **Fix:** push `articleRestrictionFilter(user.orgId, principal)` into
`resolveVisibleArticles`' conditions for non-admins, mirroring `:235`.

---

### F10 — P1 — the wiki autosave silently discards edits

**File:** `frontend/features/wiki/components/page-document.tsx:134-175`, and the unmount effect at `:107-111`.

```ts
function scheduleAutosave(patch) {
  …
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);   // :143
  setSaveState("pending");
  const revisionSnapshot = contentRevisionRef.current;
  saveTimerRef.current = setTimeout(() => { … updatePage.mutate({pageId, ...patch, …}) }, 1500);
}
```

Two independent losses:

**(a) Patch clobbering.** `handleTitleChange` calls `scheduleAutosave({title})`; `handleEditorChange` calls
`scheduleAutosave({content, contentText})`. They share **one** timer, and the second call cancels the first
and schedules a payload containing **only its own patch**. There is no merge of the pending patch. Rename a
page, then type in the body within 1.5 s — the standard "create a page and start writing" flow — and the
title change is never sent. The UI keeps showing it (`localTitle` reads from `titleDraft` state), so nothing
looks wrong until the page is reloaded.

**(b) No flush on teardown.** The cleanup at `:107-111` only `clearTimeout`s. There is no `onBlur` flush, no
`beforeunload` handler, no `visibilitychange` handler. Navigate to another page, close the tab, or follow a
link within 1.5 s of the last keystroke and the pending save is discarded silently.

**Failure scenario.** A user writes two paragraphs, hits ⌘W. `saveState` was `"pending"`; the timer is cleared
on unmount; the paragraphs are gone. This is user-visible data loss on the flagship editor.

A third, milder issue in the same function: `conflictRef.current = true` latches on a 409 and blocks **all**
further autosaves until the Reload action in the toast is clicked. Dismiss the toast and the editor keeps
accepting keystrokes with `saveState` showing `"idle"` while saving nothing.

**Proposed fix.** Keep a `pendingPatchRef` that merges successive patches and is drained by the single timer;
flush it from the unmount cleanup and from a `beforeunload` / `visibilitychange` listener; and render a
persistent, non-dismissible banner (not a toast) while `conflictRef.current` is true.

---

### F11 — P2 — four keys break the module's tenant-prefixed convention

Verified against the live catalog:

| object | key | issue |
|---|---|---|
| `kb_article_versions` | `uniq_kb_article_versions (article_id, version_number)` | not tenant-prefixed |
| `kb_page_versions` | `uniq_kb_page_versions_page_version (page_id, version_number)` | not tenant-prefixed |
| `kb_space_grants` | — | no `uniq_kb_space_grants_org_id (org_id, id)`; nothing can form a composite FK to it |
| `kb_ingestion_checkpoints` | — | same |

Not exploitable — `article_id` / `page_id` are globally unique sequences — but the convention is what makes
the composite-FK guarantee auditable, and these are the four holes in an otherwise perfect 104/104 sweep.

---

### F12 — P2 — the two vector-candidate queries carry no explicit tenant predicate

`kb-candidate.service.ts:85-93` (`articleVectorCandidates`) and `:168-174` (`pageVectorCandidates`) build
their `where` from `inArray(chunkIds)`, `isNotNull(articleId|pageId)`, an ACL expression and a space filter.
Neither adds `eq(kbArticleChunks.orgId, orgId)` or `eq(kbArticles.orgId, orgId)` / `eq(kbPages.orgId, orgId)`.
In `pageVectorCandidates` the `orgId` parameter reaches **only** the catch-block logger at `:190`.
`chunkVisibleTo` → `visibleTo` adds `eq(columns.orgId, …)` only on the `isOrgOwner` branch
(`kb-page-visibility.ts:20-22`), so a normal member's query has no tenant term at all.

The sibling keyword paths (`articleKeywordCandidates:52`, `pageKeywordCandidates:138`) *do* carry it, so this
is an inconsistency rather than a considered choice. Tenancy currently rests entirely on RLS. Note
`kb_pages`' policy is `(org_id = app.current_org_id_or_null()) OR (public_token = app.current_public_token_or_null())`
— a second admission branch — and `pageVectorCandidates`' `innerJoin(kbPages, …)` omits `org_id` from the join
condition too. Not exploitable today (a chunk in your org cannot point at a page in another), but it is the
exact "org_id dropped from a join" shape this codebase has shipped before. **Fix:** add the explicit
`eq(…​.orgId, orgId)` terms and put `org_id` in both join conditions, matching backend CLAUDE.md §4.

Same shape in `kb-indexing.service.ts:301-318` (`syncAclRevisionForSpace`): the `UPDATE … FROM kb_pages p`
constrains `c.org_id` but not `p.org_id`; and `kb-search.service.ts:312`'s
`leftJoin(kbPages, eq(kbPages.id, kbArticleChunks.pageId))` omits `org_id`.

---

### F13 — P2 — `reindexAllPages` has a live no-org-predicate branch

`kb-indexing.service.ts:322-325`:
```ts
const where = orgId
  ? and(eq(kbPages.orgId, orgId), gt(kbPages.id, afterPageId), …)
  : and(gt(kbPages.id, afterPageId), ne(kbPages.status, "archived"), isNull(kbPages.deletedAt));
```
The only caller passes `user.orgId` (`kb-page-indexing.controller.ts:53`), so the branch is unreachable from
HTTP today. It is a cross-tenant read waiting for a second caller — a cron, a script, an admin tool. **Fix:**
make `orgId` required, or delete the branch.

---

### F14 — P2 — `kb_events` is an unbounded write on read paths

`kb-articles.service.ts:65` writes a `view` row on every article GET; `kb-search.service.ts:144` writes a
`search` or `search_no_results` row on every search GET. Both are `await`ed inside the request transaction.
`KbEventsService.record` now opens `runInTenantTransaction` of its own. There is no retention path anywhere —
`kbEvents` is read only by `kb-analytics.service.ts`. **Consequences:** the two hottest KB read routes cannot
be served from a read replica; the table grows one row per page view forever. **Fix:** a retention window
aligned to the analytics range selector, and move the write off the request path.

---

## 5. What head already gets right (verified, not assumed)

1. **Tenant-composite integrity is real and complete.** 104 foreign keys from `kb_*` tables; 86 tenant-composite,
   18 to the `users` root, **0 non-composite**. 32 of 32 real `kb_*` tables have `org_id`, RLS enabled and
   exactly one `tenant_isolation` policy. This is the criterion C133 exists to check and it passes cleanly.
2. **The vector fence functions are correctly scoped.** `app.search_kb_chunk_ids` and `app.search_kb_page_ids`
   are `SECURITY DEFINER` and owned by the superuser, so they *could* have bypassed RLS — both carry an
   explicit `WHERE … org_id = app.current_org_id()` in the function body, and `app.current_org_id()` raises
   `42501` rather than returning NULL when the GUC is unset. Verified by reading `pg_get_functiondef`.
3. **Pages and articles have a genuine durable ingestion pipeline** — transactional outbox, Redis lease with
   token-checked release, per-org concurrency cap, retry count and dead-letter branch, structured timing logs.
   The prior report missed this entirely.
4. **Content-hash dedupe on the body-indexing path is correct.** The hash is over the source text, not the
   rejoined chunks (backend CLAUDE.md §7), and the ACL-only path exists precisely so a restriction change does
   not strand chunks — the comment at `kb-indexing.service.ts:100-102` documents a previous bug of exactly that
   shape, now fixed.
5. **Optimistic concurrency on page edits works end to end.** Backend compare-and-swap on `content_revision`
   returning `409 STALE_REVISION` (`kb-pages.service.ts:212-236`); frontend sends `expectedContentRevision`,
   latches, and offers Reload (`page-document.tsx:145-174`); four specs pin it
   (`hooks/api/kb/pages.concurrency.test.ts`).
6. **Frontend cache isolation is sound.** `scopedQueryKeyHashFn("authenticated:<orgId>:<userId>")` scopes
   *every* query key hash by org and user (`query-provider.tsx:50`), belt-and-braces with `queryClient.clear()`
   on org switch and sign-out. The missing org segment in the key arrays is not a defect.
7. **A read error does not masquerade as an empty state.** I expected the classic shape at
   `wiki-shell.tsx:42` (`const { data: treeNodes = [] } = useKbPagesTree()`, `isError` never destructured).
   It is not a defect: `throwOnError: readErrorReachesBoundary` (`query-provider.tsx:49`,
   `lib/query-error-policy.ts:23-38`) routes a never-loaded read's failure to
   `app/(authenticated)/knowledge/error.tsx`, and suppresses the throw only once `data !== undefined`
   (stale-while-error) or for 401/403-org/abort. Correct on both halves.
8. **Route-level RBAC for `/knowledge` is deliberate and documented**, with universal read and explicitly
   gated administrative subtrees (`universal-routes.ts:84-98`, `route-access-extensions.ts:90-127`).
9. **33/33 KB retrieval suites, 279/279 tests green** at head.

---

## 6. The measurement — how it was taken, and its limits

The shared `scratch_head_1010` / `scratch_cold_1010` databases are at journal head but **empty** (0 rows in
`kb_article_chunks`, `kb_pages`, `kb_articles`, `kb_sources`, `organizations`), so no latency claim can be made
against them. Rather than seed a database 25 other agents are reading, I built an isolated one:

**`postgresql://tarunchintakunta@localhost:5432/kb_perf_t16`** — left in place so the fix wave can reproduce
or extend it; drop it when done.

- pgvector **0.8.6**. `hnsw.iterative_scan` is a recognised GUC and accepts `relaxed_order`.
- `kb_article_chunks` recreated with the live column list and the live index set, including
  `USING hnsw (embedding vector_cosine_ops)` and `(org_id, page_id)`.
- RLS modelled exactly: `ENABLE ROW LEVEL SECURITY`, policy `org_id = app.current_org_id()`, and a
  non-superuser role (`app_probe`) so the policy actually applies. Every probe ran as `app_probe` with
  `SET LOCAL app.organization_id`.
- **54,000 chunks** at dimension 1536 across 25 orgs. `org_00` = 25,200 (a large tenant); `org_01` = 1,200
  (a small one).
- **50,000 `kb_pages`** rows with a generated `fts` tsvector and a GIN index, for the search-plan probe.

**Limits I am not going to paper over.** The vectors are uniform random. In 1536 dimensions that makes all
pairwise distances nearly identical, which is adversarial for HNSW — real embeddings cluster, and per-tenant
clustering will change the *absolute* recall number. What does transfer, and what the finding rests on, is the
**plan shape**: with an `org_id` restriction supplied as a filter, Postgres chooses
`Index Scan using idx_kb_chunks_embedding_hnsw … Filter: (org_id = …)` and terminates early, and **no setting
I could find changes that** — `iterative_scan` off/relaxed/strict, `ef_search` 40/400/1000,
`max_scan_tuples` 200 k, and the SECURITY DEFINER fence all returned the same 50 rows. The exact-scan buffer
count (101,896 buffers ≈ 800 MB for a 25,200-chunk tenant) is a direct function of row width and count and
transfers directly.

**The measurement that would settle it on real data:** seed one `perf_kb_*` tenant with production-shaped
embeddings from `text-embedding-3-small` at 25 k+ chunks alongside several other tenants, then compare
`vectorChunkIds(v, 240)` against a brute-force `ORDER BY embedding <=> v LIMIT 240` over the same org and
report recall@240. That is a ~20-minute job on a machine that is not running 26 agents.

---

## 7. Blocked on infrastructure — NOT MEASURED

- **ACL / purge / reindex E2E (C135).** The seeded e2e suite needs a dedicated local Postgres with pgvector, a
  non-owner `APP_DATABASE_URL` and ~12 GB (project memory: *local-seeded-e2e*, *seeded-e2e-contention*). Not
  runnable under a 24 GB / 26-agent budget. What would measure it: the KB slice of the seeded suite
  (`kb-ask.controller.e2e-spec.ts`, `kb-search.controller.e2e-spec.ts`, `kb-members.controller.e2e-spec.ts`,
  `kb-page-reviews.controller.e2e-spec.ts`) against a local seeded DB, plus a new spec that removes a user
  from a space mid-session and asserts the next `/kb/ask` cites nothing from it.
- **Real-embedding recall@k.** See §6. Requires an `OPENAI_API_KEY` with embedding quota, or a captured
  embedding fixture set.
- **Redis lease behaviour under contention.** `KbIngestionLeaseService` degrades to `unavailable` with no
  Redis, which correctly refuses ingestion — but the *contended* path and TTL expiry mid-embed (300 s TTL vs
  a 25 MB PDF) were not exercised. Needs a live Redis and two workers.
- **`check:alert-ack`** — needs a real `ALERT_WEBHOOK_URL` and a human ack; out of scope here.
- **Backend `pnpm typecheck` / `next build`** — deliberately not run per the laptop budget; the orchestrator
  runs these centrally.

---

## 8. Verdict

**PRD-C133** — partially met. The composite-integrity sweep the criterion asks for now exists and **passes**
(104/104 FKs, 32/32 RLS). The ingestion-state half does not: F3 (no reclaimer for `kb_sources`), F11 (four
convention breaks).

**PRD-C134** — not met. The two dimensions the prior report could not reach are now measured and both are
defective: the retrieval plan is structurally wrong at tenant scale (F1, P0) and the search plan is O(match set)
on every request (F2). Chunk dedupe is half-right (F4, F5). The lease/retry/DLQ dimension is met for pages and
articles and absent for sources (F3).

**PRD-C135** — partially met. Editor conflicts, search cursors, permission changes, citations and cache keys
are audited and largely correct; the autosave loses writes (F10) and the ingestion-state UI polls forever
(F3). ACL/purge/reindex E2E remains not measured.

**Top three to fix first:** F1 (retrieval silently returns a fifth of what it asks for — the product does not
work at scale), F3 (ingestion strands and the UI hot-loops on it), F10 (the editor loses typed text).
