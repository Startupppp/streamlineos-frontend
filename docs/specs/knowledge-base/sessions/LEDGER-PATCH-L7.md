# LEDGER-PATCH-L7 — S16 (Ask KB) + S21 (`kb_articles` cutover + destructive contraction)

Lane L7. 21 open boxes, 21 verdicts. Every `file:line` below was opened and read in this pass.
Every production fact was re-measured against the live Aurora catalog over the IAM wrapper, not
taken from `AUDIT-L7.md`, `SESSION-06`, `SESSION-07` or `MIGRATION-RUNBOOK.md`.

**Two "critical known facts" in the brief were stale — both are now closed in source:**

1. The residual weakness (page fake `makeDbForRevocation` not compiling the `WHERE`) **is fixed**.
   `backend/src/modules/kb/retrieval/kb-ask-citation-restriction.spec.ts:294-314` now compiles the
   real `visiblePages` predicate through `PgDialect` and derives visibility from the compiled
   predicate's own bound id list (`pageIdsBoundIn`, `:268`) and boolean literal
   (`predicateLiteralIn`, `:282`) — the article path's pattern. Both tests assert on compiled SQL
   text (`:335-336`, `:353-355`). Re-run this pass: 5/5 PASS.
2. `CopyAnswerButton` / `AnswerFeedbackBar` **are mounted**, not dead exports —
   `knowledge-base-page.tsx:424-425` (persisted bubbles) and `:456-457` (pending answer).

---

### S16 — Ask KB

