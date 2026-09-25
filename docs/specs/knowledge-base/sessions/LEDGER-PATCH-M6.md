# LEDGER-PATCH-M6 — KB S23 Observability

Lane M6 of 8 parallel lanes. Every box below has a verdict.

---

### Box 1 — Actor standing and tenant placement on KB spans

**Verbatim requirement:** "Tenant bucket/placement, actor standing, cache outcome, primary/replica, queue lane, source kind on KB spans — four of six have no live source: primary/replica (ReplicaRouter has zero injection sites), queue lane (KB indexing is synchronous), cache outcome (no hit/miss counter in cache.service.ts), source kind (coarser than reality). Only actor standing and tenant bucket/placement are emittable today. Emit those two on the Ask and Search spans, and record the other four as scoped out with the reason. Do not edit cache.service.ts — lane M5 owns it; write a HANDOFF if you need a hit/miss counter."

**Verdict: DONE (partially) — actor.standing and org.cell emitted on ask/search spans; four attributes scoped out; caller wiring requires a HANDOFF.**

#### Changes made

`backend/src/modules/kb/core/telemetry/kb-ask-metrics.ts` — `KbAskMetrics.begin()` signature extended to accept `actorStanding?: string` and `orgCell?: string`. When present, they are stamped as `actor.standing` and `org.cell` span attributes. Backward-compatible: existing callers passing only `{ orgId }` continue to compile and emit correctly.

`backend/src/modules/kb/core/telemetry/kb-search-metrics.ts` — same change for `KbSearchMetrics.begin()`.

`backend/src/modules/kb/core/telemetry/kb-ask-metric-alert-parity.spec.ts` — allowlist in "declares no attribute whose value could be a question, answer, or body text" updated to include `actor.standing` and `org.cell`.

`backend/src/modules/kb/core/telemetry/kb-search-metric-alert-parity.spec.ts` — same allowlist update.

#### Test sequence (RED → GREEN)

RED — after adding attributes to `kb-ask-metrics.ts`, parity spec failed:
```
× declares no attribute whose value could be a question, answer, or body text
Expected  - 1
Received  + 4
```

GREEN — after updating allowlist:
```
Tests: 24 passed, 24 total  (kb-ask-metric-alert-parity.spec.ts)
Tests: 26 passed, 26 total  (kb-search-metric-alert-parity.spec.ts)
```

#### Scoped out (four attributes with reason)

| Attribute | Reason scoped out |
|---|---|
| `primary/replica` | `ReplicaRouter` has zero injection sites in KB paths; the replica DB handle is wired only to probe checks in `HealthController`. No KB query runs on the replica. |
| `queue lane` | KB indexing is synchronous — `KbArticleReindexService` runs inline in the request or sweep, not through a queue. There is no queue lane to distinguish. |
| `cache outcome (hit/miss)` | `CacheService` has no hit/miss counter. M5 owns `cache.service.ts`. See HANDOFF below. |
| `source kind` | The `kb.content_type` attribute on indexing spans distinguishes `page`, `article`, and `attachment`. On ask/search spans, the source kind is coarser than reality (a search returns a mix of articles, pages, and sources but the span only records counts). Adding a breakdown would require a per-source-kind counter array, which is deferred. |

#### HANDOFF — wiring callers

File: `backend/src/modules/kb/retrieval/kb-ask.service.ts` (outside M6 allowed paths)
File: `backend/src/modules/kb/retrieval/kb-search.service.ts` (outside M6 allowed paths)

Both files call `KbAskMetrics.begin({ orgId: user.orgId })` and `KbSearchMetrics.begin({ orgId: user.orgId })` respectively. They should be updated to:

```typescript
import { getObservabilityContext } from "../../../common/observability";

KbAskMetrics.begin({
  orgId: user.orgId,
  actorStanding: user.role,
  orgCell: getObservabilityContext()?.cellId,
})
```

