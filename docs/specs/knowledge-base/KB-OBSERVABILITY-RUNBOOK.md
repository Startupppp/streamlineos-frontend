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

**Both columns are live.** All ACL mutation paths (`kb-articles.service.ts`, `kb-pages.service.ts`, `kb-page-grants.service.ts`, `kb-indexing.service.ts`) now stamp `acl_revision_changed_at` on the page row in the same transaction as the `acl_revision + 1` increment. All chunk write paths stamp `acl_synced_at` at insert or update time. The SLO (`module:kb:access-revocation`) is now measurable.

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

## #kb-ask

**What fires:** `kb-ask` (high, knowledge-team) when more than 5% of KB Ask operations end in `credits_exhausted`, `provider_unavailable` or `error` over a 1-hour window, measured on at least 2 faults. SLO `module:kb:ask`.

**Detection signal:** `alert-kb-ask.mjs` reads spans named `kb.ask.operation` and buckets them by the `kb.ask.outcome` attribute. Note what is **not** a fault here: `degraded` is a recorded outcome but is deliberately excluded from the fault set, because a degraded answer is a successful answer drawn from a narrower retrieval — counting it as a fault would page on a working fallback.

**First five minutes**

```bash
journalctl -u streamlineos-api --since "1 hour ago" -o cat | node backend/src/scripts/alert-kb-ask.mjs
```

Read which outcome dominates before acting; the three have different owners.

**Containment:** `credits_exhausted` is a billing state, not an outage — Ask correctly refused to spend credits the tenant does not have, and it returns 402 rather than a wrong answer. Do not top up to silence the alert without checking what consumed the credits. `provider_unavailable` is upstream; the reservation is refunded on provider failure, so no credit is lost, and retrying in a tight loop makes it worse. Plain `error` is the only one that warrants immediate investigation.

**Recovery:** For `provider_unavailable`, confirm the provider's status and let traffic recover on its own; there is no queue to drain because Ask is synchronous. For `error`, pull the `correlationId` from the span and join it to the `kb_ai_interactions` row — every Ask writes one, including the failure path, so the interaction row is the authoritative record of what was attempted.

**Verification:** `alert-kb-ask.mjs` exits 0. An exit of **2** means it could not resolve a log stream — inconclusive, not a pass.

---

## #kb-search

**What fires:** `kb-search` (high, knowledge-team). Three distinct conditions, and they mean different things:
1. more than **5%** of search operations end in `error` (at least 2 faults) — a straightforward failure rate;
2. access denials exceed **25%** of operations on at least 5 denials;
3. empty results exceed **60%** of operations on at least 10.

SLO `module:kb:search`.

**Detection signal:** `alert-kb-search.mjs` reads spans named `kb.search.operation`, bucketed by `kb.search.outcome`. Conditions 2 and 3 are **anomaly** signals, not failure signals — the code is working correctly in both cases. A denial spike usually means an ACL change landed and is doing exactly what it was asked to do; an empty-result spike usually means the index is missing content, which is why `#kb-index-freshness` is the first thing to check rather than the search path itself.

**First five minutes**

```bash
journalctl -u streamlineos-api --since "1 hour ago" -o cat | node backend/src/scripts/alert-kb-search.mjs

node backend/src/scripts/alert-kb-index-freshness.mjs
```

**Containment:** Do not widen a search predicate to clear a denial spike. The denial ratio rising after a grant or space-membership change is the guard working; treating it as a bug and relaxing the predicate converts a correct denial into a cross-tenant read. Confirm what changed in access before touching any query.

**Recovery:** For an empty-result spike, check index freshness first — unindexed pages are absent from vector search while still reachable by keyword search and their own route, which is exactly the shape a "search is broken" report takes. For a denial spike, identify the ACL change from `kb_pages.acl_revision_changed_at` and confirm it was intended. For `error`, treat as an ordinary failure and investigate the span.

**Verification:** `alert-kb-search.mjs` exits 0. Exit **2** is inconclusive, not a pass.

---

## #kb-indexing

**What fires:** `kb-indexing` (high, knowledge-team) when more than 5% of KB page indexing operations end in `embedding_unavailable`, `credits_exhausted` or `error` over a 1-hour window, measured on at least 2 faults. This SLO (`module:kb:indexing`) measures whether indexing **succeeds**, which is a different question from `#kb-index-freshness` below — that one measures whether indexing is **keeping up**. A run that fails fast and loudly breaches this one; a run that silently falls behind breaches that one.

