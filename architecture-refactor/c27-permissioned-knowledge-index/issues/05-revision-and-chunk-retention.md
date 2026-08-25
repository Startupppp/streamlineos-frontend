# 05 — Revision and chunk retention are explicit

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Wiki pages and support articles share a documented revision-retention policy.
- [ ] Milestone snapshots plus bounded deltas replace unbounded full snapshots where measured storage justifies it.
- [ ] Active, archived, deleted and legally held content have distinct retention behavior.
- [ ] Old chunk revisions are removed by partition/retention work, never row-by-row request work.
- [ ] A restore can rebuild the active index from retained source revisions.
- [ ] Erasure propagates to chunks, caches, exports and provider-side files.
