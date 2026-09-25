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

## Alerts

### `alert-cache-invalidation-dropped.mjs`
Reads the log stream for `CacheService.DROPPED_MARKER`. Fires on a single drop.

**If it fires:** a cache namespace invalidation was lost, so a stale read can
outlive its mutation. Identify the namespace in the log line and invalidate it
by hand. Repeated drops mean the Redis link is unhealthy, not that the caller is
wrong.

### `alert-kb-revocation-lag.mjs`
Compares `kb_pages.acl_revision_changed_at` against
`kb_article_chunks.acl_synced_at` (both added by migration 1229).

**Currently inert by design.** The columns exist but nothing writes them yet, so
the script guards with `columnsExist()` and reports no lag rather than a false
all-clear. It becomes live when the indexing path starts stamping both columns.

**If it fires:** a page's ACL changed but its chunks were not resynced, so vector
search is answering from a stale access fence — either serving content to
someone who lost access, or hiding content from someone who gained it.

### `alert-kb-purge-backlog.mjs`
Queries `kb_page_purge_ledger` for pending rows. Fires on count >= 5 **and**
oldest age > 60 min — both, so a single slow purge does not page anyone.

**If it fires:** a multi-store purge stopped part-way and rows in at least one
store were never deleted. Deletion is a compliance promise, so treat a standing
backlog as a data-retention breach, not a queue-depth nuisance.

### `alert-tenant-cost.mjs --feature=kb`
Filters `ai_usage_logs` to `feature LIKE 'kb%'`. Reports `featureScope: "kb"`.

Storage and index cost are **not** metered anywhere and are not in this alert.
Plan tier is not stamped on any span or usage row, so cost cannot yet be grouped
by tier — that is a data-model gap, not a query one.

## What verification does and does not prove

Four layers exist, and only the first three run today.

1. **Self-test** — the predicate classifies synthetic fixtures correctly.
2. **Parity gate** — the predicate matches the shape the code really emits. This
   is what stops a predicate that only ever matched its own fixture.
3. **Dispatch chain** — a fired alert produces exit code 1.
4. **Live paging drill** — *not run.* No destination is configured, and drilling
   production is out of scope.

Layers 1-3 prove an alert is correct. They do **not** prove an operator is
woken up. Do not record this surface as drill-verified until layer 4 exists.
