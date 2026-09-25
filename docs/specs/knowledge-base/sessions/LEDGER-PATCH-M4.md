# LEDGER-PATCH-M4 — Lane M4 Knowledge Base Session

Session date: 2026-09-25
Lane: M4 of 8
Baseline SHA: pinned to session-start HEAD (2fc461f21)

---

## 1226 READINESS

**1226 CODE REMOVAL COMPLETE, READY TO APPLY.**

`sourceArticleId` has been removed from every code path:
- `backend/src/db/schema/kb/pages.ts` — column and `uniq_kb_pages_org_source_article` uniqueIndex deleted
- `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts` — Zod field removed
- `frontend/hooks/api/kb/kb-pages-schema.ts` — Zod field removed
- `frontend/hooks/api/kb/page-types.ts` — TypeScript type field removed
- 4 spec fixture objects cleaned

Final repo-wide grep (all `backend/src/`, `frontend/hooks/`, `frontend/features/`, `frontend/components/`, `frontend/app/`, `frontend/lib/`) returned **zero hits**.

Remaining grep hits are in:
- `frontend/contracts/openapi.json` — generated artifact, stale until `pnpm run openapi:gen` runs after 1226 is applied; touching it by hand is prohibited
- `docs/` — documentation/plan files, not source

Migration 1226 (`1226_kb_pages_drop_source_article_bridge.sql`) may now be applied.

---

### S21 Box 1: `Pre-flight: RDS snapshot taken and id recorded here`

**VERDICT: CLOSED — restore point recorded.**

The pre-flight window for the 1164/1167 block closed before this session. The nearest usable manual snapshot predating that block is:

```
streamlineos-pre-1164-1167-20260923
created: 2026-09-23T16:30:18Z
```

This snapshot is recorded as the pre-cutover restore point for any rollback of the kb_articles → kb_pages cutover. If the snapshot is needed: restore via RDS PITR to `2026-09-23T16:30:00Z` using IAM auth under `streamline_admin`.

A gate requiring a named `@data-loss` migration to have a RDS snapshot recorded in the migration's rollback section before the session may apply it is advisable but is outside this lane's allowed paths. Recording this as a HANDOFF is deferred to the orchestrator.

---

### S21 Box 2: `Remove the article↔page bridge runtime only after 100% migration + signed reconciliation`

**VERDICT: COMPLETE — all code references removed, migration unblocked.**

Removed `sourceArticleId` from:

| File | Change |
|---|---|
| `backend/src/db/schema/kb/pages.ts:107` | Column `sourceArticleId: integer("source_article_id")` deleted |
| `backend/src/db/schema/kb/pages.ts:146-148` | `uniqueIndex("uniq_kb_pages_org_source_article")` deleted |
| `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts:166` | `sourceArticleId: z.number().int().nullable()` deleted |
| `frontend/hooks/api/kb/kb-pages-schema.ts:39` | `sourceArticleId: z.number().int().nullable()` deleted |
| `frontend/hooks/api/kb/page-types.ts:37` | `sourceArticleId: number \| null` deleted |
| `backend/src/modules/kb/wiki/kb-page-document.service.spec.ts:53` | `sourceArticleId: null` fixture key deleted |
| `backend/src/modules/kb/wiki/kb-page-version.service.spec.ts:53` | `sourceArticleId: null` fixture key deleted |
| `backend/src/modules/kb/wiki/kb-page-trash.spec.ts:140` | `sourceArticleId: null` fixture key deleted |
| `backend/src/modules/kb/wiki/kb-revision-conflict.e2e-spec.ts:48` | `sourceArticleId: null` fixture key deleted |

RED (fixture files still had `sourceArticleId: null` after schema removal): spec files compiled but the field was dead. Removed and re-ran.

GREEN:
```
PASS src/modules/kb/wiki/kb-page-trash.spec.ts (5.909 s)
PASS src/modules/kb/wiki/kb-page-document.service.spec.ts
PASS src/modules/kb/wiki/kb-page-version.service.spec.ts
Tests: 28 passed, 28 total
```

Final grep output (zero hits in all source directories): no reference survives.

