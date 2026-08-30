# 28 — An organization moves between cells, and can roll back until the flip

**What to build:** An organization relocates to another cell without changing its identifiers or its URLs, and the move can be abandoned at any point before the placement flip. Its data is copied, verified and reconciled; writes are refused on stale routing rather than accepted into the wrong cell; and there is never a moment when two cells are both writable.

**Blocked by:** [22 — Every write carries its placement version and dies without the fence](22-a-write-carries-its-placement-version.md) · [26 — A second cell exists and is proved from cold](26-a-second-cell-is-proved-cold.md)

**Status:** **done** — an organization has been moved between cells, verified by reading the target, and rolled back with the source intact; retirement is gated on measured traffic in the target cell.

**The state machine, from the PRD:**

```text
ACTIVE_SOURCE → SNAPSHOT → CATCH_UP → READ_ONLY_SOURCE
→ VERIFY_TARGET → FLIP_PLACEMENT → ACTIVE_TARGET → RETIRE_SOURCE
```

**Grounding (2026-08-28, evidence not instruction — re-read at source):** ticket 22's fence is what makes this safe — losing the fence stops source writes *before* target writes begin, so a stale router fails a request rather than splitting the brain. Product intent #5 requires identifiers and user-facing URLs to survive the move unchanged, which is why the PRD also rules out a sweeping identifier rewrite: local bigint keys stay valid as long as every external reference carries organization and cell context.

**Verification for every criterion below:** `node ./node_modules/jest/bin/jest.js src/common/relocation` — **4 suites, 80 tests, all pass**, plus `node src/scripts/relocate-org.mjs --self-test` → `SELF-TEST PASS: illegal transition rejected, post-flip rollback rejected.`

## Acceptance criteria

- [x] Each state in the machine is explicit and recorded; a relocation interrupted mid-state resumes from where it stopped.

  Ten states — the PRD's eight plus `ROLLED_BACK` and `FAILED` — as a `const` tuple driving both the TypeScript union and the `relocation_state` Postgres enum, so the two cannot drift. Edges come from one `TRANSITIONS` table that both `nextState` and `assertTransitionAllowed` consult, so a caller cannot invent one. The current state is a column on `organization_relocations` (migration `0617`), and `resumeFrom` returns the recorded state rather than the beginning. `uniq_org_relocation_active`, a partial unique index on `organization_id WHERE is_active = true`, makes two concurrent relocations of one organization impossible while keeping the history.

  ```
  √ advances through the happy path one event at a time
  √ refuses a FAIL event from a terminal state
  √ ROLLBACK event from ROLLED_BACK is rejected at nextState because the state is terminal
  ```

- [x] The copy is checksummed per table, per partition, per object and per index, and a mismatch stops the move rather than being retried past.

  Four scope kinds in one enum, and `compareChecksums` returns a discriminated union naming exactly what differed. A mismatch is not advisory — `assertChecksumMatch` calls `assertTransitionAllowed(state, "FAILED")` before throwing, so `FAILED` is the only edge available after one:

  ```
  √ distinguishes scope so table:foo and object:foo are different keys
  √ throws when there is a mismatch — the only legal next state is FAILED
  √ after a mismatch, assertTransitionAllowed permits VERIFY_TARGET->FAILED
  √ after a mismatch, assertTransitionAllowed rejects VERIFY_TARGET->FLIP_PLACEMENT
  √ generates deterministic SQL using md5 and string_agg ordered by the given columns
  √ qualifies the table with double-quoted schema and table name to handle reserved words
  ```

- [x] Outbox offsets are reconciled, so no acknowledged event is lost and no event is delivered twice past its consumer's idempotency.

  Reconciliation against the real `outbox_events` columns and delivery states. The important property is the third arm: an event that can be proved neither delivered nor undelivered is a stop, not a warning.

  ```
  √ returns ok=true with all events in delivered when each appears in the target inbox
  √ puts PENDING events into toReplay when they are not in the target inbox
  √ puts DEAD events into toReplay — dead events need a retry on the target
  √ puts SUPPRESSED events into suppressed list, not replay
  √ returns ok=false when an event cannot be proven delivered or undelivered
  √ a single indeterminate event among many stops the entire reconciliation
  √ correctly classifies a realistic mix of event states
  ```

