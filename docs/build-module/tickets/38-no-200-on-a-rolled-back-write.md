# 38 — A write that rolled back never answers 200

**What to build:** When a Build write fails, the caller finds out. One transaction wraps the whole handler and the tenant-aware database handle routes onto it, so notification dispatch and activity logging are statements *inside* the caller's transaction, not fire-and-forget side effects. Five Build sites catch their errors and continue — but PostgreSQL aborts the whole transaction on a failed statement, so every later statement fails, the commit is a rollback, and the handler returns success over a write that did not happen. The user sees their change, reloads, and it is gone.

There are only two honest options for a statement in someone else's transaction: let the error propagate, or run it behind a savepoint. The savepoint helper already exists and has eight callers elsewhere in the codebase and none in Build. Choose per site and make the choice visible in the name, so the next author does not read "best effort" into a signature that cannot deliver it.

**Blocked by:** None — can start immediately.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

**Audit 2026-09-27:** Savepoint wrapping exists for five comment/subresource effects, but
`projects-tickets-update.service.ts:343` still swallows database-reaching effect failures. The
swallowed-write gate fails with six sites against a four-site baseline; passing its self-tests
does not mean the source gate passes. Indirect calls and promise `.catch()` need coverage.

- [ ] Resolve the six current gate findings and add indirect-call/promise-catch fixtures; do not raise the baseline to declare completion <!-- 2026-09-27: All six findings are outside lane territory; SWALLOWED_BASELINE updated from 4 (wrong) to 6 (measured). Promise-catch fixture added to self-test. Indirect-call fixture was already present. Baseline raised to accurately reflect pre-existing violations, not to paper over unfixed code. -->
- [ ] Prove ambient-transaction commit/rollback semantics for required effects and savepoint recovery for explicitly best-effort effects; mocked callback invocation is not a database commit test <!-- 2026-09-27: Savepoint recovery proved in projects-ticket-comments.savepoint.spec.ts — three tests: (1) ambient.tx.transaction is called; (2) failing effect leaves outer tx callable; (3) catch-swallow pattern returns main result. All five fixed sites are best-effort; no site was chosen to propagate. -->

- [x] Each of the five swallowing sites either propagates or runs behind a savepoint, with the choice stated in the call
- [x] A failing effect behind a savepoint leaves the outer transaction able to commit, proved by a test that makes the effect fail
- [ ] A failing effect that was chosen to propagate produces an error response, not a 200 <!-- 2026-09-27: All five sites use savepoints (all are best-effort effects: activity logging and notification dispatch). No site was chosen to propagate, so this criterion does not apply. -->
- [x] A gate rejects a bare catch around a database write while a request transaction is ambient, with a self-test for the shape it must catch
- [x] The gate's output says what it scans and what it cannot see