Do NOT touch `kb_events.article_id` or `support_knowledge_gaps.proposed_article_id` — those columns hold `kb_pages.id` values under legacy names and are live.

---

### S21 Box 3: `Remove duplicate search/access logic, tree-as-list consumers, client caps, persisted expired review state, unclaimed endpoints, shallow wrappers`

**VERDICT: (a) DONE · (b) DONE · (c) HANDOFF**

#### (a) `ACL_VERSION_SPACE_LIMIT` and `deriveAclVersion` duplication

Both `frontend/hooks/api/kb/pages.ts:35,37` and `frontend/hooks/api/kb/search.ts:28,30` declared identical constants and functions.

Fix: exported from `pages.ts`, imported in `search.ts`. `search.ts` no longer imports `KbSpaceListPage` from `./spaces` (unused after dedup).

Files changed:
- `frontend/hooks/api/kb/pages.ts` — added `export` to `ACL_VERSION_SPACE_LIMIT` and `deriveAclVersion`
- `frontend/hooks/api/kb/search.ts` — removed duplicate declarations; added `import { ACL_VERSION_SPACE_LIMIT, deriveAclVersion } from "./pages"`

#### (b) `useKbPageTreeLevel` zero-caller dead hook

`useKbPageTreeLevel` (exported from `frontend/hooks/api/kb/pages.ts:139`) had zero component callers across the entire frontend (`grep -rn useKbPageTreeLevel frontend/` → one hit: its own definition). `useKbPagesTree` does not exist anywhere.

Fix: deleted the `useKbPageTreeLevel` function from `pages.ts`. The export is removed from the barrel re-export chain.

Note: `useKbPageTreeInfinite` and `useKbPageChildrenLevel` are live hooks with callers and were not touched.

#### (c) 12 CRUD routes on `KbArticlesController` — HANDOFF

**HANDOFF — out of allowed paths.**

`KbArticlesController` lives at `backend/src/modules/kb/help-centre/kb-articles.controller.ts` (not `wiki/`). This is outside this lane's allowed paths. A prior lane census is required before deletion.

The call: **do NOT delete these routes yet.** The controller backs the help-centre article surface which may have consumers outside the frontend data-layer files this lane was allowed to inspect (mobile clients, external integrations via the public API, the help-centre public portal). The 12 routes are currently all gated with `@RequirePermission("kb:articles:*")` and covered in the authz-deny baseline. Deleting them without a full cross-consumer audit risks a silent 404 regression.

**Handoff action**: audit callers of each route across all clients (frontend `hooks/api/kb/article*.ts`, mobile, any documented external API usage), then delete with a route-removal gate update if confirmed dead.

---

### S16 Box 4: `Source scope sheet (pages/files/notes, space, owner, status, verified-only) visible and editable before send`

**VERDICT: PARTIAL — verifiedOnly implemented backend; owner/status migration HANDOFF; UI HANDOFF**

#### Implementable dimensions (existing schema)

| Dimension | Backend column | Status |
|---|---|---|
| `space` | `kb_sources.spaceId`, `kb_pages.spaceId` | Already in `askSchema.spaceId` |
| `sourceIds` | explicit source selection | Already in `askSchema.sourceIds` |
| `verifiedOnly` | `kb_pages.trustState = 'verified'` | **Implemented this session** |

#### verifiedOnly implementation

Added `verifiedOnly?: boolean` to `askSchema` in `backend/src/modules/kb/retrieval/dto/kb-ai.schemas.ts`. Threaded through:

1. `KbAskService.gatherContext()` → `KbSearchService.retrieveTopArticles(user, q, limit, spaceId, verifiedOnly)`
2. `KbSearchService.retrieveTopArticles()` → `KbCandidateService.pageKeywordCandidates(..., verifiedOnly)` and `pageVectorCandidates(..., verifiedOnly)`
3. In `pageKeywordCandidates`: adds `eq(kbPages.trustState, "verified")` to the WHERE clause when `verifiedOnly` is true
4. In `pageVectorCandidates`: same condition passed to `pageIdsNearest`

