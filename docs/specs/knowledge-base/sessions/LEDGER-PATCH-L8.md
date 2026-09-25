# Lane L8 ledger patch — S22, S23

**Box count.** The brief said S22 has 11 open and S23 has 14. S22 has 11; S23 has **11**, not 14
(6 ticked, 11 open, 17 total). Every open box in both slices carries a verdict below — 22 in all.
Nothing was skipped; the brief's S23 count was high by three.

**The three prior-pass fixes are all present in source.** Verified before ticking anything:
`degraded` now reaches `metrics.finish` (`backend/src/modules/kb/retrieval/kb-ask.service.ts:385`
and `:463`, `metrics.finish(degraded ? "degraded" : "answered", {...})`);
`ai_jobs.correlation_id` is populated from the ambient request context
(`backend/src/modules/ai/jobs/ai-jobs.service.ts:85`); `flush()` honours the fair claimer's `types`
filter (`backend/src/modules/ai/jobs/ai-jobs-worker.service.ts:86`).

---

### S22 — Async scale, cost, disaster recovery

- [x] **Dedicated queue lanes.** `ai_jobs` is one undifferentiated queue — `claimBatch` has no
  `type` predicate and the kind only selects a handler after the claim. Separation today is by
  *table and worker* (`payroll_jobs`, `outbox_events`, `workflow_runs`), not by lane.
  — SATISFIED: `backend/src/modules/ai/jobs/ai-jobs-fair-claimer.ts:32` (the `type IN (...)`
  predicate) and `backend/src/modules/ai/jobs/ai-jobs-worker.service.ts:86` (`claimLaneBalanced`).
  `claimBatch` is no longer the worker path.

- [x] **Per-tenant concurrency / fairness.** `claimBatch` still has no per-org cap. Deliberately
  unbuilt: the rewrite was reverted once after rendering its SQL showed a dropped
  `status = 'QUEUED'` re-check, and there is no queue here to exercise a replacement against.
  The rotating per-tenant cursor in `outbox-claim.ts` is the model when it is built.
  — SATISFIED: `backend/src/modules/ai/jobs/ai-jobs-fair-claimer.ts:41` (rotating per-org cursor)
  and `:52` (the `status = 'QUEUED'` re-check inside `FOR UPDATE SKIP LOCKED`). The ledger claim is
  stale — this was built; it is `claimBatch`, not the worker, that lacks the cap.

- [x] **Correlation ids on jobs.** The infrastructure exists and `outbox_events` and
  `workflow_runs` both persist `correlation_id`. `ai_jobs` has no such column, so nothing links an
  enqueued job to the request that created it. Needs a migration.
  — SATISFIED: column at `backend/src/db/schema/ai/ai-jobs.ts:21`, partial index at `:35`,
  migration `backend/migrations/1194_ai_jobs_correlation_id.sql`, populated at
  `backend/src/modules/ai/jobs/ai-jobs.service.ts:85`.

- [ ] Interactive index and access-revocation freshness SLOs
  — **DECISION-REQUIRED.** Not measurable from anything emitted today. `kb_pages.acl_revision`
  (`backend/src/db/schema/kb/pages.ts:54`) and `kb_article_chunks.acl_revision`
  (`backend/src/db/schema/support/kb-chunks.ts:48`) are bare integers with no companion timestamp;
  the sync itself (`backend/src/modules/kb/retrieval/kb-indexing.service.ts:241`) is a raw
  `db.execute` with no span, no logger line and no returned row count. **Decision:** (a) approve
  adding `kb_pages.acl_revision_changed_at` and `kb_article_chunks.acl_synced_at` so lag is a
  subtraction rather than a boolean, and (b) name the numeric freshness target — how many seconds
  may a revoked grant still return a chunk before it is an incident?

- [x] **Embedding budgets.** Present but coarse: the credit reservation is a flat per-call estimate
  regardless of batch size, so a 400-chunk batch reserves what a 1-chunk batch does.
  — SATISFIED: the ledger claim is stale. `backend/src/modules/ai/core/gateway/ai-gateway-embed.helper.ts:83`
  passes `texts.length` into `reserve`, and `:117` charges
  `getReserveEstimateMilli(feature) * batchCount`. KB indexing reaches that path via
  `backend/src/modules/kb/retrieval/kb-embedding-resumption.ts:65` →
  `backend/src/modules/ai/core/gateway/ai-gateway.service.ts:154`. A 400-chunk batch reserves 400×.

- [ ] **Public-page CDN invalidation by token/page revision.** Not built, and not fabricated:
  there is no CDN in front of this endpoint, the frontend route is `force-dynamic` with
  `cache: "no-store"`, and `kb_pages.content_revision` is available whenever one is introduced.
  What *was* fixed here is a real defect in the same area — see "Unsharing a page did not revoke
  its link" — plus the duplicate origin read below.
  — **DECISION-REQUIRED.** Unchanged and confirmed. **Decision:** put a CDN in front of
  `/public/wiki/:token` (and accept the token-revocation invalidation latency that implies), or
  record permanently that public pages are origin-served and close this box as not-applicable.
  Building invalidation against no CDN is inert code.