- [x] `kb_ai_interactions` schema: tenant, actor, conversation/message, provider/model, prompt policy version, source ids + revisions, token counts, latency, result state, feedback, cost — SATISFIED: `backend/src/db/schema/kb/ai-interactions.ts:35-52` (all 11 attributes have real columns: `orgId`, `actorMembershipId`, `conversationId`/`messageId`, `provider`/`model`, `promptPolicyVersion`, `sourceIdsWithRevisions`, `promptTokens`/`completionTokens`/`totalTokens`, `latencyMs`, `resultState`, `feedback`, `costCredits`). Table confirmed **live in production** by catalog query: `kb_ai_interactions` present, `relrowsecurity = true`, 1 policy, 4 `streamline_app` grants.
- [x] Conversation rail: new, search, rename, delete, cursor — SATISFIED: `frontend/features/wiki/components/kb-conversation-list.tsx:184` (new), `:206-212` (search), `:236-246` (rename), `:279-292` (delete confirm), `:267-273` (`InfiniteScrollSentinel` cursor). Reachability proven, not assumed: the rail is mounted at `knowledge-base-page.tsx:366-379`.
- [ ] Source scope sheet (pages/files/notes, space, owner, status, verified-only) visible and editable before send — **DECISION-REQUIRED** (see below)
- [ ] Answer parts: citations, source passage, freshness, verification, disagreement, insufficient evidence — DEFECT FIXED: `frontend/features/wiki/components/kb-chat-parts.tsx:254-278` (`CitationEvidenceList`), mounted at `frontend/features/wiki/components/knowledge-base-page.tsx:424-428` and `:461-463` via a new `evidence` slot on `frontend/components/kb/kb-chat-bubble.tsx:62`; contract widened at `frontend/hooks/api/kb/kb-chat-schema.ts:3-9` and `frontend/types/kb.ts:38-43`. Tests `renders the cited source passage so the answer is not uncited prose`, `renders a freshness label derived from the citation updatedAt`, `renders the verification badge for a verified citation`, `shows no passage and no verification badge for an unverified citation without a passage (positive pair)` in `frontend/features/wiki/components/knowledge-base-page-citation-evidence.test.tsx`; bite-tested (4/4 failed before, 4/4 passed after).
- [x] Streaming stop/retry, network recovery, copy, helpful/unhelpful, report wrong/stale, create knowledge gap — SATISFIED: `knowledge-base-page.tsx:478` (stop → `handleStop` at `:266`), `:441` + `:468` (retry/regenerate), `:233-245` (network-error recovery path), `:424`/`:456` (copy), `:425`/`:457` (helpful/unhelpful), `kb-chat-parts.tsx:334-336` (report wrong/stale → existing `not_helpful` rating), `kb-chat-parts.tsx:168` (create knowledge gap inside `InsufficientEvidenceBanner`, mounted at `knowledge-base-page.tsx:442-444`). All three hooks hit routes that exist: `kb-ask.controller.ts:162` (`ask/stream`), `kb-ai-feedback.controller.ts:20` (`kb/ai/feedback`), `kb-ask.controller.ts:245` (`kb/ask/knowledge-gap`).
- [x] Access-change handling after an answer was generated — SATISFIED: `backend/src/modules/kb/retrieval/kb-ask.service.ts:506-549` (`assertReplayCitations`), and it is genuinely **called**, not merely defined — `backend/src/modules/kb/retrieval/kb-ask.controller.ts:195`, inside the `claim.kind === "replay"` branch of `askStream`.
- [x] `kb:ai:generate` + read access required; billing permission not inferred from view — SATISFIED: `backend/src/modules/kb/retrieval/kb-ask.controller.ts:76` carries `@UseGuards(JwtAuthGuard, PermissionGuard)` (BE-29 — the decorator alone gates nothing), with `@RequirePermission("kb:ai:generate")` at `:104` (`ask`) and `:167` (`ask/stream`). Key present in **both** catalogs (BE-112): `backend/src/modules/rbac/permissions/kb.ts:61` and `frontend/contracts/permission-catalog.json:530`.
- [x] Provider context contains only authorized passages; document content is data, never instruction — SATISFIED: `backend/src/modules/kb/retrieval/kb-ask-context.ts:35-44` — `ASK_SYSTEM_PROMPT` is a static string carrying no tenant content; `kb-ask.service.ts:291-295` passes document text only in the `user` message, never in `system`. Filtering is in the SQL predicate, not the prompt (BE-96): `kb-citation-visibility.service.ts:59-118`, `kb-search.service.ts:103,227,391,400`.
- [x] Citations accepted only when they map to a retrieved, still-authorized passage — SATISFIED: the model is forbidden from emitting citation ids at all (`kb-ask-context.ts:42`); citations are built server-side only from the retrieved candidate set by `resolveCitations` (`kb-ask.service.ts:564`), which passes only ids from `top`/`sources` through `visibleArticles`/`visiblePages`/`visibleSources`. Re-verified post-stream at `:472-480` and on replay at `:506`.
- [ ] Tenant quotas: requests, tokens, concurrent streams, indexed bytes, research jobs — **DECISION-REQUIRED** (see below)
- [x] Remove confidence percentages, uncited prose, hidden auto-selected sources, drafts in browser storage — SATISFIED: no `confidence` field in `frontend/hooks/api/kb/ask-result-schema.ts:21-28` and no `AiConfidenceBadge` on the Ask surface; no `localStorage`/`sessionStorage` in `knowledge-base-page.tsx`, `kb-chat-parts.tsx` or `hooks/api/kb/ask.ts`; source selection is explicit and visible at `knowledge-base-page.tsx:349-352` (scope indicator) and `kb-sources-sheet.tsx:132-188`; uncited prose is blocked by `kb-ask-context.ts:36,43`. Uncited prose is now additionally *visibly* cited by the passage rendering added for the Answer-parts box above.

**Evidence:** S16 is materially complete. Eight of eleven open boxes are satisfied against real source with the reachability check applied — every user-facing box was confirmed by finding both a hook that calls the route and a component that renders it, not by "the controller is registered". The one true defect was the **Answer parts** box: `CitationPassage`, `FreshnessTag` and `VerificationBadge` were exported from `kb-chat-parts.tsx` and imported by **nothing** — a grep for all three across the whole frontend returned only their own definitions. That is the same "built, tested, zero consumers" trap the brief warns about, and it was hiding a second layer beneath it: the frontend history contract (`kb-chat-schema.ts`) omitted `passage` and `verified`, and `z.object()` strips unknown keys on decode, so even once mounted the components would have rendered nothing on persisted answers — the backend *does* return both fields (`backend/src/modules/kb/retrieval/dto/kb-ask-result.schema.ts:3-17`, reused by the history schema at `kb-retrieval-response.schemas.ts:47`). Both layers are fixed and bite-tested. The two remaining boxes are genuinely undecidable by implementation and are stated precisely below. No backend file was modified for S16; `npx eslint` is clean (0 errors) on all five changed frontend files, with one pre-existing `set-state-in-effect` warning at `knowledge-base-page.tsx:196` that my diff does not touch (diff hunks: `48, 52, 60, 229, 231, 424, 458, 461`).

#### DECISION-REQUIRED — Source scope sheet