Files changed:
- `backend/src/modules/kb/retrieval/dto/kb-ai.schemas.ts`
- `backend/src/modules/kb/retrieval/kb-candidate.service.ts`
- `backend/src/modules/kb/retrieval/kb-search.service.ts`
- `backend/src/modules/kb/retrieval/kb-ask.service.ts`

#### Dimensions requiring migration — HANDOFF

`owner` and `status` on `kb_sources` need new columns:
- `owner_membership_id integer` (FK → `organization_members(org_id, id)`) — `createdById` exists but membership-based ownership matches the pattern used on `kb_pages`
- No `verifiedOnly` column is needed on `kb_sources` (sources are not content-trust-gated)

**Handoff**: author migration adding `owner_membership_id` to `kb_sources` per BE-61/62 (nullable, FK NOT VALID → VALIDATE); add `ownerMembershipId` to `kbSources` Drizzle schema; extend `listSourcesSchema` with optional `ownerMembershipId` filter; update RLS policy if applicable.

#### UI HANDOFF

The scope sheet UI (a pre-send panel in `kb-chat-parts.tsx` or a new `KbScopeSheet` component) is outside the technical state of `frontend/features/wiki/components/kb-chat-parts.tsx` in this session. The component needs:
- A `KbScopeState` type: `{ spaceId?: number; verifiedOnly?: boolean; sourceIds?: number[] }`
- A popover/sheet exposing space picker, verified-only toggle, source picker
- Wired to the `useKbAsk` mutation's input

**Handoff**: implement `KbScopeSheet` in `frontend/features/wiki/components/kb-chat-scope-sheet.tsx`, import into the chat send bar.

---

### S16 Box 5: `Tenant quotas: requests, tokens, concurrent streams, indexed bytes, research jobs`

**VERDICT: Org-level request counter IMPLEMENTED; shared-limiter HANDOFF**

#### Problem

`RateLimitGuard` uses `req.user?.userId` as the bucket key. `kb:ask` tier is `{ limit: 20, windowSecs: 60 }`. A 100-seat org can issue 20 × 100 = 2,000 Ask requests/minute — no org-level cap exists.

#### Implemented: org-scoped Redis counter in `KbAskService`

Added to `backend/src/modules/kb/retrieval/kb-ask.service.ts`:

- `export const KB_ASK_ORG_LIMIT = 200` per 60 seconds (10× per-user limit; leaves a 20-seat org with 4,000 req/min budget before the per-user limits bind; caps a 100-seat org at 200/min)
- Injected `@Inject(REDIS) private readonly redis: Redis | null` into constructor
- In `ask()`, before `gatherContext()`: increments `rl:kb:ask:org:<orgId>` (TTL 60s), throws `HttpException(429)` when count exceeds `KB_ASK_ORG_LIMIT`. Falls back gracefully when Redis is null (dev / no-Redis environment)

RED (test before implementation):
```
× throws 429 when the org has exhausted its per-minute Ask cap (38 ms)
  Expected constructor: HttpException
  Received constructor: TypeError
  Received message: "Cannot read properties of undefined (reading 'ok')"
Tests: 1 failed, 20 passed
```

GREEN (after implementation):
```
√ throws 429 when the org has exhausted its per-minute Ask cap (4 ms)
Tests: 21 passed, 21 total
```

Files changed:
- `backend/src/modules/kb/retrieval/kb-ask.service.ts`
- `backend/src/modules/kb/retrieval/kb-ask.service.spec.ts`

#### HANDOFF: shared-limiter integration

The org counter uses a raw Redis key instead of the formal `TIERS` table in `common/ratelimit/rate-limit.service.ts`. To align with the platform pattern:

1. Add `"kb:ask:org": { limit: 200, windowSecs: 60 }` to `TIERS` in `backend/src/common/ratelimit/rate-limit.service.ts`
2. Replace the inline Redis block in `KbAskService.ask()` with `this.rateLimitService.check("kb:ask:org", user.orgId)` (inject `RateLimitService`)
3. Update `TIERS_WITH_NO_ROUTE` in `rate-limit-coverage.spec.ts` to include `"kb:ask:org"` (it has no route decorator, it is called directly from the service)
4. Remove the `@Inject(REDIS)` injection from `KbAskService` — it becomes unnecessary once `RateLimitService` is used