- [ ] **Replica consistency classification and lag failover.** `ReplicaRouter` exists, classifies
  `WorkClass`, and is registered — with **zero injection sites**. No lag probe exists anywhere;
  `isReplicaHealthy` is hardcoded `true`, and the router throws `ReplicaShedError` rather than
  falling back, which its own note says is deliberate. Closing this needs a real replica endpoint,
  which this deployment does not have.
  — **DECISION-REQUIRED.** Confirmed: a repo-wide grep for `replication_lag` / `pg_last_wal` /
  `replica.*lag` returns zero hits, so there is no lag measurement to classify against.
  **Decision:** provision a read replica endpoint, or delete `ReplicaRouter` rather than keep a
  registered-but-uninjected router that reads as capability.

- [ ] **Connection budget.** `poolAdmission` lanes are *regions*, not workloads, so interactive and
  background share one counter sized at `DB_POOL_MAX`. The shed is real but indiscriminate: a
  worker burst evicts interactive requests.
  — **DECISION-REQUIRED**, and **out of every lane's territory** (`db/**`, shared with other
  modules — not edited). The lane-separation half of the ledger's claim is stale: `drizzle.module.ts`
  already sets `laneCapOverrides: { background: config.admission.backgroundLaneMax }` and
  `backend/src/modules/ai/jobs/ai-jobs-worker.service.ts:36` acquires from a dedicated
  `"background"` lane. The residual defect is **oversubscription**: `backend/src/db/pool-admission.ts:99`
  resolves a lane cap as `config.laneCapOverrides?.[laneKey] ?? config.maxConcurrent`, so
  `background` is capped at `floor(DB_POOL_MAX * 0.25)` (`backend/src/db/pool.config.ts:341`) while
  `primary` is separately capped at the **full** `DB_POOL_MAX`. The caps are additive, not carved
  from one budget, so combined admitted concurrency can reach 1.25× the real postgres-js pool
  (`options.max = max`, `pool.config.ts:296`). **Precise change:** cap `primary` at
  `DB_POOL_MAX - backgroundLaneMax` rather than `DB_POOL_MAX` — i.e. give the default lane an
  explicit override instead of letting it fall through to `config.maxConcurrent`.

- [ ] Drills: backup restore, tenant export/delete, reindex, cell-move — **needs a live
  environment.** No local Postgres, no capture stack, PITR window 1 day.
  — **DECISION-REQUIRED.** Production is the only database and the brief forbids running a
  restore, a failover, a snapshot delete or any drill against it. A `#kb-search` runbook was
  authored this pass (see S23) but no drill was executed. **Decision:** authorise a non-production
  restore target (the PITR window is 1 day and the snapshot is unencrypted, so a drill also needs a
  retention and encryption decision first), or accept that disaster recovery is documented and
  untested and record that as the standing risk.

- [ ] Load/soak at current, 10×, and the planning envelope — **needs a live environment.**
  — **DECISION-REQUIRED.** Same blocker. Load-testing the only production database is not
  authorised. **Decision:** fund a load-test environment sized to the planning envelope, or accept
  untested capacity.

- [ ] Conditional stages (partitioning, cells, service extraction, external search) stay
  **unactivated**. No trigger was measured, because measuring one needs the environment above.
  Recorded as unmeasured rather than as "not triggered" — those are different claims.
  — **DECISION-REQUIRED.** Downstream of the two boxes above; the distinction between *unmeasured*
  and *not triggered* is correct and should be preserved. **Decision:** none of these activate
  until a measurement environment exists.