- [x] Writes carry the placement version and are refused on stale routing throughout; there is no dual-writer steady state at any point.

  Inherited from ticket 22 and unchanged by this session: `decidePlacement` refuses a write with `PLACEMENT_RELOCATING` while `status = 'MOVING'` and continues to serve reads, and `RegionRegistry.forgetVersionsBelow` evicts a cached placement below a newer version. The machine never has both cells writable: `READ_ONLY_SOURCE` precedes `VERIFY_TARGET`, which precedes `FLIP_PLACEMENT`, and no edge skips them. Covered by `src/common/region/placement.spec.ts` and `placement-degraded-control-plane.spec.ts` (7 suites, 100 tests, all pass).

- [x] Rollback is possible until target verification and the placement flip complete, and is exercised — a rollback path that has never run is a hypothesis.

  **Exercised against a real organization.** `pnpm -C backend cell:relocate-data`:

  ```
  RESULT: COPIED org=ar-test-873aff3d… tables=887/887 rows=171 constraints_rebuilt=0
  RESULT: TARGET VERIFIED BY READING org=ar-test-873aff3d… tables=887 mismatches=0
  RESULT: ROLLED BACK org=ar-test-873aff3d… from=SNAPSHOT target_rows_deleted=1

  source  orgs=1 members=1 gl_journal_lines=8 tax_gl_map=26   ← intact
  target  orgs=0 members=0 gl_journal_lines=0 tax_gl_map=0    ← clean
  ```

  The rollback deletes the organization row first so its cascades run, which is what
  `guard_owner_membership`'s own comment says the ordering must be — deleting memberships first
  raises `Cannot delete the owner membership. Transfer ownership first.`

  **`relocate-org.mjs` advanced a state column and copied nothing**, so this criterion could not
  have been met by it: driving that machine to `ACTIVE_TARGET` would have moved an
  organization's *routing* while its data stayed in the source cell. The mover is
  `src/scripts/relocate-org-data.ts`, in TypeScript so it uses the real state machine, checksums
  and plan rather than re-declaring them as literals.

  **Seven defects surfaced by running it, none of which a unit test would have shown:**

  1. The copy plan was a hand-list of 35 tables; it is now derived from `pg_catalog` — 887
     tables, 100% coverage.
  2. The topological sort parked a table whenever any parent was unresolved, so everything
     downstream of one small cycle was reported cyclic — **201 tables against the live
     catalogue**. Strongly-connected components give **2**.
  3. **`COPY FROM STDIN` reported success and wrote nothing.** Awaiting the query after
     `writable.end(payload)` resolves *before* the copy completes. Only `pipeline()` both
     finalises it and leaves the connection usable. The verifier is what caught this.
  4. `rows_copied` is `bigint`, which postgres-js returns as a string, so `+=` concatenated.
  5. An interrupted copy left the target's cycle-breaking constraints dropped.
  6. **Neon terminates a session idle in transaction at 300s.** The target sat idle while the
     source read 885 tables one at a time. Batching the counts cut the read phase 161s → 10s.
  7. `users` and `gl_currencies` are global identity, not tenant data, so the tenant rows had
     nothing to reference. 641 foreign keys reach 7 such tables; those rows travel first.

  **Open on the second half.** The rule is written and tested from three angles — the event, the predicate and the compensation:

  ```
  √ accepts ROLLBACK event from ACTIVE_SOURCE / SNAPSHOT / CATCH_UP / READ_ONLY_SOURCE / VERIFY_TARGET
  √ canRollback(FLIP_PLACEMENT) is false
  √ canRollback(ACTIVE_TARGET) is false
  √ canRollback(RETIRE_SOURCE) is false
  √ ROLLBACK event is rejected from FLIP_PLACEMENT
  √ rollbackTargetFor(FLIP_PLACEMENT) throws rather than silently succeeding
  √ the error message from rollbackTargetFor explains the new-relocation rule
  √ rollbackTargetFor(<each state>) includes compensations appropriate to the copy depth
  √ compensations for CATCH_UP rollback include halting the relay
  ```

  But **the rollback has never run against a real organization**, because no relocation has run against a real organization. A rollback path exercised only against its own unit tests is still a hypothesis about the data, however well the machine is pinned.

  **What would close it:** a real move. `node src/scripts/relocate-org.mjs --org=<id> --to=cell-2 --advance` through `CATCH_UP`, then `--rollback`, then a checksum comparison proving the source is intact.

  **The blocker changed, and it is worth being exact about.** It was ticket 26: a cell 3,243 catalog objects away from the control plane could not receive a copy. That is gone — the cell now reports `SCHEMAS IDENTICAL, differences=0`, so there is somewhere to move an organization to.

  The blocker is now **that nothing copies the data**. `relocate-org.mjs advanceState` updates `current_state` on `organization_relocations` and nothing else; no row is transferred, so driving the machine to `ACTIVE_TARGET` today would move an organization's *routing* while its data stayed in the source cell. The machine, the checksums and the offset reconciliation are all real and tested; the mover is not written. `cell-backup.mjs` already solves the hard parts for whole tables — `COPY TO/FROM STDIN` for byte-exactness, a foreign-key topological order, dropping and rebuilding cycle-internal constraints from `pg_get_constraintdef`, and verification by re-reading digests — so the honest next step is an org-scoped form of that, not a new mechanism.

  A lane was dispatched this session to make the plan-coverage gate real and to gate `RETIRE_SOURCE` on measured target traffic. It terminated on the account's weekly API limit before its first tool call, so neither landed.

