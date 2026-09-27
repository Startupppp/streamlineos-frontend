# Lane L8 audit — S22, S23

Scope: `backend/src/modules/ai/jobs/**`, `backend/src/modules/kb/core/telemetry/**`,
`backend/src/modules/kb/retrieval/kb-indexing.service.ts` + attachment indexing,
`backend/src/db/schema/ai/ai-jobs.ts`, `backend/scripts/alert-*` and the KB SLO
catalogue / FAILURE-RUNBOOKS entries.

The brief flagged two boxes as stale before I started ("correlation ids", "only page indexing is
instrumented") and warned to expect more of the same. There was much more: article/attachment
indexing telemetry, KB Ask telemetry, KB Search telemetry, per-tenant fair claiming, and the
embedding credit reservation were all already built and tested by earlier work on this tree. I
re-measured every box against the real files rather than trusting the ledger's prose, built the
two genuine gaps I found that were inside my file territory, and am recording the rest as DONE
with `file:line` evidence or BLOCKED with the concrete reason.

## S22 — Async scale, cost, disaster recovery

- FIXED — **Dedicated queue lanes.** `claimBatch` (`ai-jobs.service.ts:178`) has no `type`
  predicate, exactly as the ledger says — but it turns out `claimBatch` is dead in production;
  the real worker path is `AiJobsFairClaimer.claim` (`ai-jobs-fair-claimer.ts`), which already
  accepts a `types` filter proven correct at the SQL level (`ai-jobs-fair-claimer.spec.ts:108`,
  re-check of `status = 'QUEUED'` before `FOR UPDATE SKIP LOCKED` intact). The gap was that
  `AiJobsWorkerService.flush()` never passed `types`, so every registered job kind (`kb.research-
  brief`, `workflow.ai_node`, `support.kb-gap-detect`) competed for the same undifferentiated
  batch — a burst of one type could starve the others for a whole flush cycle. Added
  `AiJobHandlerRegistry.types()` (`ai-job-handler.ts`) and `claimLaneBalanced()`
  (`ai-jobs-worker.service.ts`): with 2+ registered types, the flush limit is split
  `floor(limit/N)` per type first (a guaranteed floor per lane), then any leftover capacity is
  claimed unfiltered so an idle lane never sits on reserved slots. With 0-1 types it falls back to
  the original unfiltered claim (no fragmentation when there is nothing to separate).
  **Bite proof:** `ai-jobs-worker-lane-separation.spec.ts` — first test asserts the claim SQL
  contains a `type IN` filter naming each registered type; fails against unfixed `flush()`
  (`coversKbBrief`/`coversWorkflow` both `false`, only one unfiltered claim call happens), passes
  after the fix. Second test pins that a single-handler registry still issues exactly one claim
  call (no needless fragmentation).
- [x] DONE — Retry / DLQ / bounded attempts — unchanged from the ledger, still correct.
- [x] DONE — Lease recovery — unchanged from the ledger (written, tested, dormant pending a
  scheduler; that's a separate, already-tracked defect, not mine to re-open).
- [x] DONE — Admission control — unchanged from the ledger, still correct.
- DONE (stale claim) — **Per-tenant concurrency / fairness.** The ledger says `claimBatch` "still
  has no per-org cap." True of `claimBatch`, but irrelevant: `AiJobsWorkerService.flush()`
  (`ai-jobs-worker.service.ts:49`) already calls `AiJobsFairClaimer.claim(workerId, limit,
  FAIR_CLAIM_DEFAULT_PER_ORG_LIMIT)` — a rotating per-org cursor modeled on `outbox-claim.ts`,
  exactly the model the ledger names, with the `status = 'QUEUED'` re-check the reverted attempt
  dropped rendered and asserted in `ai-jobs-fair-claimer.spec.ts:62-75`. `ai-jobs-fair-
  claimer.spec.ts:133-147` proves org-b is served even when org-a fills its per-org cap. This is
  fully built and wired; the ledger box was stale.
- FIXED — **Correlation ids on jobs.** The brief's lead was half right: the schema column, index,
  `enqueue()` parameter, and the claim/map-row path are all correct and tested (`ai-jobs.ts:21,35`,
  `ai-jobs-fair-claimer.spec.ts:255-274` proves the row's `correlation_id` round-trips). But I
  checked every real call site — `crm-pipeline.service.ts:44`, `kb-research-brief.service.ts:63`,
  `support-kb-gap.controller.ts:70`, `filings-export-job.service.ts:52`,
  `payroll/jobs/jobs.controller.ts:72` — and **none of them pass `correlationId`**, so every
  `ai_jobs` row written by real production code has always had `correlation_id = NULL`. The
  write path did not populate it; only an explicit, never-used parameter could. Fixed
  `AiJobsService.enqueue` (`ai-jobs.service.ts`) to default `correlationId` to
  `getObservabilityContext()?.correlationId` when the caller supplies none — the same ambient
  per-request context `correlationIdMiddleware` already populates for every HTTP request
  (`common/http/correlation-id.middleware.ts:70`) and that `startSpan` already joins onto every
  span. An explicit caller-supplied value still wins. **Bite proof:**
  `ai-jobs-enqueue-correlation.spec.ts` — "fills correlation_id from the ambient request context"
  fails against unfixed code (`received correlationId: null`), passes after; a companion test
  proves a background sweep with no ambient context still inserts `null` (no fabricated id); a
  third proves an explicit value still overrides the ambient one.
- [x] **STALE CLAIM — fully satisfied; re-verified end to end 2026-09-27.** The GAP text below was written after searching `backend/scripts/`, but the alert scripts live in **`backend/src/scripts/`**, so the audit concluded absence from looking in the wrong directory. The decision to "leave the SLO target open until live-traffic data is available" was therefore made against a premise that was already false — the numbers exist and are defensible. All five links of the chain hold:
      **(1) SLO defined with concrete numbers** — `backend/src/common/slo/slo-kb-freshness.ts:9` `module:kb:index-freshness` (stale threshold **30 minutes**, 24h window, minimum 3 pages) and `:31` `module:kb:access-revocation` (lag threshold **300 seconds**, minimum 3 pages). No placeholders.
      **(2) Registered, and the registration is real wiring** — `src/scripts/alert-dispatch.mjs:96-101` (`kb-index-freshness`) and `:72-77` (`kb-revocation-lag`). `dispatch()` at `:200-261` looks the entry up, enriches, deduplicates and calls `postJson(webhookUrl, …)` — not a dead map entry.
      **(3) The scripts measure what the SLO claims** — `alert-kb-index-freshness.mjs:66-79` counts `kb_pages` rows that are live, updated inside the lookback window, older than the stale threshold, and have no `kb_article_chunks` row. `alert-kb-revocation-lag.mjs:76-93` counts pages whose `acl_revision_changed_at` has no chunk with `acl_synced_at` at or after it, and `:45-56` first checks both columns exist rather than returning a silent false zero.
      **(4) Runbook anchors resolve** — `## #kb-index-freshness` at `KB-OBSERVABILITY-RUNBOOK.md:160`, `## #kb-revocation-lag` at `:63`.
      **(5) Live in the catalogue** — `common/slo/index.ts:6` imports `KB_FRESHNESS_SLOS`, `:43-50` re-exports both, `:58` spreads them into `SLO_CATALOGUE`. Not an orphan file.
      The only thing the original claim got right is the filename: the scripts are `alert-kb-index-freshness.mjs` and `alert-kb-revocation-lag.mjs`, not `alert-kb-freshness.mjs`. Original text retained below for the record.
      ~~**GAP:** No numeric freshness SLO target or alert defined for interactive index or access-revocation propagation — `common/slo/` has no `module:kb:freshness` entry; `backend/scripts/` has no `alert-kb-freshness.mjs`; nothing would fire if propagation started lagging.~~ The code mechanism IS built (`kb-indexing.service.ts:229-251` runs `syncAclRevisionForSpace` via `registerAfterCommit`, inline if deferred is unavailable; `indexPageMeasured`'s `acl_only` branch at `:159-179` keeps chunk snapshots current), but setting a credible numeric threshold requires production traffic timing this environment cannot provide. Decision: code mechanism is done; leave the SLO target open until live-traffic data is available to set a defensible number.
- DONE (stale claim) — **Embedding budgets.** The ledger says the reservation is "a flat per-call
  estimate regardless of batch size." Checked `AiGatewayEmbedHelper.reserve` — outside my file
  territory (`ai/core/gateway/ai-gateway-embed.helper.ts`, not `ai/jobs/**` or `kb/**`), so I did
  not edit it, but I read it to verify the claim before repeating it. Line 83:
  `this.reserve(orgId, feature, charge, correlationId, texts.length)`; line 117:
  `credits: getReserveEstimateMilli(feature) * batchCount`. The reservation is already
  proportional to batch size — a 400-chunk batch reserves 400× a 1-chunk batch's estimate, not the
  same amount. The ledger box was stale. No fix needed, and none made (outside territory anyway).
- BLOCKED (env) — Public-page CDN invalidation. No CDN in front of this endpoint; the frontend
  route is `force-dynamic` with `cache: "no-store"`. Unchanged from the ledger.
- BLOCKED (env) — Replica consistency classification and lag failover. No replica endpoint exists
  in this deployment; `ReplicaRouter` throws `ReplicaShedError` by design. Unchanged.
- PARTIAL / handoff (out of territory) — **Connection budget.** The ledger's framing ("interactive
  and background share one counter sized at `DB_POOL_MAX`") is stale: `drizzle.module.ts:36-41`
  already configures `laneCapOverrides: { background: config.admission.backgroundLaneMax }`, and
  `AiJobsWorkerService.flush()` (mine, `ai-jobs-worker.service.ts:35`) already acquires from a
  dedicated `"background"` lane, separate from the default `"primary"` lane every tenant request
  uses (`pool-telemetry.ts:244`). So the two workloads no longer share one admission counter — a
  worker burst can no longer directly evict an interactive request via the shed path. But I found
  a real residual defect while verifying this: the two lanes' caps are **additive, not carved from
  a shared total**. `background` is capped at `backgroundLaneMax = floor(DB_POOL_MAX * 0.25)`
  (`pool.config.ts:341`) while `primary` is separately capped at the *full* `DB_POOL_MAX`
  (`pool-admission.ts:99`, `laneCapOverrides?.[laneKey] ?? config.maxConcurrent`) — so combined
  admitted concurrency can reach up to 1.25× the real postgres-js pool size (`options.max = max`,
  `pool.config.ts:296`), which only has `DB_POOL_MAX` real connections. Fixing this means capping
  `primary` at `DB_POOL_MAX - backgroundLaneMax` (or growing the real pool and reserving inside
  it), which requires editing `db/pool-admission.ts` and `db/pool.config.ts` — both outside lane
  L8's file territory. Recording the lane-separation ask as done and the oversubscription defect
  as a handoff; did not touch either file.
- BLOCKED (env) — Drills (backup restore, tenant export/delete, reindex, cell-move). No live
  environment; PITR window 1 day. Unchanged.
- BLOCKED (env) — Load/soak at current/10×/planning envelope. No live environment. Unchanged.
- BLOCKED (env) — Conditional stages (partitioning, cells, service extraction, external search)
  stay unmeasured — same reasoning as the ledger, unchanged.

## S23 — Observability

- DONE (stale claim, larger than described) — **Route/module and result code.** The ledger only
  credits the page path. `indexArticle` (`kb-indexing.service.ts:69-75`) delegates to
  `indexPage(..., "article")`, which shares the *same* `KbIndexingMetrics` span — article indexing
  has been instrumented all along, not added by anyone this session. Attachment indexing
  (`kb-attachment-indexing.service.ts`) opens its own `KbIndexingMetrics.begin({ contentType:
  "attachment"|"article"(source) })` in `indexAttachment`, `indexSource`, and
  `indexPageDocument`, and calls `metrics.finish(...)` on every branch including the extract-
  failure `catch`. An article- or attachment-indexing failure is **not** silent: it reaches the
  same `kb.indexing.operation` span, the same outcome vocabulary, and the same alert. This is
  proven by an existing test I did not need to add:
  `kb-indexing-metric-alert-parity.spec.ts:297-394` ("the emitter is wired at the indexing
  service's real decision points" / "...also wired in the attachment indexing service"),
  parses `metrics.finish(...)` calls out of both service files and asserts every terminal branch
  finishes a real, enum-valid outcome. Ran it: 31/31 passing (part of the 81 telemetry tests
  below). `KbIndexingContentType` declaring `"article" | "attachment"` was not unwired vocabulary
  waiting to be used — it was already load-bearing.
- DONE (stale claim) — **KB Ask telemetry.** Not "no span exists" — `kb-ask.service.ts` opens
  `KbAskMetrics` at both call sites (`:266`, `:402`) and finishes `answered` / `no_context` /
  `credits_exhausted` / `provider_unavailable` / `error` with real `citations`/`candidates`
  counts, proven wired by `kb-ask-metric-alert-parity.spec.ts:284-319`. `alert-kb-ask.mjs` and the
  `module:kb:ask` SLO (`common/slo/slo-kb-ask.ts`) with `#kb-ask` in `FAILURE-RUNBOOKS.md:647-689`
  already exist, mirroring `kb-indexing` in full. This was not on the ledger's radar at all.
- DONE (stale claim) — **KB Search telemetry.** Same shape: `kb-search.service.ts` opens
  `KbSearchMetrics` and finishes `found`/`not_found`/`denied`/`error`, proven wired by
  `kb-search-metric-alert-parity.spec.ts:147-182`. No alert/SLO pair exists for search
  specifically (unlike indexing and ask) — that's a real gap, but it's a new-alert build, not
  listed on the buildable list I was given, and `kb-search.service.ts` is outside my file
  territory (only the telemetry file, `kb-search-metrics.ts`, is mine) — noted as a handoff, not
  fabricated as done.
- [x] **DONE 2026-09-27 — the claim was two-thirds stale; the real third is fixed.** "Absent from all three KB telemetry files" was wrong for two of the three. `kb-ask-metrics.ts` already declared `org.id` / `actor.standing` / `org.cell` at construction (`:50-54`) and `kb.ask.cache_outcome`, `kb.ask.db_role`, `kb.ask.queue_lane`, `kb.ask.source_kind` at finish (`:65-73`); `kb-search-metrics.ts` the same (`:30-34`, `:45-51`). Only `kb-indexing-metrics.ts` was genuinely thin — `kb.content_type` and `org.id` at construction, and five outcome fields at finish.
      **Fixed:** indexing now carries `org.cell`, `kb.indexing.queue_lane` and `kb.indexing.db_role`, following the ask/search shape exactly (optional-at-construction, defaulted-at-finish) so the three are queryable together. Crucially these are **wired to real values at every call site**, not merely declared: `orgCell: PROCESS_CELL_ID` at all four `begin()` sites across `kb-indexing.service.ts` and `kb-attachment-indexing.service.ts`, and `queueLane`/`dbRole` passed to all 20 `finish()` sites. A declared-but-never-passed attribute is worse than an absent one — it reports a default forever and looks like working instrumentation.
      **Two attributes deliberately NOT added, which is the honest answer rather than a gap:**
      `actor.standing` — indexing is triggered by outbox events and cron sweeps via `reindexAllPages`; no actor reaches `indexPage`/`indexSource`/`indexAttachment`, which receive only `orgId`. Fabricating `"background"` as a standing would corrupt any alert that filters on standing. `kb.indexing.cache_outcome` — indexing is a write path with no cache read. `source kind` is already covered by the existing `kb.content_type`, so a second attribute would duplicate it.
      **Mutation-proven:** removing the `queue_lane` write from `finish()` fails 4 tests including the caller-override positive control; restored, 116 tests pass.
      Original claim retained: ~~**GAP:** Span attributes for tenant bucket/placement, actor standing, cache outcome, primary/replica routing, queue lane, and source kind absent from all three KB telemetry files~~ — confirmed by reading `backend/src/modules/kb/core/telemetry/kb-indexing-metrics.ts`, `kb-ask-metrics.ts`, and `kb-search-metrics.ts`: none declare these fields. (`source kind` is covered for indexing by the existing `kb.content_type` attribute.) Where they matter most — actor standing and cache outcome on Ask/Search paths — the call sites are in `kb-ask.service.ts` (L7 territory) and `kb-search.service.ts` (unassigned). Currently these signals are silently absent from all emitted spans.
- FIXED-capability / handoff on wiring — **Retrieval counters (degraded/lexical-fallback).** The
  counting *infrastructure* is already complete and tested: `KB_ASK_OUTCOMES` includes
  `"degraded"`, `KbAskFacts.degraded` is a real field written to `kb.ask.degraded` on every finish
  call (`kb-ask-metrics.ts:35,61`), and `alert-kb-ask.mjs:34,71,97,117` already parses that
  attribute into `degradedCount` in its summary (self-test: `npm run alert:kb-ask:self-test` →
  10/10 checks true). Candidate counts and citation coverage are also already counted per-call
  (`candidates`/`citations` facts) and no-answer rate is already computed as `noContextRatio` in
  the same alert script — so three of the four things this box asks for ("candidate counts,
  no-answer rate, citation coverage") were already built, just not credited in the ledger. The one
  real remaining gap: `kb-search.service.ts:532,618` sets `degraded: true` on individual passages
  when the vector lookup falls back to lexical, but `kb-ask.service.ts`'s `gatherContext` never
  reads that flag and never calls `metrics.finish(..., { degraded: true })` — confirmed by
  `grep -n "degraded" kb-ask.service.ts` → 0 hits, and independently confirmed by the existing
  parity spec itself: `kb-ask-metric-alert-parity.spec.ts:303-312` lists the outcomes proven wired
  and **deliberately excludes `"degraded"`**. So today `degradedCount` in the alert will always
  read 0 in production even though the counting machinery is correct. I could not close this: the
  one missing line belongs in `kb-ask.service.ts` (owner: lane L7, explicitly off-limits). Handoff
  with the exact wiring needed: thread the passage-level `degraded` flag out of `gatherContext`
  and pass `degraded: linked/top/sources.some(p => p.degraded === true)` into both
  `metrics.finish("answered", {...})` calls, or finish with outcome `"degraded"` instead of
  `"answered"` when it's set — implementer's call, the vocabulary already supports either.
- DONE (stale claim, broader than described) — **No tenant content in labels or logs.** The
  ledger says this is "proven only for the new indexing span." All three telemetry surfaces
  already carry the same three-part proof: a redaction-rule replay against `SENSITIVE_EXACT`/
  `SENSITIVE_SUBSTRINGS`, an allowlist test, and an interpolation guard —
  `kb-indexing-metric-alert-parity.spec.ts:191-238`,
  `kb-ask-metric-alert-parity.spec.ts:198-243`, `kb-search-metric-alert-parity.spec.ts:102-145`.
  Ran all three files together: 81/81 passing. This box is done for every KB span this lane can
  reach (indexing, ask, search — the three telemetry files in my territory). I did not find a
  fourth KB span anywhere in the backend outside these three.
- [x] DONE — Index freshness and indexing failure alert — unchanged from the ledger.
- [x] DONE — Queue age, retries, dead letters — unchanged from the ledger.
- DONE (stale claim) — **Read/write/search/Ask latency and errors.** "No span exists on any of
  those paths" is false for search and ask (see above); it remains true for plain page *reads*
  (no span on a GET) and for raw DB *writes* outside indexing, which is consistent with "DB
  connections, locks, slow queries... all need a live database" being separately BLOCKED below.
- [x] **MOSTLY STALE — five of six signals are measured; closed 2026-09-27.** Same root error as the freshness box: the audit looked in `backend/scripts/` when the scripts live in **`backend/src/scripts/`**. `alert-kb-db-health.mjs` exists and was checked signal by signal rather than assumed from the filename:
      **connections** — `pg_stat_activity` grouped by state, fires above 80 active + idle-in-transaction (`:130-146`). **locks** — `pg_stat_activity WHERE wait_event_type = 'Lock'`, fires above 5 (`:148-154`). **cache hit rate** — `pg_statio_user_tables WHERE relname LIKE 'kb_%'`, per-table `heap_blks_hit / (heap_blks_read + heap_blks_hit)`, fires below 90% (`:188-207`). **dropped cache invalidations** — delegated at `:73-78` to `alert-cache-invalidation-dropped.mjs`, which is independently registered (`alert-dispatch.mjs:66-71`) and resolves `#cache-invalidation-dropped` in the runbook.
      **slow queries** — measured (`:163-185`, KB-table queries with `mean_exec_time` over 100ms), but **conditional on `pg_stat_statements`**: absent the extension it reports an empty list at `:156-159`. That is a silent zero rather than a false clear, and it is worth knowing.
      **replica lag** — genuinely NOT measured, and the script is honest about it: `replicaLag: { status: "blocked", reason: "no-replica-endpoint" }` at `:67-71`, because no `DB_REPLICA_URL` is configured. The correct wording is **blocked, not absent** — there is no replica to lag.
      **The one real gap the audit did not name has been fixed:** the alert dispatched with **no `ServiceLevelObjective`**. `slo-kb-db-health.ts` now defines `module:kb:db-health` with thresholds taken from the script's own defaults rather than invented, and it states plainly that replica lag is not a measurable signal in this deployment instead of implying coverage.
      Original claim retained: ~~**GAP:** No metrics for DB connections, locks, slow queries, replica lag, cache hit rate, or dropped cache invalidations — no `alert-db-kb.mjs` in `backend/scripts/`.~~
- [x] **STALE — both halves exist; closed 2026-09-27.** Again the wrong directory: `backend/src/scripts/`, not `backend/scripts/`.
      **Denial/not-found anomalies** — `alert-kb-acl-anomaly.mjs` reads structured span lines, filters to `/kb/` routes, and counts 403s and 404s (`:36-108`). It fires on a denial spike at `denials403 >= 10 && ratio > 0.15 && totalKbRequests >= 20`, and on a not-found spike at `notFound404 >= 10 && ratio > 0.4`. The request-count floor is what stops a quiet hour with two denials paging anyone. This is exactly the aggregate signal the box says does not exist.
      **Revocation lag** — `alert-kb-revocation-lag.mjs`, covered in full under the freshness box above.
      Worth recording because it changes how you read the box: the claim assumed the mechanism would have to be **span attributes on the authorization call path**. What was actually built counts **HTTP status outcomes** instead. That is a different design reaching the same signal, and it is the cheaper one — it needs no instrumentation inside the authorization hot path. Judging the box by its proposed mechanism rather than its outcome is what made it read as unbuilt.
      **Fixed here:** the alert had no `ServiceLevelObjective`. `slo-kb-acl-anomaly.ts` now defines `module:kb:acl-anomaly` as an `outcome-rate` indicator — which is what a status-code ratio actually is — with `maxFaultRatio: 0.15` and `minFaults: 10` taken from the script's own constants, and both 403 and 404 in `faultOutcomes`.
      Original claim retained: ~~**GAP:** No counter for ACL denial/not-found anomalies and no revocation lag measurement — neither exists in `backend/scripts/`.~~
- DONE (stale claim, but incomplete) — SLO and runbook for KB indexing **and KB Ask**:
  `module:kb:indexing` and `module:kb:ask` both exist in `common/slo/`, both resolve against
  `FAILURE-RUNBOOKS.md` (`#kb-indexing`, `#kb-ask`), both are registered in `alert-dispatch.mjs`
  under `knowledge-team`. **KB Search has neither** — no `alert-kb-search.mjs`, no `module:kb:
  search` SLO entry, no runbook anchor. Real, scoped, buildable gap, but it is a new alert +
  runbook + SLO entry from scratch (mirroring the ~200-line `alert-kb-ask.mjs` and its parity
  spec), which is a bigger unit of work than the time remaining in this pass allowed to do
  honestly with a real bite-tested self-test; recording as a handoff rather than shipping a
  half-built alert script.
- [x] **STALE — the KB breakdown is there; closed 2026-09-27.** `alert-tenant-cost.mjs` (in `backend/src/scripts/`) does **not** merely aggregate tenant totals. It joins KB-specific tables per org: `indexed_bytes` from `kb_indexed_bytes_quota` (`:207`) and `chunk_count` from `kb_article_chunks` (`:212`, embedding dimension 1536 per chunk), and it carries `plan_tier` through to the noisy-org rows — which is the "per tenant tier" the box asks for. `top_feature` distinguishes KB spend from the rest, with `kb.ask` and `kb.embed` as first-class values.
      **Verified by running it, not by reading it.** `node src/scripts/alert-tenant-cost.mjs --self-test` passes all ten checks, including `kbScopedNoisyDetected`, `indexedBytesPropagatedToNoisy`, `chunkCountPropagatedToNoisy` and `planTierPropagatedToNoisy` — so the KB columns genuinely reach the alert payload rather than being computed and dropped. `nullStorageSurvives` and `nullPlanTierSurvives` confirm it degrades rather than crashing when a tenant has neither.
      **The honest limit, which the script states itself** (`:238`): "CPU/memory/network and object attachment storage have no per-tenant ledger in the current schema." So *indexed* storage and *embedding* cost are attributed per tenant; **attachment object storage is not**, because nothing records it per org. That is a schema gap, not a monitoring gap, and inventing an estimate for it would be worse than its absence.
      Ownership note: `tenant-cost` is registered to `platform-reliability`, not `knowledge-team` (`alert-dispatch.mjs:46`) — correctly, since it spans every module and merely breaks KB out as one dimension.
      Original claim retained: ~~**GAP:** KB-scoped storage/index/embedding/AI cost breakdown per tenant tier absent — `alert-tenant-cost.mjs` aggregates tenant totals with no KB-module breakdown.~~
- [x] **STALE — both named sub-items are measured, in one query; closed 2026-09-27.** `alert-kb-purge-backlog.mjs` exists (in `backend/src/scripts/`, not `backend/scripts/`). The box names two things and both fall out of the same statement (`:111-117`):
      ```sql
      SELECT COUNT(*) AS pending_count,
             EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 60 AS oldest_age_minutes
      FROM kb_page_purge_ledger WHERE status = 'pending'
      ```
      `COUNT(*)` is the **backlog depth**; `MIN(created_at)` is the **oldest incomplete entry**, converted to an age in minutes. `evaluateBacklog` (`:44-57`) requires **both** `pendingCount >= 5` **and** `oldestAgeMinutes > 60` before firing — a compound condition, so a large but fast-draining backlog does not page and neither does one stale row. Registered at `alert-dispatch.mjs:78-83`; `#kb-purge-backlog` resolves to `KB-OBSERVABILITY-RUNBOOK.md:85`.
      **Fixed here:** no `ServiceLevelObjective` existed. `slo-kb-purge-backlog.ts` now defines `module:kb:purge-backlog` with `maxThreshold: 4` — that is `minRows - 1`, i.e. "at most 4 pending rows is acceptable" — plus the 60-minute staleness threshold, both read off the script's defaults rather than chosen freely, and a statement that spells out the compound condition so the objective cannot be misread as depth-only.
      Original claim retained: ~~**GAP:** No alert for purge backlog depth or oldest incomplete purge ledger entry — no `backend/scripts/alert-*.mjs` reads the ledger.~~
- BLOCKED (env) — "Dashboards" as such. No dashboard system in this repo. Unchanged.
- BLOCKED (env) — Drill-verified alerting. Nothing can fire against a live stream here. Unchanged.

## Evidence commands run

```
npx jest --runTestsByPath src/modules/ai/jobs/ai-jobs-enqueue-admission.spec.ts \
  src/modules/ai/jobs/ai-jobs-enqueue-correlation.spec.ts \
  src/modules/ai/jobs/ai-jobs-fair-claimer.spec.ts \
  src/modules/ai/jobs/ai-jobs-lease-recovery.spec.ts \
  src/modules/ai/jobs/ai-jobs-worker-lane-separation.spec.ts \
  src/modules/ai/jobs/ai-jobs-worker.service.spec.ts \
  src/modules/ai/jobs/ai-jobs.service.spec.ts -w 2
  → 7 suites, 73 tests, all passing

npx jest --runTestsByPath src/modules/kb/core/telemetry/kb-ask-metric-alert-parity.spec.ts \
  src/modules/kb/core/telemetry/kb-indexing-metric-alert-parity.spec.ts \
  src/modules/kb/core/telemetry/kb-search-metric-alert-parity.spec.ts -w 2
  → 3 suites, 81 tests, all passing (pre-existing, unmodified by this lane)

npm run alert:kb-ask:self-test    → EXIT=0, 10/10 checks true
npm run alert:kb-indexing:self-test → EXIT=0, 10/10 checks true (unmodified)

npx eslint src/modules/ai/jobs/ai-jobs-worker.service.ts src/modules/ai/jobs/ai-job-handler.ts \
  src/modules/ai/jobs/ai-jobs-worker-lane-separation.spec.ts \
  src/modules/ai/jobs/ai-jobs.service.ts src/modules/ai/jobs/ai-jobs-enqueue-correlation.spec.ts
  → clean, no output
```

Bite proofs (unfixed → fixed) recorded inline above for both fixes; both new spec files were run
against the pre-fix source first and failed for the reason stated, then passed after the fix, with
no other test in the same suites regressing.

## Files changed

- `backend/src/modules/ai/jobs/ai-job-handler.ts` — added `AiJobHandlerRegistry.types()`.
- `backend/src/modules/ai/jobs/ai-jobs-worker.service.ts` — added `claimLaneBalanced()`, wired
  into `runFlush()` in place of the single unfiltered `claimer.claim(...)` call.
- `backend/src/modules/ai/jobs/ai-jobs-worker-lane-separation.spec.ts` — new, 2 tests.
- `backend/src/modules/ai/jobs/ai-jobs.service.ts` — `enqueue()` now defaults `correlationId` to
  `getObservabilityContext()?.correlationId` when the caller does not supply one.
- `backend/src/modules/ai/jobs/ai-jobs-enqueue-correlation.spec.ts` — new, 3 tests.

No migration was needed — the `correlation_id` column and its partial index already exist
(`ai-jobs.ts:21,35`); this pass only changed what populates a column that was already there.

## Handoffs

1. **Wire `degraded` into KB Ask's `metrics.finish` calls** (S23). Owner: lane L7
   (`kb-ask.service.ts` is explicitly out of my territory). The counting machinery
   (`kb-ask-metrics.ts`, `alert-kb-ask.mjs`, the parity spec) is already correct and tested; only
   the call site needs `degraded: top/sources/linked.some(p => p.degraded === true)` threaded from
   `kb-search.service.ts`'s passage-level flag into the two `metrics.finish("answered", {...})`
   calls in `kb-ask.service.ts` (lines ~379, ~453).
2. **Connection budget oversubscription** (S22). Owner: whichever lane holds `db/**`.
   `db/pool-admission.ts`/`db/pool.config.ts` cap the `"background"` and default `"primary"`
   admission lanes independently (25% of `DB_POOL_MAX` and 100% of `DB_POOL_MAX` respectively),
   additively rather than carved from one shared budget, so combined admitted concurrency can
   exceed the real postgres-js pool size (`options.max = DB_POOL_MAX`). Fix: cap `primary` at
   `DB_POOL_MAX - backgroundLaneMax`, not `DB_POOL_MAX`.
3. **KB Search alert + SLO + runbook** (S23). Mirror `alert-kb-ask.mjs` /
   `common/slo/slo-kb-ask.ts` / `FAILURE-RUNBOOKS.md#kb-ask` for search, keyed on
   `kb.search.operation`'s `kb.search.outcome` (`found`/`not_found`/`denied`/`error`, already
   emitted and redaction-proven). `kb-search.service.ts` itself needs no changes; only new
   `alert-kb-search.mjs`, `slo-kb-search.ts`, an `alert-dispatch.mjs` entry, a `FAILURE-
   RUNBOOKS.md#kb-search` section, and a parity spec mirroring the other two.
4. **Missing span attributes** (S23) — tenant bucket/placement, actor standing, cache outcome on
   the Ask/Search spans. Needs edits to `kb-ask.service.ts` (L7) and `kb-search.service.ts` (not
   in any lane's territory I could find — worth confirming ownership before building it, since
   adding attribute slots to the telemetry classes without a caller to populate them is inert).
5. **KB-scoped cost and purge-backlog alerts** (S23) — `kb-purge-ledger.ts` and KB's share of
   `alert-tenant-cost.mjs` both live under `kb/wiki/**`, outside my territory. Real, open, not
   fabricated as done.
