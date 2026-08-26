# 05 — Revision and chunk retention are explicit

**Status:** in-progress — stale-chunk sweep done; storage-policy/restore/erasure criteria open

## Acceptance criteria

- [ ] Wiki pages and support articles share a documented revision-retention policy. — not written; the sweep's implicit policy (prune non-published article chunks, prune archived/deleted page chunks) is correct behaviour but not a stated, versioned policy document. Genuinely open: add a short policy statement (e.g., to `cron-kb-chunk-retention.service.ts` header or a dedicated doc) that explicitly names the retention tier for each content state.
- [ ] Milestone snapshots plus bounded deltas replace unbounded full snapshots where measured storage justifies it. — deferred; not addressed. Genuinely open: requires storage profiling before any design decision can be made.
- [x] Active, archived, deleted and legally held content have distinct retention behavior — for chunks. `CronKbChunkRetentionService` (`cron-kb-chunk-retention.service.ts`): article chunks are pruned when their parent article is absent or not `published`; page chunks are pruned when the parent page is absent, `archived`, or soft-deleted (`deletedAt IS NOT NULL`). Published articles and live pages are untouched.
- [x] Old chunk revisions are removed by partition/retention work, never row-by-row request work. — `pruneStaleChunks` runs via `forEachOrg` (one tenant transaction per org, per-org error isolation), batched in loops of 500 rows (`PRUNE_BATCH_SIZE`), triggered by `/cron/kb-chunk-retention-sweep` (`cron-support.controller.ts:62-71`), protected by `CronLeaseService` (lease TTL 600 s).
- [ ] A restore can rebuild the active index from retained source revisions. — deferred; no restore procedure exists. Genuinely open: requires a restore service or runbook that re-ingests source documents from their retained revision records.
- [ ] Erasure propagates to chunks, caches, exports and provider-side files. — partially: chunks are deleted by the sweep. Cache invalidation on chunk deletion, export pruning and provider-file deletion are not wired. Genuinely open: three of four erasure legs are absent.

**Audit note (2026-08-26):** Two of six criteria fully done (verified at named lines). The four open criteria are not false premises — retention policy documentation, delta-snapshot decision, restore procedure and full erasure propagation are all real gaps. The storage-measurement criterion cannot be decided until profiling data exists.