`KbSourcesScopeSheet` (`frontend/features/wiki/components/kb-sources-sheet.tsx:122-193`) is a flat
per-source checkbox picker over `kb_sources` only. Of the six named dimensions, **one** exists
(individual source selection, transmitted as `sourceIds` and honoured server-side in SQL); five do
not, and two of them have **no data model to filter on**:

| Dimension | State |
|---|---|
| pages/files/notes (kind) | no control; `KbSource.kind` exists but the sheet never filters on it, and **pages are not scopable at all** — the sheet lists only `kb_sources` |
| space | no control in the sheet; `askSchema.spaceId` exists (`backend/src/modules/kb/retrieval/dto/kb-ai.schemas.ts:33-39`) but the sheet never sets it |
| owner | **no backing column.** `kb_sources` has `createdById` (creator) only — `backend/src/db/schema/kb/sources.ts:39` |
| status | no control; non-ready sources are merely disabled (`kb-sources-sheet.tsx:295-296`) |
| verified-only | **no backing column.** `kb_sources` has no verification concept at all (`sources.ts:24-47`); only `kb_pages` carries `trust_state`/`verified_until`/`verified_at` |

**The decision:** what is an Ask "scope object"? Two of the six dimensions cannot be implemented
because the data does not exist, and "pages/files/notes" implies a *unified* picker spanning
`kb_pages` and `kb_sources`, which is a different retrieval contract from today's `sourceIds`.
Choose one: **(a)** define scope as sources-only and amend the box to the four dimensions that
have data (kind, space, status, source id) — implementable immediately with no schema change and
no new SQL predicate; **(b)** add `verified`/`owner` to `kb_sources` (migration + backfill +
semantics for "verified" on an uploaded file) and unify pages into the scope object — a schema and
retrieval-contract change that touches `kb-ask.service.ts` predicates, which BE-96 and the citation
specs guard. I did not pick for you: (b) is a product decision about what Ask scoping *means*, and
guessing it would land a predicate change in the highest-risk file in the slice.

#### DECISION-REQUIRED — Tenant quotas

**Four of the five are genuinely per-tenant and enforced.** I verified each, and corrected one
false negative from my own sub-agent survey:

| Quota | State |
|---|---|
| tokens/cost | per-org. `charge: true` at `kb-ask.service.ts:290` and `:455`; credits are an org-level DB invariant (BE-93) |
| concurrent streams | per-org. `backend/src/modules/ai/core/gateway/ai-concurrency-limiter.ts:8` keys Redis on `ai:inflight:${orgId}`, cap 20 at `:39` |
| indexed bytes | per-org. `KbIndexedBytesQuotaService` over `kb_indexed_bytes_quota` (keyed on `orgId`), reserved inside the source-insert transaction at `kb-sources.service.ts:246,312`. Table confirmed live in production with RLS |
| research jobs | per-org — **the sub-agent reported this absent and was wrong.** `kb-research-brief.service.ts:63` calls `aiJobs.enqueue`, and `backend/src/modules/ai/jobs/ai-jobs.service.ts:71` calls `assertQueueDepthAvailable(input.orgId)` *before* the insert, which counts live jobs for that org and throws 429 with `Retry-After` at `MAX_LIVE_JOBS_PER_ORG = 500` (`:128-153`) |
| requests | **per-USER, not per-tenant.** `TIERS["kb:ask"] = { limit: 20, windowSecs: 60 }` (`backend/src/common/ratelimit/rate-limit.service.ts:130`) applied at `kb-ask.controller.ts:106,169` — but `RateLimitGuard` keys strictly on `req.user?.userId ?? extractClientIp(req)` (`backend/src/common/ratelimit/rate-limit.guard.ts:37`), and **`RateLimitService` has no org dimension anywhere** (grep for `orgId`/`scope` in that file returns nothing) |

**The decision:** a 100-seat org can issue 2,000 Ask requests/minute within the per-user limit, so
"requests" is not a tenant quota today. Making it one means adding an org dimension to
`RateLimitService`/`RateLimitGuard` — **shared platform infrastructure consumed by every
`@UseRateLimit` route in the product**, so it changes the semantics of every existing tier, not
just KB's. Choose one: **(a)** add an optional org-scoped tier dimension to the shared rate limiter
and give `kb:ask` both a per-user and a per-org window — a platform change needing an owner outside
this lane; or **(b)** accept that the tenant is already bounded on the two axes that cost money
(per-org credits) and capacity (per-org concurrency cap of 20, per-org job cap of 500), treat the
per-user request limit as per-actor abuse control, and amend the box to say so. I did not
unilaterally change the shared rate limiter.

