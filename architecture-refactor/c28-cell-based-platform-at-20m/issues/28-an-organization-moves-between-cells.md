# 28 — An organization moves between cells, and can roll back until the flip

**What to build:** An organization relocates to another cell without changing its identifiers or its URLs, and the move can be abandoned at any point before the placement flip. Its data is copied, verified and reconciled; writes are refused on stale routing rather than accepted into the wrong cell; and there is never a moment when two cells are both writable.

**Blocked by:** [22 — Every write carries its placement version and dies without the fence](22-a-write-carries-its-placement-version.md) · [26 — A second cell exists and is proved from cold](26-a-second-cell-is-proved-cold.md)

**Status:** ready-for-agent — **depends on a running second cell**

**The state machine, from the PRD:**

```text
ACTIVE_SOURCE → SNAPSHOT → CATCH_UP → READ_ONLY_SOURCE
→ VERIFY_TARGET → FLIP_PLACEMENT → ACTIVE_TARGET → RETIRE_SOURCE
```

**Grounding (2026-08-28, evidence not instruction — re-read at source):** ticket 22's fence is what makes this safe — losing the fence stops source writes *before* target writes begin, so a stale router fails a request rather than splitting the brain. Product intent #5 requires identifiers and user-facing URLs to survive the move unchanged, which is why the PRD also rules out a sweeping identifier rewrite: local bigint keys stay valid as long as every external reference carries organization and cell context.

## Acceptance criteria

- [ ] Each state in the machine is explicit and recorded; a relocation interrupted mid-state resumes from where it stopped.
- [ ] The copy is checksummed per table, per partition, per object and per index, and a mismatch stops the move rather than being retried past.
- [ ] Outbox offsets are reconciled, so no acknowledged event is lost and no event is delivered twice past its consumer's idempotency.
- [ ] Writes carry the placement version and are refused on stale routing throughout; there is no dual-writer steady state at any point.
- [ ] Rollback is possible until target verification and the placement flip complete, and is exercised — a rollback path that has never run is a hypothesis.
- [ ] The organization's identifiers and user-facing URLs are unchanged after the move.
- [ ] The source is retired only after the target has served real traffic, and retirement is its own recorded state.

## Todo

- [ ] Exercise the rollback before the happy path is polished. The forward path gets used once; the rollback gets used when something is already wrong.
- [ ] Include object storage and the search index in the checksum, not just the database. A verified database beside a stale index is a half-moved organization.
- [ ] Test with an organization that is actively writing, not an idle one. `CATCH_UP` is the state the idle test never enters.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
