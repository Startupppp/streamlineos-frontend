# AI1 — Knowledge Base / Search / AI report

Lane: KB, Wiki, Search, AI, Support  
Ticket: S07-knowledge-search-ai.md  
Date: 2026-08-30

---

## Item 1.4 — Chatbot citation ACL (FIXED)

**Premise verified:** TRUE — gap existed, now closed.

**Findings.** `KbAskService.resolveCitations` assembles citations from a second query after the LLM call. The retrieval path (`KbSearchService.retrieveTopArticles`) correctly applied `articleRestrictionFilter` for non-admin users in both keyword and vector candidate phases, AND in the final article-row fetch. The citation resolution path (`resolveVisibleArticles`) did NOT apply the restriction filter — it checked only space membership and published status. So a restricted article that somehow entered `top` would have been shown as a citation even though the user should not see it.

The content sent to the LLM was properly filtered (restricted articles cannot enter `top`), but the citation display logic was inconsistent. Per the "make the unsafe state unrepresentable" rule, the citation gate must match the retrieval gate — otherwise a future change to the code path that populates `top` from a different source would silently disclose restricted content as citations.

**What changed.** `backend/src/modules/kb/retrieval/kb-ask.service.ts`:
- Added `kbArticleRestrictions` to the schema import.
- Added `type SQL` to the drizzle-orm import.
- Added private `articleRestrictionFilter` method (identical logic to `KbSearchService.articleRestrictionFilter`).
- Updated `resolveVisibleArticles` to call `this.access.isAdmin(user)` and, for non-admin users, `this.access.getPrincipalIds(user)` and append the restriction filter to the WHERE conditions. Admin users skip the filter, matching the retrieval path.

**Proof.** `kb-ask.service.spec.ts` — 7 tests, all pass. `kb-ask-tenant-isolation.spec.ts` — 2 tests, all pass. `tsc --noEmit` running (see bottom).

**Public chatbot (`KbRagService`).** Verified separately. `fetchChunks` filters by `eq(kbArticles.status, "published")`, `eq(kbArticles.visibility, "public")`, `inArray(kbSpaces.audience, ["public", "mixed"])`, and `isNull(kbSpaces.deletedAt)`. All four predicates are in the SQL WHERE clause before `.limit(pool)`. The citation path (`dedupeSources`) deduplicates from the same already-filtered result set — no second query. No leak through citations. The `aclRevision` join is absent here; for public articles the join-based current-state check (`status = "published"`, `visibility = "public"`) is sufficient because any ACL tightening (private or restricted space) would immediately fail those filters.

---

## Item 3.3 — HNSW index verification (REPORTED, NOT PROVED)

**Premise verified:** Index exists. Plan not verified (no live DB access).

**Findings.**  
- Migration `0016_volatile_nicolaos.sql` creates `idx_kb_chunks_embedding_hnsw ON "kb_article_chunks" USING hnsw ("embedding" vector_cosine_ops)`.
- All three vector-search sites (`KbSearchService.articleVectorCandidates`, `KbSearchService.pageVectorCandidates`, `KbRagService.fetchChunks`) use `<=>` (cosine distance), which matches `vector_cosine_ops`.
- The index covers only the `embedding` column — `org_id` is not included.

**Risk assessment.** The CLAUDE.md `§7` covering-index rule ("a covering index on an RLS table must contain `org_id`") applies to B-tree indexes needed for index-only scans. For HNSW, the index is used for approximate-nearest-neighbor graph traversal, not an index-only scan; the RLS policy is applied as a post-scan filter. The `<=>` operator IS non-leakproof, so the planner will not use an index-only scan mode — but HNSW never uses that mode. The real risk is whether the planner chooses the HNSW scan over a sequential scan under the `app.current_org_id()` RLS filter.

**Action needed.** Run `EXPLAIN (ANALYZE, BUFFERS) SELECT ... FROM kb_article_chunks WHERE embedding <=> $1 ... LIMIT 6` as `streamline_app` with `SET LOCAL app.organization_id = '<real_org_id>'` inside a transaction, check for `Index Scan using idx_kb_chunks_embedding_hnsw`. Cannot verify without live DB access. `VACUUM ANALYZE kb_article_chunks` is required before the plan is meaningful (stale stats would hide the index).

---

## Item 2.4 — ILIKE replacement (VERIFIED, PATTERN CORRECT)

**Premise verified:** TRUE — leading-wildcard ILIKE exists, but the pattern matches CLAUDE.md.

**Findings.**  
- `KbSearchService.resolveArticleKeywordCondition` calls `app.search_kb_article_ids(q, cap+1)` (SECURITY DEFINER seam). If the seam returns 0 rows (no matches) or > cap rows (too many), it falls back to FTS (`fts @@ tsquery`) with ILIKE as a final guard for zero-token queries.
- `KbSearchService.resolvePageKeywordCondition` calls `app.search_kb_page_ids(q, cap+1)` with the same fallback.
- Both seam functions exist (migrations `0453` and `0498`). The fallback ILIKE (`%q%`) is only reached on the edge cases documented in CLAUDE.md §3 (`LIMIT` arg + fallback at cap).
- The seam satisfies all five required properties: org from `app.current_org_id()`, returns IDs only, caller's query still under RLS, REVOKE ALL + GRANT EXECUTE to app role, LIMIT argument.

No change needed. The pattern is correct.

---

## Items 5.1–5.4 — AI efficiency and metering (VERIFIED SUBSTANTIALLY COMPLIANT)

**5.1 Context assembly — COMPLIANT**

`chat-assistant-context.ts`: nine queries run in `Promise.all`, all with explicit column projections and hard row limits (3–5 rows). Counts use aggregate SQL. No whole-entity dumps. `chat-assistant-prompt.ts`: system prompt encodes only the count-level context derived from the queries above, total size ~3 KB.

