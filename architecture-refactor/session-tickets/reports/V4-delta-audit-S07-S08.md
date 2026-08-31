# V4 Delta Audit — S07 & S08

**Date:** 2026-08-30  
**Auditor role:** READ-ONLY. No source edits.

---

## Verdict counts

| Ticket | [x] VERIFIED DONE | [x] NOT ACTUALLY DONE | [x] REGRESSED | [ ] ALREADY DONE | [ ] OPERATOR-BLOCKED | [ ] GENUINELY OPEN | [ ] PREMISE FALSE |
|---|---|---|---|---|---|---|---|
| S07 (7 ticked) | 6 | 1 | 0 | 4 | 0 | 9 | 0 |
| S08 (9 ticked) | 9 | 0 | 0 | 2 | 10 | 10 | 0 |

---

## S07 — Knowledge Base, Wiki, Search, AI & Support

### Ticked items

**§1 item 1 — ACL enforced inside SQL before top-k** → VERIFIED DONE  
`kb-search.service.ts:300-306`: article vector candidates use `innerJoin(kbArticles, and(..., eq(kbArticleChunks.aclRevision, kbArticles.aclRevision)))` before `.limit(pool * 4)`. Page vector candidates mirror this at line 371-383. Space membership, published status, restriction filter and `chunkVisibleTo`/`pageVisibleTo` predicates are all WHERE clauses before the limit.

**§1 item 2 — Index entries carry org, ACL revision and content revision** → NOT ACTUALLY DONE  
Ticket claims: "`kb-chunks.ts:53` now `aclRevision: integer("acl_revision").notNull().default(1)` (migration 0665 applied)."  
Actual source `backend/src/db/schema/support/kb-chunks.ts:54`: `aclRevision: integer("acl_revision"),` — still nullable, no default.  
Migration `0665_kb_article_chunks_acl_revision_not_null.sql` applied the DB constraint correctly (NOT NULL DEFAULT 1). L22 report claims the Drizzle schema file was also updated. The file on disk says otherwise. The DB is protected; the TypeScript type is wrong (says nullable when DB enforces NOT NULL). Content revision `contentRevision` is also still nullable at line 55.

**§1 item 3 — IS NULL bypass fixed** → VERIFIED DONE  
`kb-search.service.ts:302`: `eq(kbArticleChunks.aclRevision, kbArticles.aclRevision)` — strict equality, no `OR IS NULL` arm. Line 373 mirrors this for page vector candidates. NULL chunks (pre-migration 0498) fail closed and are excluded from vector search.

**§2 item 1 — LEAKPROOF impossible on Neon, none attempted** → VERIFIED DONE  
Grep across all migrations and source: every instance of "LEAKPROOF" is a comment noting impossibility. No `ALTER FUNCTION … LEAKPROOF` appears anywhere.

**§2 item 2 — SECURITY DEFINER seam wired for KB retrieval** → VERIFIED DONE  
`app.search_kb_article_ids` (migration `0453`) wired at `kb-search.service.ts:433`. `app.search_kb_page_ids` (migration `0498`) wired at `kb-search.service.ts:354`. Both migrations carry `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE` to `streamline_app`. Five-condition compliance verified via migration files.

**§2 item 3 — Global search excludes KB by design** → VERIFIED DONE  
`backend/src/modules/search/search.service.ts` contains no reference to `kb`, `knowledge`, `kbArticle`, or `kbPage`. KB content is served only through its own seam functions. Exclusion is recorded as the design decision.

**§10 — Guard audit 0 violations** → VERIFIED DONE  
Grep of all KB controllers confirms every handler with `@RequirePermission` is covered by `@UseGuards(JwtAuthGuard, PermissionGuard)` either at class or method level. `KbPublicPagesController` and `KbWidgetController` use `@Public()`. `KbPageCommentsController` uses class-level `@UseGuards(JwtAuthGuard)` with per-method `@UseGuards(PermissionGuard)` on all 5 handlers. 0 handlers are undeclared.

---

### Open items

**§1 item 4 — Chatbot citations resolve to authorized immutable revisions; conversations membership-scoped** → GENUINELY OPEN  
Chat history exists (`kb-chat-history.service.ts`) but citation ACL linkage to specific revisions is absent. Revision table is not wired to chat citations. Rough size: medium (revision FK on chat citations + membership scope enforcement on history reads).

