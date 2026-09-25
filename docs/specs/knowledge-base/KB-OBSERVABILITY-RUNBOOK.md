# KB observability runbook

Operator-invoked alert scripts. There is no paging product wired; each script is
run on demand or from a scheduler, and its **exit code is the contract**.

| exit | meaning |
|---|---|
| 0 | clear — nothing fired |
| 1 | fired — an alert condition is true |
| 2 | config error — the check could not run |

Run `node src/scripts/<script> --self-test` before trusting any result. A check
that resolves nothing reports zero vacuously.

---

## #response-contract-violations

**What fires:** `response-contract-violations` (high, platform-reliability) when the log stream carries `"Response contract violated"` error lines above the configured threshold.

**Detection signal:** `alert-response-contract-violations.mjs` reads the structured log for error-level lines with `message: "Response contract violated"`. The response transform interceptor emits this when a handler returns a shape that does not match the declared `@ResponseSchema`. An exit code of 2 means the input was empty or unparseable — not a clear.

**First five minutes**

```bash
journalctl -u streamlineos-api --since "1 hour ago" -o cat | \
  node backend/src/scripts/alert-response-contract-violations.mjs
```

**Containment:** Contract violations are non-destructive read errors. The response was already sent before the mismatch was detected. Identify the route from `meta.route` in the output and confirm the handler's return type matches its `@ResponseSchema` declaration.

**Recovery:** Fix the schema mismatch and redeploy. A violation that is silently stripped by `z.object()` is the most common cause; enable `.strict()` on the response schema to make the type mismatch visible at the boundary.

**Verification:** `alert-response-contract-violations.mjs` exits 0 with `count: 0` over a fresh log window.

---

## #cache-invalidation-dropped

**What fires:** `cache-invalidation-dropped` (high, platform-reliability) on a single `CacheService.DROPPED_MARKER` in the log stream. The objective is zero — one drop means a namespace invalidation was lost and a stale read can outlive its mutation.

**Detection signal:** `alert-cache-invalidation-dropped.mjs` reads the log stream for the `DROPPED_MARKER` string that `CacheService` logs when an invalidation cannot reach Redis. The marker is the authoritative signal; the absence of it means Redis is healthy, not that invalidations are silently queued.

**First five minutes**

```bash
journalctl -u streamlineos-api --since "30 minutes ago" -o cat | \
  node backend/src/scripts/alert-cache-invalidation-dropped.mjs
```

**Containment:** Identify the namespace from the log line and invalidate it by hand:

```bash
redis-cli -u $UPSTASH_REDIS_REST_URL DEL <namespace-key>
```

**Recovery:** Repeated drops mean the Redis link is unhealthy, not that the caller is wrong. Confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set and the endpoint is reachable. A single drop is self-correcting on the next cache-miss.

**Verification:** `alert-cache-invalidation-dropped.mjs` exits 0 over a fresh log window after the Redis link is confirmed healthy.

---

## #kb-revocation-lag

**What fires:** `kb-revocation-lag` (high, knowledge-team) when a KB page's ACL changed more than the configured lag threshold ago and its chunks have not been resynced — meaning vector search is answering from a stale access fence.

**Detection signal:** `alert-kb-revocation-lag.mjs` queries `kb_pages.acl_revision_changed_at` and `kb_article_chunks.acl_synced_at` (added by migration 1229). Both columns are applied to production. The alert guards with a column-existence check and exits 0 with `reason: "migration-M5-pending"` when either column is absent — reporting no lag is not the same as reporting health.

**Currently inert by design.** The columns exist but nothing writes them yet. The indexing path does not stamp `acl_revision_changed_at` on ACL mutations or `acl_synced_at` on chunk sync. The alert becomes live when those writes land. This SLO (`module:kb:access-revocation`) is registered to track that commitment.

**First five minutes**

```bash
node backend/src/scripts/alert-kb-revocation-lag.mjs --lag-seconds=300
```

**Containment:** If the alert fires (once the writers exist), identify the lagging pages from the output and re-drive indexing for the affected space: `POST /kb/pages/reindex-all` is cursor-paged and safe to resume.

**Recovery:** Fix the indexing path to stamp both columns correctly, then re-index the affected pages. The lag closes when `acl_synced_at >= acl_revision_changed_at` for all affected chunks.

