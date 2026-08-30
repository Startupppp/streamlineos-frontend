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
- [ ] Confirm ACL is enforced **inside** SQL/search/vector retrieval before top-k selection, not applied to results afterwards. Read the retrieval path end to end and quote the predicate.
- [ ] Index entries carry organization, **ACL revision** and content revision.
- [ ] **Known trap:** the KB ACL revision gate has an `IS NULL` arm that skips the gate entirely. After the revision column was added, every pre-existing chunk has a NULL revision — so the gate is inert for all existing content. Verify whether this is still true; if so, backfill the revisions and remove the `IS NULL` bypass, or make NULL fail closed.
- [ ] Chatbot citations resolve only to **authorized immutable revisions**. Conversations are membership-scoped.

### 2. Search under RLS
- [ ] **A text index is unusable under RLS and `LEAKPROOF` is impossible on Neon** — no true superuser exists, so `ALTER FUNCTION … LEAKPROOF` fails 42501 even in the console. Never propose it.
- [ ] The one escape is a `SECURITY DEFINER` function owned by the BYPASSRLS owner, valid only with all five conditions: org from `app.current_org_id()` (**never a parameter**, so it fails closed with no GUC) · returns **ids only** · the caller's query still runs under RLS with its DataScope · `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE` to the app role · a `LIMIT` argument, with the caller requesting `cap + 1` and falling back to `ILIKE` at the cap. Canonical example: `app.search_ticket_ids`, migrations `0424`/`0425`.
- [ ] Five such functions already exist and **global search ignores them** — wire global search to the security-definer seam, or record why not.
- [ ] Replace leading-wildcard `ILIKE` search with trigram/FTS or the seam above.

### 3. Revisions and lifecycle
- [ ] Documents have immutable revisions, author **membership**, publication state and audit history.
- [ ] Ingestion is asynchronous, resumable, deduplicated, observable and malware-scanned. Never re-embed unchanged content — hash the **source text**, not the rejoined chunks.
- [ ] Vector queries always hit an ANN (HNSW) index.

### 4. Two KB systems — resolve the duplication
- [ ] This repo has historically carried two knowledge systems (legacy KB articles and the newer KB pages/wiki). Determine the current state, **name the canonical one**, and migrate or retire the other with graph proof and build verification. Deduplication is only real once you have named the winner — a rewritten fixture once hid a 20-namespace regression here.
- [ ] Scripts exist to help: `pnpm convert:kb-articles`, `pnpm report:kb-article-migration`, `pnpm backfill:kb-pages`.

### 5. AI cost and efficiency
- [ ] Assemble prompt context in the fewest queries with explicit projections and hard caps on rows and text length — never dump whole entities into prompts.
- [ ] Default to the fast/cheap model tier with a per-feature output cap; use the standard tier only where quality demands it.
- [ ] Dedupe in-flight AI requests; cache derived context tenant-scoped with explicit invalidation; record latency/tokens/cost through the AI gateway on every call.
- [ ] New AI endpoints use the gateway `*WithUsage` variants, return `aiUsage` meta and render `AiUsageChip`.

### 6. Decomposition
- [ ] `modules/kb/retrieval/kb-indexing.service.ts` (690) — split by responsibility.
- [ ] `modules/ai/core/services/hr-ai.service.ts` (812) and `ticket-ai.service.ts` (614) — split.
- [ ] `frontend/components/editor/plate/plate-document-editor.tsx` (520) — split.
- [ ] Report before/after line counts. Forwarding wrappers are not a refactor.

### 7. Support and CSAT
- [ ] Two cross-tenant routing keys were previously fixed in Support; confirm they are still correct rather than assuming.
- [ ] A post-commit failure bug and a public CSAT race were reported. Verify against current source and close or record as VERIFIED DONE with evidence.
- [ ] The fate of `csat` versus `surveys` was left undecided. Decide it at your opening checkpoint: consolidate onto one, or keep both with a recorded reason for each.
- [ ] Public token pages, uploads and search are rate-limited. `@UseRateLimit("key")` needs both a `TIERS` entry and `RateLimitGuard` in `@UseGuards`, or it silently does nothing.

### 8. Outbox consumers
- [ ] `pnpm check:outbox-consumers` reports **22 orphan event types repo-wide**. Close the ones emitted from your trees.

### 9. Tenant isolation coverage
- [ ] Cover every uncovered service in your trees (bucket B08 minus workflows, plus support/csat/surveys from B09 — roughly 75 services). Each test needs a cross-tenant DENY case **and** a same-tenant CONTROL that returns the row.

### 10. Guard audit
- [ ] Audit every handler in your trees for `@RequirePermission` **without** `@UseGuards(JwtAuthGuard, PermissionGuard)`. Report the count. KB read handlers that are intentionally universal must carry `@Universal()` and have the guard moved, not the key deleted.

## Validation (run once, at the end)

Backend: `pnpm typecheck` · `check:route-classification` · `check:permission-keys` · `check:record-access` · `check:tenant-isolation` · `check:log-secrets` · `check:outbox-consumers` · `check:tenant-indexes` · jest `--testPathPattern="kb|search|ai|support|blog|survey|csat|feedbucket"`.
Frontend: `pnpm type-check` · `check:query-scope` · `check:empty-states` · jest for your features.
If you changed routes or DTOs: regenerate and re-vendor OpenAPI.

**Boot the API and run a real retrieval query as a low-privilege member.** Prove the ACL predicate bites against real data, not a mock.

## Definition of done

ACL is enforced inside retrieval before top-k; index entries carry organization, ACL revision and content revision, with no inert NULL bypass; ingestion is resumable and malware-scanned; one canonical knowledge system with the other retired under graph proof; KB reading is universal while authoring/analytics/import/settings are gated; AI cannot be made to disclose an unauthorized chunk and cannot spend budget anonymously.

Report to `architecture-refactor/session-tickets/reports/S07-report.md`.