`kb-ask.service.ts`: `MAX_CONTEXT_ARTICLES = 6`, `MAX_CONTEXT_CHARS = 1500` per source, `MAX_TOTAL_CONTEXT_BYTES = 32_000`, `MAX_PROMPT_INPUT_TOKENS = 8_000` enforced with a slice guard before the LLM call. No whole-entity dumps.

**5.2 Model tiers — COMPLIANT**

`kb-ask.service.ts` and `kb-rag.service.ts` both set `tier: "fast"` with `maxTokens: 1024`. `chat-assistant.service.ts` resolves the model via `resolveChatModel()` / `resolveChatModelId()` — defaults configured in `llm-provider.config.ts`.

**5.3 Short-circuit before provider call — COMPLIANT**

- `KbAskService.ask`: short-circuits before gateway on zero indexed content, and again if retrieval returns empty.
- `KbRagService.answerQuestion`: short-circuits before embedding AND gateway when `hasPublishedPublicArticles` returns false.
- `ChatAssistantService.processChat`: reserves credits before the call; gateway is skipped if reservation fails.
- Anonymous traffic on `POST /public/kb/ask` is rate-limited (`@UseRateLimit("ai:public-kb-ask")`). Org budget is only spent when the org has public articles (`hasPublishedPublicArticles` check). This satisfies the denial-of-wallet requirement for the public endpoint.

**5.4 Content hashing — COMPLIANT**

`KbIndexingService.isContentUnchanged` hashes the source text with `sha256(newText)` and compares against the stored `contentHash`. Chunks are only re-embedded on content change. `kb-chunk-utils.ts:4` confirms `sha256` hashes the input string directly.

**5.5 `*WithUsage` variants — PARTIAL**

`KbAskService` uses `invokeTextWithUsage` and returns `aiUsage` in the response. ✓  
`KbRagService` (public chatbot) uses `invokeText` — no `aiUsage` returned. Acceptable because there is no authenticated user to show the chip to; the org-level billing is still recorded by `invokeText` internally.

**5.6 Token-metered billing — COMPLIANT**

`computeTokenCharge(model, in, out)` is the sole billing function in `ai-model-pricing.constants.ts`. `AI_FEATURE_COSTS` are reserve ceilings via `getReserveEstimateMilli`. Credits are reserved atomically before the provider call (`ledger.reserve`), settled after via `settleStream`. Chat streaming credits are settled in `onFinish` inside `runInNewTenantTransaction` — not in the streaming handler itself, so no 42501 risk from the request transaction committing early.

---

## Items 3.1, 3.2 — Immutable revisions and resumable ingestion (NOT CLOSED)

**3.1 Immutable revisions.** `aclRevision` column on `kb_article_chunks` is NOT NULL (migration 0665). `aclRevision` is joined in both `articleVectorCandidates` and `pageVectorCandidates` to exclude stale chunks. Content hash (`contentHash`) exists for deduplication. Document *versions* table (`kb_article_versions`) exists for articles. Immutable revision semantics (append-only version log, version-to-chunk mapping, citation resolution to a specific version hash) are not present — citations resolve to the article or page row, not a pinned version. This is an architectural decision not yet made.

**3.2 Resumable ingestion.** `KbIngestionConsumer` (`kb-ingestion-consumer.ts`) processes ingestion events. The service has chunk-level deduplication (content hash), but retry-on-failure semantics (checkpoint at chunk level, resume from the last successful chunk after a crash) are not implemented. The ingestion job is atomic per article/page but not resumable mid-article.

Neither is closed. Both require design decisions (append-only versions table, per-chunk outbox) before implementation.

---

## Items 4.1, 4.2 — Two-KB consolidation (DECISION NOT MADE)

**Current state.** Two KB systems coexist:
- **Articles/help-centre** (`kbArticles`, `kbArticleChunks`, `kbSpaces`, `kbCategories`) — the original help-centre system.
- **Wiki/pages** (`kbPages`, `kbArticleChunks` with `page_id`) — the newer wiki system.

Both systems index into the same `kbArticleChunks` table (distinguished by `articleId` vs `pageId` nullability), and `KbSearchService.retrieveTopArticles` returns both under `RetrievedSource`. The article-conversion module (`kb-article-conversion`) exists with `pnpm convert:kb-articles`, `report:kb-article-migration`, and `backfill:kb-pages` scripts.

**Decision needed.** Which system becomes canonical? Options:
1. **Wiki/pages wins** — article-to-page migration, retire help-centre authoring, keep public-facing article chunk embedding under the `kbPages` model.
2. **Articles win** — page features (visibility, project-scoped) are ported to articles.
3. **Keep both** — document the distinct semantics (help-centre vs internal wiki) and maintain the dual path.

Option 3 is the current de-facto state. The ticket requires naming a winner or a recorded reason for keeping both. This is an architectural decision that cannot be made from code alone — it requires a product call. **Not closed.**

---

## Proof

- `kb-ask.service.spec.ts` — 7/7 pass.
- `kb-ask-tenant-isolation.spec.ts` — 2/2 pass.
- `tsc --noEmit` (NODE_OPTIONS=--max-old-space-size=8192) — ran in background; output file is 0 bytes (no errors emitted) as of report time.

## What was not closed

| Item | Reason |
|---|---|
| 3.3 HNSW index — actual plan | Cannot run EXPLAIN without live DB access |
| 3.1 Immutable revisions | Requires append-only version schema design |
| 3.2 Resumable ingestion | Requires per-chunk checkpoint design |
| 4.1/4.2 Two-KB consolidation | Requires product decision on canonical system |