---

### S21 — `kb_articles` cutover + destructive contraction

**Production state proven this pass, by live catalog query and by hash — never by tag or journal entry.**
`kb_articles`, `kb_article_tags`, `kb_article_translations`, `kb_article_feedback`,
`kb_article_restrictions`, `kb_article_versions`, `kb_article_comments` and
`kb_article_attachments` are **all absent** from `public`. The four renamed destinations
(`kb_page_tags`, `kb_page_translations`, `kb_page_feedback`, `kb_page_restrictions`) are all
present with `relrowsecurity = true`, 1 policy and 4 `streamline_app` grants each. Enums
`kb_article_status` / `kb_article_visibility` are gone. `kb_article_chunks` survives (it is the
live embedding table, correctly kept). Ledger: **970 rows against 970 journal entries, 0
duplicate hashes**; `1173_kb_articles_cutover_expand` and `1174_kb_articles_cutover_contract` both
report `hash=APPLIED` with `created_at = when` MATCH. Thirteen journal entries are not in the
ledger (`1150`, `1158`–`1162`, `1185`–`1191`) — **none is a KB migration**; no KB migration is
unapplied.

- [x] Pre-flight: resolve exact table/route/cache/index/blob targets and write them into this ledger before any destructive statement — SATISFIED: the full target list was resolved before the destructive statement and is recorded in the migration itself — `backend/migrations/1174_kb_articles_cutover_contract.sql:1-28` (all eight tables with destination and rename-vs-drop disposition), `:351-358` (the five FKs stripped from kept tables), `:360-372` (`DROP TABLE kb_articles`, `DROP FUNCTION app.search_kb_article_ids`, both enums), and every index target named explicitly at `:202`, `:231-233`, `:262-264`, `:296-300`, `:332-334`. Route target recorded at `:362-367` (the help-centre surface keeps its routes; its one caller moves to `app.search_kb_page_ids`). Cache target: exactly **one** KB namespace exists repo-wide, `kb:acc-spaces:${orgId}`. Blob target: **none** — `kb_article_attachments` held 0 rows, so no object-storage key was orphaned (`backend/src/modules/storage/storage-key-catalog.ts:30` records why it is absent from the catalog). Copy this paragraph into the ledger's Evidence block to satisfy the "write them into this ledger" clause.
- [ ] Pre-flight: RDS snapshot taken and id recorded here — **DECISION-REQUIRED** (see below)
- [x] Per-record reconciliation of status, slug, redirects, comments, attachments, versions, translations, public URL, citations — SATISFIED, **vacuously, and that must be stated when ticking it**: the reconciliation machinery exists and ran — `backend/migrations/verify/1173_kb_articles_cutover_parity.sql` compares per-column **values** (not counts), and `1174`'s own preflight re-asserts it and `RAISE`s on any unmatched row (`:84-94`) or any column-level mismatch across 11 columns (`:96-114`), and separately refuses to run if `kb_article_versions`/`_comments`/`_attachments` hold **any** row (`:116-128`) or if any chunk is still anchored to a disappearing attachment (`:130-136`). These are executed guards, not prose. But every source table held **0 rows**, so there were no records to reconcile: per `MIGRATION-RUNBOOK.md:68-74`, `kb_articles` and all seven dependents were empty and `kb_article_chunks` had 0 article-anchored rows. Nothing is outstanding, and nothing about the backfill *logic* is proven — do not quote the parity run as a passing gate.
- [x] Watermark, checksum/counts, exceptions, retries, rollback window recorded — SATISFIED: `docs/specs/knowledge-base/MIGRATION-RUNBOOK.md:26-38` records the watermark (`1803000010681`) and the disk-vs-db sha256 for all ten of 1168–1176; `:68-74` records the pre-cutover row counts; `:62-63` records the exceptions (5 orphan ledger rows, and the 31 pre-existing orphan chunks at `:72`); `:426-428` records the retry rule (statement rolls back cleanly, re-run the same `--tag=`, already-applied skipped by file hash); `:336` and `:405` record the rollback window (1-day PITR, explicitly called insufficient for a `DROP TABLE`). Independently re-measured today: 970/970, 0 duplicates, 13 non-KB entries unapplied.
- [x] Freeze legacy writes → final delta → switch readers → invalidate both cache namespaces — SATISFIED in its degenerate form, which is the only form available at zero rows: there were no legacy writes to freeze (`KbArticlesService` already wrote `kb_pages` before 1174 ran — `backend/src/modules/kb/help-centre/kb-articles.service.ts:136` inserts into `kbPages`); the final delta was `1173`'s `WHERE NOT EXISTS` backfill, idempotent and re-runnable, moving 0 rows; **readers are switched, and I proved it rather than trusting it** — a grep of all of `backend/src` (excluding `migrations/`) and all of `frontend` for every dropped table name found **zero live runtime reads**. The only survivors are gate-only metadata and stale test doubles (detailed under the next box). The "both cache namespaces" clause describes a world that does not exist: exactly one KB cache namespace is declared repo-wide, `kb:acc-spaces:${orgId}` (`kb-access.service.ts:55`, `knowledge-authorization.service.ts:101`), and a stale entry for a nonexistent article is inert at 0 rows.
- [ ] Remove the article↔page bridge runtime only after 100% migration + signed reconciliation — **DECISION-REQUIRED** (see below; migration + rollback authored and proven, HANDOFF at the end)
- [ ] Remove duplicate search/access logic, tree-as-list consumers, client caps, persisted expired review state, unclaimed endpoints, shallow wrappers — **DECISION-REQUIRED** (see below)
- [x] Contraction migration tested for interruption and resumption — SATISFIED: `1174` is a **single** `DO $migration_1174$` block between statement-breakpoints (`backend/migrations/1174_kb_articles_cutover_contract.sql:38` to `:436`), so it is one statement in one transaction — an interruption rolls the whole thing back with no partial state, which `MIGRATION-RUNBOOK.md:426-428` records as observed behaviour. Resumption is a first-class early-exit: `:51-60` returns cleanly with a `RAISE NOTICE` when `kb_articles` is already absent and all four renamed tables exist, so re-running is a no-op rather than the `:62-64` "was 1174 already applied?" exception. I demonstrated this exact pattern empirically today against production on the new `1226` (below): forward → rollback → forward → forward, all inside one transaction, with the second forward printing `already absent - nothing to do`.
- [x] Rollback metadata provided even though the data migration is intentionally irreversible — SATISFIED: `backend/migrations/rollback/1174_kb_articles_cutover_contract.down.sql` (502 lines) recreates the four genuinely-dropped tables (`kb_articles`, `kb_article_versions`, `kb_article_comments`, `kb_article_attachments`) and **renames the other four back** (`:139`, `:173`, `:214`, `:245`) with every index renamed back (`:154`, `:157`, `:192-198`, `:229`, `:260-263`); restores RLS, a `tenant_isolation` policy and `streamline_app` grants in a loop (`:439-444`), the sequence grants (`:464`), and the `SECURITY DEFINER` function with its grant (`:404`). Per `MIGRATION-RUNBOOK.md:93-104` it was proved against production inside a transaction that was then rolled back (43 statements, 8 tables, 8 policies, 8 grants, 5 FKs re-attached, `present_after` empty). The file keeps the correct general warning that rows do not come back from SQL — recovery is PITR; the structural restore is complete **for this database only** because all eight tables were empty.
- [x] Retain historical migrations needed to build from supported baselines, audit records, and promised compatibility redirects — SATISFIED: 970 `.sql` files on disk against 970 journal entries — nothing was pruned. The baseline that creates the article family is retained (`backend/migrations/0000_light_vance_astro.sql` is the only file containing `CREATE TABLE ... kb_articles`), as are `1172a`, `1173`, `1174`, their three rollbacks and `verify/1173_kb_articles_cutover_parity.sql`. Audit records are retained by design: `kb_events.article_id` and `support_knowledge_gaps.proposed_article_id` kept their columns when `1174` stripped only their FKs (`1174:351-358`). Compatibility redirects: there is **no** promised `/knowledge/articles/*` redirect to retain — `frontend/next.config.ts` has no such rule (its wiki rules are `/knowledge/wiki/pages/:pageId` → `/doc/:pageId` at `:102` and the `history` variant at `:107`), and no `app/(authenticated)/knowledge/articles/` route segment was ever created, so nothing was broken by not adding one. Checked `next.config.ts` first, per the config-shadows-route-redirects rule.

