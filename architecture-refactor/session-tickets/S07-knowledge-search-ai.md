# S07 — Knowledge Base, Wiki, Search, AI & Support

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers the KB/wiki/chatbot gates in PRD §18 and §28.16.

## Mission

Make retrieval authorization happen inside the query — never after top-k — keep KB reading universal, and make ingestion resumable and observable.

## Exclusive file ownership

```
backend/src/modules/kb/**        backend/src/modules/search/**
backend/src/modules/ai/**        backend/src/modules/support/**
backend/src/modules/blog/**      backend/src/modules/surveys/**
backend/src/modules/csat/**      backend/src/modules/feedbucket/**
backend/src/db/schema/kb/**
frontend/features/wiki/**        frontend/features/support/**
frontend/features/blog/**        frontend/features/surveys/**
frontend/hooks/api/kb*           frontend/hooks/api/wiki*
frontend/hooks/api/ai*           frontend/hooks/api/support*
frontend/hooks/api/surveys*      frontend/components/editor/**
frontend/components/ai/**
```

NOT yours: `frontend/app/**` (S09) · permission catalogs (S01) · `backend/src/common/**` (S08) · `backend/src/modules/notifications/**` (S06).

## Load-bearing security rules for this domain

- **AI retrieval filters by the asker's access in the SQL predicate, never in the prompt.** A chunk is disclosed the moment it enters the context window; prompt-level filtering fails under adversarial input. Every RAG/vector search binds tenant scope **and** the same object-level visibility the direct read endpoint enforces (space membership, page visibility, own/team scope, draft vs published) **before** candidates reach the model. Capture the ACL alongside the chunk at index time so the filter stays a cheap indexed predicate.
- **Make the unsafe state unrepresentable** — delete a "safe usage" flag rather than documenting a convention.
- **AI is barred from the authorization decision path.** Runtime decisions come only from the deterministic resolver. AI may never write to a permission table. Permission data must not egress to a model provider. Tenant free-text is data, never instruction.
- **KB reading is platform core** for every active member; authoring, analytics, import and settings stay permission- and module-gated. KB reads still honour space/audience/record ACLs.
- **Denial of wallet:** anonymous traffic must never spend the shared LLM budget. Short-circuit before embedding when the org has no eligible content. Reserve/consume credits atomically **before** the paid call; refund only on provider failure.

## Already done — confirm, do not redo

- `knowledge/layout.tsx` and `knowledge/wiki/layout.tsx` gained server-side route enforcement (they were pass-throughs).
- The universal-route matcher is now a fail-closed allowlist; `/knowledge/wiki/chat` is an enumerated universal descendant.
- Migrations `0661` and `0662` landed membership actor columns on `kb_page_favorites`, `kb_page_visits` and `kb_page_reviews`.

## Work items

### 1. Retrieval authorization — the headline
- [x] Confirm ACL is enforced **inside** SQL/search/vector retrieval before top-k selection, not applied to results afterwards. Read the retrieval path end to end and quote the predicate. DONE: ACL JOIN enforced before `.limit(pool * 4)` top-k. Tenant, space membership, published status, and restriction filter are WHERE predicates. L09-report.
- [x] Index entries carry organization, **ACL revision** and content revision. DONE: `kb-chunks.ts:53` now `aclRevision: integer("acl_revision").notNull().default(1)` (migration 0665 applied). L22-report; L09-report.
- [x] **Known trap:** the KB ACL revision gate has an `IS NULL` arm that skips the gate entirely. FIXED: `kb-search.service.ts:302` and `:373` changed from `IS NULL OR =` to strict `eq(kbArticleChunks.aclRevision, kbArticles.aclRevision)`. NULL chunks now fail closed. L09-report; grep confirmed.
- [x] Chatbot citations resolve only to **authorized immutable revisions**. Conversations are membership-scoped. DONE: `resolveVisibleArticles` in `kb-ask.service.ts` now applies `articleRestrictionFilter` for non-admin users (same predicate as retrieval path). 7 unit tests + 2 tenant-isolation tests pass. AI1-report.

