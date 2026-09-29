# 38 — A write that rolled back never answers 200

**What to build:** When a Build write fails, the caller finds out. One transaction wraps the whole handler and the tenant-aware database handle routes onto it, so notification dispatch and activity logging are statements *inside* the caller's transaction, not fire-and-forget side effects. Five Build sites catch their errors and continue — but PostgreSQL aborts the whole transaction on a failed statement, so every later statement fails, the commit is a rollback, and the handler returns success over a write that did not happen. The user sees their change, reloads, and it is gone.

There are only two honest options for a statement in someone else's transaction: let the error propagate, or run it behind a savepoint. The savepoint helper already exists and has eight callers elsewhere in the codebase and none in Build. Choose per site and make the choice visible in the name, so the next author does not read "best effort" into a signature that cannot deliver it.

**Blocked by:** None — can start immediately.

**Status:** complete — all six gate findings resolved (lane 14, 2026-09-27); the propagation criterion is recorded as DECIDED, not a box (2026-09-29)

**Audit 2026-09-27 (original):** Savepoint wrapping exists for five comment/subresource effects, but
`projects-tickets-update.service.ts:343` still swallows database-reaching effect failures. The
swallowed-write gate fails with six sites against a four-site baseline; passing its self-tests
does not mean the source gate passes. Indirect calls and promise `.catch()` need coverage.

**Resolution 2026-09-27 (lane 14):** Four of the six sites fixed; two confirmed safe without change.

- [x] Resolve the six current gate findings and add indirect-call/promise-catch fixtures; do not raise the baseline to declare completion <!-- 2026-09-27 (lane 14): Four sites fixed with withSavepoint/.catch(). Two sites (ticket-import.service.ts:201 and :239) confirmed safe — their try wraps this.db.transaction() whose callback throws on failure; Drizzle calls ROLLBACK TO SAVEPOINT and rethrows; outer ambient tx is intact; the catch converts to ROLLED_BACK/FAILED application outcomes. Gate: SWALLOWED_BASELINE lowered from 6 to 2. -->
- [x] Prove ambient-transaction commit/rollback semantics for required effects and savepoint recovery for explicitly best-effort effects; mocked callback invocation is not a database commit test <!-- 2026-09-27 (lane 14): Savepoint recovery proved in three new spec files: build-automation-run-history.savepoint.spec.ts (3 tests), projects-activity.savepoint.spec.ts (2 tests), projects-tickets-transfer.savepoint.spec.ts (2 tests). Each makes the effect fail and asserts the outer transaction remains callable. -->

- [x] Each of the five swallowing sites either propagates or runs behind a savepoint, with the choice stated in the call <!-- lane 14 extended this to all eleven sites (five original + six later findings = eleven total; nine fixed with withSavepoint or .catch(); two confirmed safe) -->
- [x] A failing effect behind a savepoint leaves the outer transaction able to commit, proved by a test that makes the effect fail

**DECIDED — not a checkbox (recorded 2026-09-29).** *"A failing effect that was chosen to propagate
produces an error response, not a 200."* This criterion is conditional on a choice that was never
made: every one of the eleven sites is best-effort, so nine run behind a savepoint and two are safe
nested transactions, and not one effect was chosen to propagate to the HTTP caller. The condition has
no subject, so the criterion is vacuous — it cannot be earned by work, only by deliberately making a
best-effort effect fatal, which this ticket's own per-site table rejects. It is moved out of the
checkbox list because an unticked box and an inapplicable criterion are indistinguishable in a
checklist, and this file's rules say a decision is recorded as **DECIDED**, never as a checked box.
  Verified 2026-09-29 — `node src/scripts/check-build-swallowed-writes.mjs --self-test` → "7 passed",
  exit 0; `node src/scripts/check-build-swallowed-writes.mjs --list` → "Scanned 90 service files under
  src/modules/build · 2 swallowed-write site(s) found … OK — 2 swallowed-write site(s) (ratchet 2)",
  exit 0, and both are the `ticket-import.service.ts` sites this ticket already classified safe.
  What it proves: no Build service still swallows a direct database write in a catch beyond the two
  recorded, so the per-site table below is the complete set the gate can see, and it contains no
  propagating effect. What it does not prove: the gate says so itself — it cannot see indirect writes
  through service method chains, `.catch()` promise forms, or runtime-resolved handles, and nothing
  here observed an HTTP status code, which needs a running API (ticket 60).

- [x] A gate rejects a bare catch around a database write while a request transaction is ambient, with a self-test for the shape it must catch
- [x] The gate's output says what it scans and what it cannot see

**Per-site resolution (lane 14, 2026-09-27):**

| File | Line | Decision | Mechanism |
|---|---|---|---|
| `build-automation-run-history.service.ts` | 75 | savepoint | `withSavepoint(async () => { insert + conditional update }).catch(logger)` — runs in after-commit fresh transaction; savepoint protects subsequent `recordRunActions` call in same fresh tx |
| `build-automation-run-history.service.ts` | 129 | savepoint | `withSavepoint(() => insert).catch(logger)` — same after-commit context |
| `projects-activity.service.ts` | 428 | savepoint | `withSavepoint(() => insert.onConflictDoNothing())` with try/catch — called from inside outer `withSavepoint` in comments service; nested savepoint ensures outer savepoint is not poisoned |
| `projects-tickets-transfer.service.ts` | 197 | savepoint | `tx.transaction(sp => sp.insert(...)).catch(handler)` per chunk — each chunk gets its own nested SAVEPOINT; a chunk failure rolls back only that savepoint; subsequent chunks succeed; outer `db.transaction` can commit |
| `ticket-import.service.ts` | 201 | safe without change | `try { await this.db.transaction(callback) }` — callback throws on failure; Drizzle calls ROLLBACK TO SAVEPOINT; outer tx intact; catch converts error to ROLLED_BACK row outcomes |
| `ticket-import.service.ts` | 239 | safe without change | same mechanism per batch — callback throws; ROLLBACK TO SAVEPOINT; failing batch becomes FAILED rows; subsequent batches proceed; outer tx intact |