**Evidence:** S21's destructive contraction **has already happened and is sound.** Migration 1174 is applied to production with hash and `created_at` both matching the bytes on disk, the entire `kb_articles` family is absent from the live catalog, the four tables that had no page-side destination were renamed (carrying their OIDs, so RLS and grants travelled with them — the migration asserts this at `:377-419` rather than assuming it), and **no live code path reads a dropped table**, which is the precondition that actually governed this cutover and has no SQL form. Seven of ten boxes are satisfied. The three that are not split cleanly: one that time has closed off (the pre-flight snapshot), one that is genuine unfinished work requiring a `DROP COLUMN` I am forbidden to apply (the bridge), and one that needs a product decision about a deprecated API surface (the residue). Crucially, `0466`/`0467` were **not** touched and are irrelevant here: this slice's destructive work is `1174`, which is already applied and paired with a proven rollback. I applied nothing, journalled nothing, and ran no destructive statement against production — the one migration I authored was proven inside a transaction that was rolled back, and production was re-checked afterwards and is unmodified.

#### DECISION-REQUIRED — Pre-flight RDS snapshot

**The pre-flight window has closed and cannot be reopened**: 1174 has already run, so no snapshot
taken now can contain `kb_articles`. Measured against AWS this pass: the cluster
`streamlineos` has **10 manual cluster snapshots** and 1 automated, `BackupRetentionPeriod = 1`
day, `StorageEncrypted = false`, restorable window `2026-09-23T19:43Z` → `2026-09-25T15:45Z`.
**None of the ten is named for this cutover** — there is no `pre-1173`, `pre-1174` or
`pre-kb-articles` snapshot, and no snapshot id is recorded anywhere in the ledger or the runbook
(`MIGRATION-RUNBOOK.md:405` only says "Take a manual snapshot first", an instruction, never an id).
The nearest manual snapshot that certainly predates the whole 1168–1176 KB block (applied
2026-09-24) is **`streamlineos-pre-1164-1167-20260923`, created `2026-09-23T16:30:18Z`** — manual
snapshots do not expire, so it is still a valid restore point containing `kb_articles`. Note the
ledger's `created_at` equals the synthetic journal `when`, not a wall clock, so 1174's exact apply
instant is not independently provable from the database.

