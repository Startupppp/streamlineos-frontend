# LEDGER-PATCH-M5 — S22 async scale / cost / DR, read-cost regression

Lane M5 of 8. 9 boxes, 9 verdicts. All file:line citations below were opened and read in this session.

Repos: backend at `D:/projects/personal/Streamlineos/backend`; docs/frontend at the root repo.

---

### S22-box1 — Interactive index and access-revocation freshness SLOs

> `Interactive index and access-revocation freshness SLOs` — not measurable from anything emitted today. `kb_pages.acl_revision` and `kb_article_chunks.acl_revision` are bare integers with no timestamp; the sync at `kb-indexing.service.ts:241` emits no span, no log, no row count.

**VERDICT: MIGRATION AUTHORED, HANDED OFF.**

Evidence:
- `backend/src/db/schema/kb/pages.ts:63` — `aclRevision: integer("acl_revision").notNull().default(1)`. No timestamp column.
- `backend/src/db/schema/support/kb-chunks.ts:48` — `aclRevision: integer("acl_revision").notNull().default(1)`. No timestamp column.
- `backend/src/modules/kb/retrieval/kb-indexing.service.ts:230-238` — `acl_revision + 1` UPDATE, followed by `registerAfterCommit(() => this.syncAclRevisionForSpace(orgId, spaceId))`. No span, no log, no row count, no timestamp set.
- `backend/src/modules/kb/retrieval/kb-indexing.service.ts:241-251` — `syncAclRevisionForSpace`: raw SQL UPDATE propagating `acl_revision` from pages to chunks. No timestamp set.

**Freshness target: 60 seconds end-to-end** (page ACL bump → all chunks synced). Reasoning: `syncAclRevisionForSpace` runs via `registerAfterCommit` (synchronous fallback if no after-commit slot is available), so the sync completes within the same or the next request cycle. 60 s provides one alert window above normal latency without paging on transient delays.

**Migration authored:** `backend/migrations/1229_kb_acl_revision_timestamps.sql` — adds `kb_pages.acl_revision_changed_at timestamptz` and `kb_article_chunks.acl_synced_at timestamptz` (both nullable; NULL = changed before migration was applied). Rollback: `backend/migrations/rollback/1229_kb_acl_revision_timestamps.down.sql`.

**HANDOFF to applying lane and observability lane:**
- Journal entry must be added to `migrations/meta/_journal.json` (never edited by this lane per the hard rules).
- Code change needed: `kb-indexing.service.ts:230` must set `acl_revision_changed_at = NOW()` alongside the `acl_revision + 1` bump.
- Code change needed: `syncAclRevisionForSpace` must set `acl_synced_at = NOW()` on the chunks it touches.
- Observability lane depends on `kb_pages.acl_revision_changed_at` (lag metric: `max(NOW() - acl_revision_changed_at)` where page and chunk revisions diverge) and `kb_article_chunks.acl_synced_at` (propagation window: `acl_synced_at - page.acl_revision_changed_at`).

---

### S22-box2 — Public-page CDN invalidation by token/page revision

> `Public-page CDN invalidation by token/page revision` — there is no CDN in front of `/public/wiki/:token`; the frontend route is `force-dynamic` with `cache: "no-store"`. `kb_pages.content_revision` is available if one is introduced.

**VERDICT: CLOSED — NOT APPLICABLE. Origin-served; no CDN in this deployment.**

Evidence:
- `backend/src/db/schema/kb/pages.ts:64` — `contentRevision: integer("content_revision").notNull().default(1)`. The revision counter exists in the data model.
- The task description itself states: "the frontend route is `force-dynamic` with `cache: 'no-store'`."
- `content_revision` on `kb_pages` (`pages.ts:64`) is available as a revision key if a CDN is introduced.
- No CDN (CloudFront, Cloudflare, Fastly, etc.) is configured for this deployment. There is no public CDN endpoint to invalidate.

Justification: A CDN invalidation implementation against a non-existent CDN would be dead code. If a CDN is placed in front of public pages in the future, the `content_revision` field provides the revision key needed for cache-key construction (`/public/wiki/:token?rev=:content_revision`) without further migration. The `no-store` origin-served behaviour is correct and sufficient until then.

---

### S22-box3 — Replica consistency classification and lag failover

> `Replica consistency classification and lag failover` — `ReplicaRouter` exists but has **zero injection sites** and `isReplicaHealthy` is hardcoded `true`; a repo-wide grep for `replication_lag`/`pg_last_wal`/`replica.*lag` returns zero hits; this deployment has no replica endpoint.

**VERDICT: KEPT — documented uninjected. No replica endpoint; router correct for when one is provisioned.**

Evidence:
- `backend/src/db/replica-router.ts:71-73` — `route(wc: WorkClass): PoolHandle { return this.routeWithFaultAwareness(wc, true); }`. The production call path always passes `isReplicaHealthy = true`.
- `backend/src/db/drizzle.module.ts:65-76` — `REPLICA_ROUTER` is provided and exported but never `@Inject(REPLICA_ROUTER)` appears in any service. Confirmed by grep: only `drizzle.constants.ts` (declares token), `drizzle.module.ts` (provides/exports), and `read-replica.spec.ts` (tests) import it.
- `backend/src/degradation/read-replica.spec.ts:163-171` — `it.skip("PHYSICAL REPLICA NOT PROVISIONED …")` already documents this gap precisely.
- `backend/src/db/pool.config.ts` — `DB_REPLICA_URL` env var controls whether a replica is provisioned; absent in this deployment.
- Grep for `replication_lag|pg_last_wal|replica.*lag` in `backend/src/**/*.ts` → 0 production code hits (only test file references to "replica lag" prose).

Decision rationale for keeping (not deleting):
1. `ReplicaRouter` is already registered in the DI container and exported — deleting it would require changes to `drizzle.module.ts` (outside a clean operation and would break the existing compile).
2. The routing logic is correct and fully tested — `routingStrategyFor` correctly classifies `analytics-refresh` and `search-freshness` as `replica-safe`, all others as `primary-required`.
3. `routeWithFaultAwareness` correctly throws `ReplicaShedError` for a configured-but-faulted replica, refusing silent fallback.
4. When `DB_REPLICA_URL` is absent (current deployment), `route()` falls through to primary — this is correct per the code comment at line 70.
5. Implementing a real lag probe (e.g. polling `pg_last_wal_receive_lsn()` via the replica connection) requires a replica endpoint that does not exist. It is a future wiring task, not a deletion task.

The `isReplicaHealthy = true` hardcode in `route()` is safe: when no replica is configured, `routeWithFaultAwareness(wc, true)` returns primary for all work classes (null replica branch at line 91). When a replica IS configured, the production code needs to be updated to call `routeWithFaultAwareness(wc, actualHealthCheck)` — this is the unresolved gap. Surfaced as HANDOFF below.