**Detection signal:** `alert-kb-indexing.mjs` reads the structured log stream for spans named `kb.indexing.operation` and buckets them by the `kb.outcome` attribute. The two-fault floor exists so a single transient embedding failure in a quiet hour does not page anyone — do not lower it to catch one-off errors, because the outcome is already recorded on the span and is queryable without an alert.

**First five minutes**

```bash
journalctl -u streamlineos-api --since "1 hour ago" -o cat | node backend/src/scripts/alert-kb-indexing.mjs

node backend/src/scripts/alert-kb-indexing.mjs --log=app.log --hours=24 --fault-ratio=0.1
```

Read which outcome dominates before acting — the three fault outcomes have different causes and opposite responses.

**Containment:** `credits_exhausted` is a billing state, not an incident: indexing has correctly refused to spend credits the tenant does not have, and re-running it will refuse again. Do not top up credits to clear the alert without checking whether a runaway re-index caused the spend. `embedding_unavailable` means the provider is down or rate-limiting; the work is deferred, not lost, so the containment is to stop re-triggering indexing and let the backlog drain. Plain `error` is the only one that warrants immediate investigation.

**Recovery:** For `embedding_unavailable`, confirm the provider is healthy and re-trigger via `POST /kb/pages/reindex-all`; checkpointed resumption re-pays only for chunks that never landed, so a re-run is not a full re-embed. For `error`, find the failing page from the span's `org.id` and content type, and reproduce against that page alone before re-running the sweep — a bad single document will otherwise re-break every sweep it is part of.

**Verification:** `alert-kb-indexing.mjs` exits 0. Note it exits **2** when it cannot resolve a log stream at all — that is inconclusive, not a pass, and must not be read as the alert clearing.

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

## #kb-read

**What fires:** `kb-read` (high, knowledge-team) when Document reads breach any of three ratios in the window — faults (`denied` + `error`) above 5%, `denied` alone above 25%, or `not_found` above 40%.

**Detection signal:** `alert-kb-read.mjs` reads `kb.read.operation` spans and groups by `kb.read.outcome` (`found` · `not_found` · `denied` · `error`). Spans carry tenant bucket, actor standing, cache outcome, primary-vs-replica, queue lane and source kind, so a breach can be attributed before anything is changed.

**Why three ratios and not one:** they fail differently. A fault spike is the service breaking. A `denied` spike is an authorization change — a Space audience edit or a revoked grant — and is the signal that catches an ACL regression in production. A `not_found` spike usually means links are pointing at Documents that moved or were purged, which no error rate would show.

**First five minutes**

```bash
node backend/src/scripts/alert-kb-read.mjs

node backend/src/scripts/alert-kb-read.mjs --denied-ratio=0.1 --not-found-ratio=0.25
```

**Containment:** A read breach does not corrupt data. Do not widen access to clear a `denied` spike — if the denials are correct, widening turns a visible signal into a silent exposure. Confirm against `#kb-acl-anomaly` first.

**Recovery:** Split the breaching outcome by actor standing and source kind. A `denied` spike confined to one standing is an entitlement change; spread across all standings it is a scope regression.

**Verification:** `pnpm alert:kb-read:self-test` exits 0.

---

## #kb-write

**What fires:** `kb-write` (high, knowledge-team) when Document writes breach faults (`denied` + `error`) above 5%, or `denied` alone above 20%.

**Detection signal:** `alert-kb-write.mjs` reads `kb.write.operation` spans grouped by `kb.write.outcome` (`created` · `updated` · `deleted` · `conflict` · `denied` · `error`).

**`conflict` is not a fault.** It is the expected-revision check refusing a stale write, which is the mechanism working. A rising `conflict` ratio means concurrent editing, not breakage — treat it as a product signal.

**First five minutes**

```bash
node backend/src/scripts/alert-kb-write.mjs

node backend/src/scripts/alert-kb-write.mjs --denied-ratio=0.1
```

**Containment:** Writes are the path that emits Index events. A write fault spike means Documents are being changed without being re-indexed, so a quiet write failure shows up later as a search gap — check `#kb-index-freshness` alongside this one.

**Recovery:** Attribute by queue lane and primary-vs-replica. Errors on one lane point at the consumer; errors across all lanes point at the pool.

**Verification:** `pnpm alert:kb-write:self-test` exits 0.

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