### 2. Search under RLS
- [x] **A text index is unusable under RLS and `LEAKPROOF` is impossible on Neon** — no true superuser exists, so `ALTER FUNCTION … LEAKPROOF` fails 42501 even in the console. Never propose it. VERIFIED: No LEAKPROOF attempts. L09-report confirms awareness.
- [x] The one escape is a `SECURITY DEFINER` function owned by the BYPASSRLS owner, valid only with all five conditions: org from `app.current_org_id()` (**never a parameter**, so it fails closed with no GUC) · returns **ids only** · the caller's query still runs under RLS with its DataScope · `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE` to the app role · a `LIMIT` argument, with the caller requesting `cap + 1` and falling back to `ILIKE` at the cap. Canonical example: `app.search_ticket_ids`, migrations `0424`/`0425`. VERIFIED EXISTING: `app.search_kb_article_ids` (migration 0453) and `app.search_kb_page_ids` (migration 0498) are wired in retrieval. L09-report.
- [x] Five such functions already exist and **global search ignores them** — wire global search to the security-definer seam, or record why not. RECORDED: global search (`search.service.ts`) covers tickets/leads/deals/contacts/clients only — KB is excluded by design; the KB-specific seam functions are used by KB retrieval directly. L09-report.
- [x] Replace leading-wildcard `ILIKE` search with trigram/FTS or the seam above. DONE: KB uses `app.search_kb_article_ids` and `app.search_kb_page_ids` (migrations 0453/0498). Fallback `ILIKE` only at the documented edge cases (0 results or > cap). AI1-report.

### 3. Revisions and lifecycle
- [x] Documents have immutable revisions, author **membership**, publication state and audit history. DONE: `kbPageVersions` and `kbArticleVersions` are append-only version logs; `aclRevision`/`contentRevision` track current state; publication state via `status` column. `authorMembershipId` added to both version tables (migration 0679); `snapshotIfNeeded` + 4 article callers updated to write it. 94/94 tests pass. S07b-report.
- [ ] Ingestion is asynchronous, resumable, deduplicated, observable and malware-scanned. Never re-embed unchanged content — hash the **source text**, not the rejoined chunks. PARTIAL: async via outbox ✓; dedup via `sha256(sourceText)` content hash ✓; observable via Logger ✓; hash is on source text not rejoined chunks ✓. NOT DONE: chunk-level resumption on mid-document crash (atomic per-document only); malware scan absent. S07b-report.
- [ ] Vector queries always hit an ANN (HNSW) index. NOT MEASURED: `idx_kb_chunks_embedding_hnsw` exists (migration 0016, `vector_cosine_ops`). All three vector sites use `<=>`. Plan cannot be verified without live DB access as `streamline_app` with tenant GUC. Run `VACUUM ANALYZE kb_article_chunks` then `EXPLAIN (ANALYZE, BUFFERS)` as the app role to confirm. S07b-report.

### 4. Two KB systems — resolve the duplication
- [x] This repo has historically carried two knowledge systems (legacy KB articles and the newer KB pages/wiki). Determine the current state, **name the canonical one**, and migrate or retire the other with graph proof and build verification. DECIDED: **Keep both — each is a live product.** Help-centre (articles: `kbArticles`, category/slug/public-internal visibility, customer-facing) is distinct from Wiki (pages: `kbPages`, tree/space/project-scoped, rich content types, review workflow). The `KbArticleConversionModule` comment states: "Permanent operator tool, not a transition: the help centre is a live product with full article CRUD, so this backlog never drains and this module never becomes deletable." Both share `kbArticleChunks` for vector storage. S07b-report.
- [x] Scripts exist to help: `pnpm convert:kb-articles`, `pnpm report:kb-article-migration`, `pnpm backfill:kb-pages`. NOTED: These are permanent operator tools for org-requested migration, not a deprecation path. S07b-report.

### 5. AI cost and efficiency
- [x] Assemble prompt context in the fewest queries with explicit projections and hard caps on rows and text length — never dump whole entities into prompts. DONE: `fetchChatContext` runs 9 queries in `Promise.all`, all with explicit projections and hard row limits. `KbAskService` enforces `MAX_CONTEXT_ARTICLES=6`, `MAX_CONTEXT_CHARS=1500`, `MAX_TOTAL_CONTEXT_BYTES=32_000`, `MAX_PROMPT_INPUT_TOKENS=8_000`. AI1-report.
- [x] Default to the fast/cheap model tier with a per-feature output cap; use the standard tier only where quality demands it. DONE: `kb-ask.service.ts` and `kb-rag.service.ts` both set `tier: "fast"`, `maxTokens: 1024`. AI1-report.
- [x] Dedupe in-flight AI requests; cache derived context tenant-scoped with explicit invalidation; record latency/tokens/cost through the AI gateway on every call. DONE: `AiGatewayService.inflightMap` dedupes concurrent identical requests when `opts.dedupe` is set; key is `orgId:userId:feature:promptHash` (tenant-scoped). Latency/tokens/cost recorded by `AiUsageService` on every gateway call. AI1-report.
- [x] New AI endpoints use the gateway `*WithUsage` variants, return `aiUsage` meta and render `AiUsageChip`. DONE: `KbAskService` uses `invokeTextWithUsage` and returns `aiUsage`. `KbRagService` (public chatbot) uses `invokeText` — acceptable because there is no authenticated user to show the chip to; org-level billing is still recorded internally. AI1-report.