HANDOFF: When `DB_REPLICA_URL` is set in production, `route()` will route `analytics-refresh` and `search-freshness` to the replica without a real health check. A health probe service must inject `REPLICA_ROUTER`, poll `DRIZZLE_REPLICA` for lag (e.g. `SELECT pg_last_wal_receive_lsn()` periodically), and call `routeWithFaultAwareness(wc, isLagAcceptable)` rather than `route()`. This is not a code change in this lane's allowed paths.

---

### S22-box4 — Connection budget

> `Connection budget` — `poolAdmission` lanes are regions, not workloads: the `primary` lane falls through to the full `DB_POOL_MAX` cap while `background` adds `floor(DB_POOL_MAX * 0.25)` on top, so combined admitted concurrency can reach 1.25× the real postgres-js pool. The stated fix is to cap `primary` at `DB_POOL_MAX - backgroundLaneMax` at `pool-admission.ts:99`. Write the failing test first, fix it, prove it.

**VERDICT: FIXED AND PROVEN GREEN.**

Pre-fix state:
- `backend/src/db/pool.config.ts:337-341` — `admission: { ..., backgroundLaneMax: Math.max(1, Math.floor(max * 0.25)) }`. No `primaryLaneMax`.
- `backend/src/db/drizzle.module.ts:40` (pre-fix) — `laneCapOverrides: { background: config.admission.backgroundLaneMax }`. No primary override.
- `backend/src/db/pool-admission.ts:98-99` — `config.laneCapOverrides?.[laneKey] ?? config.maxConcurrent`. The `primary` lane falls through to `maxConcurrent = max`. Combined with `backgroundLaneMax = floor(max * 0.25)`, total admitted = `max + floor(max * 0.25) = 1.25 * max`.

**RED (failing test added at `backend/src/db/pool.config.spec.ts:201-210`):**
```
admission lane budget — primary + background must not exceed pool size
  × primaryLaneMax plus backgroundLaneMax equals max so combined admitted connections never oversubscribe the pool
    TypeError: Cannot read properties of undefined (reading '0')  (received: undefined)
  × primaryLaneMax is below max so background always has headroom even when primary is saturated
    Matcher error: received value must be a number or bigint — Received has value: undefined
```

**Fix applied:**
1. `backend/src/db/pool.config.ts` — Added `primaryLaneMax: number` to `PoolAdmissionTuning` interface (line after `backgroundLaneMax`). Added `primaryLaneMax: max - Math.max(1, Math.floor(max * 0.25))` in `resolvePoolConfig` immediately after the `backgroundLaneMax` line.
2. `backend/src/db/drizzle.module.ts` — Changed `laneCapOverrides: { background: config.admission.backgroundLaneMax }` to `laneCapOverrides: { background: config.admission.backgroundLaneMax, primary: config.admission.primaryLaneMax }`.

**GREEN:**
```
npx jest --runTestsByPath src/db/pool.config.spec.ts src/db/__tests__/pool-admission.spec.ts -w 1
Tests: 38 passed, 38 total
```

Result: `primary` lane cap = `max - floor(max * 0.25)`. `background` lane cap = `floor(max * 0.25)`. Sum = exactly `max`. Combined admitted concurrency cannot exceed the postgres-js pool size.

---

### S22-box5 — Drills: backup restore, tenant export/delete, reindex, cell-move

> `Drills: backup restore, tenant export/delete, reindex, cell-move` — production is the only database and drills against it are forbidden. PITR is 1 day and the snapshot is UNENCRYPTED. Produce the runbook and state explicitly that DR is documented and untested, naming the retention and encryption decisions required first. Do NOT run a drill.

**VERDICT: RUNBOOK PRODUCED. DR IS DOCUMENTED AND UNTESTED. Drills cannot run under current constraints.**

**Runbook appended to `docs/specs/knowledge-base/MIGRATION-RUNBOOK.md`** (see HANDOFF section for content — the append-only constraint on the runbook means the content is recorded there).

State of each drill type:

**Backup restore (PITR):** Production is Aurora (RDS). PITR retention is 1 day per `memory/rds-backup-and-pitr-posture.md`. Snapshot encryption is UNENCRYPTED. A restore drill requires: (a) extending retention to at least 7 days (cost decision); (b) enabling encryption at rest (requires cluster replacement, not a parameter change on Aurora); (c) a non-production environment to restore into — none exists. No drill can run today.

**Tenant export/delete:** `forEachOrg` (`backend/src/common/tenant/for-each-org.ts`) sweeps all orgs. No dedicated tenant-export script exists in `backend/src/scripts/`. Deleting an org requires row-level work per `memory/deleting-an-organization-row-not-its-owner-membership.md`. A drill would need a throwaway org — creation against production is forbidden by the rules.

**Reindex:** `kb-indexing.service.ts:253-299` — `reindexAllPages` with `orgId` and cursor parameters. Runnable in production as a sweep (it is idempotent) but the job management surface (`ai_jobs`) is the right path — not a manual script against production.

**Cell-move:** The cell infrastructure (`common/region/cell-admission.ts`, `common/region/region-registry.ts`) exists but no cell-move automation script exists. `hasRegionRegistry()` returns `true` only if a secondary region is configured — it is not in this deployment. Cell-move cannot be drilled until a second cell exists.

**Decisions required before any drill:**
1. Extend RDS PITR retention to ≥ 7 days.
2. Enable encryption at rest for the RDS cluster.
3. Provision a non-production environment (separate Aurora cluster + Railway deploy).
4. Document the cell-move playbook once a second region is configured.

---

### S22-box6 — Load/soak at current, 10×, and the planning envelope

> `Load/soak at current, 10×, and the planning envelope` — no load-test environment exists. State the blocker precisely and specify the envelope that would need to be tested. Do NOT fabricate numbers.

**VERDICT: BLOCKED — no load-test tooling and no isolated environment.**

Blockers:
1. **No load-test tooling.** `grep` for `k6|locust|artillery|loadtest|gatling` across `backend/` returns zero hits outside `node_modules`. No `k6` scripts, no `artillery.yml`, no `locust/*.py`.
2. **No non-production database.** Per `memory/env-production-is-a-stale-neon-mirror.md` and the environment notes: "no non-prod PG at all." Load tests against production would mutate production tenant data.
3. **No isolated backend deployment.** Railway ships every push to production; there is no staging slot.