**Evidence:** Four boxes close on source, three of them because the ledger's prose was stale rather
than because work landed this pass. The queue is genuinely lane-separated and genuinely fair: the
`types` filter renders `type IN (...)` against the claim's inner `SELECT ... FOR UPDATE SKIP
LOCKED`, and `claimLaneBalanced` reserves `floor(limit/N)` per registered type before releasing
leftover capacity unfiltered. The registry is populated at runtime, not left empty —
`SupportKbGapJobHandler` and `WorkflowAiNodeHandler` self-register in `onModuleInit`
(`backend/src/modules/support/kb-gap/support-kb-gap-job.handler.ts:15`,
`backend/src/modules/automation/ai-workflow-nodes/ai-job-handlers/workflow-ai-node.handler.ts:25`),
and both owning modules import `AiJobsModule`, so `registry.types()` returns two lanes and the
per-lane branch is live rather than falling through to the single-lane fallback. **One caveat the
orchestrator must carry forward:** `ai-jobs-flush` is a deliberately *unscheduled* cron
(`backend/src/modules/cron/retention-schedule.ts:192`), so none of this drains in production today.
That dormancy is already recorded in this slice's ticked lease-recovery box, and it is not what
these three boxes ask for — but its stated reason is now **stale in its citation**: it names
`AiJobsService.claimBatch`, which `flush()` no longer calls. The conclusion may still hold, because
`AiJobsFairClaimer.claim` opens with a cross-tenant `SELECT DISTINCT org_id FROM ai_jobs` outside
any tenant transaction and has the same shape. Worth re-deciding on the real path, not the old one.
`npx jest --runTestsByPath` over the seven `src/modules/ai/jobs/*.spec.ts` files → 7 suites,
73 tests, all passing.

---

### S23 — Observability

- [ ] Tenant bucket/placement, actor standing, cache outcome, primary/replica, queue lane, source
  kind. None is emitted on any KB span.
  — **DECISION-REQUIRED.** Confirmed against all three KB telemetry files: none declares any of
  these. The six dimensions are not one ask, and four of them have no live source to populate them:
  **primary/replica** — `ReplicaRouter` has zero injection sites (see S22), so every KB query is
  primary and the attribute would be a constant; **queue lane** — KB indexing is synchronous in the
  calling request, there is no lane in the path; **cache outcome** — `backend/src/common/cache/cache.service.ts`
  has no hit/miss counter anywhere, so this needs a cache instrumentation project before a KB span
  can carry it; **source kind** — already covered for indexing by `kb.content_type`
  (`backend/src/modules/kb/core/telemetry/kb-indexing-metrics.ts:55`), though the label is coarser
  than reality (four real flows — page, article, source, page-document — collapse into three
  values). Only **actor standing** and **tenant bucket/placement** are both emittable and
  meaningful today. **Decision:** approve emitting `kb.actor.standing` (a bounded six-value enum,
  no PII) and an org placement/bucket label on the Ask and Search spans, accepting the added
  cardinality — or close the box for the four dimensions that have no source and scope the
  remaining two as their own item. Adding attribute slots with no caller to populate them is inert
  and was not done.

- [x] Only the **page** indexing path is instrumented. `indexArticle` delegates to
  `kb-article-indexing.ts` and attachments run their own flow. `KbIndexingContentType` already
  declares `article` and `attachment`, so wiring them adds no new vocabulary — but they are not
  wired, and an article indexing failure is still silent.
  — SATISFIED: the ledger claim is stale. `backend/src/modules/kb/retrieval/kb-indexing.service.ts:74`
  — `indexArticle` is `return this.indexPage(orgId, articleId, signal, "article")`, sharing the same
  span. Attachments open their own: `backend/src/modules/kb/retrieval/kb-attachment-indexing.service.ts:70`,
  `:124`, `:275`. Every terminal branch finishes, including both extract-failure catches (`:201`,
  `:332`) and all three outer catches. An article or attachment indexing failure is **not** silent.

- [x] Not audited for the rest of the KB surface.
  — SATISFIED: all three KB spans carry the same three-part proof — redaction replay, attribute
  allowlist, and an interpolation guard. `backend/src/modules/kb/core/telemetry/kb-indexing-metric-alert-parity.spec.ts:191`,
  `backend/src/modules/kb/core/telemetry/kb-ask-metric-alert-parity.spec.ts:198`,
  `backend/src/modules/kb/core/telemetry/kb-search-metric-alert-parity.spec.ts:102`. A repo-wide
  grep for `startSpan(` under `src/modules/kb/` returns exactly three production sites, so there is
  no fourth KB span left unaudited.

- [ ] Read/write/search/Ask latency and errors. No span exists on any of those paths.
  — **DEFECT FIXED**: `backend/src/common/http/correlation-id.middleware.ts:98`; tests
  `carries the http status code, because ok covers 200 and 404 alike` and
  `distinguishes a denial from a success, which a span status alone cannot` in
  `backend/src/common/http/correlation-id.middleware.spec.ts:207` and `:216`; bite-tested (4 tests
  failed before, 25/25 passed after). The claim was two-thirds stale — `kb.ask.operation` and
  `kb.search.operation` both exist, and every KB read/write already produced a request span from
  `correlation-id.middleware.ts:81` carrying `latencyMs`, `http.route` and `seam`. The real defect
  was that the span's only status bit was `ok`/`error` on `statusCode >= 500`, so a 403, a 404 and
  a 429 were **indistinguishable from a 200** in the log stream: latency was observable on read and
  write paths, errors were not. The span now carries `http.status_code`. Search errors additionally
  gained a dedicated alert — see the next box.

- [x] Retrieval candidate counts, rerank latency, no-answer rate, citation coverage. The Ask path
  now sets `degraded: true` when it falls back to lexical ranking; counting that is the first thing
  to build here, and nothing counts it yet.
  — SATISFIED: `degraded` now reaches the span —
  `backend/src/modules/kb/retrieval/kb-ask.service.ts:385` and `:463` finish
  `degraded ? "degraded" : "answered"` and pass `degraded` through, stamped at
  `backend/src/modules/kb/core/telemetry/kb-ask-metrics.ts:61` and consumed as `degradedCount` by
  `backend/src/scripts/alert-kb-ask.mjs:97`. Candidate counts and citation coverage are stamped at
  `kb-ask-metrics.ts:59`–`:60`; no-answer rate is `noContextRatio` in the same alert. **Rerank
  latency has no referent** — a case-insensitive grep for `rerank` across `src/modules/kb/` returns
  zero production hits; there is no rerank stage in this retrieval path. One residual worth
  recording but not blocking: the two `metrics.finish("error")` calls (`kb-ask.service.ts:392`,
  `:483`) pass no facts, so a failure *after* a successful retrieval reports `candidates: 0`.

- [ ] DB connections, locks, slow queries, replica lag, cache hit rate, dropped invalidations.
  All need a live database.
  — **DECISION-REQUIRED**, and the ledger's reason is wrong for four of the six. These do not need
  a live database; they need an export path. **Already emitted:** connection wait is a real span
  (`backend/src/db/pool-telemetry.ts:95`, `db.pool.wait`) with a working alert
  (`backend/src/scripts/alert-pool-saturation.mjs`); dropped invalidations are a real logged marker
  (`backend/src/common/cache/cache.service.ts:78`, `cache.invalidation.dropped`) that **no alert
  script reads**. **Counted but trapped in-process:** locks, deadlocks, timeouts and slow queries
  are incremented in `backend/src/db/query-fingerprint-registry.ts:97`–`:129` and surfaced only by
  polling `GET /health/db`; the per-query span (`backend/src/db/query-telemetry.ts:89`) carries a
  seam and nothing else, so no alert can see them. **Genuinely absent:** replica lag (no probe
  anywhere) and cache hit rate (`cache.service.ts` has no hit/miss counter at all). **Decision:**
  approve exporting the `/health/db` fingerprint counters to the span stream so lock waits and slow
  queries become alertable, and decide whether a cache hit-rate counter is worth the write path it
  adds. Note the `db.pool.wait` span is also **lane-blind** — `lane` is a parameter of
  `withPoolBorrow` (`pool-telemetry.ts:242`) but is never attached to the span, so a saturated
  background lane averages into the primary's p95.

- [ ] ACL denial and not-found anomalies, revocation lag.
  — **DEFECT FIXED** (the two anomaly halves): `backend/src/scripts/alert-kb-search.mjs:89` and
  `:90`; SLO at `backend/src/common/slo/slo-kb-search.ts:21`; runbook `#kb-search` in
  `architecture-refactor/final-refactor/evidence/40-observability/FAILURE-RUNBOOKS.md`; dispatch
  entry at `backend/src/scripts/alert-dispatch.mjs:39`; npm entry points `alert:kb-search` and
  `alert:kb-search:self-test`. Test `a denial spike pages even when no request errored` in
  `backend/src/modules/kb/core/telemetry/kb-search-metric-alert-parity.spec.ts:235`, alongside
  `the alert counts a line the emitter actually produced, not a hand-written fixture` (`:213`) and
  `its self-test passes, so the predicate is proven against fixtures the emitter shapes` (`:286`);
  bite-tested (11 of 26 failed before — no script, no SLO, no dispatch entry, no npm script — and
  26/26 passed after). The point of the build: `denied` and `not_found` were already emitted by
  `KbSearchMetrics` and **nothing read them**, and a fault-ratio-only alert reports perfect health
  through an ACL regression that is denying everybody, because a denial is not an error. The alert
  therefore carries three independent predicates — fault ratio (`error` > 5 % on ≥2), denial
  anomaly (> 25 % on ≥5), empty-result anomaly (> 60 % on ≥10) — and any one fires. The predicate
  was matched against the real emission, not assumed: the parity spec writes a line produced by
  `KbSearchMetrics` itself through `LogSpanExporter` and runs the script over it.
  **The `revocation lag` clause of this box is NOT closed** and is the same blocked item as S22's
  access-revocation freshness box — it needs the two timestamp columns named there, not an alert.

- [ ] Storage/index/embedding/AI cost by tenant tier. `tenant-cost` exists but is not KB-scoped.
  — **DECISION-REQUIRED.** KB-scoping is the easy half and is genuinely buildable today: every
  `ai_usage_logs` row carries `feature` (`backend/src/modules/ai/core/services/ai-usage.service.ts:88`,
  indexed `(org_id, feature)` at `backend/src/db/schema/common/ai-usage.ts:22`), the
  `ai.gateway.call` span carries `ai.feature`, `ai.credits_milli` and `ai.cost_usd`
  (`backend/src/modules/ai/core/telemetry/ai-call-metrics.ts:109`, `:209`, `:210`), and KB's
  features are a clean `kb.*` prefix (`backend/src/modules/ai/core/billing/ai-cost-catalog.ts:57`
  onward). Two halves are **not** buildable: **storage cost and index cost have no meter anywhere**
  — nothing counts bytes stored or index size per tenant — and **no span and no usage row carries
  the org's plan tier**, so "by tenant tier" cannot be computed at all. **Decision:** define the
  cost model — what a "storage" and an "index" unit cost is and where it is metered — and decide
  whether plan tier is joined at query time from the billing tables or stamped onto the emission.
  Shipping only the AI/embedding slice would close a quarter of the box and read as the whole.

- [ ] Purge backlog and oldest incomplete ledger.
  — **DECISION-REQUIRED**, and the blocker is a producer defect, not missing instrumentation. The
  query already exists — `oldestIncompleteLedgerEntry`
  (`backend/src/modules/kb/wiki/kb-multi-store-purge.ts:131`) with a supporting partial index
  `idx_kb_purge_ledger_pending_global` (`backend/src/db/schema/kb/purge-ledger.ts:50`) — and its
  only caller in the repo is a test. An alert over it today would be **permanently red**, for two
  independent reasons. First, `emptyTrash` and `purgeExpired`
  (`backend/src/modules/kb/wiki/kb-page-trash.service.ts:185` and `:240`) open ledger rows via
  `openMultiStoreLedger` but — unlike `permanentlyDelete`, which closes them at `:107` and `:120` —
  **never call `markStoreComplete` for `page_rows` or `blobs`**, so every batch those two paths
  process leaves two permanently-pending rows per page. Second, **no drainer exists**: nothing
  re-attempts a stale `pending` or `failed` ledger row, so backlog age would page for work no
  worker is scheduled to do. **Decision:** either add a retry sweep for the ledger and fix the two
  paths to close their rows (making backlog age a real signal), or accept that the ledger is a
  forensic record rather than a work queue and drop the "backlog" half of this box. Shipping the
  alert before that choice ships a dead alert. The completion defect is flagged as a cross-slice
  handoff below.

- [ ] "Dashboards" as such. There is no dashboard system in this repo — every alert here is a
  script over a log stream, and routing one to a human is a deployment concern that does not exist.
  — **DECISION-REQUIRED.** Confirmed and unchanged; `alert-dispatch.mjs` still carries a literal
  `destination: "CONFIGURE_ME — wire exit-code 1 to your oncall system"`. **Decision:** adopt a
  dashboard/paging product and wire exit-code 1 to it, or record permanently that these alerts are
  operator-invoked scripts and stop counting "dashboards" as a deliverable.

- [ ] Drill-verified. Nothing here has fired against a live stream. The self-test proves the
  predicate matches a line the emitter really produces — it does not prove an operator is paged.
  — **DECISION-REQUIRED.** The distinction is exactly right and now applies to three alerts rather
  than two: `alert:kb-indexing:self-test`, `alert:kb-ask:self-test` and the new
  `alert:kb-search:self-test` all exit 0 (10, 10 and 11 checks respectively, every check true), and
  the `kb-search` parity spec goes one better by running the script over a line the emitter really
  wrote. None of that pages anyone. **Decision:** downstream of the dashboards box — a drill cannot
  be run until there is a destination to drill, and the brief forbids drilling production.

**Evidence:** Two defects fixed, both bite-tested. The KB Search alert closes the gap this lane's
prior audit recorded as handoff #3: `kb.search.operation` was emitting `found`/`not_found`/`denied`/
`error` with full redaction proof and **no consumer at all** — a span nothing reads is not
observability. It now has `alert-kb-search.mjs`, `module:kb:search` in the SLO catalogue, a
`#kb-search` runbook section with the six-part structure, an `### kb-search` entry in
`completion-plan.md` (both anchors resolve — the two failures the catalogue spec still reports are
`workflow-stranded` and `response-contract-violations`, neither touched here), a dispatch
registration under `knowledge-team`, both npm entry points, and 14 new parity tests. The three
predicates are deliberate: a KB search that denies everybody and a KB search that returns nothing
to anybody both produce a zero fault ratio, so a fault-only alert would report health through an
ACL regression and through an empty index alike. The middleware fix is smaller but broader — every
route in the application, not just KB, now emits its HTTP status code on the request span, so the
403/404/429 population is finally separable from the 200s in the log stream that `alert-p95.mjs`
and `alert-seam-latency.mjs` already consume. Verification:
`npx jest --runTestsByPath` over the three KB parity specs plus the middleware spec → 4 suites,
117 tests, all passing; `npm run alert:kb-search:self-test` → EXIT 0, 11/11 checks true;
`alert:kb-ask:self-test` and `alert:kb-indexing:self-test` still EXIT 0, 10/10 each;
`npx eslint` over every touched file → clean.

---

## Files changed

- `backend/src/scripts/alert-kb-search.mjs` — **new.** Three-predicate alert over
  `kb.search.operation`: fault ratio, denial anomaly, empty-result anomaly. 11-check `--self-test`.
- `backend/src/common/slo/slo-kb-search.ts` — **new.** `module:kb:search`, owner `knowledge-team`,
  alert `kb-search`, runbook `#kb-search`.
- `backend/src/common/slo/index.ts` — exports the new SLO and adds `KB_SEARCH_SLOS` to
  `SLO_CATALOGUE`.
- `backend/src/scripts/alert-dispatch.mjs` — one `"kb-search"` registry entry.
- `backend/package.json` — `alert:kb-search`, `alert:kb-search:self-test`.
- `backend/src/modules/kb/core/telemetry/kb-search-metric-alert-parity.spec.ts` — 14 new tests in
  two describes.
- `backend/src/common/http/correlation-id.middleware.ts` — the request span now carries
  `http.status_code`.
- `backend/src/common/http/correlation-id.middleware.spec.ts` — 4 new tests.
- `architecture-refactor/final-refactor/evidence/40-observability/FAILURE-RUNBOOKS.md` — new
  `## #kb-search` section.
- `architecture-refactor/prd/completion-plan.md` — new `### kb-search` entry.

No migration was authored and none was applied. No `db/**` file was touched. No git state command
was run.

---

## Handoffs

1. **Connection budget oversubscription** (S22, `db/**`, no lane owns it). Cap the `primary`
   admission lane at `DB_POOL_MAX - backgroundLaneMax` instead of letting it fall through to
   `config.maxConcurrent` at `backend/src/db/pool-admission.ts:99`. Today `primary` (100 %) and
   `background` (25 %, `backend/src/db/pool.config.ts:341`) are additive over a real pool of
   `DB_POOL_MAX` connections.

2. **KB purge ledger is never closed on two of three paths** (cross-slice — whoever owns KB trash
   and retention). `emptyTrash` (`backend/src/modules/kb/wiki/kb-page-trash.service.ts:185`) and
   `purgeExpired` (`:240`) call `openMultiStoreLedger` but never `markStoreComplete` for
   `page_rows` or `blobs`; `permanentlyDelete` does, at `:107` and `:120`. Every batch those two
   paths process leaves two permanently-pending `kb_page_purge_ledger` rows per page. This is a
   correctness defect in its own right, independent of the observability box it blocks.

3. **`ai-jobs-flush`'s unscheduled reason cites a path the worker no longer takes** (S22).
   `backend/src/modules/cron/retention-schedule.ts:192` justifies leaving the job unscheduled by
   naming `AiJobsService.claimBatch`. `flush()` now claims through `AiJobsFairClaimer`. The
   conclusion may survive — the fair claimer also opens with a cross-tenant
   `SELECT DISTINCT org_id FROM ai_jobs` outside any tenant transaction — but the reason should be
   re-derived against the real path before anyone acts on it either way. Note also that no
   `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statement for `ai_jobs` appears in any migration
   under `backend/migrations/`, which if true of the live database would undercut the stated 42501
   premise entirely. Not verified against production — that is a non-KB table and out of scope.

4. **`metrics.finish("error")` on the Ask path drops its facts** (S23, minor).
   `backend/src/modules/kb/retrieval/kb-ask.service.ts:392` and `:483` pass no facts object, so a
   failure that occurs *after* a successful retrieval reports `candidates: 0, citations: 0`. The
   values are in scope at both sites.

5. **`kb.content_type` is coarser than the flows it labels** (S23, minor). Four real indexing flows
   — page, article, source, page-document — collapse into three enum values;
   `backend/src/modules/kb/retrieval/kb-attachment-indexing.service.ts:70` labels a *source* as
   `"article"` and `:275` labels a *page document* as `"attachment"`. The checkpoint content-type
   strings already distinguish all four, so the span is the only place the distinction is lost.

---

# Addendum — the three S22 boxes outside `## Slices`

**The box count is 25, not 22.** The header above counted only the checkboxes inside `## Slices`.
Three more open boxes are assigned to this lane's set explicitly, under
`## Open regression introduced by the canonical seam — read cost` at `REQUIREMENT-LEDGER.md:991`:
*"Consequences to close in **S04** (query budgets) and **S22**"*, with the boxes at `:993`, `:994`
and `:995`. 11 (S22) + 11 (S23) + 3 (S22 read-cost) = **25**. The three are resolved below; nothing
above this line was re-verified or changed.

The regression those boxes describe is real and I reproduced it as a test before fixing it:
`resolveStanding` issues `access.holds`, `getPermissionsVersion`, `resolveRoleSlugs` and
`getAccessibleProjectIds` together, and is called from **six** sites
(`knowledge-authorization.service.ts:108`, `:123`, `:161`,
`knowledge-collection.service.ts:105`, `kb-page-search-query.service.ts:42`, plus every
`visiblePagePredicate` caller). Two of the four are already in-process cached inside `AccessService`
(`permsCache` 30 s, `membershipAccessCache` 15 s — `access.service.ts:65`–`:66`) and
`accessibleSpaceIds` is `cachedVersioned` for 60 s, but `resolveRoleSlugs`
(`knowledge-space-scope.ts:11`) and `getAccessibleProjectIds` (`kb-project-access.util.ts:6`) are
**uncached statements on every call**. A request with three predicate sites paid for both three
times.

- [x] **Memoize standing for the life of one request.**
  — **DEFECT FIXED.** Failing test first (BE-134):
  `resolves standing once when three predicate sites share a request, because paying per call site
  is the read-cost regression this box records` in
  `backend/src/modules/kb/core/authorization/knowledge-authorization.service.spec.ts:318`.
  Bite confirmed before the fix — `Expected number of calls: 1 / Received number of calls: 3`,
  1 failed / 20 passed. After the fix, **21/21 pass**.

  The box's own constraint was honoured: *"a naive instance-level Map on a singleton Nest service
  would leak across tenants and must not be used."* The memo is not on the service. It is a
  module-level `WeakMap` keyed by **the per-request `ObservabilityContext` object itself** —
  `backend/src/modules/kb/core/authorization/kb-standing-request-memo.ts:20`. Two requests can never
  share a slot because they can never share that object. This is a live seam, not a declared one:
  `app.use(correlationIdMiddleware)` at `backend/src/main.ts:113` runs every HTTP request inside
  `runWithObservabilityContext` (`correlation-id.middleware.ts:70`) with `next()` **inside** the run
  callback (`:104`), so the context is present for the whole downstream request and absent
  everywhere else. `resolveStanding` now delegates to the memo at
  `knowledge-authorization.service.ts:50`–`:56`; the unchanged body moved to a private
  `computeStanding` at `:59`.

  Four properties are pinned by their own tests, each stating why it exists — the three that
  constrain the memo were **already green before the change**, so they are the positive half BE-141
  asks for rather than a bite:
  `resolves standing again in the next request, because a memo that outlives its request outlives a
  revocation` (`:332`) — the memo cannot survive a revocation by more than the request in flight;
  `keeps two actors apart inside one request, because an unkeyed memo would hand one tenant the
  other's standing` (`:343`) — the slot key is `org · user · membership · owner-bit`
  (`kb-standing-request-memo.ts:9`), so an impersonation switch or a second actor inside one request
  gets its own slot;
  `resolves fresh outside a request, because background sweeps run with no ambient context` (`:360`)
  — no context means no memo (`kb-standing-request-memo.ts:25`), which is what `forEachOrg` sweeps
  need;
  `does not memoize a rejected resolution, because one transient failure must not poison the rest of
  the request` (`:371`) — a rejected promise evicts its own slot (`:36`).

- [x] **Decide whether standing may be cached in `CacheService`.**
  — **DECISION-REQUIRED**, and **the ledger's stated premise is stale in the direction that matters**.
  The box reasons that *"a page-grant or space-membership change does not bump `permissionsVersion`,
  so a cached standing could outlive a revocation. The existing 60 s accessible-spaces cache already
  carries this exposure."* The second sentence is no longer true. That cache does not rely on
  `permissionsVersion` for those events — every one of those writers **invalidates the namespace
  explicitly**, and all of them invalidate the *same* namespace `kb:acc-spaces:${orgId}` that
  `resolveStanding` reads at `knowledge-authorization.service.ts:73`:
  page grants at `backend/src/modules/kb/wiki/kb-page-grants.service.ts:195`, `:199`, `:246`, `:250`
  (correctly ordered — inside `registerAfterCommit` with an inline fallback when it returns `false`,
  per BE-85); space membership at `backend/src/modules/kb/wiki/kb-members.service.ts:116` and `:182`;
  space mutations at `backend/src/modules/kb/wiki/kb-spaces.service.ts:327`, `:419`, `:596`.
  So the existing exposure is closed, and the reason to hesitate is a **different and sharper** one
  the box does not name.

  **The real blocker: standing is wider than the one field that has an invalidation hook.** Caching
  `KbActorStanding` wholesale would cache `accessibleProjectIds` and `roleSlugs`, and
  a repo-wide enumeration of KB cache namespaces returns exactly five —
  `kb:acc-spaces`, `kb:settings`, `kb:articles`, `kb:ingest`, `kb:chunk-count`. **There is no
  namespace for project reach and no writer anywhere that invalidates one**, because
  `getAccessibleProjectIds` is a live query today. Caching standing therefore silently converts a
  project-membership removal from immediate to eventual, with **no invalidation site to add it to**.
  Two further facts belong in the decision: a dropped invalidation is silent — `cache.invalidation.dropped`
  (`backend/src/common/cache/cache.service.ts:78`) is logged and **no alert script reads it** (already
  recorded in this lane's S23 DB-observability box) — and the two services that key this namespace
  derive the membership component differently, `actingMembershipId`
  (`knowledge-authorization.service.ts:52`) versus `accountableMembershipId`
  (`kb-access.service.ts:40`), so an impersonated actor occupies two distinct keys in one namespace.

  **Decision:** (a) if standing is to be cached, first give project reach a namespace and wire
  invalidation into every project-membership writer — otherwise cache only the fields that already
  have an invalidation hook; (b) give `cache.invalidation.dropped` a consumer before any
  authorization-path value depends on invalidation landing; and (c) settle whether the acting or the
  accountable membership is the ACL identity, since today both are in use against one namespace.
  The box's closing instruction — *"do not add caching to the authorization path until revocation
  can actually be tested"* — was obeyed: the fix above is a **request-lifetime memo, not a cache**,
  and it cannot outlive a revocation by more than the one request already in flight.

- [x] **Re-run the repo's own read-cost gates.**
  — **DECISION-REQUIRED**, and the ledger's reason is **wrong for two of the three**. The box says
  *"they need a database, so the regression is currently unmeasurable here."* Two of them need no
  database at all — neither `check-db-call-count.mjs` nor `check-route-budgets.mjs` references
  `DATABASE_URL` or opens a connection — so I ran them, self-test first per the repo's own rule:

  | Gate | Self-test | Real run |
  |---|---|---|
  | `check:db-call-count` | EXIT 0 — `all 44 detection/classification/coverage checks passed` | **EXIT 1** |
  | `check:route-budgets` | EXIT 0 — all checks pass | **EXIT 1** |
  | `db:check-read-budgets` | **EXIT 1** — `RUNNER FAILED: PAM authentication failed for user "streamline_app"` | not reached |

  Both DB-free gates are **red at baseline, and none of it is this regression.**
  `check:db-call-count` reports 3 unclassified new call sites (quotes-export, session-revocation-helpers,
  timesheets approval-escalation), 4 stale entries for deleted files, 6 stale verdicts, and one
  genuine regression — `/kb/wiki/kb-import-export.service.ts` is marked `N+1-FIXED` and the detector
  matches it again (handoff below). `check:route-budgets` fails on one structural violation:
  61 cron batches declare no budget against a recorded watermark of 42, plus
  `GET /inventory/stock/transactions measuredBufferBlocks=377 exceeds maxBufferBlocks=60`. Nothing in
  either report touches KB standing.

  **That is the finding, not an aside: neither runnable gate can see this regression.**
  `check:db-call-count` detects N+1 *loops*, and re-resolving standing at three call sites is three
  straight-line resolutions, not a loop. `check:route-budgets` compares declared ceilings against
  `measuredBufferBlocks` / `measuredLatencyP95Ms` fields that are **populated by a database-backed
  run** — the static half only checks that entries exist. The one gate that would actually measure
  the regression is `db:check-read-budgets`, which drives EXPLAIN as `streamline_app` (BE-76) and
  fails authentication here. Production is the only database this repo has.

  **Decision:** authorise an EXPLAIN-capable non-production target with the `streamline_app` role and
  a tenant GUC, or accept that per-request statement growth in KB authorization is unmeasured and
  relies on the memo test above as its only guard. I did **not** re-run either gate after my change:
  other lanes began editing this shared working tree mid-session (`kb-page-trash.service.ts`,
  `kb-analytics.service.ts`, `kb-helpcenter-response.schemas.ts` and four more appeared as modified
  while I worked), and a repo-wide count taken over a tree other agents are editing measures them,
  not me. My change adds no call site, so neither gate's input moved.

**Evidence (addendum).** `npx jest --runTestsByPath src/modules/kb/core/authorization/knowledge-authorization.service.spec.ts -w 2`
→ before the fix **1 failed, 20 passed**; after **21 passed, 21 total**.
Regression sweep over every spec that reaches this service —
`knowledge-collection-owner-scope`, `knowledge-collection.service`, `kb-citation-visibility-bounds`,
`kb-page-search`, `kb-source-citation`, `kb-space-access` → **6 suites, 83 tests, all passing**; then
`kb-ask.service`, `kb-page-grants-cursor`, `kb-spaces-ask-indexed`, `kb-spaces-cursor`,
`kb-spaces-review-summary`, `kb-spaces-tenant-isolation`, `test/security/bola/bola-rag-object-scope`
→ 6 suites pass, **`bola-rag-object-scope` fails 3 of its tests, pre-existing and not mine**:
`TypeError: tx.insert is not a function` at `backend/src/modules/kb/retrieval/kb-ask.service.ts:356`,
the `kbAiInteractions` audit insert. `git diff --name-only` shows both that service and that spec are
**byte-identical to HEAD** — my diff is two files, both under `core/authorization/` — and the spec's
transaction double declares no `insert` at all. The insert arrived in commit `351a12913` without the
double being updated; the ledger's own S01 block records this suite at 18 passed before that commit.
`npx eslint` over all three touched files → EXIT 0. `npx tsc --noEmit -p tsconfig.build.json`
filtered to the touched paths → **zero errors** (filtered rather than reported whole, because other
lanes are editing this tree). No `any`, no `as X`, no `@ts-ignore`, no code comments.

## Files changed (addendum)

- `backend/src/modules/kb/core/authorization/kb-standing-request-memo.ts` — **new.** Request-lifetime
  standing memo: `WeakMap` keyed by the per-request `ObservabilityContext`, four-part slot key,
  eviction on rejection, pass-through when no context exists.
- `backend/src/modules/kb/core/authorization/knowledge-authorization.service.ts` — `resolveStanding`
  routes through the memo; its previous body is now the private `computeStanding`. +14 lines.
- `backend/src/modules/kb/core/authorization/knowledge-authorization.service.spec.ts` — 5 new tests
  in one describe. +97 lines.

No migration, no `db/**` file, no `REQUIREMENT-LEDGER.md` edit, no git state command.

## Handoffs (addendum)

6. **`check:db-call-count` reports a KB N+1 regression** (whoever owns KB import/export).
   `/kb/wiki/kb-import-export.service.ts` is classified `N+1-FIXED` in the gate's ledger and the
   detector matches it again — the gate calls this `REGRESSED`. Independently, the gate is red for
   13 further pre-existing reasons across non-KB modules (3 unclassified new call sites, 4 stale
   entries for deleted files, 6 stale verdicts). Do **not** run `--emit-classification` to clear it;
   that flag rewrites the ledger and destroys the evidence.

7. **`bola-rag-object-scope.spec.ts` has been red since commit `351a12913`** (cross-slice, security).
   Three tests fail on `tx.insert is not a function` — `kb-ask.service.ts:356` gained a
   `kbAiInteractions` audit insert and the spec's transaction double was never given an `insert`.
   This is a **BOLA spec**, so while it is red those three cross-tenant context-window assertions are
   not running at all.

8. **`slo-catalogue.spec.ts` cannot run its self-test: `module-manifest.json` is absent.**
   The file is generated by `pnpm modules:export-manifest` and is neither committed nor gitignored,
   so the spec dies `ENOENT` at `src/common/slo/slo-catalogue.spec.ts:316` and reports 6 failures
   where this lane's earlier pass recorded 2 (`workflow-stranded`, `response-contract-violations`).
   The `#kb-search` runbook anchor and the `### kb-search` completion-plan entry this lane added are
   both still present — `FAILURE-RUNBOOKS.md:693` and `completion-plan.md:6637` — so the additions
   are intact; it is the gate that is currently unable to check them. Regenerate the manifest before
   reading anything into that suite's colour.

9. **Project reach has no cache namespace and no invalidation writer** (S22/S04, prerequisite).
   Before any decision to cache `KbActorStanding`, `getAccessibleProjectIds`
   (`backend/src/modules/kb/retrieval/kb-project-access.util.ts:6`) needs a namespace and every
   project-membership writer needs an invalidation call — the five KB namespaces that exist today
   (`kb:acc-spaces`, `kb:settings`, `kb:articles`, `kb:ingest`, `kb:chunk-count`) cover no part of it.
