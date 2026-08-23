# 11 — The request-cost gate runs by itself

**What to build:** Automatic enforcement of the per-request transaction ceiling.

The gate already exists and is careful: it measures as a non-owner, reads borrows from pool telemetry through the health endpoint, subtracts the background borrow rate, and issues requests concurrently. Its ceilings are met today.

It is also manual. It needs a running API and a seeded database, and nothing runs it — so the ceiling it pins can regress unnoticed. Phase one's ticket set claimed the ceiling could not silently regress; that claim was wrong, and this gap has been carried forward since.

> **Infrastructure-dependent.** This needs a seeded ephemeral API and database in CI, which is a different kind of work to the rest of this set and may not fit one context window. If it does not, split the environment from the wiring and let this ticket be the wiring.

**Blocked by:** 05 — Access version channel. (So that the ceilings pinned are the post-change numbers rather than numbers that will move immediately.)

**Status:** ready-for-agent

- [ ] CI boots the API against a seeded database and runs the gate.
- [ ] A ceiling breach fails the build, naming the endpoint and the measured number.
- [ ] The gate still measures as a **non-owner**. An owner short-circuits to full scope before permission resolution, so measuring as one reports the cost of a path that is not under test.
- [ ] It still counts **in-process borrows** rather than database statistics, whose background rate is the same magnitude as the signal.
- [ ] It still issues requests **concurrently**, so background work cannot dominate the measurement window.
- [ ] Ceilings are set from measured reality with headroom, not from a target.
- [ ] The three traps above are recorded alongside the wiring, because each one produced a confidently wrong number the first time it was measured.
- [ ] The gate's inability to see the cold path is noted where it lives, so nobody reads a passing gate as covering ticket 05's change. That coverage is ticket 01's.