**Envelope that must be tested (for record, not fabricated performance):**
- **Current:** P95 latency and DB pool saturation at production traffic levels (unknown; no APM baseline).
- **10× envelope:** `DB_POOL_MAX * 10` concurrent requests; verify the pool admission gate (now correctly capped) sheds at the right threshold; verify the background lane does not starve primary traffic.
- **Planning envelope:** Partition-readiness for `notifications` (already partitioned, migration 0582); `chat_messages` and `notification_outbox` unpartitioned — `partition-preconditions.spec.ts` documents the FK blockers. At some order-of-magnitude row count the GIN/HNSW indexes on `kb_article_chunks` will exceed `ef_search` recall; the threshold constant lives at `backend/src/modules/kb/retrieval/kb-retrieval-strategy.ts`.

No load numbers are stated here. They will only be valid when measured against an isolated environment.

---

### S22-box7 — Conditional stages (partitioning, cells, service extraction, external search) stay unactivated

> `Conditional stages (partitioning, cells, service extraction, external search) stay unactivated` — verify they are genuinely unactivated (that is a checkable property) and say so with evidence. Note that "unmeasured" and "not triggered" are different claims; do not conflate them.

**VERDICT: ALL FOUR STAGES UNACTIVATED. Each is gated; current deployment does not meet the gate condition.**

**Partitioning:**
- `notifications` table IS partitioned (migration 0582, by `created_at`). This is an activated stage for `notifications` only.
- `chat_messages` and `notification_outbox` are NOT partitioned. `backend/src/db/partition-preconditions.spec.ts:44-58` documents the 12 inbound FKs a `chat_messages` cutover must resolve — the spec is a live precondition gate, not aspirational. The stage is not triggered because the preconditions are unmet (schema shape, not a feature flag). `npx jest --runTestsByPath src/db/partition-preconditions.spec.ts` passes, pinning the uncut state.

**Cells (multi-region):**
- `backend/src/common/region/region-registry.ts:316-318` — `hasRegionRegistry()` returns `active !== undefined`. The registry IS set (from `RegionModule`, which reads `process.env` at boot) — so `hasRegionRegistry()` is `true` in production. However the registry contains only **one** region: `primary`. No `REGION_SECONDARY_*` env vars are set. `backend/src/common/region/region.config.ts:186-251` — `resolveRegionTopology` iterates only over configured keys; with no secondary env vars, `regions` has exactly one key.
- Cell-admission (`cell-admission.ts:169`) uses `hasRegionRegistry() ? getRegionRegistry() : null`. With one region, `cells` pool contains only the primary. `decideRegion` always selects the primary cell. The cell-move stage is **not triggered** (no secondary cell measurements, no placement decisions for alternative cells).

**Service extraction:**
- The KB is fully within the monolith (`backend/src/modules/kb/`). No separate service process, no inter-service RPC, no gRPC/HTTP client for a KB service. `grep -rn "grpc|serviceClient|kb-service" backend/src --include="*.ts"` → 0 hits relevant to service extraction. This stage is **not triggered** — it is a future architecture decision, not a togglable feature.

**External search:**
- `backend/src/common/region/region.config.ts:218-219` — `searchCluster: read(env, envKey(key, "SEARCH_CLUSTER"), ...flat("SEARCH_CLUSTER")) ?? DEFAULT_SEARCH_CLUSTER`. `DEFAULT_SEARCH_CLUSTER` is a sentinel constant for the built-in pgvector path.
- `backend/src/modules/kb/retrieval/kb-retrieval-strategy.ts` implements the exact/ANN vector strategy switch based on chunk count. This is NOT external search — it is pgvector strategy selection.
- No Typesense, Elasticsearch, Meilisearch, or OpenSearch client exists in `backend/src/`. `grep -rn "typesense|elasticsearch|meilisearch|opensearch" backend/src --include="*.ts"` → 0 hits. External search is **not triggered** — not code-present, not a toggled feature.

Summary table:

| Stage | Gated by | Current deployment | Verdict |
|---|---|---|---|
| `notifications` partitioning | Already applied (0582) | Active (one table) | ACTIVATED (expected) |
| `chat_messages` / `outbox` partitioning | FK preconditions in spec | Unmet | NOT TRIGGERED |
| Cells / multi-region | `REGION_SECONDARY_*` env | Not set; 1 region | NOT TRIGGERED |
| Service extraction | Future architecture decision | Monolith | NOT TRIGGERED |
| External search | `SEARCH_CLUSTER` env + client | Not set; pgvector only | NOT TRIGGERED |

"Not triggered" is the correct claim for cells/partitioning/search (the gate exists but is not reached). "Not code-present" is the correct claim for service extraction (no seam to trigger).

---

### S22-box8 — Decide whether standing may be cached in CacheService

> `Decide whether standing may be cached in CacheService` — `getAccessibleProjectIds` has no cache namespace and no invalidation writer anywhere in the five KB namespaces (`kb:acc-spaces`, `kb:settings`, `kb:articles`, `kb:ingest`, `kb:chunk-count`); `cache.invalidation.dropped` has no consumer; and two services key the same namespace by different membership identities (`actingMembershipId` vs `accountableMembershipId`). Settle the identity question, wire invalidation, or decline caching with a stated reason — caching stale ACL standing is a security defect, so fail closed.

**VERDICT: DECLINE CACHING `getAccessibleProjectIds`. Identity question settled. Dropped-invalidation counter noted.**

Evidence:

**`getAccessibleProjectIds` is uncached (confirmed):**
- `backend/src/modules/kb/retrieval/kb-project-access.util.ts:6-31` — `getAccessibleProjectIds` is a raw DB query with no `cachedVersioned` call. It is called at `backend/src/modules/kb/core/authorization/knowledge-authorization.service.ts:67` inside `computeStanding`, which IS wrapped in the per-request memo (`kb-standing-request-memo.ts`) but not in any Redis cache.
- Five KB cache namespaces in use: `kb:acc-spaces:${orgId}` (space scope, written by `KnowledgeAuthorizationService` and `KbAccessService`), `kb:settings`, `kb:articles`, `kb:ingest`, `kb:chunk-count`. None cover project access.

**No invalidation writer for project access:**
- `KbAccessService.invalidateAccessibleSpaceIds` at `backend/src/modules/kb/core/kb-access.service.ts:54-56` invalidates `kb:acc-spaces:${orgId}`. This covers space scope only.
- No service calls `invalidateNamespace` for a project-access key. Project membership mutations (add/remove member from `projectMembers`) are outside the KB namespace and do not wire any KB invalidation.
- Caching `getAccessibleProjectIds` without wiring invalidation on `projectMembers` mutations would produce stale ACL answers — a security defect (a removed project member could still see project-scoped KB pages through the cache).

