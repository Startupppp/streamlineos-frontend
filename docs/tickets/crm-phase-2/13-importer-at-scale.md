# 13 — The universal importer, resumable and reversible

**Status:** not started
**Track:** C — importer
**Blocked by:** 02

## Why

Phase 1's importer is a paste, capped at 5,000 rows, running inline inside one
HTTP request and one transaction. Moving from Zoho is a project, not a step, and
most evaluations die here before the product is judged on its merits.

## Acceptance criteria

- [ ] The write runs inside the durable workflow runtime, each batch a memoised
      step, so a large import is **resumable rather than restartable**.
- [ ] The model proposes a mapping with a confidence per field; **the write is
      deterministic**. The tenant sees created/updated/merged/skipped with counts
      and samples, and edits it before anything is written.
- [ ] Records the mapping was unsure about are not written speculatively — they
      go to the data-quality queue (ticket 16).
- [ ] Reversible for a defined window through the same snapshot mechanism Phase
      1's merge reversal uses, not a second one.
- [ ] Deduplication reuses Phase 1's duplicate scorer at its existing
      thresholds. An import is exactly when duplicates are created at scale, and
      a second scorer would guarantee the two disagree.
- [ ] A row that fails takes a savepoint, not the whole import: one bad cell
      must not roll back the other 4,999 rows.

## Notes

Phase 1's review found the inline path aborts the whole transaction on a single
statement error, because Drizzle takes no per-statement savepoint. Carry that
fix forward rather than rediscovering it.