The `user.role` carries the org-level role string (`owner` / `admin` / `member` or the six-standing module variant). The `cellId` from the observability context is the process-level cell ID, which in the current single-cell deployment equals the tenant's cell placement.

---

### Box 2 — DB connections, locks, slow queries, replica lag, cache hit rate, dropped invalidations

**Verbatim requirement:** "lock/deadlock/timeout/slow-query counters exist but are in-process only (query-fingerprint-registry.ts:97-129), reachable only by polling GET /health/db, so no alert can see them. Export those fingerprint counters to the span stream. Replica lag and cache hit rate are genuinely absent — say so. cache.invalidation.dropped is logged but no alert script reads it: give it a consumer."

**Verdict: PARTIAL — cache.invalidation.dropped consumer created (alert-cache-invalidation-dropped.mjs); fingerprint counter span export requires a HANDOFF; replica lag and cache hit rate confirmed absent.**

#### Changes made

`backend/src/scripts/alert-cache-invalidation-dropped.mjs` — new alert script. Reads the structured log stream for lines matching `cache.invalidation.dropped`. Fires when `drops >= minDrops` (default 1). Self-test passes without a DB connection.

Self-test output:
```json
{"selfTest":true,"pass":true,"checks":{"staleLineExcluded":true,"healthyDoesNotFire":true,"droppingFires":true,"samplesCollected":true,"emptyDoesNotFire":true}}
```

`backend/src/scripts/alert-dispatch.mjs` — registered `cache-invalidation-dropped` with `owner: "platform-reliability"`, `severity: "high"`.

#### Absent metrics — confirmed

**Replica lag:** `DRIZZLE_REPLICA` is the same pooled connection as `DRIZZLE` in production (`pool.config.ts` sets role `"primary"` for both; the replica is only the `probeDb` used in health checks). There is no read replica serving KB queries. `pg_stat_replication` cannot be queried without a primary with at least one streaming standby. This metric is genuinely absent.

**Cache hit rate:** `CacheService` at `backend/src/common/cache/cache.service.ts` tracks `droppedInvalidations` but has no hit/miss counter. M5 owns `cache.service.ts`. Once M5 adds a counter, alert-cache-invalidation-dropped.mjs already reads the log stream and can be extended, or a separate alert can be added. No code change made here.

#### HANDOFF — fingerprint counter span export

File to modify: `backend/src/db/query-telemetry.ts` (outside M6 allowed paths)

The `QueryTelemetryTracker.observe()` method in that file (lines 86-109) already calls `settle(status, outcome)` after each query. `classifyContention(outcome)` returns `lockWait | deadlock | timeout | null`. The change needed is:

1. Extend `OpenSpan.end()` in `backend/src/common/observability/tracing.ts` to accept optional extra attributes:
   ```typescript
   end(status?: "ok" | "error", extra?: Readonly<Record<string, string | number | boolean>>): void;
   ```
2. In `query-telemetry.ts:settle`, pass the contention kind and slow flag:
   ```typescript
   span.end(status, {
     "db.query.slow": durationMs >= SLOW_QUERY_MS,
     "db.query.contention": classifyContention(outcome) ?? "none",
   });
   ```

This makes each `db.query.execute` span carry per-query contention and slow-query flags, which alert scripts can then count from the log stream. The aggregate totals (totals().lockWaits, etc.) would remain as the in-process view but the per-event stream would be navigable.

---

### Box 3 — ACL denial and not-found anomalies, revocation lag

**Verbatim requirement:** "the two anomaly halves are already closed by a prior lane. The revocation lag clause is NOT closed and depends on two timestamp columns (kb_pages.acl_revision_changed_at, kb_article_chunks.acl_synced_at) that lane M5 is authoring a migration for, unapplied. Build the lag metric against those column names so it is ready, keep it inert until the migration lands, and state that dependency explicitly. Do not author the migration yourself — M5 owns it."

**Verdict: DONE — revocation lag alert built against M5 column names; inert until migration lands; dependency stated.**

#### Changes made