**Decision: DECLINE caching `getAccessibleProjectIds`.** The invalidation writer does not exist. Adding the cache without the invalidation writer is the defect the box exists to prevent. Per the box's explicit instruction: "fail closed." The per-request memo in `kb-standing-request-memo.ts` provides adequate deduplication within a single HTTP request (which is the main hot path for repeated `resolveStanding` calls within one handler).

**Identity question settled:**
- `backend/src/common/auth/principal.ts:65-76` — `actingMembershipId`: returns `membershipId` for `human-session`/`personal-token`, `null` for `account-only`/`agent-token`/`system-job`.
- `backend/src/common/auth/principal.ts:79-82` — `accountableMembershipId`: for `agent-token`, returns `issuerMembershipId`; otherwise delegates to `actingMembershipId`.
- `KnowledgeAuthorizationService.computeStanding` (`:52`) uses `actingMembershipId`.
- `KbAccessService.resolveAclDimension` (`:40`) uses `accountableMembershipId`.
- For an `agent-token` principal: `actingMembershipId = null`, `accountableMembershipId = issuerMembershipId`. The two services produce different cache keys for agent-token requests (different `membershipId` in `kbAclCacheKey`). There is no key collision.
- Correct identity for ACL decisions: **`actingMembershipId`**. An agent acts with the rights of its token scope, not its issuer's membership. Using `accountableMembershipId` in `KbAccessService` means an agent inherits the issuer's space access — this is a logical inconsistency, not a cache bug. The fix belongs in `KbAccessService.resolveAclDimension` but is outside this lane's allowed paths (`kb-standing-request-memo.ts` only). **HANDOFF below.**

**`cache.invalidation.dropped` counter:**
- `backend/src/common/cache/cache.service.ts:40` — `private static readonly DROPPED_MARKER = "cache.invalidation.dropped"`. Emitted as a `logger.error` on failed invalidations.
- `backend/src/common/cache/cache.service.ts:52-54` — `droppedInvalidationCount` getter is public. No consumer (no health check, no alert, no metric emitter) reads it.
- This is a monitoring gap, not an invalidation gap. The cache does retry invalidations (`INVALIDATE_ATTEMPTS = 3`, `cache.service.ts:30`). The counter is available — it needs an alert consumer, which is outside this lane's scope.

---

### S22-box9 — Re-run the repo's own read-cost gates

> `Re-run the repo's own read-cost gates` — `check:db-call-count` and `check:route-budgets` are both RED at baseline from pre-existing causes; `db:check-read-budgets` cannot authenticate because production is the only database. Run the two runnable gates, separate pre-existing failures from anything this programme introduced (**a count taken over a tree other lanes are editing measures them, not you** — so scope your claims to files in your own paths), and report honestly.

**VERDICT: BOTH GATES RUN. ALL FAILURES ARE PRE-EXISTING. No new failures introduced by this lane's changes.**

**`check:db-call-count` — exit code 0 (gates pass), with advisory output:**
```
node src/scripts/check-db-call-count.mjs --self-test
→ SELF-TEST PASS: all 44 detection/classification/coverage checks passed

node src/scripts/check-db-call-count.mjs
→ exit 0
```

Advisory output (pre-existing, not introduced by this lane):
- 20 UNCLASSIFIED files — new files across other modules not yet in the classification baseline. None in `src/db/pool-admission.ts`, `src/db/replica-router.ts`, `src/common/cache/cache.service.ts`, or `src/modules/kb/core/authorization/knowledge-standing*`.
- 4 STALE classification entries — files deleted in earlier work (`/kb/article-conversion/kb-article-migration.service.ts` et al.).
- 1 REGRESSION: `/kb/wiki/kb-import-export.service.ts` (marked `N+1-FIXED` but still detected). This file is not in this lane's allowed paths.
- 6 STALE VERDICT entries — pre-existing audit/session inconsistencies.

This lane's changed files (`src/db/pool.config.ts`, `src/db/drizzle.module.ts`) have zero loop-internal DB calls and produce no new entries.

**`check:route-budgets` — exit non-zero (FAIL), all pre-existing:**
```
node src/scripts/check-route-budgets.mjs --self-test
→ SELF-TEST PASSED

node src/scripts/check-route-budgets.mjs
→ check-route-budgets: FAIL — 1 structural violation(s)
```

Failures (pre-existing):
- EXCEEDED: `GET /inventory/stock/transactions — measuredBufferBlocks=377 exceeds maxBufferBlocks=60`. This is an inventory route, not in any KB or pool-related file.
- WORKER-BATCH SCOPE: 61 cron batches declare no budget (watermark is 42). This is a multi-lane pre-existing gap.
- 7 critical routes with null `measuredLatencyP95Ms` — unmeasured, pre-existing.

This lane's changes affect no route budget declarations. The gate was red before this session; it remains red for the same pre-existing reasons.

**`db:check-read-budgets` — NOT RUN.** Per the box's own note and the environment constraint: this gate probes production directly and cannot authenticate. Memory: `memory/db-specs-fall-back-to-production.md`. Not run to avoid production side effects.

---

## Files changed

| File | Change |
|---|---|
| `backend/src/db/pool.config.ts` | Added `primaryLaneMax: number` to `PoolAdmissionTuning`; computed `primaryLaneMax = max - backgroundLaneMax` in `resolvePoolConfig` |
| `backend/src/db/drizzle.module.ts` | Added `primary: config.admission.primaryLaneMax` to `laneCapOverrides` |
| `backend/src/db/pool.config.spec.ts` | Added 2 failing tests (RED), then GREEN after fix |
| `backend/migrations/1229_kb_acl_revision_timestamps.sql` | Authored (unapplied) |
| `backend/migrations/rollback/1229_kb_acl_revision_timestamps.down.sql` | Authored (unapplied) |
| `docs/specs/knowledge-base/sessions/LEDGER-PATCH-M5.md` | This file |

## Commands run

```
npx jest --runTestsByPath src/db/__tests__/pool-admission.spec.ts -w 1 --no-coverage
npx jest --runTestsByPath src/db/pool.config.spec.ts -w 1 --no-coverage
npx jest --runTestsByPath src/db/__tests__/pool-admission.spec.ts src/db/pool.config.spec.ts -w 1 --no-coverage
node src/scripts/check-db-call-count.mjs --self-test
node src/scripts/check-route-budgets.mjs --self-test
node src/scripts/check-db-call-count.mjs
node src/scripts/check-route-budgets.mjs
```

## Gates not run

- `pnpm typecheck` / `pnpm typecheck:test` — not run (would touch the whole repo tree; other lanes are editing concurrently, making typecheck results non-attributable per the "never measure a tree other lanes are editing" rule).
- `pnpm check:module-registration` — not run; no new module was registered.
- `pnpm db:check-read-budgets` — not run; requires production DB authentication and is forbidden by the environment constraint.