**Verification:** `alert-kb-revocation-lag.mjs` exits 0 with `laggingPages: 0`. While the writers are absent, exit 0 with `reason: "migration-M5-pending"` is the expected state — not a confirmation that all revocations are synced.

---

## #kb-purge-backlog

**What fires:** `kb-purge-backlog` (high, knowledge-team) when `kb_page_purge_ledger` holds 5 or more pending rows AND the oldest is more than 60 minutes old. Both conditions must hold — a single slow purge does not page anyone.

**Detection signal:** `alert-kb-purge-backlog.mjs` queries `kb_page_purge_ledger` for pending rows directly. A standing backlog means a multi-store purge stopped part-way: at least one store (object storage, vector index, FTS index) was not cleaned.

**First five minutes**

```bash
node backend/src/scripts/alert-kb-purge-backlog.mjs
```

**Containment:** Identify which store is backing up from the ledger rows. Deletion is a compliance promise; treat a standing backlog as a data-retention breach, not a queue-depth nuisance.

**Recovery:** Re-drive the purge consumer or manually complete the failed store purge for each ledger row. Once the row is confirmed purged in all stores, mark it complete in the ledger.

**Verification:** `alert-kb-purge-backlog.mjs` exits 0 with `pendingCount: 0` or with `pendingCount < 5`.

---

## #kb-db-health

**What fires:** `kb-db-health` (high, knowledge-team) when any of: total active+idle-in-transaction connections exceed the threshold; sessions waiting on locks exceed the threshold; KB table queries have mean execution time above the slow query threshold; any KB table's buffer cache hit rate falls below the minimum.

**Detection signal:** `alert-kb-db-health.mjs` queries four PostgreSQL catalog views directly:
- `pg_stat_activity` for connection counts and lock waits
- `pg_stat_statements` for slow KB queries (if the extension is installed — the script checks first)
- `pg_statio_user_tables` for buffer cache hit rate on `kb_%` tables

**Replica lag:** This deployment has no read-replica endpoint (`DB_REPLICA_URL` is not set). Replica lag cannot be measured and is reported as `blocked: no-replica-endpoint` rather than emitting a false zero.

**Dropped invalidations:** Covered by `alert-cache-invalidation-dropped.mjs` (see `#cache-invalidation-dropped`). That alert reads the log stream and is the authoritative source; this script delegates to it.

**First five minutes**

```bash
node backend/src/scripts/alert-kb-db-health.mjs

node backend/src/scripts/alert-kb-db-health.mjs --max-connections=60 --max-lock-waits=3 --min-cache-hit-pct=95
```

**Containment:** For connection saturation: identify the state distribution in the output. `idle in transaction` saturation means a transaction is being held open across an external call — release the connection before the provider hop. For lock waits: identify the blocking session from `pg_blocking_pids(pid)` and either wait for it to commit or cancel it if it is stuck. For slow queries: `VACUUM ANALYZE` is often enough after a bulk load; run `EXPLAIN (ANALYZE, BUFFERS)` as the `streamline_app` role (not owner — the owner bypasses RLS and hides the real plan cost). For low cache hit rate: the table is being read primarily from disk; verify the working set fits in `shared_buffers` and indexes are covering the hot query paths.

**Recovery:** Connection saturation and lock waits are usually self-resolving once the cause is fixed (provider call moved out of the transaction, stuck query cancelled). Slow queries and cache hit rate require query-plan investigation and index work.

**Verification:** `alert-kb-db-health.mjs` exits 0 with `fired: false` and all sub-checks clear.

---

## #kb-acl-anomaly

**What fires:** `kb-acl-anomaly` (high, knowledge-team) when KB route 403 responses exceed 15% of KB requests (on at least 10 denials and 20 total requests), or KB route 404 responses exceed 40% of KB requests (on at least 10 not-founds and 20 total requests).

**Detection signal:** `alert-kb-acl-anomaly.mjs` reads the structured log stream for SPAN lines on `/kb/` routes and counts the `http.status_code` attribute. The invariant that hidden and missing are both 404 means the not-found check catches both genuine missing-page cases and cases where a page exists but is hidden from the caller — the detector cannot distinguish them and should not try. Route+count pattern is the signal, not the distinction.