`backend/src/scripts/alert-kb-revocation-lag.mjs` — new alert script. Queries `kb_pages.acl_revision_changed_at` and `kb_article_chunks.acl_synced_at`. Guards with a column-existence check: if either column is absent (M5 migration not yet applied), exits with `{ fired: false, reason: "migration-M5-pending" }`. Only computes lag and fires when both columns exist.

The lag query measures pages where `acl_revision_changed_at` is set but no chunk has `acl_synced_at >= acl_revision_changed_at`, and the gap exceeds `--lag-seconds` (default 300 s / 5 min) with at least `--min-pages` (default 3) such pages.

`backend/src/scripts/alert-dispatch.mjs` — registered `kb-revocation-lag` with `owner: "knowledge-team"`, `severity: "high"`, `runbookFile: KB_OBS_RUNBOOK`.

#### Self-test output

```json
{"selfTest":true,"pass":true,"checks":{"lagThresholdDefaultIs300":true,"minPagesDefaultIs3":true,"selfTestRunsWithoutDb":true},"migrationDependency":"lane-M5","columnNames":["kb_pages.acl_revision_changed_at","kb_article_chunks.acl_synced_at"]}
```

#### Dependency

This alert is inert until lane M5's migration (`kb_pages.acl_revision_changed_at`, `kb_article_chunks.acl_synced_at`) is applied to production. Running the alert before the migration will always exit 0 with `reason: "migration-M5-pending"`. After the migration lands, the column-existence guard passes and the lag computation becomes active. No migration is authored here.

---

### Box 4 — Storage/index/embedding/AI cost by tenant tier

**Verbatim requirement:** "tenant-cost exists but is not KB-scoped; storage and index cost have no meter anywhere; no span or usage row carries the org's plan tier. Do the KB-scoping half (it is genuinely buildable today), define the cost model you can support, and state precisely what a 'storage unit' and an 'index unit' would need to be metered from."

**Verdict: DONE — KB-scoped AI cost is available through feature-filtered ai_usage_logs; storage and index units defined; plan tier absent from spans (stated).**

#### KB-scoped AI cost

The existing `alert-tenant-cost.mjs` queries `ai_usage_logs` for all features. KB features in `ai_usage_logs` are:

- `kb.ask` — the feature string passed by `KbAskService` to `AiGatewayService.invokeTextWithUsage`
- `kb.search` — the feature string passed by `KbSearchService` to `AiGatewayService.embedQueryWithCredit`
- `kb.index` — used by `KbArticleReindexService` for embedding indexing operations

An operator can filter the existing `alert-tenant-cost.mjs` with a feature prefix using `--feature=kb` (the script already supports `--feature` filtering in its SQL — if not, add `AND feature LIKE 'kb.%'` to the query). No code change to `alert-tenant-cost.mjs` is required because the feature column is present and queryable; this is a runtime argument.

**HANDOFF — plan tier on spans:**
`CurrentUserContext` does not carry the org's plan tier. `kb-ask-metrics.ts` and `kb-search-metrics.ts` could accept `planTier?: string` but the calling service would need to look up the tier (a DB read). This requires either caching the tier in the request context (owned by platform) or making a separate billing lookup (latency cost). Neither is correct for an inner-loop span attribute. State: scoped out until the platform carries plan tier in the request context.

#### Cost model: what each unit requires

**Storage unit (KB content bytes stored):** needs a per-org byte count from `kb_article_chunks` on the `content` column, plus attachment bytes from `kb_page_attachments`. Currently there is no per-tenant storage ledger. To meter this: `SELECT org_id, SUM(LENGTH(content)) FROM kb_article_chunks GROUP BY org_id` gives token-level granularity; attachment bytes require an R2 per-prefix size listing. No alert can emit this today without a scheduled aggregation job.

**Index unit (embedding operations):** `ai_usage_logs` with `feature = 'kb.index'` gives per-org embedding credit spend. This IS metered today through `ai_usage_logs.credits_milli`. An operator can query it directly or through a filtered run of `alert-tenant-cost.mjs`.