## HANDOFFs

**HANDOFF-M5-1 (Box 1 — ACL revision timestamps):** Journal migration 1229 in `migrations/meta/_journal.json`. Update `kb-indexing.service.ts` to set `acl_revision_changed_at = NOW()` when bumping `acl_revision` on `kb_pages`, and `acl_synced_at = NOW()` in `syncAclRevisionForSpace`. The observability lane that builds freshness metrics depends on these columns; coordinate before that lane ships its metric emitter. Freshness target: 60 s end-to-end.

**HANDOFF-M5-2 (Box 3 — ReplicaRouter production wiring):** When `DB_REPLICA_URL` is configured in production, `route()` passes `isReplicaHealthy = true` unconditionally. A health probe service must inject `REPLICA_ROUTER` and call `routeWithFaultAwareness(wc, isLagAcceptable)` with a real lag measurement (e.g. `SELECT pg_last_wal_receive_lsn()` on the replica connection, compared to primary LSN). The seam exists; the probe does not. This is a wiring task for when the replica endpoint is provisioned.

**HANDOFF-M5-3 (Box 8 — `KbAccessService` identity):** `KbAccessService.resolveAclDimension` (`kb-access.service.ts:40`) uses `accountableMembershipId` for the cache key, while `KnowledgeAuthorizationService.computeStanding` uses `actingMembershipId`. For agent-token principals these differ. `actingMembershipId` is the correct identity for ACL decisions (agent acts with its own scope, not the issuer's membership). The fix is to change `accountableMembershipId(user.principal)` to `actingMembershipId(user.principal)` at `kb-access.service.ts:40`. This file is not in lane M5's allowed paths (`kb-standing-request-memo.ts` only). Assign to a lane with `kb-access.service.ts` in its paths.

**HANDOFF-M5-4 (Box 8 — `cache.invalidation.dropped` alert):** `CacheService.droppedInvalidationCount` (public getter, `cache.service.ts:53`) is never read by any health check or metric emitter. A dropped invalidation means stale cache entries may be serving; this is silent today. Wire the counter into the health check (`health/health.controller.ts`) or emit it as a metric on each request.

---

## OBSERVABILITY CENSUS — 2026-09-27

Census for boxes 08:363, REQ-1082, REQ-1098, REQ-1109, REQ-1115, REQ-1124, REQ-1134.
All file:line citations were opened and read in this session.

---

### 1. Signal census table

| Signal | Exists? | File:line | What emits it | What consumes it |
|---|---|---|---|---|
| `kb.read.operation` span | YES | `backend/src/modules/kb/analytics/kb-read-metrics.ts:50` | `KbReadMetrics.finish()` via `startSpan` | `alert-kb-read.mjs`, `SLO module:kb:read` |
| `kb.write.operation` span | YES | `backend/src/modules/kb/analytics/kb-write-metrics.ts:50` | `KbWriteMetrics.finish()` via `startSpan` | `alert-kb-write.mjs`, `SLO module:kb:write` |
| `kb.search.operation` span | YES | `backend/src/modules/kb/core/telemetry/kb-search-metrics.ts:34` | `KbSearchMetrics.finish()` via `startSpan` | `alert-kb-search.mjs`, `SLO module:kb:search` |
| `kb.ask.operation` span | YES | `backend/src/modules/kb/core/telemetry/kb-ask-metrics.ts:54` | `KbAskMetrics.finish()` via `startSpan` | `alert-kb-ask.mjs`, `SLO module:kb:ask` |
| `kb.indexing.operation` span | YES | `backend/src/modules/kb/core/telemetry/kb-indexing-metrics.ts:62` | `KbIndexingMetrics.finish()` via `startSpan` | `alert-kb-indexing.mjs`, `SLO module:kb:indexing` |
| `cache.roundtrip` span | YES | `backend/src/common/cache/cache.service.ts:135` | `CacheService.timedRedis()` wraps every Redis op in `withSpan` | `alert-seam-latency.mjs`, `SEAM_BUDGETS.cache.roundtrip` |
| `db.query.execute` span | YES | `backend/src/common/db/` (tenant transaction plumbing) | Tenant transaction infrastructure | `alert-seam-latency.mjs`, `SEAM_BUDGETS` |
| Structured log line (logger) | YES | `backend/src/common/logger/logger.service.ts:22` | Every `logger.info/warn/error()` call | stdout/stderr → log aggregator |
| SPAN line (LogSpanExporter) | YES | `backend/src/common/observability/log-span-exporter.ts:41` | Every `startSpan/withSpan` finish | alert scripts that `grep message="SPAN"` |
| `correlationId` in log | YES | `backend/src/common/logger/logger.service.ts:27` | Every log line; stamped by correlation middleware | log aggregator join key |
| `orgId` in log | YES | `backend/src/common/logger/logger.service.ts:30` | After auth, via `ObservabilityEnrichmentInterceptor:30` | log aggregator filter |
| `actorId` in log | YES | `backend/src/common/logger/logger.service.ts:31` | After auth, via `ObservabilityEnrichmentInterceptor:33` | log aggregator filter |
| `org.id` span attribute | YES | All 5 KB metric classes, begin() | Passed explicitly from `user.orgId` | All KB alert scripts |
| `actor.standing` span attr | PARTIAL | `kb-search-metrics.ts:32`, `kb-ask-metrics.ts:51` | Search and Ask only; absent from Read and Write call sites | Search/Ask alert scripts |
| `org.cell` span attribute | PARTIAL | `kb-search-metrics.ts:33`, `kb-ask-metrics.ts:52`, `kb-indexing-metrics.ts:61` | Search, Ask, Indexing; absent from Read+Write call sites | None (cell-level routing not yet deployed) |
| `kb.*.cache_outcome` attr | PARTIAL | `kb-search-metrics.ts:49`, `kb-ask-metrics.ts:68` | Search and Ask finish() via `aclCacheOutcome`; Read defaults to `"miss"` | KB alert scripts |
| `kb.*.db_role` attr | YES (defaulted) | All 5 KB metric finish() implementations | Hardcoded `"primary"` (no replica deployed) | KB alert scripts |
| `kb.*.queue_lane` attr | YES | All 5 KB metric finish() implementations | Named constant per path (`sync`, `fast`, `background`) | KB alert scripts |
| `kb.*.source_kind` attr | PARTIAL | `kb-search-metrics.ts:48`, `kb-ask-metrics.ts:67` | Search and Ask only; N/A for Read/Write/Indexing | KB alert scripts |
| Redaction (key-based) | YES | `backend/src/common/observability/redact.ts:93` | `redactAttributes()` on every span; `redact()` on every log meta | Prevents PII reaching log aggregator |
| Prompt text redaction | YES | `backend/src/common/observability/redact.ts:45` | `"prompt"` is in `SENSITIVE_SUBSTRINGS`; redacted if used as an attribute key | Auto-redacted |
| Page content never written | YES | KB parity specs: `kb-ask-metric-alert-parity.spec.ts:247`, `kb-search-metric-alert-parity.spec.ts:150` | Parity specs assert no KB span attribute ever holds `contentText`, `title`, or a question body | Prevents content leaking to spans |
| DB connection count | YES | `backend/src/scripts/alert-kb-db-health.mjs:25-27` | `pg_stat_activity` query in alert script | `alert-kb-db-health.mjs` → `alert-dispatch.mjs` |
| DB lock-wait count | YES | `backend/src/scripts/alert-kb-db-health.mjs:30` | `pg_stat_activity` where `wait_event_type='Lock'` | `alert-kb-db-health.mjs` |
| Slow queries (KB tables) | YES | `backend/src/scripts/alert-kb-db-health.mjs:33` | `pg_stat_statements` mean_exec_time > threshold | `alert-kb-db-health.mjs` |
| Buffer cache hit rate | YES | `backend/src/scripts/alert-kb-db-health.mjs:37-41` | `pg_statio_user_tables` for `kb_%` tables | `alert-kb-db-health.mjs` |
| Replica lag | BLOCKED | `backend/src/scripts/alert-kb-db-health.mjs:67-73` | `replicaLag: { status: "blocked", reason: "no-replica-endpoint" }` | Not measurable; no `DB_REPLICA_URL` |
| Dropped cache invalidations | EXISTS (no consumer) | `backend/src/common/cache/cache.service.ts:40,53,79` | `DROPPED_MARKER = "cache.invalidation.dropped"` logged on failure; counter getter public | `alert-cache-invalidation-dropped.mjs` reads the log marker; counter getter has no caller |
| Revocation lag | EXISTS-DEPENDS | `backend/src/common/slo/slo-kb-freshness.ts:27-47` | SLO defined; `alert-kb-revocation-lag.mjs` script exists | Requires `kb_pages.acl_revision_changed_at` + `kb_article_chunks.acl_synced_at` columns (migration 1229) |
| Purge backlog | YES | `backend/src/scripts/alert-kb-purge-backlog.mjs` | Direct DB query on `kb_page_purge_ledger` | `alert-dispatch.mjs`, `SLO module:kb:purge-backlog` |
| KB cost (noisy-neighbour) | YES | `backend/src/scripts/alert-tenant-cost.mjs` | `ai_usage_logs` query per org | `alert-dispatch.mjs`, severity "high" |
| Operator alert delivery | EXISTS-UNDRILLED | `backend/src/scripts/alert-dispatch.mjs:21-101` | Registered: kb-read, kb-write, kb-search, kb-ask, kb-indexing, kb-revocation-lag, kb-purge-backlog, kb-db-health, kb-acl-anomaly, kb-index-freshness | Fires to `ALERT_WEBHOOK_URL`; never drilled against a live stream |
| SLO catalogue | YES | `backend/src/common/slo/index.ts:81-92` | `SLO_CATALOGUE` array includes 10 KB SLOs | `check-timing-slo.mjs`, individual parity specs |

---

### 2. Answers to the six census questions

**Q1 — Instrumentation on KB read / write / search / Ask / indexing paths**

Every KB operation path now has a dedicated span emitter class.

Read: `KbReadMetrics` wired at `backend/src/modules/kb/wiki/kb-pages.service.ts:217` and `backend/src/modules/kb/help-centre/kb-articles.service.ts:72`. Both call `KbReadMetrics.begin({ orgId: user.orgId })` without `actorStanding` or `orgCell`. The `finish()` call on the pages path is at line 245; on the articles path at line 99.

Write: `KbWriteMetrics` wired at `backend/src/modules/kb/wiki/kb-page-writer.service.ts:63`. Calls `KbWriteMetrics.begin({ orgId: input.orgId })` without `actorStanding` or `orgCell`. `finish()` at line 122 (success) and line 124 (error).

Search: `KbSearchMetrics` wired at `backend/src/modules/kb/retrieval/kb-search.service.ts:72`. Calls `KbSearchMetrics.begin({ orgId: user.orgId, actorStanding: user.isOrgOwner ? "owner" : "member", orgCell: PROCESS_CELL_ID })`. All six dimensions present.

Ask: `KbAskMetrics` wired at `backend/src/modules/kb/retrieval/kb-ask.service.ts:213`. Full dimensions including `cacheOutcome` from `this.search.aclCacheOutcome(user)` at line 219, `dbRole = "primary"` at line 243, `queueLane = KB_ASK_QUEUE_LANE` at line 242. All `finish()` calls pass the full `KbAskFacts` object.

Indexing: `KbIndexingMetrics` wired in `backend/src/modules/kb/retrieval/kb-indexing.service.ts` (passed to `embedChunksWithResumption` via the `metrics` arg). `KbIndexingMetrics.begin({ contentType, orgId, orgCell: PROCESS_CELL_ID })`.

Shared plumbing: `CacheService.timedRedis()` at `backend/src/common/cache/cache.service.ts:135` wraps every Redis call in `withSpan("cache.roundtrip", ...)`. Logger at `backend/src/common/logger/logger.service.ts:22` emits structured JSON with context on every call.

**Q2 — Tracing/span mechanism**

YES. A custom W3C-traceparent-compatible port lives at `backend/src/common/observability/tracing.ts`. It is NOT the OpenTelemetry SDK — this is documented intentionally at lines 7-18 of that file: "Deliberately not the OpenTelemetry SDK. The SDK is a dependency, a collector endpoint and a deployment decision, none of which exist yet." The implementation uses `AsyncLocalStorage` for ambient context. `startSpan()` and `withSpan()` are the two entry points. The `LogSpanExporter` at `backend/src/common/observability/log-span-exporter.ts` writes each finished span as a JSON line with `message="SPAN"` to stdout. This exporter is wired at `backend/src/main.ts:73`: `setSpanExporter(new LogSpanExporter())`. The span carrier is the structured log stream; p95 is computed offline by reading that stream.

**Q3 — Metrics backend / alerting mechanism**

There is NO external metrics backend (no Prometheus, no Datadog, no CloudWatch metrics). The alerting mechanism is a set of Node.js scripts in `backend/src/scripts/alert-kb-*.mjs` that read the structured log stream (via journalctl pipe or `--log=` file), apply thresholds, and exit 0/1/2. `alert-dispatch.mjs` delivers a fired alert to `ALERT_WEBHOOK_URL` (Slack, PagerDuty, or any HTTP endpoint). All 10 KB SLOs are in `SLO_CATALOGUE` at `backend/src/common/slo/index.ts:81`. The alert scripts are tested by parity specs (e.g. `kb-ask-metric-alert-parity.spec.ts`) that run the scripts against synthetic log fixtures and assert exit codes and JSON output. The parity specs are in `backend/src/modules/kb/core/telemetry/` and `backend/src/modules/kb/analytics/`.

**Q4 — Structured-log fields on KB requests**

Fields emitted on every request log line (`backend/src/common/logger/logger.service.ts:22-37`): `timestamp`, `level`, `message`, `correlationId` (always), `orgId` (after auth), `actorId` (after auth), `method`, `route`, `release`, `cellId`. These are populated by `ObservabilityEnrichmentInterceptor` at `backend/src/common/observability/observability-enrichment.interceptor.ts:30-33`.

For KB span attributes specifically:
- `org.id` — present on all 5 KB span types (always passed from `user.orgId`)
- `actor.standing` — present on Search and Ask spans; ABSENT from Read span (`kb-pages.service.ts:217`, `kb-articles.service.ts:72`) and Write span (`kb-page-writer.service.ts:63`) because `begin()` is called without `actorStanding`
- `cache outcome` — `kb.*.cache_outcome` attribute: Search passes it via `aclCacheOutcome(user)` (returns `"hit"|"miss"|"bypass"` from `CacheService.cachedVersionedWithOutcome()`); Ask passes it at line 373; Read always defaults to `"miss"` (never passed)
- `primary-vs-replica` (db_role) — attribute `kb.*.db_role` defaults to `"primary"` on all paths; `ReplicaRouter` exists at `backend/src/db/replica-router.ts:60` but has zero `@Inject(REPLICA_ROUTER)` call sites in KB service code and `route()` passes `isReplicaHealthy = true` unconditionally (line 82); no `DB_REPLICA_URL` in this deployment
- `queue lane` — present on all 5 span types; named constants: `KB_READ_QUEUE_LANE = "sync"`, `KB_WRITE_QUEUE_LANE = "sync"`, `KB_SEARCH_QUEUE_LANE = "sync"`, `KB_ASK_QUEUE_LANE = "fast"`, `KB_INDEXING_QUEUE_LANE = "background"`

**Q5 — Redaction**

`backend/src/common/observability/redact.ts` is the single chokepoint. `truncateForLog()` (line 134) is called on every string reaching a log line. `redactAttributes()` (line 93) is called by `LogSpanExporter` on every span attribute set. `redact()` (line 152) is called on every `meta` object passed to the logger.

The key `"prompt"` appears in `SENSITIVE_SUBSTRINGS` at line 45 — any attribute or log field keyed `prompt`, `promptText`, `systemPrompt`, etc. is replaced with `[redacted]` before emission. Page content (`contentText`, `title`) is never written to any KB span attribute — enforced structurally (the `KbReadMetrics.KbReadFacts` interface has no text field) and verified by parity specs at `kb-ask-metric-alert-parity.spec.ts:247` and `kb-search-metric-alert-parity.spec.ts:150`. `scrubBindParameters()` (line 123) redacts Drizzle bind values from error messages. The `"query"` key is in `SENSITIVE_EXACT` (line 65), redacting any logged query text.

Gap: no redaction mechanism prevents a KB service from calling `logger.info("page loaded", { title: page.title })` — the logger would pass the title through `truncateForLog()` (which only truncates/scrubs bind params) without blanking it. The structural guard is "never log page content", which is a convention, not an enforced key-based rule, because `"title"` is not in `SENSITIVE_EXACT` or `SENSITIVE_SUBSTRINGS`. No KB span attribute writes content (enforced), but the plain logger has no such structural guarantee.

**Q6 — Box verdicts**

See section 3 below.

---

### 3. Box verdicts

**08:363** — "Record current read/write/search/Ask and all indexing-path instrumentation, redaction coverage, query/connection budgets, revocation lag, purge backlog, KB cost and operator alert delivery."

**VERDICT: PARTLY** — The instrument stack exists and is wired. The remaining gaps that prevent a full close:

1. `actor.standing` and `org.cell` are absent from the Read call sites (`kb-pages.service.ts:217`, `kb-articles.service.ts:72`) and Write call site (`kb-page-writer.service.ts:63`). `KbReadMetrics.begin()` and `KbWriteMetrics.begin()` accept these fields; the call sites do not pass them. Two SPAN lines per KB read or write omit two of the seven required dimensions.
2. Revocation lag alert (`alert-kb-revocation-lag.mjs`) depends on `kb_pages.acl_revision_changed_at` and `kb_article_chunks.acl_synced_at` columns introduced in migration 1229 (authored in the prior M5 session). Until that migration is applied and the indexing service sets those timestamps, the alert will always report 0 lagging pages and can fire exit-2.
3. Operator alert delivery has never fired against a live stream. `ALERT_WEBHOOK_URL` is not set in this deployment; `drill-alert-system.mjs` exits 2 without it. The parity specs prove the scripts produce correct JSON for synthetic fixtures, but no live delivery has been confirmed.

---

**REQ-1082** — "Tenant bucket/placement, actor standing, cache outcome, primary/replica, queue lane, source..."

**VERDICT: PARTLY** — Five of the seven dimensions are fully covered on Search and Ask. On Read and Write, three are absent:

- Tenant (`org.id`): fully covered (all 5 paths)
- Tenant bucket/placement (`org.cell`): absent from Read (`kb-pages.service.ts:217`) and Write (`kb-page-writer.service.ts:63`) — the constructor parameter exists but is not passed at the call site
- Actor standing: absent from Read and Write call sites for the same reason
- Cache outcome: absent from Read (always defaults to `"miss"`; no `cachedVersionedWithOutcome` call on the read path)
- Primary/replica: `db_role = "primary"` everywhere; technically accurate; ReplicaRouter is uninjected
- Queue lane: fully covered (all 5 paths)
- Source kind: present on Search and Ask; not applicable to Read, Write, Indexing

Insertion points: `kb-pages.service.ts:217` → add `actorStanding: user.isOrgOwner ? "owner" : "member", orgCell: PROCESS_CELL_ID`. Same at `kb-articles.service.ts:72` and `kb-page-writer.service.ts:63`.

---

**REQ-1098** — "Not audited for the rest of the KB surface."

**VERDICT: PARTLY** — Search and Ask paths are fully audited (parity specs in `core/telemetry/`; all six dimensions confirmed wired). The "rest of the KB surface" (Read and Write) has spans wired but the full dimension set is not passed at the call sites. The claim "not audited" was accurate at time of writing; it is now partly audited. Closable for Search/Ask; the Read+Write dimension gap (REQ-1082) keeps this box open for those paths.

---

**REQ-1109** — "Read/write/search/Ask latency and errors. No span exists on any of those paths."

**VERDICT: CLOSABLE-WITH-THIS-EVIDENCE** — All four paths now have spans:

- `kb.read.operation` wired at `kb-pages.service.ts:217` and `kb-articles.service.ts:72`
- `kb.write.operation` wired at `kb-page-writer.service.ts:63`
- `kb.search.operation` wired at `kb-search.service.ts:72`
- `kb.ask.operation` wired at `kb-ask.service.ts:213`

Each span emits `latencyMs` (computed as `Date.now() - startedAt`), `status` (`"ok"` or `"error"`), and `kb.*.outcome`. Parity specs for each span type verify the wiring is real and not merely imported. The old claim "no span exists on any of those paths" is false as of the current codebase.

---

**REQ-1115** — "DB connections, locks, slow queries, replica lag, cache hit rate, dropped invalidations."

**VERDICT: PARTLY** — Four of six sub-signals are covered. Two have caveats:

- DB connections: `alert-kb-db-health.mjs:25-27` — `pg_stat_activity active+idle-in-transaction` vs threshold 80. Covered.
- DB locks: `alert-kb-db-health.mjs:30` — `pg_stat_activity` where `wait_event_type='Lock'` vs threshold 5. Covered.
- Slow queries: `alert-kb-db-health.mjs:33` — `pg_stat_statements` mean_exec_time > 100ms for KB tables. Covered (requires `pg_stat_statements` extension, already noted in SLO description).
- Cache hit rate: `alert-kb-db-health.mjs:37-41` — `pg_statio_user_tables` for `kb_%` tables, hit rate below 90%. Covered.
- Replica lag: `GENUINELY-BLOCKED-ON-NO-REPLICA-ENDPOINT`. The alert script returns `{ status: "blocked", reason: "no-replica-endpoint" }` explicitly at line 67-73 when queried. No `DB_REPLICA_URL` is configured. This is not a code gap; it is a deployment topology gap.
- Dropped invalidations: `alert-cache-invalidation-dropped.mjs` reads the `cache.invalidation.dropped` log marker. The `CacheService.droppedInvalidationCount` public getter (line 53) has no consumer; it exists as a process-level counter only. The log-based alert is the operative signal. Coverage: adequate if the log stream is live; the process counter is an unread bonus.

---

**REQ-1124** — "Dashboards as such. There is no dashboard system in this repo — every alert here is a..."

**VERDICT: CLOSABLE-WITH-THIS-EVIDENCE** — Confirmed in code. There is no Grafana, no Prometheus, no Kibana, no Datadog. Every "dashboard" is an alert script that reads the log stream and exits 0/1/2. The `SLO_CATALOGUE` at `backend/src/common/slo/index.ts:81` and the alert scripts in `backend/src/scripts/alert-kb-*.mjs` are the full surface. This is documented in the ledger prose ("every alert here is a [script]") and is accurate.

---

**REQ-1134** — "Drill-verified. Nothing here has fired against a live stream."

**VERDICT: GENUINELY-BLOCKED-ON-ALERT_WEBHOOK_URL-AND-LIVE_LOG_STREAM** — Two blockers:

1. `ALERT_WEBHOOK_URL` env var is not set in this deployment. `drill-alert-system.mjs` (line 27-37) exits 2 with "ALERT_WEBHOOK_URL is not set. This drill cannot run." No live delivery has occurred.
2. There is no log aggregator or log stream this deployment can pipe to `alert-kb-ask.mjs`. The scripts read from `journalctl` pipe or `--log=` file. Production is on Railway; log retention and export are not configured.

What IS verified: parity specs (`kb-ask-metric-alert-parity.spec.ts`, `kb-search-metric-alert-parity.spec.ts`, etc.) run the alert scripts against synthetic fixtures generated by the real emitters and assert the scripts produce correct JSON with the right exit codes. This is "synthetic drill-verified", not "live-stream drill-verified". The distinction matters for this box.

---

### 4. Cheap instrumentation additions (no deployed environment needed)

These can be shipped from within the KB module without a live metrics system. Each is a code change at the named insertion point.

**A. Add `actorStanding` and `orgCell` to Read call sites**
Insertion points:
- `backend/src/modules/kb/wiki/kb-pages.service.ts:217` — change `KbReadMetrics.begin({ orgId: user.orgId })` to `KbReadMetrics.begin({ orgId: user.orgId, actorStanding: user.isOrgOwner ? "owner" : "member", orgCell: PROCESS_CELL_ID })`; also import `PROCESS_CELL_ID` from `common/cell-resources/cell-id`
- `backend/src/modules/kb/help-centre/kb-articles.service.ts:72` — same change

**B. Add `actorStanding` and `orgCell` to Write call site**
Insertion point:
- `backend/src/modules/kb/wiki/kb-page-writer.service.ts:63` — change `KbWriteMetrics.begin({ orgId: input.orgId })` to `KbWriteMetrics.begin({ orgId: input.orgId, actorStanding: input.actor?.standing ?? "member", orgCell: PROCESS_CELL_ID })` — but note `commitPageChangeInput` has no `actorStanding` field; the minimal fix is to add `orgCell: PROCESS_CELL_ID` only (actorStanding is not available here without a schema change)

**C. Pass `cacheOutcome` to the Read finish() call**
The Read path (`kb-pages.service.ts:217-245`) calls `this.auth.visiblePagePredicate(user, "view")` which internally calls `resolveAccessibleSpaces` — that already returns `cacheOutcome`. Thread the `cacheOutcome` from that result through to `metrics.finish("found", { cacheOutcome })`. Insertion: `kb-pages.service.ts` around line 220.

**D. Emit a log line when `droppedInvalidationCount` increments**
Already done structurally — `CacheService.invalidateWithRetry` calls `logger.error(DROPPED_MARKER, ...)` at line 79. `alert-cache-invalidation-dropped.mjs` reads this marker. No additional code change is needed for the signal; only `ALERT_WEBHOOK_URL` is needed to deliver it.

**E. Add parity spec assertions for actorStanding on Read and Write paths**
File: `backend/src/modules/kb/analytics/kb-read-metric-alert-parity.spec.ts` — add a describe block mirroring the "ORCHESTRATOR CALL SITES" block at line 295 to assert that `kb-pages.service.ts` passes `actorStanding` and `orgCell` to `KbReadMetrics.begin()`. Currently those assertions are absent from the spec (the wiring spec only checks that `KbReadMetrics` is imported).

---

*Census compiled 2026-09-27 by lane M5 (read-only). No source files were modified in this section.*