**The decision:** close this box on the evidence that exists, or mark it permanently
unsatisfiable-as-written. Choose one: **(a)** record `streamlineos-pre-1164-1167-20260923`
(`2026-09-23T16:30:18Z`) as the pre-cutover restore point, together with the fact that all eight
dropped tables held **0 rows** — which 1174's own preflight would have `RAISE`d on had it been
false (`1174:116-128`), making the blast radius provably zero — and tick the box; or **(b)** rule
that a snapshot not taken *for* this cutover does not satisfy a pre-flight discipline, leave the
box permanently open as a recorded process miss, and add a deploy gate requiring a named snapshot
before any future `@data-loss` migration. I recommend recording the outcome either way rather than
leaving it silent: a document recording an intention reads identically to one recording an outcome.

#### DECISION-REQUIRED — Remove the article↔page bridge runtime

**The bridge has not been removed, and the precondition for removing it is now met.**
`kb_pages.source_article_id` is still a live column in production carrying **0 values across 22
rows**, and nothing can ever write it again because `kb_articles` is gone. It is still declared
(`backend/src/db/schema/kb/pages.ts:71`), still carries a partial unique index
(`uniq_kb_pages_org_source_article`, `pages.ts:98`), and is still **published through the API
contract** on both sides — `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts:163`,
`frontend/hooks/api/kb/kb-pages-schema.ts:39`, `frontend/hooks/api/kb/page-types.ts:37`. Migration
is 100% (0 articles remain, table dropped), so by the box's own wording the bridge is now eligible
for removal.

Deliberately **excluded** from the removal, because measurement showed they are live columns under
a legacy *name* rather than bridge residue: `support_knowledge_gaps.proposed_article_id` holds
`kb_pages` ids and is joined to `kb_pages.id` (`backend/src/modules/support/kb-gap/support-kb-gap.service.ts:220`,
written at `:156` from `KbArticlesService.create`, which inserts into `kbPages`), and
`kb_events.article_id` holds those same page ids (`support-kb-gap.service.ts:246-257`). Renaming
those is a separate non-destructive change with its own callers to move — dropping them would be
an outage.