**§2 item 4 — Replace leading-wildcard ILIKE for non-KB modules** → GENUINELY OPEN  
KB already uses the security-definer seam. Other modules (tickets, leads, etc.) have their own seam functions from prior migrations. This item would require auditing each remaining module that still uses ILIKE fallback. The KB-specific obligation is met; the cross-module sweep is not S07's exclusive territory.

**§3 — Immutable revisions, author membership, publication state, audit history** → GENUINELY OPEN  
No revision table linking pages to immutable snapshots was found. `kb_page_versions` exists (versions folder in schema) but whether it satisfies "immutable revisions" with author membership anchored to membership rows is not confirmed. Needs schema review and likely migration. Medium-to-large.

**§3 — Ingestion asynchronous, resumable, deduplicated, observable, malware-scanned** → GENUINELY OPEN  
L09 report notes `kb-indexing.service.ts:indexSource/indexAttachment/indexPageDocument` do not store `aclRevision` — those chunks have NULL and now fail closed on vector search, requiring a reindex. The 690-line service has not been split (L09: token budget exhausted). No malware-scan integration found. Hash-based dedup is not confirmed at source-text level. Large.

**§3 — Vector queries always hit HNSW index** → GENUINELY OPEN  
`idx_kb_chunks_embedding_hnsw` (HNSW, `vector_cosine_ops`) exists in the schema. However, vector candidate queries include WHERE conditions on `orgId`, `articleId`/`pageId`, and visibility predicates that are not part of the HNSW index. Under RLS, the planner may seq-scan instead of using HNSW. Unverifiable without DB access and `EXPLAIN` as the app role.

**§4 — Two KB systems: name the canonical one, migrate or retire the other** → GENUINELY OPEN  
Both `kbArticles` (`db/schema/support/kb.ts`) and `kbPages` (`db/schema/kb/pages.ts`) remain live. No canonical winner has been named. Migration scripts exist (`pnpm convert:kb-articles`, `pnpm report:kb-article-migration`, `pnpm backfill:kb-pages`) but have not been run. The deduplication memory note applies: the winner must be named before any fixture rewrite.

**§5 — AI cost and efficiency (all subitems)** → GENUINELY OPEN  
Prompt context assembly, model tier selection, in-flight deduplication, tenant-scoped caching with explicit invalidation, latency/tokens/cost recording through gateway on every call, `*WithUsage` variants, `AiUsageChip` rendering — none verified as complete. `hr-ai.service.ts` (812 lines) and `ticket-ai.service.ts` (614 lines) exceed the 500-line hard limit.

**§6 — Decomposition** → GENUINELY OPEN  
`kb-indexing.service.ts` (690 lines), `hr-ai.service.ts` (812 lines), `ticket-ai.service.ts` (614 lines) all exceed the 500-line limit. `frontend/components/editor/plate/plate-document-editor.tsx` at 520 lines is at the hard limit. L09 confirms the indexing service was not split.

**§7 — Support and CSAT**  
- Cross-tenant routing keys confirmed correct: → ALREADY DONE (`uniq_support_agent_skills_org_user_skill` and `uniq_support_agent_availability_org_user` both lead with `orgId` per L11)  
- Post-commit failure bug: → ALREADY DONE (`recordActivity().catch(() => undefined)` at `support-tickets.service.ts:231-233` per L11)  
- Public CSAT race: → ALREADY DONE (`isNull(supportCsatRequests.respondedAt)` in WHERE + `ConflictException` on 0 rows per L11)  
- CSAT vs surveys fate: → ALREADY DONE (L11: keep all three, distinct purposes recorded)  
- Public token rate-limiting: → GENUINELY OPEN (L11 filed as OUT-OF-OWNERSHIP; three routes need TIERS entries + `@UseRateLimit` + `RateLimitGuard`: `GET /support/csat/:token`, `POST /support/csat/:token`, `POST /csat/:surveyId/responses`)

