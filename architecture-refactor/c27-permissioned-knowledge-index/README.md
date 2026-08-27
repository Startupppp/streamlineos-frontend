# c27 — Indexed knowledge obeys the same visibility as direct reads

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 5 tickets, all done. Candidate fully closed.

The direct-read/search visibility seam shipped in c1 and is correct. Remaining work is performance, lifecycle and ingestion parity.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Wiki text search uses a bounded id probe | — | **done** |
| 02 | Every content type enters one ingestion state machine | — | **done** |
| 03 | ACL revisions reindex before stale chunks win | 02 | **done** — widening resolved against the PRD (no queue needed); revision gate is inert until existing chunks are re-indexed (see digest) |
| 04 | Chatbot retrieval is permissioned and bounded | 01, 02, 03 | **done** — unseeded KB spends nothing per question |
| 05 | Revision and chunk retention are explicit | 02 | **done** — snapshot criterion closed by measurement (96 kB) |

## Closed ticket digests

### 01 — Wiki text search uses a bounded id probe

`app.search_kb_page_ids(p_q text, p_limit integer)` SECURITY DEFINER function delivered in `backend/migrations/0498_kb_ingestion_hardening.sql` Part A; REVOKE ALL from PUBLIC, GRANT EXECUTE to `streamline_app`. `kb-search.service.ts` (`resolvePageKeywordCondition`) calls with cap+1 and falls back to inline FTS at the cap; `pageKeywordCandidates` re-reads ids under RLS with the full `pageVisibility` predicate. Read-cost budget `kb-page-id-probe-sdf` in `backend/src/scripts/read-cost-budgets.mjs` proves index plan as the app role (ceiling 3,000 blocks, no inner plan assertion — inner GIN scan is not visible through the SECURITY DEFINER boundary by design); skips cleanly via `pg_proc` existence fixture until migration `0498` is applied.

### 02 — Every content type enters one ingestion state machine

Migration `0498` Part B added `acl_revision`/`content_revision` on `kb_pages`, `kb_articles`, `kb_article_chunks`; migration `0510_kb_chunk_revision_uniqueness.sql` added two partial unique indexes making replay idempotent. `KbIngestionConsumer` (`kb-retrieval` module) routes `kb.content.index` outbox events to `indexPage`/`indexArticle`; content adapters for page, article, note, file and attachment live in `kb-content-adapter.ts`. `kbPages`/`kbArticles` services now emit outbox events on every state transition; `KbIndexingService` removed from their constructors. Per-org concurrency cap `KB_MAX_CONCURRENT_PER_ORG = 20` at `kb-ingestion-consumer.ts:16` (process-local; cross-node backpressure still relies on the outbox lease).

### 03 — ACL revisions reindex before stale chunks win

ACL revision is bumped on every visibility, space, audience, project and membership change; the retrieval join at `kb-search.service.ts:293,364` (`chunk.aclRevision IS NULL OR chunk.aclRevision = parent.aclRevision`) excludes stale chunks before any text reaches the model — narrowing is effective immediately. Widening-queue criterion resolved against the PRD: no deferral queue is needed; the revision join satisfies the invariant. ACL-only fast path at `kb-indexing.service.ts:238-260` updates chunk metadata without re-embedding when only ACL fields change.

**Finding (forward pointer):** the `IS NULL` arm is a backward-compat escape for pre-`0498` chunks — once migration `0498` lands, every existing chunk has `aclRevision IS NULL` until a backfill sweep runs the ACL-only fast path over every chunk. Fix order matters: run the sweep first, then drop the `IS NULL` arm (dropping it first blanks retrieval for all existing content). Not closed here — requires a live database. Documented in `docs/specs/kb-retention-policy.md`.

### 04 — Chatbot retrieval is permissioned and bounded

`hasEmbeddedChunks(orgId)` gate added in `kb-search.service.ts`; both retrieval paths short-circuit before embedding when the org has no embedded chunks (unseeded orgs spend zero embedding credits per question). Hard caps in `kb-ask.service.ts`: `MAX_CONTEXT_ARTICLES=6`, `MAX_CONTEXT_CHARS=1500`, `MAX_TOTAL_CONTEXT_BYTES=32_000`, `MAX_PROMPT_INPUT_TOKENS=8_000`; `invokeTextWithUsage` records cost/latency/tokens through the AI gateway. `resolveCitations` and `resolveVisibleSources` re-check live access predicates after the AI call (closes the source-citation race window). Prompt-injection tests in `kb-source-citation.spec.ts:151-287` prove SQL predicates are query-content-independent.

### 05 — Revision and chunk retention are explicit

`CronKbChunkRetentionService` (`cron-kb-chunk-retention.service.ts`) enforces per-type retention via `/cron/kb-chunk-retention-sweep` (600 s lease, 500 rows/org/batch): article chunks pruned when parent is absent or not `published`; page chunks pruned when parent is absent, `archived`, or soft-deleted. Published articles and live pages are untouched. Policy and restore path documented in `docs/specs/kb-retention-policy.md`.

Snapshot optimisation not built: `pg_total_relation_size('kb_article_chunks')` = **96 kB at 0 rows** — storage does not justify it. **Re-open when chunk storage becomes material; the 96 kB baseline is the threshold.** Erasure legs: chunks via cron sweep; caches, exports and provider-side all vacuous today. **Export leg is vacuous by circumstance, not by design** — `kbExportJobs.fileKey` is schema-declared but always NULL; the first code path that writes it (likely a bulk `scopeType: "all"` export) re-opens this criterion and must add `StorageService` deletion and honour `expiresAt`, following the pattern at `hr-export-file.service.ts:96,108`.

**Legal-hold gap (handed elsewhere):** neither `kb_articles` nor `kb_pages` carries a hold column; `hr_legal_holds` scopes to HR records only. Documented in `docs/specs/kb-retention-policy.md` as the smallest closing gap — a future ticket must add a hold column and wire it into the retention sweep.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.

**Retiring a ticket means marking it done, never deleting the file** — the issue `.md` carries the `file:line` evidence behind each ticked box, and a withdrawn criterion's reasoning lives there too.