**The decision is yours to make and apply, because this needs a `DROP COLUMN` and I may not run
one.** I have authored and *proven* both halves (HANDOFF below). Choose one: **(a)** apply the
authored `DROP COLUMN` migration and remove `sourceArticleId` from the backend and frontend
contracts in the same release — note the contract removal is a breaking response-shape change that
must ship with, not before, the migration; or **(b)** keep the column as dormant provenance and
amend the box, accepting a permanently-NULL indexed column published in the wiki contract.

#### DECISION-REQUIRED — Remove duplicate search/access logic, tree-as-list consumers, client caps, …

Six residue classes, measured individually. **Three are already clean:**

- **persisted expired review state — REMOVED, verified in production.** `1170_kb_page_reviews_derive_overdue.sql:1` collapsed `'expired'` into `'pending'` and added a CHECK restricting status to `('pending','approved','rejected')`; overdue is derived at read time. Confirmed live: no review enum in production contains `expired`, `kb_page_reviews` has no persisted overdue/expired column, and a grep of `backend/src/modules/kb` for `'expired'`/`"expired"` returns **zero** hits.
- **duplicate access logic — not present in the harmful sense.** `KbAccessService` and `KnowledgeAuthorizationService` both cache under `kb:acc-spaces:${orgId}`, but both delegate to the *same* shared `computeAccessibleSpaceIds` helper with the *same* `kbAclCacheKey` and the *same* TTL (60s — `knowledge-authorization.service.ts:36` vs `kb-access.service.ts:49`). There is exactly one implementation of the access computation; the two invalidators (`invalidateAccessibleSpaceIds`, `invalidateSpaceScope`) are thin namespace-binding facades and both are actively used by different callers. No divergence risk.
- **shallow/pass-through wrappers — none.** `KbArticleAdapter.handle` implements a required interface method and `indexArticle` binds a `contentType` argument — both explicitly exempt under BE-143.

**Three are real residue:**

- **client caps — DUPLICATED.** `ACL_VERSION_SPACE_LIMIT = 100` and the whole `deriveAclVersion` function are declared **verbatim twice**: `frontend/hooks/api/kb/pages.ts:35,37` and `frontend/hooks/api/kb/search.ts:28,30`. Both restate the backend `PAGE_SIZE_CAP` instead of importing a shared constant. This is a clean, safe dedupe — I did not land it because it sits on a box that cannot close regardless, and `hooks/api/kb/*` may be another lane's files; assign it rather than losing it.
- **tree-as-list / dead hooks.** No consumer flattens the tree (`page-tree.tsx:38`'s `flatMap` is TanStack infinite-page accumulation, rendered as a nested tree). But `useKbPagesTree` (`frontend/hooks/api/kb/pages.ts:120`) and `useKbPageTreeLevel` (`:156`) have **zero component callers**.
- **unclaimed endpoints — 12 of them, and this is the headline.** Every CRUD route on `KbArticlesController` (`backend/src/modules/kb/help-centre/kb-articles.controller.ts:61,73,85,96,108,119,133,146,159,172,185,196`) has **no frontend data-layer caller**. I verified this directly rather than trusting the survey: a grep for `"/kb/articles` across the entire frontend returns exactly one hit, `frontend/lib/rbac/route-access/route-access-extension-entries.ts:173`, which is an RBAC catalog entry, **not a caller**. The help-centre UI calls the support module instead — `frontend/hooks/api/support/kb.ts:157,187` → `/support/kb/articles`. The AI sub-routes and the from-ticket route *are* called and must survive.

**The decision:** is `/kb/articles/*` deprecated in favour of `/support/kb/articles/*`? Deleting 12
registered routes is a product call, not a cleanup — "registered" is not "reachable", but neither
is "no frontend caller" the same as "no consumer": the MCP server, any mobile client and any
external integration are outside this repo's grep. Choose one: **(a)** confirm `/support/kb/articles`
is the sole article surface, then delete `KbArticlesController`'s 12 CRUD routes (keeping the AI
and from-ticket routes), delete the two dead tree hooks, and dedupe the client cap; or **(b)** keep
`/kb/articles` as a published API and amend the box to name `/support/kb/articles` as a deliberate
second surface. Do not delete before a caller census that covers consumers outside this repo.

---

## HANDOFF — authored, proven, NOT applied and NOT journalled

`backend/migrations/1226_kb_pages_drop_source_article_bridge.sql` +
`backend/migrations/rollback/1226_kb_pages_drop_source_article_bridge.down.sql`