An exit code of 2 means no KB route SPAN lines were found — not a clear. Pipe a populated log window before trusting the result.

**First five minutes**

```bash
journalctl -u streamlineos-api --since "1 hour ago" -o cat | \
  node backend/src/scripts/alert-kb-acl-anomaly.mjs

journalctl -u streamlineos-api --since "1 hour ago" -o cat | \
  node backend/src/scripts/alert-kb-acl-anomaly.mjs --denial-ratio=0.10 --not-found-ratio=0.30
```

**Containment:** A denial spike is either an ACL misconfiguration that just revoked a population's access, or enumeration by a caller probing scopes. Do not "fix" a denial spike by widening the ACL predicate; a denial that is correct is the system working. Confirm the intended audience first.

**Recovery:** For a denial spike from an ACL change: identify the ACL mutation (space member removal, page grant revoke, space visibility change) and confirm it was intended. For a 404 spike: check whether a space or set of pages was deleted, archived, or moved to a visibility level that excludes the affected callers. For probe/enumeration patterns: identify the actor from the log correlation IDs and apply rate limiting via their tier.

**Verification:** `alert-kb-acl-anomaly.mjs` exits 0 with `fired: false`, `denialBreached: false` and `notFoundBreached: false` over a healthy log window.

---

## #kb-index-freshness

**What fires:** `kb-index-freshness` (high, knowledge-team) when 3 or more KB pages were modified in the last 24 hours, are older than 30 minutes, and have no indexed chunks. This SLO (`module:kb:index-freshness`) measures whether the ingestion consumer is keeping up with content changes.

**Detection signal:** `alert-kb-index-freshness.mjs` queries `kb_pages` directly for pages where `deleted_at IS NULL`, `updated_at` falls within the lookback window but is older than the stale threshold, and no `kb_article_chunks` row with `page_id = p.id` exists. A page with no chunks is invisible to vector search but still reachable by keyword search and its own route.

**First five minutes**

```bash
node backend/src/scripts/alert-kb-index-freshness.mjs

node backend/src/scripts/alert-kb-index-freshness.mjs --stale-minutes=60 --lookback-hours=48 --min-pages=5
```

**Containment:** A stale index does not corrupt data — unindexed pages are simply absent from vector search results. No immediate containment is needed unless a high-value page is missing from search for an extended period. Do not disable the ingestion consumer to reduce the count — that converts a visible gap into a silent accumulation.

**Recovery:** Identify the stale pages from the query output. Check the ingestion outbox for pending events that have not been consumed (`alert-queue-age.mjs` covers the outbox backlog). If the consumer is running but the pages are still unindexed, re-trigger indexing via `POST /kb/pages/reindex-all`. The checkpointed resumption re-pays only for chunks that never landed.

**Verification:** `alert-kb-index-freshness.mjs` exits 0 with `unindexedCount: 0` or below the `minPages` threshold. A count of 0 means all recently-modified pages have been indexed within the stale threshold.

---

## #tenant-cost (KB-scoped)

`alert-tenant-cost.mjs --feature=kb` filters `ai_usage_logs` to `feature LIKE 'kb%'` and reports `featureScope: "kb"`. The noisy-neighbour relative comparison requires at least 3 distinct orgs with KB AI usage in the window.

Plan tier is now joined from `subscriptions.plan` (most recent row per org) and appears as `plan_tier` on each noisy entry. An org with no subscription row reports `plan_tier: null`.

**Storage and index cost are not metered** and are not in this alert. There is no per-tenant ledger for object storage, Redis memory, or DB query cost in the current schema. A schema addition to `ai_usage_logs` or a new metering table is required before those dimensions can be reported.

**Verification:** `alert-tenant-cost.mjs --feature=kb --self-test` exits 0.

---

## What verification does and does not prove

Three layers run today.

1. **Self-test** — the predicate classifies synthetic fixtures correctly.
2. **Parity gate** — the predicate matches the shape the code really emits. This
   is what stops a predicate that only ever matched its own fixture.
3. **Dispatch chain** — a fired alert produces exit code 1.
4. **Live paging drill** — *not run.* No destination is configured, and drilling
   production is out of scope.

Layers 1-3 prove an alert is correct. They do **not** prove an operator is
woken up. Do not record this surface as drill-verified until layer 4 exists.