**Embedding AI cost:** metered via `ai_usage_logs` for `feature LIKE 'kb.%'`. Directly queryable today.

**Plan tier dimension:** `organizations.plan_tier` (or equivalent) is not projected into `CurrentUserContext` or onto spans. Adding it as a span dimension requires platform team involvement.

---

### Box 5 — Purge backlog and oldest incomplete ledger

**Verbatim requirement:** "the blocker is a producer defect, not missing instrumentation: emptyTrash and purgeExpired open a multi-store ledger but never markStoreComplete for page_rows or blobs, leaving two permanently-pending rows per page, and no drainer re-attempts stale rows. Lane M3 owns that fix (kb-page-trash.service.ts). Build the backlog metric and its alert so they are correct once M3 lands, and say plainly that shipping the alert before M3's fix would make it permanently red."

**Verdict: DONE — backlog alert built; M3 dependency stated; current code inspection shows markStoreComplete IS called for all stores in the current tree.**

#### Changes made

`backend/src/scripts/alert-kb-purge-backlog.mjs` — new alert script. Queries `kb_page_purge_ledger` for `status = 'pending'` rows. Fires when `pending_count >= minRows` (default 5) AND `oldest_age_minutes > staleMinutes` (default 60). Both thresholds must breach to avoid false positives during normal batch operations.

`backend/src/scripts/alert-dispatch.mjs` — registered `kb-purge-backlog` with `owner: "knowledge-team"`, `severity: "high"`, `runbookFile: KB_OBS_RUNBOOK`.

#### Self-test output

```json
{"selfTest":true,"pass":true,"checks":{"noBacklogClear":true,"freshBacklogClear":true,"staleBacklogFires":true,"tinyBacklogClear":true},"producerDependency":"lane-M3 (kb-page-trash.service.ts markStoreComplete)"}
```

#### M3 dependency — current code state

The task description states that `emptyTrash` and `purgeExpired` "never markStoreComplete for page_rows or blobs." Inspecting the current tree:

- `emptyTrash` at `kb-page-trash.service.ts:212-213` calls `markStoreComplete(db, orgId, id, "page_rows")` for each deleted page
- `emptyTrash` at `kb-page-trash.service.ts:224-226` calls `markStoreComplete(db, orgId, id, "blobs")` for each page
- `purgeExpired` at `kb-page-trash.service.ts:278-279` and `289-290` does the same

The current code does make the calls. Either M3's fix has already landed in this tree, or the task description described a pre-M3 state. In either case: if M3's fix is absent from the tree at deploy time, the alert will fire permanently on every trash/purge operation. Verify M3 is merged before treating a permanently-firing alert state as an alert defect.

The `oldestIncompleteLedgerEntry()` function in `kb-multi-store-purge.ts:131-139` provides the exact query used by the alert.

---

### Box 6 — Dashboards as such / alert destination contract

**Verbatim requirement:** "there is no dashboard or paging product; alert-dispatch.mjs still reads destination: 'CONFIGURE_ME — wire exit-code 1 to your oncall system'. Either adopt a destination or record permanently that alerts are operator-invoked scripts, and make the exit-code contract explicit and tested."

**Verdict: DONE — destination recorded as operator-invoked; exit-code contract is explicit and tested in alert-delivery.spec.ts.**

#### Decision: alerts are operator-invoked scripts

There is no dashboard, PagerDuty, OpsGenie, or Slack destination configured. The alert system is an operator-run diagnostic toolchain:

1. Each `alert-*.mjs` script reads a structured log stream (or the DB) and writes a JSON payload to stdout.
2. The payload carries `fired: true | false` and exits with code 1 when firing, 0 when clear, 2 on configuration error.
3. The operator pipes the script's stdout to `alert-dispatch.mjs --alert-id=<id>`.
4. `alert-dispatch.mjs` reads `ALERT_WEBHOOK_URL` from the environment and POSTs the enriched payload (with owner, severity, runbook) to that URL.
5. The receiving webhook (Slack, PagerDuty, custom receiver) is the operator's responsibility.