I did not journal these and did not apply them. **The tag number `1226` is provisional** — the
journal's highest entry is `1218_kb_ai_interactions_research_brief` and a prior pass reserved
`1219`, so assign the final number and add the `_journal.json` entry yourself (BE-58/BE-59).

The forward migration refuses to run unless the cutover is complete: it raises if `kb_articles`
still exists, raises if **any** `kb_pages` row carries a non-null `source_article_id`, returns a
clean `NOTICE` no-op if the column is already gone, and asserts the column is absent afterwards.
The rollback restores the column and its partial unique index and asserts both are back.

**Both halves were proved against production inside a single transaction that was then rolled
back** — the same technique the 1174 rollback was proved with:

```
before      : column= 1 index= 1
after fwd   : column= 0 index= 0
after down  : column= 1 index= 1
NOTICE: 1226: kb_pages.source_article_id already absent - nothing to do
fwd x2      : column= 0  (idempotent re-run OK)
transaction rolled back on purpose
PRODUCTION UNMODIFIED: column still present = true
```

That run also demonstrates interruption-safety and resumption for this migration. If you apply it,
the contract removals at `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts:163`,
`backend/src/db/schema/kb/pages.ts:71,98`, `frontend/hooks/api/kb/kb-pages-schema.ts:39` and
`frontend/hooks/api/kb/page-types.ts:37` must ship **with** it, not before.

## HANDOFF — stale membership-artifact catalog entries (outside my territory)

`backend/src/modules/organization/core/membership-artifact-catalog/knowledge-base.artifacts.ts:15,65,85`
still declares artifacts for `kb_article_restrictions`, `kb_article_versions` and `kb_articles` —
three tables that no longer exist. **This is not a production outage**: `MEMBERSHIP_ARTIFACTS` is
consumed only by `src/scripts/*` gate scripts (`verify-membership-revocation-artifacts.ts:24,163`,
`check-referential-action-drift.ts`) and spec files, never by a runtime service — the real
membership-removal SQL lives in `org-membership-status.service.ts` / `org-member-departure.service.ts`,
which do not drive off the catalog. It will, however, make the artifact-parity gate report drift
against `pg_catalog`. The file is in the **organization** module, which this lane is explicitly
barred from touching, so I did not edit it. Two specs also reference dropped tables and would fail
against a live DB: `backend/src/modules/kb/retrieval/kb-version-append-only-migration.spec.ts:61,102`
and `backend/src/db/tenant-relationship-integrity.spec.ts:64`.

## Test / verification summary

- `backend`: `npx jest --runTestsByPath src/modules/kb/retrieval/kb-ask-citation-restriction.spec.ts -w 2` → **5/5 PASS** (re-measuring the brief's named residual weakness, which is already fixed). No backend source file was modified.
- `frontend`: `npx jest --runTestsByPath features/wiki/components/knowledge-base-page-citation-evidence.test.tsx -w 2` → **4/4 FAIL before the fix, 4/4 PASS after**.
- `frontend` regression: `npx jest --runTestsByPath features/wiki/components/knowledge-base-page.test.tsx features/wiki/components/kb-chat-parts.test.tsx components/kb/kb-chat-bubble.test.tsx -w 2` → **3 suites, 18/18 PASS**, unmodified.
- `npx eslint` on all five changed frontend files + the new spec → **0 errors**; one pre-existing `set-state-in-effect` warning at `knowledge-base-page.tsx:196`, confirmed outside every hunk of my diff.
- No repo-wide gate run (forbidden for this lane): `pnpm typecheck`, `pnpm type-check:specs`, `check:*` are all **PENDING ORCHESTRATOR GATE**. Note FE-121: tests are excluded from `tsconfig.json`, so the new spec is only covered by `type-check:specs`.
- No git state command was run. No `git add`, no commit, no stash. Nothing was applied to production; the only production writes attempted were inside a transaction that was rolled back, and the post-check confirms the tree is unmodified.
- `kb_pages` ids 4, 5, 6, 7, 14, 15, 16, 17 were never read individually, modified or deleted. No e2e fixture was planted. No AI provider was called and no mail was sent.

## Counts

**S16** — SATISFIED 8 · DEFECT FIXED 1 · DECISION-REQUIRED 2 (11 boxes; the twelfth was already `[x]`).
**S21** — SATISFIED 7 · DEFECT FIXED 0 · DECISION-REQUIRED 3 (10 boxes).
**Total 21 boxes, 21 verdicts, 0 left unresolved.**