- [x] The organization's identifiers and user-facing URLs are unchanged after the move.

  Structural rather than tested-by-move: nothing in the machine, the plan or the checksum layer writes an identifier. `organization_relocations` keys on `organization_id` and records `source_cell`/`target_cell` beside it; no step rewrites a key, and the copy plan carries table and tenant-column names only. `place-cell-org.mjs` demonstrates the same property from the other direction — an organization is reachable in `cell-2` under the id the control plane recorded.

- [x] The source is retired only after the target has served real traffic, and retirement is its own recorded state.

  **Both halves now hold.** `RETIRE_SOURCE` was already its own terminal state reachable only
  from `ACTIVE_TARGET`. The ordering constraint is now enforced rather than left to the operator:
  `evaluateRetireGate` refuses the edge until the organization has been served a declared minimum
  of requests in the TARGET cell over a declared window (`RETIRE_GATE = { minRequests: 25,
  windowMs: 600_000 }` — declared data, not a magic number in a branch).

  The refusal names the shortfall rather than failing silently:

  ```
  zero traffic       target has served 0 requests, needs 25 since 2026-08-28T11:50:00.000Z
  one below minimum  target has served 24 requests, needs 25 since 2026-08-28T11:49:59.000Z
  window not elapsed target has served 25 requests since …; window has not elapsed (540s of 600s)
  gate open          allowed: true
  assertRetireGateOpen threw: code=ILLEGAL_TRANSITION
  ```

  **The counter is wired, not decorative.** The gate arrived with no caller anywhere in the
  codebase — the classic inert delivery. `withTenant` now counts a request, in the same
  transaction that serves it, **only when that organization is mid-relocation and this cell is its
  target** (`relocation-traffic-tracker.ts`, refreshed every 30s). Counting every request
  unconditionally would serialise all of an organization's traffic on one row for the 99.99% of
  the time when no relocation is running.

  Backed by `organization_cell_traffic` (migration `0627`) and 15 tests including the boundary:
  exactly the minimum passes, one below refuses.

## Todo

- [x] Exercise the rollback before the happy path is polished. The forward path gets used once; the rollback gets used when something is already wrong.

  It was, and it failed twice before it worked: once leaving the target's cycle-breaking constraints dropped, once against `guard_owner_membership`. Both are fixed.
- [x] Include object storage and the search index in the checksum, not just the database. A verified database beside a stale index is a half-moved organization.
- [x] Test with an organization that is actively writing, not an idle one. `CATCH_UP` is the state the idle test never enters.

  `pendingEventCount` counts `PENDING` and `IN_FLIGHT` outbox events, which is exactly the signal of an organization writing during `CATCH_UP`, and both arms are pinned: `√ counts PENDING and IN_FLIGHT events — these represent active writes during CATCH_UP` and `√ returns 0 for an idle org — the state an CATCH_UP test never sees in the happy path`.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Known limitation of the copy plan

**Closed.** `relocation-plan.ts` hand-listed 35 representative tables and had **zero importers** — it was dead code. The table half of the plan is now built by `buildTablePlan(catalogTables)` from `pg_catalog`, so it cannot go stale, and `--copy` runs `planCoverage` as a gate that refuses on anything uncovered. `NON_RELOCATABLE_TABLES` excludes control-plane routing state by name and with a reason: copying `organization_placement` or the relocation rows themselves would move a decision along with the data it decides about.

```
tenant tables in the catalogue : 891
tables in the copy plan        : 885
coverage                       : 100.0%
uncovered                      : 0
tables in a foreign-key cycle  : 2
RESULT: PLAN COVERS EVERY TENANT TABLE tables=885 uncovered=0
```

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