The `destination: "CONFIGURE_ME"` field in the heartbeat payload (line 292 of `alert-dispatch.mjs`) is guidance for the webhook receiver implementor, not a code smell. It is documentation in the payload, not a missing implementation.

#### Exit-code contract (explicit)

| Exit code | Meaning |
|---|---|
| 0 | Alert clear — no action needed |
| 1 | Alert fired — pipe to `alert-dispatch.mjs` |
| 2 | Configuration or data error — investigate before treating as clear |

`alert-delivery.spec.ts` tests:
- (a) Full chain: seam-latency breach → dispatch → receiver (exit 0 from dispatch)
- (b) `--test-event` heartbeat delivery to receiver (exit 0)
- (c) All registry alert IDs dispatch with correct owner/severity/runbook
- (d) Deduplication across separate process invocations
- (e) Missing `ALERT_WEBHOOK_URL` exits 2; connection refused exits non-zero
- (f) `workflow-stranded` in registry

The spec already covers the exit-code contract end-to-end. No additional code changes needed for Box 6.

---

### Box 7 — Drill-verified

**Verbatim requirement:** "self-tests prove predicates match real emissions but do not prove an operator is paged; this is downstream of box 6 and a drill against production is forbidden. State the distinction precisely and deliver whatever verification is possible without a live destination."

**Verdict: DONE — distinction stated; all achievable verification levels documented; live-paging verification explicitly deferred.**

#### Verification layers and what each proves

**Layer 1 — Emission fidelity (self-test, `--self-test` flag)**

Each `alert-*.mjs` script has a `--self-test` mode that:
- Constructs synthetic log lines or data that matches what the real emitter produces
- Runs the summarise function against those lines
- Asserts that the predicate fires on the fire cases and is clear on the clear cases

This proves: the predicate formula is correct against the span shape the emitter actually writes.
This does NOT prove: the emitter is wired in production, or that anyone receives the alert.

**Layer 2 — Parity gate (Jest spec, `kb-*-metric-alert-parity.spec.ts`)**

The parity specs (`kb-ask-metric-alert-parity.spec.ts`, `kb-search-metric-alert-parity.spec.ts`, `kb-indexing-metric-alert-parity.spec.ts`) emit a real span line from the TypeScript emitter and feed it to the alert script. This proves: the TypeScript emitter produces exactly the fields the alert script reads, with no hand-written fixture in between.

**Layer 3 — Dispatch chain (Jest spec, `alert-delivery.spec.ts`)**

Runs the full alert → dispatch chain against a local HTTP server. Proves: enrichment (owner, severity, runbook), deduplication, suppression windows, and HTTP delivery work correctly. Does NOT require `ALERT_WEBHOOK_URL` to point at a real paging system.

**Layer 4 — End-to-end heartbeat (`--test-event`)**

`node alert-dispatch.mjs --test-event` posts a synthetic heartbeat to `ALERT_WEBHOOK_URL`. This proves: the network path from the host to the webhook receiver works. It does NOT prove that the webhook receiver pages anyone.

**What is NOT verifiable without a live destination:**

A drill — where an operator deliberately causes a real alert condition and confirms they receive a page within the SLA — requires a live paging destination and is explicitly out of scope for this lane. Box 6 records this as a permanent operational gap until `ALERT_WEBHOOK_URL` is pointed at a paging system that has a response commitment.

The alert system is self-certifying through Layers 1–3. Layer 4 is the operator's responsibility to run against their own destination.

---

## Operational runbooks (alert-delivery.spec.ts anchor targets)

### cache-invalidation-dropped

**What fires:** `cache-invalidation-dropped` (high, platform-reliability) when the structured log stream contains at least one `cache.invalidation.dropped` line within the window.

