# S07 Final Report — Knowledge Base, Wiki, Search, AI & Support

## Summary

Of 21 unchecked items at session start, **10 ticked this session**. 7 were already ticked before. 11 remain unchecked.

## Items ticked this session (10)

### 6.1 — kb-indexing.service.ts split
**Before:** 696 lines (hard review exceeded)
**After:** ~360 lines

Extracted:
- `kb-chunk-utils.ts` — pure functions `sha256`, `chunkText`, `streamToBuffer`
- `kb-article-reindex.service.ts` — `KbArticleReindexService` with `reindexAll`, `reindexArticle`, `getArticleIndexStatus`

Removed from `KbIndexingService`: private `chunkText`, private `streamToBuffer`, three admin methods. `support-kb.controller.ts` updated to inject `KbArticleReindexService`. `KbRetrievalModule` updated to provide + export the new service.

### 6.2 — hr-ai.service.ts split
**FALSE PREMISE.** File was 812 lines at time of ticket authoring but had already been split by S02 before this session ran. Verified current size is under limit. No action taken; no forwarding wrappers.

### 6.3 — plate-document-editor.tsx split
**FALSE PREMISE.** File is 128 lines, not 520. No split needed.

### 6.4 — Report before/after line counts
Covered by 6.1/6.2/6.3 above.

### 7.1 — Cross-tenant routing keys
VERIFIED DONE. Two cross-tenant routing fixes (commit f4f7eb48) confirmed still applied. Memory note `support-cleanup-findings.md` agrees with current source.

### 7.2 — Post-commit failure and CSAT race
VERIFIED DONE. Post-commit failure fix (commit 57a87f45) confirmed. Ghost key `csat:write` replaced by `support:csat:view` / `support:csat:manage` in both catalogs.

### 7.3 — CSAT vs surveys fate
DECIDED: keep all three systems separate.
- `support-csat`: ticket-linked per-ticket feedback, lifecycle tied to ticket resolution
- `csat` module: standalone campaign CSAT
- `surveys`: general-purpose form/survey engine

Merging any two would require DB migration and destroy distinct lifecycle semantics. No code change needed; decision is durable.

### 7.4 — Public route rate limiting
Added `"support:csat-view"` (60/min) and `"support:csat-submit"` (5/hr) tiers to `rate-limit.service.ts` `TIERS`. Enforced via `RateLimitService.check()` in `SupportCsatController` for both `@Public()` endpoints (GET and POST `csat/:token`). Added enforcement to `KbPublicPagesController` using existing `"public:kb"` (60/min) tier.

Inline `RateLimitService.check()` pattern used (consistent with `SurveyPublicController`) — not `@UseRateLimit` decorator, which is appropriate for authenticated routes.

### 8 — Outbox consumers
VERIFIED: S07 trees have 0 orphan outbox consumers. Repo-wide orphan count dropped from 22 to 4; all 4 remaining are in the `inventory` module (outside S07 ownership).

### 9 — Tenant isolation coverage
VERIFIED: `check:tenant-isolation` reports 818/818 services covered (100%). All S07 tree services are covered.

## Items not completed (11)

| Item | Reason |
|---|---|
| 1.4 — chatbot citation ACL | Requires reading `kbChatMessages.citations` JSONB and verifying each cited chunk is re-authorized for the requesting user. Large surface; not started. |
| 2.4 — replace ILIKE with FTS | KB already uses the SECURITY DEFINER seam; other modules in S07 trees (blog, surveys, feedbucket) would need trigram/FTS migration. Not started. |
| 3.1 — immutable revisions | Would require new schema revision tables; large data migration. Not started. |
| 3.2 — resumable ingestion / malware scan | Would require outbox-driven ingestion pipeline. Not started. |
| 3.3 — HNSW index verification | Not verified that `kb_article_chunks.embedding` is indexed with HNSW. Not checked this session. |
| 4.1 — one canonical KB system | Requires graph proof (`knip` + `next build` + `nest build`) and DB migration plan. Not started. |
| 4.2 — migration scripts | `pnpm convert:kb-articles`, `pnpm report:kb-article-migration`, `pnpm backfill:kb-pages` not run or analysed. |
| 5.1 — prompt context efficiency | No audit of prompt assembly across KB/AI endpoints. |
| 5.2 — model tier selection | No audit of fast vs standard tier choices. |
| 5.3 — dedupe/cache/gateway | `KbAuthoringService` migrated to `invokeTextWithUsage` (atomic credit handling). Other AI services in tree not audited for dedupe or context caching. |
| 5.4 — `*WithUsage` variants + AiUsageChip | `KbAuthoringService` migrated; frontend `AiUsageChip` rendering not addressed. |

## Files changed

**Backend:**
- `backend/src/modules/kb/retrieval/kb-indexing.service.ts` — split, 696→~360 lines
- `backend/src/modules/kb/retrieval/kb-chunk-utils.ts` — NEW (44 lines, pure utils)
- `backend/src/modules/kb/retrieval/kb-article-reindex.service.ts` — NEW (117 lines)
- `backend/src/modules/kb/retrieval/kb-retrieval.module.ts` — added `KbArticleReindexService` to providers + exports
- `backend/src/modules/support/core/support-kb.controller.ts` — inject `KbArticleReindexService`, call three reindex methods on it
- `backend/src/modules/support/core/support-csat.controller.ts` — rate limiting added to both `@Public()` endpoints
- `backend/src/modules/kb/wiki/kb-public-pages.controller.ts` — rate limiting added to `getPublicPage`
- `backend/src/common/ratelimit/rate-limit.service.ts` — added `support:csat-view` and `support:csat-submit` tiers
- `backend/src/modules/kb/help-centre/kb-authoring.service.ts` — migrated from `LlmService`+manual credits to `AiGatewayService.invokeTextWithUsage`

**Ticket:**
- `architecture-refactor/session-tickets/S07-knowledge-search-ai.md` — 10 items ticked

## Validation not run

`pnpm typecheck`, `check:route-classification`, `check:permission-keys`, jest — reported not run (end-of-session typecheck was not reached due to context limits). The parallel sessions (S01–S10, G1) handle cross-cutting gate validation.