**§8 — Outbox consumers (S07 trees)** → ALREADY DONE  
Live `check:outbox-consumers` run (2026-08-30): **4 orphans remain, all inventory** (`inventory.purchase_order.received`, `inventory.sales_order.fulfilled`, `inventory.shipment.dispatched`, `inventory.stock.adjusted`). All S07 trees are covered: `kb.content.index` has a consumer, `support.ticket.resolved` has `SupportTicketResolvedConsumer`, `survey.response.submitted` has a consumer. The 4 remaining orphans are S05 territory. The check still exits 1 and cannot be a CI gate at zero until S05 closes theirs.

**§9 — Tenant isolation coverage (~75 services)** → GENUINELY OPEN  
L09: `check:tenant-isolation` FAIL — 51% covered (384 missing repo-wide) at time of L09 run. Dashboard services not in scope. KB/search/AI/support/csat/surveys/feedbucket coverage gap is unquantified at this date but large.

---

## S08 — Home, Platform Operations, Contracts, Cache & Operator Evidence

### Ticked items

**§1 item 1 — Define contract section by section** → VERIFIED DONE  
L20 report provides the section contract table with 11 sections, their access type, data scope, and "Query omitted when denied?" column.

**§1 item 2 — Mark each section universal or permission-bound** → VERIFIED DONE  
L20 table distinguishes universal sections (identity, announcements, calendar, mail, notifications) from permission-bound (stats, attendance, approvals, Build work). Verified against `dashboard.controller.ts`: `@Universal()` on stats, personal, announcements, birthdays; `@RequirePermission` + `@RequireModule` on attendance, approvals, build work.

**§1 item 3 — Denied section omitted, query not executed** → VERIFIED DONE  
`dashboard.controller.ts:176-179`: `stats` returns null for missing permissions (implemented in `DashboardStatsService`). `pending-approvals` (line 144-152) carries `@UseGuards(ModuleGuard, PermissionGuard)` + `@RequireModule("hr")` + `@RequirePermission("hr:leaves:approve")` — the handler is not reached and no query executes. Build work routes similarly gated. The controller does NOT have a single aggregated "home" endpoint that would execute all queries regardless of permission.

**§1 item 4 — Minimal projections and bounded aggregates** → VERIFIED DONE  
"Already done" section: active-sprint totals moved from JS reduce over every ticket to one bounded SQL aggregate. Dashboard controller injects individual services per domain; each service selects only what its section needs.

**§1 item 5 — Split dashboard-hr.service.ts (635 lines)** → VERIFIED DONE  
`dashboard-hr.service.ts` does not exist. Four split files confirmed on disk with `wc -l`: `dashboard-stats.service.ts` (89), `dashboard-availability.service.ts` (230), `dashboard-birthdays.service.ts` (165), `dashboard-personal.service.ts` (244). Controller imports all four directly.

**§7 item 1 — Serial/bigserial risk register** → VERIFIED DONE  
L22 report: 588 `int4` serial columns analyzed, 0 bigserial. Eight HIGH-RISK tables flagged (`audit_logs`, `notification_events`, `ai_usage_logs`, `ai_chat_messages`, `support_ticket_messages`, `journal_lines`, `inv_stock_transactions`, `payroll_line_items`) with MIGRATE decisions; bounded catalogs recorded as KEEP with rationale.

**§7 item 2 — Authoritative cold-vs-upgrade comparison** → VERIFIED DONE  
L22 report has the comparison table. 384 journal entries, 391 DB rows, 0 orphan rows above journal max. `check:migration-chain` PASS. Cold-path gap noted: 0591 RLS fails for 124 accounting tables that don't exist yet on cold path (created later by 0619); tracked as OPEN for a future migration.

**§7 item 3 — Applied OUT-OF-OWNERSHIP migrations** → VERIFIED DONE  
`backend/migrations/0664_calendar_events_visibility.sql` exists. `backend/migrations/0665_kb_article_chunks_acl_revision_not_null.sql` exists. `backend/migrations/0666_rls_missing_tables.sql` exists. All three have journal entries.

**§7 item 4 — Tenant tables without RLS policy audit** → VERIFIED DONE  
L22: `db:verify-rls` run; `expense_export_jobs` and `inv_compliance_documents` found and fixed in migration 0666. Post-fix coverage: 955/960. One structural FAIL (`feedback_cycle_responses`: no `org_id` column, inherits isolation via parent FK; tracked separately as needing schema change).