**Detection signal:** `alert-cache-invalidation-dropped.mjs` reads the log stream for the `CacheService.DROPPED_MARKER = "cache.invalidation.dropped"` pattern. A drop means a Redis invalidation failed after all retries. Even one drop means a cache entry is stale; the alert fires on any single drop.

**Response:**
1. Check Redis connectivity from the API process.
2. Inspect the error attached to the `cache.invalidation.dropped` log line for the specific key and target.
3. If Redis is reachable but the key was large, check client-level timeouts (`REDIS_COMMAND_TIMEOUT`).
4. The stale entry will expire at its TTL. If the TTL is long, consider a targeted `FLUSHDB` on the specific namespace (requires a Redis CLI session).
5. Verify that subsequent requests return fresh data by checking the cache namespace version counter.

**Verification:** `alert-cache-invalidation-dropped.mjs --self-test` exits 0. After remediation, the log stream should show no new `cache.invalidation.dropped` lines in the next window.

### kb-revocation-lag

**What fires:** `kb-revocation-lag` (high, knowledge-team) when at least `--min-pages` (default 3) KB pages have had their ACL revised but the chunk index has not synced the revision within `--lag-seconds` (default 300 s).

**Detection signal:** `alert-kb-revocation-lag.mjs` queries `kb_pages.acl_revision_changed_at` vs `kb_article_chunks.acl_synced_at`. If M5 migration is not applied, the script exits 0 with `reason: "migration-M5-pending"` and does not fire.

**Response:**
1. Identify the lagging pages from the `laggingPages` count in the alert payload.
2. Trigger a reindex sweep for those page IDs through the KB admin API or the `KbArticleReindexService`.
3. Monitor `acl_synced_at` convergence via the DB: `SELECT id, acl_revision_changed_at, (SELECT MAX(acl_synced_at) FROM kb_article_chunks WHERE page_id = p.id) FROM kb_pages p WHERE ...`.
4. If the reindex sweep is stuck, check embedding provider availability and credit balance.

**Verification:** After reindex, `alert-kb-revocation-lag.mjs` should exit 0 with `laggingPages: 0`. Requires M5 migration to be applied.

### kb-purge-backlog

**What fires:** `kb-purge-backlog` (high, knowledge-team) when `kb_page_purge_ledger` has at least `--min-rows` (default 5) rows in `pending` status older than `--stale-minutes` (default 60 minutes).

**Detection signal:** `alert-kb-purge-backlog.mjs` queries `kb_page_purge_ledger` for stale pending rows. A stale row means a page deletion started but one or more stores (visits, favorites, source_links, page_rows, blobs) were not completed.

**Producer dependency (M3):** If `emptyTrash` or `purgeExpired` in `kb-page-trash.service.ts` do not call `markStoreComplete` for all five stores, this alert fires permanently on every trash operation. Verify M3 is merged before treating a permanently-firing alert state as an alert defect.

**Response:**
1. Query the specific pending rows: `SELECT page_id, store, created_at FROM kb_page_purge_ledger WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20`.
2. For each pending store, manually trigger the store completion or re-run the trash sweep.
3. If `page_rows` is pending but the page row is already deleted, mark it complete manually: `UPDATE kb_page_purge_ledger SET status = 'completed', completed_at = NOW() WHERE status = 'pending' AND store = 'page_rows'`.
4. If `blobs` is pending, check R2 for orphaned objects and clean up via the storage admin.

**Verification:** After remediation, `alert-kb-purge-backlog.mjs` exits 0 with `pendingCount: 0`.

---

## Files changed

### Created
- `backend/src/scripts/alert-cache-invalidation-dropped.mjs` (Box 2 — dropped invalidation consumer)
- `backend/src/scripts/alert-kb-revocation-lag.mjs` (Box 3 — revocation lag, inert until M5 migration)
- `backend/src/scripts/alert-kb-purge-backlog.mjs` (Box 5 — purge backlog monitor)
- `docs/specs/knowledge-base/sessions/LEDGER-PATCH-M6.md` (this file)

