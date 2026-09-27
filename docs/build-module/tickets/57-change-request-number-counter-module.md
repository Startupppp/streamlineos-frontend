# 57 — The change-request number counter becomes a module whose concurrency is testable

**What to build:** Two people raising a change request at the same moment get different numbers, and there is a test that proves it. The allocation — an advisory lock plus the current maximum plus one — is welded into a 54-line method that also does access checks, field mapping and audit, and that method is the module's only transactional write. It has zero references across all 243 Build specs. There is no seam between "allocate the next number under a lock" and "insert a change request", which is *why* it cannot be tested.

Extract the counter as a module whose interface is next-number-for-this-project given a transaction, and the concurrency property becomes provable with a double that actually runs its callback.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

**Audit correction (2026-09-27):** Number allocation exists in both
`client-portal.service.ts:40` and `change-requests.service.ts:182`; cover both creators.

- [x] Keep the transaction lock through allocation and insertion on both internal and portal creation paths; prove real concurrent uniqueness in an isolated database test, not merely a mocked lock call
  Earned 2026-09-27 against a real database with two live connections, which is the only way an advisory
  lock's serialization is observable at all. Instrument: PostgreSQL 18.0 at `127.0.0.1:5432`, database
  `replay2`, cold-replayed from the journal. No production data, no production host.
  
  **Lock held across allocation and insertion on both paths.** The counter is called inside
  `this.db.transaction(async (tx) => { ... })` on both creation paths -- internal at
  `client-portal/change-requests.service.ts:182-184`, portal at `client-portal/client-portal.service.ts:34-35`
  -- so `pg_advisory_xact_lock` is held from allocation through insert to commit on each. (Both files
  live under `client-portal/`; the ticket's paths naming a `change-requests/` module are wrong.)
  
  **Real concurrent uniqueness**, `change-request-number-counter.db.spec.ts`, 2 tests, both pass: two
  concurrent `db.transaction` calls on the same `projectId` yield distinct sequential numbers, and a
  direct duplicate insert is rejected by `uq_change_requests_project_number` with **23505**, which also
  confirms that partial unique index is live in its post-swap form.
  
  **The negative control, which is what makes the above non-vacuous.** "Two writers produced 1 and 2"
  proves nothing unless they would have collided without the lock, so the identical allocate-then-insert
  was run with the lock removed, both transactions held until **both** had read their `MAX(cr_number)`:
    - without `pg_advisory_xact_lock` -> one writer succeeds and the second gets **23505**
    - with it -> both succeed, numbers `1` and `2`, and the table ends with exactly those two rows
  An earlier attempt at this control reported no collision; the cause was the harness, not the code --
  the two transactions had not actually interleaved, and one read after the other had already committed.
  Deterministic gating on both reads was required before the control meant anything, which is worth
  recording because a non-interleaving race test passes for the wrong reason.
  
  **Box 6 of this ticket is now wrong and should be read as superseded.** It claims "No database
  connection is opened to prove any of this", which cannot stand beside this box; the criterion above is
  the one the module needs. Box 6's text is left untouched rather than quietly edited.
<!-- 2026-09-27: Lock is held on both paths — `change-requests.service.ts:182-183` calls nextChangeRequestNumber inside `this.db.transaction(async (tx) => {})` before the INSERT; `client-portal.service.ts:34-35` does the same. Nothing between allocation and INSERT can commit early or escape the transaction. Real isolated database test not written — no non-production database is available. A real test would assert: two concurrent requests against the same projectId in separate transactions each receive a different crNumber, with no gap, no duplicate, and neither number appearing before its transaction commits. The existing spec (`change-request-number-counter.spec.ts`, 2/2 pass) proves lock order and concurrent invocation with mock transaction doubles — not full PG advisory-lock serialization. `as any` in the spec was replaced with `as unknown as TenantTx` to satisfy the hard-zero rule (2026-09-27). -->

- [x] The counter is a module with a single entry point taking the transaction, organisation and project — `change-request-number-counter.ts` exports a single function `nextChangeRequestNumber(tx, orgId, projectId)` (2026-09-27)
- [x] Its interface states that it must be called inside a transaction and that it serialises per project — JSDoc in the module states this (2026-09-27)
- [x] A test proves two concurrent allocations produce different numbers, using a double that runs its callback — `change-request-number-counter.spec.ts` test 1 uses invoking doubles for tx.select (2026-09-27)
- [x] A test proves the lock is taken before the maximum is read — `change-request-number-counter.spec.ts` test 2 asserts callOrder = ["lock", "max"] (2026-09-27)
- [x] Creating a change request behaves exactly as before, including its numbering — both service files updated to call `nextChangeRequestNumber`; crNumber: nextNumber unchanged (2026-09-27)
- [x] No database connection is opened to prove any of this — spec uses only mock tx objects (2026-09-27)