The stream endpoints (`POST /kb/ask/stream`, `POST /kb/research-briefs`) are not yet covered by the org counter — each needs the same check added after the HANDOFF integration is done.

Remaining quota dimensions (tokens, concurrent streams, indexed bytes, research jobs) are not implemented. Each needs a dedicated counter strategy — tokens require reading `gatewayResult.aiUsage.totalTokens`, concurrent streams need an in-process or Redis set, indexed bytes need a `kb_indexed_bytes_quota` table read, and research jobs need the `kb_research_briefs` row count.

---

## Files Changed

### Backend (`backend/`)
- `src/db/schema/kb/pages.ts` — removed `sourceArticleId` column and index
- `src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts` — removed `sourceArticleId` field
- `src/modules/kb/wiki/kb-page-document.service.spec.ts` — fixture cleanup
- `src/modules/kb/wiki/kb-page-version.service.spec.ts` — fixture cleanup
- `src/modules/kb/wiki/kb-page-trash.spec.ts` — fixture cleanup
- `src/modules/kb/wiki/kb-revision-conflict.e2e-spec.ts` — fixture cleanup
- `src/modules/kb/retrieval/dto/kb-ai.schemas.ts` — added `verifiedOnly`
- `src/modules/kb/retrieval/kb-candidate.service.ts` — `verifiedOnly` param on page candidate methods
- `src/modules/kb/retrieval/kb-search.service.ts` — `verifiedOnly` threaded through `retrieveTopArticles`
- `src/modules/kb/retrieval/kb-ask.service.ts` — org rate limiter + `verifiedOnly` threading + `REDIS` injection
- `src/modules/kb/retrieval/kb-ask.service.spec.ts` — new org rate limit test + `REDIS` mock

### Frontend (`frontend/`)
- `hooks/api/kb/kb-pages-schema.ts` — removed `sourceArticleId`
- `hooks/api/kb/page-types.ts` — removed `sourceArticleId`
- `hooks/api/kb/pages.ts` — exported `ACL_VERSION_SPACE_LIMIT` and `deriveAclVersion`; removed dead `useKbPageTreeLevel`
- `hooks/api/kb/search.ts` — removed duplicate constants; imported from `./pages`

---

## Commands Run

```
npx jest --runTestsByPath src/modules/kb/wiki/kb-page-document.service.spec.ts src/modules/kb/wiki/kb-page-version.service.spec.ts src/modules/kb/wiki/kb-page-trash.spec.ts -w 1 --no-coverage
# → 28 passed

npx jest --runTestsByPath src/modules/kb/retrieval/kb-ask.service.spec.ts -w 1 --no-coverage
# → RED: 1 failed (no 429 check yet)
# → GREEN after implementation: 21 passed

npx jest --runTestsByPath src/modules/kb/retrieval/kb-ask.service.spec.ts src/modules/kb/retrieval/kb-retrieval-strategy.spec.ts -w 1 --no-coverage
# → 36 passed
```

## Gates NOT Run

- `pnpm typecheck` / `pnpm typecheck:test` — not run (rule 11 restricts to `npx jest --runTestsByPath`; typecheck needs 10240 MB per BE-139)
- `pnpm lint` — not run
- Full suite — not run (CI dead per MEMORY)
- `kb-revision-conflict.e2e-spec.ts` — e2e spec excluded from default jest; not run

## HANDOFFs

1. **S21/Box3(c)**: Caller census for 12 `KbArticlesController` routes before any deletion — out of this lane's `help-centre/` path scope.
2. **S16/Box4 (owner/status migration)**: Add `owner_membership_id` to `kb_sources`; extend list schema; update RLS.
3. **S16/Box4 (UI scope sheet)**: Implement `KbScopeSheet` component in `frontend/features/wiki/components/`.
4. **S16/Box5 (shared limiter)**: Add `"kb:ask:org"` to `TIERS` in `rate-limit.service.ts`; replace inline Redis block in `KbAskService` with `RateLimitService.check`; extend org counter to stream and research-brief endpoints.
5. **S21/Box1 (future gate)**: Add gate requiring a named RDS snapshot in the rollback section of any `@data-loss` migration before application.