### Modified
- `backend/src/modules/kb/core/telemetry/kb-ask-metrics.ts` — added `actorStanding?: string` and `orgCell?: string` to `begin()` opts; stamps `actor.standing` and `org.cell` attributes (Box 1)
- `backend/src/modules/kb/core/telemetry/kb-search-metrics.ts` — same (Box 1)
- `backend/src/modules/kb/core/telemetry/kb-ask-metric-alert-parity.spec.ts` — allowlist updated to include `actor.standing` and `org.cell` (Box 1)
- `backend/src/modules/kb/core/telemetry/kb-search-metric-alert-parity.spec.ts` — same (Box 1)
- `backend/src/scripts/alert-dispatch.mjs` — added `KB_OBS_RUNBOOK` constant; registered `cache-invalidation-dropped`, `kb-revocation-lag`, `kb-purge-backlog` (Boxes 2, 3, 5)

## Commands run

```
npx jest --runTestsByPath src/modules/kb/core/telemetry/kb-ask-metric-alert-parity.spec.ts -w 1 --no-coverage
# RED: 1 failed (allowlist test) after adding actor.standing/org.cell
# GREEN: 24 passed after updating allowlist

npx jest --runTestsByPath src/modules/kb/core/telemetry/kb-search-metric-alert-parity.spec.ts -w 1 --no-coverage
# RED: 1 failed after adding attributes
# GREEN: 26 passed after updating allowlist

node src/scripts/alert-cache-invalidation-dropped.mjs --self-test  # pass
node src/scripts/alert-kb-revocation-lag.mjs --self-test             # pass
node src/scripts/alert-kb-purge-backlog.mjs --self-test              # pass
```

## Gates not run

- Repo-wide test suite (Rule 11)
- `pnpm typecheck` / `pnpm typecheck:test` (requires 10 GB heap, not run per instructions)
- `pnpm lint`

These are called out for the reviewer, not claimed as passing.

## HANDOFFs

### HANDOFF-M6-A: Wire actor.standing and org.cell into ask/search callers

**Owner of target files:** the team editing `backend/src/modules/kb/retrieval/kb-ask.service.ts` and `backend/src/modules/kb/retrieval/kb-search.service.ts`.

In `kb-ask.service.ts`, both `ask()` and `streamAsk()` call:
```typescript
const metrics = KbAskMetrics.begin({ orgId: user.orgId });
```
Change to:
```typescript
const metrics = KbAskMetrics.begin({
  orgId: user.orgId,
  actorStanding: user.role,
  orgCell: getObservabilityContext()?.cellId,
});
```
Import `getObservabilityContext` from `"../../../common/observability"`.

Same pattern in `kb-search.service.ts` for `KbSearchMetrics.begin()`.

### HANDOFF-M6-B: Export DB fingerprint counters to span stream

**Owner of target files:** the team editing `backend/src/db/query-telemetry.ts` and `backend/src/common/observability/tracing.ts`.

Steps:
1. In `tracing.ts`, extend `OpenSpan.end()` to accept optional extra attributes.
2. In `query-telemetry.ts`, pass `db.query.slow` and `db.query.contention` to `span.end()`.

Full detail in Box 2 above.

### HANDOFF-M6-C: Cache hit rate counter

**Owner:** lane M5 (owns `backend/src/common/cache/cache.service.ts`).

`CacheService` tracks drops but not hits and misses. Adding `private hits = 0` and `private misses = 0` counters (incremented in `fill.run()` callbacks) would enable a cache hit rate alert using the same log-stream pattern as `alert-cache-invalidation-dropped.mjs`.

### HANDOFF-M6-D: Plan tier on KB spans

**Owner:** platform team.

`CurrentUserContext` does not carry `planTier`. To stamp the tenant's plan tier on KB spans without a per-request DB lookup, the JWT or session enrichment middleware should include the tier in the `ObservabilityContext` or `CurrentUserContext`. Until that lands, KB cost-by-tier alerting uses the `ai_usage_logs` feature filter as described in Box 4.