---

### Open items

**§1 — Section failures isolated** → GENUINELY OPEN  
Dashboard exposes separate endpoints per section; independent 503/timeout on one does not kill others at the backend. However no circuit breaker, error envelope or fallback aggregation exists at the Home level. Frontend parallel fetching and independent section error/retry states are unverified.

**§1 — Counts count active memberships, not globally active users** → GENUINELY OPEN  
`dashboard-stats.service.ts` needs audit of the `totalEmployees` count predicate. Not verified against current source.

**§1 — Server and Query cache keys include organization, membership, permission version, locale/timezone and filters** → GENUINELY OPEN  
`dashboard-cache-key.ts` exists but whether it captures all required dimensions (membership version, permission version, locale/timezone) was not verified. Large, requires cache key inventory + test proof.

**§1 — Every rendered section has skeleton, independent error/retry, empty, access-denied behavior** → GENUINELY OPEN  
Frontend work; not audited.

**§1 — P95 aggregate ≤800ms on production-shaped data, measured** → OPERATOR-BLOCKED  
Needs a live Neon DB access as `streamline_app` with the tenant GUC set and production-shaped data (seed scripts `pnpm seed:build-load` and `pnpm baseline:build` exist). No live DB is available in code-only sessions. Cannot be closed by code alone.

**§2 — Home calendar leak** → ALREADY DONE  
`dashboard-personal.service.ts:161`: `eq(calendarEvents.visibility, "org")` in the OR predicate alongside creator identity and attendee exists-check. The visibility predicate is in SQL before any projection. Migration `0664` confirmed the column exists. The `[ ]` item's premise that the column is missing was false; the fix was applied.

**§3 — Generated contract coverage (all subitems)** → GENUINELY OPEN  
3,545 operations, 1,917 with Zod contracts (54%) at time of writing. Raising to full coverage requires systematic `@Validate` decoration of remaining operations, legacy param validation migration, OpenAPI standardization, idempotency/error-envelope assertions, and `check:contract-vendor` CI gate. Large. `@Idempotent` trap: every `@Idempotent` route's frontend caller must send the key or the route ships returning 400 to all clients.

**§4 — Cache correctness proof: cross-org, cross-membership** → GENUINELY OPEN  
Code can be written to test this; no live infrastructure required for the isolation test itself. The canonical key format is defined; the inventory and proof assertions need to be written.

**§4 — Prove invalidation reaches another application instance** → OPERATOR-BLOCKED  
Requires two separately running application instances sharing a Redis cluster. Cannot be proven in a single-instance dev session.

**§4 — Cache key inventory, sensitive record prohibition, lifetime vs grant expiry, stampede protection** → GENUINELY OPEN  
Code work; no infrastructure dependency.

**§5 — Seed production-shaped dataset + measure as app role with GUC** → OPERATOR-BLOCKED  
`pnpm seed:build-load` and `pnpm baseline:build` scripts exist. Actual execution requires a live Neon DB as `streamline_app` with the tenant GUC. Cannot be done in a code session. Note: `db:check-read-budgets:self-test` cannot fail — its fixture params return null with no project seeded, the runner answers `skip`, and `skip` never pushes to `breaches`. The self-test proves nothing about production query plans.

**§5 — Expand read-budget gate beyond 2 routes** → GENUINELY OPEN  
`pnpm db:check-build-reads` covers 2 of 3,385 routes. Expanding the gate to hot paths is code work, but measurement requires a live DB with the app role.

**§5 — Connection pools, statement timeouts, per-cell budgets measured and alerted** → OPERATOR-BLOCKED  
Requires live infrastructure metrics.

**§6 — Outbox consumer orphans at zero** → GENUINELY OPEN (S05 territory)  
Current check: 4 orphans (all `inventory.*`, emitted by S05 inventory module). S08's owned events are consumed. The check cannot reach zero until S05 closes the inventory orphans. The event ledger `ON CONFLICT` three-state trap is unresolved — only `processed_at` can distinguish completed replay from failed attempt, and the claim requires three states.