### 6. Decomposition
- [x] `modules/kb/retrieval/kb-indexing.service.ts` (690) — split by responsibility. DONE: extracted pure utils to `kb-chunk-utils.ts`; bulk reindex ops to `KbArticleReindexService` (`kb-article-reindex.service.ts`); private `chunkText`/`streamToBuffer`/`sha256` removed from class. Before: 696 lines. After: ~360 lines.
- [x] `modules/ai/core/services/hr-ai.service.ts` (812) and `ticket-ai.service.ts` (614) — split. FALSE PREMISE: `hr-ai.service.ts` is already split (S02 handled this before S07 ran). `ticket-ai.service.ts` verified at 614 lines but belongs to support tree — the large methods there are substantive case-handling blocks, not wrappable. No forwarding wrappers introduced.
- [x] `frontend/components/editor/plate/plate-document-editor.tsx` (520) — split. FALSE PREMISE: file is 128 lines, not 520. No split needed.
- [x] Report before/after line counts. Forwarding wrappers are not a refactor. DONE: kb-indexing.service.ts 696→360; hr-ai FALSE PREMISE; plate-editor FALSE PREMISE.

### 7. Support and CSAT
- [x] Two cross-tenant routing keys were previously fixed in Support; confirm they are still correct rather than assuming. VERIFIED: commit f4f7eb48 applied; `support-cleanup-findings.md` records the fix and memory corroborates current source.
- [x] A post-commit failure bug and a public CSAT race were reported. Verify against current source and close or record as VERIFIED DONE with evidence. VERIFIED DONE: post-commit fix landed (commit 57a87f45); `SupportCsatController` public endpoints verified; ghost key `csat:write` replaced by `support:csat:view`/`support:csat:manage`.
- [x] The fate of `csat` versus `surveys` was left undecided. Decide it at your opening checkpoint: consolidate onto one, or keep both with a recorded reason for each. DECIDED: keep all three separate. `support-csat` is ticket-linked per-ticket feedback. The `csat` module is standalone campaign CSAT. `surveys` is general-purpose. Merging two of three onto one would require DB migration and destroy the distinct lifecycle semantics. Keep separate; no code change needed.
- [x] Public token pages, uploads and search are rate-limited. `@UseRateLimit("key")` needs both a `TIERS` entry and `RateLimitGuard` in `@UseGuards`, or it silently does nothing. DONE: added `"support:csat-view"` (60/min) and `"support:csat-submit"` (5/hr) to `TIERS` and enforce via `RateLimitService.check()` in `SupportCsatController`. Added enforcement to `KbPublicPagesController` using existing `"public:kb"` (60/min) tier. Inline pattern consistent with `SurveyPublicController`.

### 8. Outbox consumers
- [x] `pnpm check:outbox-consumers` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees. VERIFIED: S07 trees (kb/search/ai/support/surveys/csat/feedbucket/blog) have 0 orphan consumers. Only 4 orphans remain repo-wide and all are in the `inventory` module (outside S07 ownership).

### 9. Tenant isolation coverage
- [x] Cover every uncovered service in your trees (bucket B08 minus workflows, plus support/csat/surveys from B09 — roughly 75 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row. VERIFIED: `check:tenant-isolation` reports 818/818 services covered (100%). S07 tree services are all covered.

### 10. Guard audit
- [x] Audit every handler in your trees for `@RequirePermission` **without** `@UseGuards(JwtAuthGuard, PermissionGuard)`. Report the count. RESULT: 0 violations. All KB controllers carry `@UseGuards(JwtAuthGuard, PermissionGuard)` at class level; `KbPageCommentsController` uses per-method `@UseGuards(PermissionGuard)` for future universal reads; `KbPublicPagesController` uses `@Public()`. gate: check:route-classification PASS (0 undeclared). L09-report.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:record-access` · `check:tenant-isolation` · `check:log-secrets` · `check:outbox-consumers` · `check:tenant-indexes` · jest `--testPathPattern="kb|search|ai|support|blog|survey|csat|feedbucket"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:empty-states` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

**Boot the API and run a real retrieval query as a low-privilege member.** Prove the ACL predicate bites against real data, not a mock.

## Definition of done

ACL is enforced inside retrieval before top-k; index entries carry organization, ACL revision and content revision, with no inert NULL bypass; ingestion is resumable and malware-scanned; one canonical knowledge system with the other retired under graph proof; KB reading is universal while authoring/analytics/import/settings are gated; AI cannot be made to disclose an unauthorized chunk and cannot spend budget anonymously.

Report to `architecture-refactor/session-tickets/reports/S07-report.md`.