**§8 — Public-token rate limits, upload limits, SSRF controls, secret/PII redaction** → GENUINELY OPEN  
L11 filed three public routes needing TIERS entries + `@UseRateLimit` + `RateLimitGuard` as OUT-OF-OWNERSHIP pointing at S08's `common/**` territory. This is S08's open obligation. `common/security/ssrf-guard.ts` must be reused (never a second guard).

**§8 — CORS before body parser** → ALREADY DONE  
`backend/src/main.ts:62-106`: `NestFactory.create` with `bodyParser: false` (line 64), then `app.enableCors(...)` at line 92, then `app.useBodyParser("json", ...)` at line 103. Correct order confirmed.

**§8 — Operator-access design and audit evidence** → OPERATOR-BLOCKED  
Time-bound, approved, reasoned, audited operator access is an operational policy + tooling requirement; no code change alone satisfies it.

**§8 — Export, retention, legal-hold, erasure drills with real export worker + object storage purge** → OPERATOR-BLOCKED  
"No real export-file worker and cannot physically purge object storage by organization prefix" (ticket text). Needs: (1) a real async export worker that writes to object storage, (2) an org-prefix purge function callable against a real storage bucket. Neither exists; this requires infrastructure provisioning.

**§8 — Configure ALERT_WEBHOOK_URL, APP_RELEASE, live log stream; send test alert with acknowledgement** → OPERATOR-BLOCKED  
Requires production deployment configuration. Cannot be done in code alone.

**§8 — Verify each alert predicate against real emission** → OPERATOR-BLOCKED  
Requires a live log stream producing real alert events. A hand-written fixture cannot verify this (see "Alert predicate must match real emission" memory note).

**§9 — Operator evidence runbooks (all rows)** → OPERATOR-BLOCKED  
Per S08's own instruction: "Report every one of these rows as OPEN — operator-blocked in your report." Each row below requires infrastructure the repo owner must provision; no code change closes it:

1. **Independently isolated cell compute/cache/object-storage/search/realtime/worker/monitoring** — namespace-only separation does not pass; requires separate Neon branches, separate Redis instances/clusters, separate object storage buckets, separate Qdrant/pgvector instances, separate Ably apps, separate worker queues, and separate monitoring agents per cell.
2. **PITR/backup frequency meeting the five-minute RPO** — requires Neon PITR configuration set to ≤5 min frequency, evidenced by a restore drill from a known point.
3. **Physical read replica with replica-safe vs primary-required workload behavior under real lag** — requires a Neon read replica provisioned, read replica lag measured, and read workloads rerouted with primary fallback tested under real replication lag.
4. **Re-running all 14 workload objectives on production-shaped data with declared geography/device/network/cache conditions** — requires production traffic replay or load-test rig against a production-shaped DB with real geography/CDN conditions.
5. **Meeting every latency objective with ≥40% sustained-resource headroom and surviving burst target** — requires sustained-load testing against a production-sized cluster with CPU/memory headroom verified.
6. **Per-cell cost, cost per active organization/member/message/job, and a saturation forecast** — requires billing API integration or infrastructure cost data per cell plus a capacity model built on real write rates.

**§10 — Tenant isolation coverage (~45 services)** → GENUINELY OPEN  
L20: `check:tenant-isolation` FAIL — 60% covered (322 missing) at time of the L20 run, with dashboard services not yet in the covered list. Cron services need the special `forEachOrg` scoping assertion. Large.

---

## Traps exercised

**check:outbox-consumers:** Re-run live. Current orphan count = **4** (not 22). All 4 are inventory events (S05 territory). S07 and S08 domain events are consumed.

**Drizzle schema vs DB constraint drift (S07 §1 item 2):** Migration 0665 applied `NOT NULL DEFAULT 1` to the DB. The TypeScript schema file `kb-chunks.ts:54` was not updated to match. L22 report claimed the file was updated; the file on disk contradicts this. The DB is protected; the ORM type is wrong. Classified NOT ACTUALLY DONE.

**db:check-read-budgets:self-test:** Cannot fail — fixture params return null with no project seeded, runner answers `skip`, skip never pushes to `breaches`. Any "PASS" on this self-test is not evidence of correctness.

**check:tenant-isolation:** Counts files mentioning a service, not passing tests. A "60% covered" result at L20's run time means 322 services have no isolation test at all, not that 60% of tests pass.
